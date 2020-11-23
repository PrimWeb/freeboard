freeboardTemplates = {
    blank: {"version":1,"allow_edit":true,"plugins":[],"panes":[],"datasources":[],"columns":3,"globalSettings":{"theme":{}}},

    example:{"version":1,"allow_edit":true,"plugins":[],"panes":[{"title":"HTML Template rendering","width":1,"row":{"3":1},"col":{"3":2},"col_width":2,"widgets":[{"type":"html-template","settings":{"html":"<p><span style=\"font-size: 1em; white-space: pre-wrap; background-color: var(--box-bg-color); color: var(--fg-color); font-family: Stencil;\">The text the user entered is</span>: <span style=\"font-family: Chalkboard;\">{{txt}}</span></p>","data":"={txt: datasources[\"vars\"][\"txt\"]}","background":"transparent","backgroundRepeat":"no-repeat","backgroundSize":"cover","height":1,"toolbar":true}},{"type":"textbox_plugin","settings":{"title":"Enter Some Text","tooltip":"","pattern":".*","placeholder":"","mode":"input","target":"datasources[\"vars\"].txt"}}]},{"title":"Switch and LED with SFX","width":1,"row":{"3":1},"col":{"3":1},"col_width":1,"widgets":[{"type":"switch_plugin","settings":{"title":"A switch","target":"datasources[\"vars\"].sw","on_text":"On","off_text":"Off","sound":"low-click"}},{"type":"indicator","settings":{"title":"An indicator light","value":"=datasources[\"vars\"][\"sw\"]"}}]},{"title":"Sum","width":1,"row":{"3":7},"col":{"3":1},"col_width":1,"widgets":[{"type":"gauge","settings":{"title":"A+B","heading":"Sum","style":{"pointerCircleInner":"rgb(57,43,21)","pointerCircleInnerEnd":"rgb(57,43,21)","pointerCircleOuter":"rgb(87,63,41)","pointerCircleOuterEnd":"rgb(57,43,21)","pointerShadowTop":"#000000","pointerShadowBottom":"#000000","pointerColor":"#000000","pointerTipColor":"#002000","fgColor":"rgb(57,43,21)","borderInner":"rgb(77,68,56)","borderInnerEnd":"rgb(59,44,36)","borderMiddle":"rgb(202,192,155)","borderMiddleEnd":"rgb(163,145,96)","borderOuter":"rgb(102,90,67)","borderOuterEnd":"rgb(57,41,34)","borderInnerWidth":2,"borderMiddleWidth":3,"borderOuterWidth":2,"borderShadow":"#000000","plateColor":"rgb(204,198,190)","plateColorEnd":"rgb(195,190,180)","fontTitleSize":32,"fontValueSize":40,"size":4},"value":"=datasources[\"vars\"][\"a\"]+datasources[\"vars\"][\"b\"]","min_value":0,"max_value":"200","tick_interval":"25","minor_ticks":5,"digits":4}},{"type":"slider_plugin","settings":{"title":"Input B","unit":"","min":"0","max":"100","step":"1","default":"0","mode":"input","target":"datasources[\"vars\"][\"a\"]"}},{"type":"slider_plugin","settings":{"title":"Input A","unit":"","min":"0","max":"100","step":"1","default":"0","mode":"input","target":"datasources[\"vars\"][\"b\"]"}}]},{"width":1,"row":{"3":7},"col":{"3":2},"col_width":1,"widgets":[{"type":"text_widget","settings":{"title":"Count","size":"regular","value":"=datasources[\"vars\"].btn","animate":false}},{"type":"button_plugin","settings":{"html":"<i>Button</i>","tooltip":"","target":"datasources[\"vars\"][\"btn\"]","sound":"","height":30}}]}],"datasources":[{"name":"vars","type":"core_scratchpad_plugin","settings":{"data":"={}","persist":"off","lock":false}}],"columns":3,"globalSettings":{"theme":{},"imageData":{}}}
}
DatasourceModel =  function(theFreeboardModel, datasourcePlugins) {
	var self = this;

	function disposeDatasourceInstance()
	{
		if(!_.isUndefined(self.datasourceInstance))
		{
			if(_.isFunction(self.datasourceInstance.onDispose))
			{
				self.datasourceInstance.onDispose();
			}

			self.datasourceInstance = undefined;
		}
	}

	this.name = ko.observable();
	this.latestData = ko.observable();
	this.settings = {};

	this.setSettings =(async function(newValue)
	{
		self.settings = newValue;
		if(!_.isUndefined(self.datasourceInstance) && _.isFunction(self.datasourceInstance.onSettingsChanged))
		{
			try{
				await self.datasourceInstance.onSettingsChanged(newValue);
			}
			catch(e)
			{
				freeboard.showDialog($("<pre>").text(String(e)), "Error changing settings","OK")
				throw e;
			}
		}
	});

	this.updateCallback = function(newData)
	{
		theFreeboardModel.processDatasourceUpdate(self, newData);

		self.latestData(newData);

		var now = new Date();
		self.last_updated(now.toLocaleTimeString());
	}

	this.type = '';
	this.setType = async function(newValue)
	{
		if(self.type==newValue)
		{
			return;
		}
		self.type=newValue;

		disposeDatasourceInstance();

		if((newValue in datasourcePlugins) && _.isFunction(datasourcePlugins[newValue].newInstance))
		{
			var datasourceType = datasourcePlugins[newValue];

			async function finishLoad()
			{
				await datasourceType.newInstance(self.settings, function(datasourceInstance)
					{
						self.datasourceInstance = datasourceInstance;
						datasourceInstance.updateNow();

					}, self.updateCallback)
				
			}

			// Do we need to load any external scripts?
			if(datasourceType.external_scripts)
			{
				head.js(datasourceType.external_scripts.slice(0), finishLoad); // Need to clone the array because head.js adds some weird functions to it
			}
			else
			{
				await finishLoad();
			}
		}
	};

	this.last_updated = ko.observable("never");
	this.last_error = ko.observable();

	this.serialize = function()
	{
		return {
			name    : self.name(),
			type    : self.type,
			settings: self.settings
		};
	}

	this.deserialize = async function(object)
	{
		await self.setSettings(object.settings);
		self.name(object.name);
		await self.setType(object.type);
	}

	this.getDataRepresentation = function(dataPath)
	{
		var valueFunction = new Function("data", "return " + dataPath + ";");
		return valueFunction.call(undefined, self.latestData());
	}

	this.updateNow = function()
	{
		if(!_.isUndefined(self.datasourceInstance) && _.isFunction(self.datasourceInstance.updateNow))
		{
			self.datasourceInstance.updateNow();
		}
	}

	this.dispose = function()
	{
		disposeDatasourceInstance();
	}
}

DeveloperConsole = function(theFreeboardModel)
{
	function showDeveloperConsole()
	{
		var pluginScriptsInputs = [];
		var container = $('<div></div>');
		var addScript = $('<div class="table-operation text-button">ADD</div>');
		var table = $('<table class="table table-condensed sub-table"></table>');

		table.append($('<thead style=""><tr><th>Plugin Script URL</th></tr></thead>'));

		var tableBody = $("<tbody></tbody>");

		table.append(tableBody);

		container.append($("<p>Here you can add references to other scripts to load datasource or widget plugins.</p>"))
			.append(table)
			.append(addScript)
            .append('<p>To learn how to build plugins for freeboard, please visit <a target="_blank" href="http://freeboard.github.io/freeboard/docs/plugin_example.html">http://freeboard.github.io/freeboard/docs/plugin_example.html</a></p>');

		function refreshScript(scriptURL)
		{
			$('script[src="' + scriptURL + '"]').remove();
		}

		function addNewScriptRow(scriptURL)
		{
			var tableRow = $('<tr></tr>');
			var tableOperations = $('<ul class="board-toolbar"></ul>');
			var scriptInput = $('<input class="table-row-value" style="width:100%;" type="text">');
			var deleteOperation = $('<li><i class="icon-trash icon-white"></i></li>').click(function(e){
				pluginScriptsInputs = _.without(pluginScriptsInputs, scriptInput);
				tableRow.remove();
			});

			pluginScriptsInputs.push(scriptInput);

			if(scriptURL)
			{
				scriptInput.val(scriptURL);
			}

			tableOperations.append(deleteOperation);
			tableBody
				.append(tableRow
				.append($('<td></td>').append(scriptInput))
					.append($('<td class="table-row-operation">').append(tableOperations)));
		}

		_.each(theFreeboardModel.plugins(), function(pluginSource){

			addNewScriptRow(pluginSource);

		});

		addScript.click(function(e)
		{
			addNewScriptRow();
		});

		new DialogBox(container, "Developer Console", "OK", null, function(){

			// Unload our previous scripts
			_.each(theFreeboardModel.plugins(), function(pluginSource){

				$('script[src^="' + pluginSource + '"]').remove();

			});

			theFreeboardModel.plugins.removeAll();

			_.each(pluginScriptsInputs, function(scriptInput){

				var scriptURL = scriptInput.val();

				if(scriptURL && scriptURL.length > 0)
				{
					theFreeboardModel.addPluginSource(scriptURL);

					// Load the script with a cache buster
					head.js(scriptURL + "?" + Date.now());
				}
			});

		});
	}

	// Public API
	return {
		showDeveloperConsole : function()
		{
			showDeveloperConsole();
		}
	}
}

function DialogBox(contentElement, title, okTitle, cancelTitle, okCallback,cancelCallback)
{
	var modal_width = 900;

	// Initialize our modal overlay
	var overlay = $('<div id="modal_overlay" style="display:none;"></div>');

	var modalDialog = $('<div class="modal"></div>');

	function closeModal()
	{
		overlay.fadeOut(200, function()
		{
			$(this).remove();
		});
	}

	// Create our header
	var x = $('<h2 class="title">' + title + '</h2>')//.css('height','25px').css('width',"800px")
	var y = $('<header></header>')//.css('overflow','hidden')
	y.append(x)
	modalDialog.append(y)	

	$('<section></section>').appendTo(modalDialog).append(contentElement);

	// Create our footer
	var footer = $('<footer></footer>').appendTo(modalDialog);

	if(okTitle)
	{
		$('<span id="dialog-ok" class="text-button">' + okTitle + '</span>').appendTo(footer).click(function()
		{
			var hold = false;

			if(_.isFunction(okCallback))
			{
				hold = okCallback();
			}

			if(!hold)
			{
				closeModal();
			}
		});
	}

	if(cancelTitle)
	{
		$('<span id="dialog-cancel" class="text-button">' + cancelTitle + '</span>').appendTo(footer).click(function()
		{
			if(_.isFunction(cancelCallback))
			{
				cancelCallback();
			}


			closeModal();
		});
	}

	overlay.append(modalDialog);
	$("body").append(overlay);
	setTimeout(function(){ textFit(x)},10);

	overlay.fadeIn(200);
}

function FreeboardModel(datasourcePlugins, widgetPlugins, freeboardUI)
{
	var self = this;

	var SERIALIZATION_VERSION = 1;

	this.version = 0;
	this.isEditing = ko.observable(false);
	this.currentPageName = ko.observable("default");

	//Where we store all loadable panes, not just the active one.
	this.pagesData= {}

	this.allow_edit = ko.observable(false);
	this.allow_edit.subscribe(function(newValue)
	{
		if(newValue)
		{
			$("#main-header").show();
		}
		else
		{
			$("#main-header").hide();
		}
	});
    
   this.sleep = function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
  }
  

	this.header_image = ko.observable();
	this.plugins = ko.observableArray();
	this.datasources = ko.observableArray();
    
         
	this.panes = ko.observableArray();
	this.datasourceData = {};
    
    //We want to let widgets assign to properties of data sources.
    //However, we can't let them directly overwrite the reactive object that the plugin
    //provides,that would mess everything up.  So we give a read only view of datasourcedata
    var dataSourceProtectionHandler = {
        set: function(obj, prop, value) {
            throw new Error("You cannot directly overwrite a datasource here. Try assigning to one of the properties of the source instead")
        }
    };
    
    self.protectedDataSourceData =  new Proxy(self.datasourceData, dataSourceProtectionHandler)
   
	this.processDatasourceUpdate = function(datasourceModel, newData)
	{
		//TODO should we actually iterate everything on every change?
		var datasourceName = datasourceModel.name();

		self.datasourceData[datasourceName] = newData;

		_.each(self.panes(), function(pane)
		{
			_.each(pane.widgets(), function(widget)
			{
				widget.processDatasourceUpdate(datasourceName);
			});
		});
	}

	this._datasourceTypes = ko.observable();
	this.datasourceTypes = ko.computed({
		read: function()
		{
			self._datasourceTypes();

			var returnTypes = [];

			_.each(datasourcePlugins, function(datasourcePluginType)
			{
				var typeName = datasourcePluginType.type_name;
				var displayName = typeName;

				if(!_.isUndefined(datasourcePluginType.display_name))
				{
					displayName = datasourcePluginType.display_name;
				}

				returnTypes.push({
					name        : typeName,
					display_name: displayName
				});
			});

			return returnTypes;
		}
	});

	this._widgetTypes = ko.observable();
	this.widgetTypes = ko.computed({
		read: function()
		{
			self._widgetTypes();

			var returnTypes = [];

			_.each(widgetPlugins, function(widgetPluginType)
			{
				var typeName = widgetPluginType.type_name;
				var displayName = typeName;

				if(!_.isUndefined(widgetPluginType.display_name))
				{
					displayName = widgetPluginType.display_name;
				}

				returnTypes.push({
					name        : typeName,
					display_name: displayName
				});
			});

			return returnTypes;
		}
	});

	this.addPluginSource = function(pluginSource)
	{
		if(pluginSource && self.plugins.indexOf(pluginSource) == -1)
		{
			self.plugins.push(pluginSource);
		}
	}

	this.globalSettings = {}
	this.globalSettingsDefaults={theme:{}}
	Object.assign(this.globalSettings, this.globalSettingsDefaults)


	this.globalSettingsHandlers={}


	//Swap out in the sense of push the data into the cold storage.
	//We need ot do this before we can load a new pane
	this.serializecurrentPage = function()
	{
		var panes = [];

		_.each(self.panes(), function(pane)
		{
			panes.push(pane.serialize());
		});
		var n =self.currentPageName()
		//Time to update the panes data, it could have changed while it was the active pane
		self.pagesData[n]={'contents':panes,name:n}
	}


	this.serialize = function()
	{
		

		var datasources = [];


		_.each(self.datasources(), function(datasource)
		{
			datasources.push(datasource.serialize());
		});

		self.serializecurrentPage()


		return {
			version     : SERIALIZATION_VERSION,
			header_image: self.header_image(),
			allow_edit  : self.allow_edit(),
			plugins     : self.plugins(),
			pages       : self.pagesData,
			datasources : datasources,
			columns     : freeboardUI.getUserColumns(),
			globalSettings : self.globalSettings
		};
	}

	this.setGlobalSettings=function(d)
	{
		Object.assign(self.globalSettings, d)
		for(var i in self.globalSettingsHandlers)
		{
			self.globalSettingsHandlers[i](self.globalSettings)
		}
	}



	this.globalSettingsHandlers['css'] = function(d)
	{
		for(i in d.theme)
		{
			var x = d.theme[i]

			//Wrap URLs in the URL tag
			if(i.includes('-image'))
			{
				if(x)
				{
					x = 'url('+x+')'
				}

			}
			document.body.style.setProperty(i, x)
		}

		d.imageData = d.imageData||{}

		for(i in d.imageData)
		{
			var x = d.imageData[i]
	
			if(x)
			{
				x = 'url('+x+')'
			}

			document.body.style.setProperty(i, x)
		}
		$("#board-logo").html(getComputedStyle(document.documentElement).getPropertyValue('--logo-text'))
		setTimeout(function(){freeboardUI.processResize(true)},30);

		
	}

	this.deserialize = async function(object, finishedCallback)
	{
		self.clearDashboard();

		async function finishLoad()
		{
			freeboardUI.setUserColumns(object.columns);

			if(!_.isUndefined(object.allow_edit))
			{
				self.allow_edit(object.allow_edit);
			}
			else
			{
				self.allow_edit(true);
			}
			self.version = object.version || 0;
			self.header_image(object.header_image);

	
			_.each(object.datasources, async function(datasourceConfig)
			{
				var datasource = new DatasourceModel(self, datasourcePlugins);
				//Deserialize can be an async function if it wants to be.
				await Promise.resolve(datasource.deserialize(datasourceConfig));
				self.addDatasource(datasource);
			});


			//Legacy single page model
			if(object.panes)
			{
				await self.setPage({'contents':object.panes, name: 'default'})
			}
			else
			{
				Object.assign(self.pagesData,object.pages)
				await self.setPage(object.pages['default'])

			}


			if(self.allow_edit() && self.panes().length == 0)
			{
				self.setEditing(true);
			}

			if(_.isFunction(finishedCallback))
			{
				await Promise.resolve(finishedCallback());
			}

			for (var prop in self.globalSettings) {
					delete self.globalSettings[prop];
			}
			Object.assign(self.globalSettings, self.globalSettingsDefaults)
			
		
			self.setGlobalSettings(object.globalSettings||{})


			
		}

		// This could have been self.plugins(object.plugins), but for some weird reason head.js was causing a function to be added to the list of plugins.
		_.each(object.plugins, function(plugin)
		{
			self.addPluginSource(plugin);
		});

		// Load any plugins referenced in this definition
		if(_.isArray(object.plugins) && object.plugins.length > 0)
		{
			head.js(object.plugins, async function()
			{
				await finishLoad();
			});
		}
		else
		{
			await finishLoad();
		}
	}

	this.gotoPage = async function(pageName){
		if(!pageName)
		{
			return
		}
		if(self.pagesData[pageName])
		{
			await self.setPage(self.pagesData[pageName])
		}
		else{
			//Make a new empty page
			await self.setPage({name:pageName,contents:[]})
			//Make it show in listings right away
			self.serializecurrentPage()
		}

	}

	this.renamePage = async function(pageName){
		if(!pageName)
		{
			return
		}
		var p =self.pagesData[self.currentPageName()]
		p.name=pageName

		delete self.pagesData[self.currentPageName()]
		self.pagesData[pageName]=p
		self.currentPageName(pageName)

		await self.setPage(p)
	}

	this.deletePage = async function(pageName){
		if(!pageName)
		{
			return
		}
		if(self.currentPageName()==pageName)
		{
			await self.gotoPage("default")
		}

		delete self.pagesData[pageName]
	}

	this.duplicatePage = async function(pageName){
		if(!pageName)
		{
			return
		}
		if(	self.pagesData[pageName])
		{
			throw Error("Page exists!")
		}
		//Handle nonexistant current page
		var p =self.pagesData[self.currentPageName()] || {name:pageName}
		p =_.clone(p)
		p.name=pageName
		self.pagesData[pageName] = p
		await self.setPage(p)
	}

	this.setPage = async function(page){

		//Save any changes now that we are going to a new page
		self.serializecurrentPage()

		var contents = page.contents || []
		self.currentPageName(page.name||String(freeboard.genUUID()))
		page.name=self.currentPageName()


		_.each(self.panes(), function(pane)
		{
			pane.dispose();
		});
		
		self.panes.removeAll()
		$(freeboard._gridRootElement).html('').append("<ul></ul>");

		var sortedPanes = _.sortBy(contents, function(pane){
			return freeboardUI.getPositionForScreenSize(pane).row;
		});

		_.each(sortedPanes, function(paneConfig)
		{
			var pane = new PaneModel(self, widgetPlugins);
			pane.deserialize(paneConfig);
			self.panes.push(pane);
		});

		//Do after render and all, but wait for it
		await async function(){freeboardUI.processResize(true)}()
	}

	this.clearDashboard = function()
	{
		freeboardUI.removeAllPanes();

		for (var member in self.pagesData) {delete self.pagesData[member]};

		
		_.each(self.datasources(), function(datasource)
		{
			datasource.dispose();
		});

		_.each(self.panes(), function(pane)
		{
			pane.dispose();
		});

		self.plugins.removeAll();
		self.datasources.removeAll();
		self.panes.removeAll();
		//Needed to prevent 
		//https://github.com/ducksboard/gridster.js/issues/271
		//during rapid page switching
		freeboard._gridRootElement.html('').append("<ul></ul>");


	}

	this.loadDashboard = function(dashboardData, callback)
	{
		freeboardUI.showLoadingIndicator(true);
		self.deserialize(dashboardData, function()
		{
			freeboardUI.showLoadingIndicator(false);

			if(_.isFunction(callback))
			{
				callback();
			}

        freeboard.emit("dashboard_loaded");
		});
	}

	this.loadDashboardFromLocalFile = function()
	{
		// Check for the various File API support.
		if(window.File && window.FileReader && window.FileList && window.Blob)
		{
			var input = document.createElement('input');
			input.type = "file";
			$(input).on("change", function(event)
			{
				var files = event.target.files;

				if(files && files.length > 0)
				{
					var file = files[0];
					var reader = new FileReader();

					reader.addEventListener("load", function(fileReaderEvent)
					{

						var textFile = fileReaderEvent.target;
						var jsonObject = JSON.parse(textFile.result);


						self.loadDashboard(jsonObject);
						self.setEditing(false);
					});

					reader.readAsText(file);
				}

			});
			$(input).trigger("click");
		}
		else
		{
			alert('Unable to load a file in this browser.');
		}
	}

	this.downloadDashboardClicked = function(){
		var target = $(event.currentTarget);
		var siblingsShown = target.data('siblings-shown') || false;
		if(!siblingsShown){
			$(event.currentTarget).siblings('label').fadeIn('slow');
		}else{
			$(event.currentTarget).siblings('label').fadeOut('slow');
		}
		target.data('siblings-shown', !siblingsShown);
	}

	this.downloadDashboard = function(_thisref, event)
	{
		var pretty = $(event.currentTarget).data('pretty');
		var contentType = 'application/octet-stream';
		var a = document.createElement('a');
		if(pretty){
			var blob = new Blob([JSON.stringify(self.serialize(), null, '\t')], {'type': contentType});
		}else{
			var blob = new Blob([JSON.stringify(self.serialize())], {'type': contentType});
		}
		document.body.appendChild(a);
		a.href = window.URL.createObjectURL(blob);
		a.download = "dashboard.json";
		a.target="_self";
		a.click();
	}

	this.addDatasource = function(datasource)
	{
		self.datasources.push(datasource);
	}

	this.deleteDatasource = function(datasource)
	{
		delete self.datasourceData[datasource.name()];
		datasource.dispose();
		self.datasources.remove(datasource);
	}

	this.createPane = function()
	{
		var newPane = new PaneModel(self, widgetPlugins);
		self.addPane(newPane);
	}

	this.addGridColumnLeft = function()
	{
		freeboardUI.addGridColumnLeft();
	}

	this.addGridColumnRight = function()
	{
		freeboardUI.addGridColumnRight();
	}

	this.subGridColumnLeft = function()
	{
		freeboardUI.subGridColumnLeft();
	}

	this.subGridColumnRight = function()
	{
		freeboardUI.subGridColumnRight();
	}

	this.addPane = function(pane)
	{
		self.panes.push(pane);
	}

	this.deletePane = function(pane)
	{
		pane.dispose();
		self.panes.remove(pane);
	}

	this.deleteWidget = function(widget)
	{
		ko.utils.arrayForEach(self.panes(), function(pane)
		{
			pane.widgets.remove(widget);
		});

		widget.dispose();
	}

	this.setEditing = function(editing, animate)
	{
		// Don't allow editing if it's not allowed
		if(!self.allow_edit() && editing)
		{
			return;
		}

		self.isEditing(editing);

		if(_.isUndefined(animate))
		{
			animate = true;
		}

		var animateLength = (animate) ? 250 : 0;
		var barHeight = $("#admin-bar").outerHeight();

		if(!editing)
		{
			$("#toggle-header-icon").addClass("icon-wrench").removeClass("icon-chevron-up");
			$(".gridster .gs_w").css({cursor: "default"});
			$("#main-header").animate({"top": "-" + barHeight + "px"}, animateLength);
			$("#board-content").animate({"top": "20"}, animateLength);
			$("#main-header").data().shown = false;
			$(".sub-section").unbind();
			freeboardUI.disableGrid();
		}
		else
		{
			$("#toggle-header-icon").addClass("icon-chevron-up").removeClass("icon-wrench");
			$(".gridster .gs_w").css({cursor: "pointer"});
			$("#main-header").animate({"top": "0px"}, animateLength);
			$("#board-content").animate({"top": (barHeight + 20) + "px"}, animateLength);
			$("#main-header").data().shown = true;
			freeboardUI.attachWidgetEditIcons($(".sub-section"));
			freeboardUI.enableGrid();
		}

		freeboardUI.showPaneEditIcons(editing, animate);
	}
	

	this.toggleEditing = function()
	{
		var editing = !self.isEditing();
		self.setEditing(editing);
	}
}

function FreeboardUI() {
	var PANE_MARGIN = 10;
	var PANE_WIDTH = 300;
	var MIN_COLUMNS = 3;
	var COLUMN_WIDTH = PANE_MARGIN + PANE_WIDTH + PANE_MARGIN;

	var userColumns = MIN_COLUMNS;

	var loadingIndicator = $('<div class="wrapperloading"><div class="loading up" ></div><div class="loading down"></div></div>');
	var grid;


	// function doNetWidget(){
	// 	var connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

	// 	if(connection){
	// 	var type = connection.effectiveType;

	// 	var main = $('<label id="freeboard-net-status-widget"><span>Net:</span></label>').appendTo($('#freeboard-extra-tools'))
	// 	var inner = $('<span></span>').html(type).appendTo(main)


	// 	function updateConnectionStatus() {
	// 		inner.html(connection.effectiveType);
	// 		}
	
	// 		connection.addEventListener('change', updateConnectionStatus);
	// 	}
	// }
	// doNetWidget()


	function processResize(layoutWidgets) {
		var maxDisplayableColumns = getMaxDisplayableColumnCount();
		var repositionFunction = function () { };
		if (layoutWidgets) {
			repositionFunction = function (index) {
				var paneElement = this;
				var paneModel = ko.dataFor(paneElement);

				var newPosition = getPositionForScreenSize(paneModel);
				$(paneElement).attr("data-sizex", Math.min(paneModel.col_width(),
					maxDisplayableColumns, grid.cols))
					.attr("data-row", newPosition.row)
					.attr("data-col", newPosition.col);

				paneModel.processSizeChange();
			}
		}

		updateGridWidth(Math.min(maxDisplayableColumns, userColumns));

		repositionGrid(repositionFunction);
		updateGridColumnControls();
		if (true) {
			try {
				textFit($('#board-logo'))
				textFit($('.gs_w header h1'))
				textFit($('#datasources h2'))
				textFit($('#globalSettingsDialog h2'))
				textFit($('.jsgrid-header-cell:not(.jsgrid-control-field)'))
			}
			catch (e) {
				console.log(e)
			}
		}
		try {
			textFit($('.fullwidth-button'),{alignHoriz: true,alignVert:true})		
		}
		catch (e) {
			console.log(e)
		}

	}

	function addGridColumn(shift) {
		var num_cols = grid.cols + 1;
		if (updateGridWidth(num_cols)) {
			repositionGrid(function () {
				var paneElement = this;
				var paneModel = ko.dataFor(paneElement);

				var prevColumnIndex = grid.cols > 1 ? grid.cols - 1 : 1;
				var prevCol = paneModel.col[prevColumnIndex];
				var prevRow = paneModel.row[prevColumnIndex];
				var newPosition;
				if (shift) {
					leftPreviewCol = true;
					var newCol = prevCol < grid.cols ? prevCol + 1 : grid.cols;
					newPosition = { row: prevRow, col: newCol };
				}
				else {
					rightPreviewCol = true;
					newPosition = { row: prevRow, col: prevCol };
				}
				$(paneElement).attr("data-sizex", Math.min(paneModel.col_width(), grid.cols))
					.attr("data-row", newPosition.row)
					.attr("data-col", newPosition.col);
			});
		}
		updateGridColumnControls();
		userColumns = grid.cols;
	}

	function subtractGridColumn(shift) {
		var num_cols = grid.cols - 1;
		if (updateGridWidth(num_cols)) {
			repositionGrid(function () {
				var paneElement = this;
				var paneModel = ko.dataFor(paneElement);

				var prevColumnIndex = grid.cols + 1;
				var prevCol = paneModel.col[prevColumnIndex];
				var prevRow = paneModel.row[prevColumnIndex];
				var newPosition;
				if (shift) {
					var newCol = prevCol > 1 ? prevCol - 1 : 1;
					newPosition = { row: prevRow, col: newCol };
				}
				else {
					var newCol = prevCol <= grid.cols ? prevCol : grid.cols;
					newPosition = { row: prevRow, col: newCol };
				}
				$(paneElement).attr("data-sizex", Math.min(paneModel.col_width(), grid.cols))
					.attr("data-row", newPosition.row)
					.attr("data-col", newPosition.col);
			});
		}
		updateGridColumnControls();
		userColumns = grid.cols;
	}

	function updateGridColumnControls() {
		var col_controls = $(".column-tool");
		var available_width = $("#board-content").width();
		var max_columns = Math.floor(available_width / COLUMN_WIDTH);

		if (grid.cols <= MIN_COLUMNS) {
			col_controls.addClass("min");
		}
		else {
			col_controls.removeClass("min");
		}

		if (grid.cols >= max_columns) {
			col_controls.addClass("max");
		}
		else {
			col_controls.removeClass("max");
		}
	}

	function getMaxDisplayableColumnCount() {
		var available_width = $("#board-content").width();
		return Math.floor(available_width / COLUMN_WIDTH);
	}

	function updateGridWidth(newCols) {
		if (newCols === undefined || newCols < MIN_COLUMNS) {
			newCols = MIN_COLUMNS;
		}

		var max_columns = getMaxDisplayableColumnCount();
		if (newCols > max_columns) {
			newCols = max_columns;
		}

		// +newCols to account for scaling on zoomed browsers
		var new_width = (COLUMN_WIDTH * newCols) + newCols;
		$(".responsive-column-width").css("max-width", new_width);

		if (newCols === grid.cols) {
			return false;
		}
		else {
			return true;
		}
	}

	function repositionGrid(repositionFunction) {
		var rootElement = grid.$el;

		rootElement.find("> li").unbind().removeData();
		$(".responsive-column-width").css("width", "");
		grid.generate_grid_and_stylesheet();

		rootElement.find("> li").each(repositionFunction);

		grid.init();
		$(".responsive-column-width").css("width", grid.cols * PANE_WIDTH + (grid.cols * PANE_MARGIN * 2));
	}

	function getUserColumns() {
		return userColumns;
	}

	function setUserColumns(numCols) {
		userColumns = Math.max(MIN_COLUMNS, numCols);
	}

	ko.bindingHandlers.grid = {
		init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
			// Initialize our grid
			freeboard._gridRootElement = element
			grid = $(element).gridster({
				widget_margins: [PANE_MARGIN, PANE_MARGIN],
				widget_base_dimensions: [PANE_WIDTH, 10],
				resize: {
					enabled: false,
					axes: "x"
				}
			}).data("gridster");

			processResize(false)

			grid.disable();
		}
	}

	function addPane(element, viewModel, isEditing) {
		var position = getPositionForScreenSize(viewModel);
		var col = position.col;
		var row = position.row;
		var width = Number(viewModel.width());
		var height = Number(viewModel.getCalculatedHeight());

		grid.add_widget(element, width, height, col, row);

		if (isEditing) {
			showPaneEditIcons(true);
		}

		updatePositionForScreenSize(viewModel, row, col);

		$(element).attrchange({
			trackValues: true,
			callback: function (event) {
				if (event.attributeName == "data-row") {
					updatePositionForScreenSize(viewModel, Number(event.newValue), undefined);
				}
				else if (event.attributeName == "data-col") {
					updatePositionForScreenSize(viewModel, undefined, Number(event.newValue));
				}
			}
		});
	}

	function updatePane(element, viewModel) {
		// If widget has been added or removed
		var calculatedHeight = viewModel.getCalculatedHeight();

		var elementHeight = Number($(element).attr("data-sizey"));
		var elementWidth = Number($(element).attr("data-sizex"));

		if (calculatedHeight != elementHeight || viewModel.col_width() != elementWidth) {
			grid.resize_widget($(element), viewModel.col_width(), calculatedHeight, function () {
				grid.set_dom_grid_height();
			});
		}
	}

	function updatePositionForScreenSize(paneModel, row, col) {
		var displayCols = grid.cols;

		if (!_.isUndefined(row)) paneModel.row[displayCols] = row;
		if (!_.isUndefined(col)) paneModel.col[displayCols] = col;
	}

	function showLoadingIndicator(show) {
		if (show) {
			loadingIndicator.fadeOut(0).appendTo("body").fadeIn(500);
		}
		else {
			loadingIndicator.fadeOut(500).remove();
		}
	}

	function showPaneEditIcons(show, animate) {
		if (_.isUndefined(animate)) {
			animate = true;
		}

		var animateLength = (animate) ? 250 : 0;

		if (show) {
			$(".pane-tools").fadeIn(animateLength);//.css("display", "block").animate({opacity: 1.0}, animateLength);
			$("#column-tools").fadeIn(animateLength);
		}
		else {
			$(".pane-tools").fadeOut(animateLength);//.animate({opacity: 0.0}, animateLength).css("display", "none");//, function()
			$("#column-tools").fadeOut(animateLength);
		}
	}

	function attachWidgetEditIcons(element) {
		$(element).hover(function () {
			showWidgetEditIcons(this, true);
		}, function () {
			showWidgetEditIcons(this, false);
		});
	}

	function showWidgetEditIcons(element, show) {
		if (show) {
			$(element).find(".sub-section-tools").fadeIn(250);
		}
		else {
			$(element).find(".sub-section-tools").fadeOut(250);
		}
	}

	function getPositionForScreenSize(paneModel) {
		var cols = grid.cols;

		if (_.isNumber(paneModel.row) && _.isNumber(paneModel.col)) // Support for legacy format
		{
			var obj = {};
			obj[cols] = paneModel.row;
			paneModel.row = obj;


			obj = {};
			obj[cols] = paneModel.col;
			paneModel.col = obj;
		}

		var newColumnIndex = 1;
		var columnDiff = 1000;

		for (var columnIndex in paneModel.col) {
			if (columnIndex == cols)	 // If we already have a position defined for this number of columns, return that position
			{
				return { row: paneModel.row[columnIndex], col: paneModel.col[columnIndex] };
			}
			else if (paneModel.col[columnIndex] > cols) // If it's greater than our display columns, put it in the last column
			{
				newColumnIndex = cols;
			}
			else // If it's less than, pick whichever one is closest
			{
				var delta = cols - columnIndex;

				if (delta < columnDiff) {
					newColumnIndex = columnIndex;
					columnDiff = delta;
				}
			}
		}

		if (newColumnIndex in paneModel.col && newColumnIndex in paneModel.row) {
			return { row: paneModel.row[newColumnIndex], col: paneModel.col[newColumnIndex] };
		}

		return { row: 1, col: newColumnIndex };
	}


	// Public Functions
	return {
		showLoadingIndicator: function (show) {
			showLoadingIndicator(show);
		},
		showPaneEditIcons: function (show, animate) {
			showPaneEditIcons(show, animate);
		},
		attachWidgetEditIcons: function (element) {
			attachWidgetEditIcons(element);
		},
		getPositionForScreenSize: function (paneModel) {
			return getPositionForScreenSize(paneModel);
		},
		processResize: function (layoutWidgets) {
			processResize(layoutWidgets);
		},
		disableGrid: function () {
			grid.disable();
		},
		enableGrid: function () {
			grid.enable();
		},
		addPane: function (element, viewModel, isEditing) {
			addPane(element, viewModel, isEditing);
		},
		updatePane: function (element, viewModel) {
			updatePane(element, viewModel);
		},
		removePane: function (element) {
			grid.remove_widget(element);
		},
		removeAllPanes: function () {
			grid.remove_all_widgets();
		},
		addGridColumnLeft: function () {
			addGridColumn(true);
		},
		addGridColumnRight: function () {
			addGridColumn(false);
		},
		subGridColumnLeft: function () {
			subtractGridColumn(true);
		},
		subGridColumnRight: function () {
			subtractGridColumn(false);
		},
		getUserColumns: function () {
			return getUserColumns();
		},
		setUserColumns: function (numCols) {
			setUserColumns(numCols);
		}
	}
}

JSEditor = function () {
	var assetRoot = ""

	function setAssetRoot(_assetRoot) {
		assetRoot = _assetRoot;
	}

	function displayJSEditor(value, callback) {

		var exampleText = "// Example: Convert temp from C to F and truncate to 2 decimal places.\n// return (datasources[\"MyDatasource\"].sensor.tempInF * 1.8 + 32).toFixed(2);";

		// If value is empty, go ahead and suggest something
		if (!value) {
			value = exampleText;
		}

		var codeWindow = $('<div class="code-window"></div>');
		var codeMirrorWrapper = $('<div class="code-mirror-wrapper"></div>');
		var codeWindowFooter = $('<div class="code-window-footer"></div>');
		var codeWindowHeader = $('<div class="code-window-header cm-s-ambiance">This javascript will be re-evaluated any time a datasource referenced here is updated, and the value you <code><span class="cm-keyword">return</span></code> will be displayed in the widget. You can assume this javascript is wrapped in a function of the form <code><span class="cm-keyword">function</span>(<span class="cm-def">datasources</span>)</code> where datasources is a collection of javascript objects (keyed by their name) corresponding to the most current data in a datasource.</div>');

		codeWindow.append([codeWindowHeader, codeMirrorWrapper, codeWindowFooter]);

		$("body").append(codeWindow);

		var codeMirrorEditor = CodeMirror(codeMirrorWrapper.get(0),
			{
				value: value,
				mode: "javascript",
				theme: "ambiance",
				indentUnit: 4,
				lineNumbers: true,
				matchBrackets: true,
				autoCloseBrackets: true
			}
		);

		var closeButton = $('<span id="dialog-cancel" class="text-button">Close</span>').click(function () {
			if (callback) {
				var newValue = codeMirrorEditor.getValue();

				if (newValue === exampleText) {
					newValue = "";
				}

				callback(newValue);
				codeWindow.remove();
			}
		});

		codeWindowFooter.append(closeButton);
	}

	// Public API
	return {
		displayJSEditor: function (value, callback) {
			displayJSEditor(value, callback);
		},
		setAssetRoot: function (assetRoot) {
			setAssetRoot(assetRoot)
		}
	}
}

function PaneModel(theFreeboardModel, widgetPlugins) {
	var self = this;

	this.title = ko.observable();
	this.width = ko.observable(1);
	this.row = {};
	this.col = {};

	this.col_width = ko.observable(1);

	//refit the text
	this.title.subscribe(function(v){
		freeboard.ui.processResize()
	})
	this.col_width.subscribe(function(newValue)
	{
		self.processSizeChange();
	});

	this.widgets = ko.observableArray();

	this.addWidget = function (widget) {
		this.widgets.push(widget);
	}

	this.widgetCanMoveUp = function (widget) {
		return (self.widgets.indexOf(widget) >= 1);
	}

	this.widgetCanMoveDown = function (widget) {
		var i = self.widgets.indexOf(widget);

		return (i < self.widgets().length - 1);
	}

	this.moveWidgetUp = function (widget) {
		if (self.widgetCanMoveUp(widget)) {
			var i = self.widgets.indexOf(widget);
			var array = self.widgets();
			self.widgets.splice(i - 1, 2, array[i], array[i - 1]);
		}
	}

	this.moveWidgetDown = function (widget) {
		if (self.widgetCanMoveDown(widget)) {
			var i = self.widgets.indexOf(widget);
			var array = self.widgets();
			self.widgets.splice(i, 2, array[i + 1], array[i]);
		}
	}

	this.processSizeChange = function()
	{
		// Give the animation a moment to complete. Really hacky.
		// TODO: Make less hacky. Also, doesn't work when screen resizes.
		setTimeout(function(){
			_.each(self.widgets(), function (widget) {
				widget.processSizeChange();
			});
		}, 1000);
	}

	this.getCalculatedHeight = function () {
		var sumHeights = _.reduce(self.widgets(), function (memo, widget) {
			return memo + widget.height();
		}, 0);

		//Convert from 60px height blocks presumably
		sumHeights *= 6;

		//Add 3 because we want an extra 30px for... margins?
		sumHeights += 3;

		sumHeights *= 10;

		// var extraGridSize = getComputedStyle(document.documentElement).getPropertyValue('--extra-grid-height')
		// //Remove the px
		// extraGridSize = extraGridSize.substring(0,extraGridSize.length-2);

		// sumHeights+= extraGridSize;

		var titleHeight = getComputedStyle(document.documentElement).getPropertyValue('--pane-header-line-height')
		//Remove the px
		titleHeight = titleHeight.substring(0,titleHeight.length-2);
		var rows = Math.ceil((sumHeights + parseFloat(titleHeight)) / 30);

		return Math.max(4, rows);
	}

	this.serialize = function () {
		var widgets = [];

		_.each(self.widgets(), function (widget) {
			widgets.push(widget.serialize());
		});

		if(_.isUndefined(self.row)||_.isUndefined(self.row))
		{
			freeboard.showDialog($("<div>Invalid grid, cannot save. Perhaps element is in an invalid position?</div>"),"Error","OK")
			throw Error("Undefined row or column attribute")
		}
		return {
			title: self.title(),
			width: self.width(),
			row: self.row,
			col: self.col,
			col_width: Number(self.col_width()),
			widgets: widgets
		};
	}

	this.deserialize = function (object) {
		self.title(object.title);
		self.width(object.width);

		self.row = object.row;
		self.col = object.col;
		self.col_width(object.col_width || 1);

		_.each(object.widgets, function (widgetConfig) {
			var widget = new WidgetModel(theFreeboardModel, widgetPlugins);
			widget.deserialize(widgetConfig);
			self.widgets.push(widget);
		});
	}

	this.dispose = function () {
		_.each(self.widgets(), function (widget) {
			widget.dispose();
		});
	}
}

PluginEditor = function (jsEditor, valueEditor) {
	function _displayValidationError(settingName, errorMessage) {
		var errorElement = $('<div class="validation-error"></div>').html(errorMessage);
		$("#setting-value-container-" + settingName).append(errorElement);
	}

	function _removeSettingsRows() {
		if ($("#setting-row-instance-name").length) {
			$("#setting-row-instance-name").nextAll().remove();
		}
		else {
			$("#setting-row-plugin-types").nextAll().remove();
		}
	}

	function _isNumerical(n) {
		return !isNaN(parseFloat(n)) && isFinite(n);
	}

	function _appendCalculatedSettingRow(valueCell, newSettings, settingDef, currentValue, includeRemove, target) {
		var input = $('<textarea></textarea>');

		if (settingDef.multi_input) {
			input.change(function () {
				var arrayInput = [];
				$(valueCell).find('textarea').each(function () {
					var thisVal = $(this).val();
					if (thisVal) {
						arrayInput = arrayInput.concat(thisVal);
					}
				});
				newSettings.settings[settingDef.name] = arrayInput;
			});
		} else {
			input.change(function () {
				newSettings.settings[settingDef.name] = $(this).val();
			});
		}

		if (currentValue) {
			input.val(currentValue);
		}

		valueEditor.createValueEditor(input);

		var datasourceToolbox = $('<ul class="board-toolbar datasource-input-suffix"></ul>');
		var wrapperDiv = $('<div class="calculated-setting-row"></div>');
		wrapperDiv.append(input).append(datasourceToolbox);

		if (settingDef.type=='target') {
			var datasourceTool = $('<li><i class="icon-plus icon-white"></i><label>DATATARGET</label></li>')
				.mousedown(function (e) {
					e.preventDefault();
					if ($(input).is(":focus")) {
						$(input).insertAtCaret("datasources[\"").trigger("freeboard-eval");
					}
					else {
						$(input).val("").focus().insertAtCaret("datasources[\"").trigger("freeboard-eval");
					}
				});
				datasourceToolbox.append(datasourceTool);

		}
		else {
			if(settingDef.type=='calculated')
			var datasourceTool = $('<li><i class="icon-plus icon-white"></i><label>DATASOURCE</label></li>')
				.mousedown(function (e) {
					e.preventDefault();

					if ($(input).val().length == 0) {
						$(input).insertAtCaret('=')
					}
					$(input).insertAtCaret("datasources[\"").trigger("freeboard-eval");

				});
				datasourceToolbox.append(datasourceTool);

		}

		if (!(settingDef.type=='target')) {
			var jsEditorTool = $('<li><i class="icon-fullscreen icon-white"></i><label>JS EDITOR</label></li>')
				.mousedown(function (e) {
					e.preventDefault();
					jsEditor.displayJSEditor(input.val(), function (result) {
						input.val(result);
						input.change();
					});
				});
			datasourceToolbox.append(jsEditorTool);
		}

		if (includeRemove) {
			var removeButton = $('<li class="remove-setting-row"><i class="icon-minus icon-white"></i><label></label></li>')
				.mousedown(function (e) {
					e.preventDefault();
					wrapperDiv.remove();
					$(valueCell).find('textarea:first').change();
				});
			datasourceToolbox.prepend(removeButton);
		}

		$(valueCell).append(wrapperDiv);
	}

	function createPluginEditor(title, pluginTypes, currentTypeName, currentSettingsValues, settingsSavedCallback) {
		var newSettings = {
			type: currentTypeName,
			settings: {}
		};

		function createSettingRow(name, displayName, regex) {
			var tr = $('<div id="setting-row-' + name + '" class="form-row"></div>').appendTo(form);

			tr.append('<div class="form-label"><label class="control-label">' + displayName + '</label></div>');
			return $('<div id="setting-value-container-' + name + '" class="form-value"></div>').appendTo(tr);
		}

		var selectedType;
		var form = $('<div></div>');

		var pluginDescriptionElement = $('<div id="plugin-description"></div>').hide();
		form.append(pluginDescriptionElement);

		var toDestroy = []

		function createSettingsFromDefinition(settingsDefs, typeaheadSource, typeaheadDataSegment) {
			_.each(settingsDefs, function (settingDef) {
				// Set a default value if one doesn't exist
				if (!_.isUndefined(settingDef.default_value) && _.isUndefined(currentSettingsValues[settingDef.name])) {
					currentSettingsValues[settingDef.name] = settingDef.default_value;
				}

				var displayName = settingDef.name;

				if (!_.isUndefined(settingDef.display_name)) {
					displayName = settingDef.display_name;
				}


				var valueCell = createSettingRow(settingDef.name, displayName);

				switch (settingDef.type) {
					case "array":
						{
							var subTableDiv = $('<div class="form-table-value-subtable"></div>').appendTo(valueCell);

							var subTable = $('<table class="table table-condensed sub-table"></table>').appendTo(subTableDiv);
							var subTableHead = $("<thead></thead>").hide().appendTo(subTable);
							var subTableHeadRow = $("<tr></tr>").appendTo(subTableHead);
							var subTableBody = $('<tbody></tbody>').appendTo(subTable);

							var currentSubSettingValues = [];

							// Create our headers
							_.each(settingDef.settings, function (subSettingDef) {
								var subsettingDisplayName = subSettingDef.name;

								if (!_.isUndefined(subSettingDef.display_name)) {
									subsettingDisplayName = subSettingDef.display_name;
								}

								$('<th>' + subsettingDisplayName + '</th>').appendTo(subTableHeadRow);

								if ((['text', 'datasource', 'target'].indexOf(subSettingDef.type) > -1) && subSettingDef.options) {
									$('<datalist></datalist>').attr("id", settingDef.name + subSettingDef.name + "ac").appendTo(subTableHeadRow);
									$.each(subSettingDef.options(), function (i, item) {
										$("#" + settingDef.name + subSettingDef.name + "ac").append($("<option>").attr('value', i).text(item));
									});
								}
							});

							if (settingDef.name in currentSettingsValues) {
								currentSubSettingValues = currentSettingsValues[settingDef.name];
							}

							function processHeaderVisibility() {
								if (newSettings.settings[settingDef.name].length > 0) {
									subTableHead.show();
								}
								else {
									subTableHead.hide();
								}
							}

							function createSubsettingRow(subsettingValue) {
								var subsettingRow = $('<tr></tr>').appendTo(subTableBody);

								var newSetting = {};

								if (!_.isArray(newSettings.settings[settingDef.name])) {
									newSettings.settings[settingDef.name] = [];
								}

								newSettings.settings[settingDef.name].push(newSetting);




								_.each(settingDef.settings, function (subSettingDef) {
									var subsettingCol = $('<td></td>').appendTo(subsettingRow);
									var subsettingValueString = "";

									if (!_.isUndefined(subsettingValue[subSettingDef.name])) {
										subsettingValueString = subsettingValue[subSettingDef.name];
									}

									newSetting[subSettingDef.name] = subsettingValueString;

									if (subSettingDef.type == "option") {
										var input = $('<select></select>').appendTo($('<div class="styled-select"></div>').appendTo(subsettingCol)).change(function () {
											newSetting[subSettingDef.name] = $(this).val();

										});

										_.each(subSettingDef.options, function (option) {

											var optionName;
											var optionValue;

											if (_.isObject(option)) {
												optionName = option.name;
												optionValue = option.value;
											}
											else {
												optionName = option;
											}

											if (_.isUndefined(optionValue)) {
												optionValue = optionName;
											}

											if (_.isUndefined(defaultValue)) {
												defaultValue = optionValue;
											}

											$("<option></option>").text(optionName).attr("value", optionValue).appendTo(input);
										});


										input.val(currentSettingsValues[subsettingValueString]);

									}
									else if (subSettingDef.type == 'color') {


										var color = $('<div>EDIT</div>').attr('id', subSettingDef.name + '-picker').appendTo(valueCell);

										var parent = document.querySelector('#' + subSettingDef.name + '-picker');
										var currentcolor = subsettingValueString || 'black';


										color.css({ 'color': currentcolor })
										var picker = new Picker({ parent: parent, color: currentcolor });

										newSetting[subSettingDef.name] = subsettingValueString || 'rgb(0,0,0)'


										picker.onChange = function (color) {
											newSetting[subSettingDef.name] = color.rgbastring;
											color.css({ 'color': color.rgbastring })

										};

									}
									else {
										$('<input class="table-row-value" type="text">').appendTo(subsettingCol).val(subsettingValueString).attr('list', settingDef.name + subSettingDef.name + "ac").change(function () {
											newSetting[subSettingDef.name] = $(this).val();
										});
									}
								});

								subsettingRow.append($('<td class="table-row-operation"></td>').append($('<ul class="board-toolbar"></ul>').append($('<li></li>').append($('<i class="icon-trash icon-white"></i>').click(function () {
									var subSettingIndex = newSettings.settings[settingDef.name].indexOf(newSetting);

									if (subSettingIndex != -1) {
										newSettings.settings[settingDef.name].splice(subSettingIndex, 1);
										subsettingRow.remove();
										processHeaderVisibility();
									}
								})))));

								subTableDiv.scrollTop(subTableDiv[0].scrollHeight);

								processHeaderVisibility();
							}

							$('<div class="table-operation text-button">ADD</div>').appendTo(valueCell).click(function () {
								var newSubsettingValue = {};

								_.each(settingDef.settings, function (subSettingDef) {
									newSubsettingValue[subSettingDef.name] = "";
								});

								createSubsettingRow(newSubsettingValue);
							});

							// Create our rows
							_.each(currentSubSettingValues, function (currentSubSettingValue, subSettingIndex) {
								createSubsettingRow(currentSubSettingValue);
							});

							break;
						}

					case "html-wysywig":
						{
							//We use font awesome instead of the SVG
							$.trumbowyg.svgPath = false;
							$.trumbowyg.hideButtonTexts = true;

							newSettings.settings[settingDef.name] = currentSettingsValues[settingDef.name];

							var text = $('<div><label>' + settingDef.name + '</label> <br> <textarea id="' + settingDef.name + '-trumbo"></textarea></div>').appendTo(valueCell);
							var l = ["ffffff", "000000", "eeece1", "1f497d", "4f81bd", "c0504d", "9bbb59", "8064a2", "4bacc6", "f79646", "ffff00", "f2f2f2", "7f7f7f", "ddd9c3", "c6d9f0", "dbe5f1", "f2dcdb", "ebf1dd"]
							$('#' + settingDef.name + '-trumbo').trumbowyg({
								btns: [
									['viewHTML'],
									['undo', 'redo'], // Only supported in Blink browsers
									['formatting'],
									['strong', 'em', 'del'],
									['superscript', 'subscript'],
									['foreColor', 'backColor'],
									['link'],
									['base64'],
									['justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull'],
									['unorderedList', 'orderedList'],
									['horizontalRule'],
									['removeformat'],
									['fullscreen'],
									['fontsize', 'fontfamily', 'preformatted'],
									['emoji', 'table', 'specialChars']
								],
								plugins: {
									colors: {
										displayAsList: true,
										foreColorList: l,
										backColorList: l,

									},
									fontfamily:
									{
										fontList: [
											{ name: 'Seriff', family: 'FBSerif' },
											{ name: 'Color Emoji', family: 'NotoColorEmoji' },
											{ name: 'Sans', family: 'FBSans' },
											{ name: 'Monospace', family: 'FBMono' },
											{ name: 'Cursive', family: 'FBCursive' },
											{ name: 'Pandora', family: 'Pandora' },
											{ name: 'Chalkboard', family: 'Chalkboard' },
											{ name: 'Handwriting', family: 'Handwriting' },
											{ name: 'Rough Script', family: 'RoughScript' },
											{ name: 'Chancery', family: 'Chancery' },
											{ name: 'Comic', family: 'FBComic' },
											{ name: 'Blackletter', family: 'Blackletter' },
											{ name: 'Stencil', family: 'Stencil' },
											{ name: 'Pixel', family: 'Pixel' },
											{ name: 'B612', family: 'B612' },
											{ name: 'DIN', family: 'DIN' },
											{ name: 'Penguin Attack', family: 'PenguinAttack' },
											{ name: 'DSEG7', family: 'DSEG7' },
											{ name: 'DSEG14', family: 'DSEG14' }


										]
									}
								}
							});


							$('#' + settingDef.name + '-trumbo').on('tbwchange', function (e) {
								newSettings.settings[settingDef.name] = $('#' + settingDef.name + '-trumbo').trumbowyg('html')
							});
							$('#' + settingDef.name + '-trumbo').on('tbwblur', function (e) {
								newSettings.settings[settingDef.name] = $('#' + settingDef.name + '-trumbo').trumbowyg('html')
							});


							if (settingDef.name in currentSettingsValues) {
								$('#' + settingDef.name + '-trumbo').trumbowyg('html', currentSettingsValues[settingDef.name])
							}
							toDestroy.push($('#editor').trumbowyg)

							break;
						}

					case "boolean":
						{
							newSettings.settings[settingDef.name] = currentSettingsValues[settingDef.name];

							var onOffSwitch = $('<div class="onoffswitch"><label class="onoffswitch-label" for="' + settingDef.name + '-onoff"><div class="onoffswitch-inner"><span class="on">YES</span><span class="off">NO</span></div><div class="onoffswitch-switch"></div></label></div>').appendTo(valueCell);

							var input = $('<input type="checkbox" name="onoffswitch" class="onoffswitch-checkbox" id="' + settingDef.name + '-onoff">').prependTo(onOffSwitch).change(function () {
								newSettings.settings[settingDef.name] = this.checked;
							});

							if (settingDef.name in currentSettingsValues) {
								input.prop("checked", currentSettingsValues[settingDef.name]);
							}

							break;
						}

					case "json":
						{
							newSettings.settings[settingDef.name] = currentSettingsValues[settingDef.name];

							var input = $('<button>EDIT</button>').appendTo(valueCell).on('click',
								function () {
									var x = [];
									freeboard.showDialog($('<div id="fb-global-json-editor">'), settingDef, name, "OK", "Cancel",
										function () {
											newSettings.settings[settingDef.name] = x[0].getValue()
											x[0].destroy();
										},
										function () {
											x[0].destroy();
										}
									)

									var Editor = new JSONEditor(document.getElementById('fb-global-json-editor'), { schema: settingDef.schema });
									x.push(Editor);
									try {
										Editor.setValue(newSettings.settings[settingDef.name]|| {})
									}
									catch (e) {
										console.log(e)
									}

								})
							break;
		}


					case "button":
		{
			var input = $('<button></button>').appendTo($('<div class="styled-select"></div>').appendTo(valueCell)).html(settingDef.html).on('click', function () {
				settingDef.onclick(currentSettingsValues, freeboard.getDatasourceInstance(currentSettingsValues.name));
			});

			break;
		}

					case "option":
		{
			var defaultValue = currentSettingsValues[settingDef.name];

			var input = $('<select></select>').appendTo($('<div class="styled-select"></div>').appendTo(valueCell)).change(function () {
				newSettings.settings[settingDef.name] = $(this).val();
			});

			_.each(settingDef.options, function (option) {

				var optionName;
				var optionValue;

				if (_.isObject(option)) {
					optionName = option.name;
					optionValue = option.value;
				}
				else {
					optionName = option;
				}

				if (_.isUndefined(optionValue)) {
					optionValue = optionName;
				}

				if (_.isUndefined(defaultValue)) {
					defaultValue = optionValue;
				}

				$("<option></option>").text(optionName).attr("value", optionValue).appendTo(input);
			});

			newSettings.settings[settingDef.name] = defaultValue;

			if (settingDef.name in currentSettingsValues) {
				input.val(currentSettingsValues[settingDef.name]);
			}

			break;
		}
					default:
		{
			newSettings.settings[settingDef.name] = currentSettingsValues[settingDef.name];

			if (settingDef.type == "calculated" || settingDef.type == "target" || settingDef.type == "constructor") {
				var target = settingDef.type == "target";

				if (settingDef.name in currentSettingsValues) {
					var currentValue = currentSettingsValues[settingDef.name];
					if (settingDef.multi_input && _.isArray(currentValue)) {
						var includeRemove = false;
						for (var i = 0; i < currentValue.length; i++) {
							_appendCalculatedSettingRow(valueCell, newSettings, settingDef, currentValue[i], includeRemove, target);
							includeRemove = true;
						}
					} else {
						_appendCalculatedSettingRow(valueCell, newSettings, settingDef, currentValue, false, target);
					}
				} else {
					_appendCalculatedSettingRow(valueCell, newSettings, settingDef, null, false, target);
				}

				if (settingDef.multi_input) {
					var inputAdder = $('<ul class="board-toolbar"><li class="add-setting-row"><i class="icon-plus icon-white"></i><label>ADD</label></li></ul>')
						.mousedown(function (e) {
							e.preventDefault();
							_appendCalculatedSettingRow(valueCell, newSettings, settingDef, null, true, target);
						});
					$(valueCell).siblings('.form-label').append(inputAdder);
				}
			}
			else {


				if (settingDef.name == 'name') {
					//Discourage names that are not valid identifiers
					var defaultregex = '[a-zA-Z][a-zA-Z0-9_]+'
				}
				else {
					var defaultregex = null;
				}

				var regex = settingDef.regex;
				if (_.isUndefined(settingDef.regex)) {
					regex = defaultregex;
				}


				if (settingDef.options) {
					$('<datalist></datalist>').attr("id", settingDef.name + "ac").appendTo(valueCell);
					$.each(settingDef.options(), function (i, item) {
						$("#" + settingDef.name + "ac").append($("<option>").attr('value', i).text(item || i));
					});
				}


				var input = $('<input type="text">').appendTo(valueCell).attr('pattern', regex).attr('list', settingDef.name + "ac").change(function () {
					if (settingDef.type == "number") {
						newSettings.settings[settingDef.name] = Number($(this).val());
					}
					else {
						newSettings.settings[settingDef.name] = $(this).val();
					}
				});

				if (settingDef.type == "integer") {
					input.attr('type', 'number')
				}

				if (settingDef.name in currentSettingsValues) {
					input.val(currentSettingsValues[settingDef.name]);
				}

				if (typeaheadSource && settingDef.typeahead_data_field) {
					input.addClass('typeahead_data_field-' + settingDef.typeahead_data_field);
				}

				if (typeaheadSource && settingDef.typeahead_field) {
					var typeaheadValues = [];

					input.keyup(function (event) {
						if (event.which >= 65 && event.which <= 91) {
							input.trigger('change');
						}
					});

					$(input).autocomplete({
						source: typeaheadValues,
						select: function (event, ui) {
							input.val(ui.item.value);
							input.trigger('change');
						}
					});

					input.change(function (event) {
						var value = input.val();
						var source = _.template(typeaheadSource)({ input: value });
						$.get(source, function (data) {
							if (typeaheadDataSegment) {
								data = data[typeaheadDataSegment];
							}
							data = _.select(data, function (elm) {
								return elm[settingDef.typeahead_field][0] == value[0];
							});

							typeaheadValues = _.map(data, function (elm) {
								return elm[settingDef.typeahead_field];
							});
							$(input).autocomplete("option", "source", typeaheadValues);

							if (data.length == 1) {
								data = data[0];
								//we found the one. let's use it to populate the other info
								for (var field in data) {
									if (data.hasOwnProperty(field)) {
										var otherInput = $(_.template('input.typeahead_data_field-<%= field %>')({ field: field }));
										if (otherInput) {
											otherInput.val(data[field]);
											if (otherInput.val() != input.val()) {
												otherInput.trigger('change');
											}
										}
									}
								}
							}
						});
					});
				}
			}

			break;
		}
	}

	if (!_.isUndefined(settingDef.suffix)) {
		valueCell.append($('<div class="input-suffix">' + settingDef.suffix + '</div>'));
	}

	if (!_.isUndefined(settingDef.description)) {
		valueCell.append($('<div class="setting-description">' + settingDef.description + '</div>'));
	}
});
		}


new DialogBox(form, title, "Save", "Cancel", function () {
	$(".validation-error").remove();

	// Loop through each setting and validate it
	for (var index = 0; index < selectedType.settings.length; index++) {
		var settingDef = selectedType.settings[index];

		if (settingDef.required && (_.isUndefined(newSettings.settings[settingDef.name]) || newSettings.settings[settingDef.name] == "")) {
			_displayValidationError(settingDef.name, "This is required.");
			return true;
		}
		else if (settingDef.type == "integer" && (newSettings.settings[settingDef.name] % 1 !== 0)) {
			_displayValidationError(settingDef.name, "Must be a whole number.");
			return true;
		}
		else if (settingDef.type == "number" && !_isNumerical(newSettings.settings[settingDef.name])) {
			_displayValidationError(settingDef.name, "Must be a number.");
			return true;
		}
	}

	if (_.isFunction(settingsSavedCallback)) {
		settingsSavedCallback(newSettings);
	}
});

for (var i of toDestroy) {
	i('destroy')
}

// Create our body
var pluginTypeNames = _.keys(pluginTypes);
var typeSelect;

if (pluginTypeNames.length > 1) {
	var typeRow = createSettingRow("plugin-types", "Type");
	typeSelect = $('<select></select>').appendTo($('<div class="styled-select"></div>').appendTo(typeRow));

	typeSelect.append($("<option>Select a type...</option>").attr("value", "undefined"));

	_.each(pluginTypes, function (pluginType) {
		typeSelect.append($("<option></option>").text(pluginType.display_name).attr("value", pluginType.type_name));
	});

	typeSelect.change(function () {
		newSettings.type = $(this).val();
		newSettings.settings = {};

		// Remove all the previous settings
		_removeSettingsRows();

		selectedType = pluginTypes[typeSelect.val()];

		if (_.isUndefined(selectedType)) {
			$("#setting-row-instance-name").hide();
			$("#dialog-ok").hide();
		}
		else {
			$("#setting-row-instance-name").show();

			if (selectedType.description && selectedType.description.length > 0) {
				pluginDescriptionElement.html(selectedType.description).show();
			}
			else {
				pluginDescriptionElement.hide();
			}

			$("#dialog-ok").show();
			createSettingsFromDefinition(selectedType.settings, selectedType.typeahead_source, selectedType.typeahead_data_segment);
		}
	});
}
else if (pluginTypeNames.length == 1) {
	selectedType = pluginTypes[pluginTypeNames[0]];
	newSettings.type = selectedType.type_name;
	newSettings.settings = {};
	createSettingsFromDefinition(selectedType.settings);
}

if (typeSelect) {
	if (_.isUndefined(currentTypeName)) {
		$("#setting-row-instance-name").hide();
		$("#dialog-ok").hide();
	}
	else {
		$("#dialog-ok").show();
		typeSelect.val(currentTypeName).trigger("change");
	}
}
	}

// Public API
return {
	createPluginEditor: function (
		title,
		pluginTypes,
		currentInstanceName,
		currentTypeName,
		currentSettingsValues,
		settingsSavedCallback) {
		createPluginEditor(title, pluginTypes, currentInstanceName, currentTypeName, currentSettingsValues, settingsSavedCallback);
	}
}
}

ValueEditor = function(theFreeboardModel)
{
	var _veDatasourceRegex = new RegExp(".*datasources\\[\"([^\"]*)(\"\\])?(.*)$");
	//var identifierRegex = new RegExp("[a-zA-Z][a-zA-Z0-9_]+")

	var dropdown = null;
	var selectedOptionIndex = 0;
	var _autocompleteOptions = [];
	var currentValue = null;

	var EXPECTED_TYPE = {
		ANY : "any",
		ARRAY : "array",
		OBJECT : "object",
		STRING : "string",
		NUMBER : "number",
		BOOLEAN : "boolean"
	};

	function _isPotentialTypeMatch(value, expectsType)
	{
		if(_.isArray(value) || _.isObject(value))
		{
			return true;
		}
		return _isTypeMatch(value, expectsType);
	}

	function _isTypeMatch(value, expectsType) {
		switch(expectsType)
		{
		case EXPECTED_TYPE.ANY: return true;
		case EXPECTED_TYPE.ARRAY: return _.isArray(value);
		case EXPECTED_TYPE.OBJECT: return _.isObject(value);
		case EXPECTED_TYPE.STRING: return _.isString(value);
		case EXPECTED_TYPE.NUMBER: return _.isNumber(value);
		case EXPECTED_TYPE.BOOLEAN: return _.isBoolean(value);
		}
	}

	function _checkCurrentValueType(element, expectsType) {
		$(element).parent().find(".validation-error").remove();
		if(!_isTypeMatch(currentValue, expectsType)) {
			$(element).parent().append("<div class='validation-error'>" +
				"This field expects an expression that evaluates to type " +
				expectsType + ".</div>");
		}
	}

	function _resizeValueEditor(element)
	{
		var lineBreakCount = ($(element).val().match(/\n/g) || []).length;

		var newHeight = Math.min(200, 20 * (lineBreakCount + 1));

		$(element).css({height: newHeight + "px"});
	}

	function _autocompleteFromDatasource(inputString, datasources, expectsType, isTarget)
	{
		var match = _veDatasourceRegex.exec(inputString);

		var options = [];

		if(match)
		{
			// Editor value is: datasources["; List all datasources
			if(match[1] == "")
			{
                var prefix=''
                if (inputString=='')
                {
                    prefix='='
                }
				_.each(datasources, function(datasource)
				{
					options.push({value: prefix+datasource.name(), entity: undefined,
						precede_char: "", follow_char: "\"]"});
				});
			}
			// Editor value is a partial match for a datasource; list matching datasources
			else if(match[1] != "" && _.isUndefined(match[2]))
			{
				var replacementString = match[1];

				_.each(datasources, function(datasource)
				{
					var dsName = datasource.name();

					if(dsName != replacementString && dsName.indexOf(replacementString) == 0)
					{
						options.push({value: dsName, entity: undefined,
							precede_char: "", follow_char: "\"]"});
					}
				});
			}
			// Editor value matches a datasources; parse JSON in order to populate list
			else
			{
				// We already have a datasource selected; find it
				var datasource = _.find(datasources, function(datasource)
				{
					return (datasource.name() === match[1]);
				});

				if(!_.isUndefined(datasource))
				{
					var dataPath = "data";
					var remainder = "";

					// Parse the partial JSON selectors
					if(!_.isUndefined(match[2]))
					{
						// Strip any incomplete field values, and store the remainder
						var remainderIndex = match[3].lastIndexOf("]") + 1;
						dataPath = dataPath + match[3].substring(0, remainderIndex);
						remainder = match[3].substring(remainderIndex, match[3].length);
						remainder = remainder.replace(/^[\[\"]*/, "");
						remainder = remainder.replace(/[\"\]]*$/, "");
					}

					// Get the data for the last complete JSON field
					var dataValue = datasource.getDataRepresentation(dataPath);
					currentValue = dataValue;

					// For arrays, list out the indices
					if(_.isArray(dataValue))
					{
						for(var index = 0; index < dataValue.length; index++)
						{
							if(index.toString().indexOf(remainder) == 0)
							{
								var value = dataValue[index];
								if(_isPotentialTypeMatch(value, expectsType))
								{
									options.push({value: index, entity: value,
										precede_char: "[", follow_char: "]",
										preview: value.toString()});
								}
							}
						}
					}
					// For objects, list out the keys
					else if(_.isObject(dataValue))
					{
						_.each(dataValue, function(value, name)
						{
							if(name.indexOf(remainder) == 0)
							{
								if(_isPotentialTypeMatch(value, expectsType))
								{
									options.push({value: name, entity: value,
										precede_char: "[\"", follow_char: "\"]"});
								}
							}
						});
					}
					// For everything else, do nothing (no further selection possible)
					else
					{
                        if (isTarget)
                        {
                            //options.push(" = value")
                        }
						// no-op
					}
				}
			}
		}
		_autocompleteOptions = options;
	}

	function _renderAutocompleteDropdown(element, expectsType)
	{
		var inputString = $(element).val().substring(0, $(element).getCaretPosition());

		// Weird issue where the textarea box was putting in ASCII (nbsp) for spaces.
		inputString = inputString.replace(String.fromCharCode(160), " ");


		_autocompleteFromDatasource(inputString, theFreeboardModel.datasources(), expectsType);

		if(_autocompleteOptions.length > 0)
		{
			if(!dropdown)
			{
				dropdown = $('<ul id="value-selector" class="value-dropdown"></ul>')
					.insertAfter(element)
					.width($(element).outerWidth() - 2)
					.css("left", $(element).position().left)
					.css("top", $(element).position().top + $(element).outerHeight() - 1);
			}

			dropdown.empty();
			dropdown.scrollTop(0);

			var selected = true;
			selectedOptionIndex = 0;

			_.each(_autocompleteOptions, function(option, index)
			{
				var li = _renderAutocompleteDropdownOption(element, inputString, option, index);
				if(selected)
				{
					$(li).addClass("selected");
					selected = false;
				}
			});
		}
		else
		{
			_checkCurrentValueType(element, expectsType);
			$(element).next("ul#value-selector").remove();
			dropdown = null;
			selectedOptionIndex = -1;
		}
	}

	function _renderAutocompleteDropdownOption(element, inputString, option, currentIndex)
	{
		var optionLabel = option.value;
		if(option.preview)
		{
			optionLabel = optionLabel + "<span class='preview'>" + option.preview + "</span>";
		}
		var li = $('<li>' + optionLabel + '</li>').appendTo(dropdown)
			.mouseenter(function()
			{
				$(this).trigger("freeboard-select");
			})
			.mousedown(function(event)
			{
				$(this).trigger("freeboard-insertValue");
				event.preventDefault();
			})
			.data("freeboard-optionIndex", currentIndex)
			.data("freeboard-optionValue", option.value)
			.bind("freeboard-insertValue", function()
			{
				var optionValue = option.value;
				optionValue = option.precede_char + optionValue + option.follow_char;

				
				$(element).insertAtCaret(optionValue);
				

				currentValue = option.entity;
				$(element).triggerHandler("mouseup");
			})
			.bind("freeboard-select", function()
			{
				$(this).parent().find("li.selected").removeClass("selected");
				$(this).addClass("selected");
				selectedOptionIndex = $(this).data("freeboard-optionIndex");
			});
		return li;
	}

	function createValueEditor(element, expectsType)
	{
		$(element).addClass("calculated-value-input")
			.bind("keyup mouseup freeboard-eval", function(event) {
				// Ignore arrow keys and enter keys
				if(dropdown && event.type == "keyup"
					&& (event.keyCode == 38 || event.keyCode == 40 || event.keyCode == 13))
				{
					event.preventDefault();
					return;
				}
				_renderAutocompleteDropdown(element, expectsType);
			})
			.focus(function()
			{
				$(element).css({"z-index" : 3001});
				_resizeValueEditor(element);
			})
			.focusout(function()
			{
				_checkCurrentValueType(element, expectsType);
				$(element).css({
					"height": "",
					"z-index" : 3000
				});
				$(element).next("ul#value-selector").remove();
				dropdown = null;
				selectedOptionIndex = -1;
			})
			.bind("keydown", function(event)
			{

				if(dropdown)
				{
					if(event.keyCode == 38 || event.keyCode == 40) // Handle Arrow keys
					{
						event.preventDefault();

						var optionItems = $(dropdown).find("li");

						if(event.keyCode == 38) // Up Arrow
						{
							selectedOptionIndex--;
						}
						else if(event.keyCode == 40) // Down Arrow
						{
							selectedOptionIndex++;
						}

						if(selectedOptionIndex < 0)
						{
							selectedOptionIndex = optionItems.size() - 1;
						}
						else if(selectedOptionIndex >= optionItems.size())
						{
							selectedOptionIndex = 0;
						}

						var optionElement = $(optionItems).eq(selectedOptionIndex);

						optionElement.trigger("freeboard-select");
						$(dropdown).scrollTop($(optionElement).position().top);
					}
					else if(event.keyCode == 13) // Handle enter key
					{
						event.preventDefault();

						if(selectedOptionIndex != -1)
						{
							$(dropdown).find("li").eq(selectedOptionIndex)
								.trigger("freeboard-insertValue");
						}
					}
				}
			});
	}

	// Public API
	return {
		createValueEditor : function(element, expectsType)
		{
			if(expectsType)
			{
				createValueEditor(element, expectsType);
			}
			else {
				createValueEditor(element, EXPECTED_TYPE.ANY);
			}
		},
		EXPECTED_TYPE : EXPECTED_TYPE
	}
}


function WidgetModel(theFreeboardModel, widgetPlugins) {

	var targetFunctionFromScript = function(script)
	{
		// First we compile the user's code, appending to make it into an assignment to the target
		if(!script)
		{
			return new Function("datasources",'value', "");
		}
		var append =''

		//Assignments or function calls let you ado something other than what you expect with the value.
		if (!(script.includes('=') || script.includes('(')))
		{
			append = '=value'
		}
		var targetFunction = new Function("datasources",'value', script+append);
		
		//Next we wrap this into another function that supplies the neccesary context.
		var f = function (val) {
			return targetFunction(theFreeboardModel.protectedDataSourceData, val);
		}
		
		return f
	}

	function disposeWidgetInstance() {
		if (!_.isUndefined(self.widgetInstance)) {
			if (_.isFunction(self.widgetInstance.onDispose)) {
				self.widgetInstance.onDispose();
			}

			self.widgetInstance = undefined;
		}
	}

	var self = this;

	this.datasourceRefreshNotifications = {};
	this.calculatedSettingScripts = {};

	//When you have a setting of type 'target', that setting gets an entry here, and it's a function you call to set the target with new data.
	this.dataTargets={}

	this.title = ko.observable();
	this.fillSize = ko.observable(false);

	this.type = ''
	
	//Sync function.  We are sure t always call this after calculating settings.
	//Note that we don't have any way to wait on the newinstance function
	//because i don't know how to use head.js with async.  Nonetheless, the api semi-spec already
	//clearly doesn't care about waiting
	this.setType = async function (newValue,settings) {
		if(self.type==newValue)
		{
			return;
		}
		self.type=newValue

		disposeWidgetInstance();
		await self.updateCalculatedSettings();

		if ((newValue in widgetPlugins) && _.isFunction(widgetPlugins[newValue].newInstance)) {
			var widgetType = widgetPlugins[newValue];

			async function finishLoad() {
				    await widgetType.newInstance(self.calculatedSettings, function (widgetInstance) {

					self.fillSize((widgetType.fill_size === true));
					self.widgetInstance = widgetInstance;

				
					self.widgetInstance.dataTargets= self.dataTargets;
                    self.widgetInstance.processCalculatedSetting= self.processCalculatedSetting;

					self.shouldRender(true);
					self._heightUpdate.valueHasMutated();

				});
			}

			// Do we need to load any external scripts?
			if (widgetType.external_scripts) {
				head.js(widgetType.external_scripts.slice(0), finishLoad); // Need to clone the array because head.js adds some weird functions to it
			}
			else {
				finishLoad();
			}
		}
	};

	this.settings = {}

	//After processing
	this.calculatedSettings = {}
	
	this.setSettings = async function (newValue) {
		this.settings=newValue

		//Make the processed copy
		Object.assign(this.calculatedSettings,this.settings);

		//Now we are gonna calc the real values
		await self.updateCalculatedSettings();

		if (!_.isUndefined(self.widgetInstance) && _.isFunction(self.widgetInstance.onSettingsChanged)) {
			try{
				await self.widgetInstance.onSettingsChanged(this.settings);
			}
			catch(e)
			{
				freeboard.showDialog($("<pre>").text(String(e)), "Error changing settings","OK")
				throw e;
			}
		}

		self._heightUpdate.valueHasMutated();
	};

	this.processDatasourceUpdate = function (datasourceName) {
		var refreshSettingNames = self.datasourceRefreshNotifications[datasourceName];

		if (_.isArray(refreshSettingNames)) {
			_.each(refreshSettingNames, function (settingName) {
				//All those updates are async
				self.processCalculatedSetting(settingName);
			});
		}
	}

	this.callValueFunction = function (theFunction) {
		return theFunction.call(undefined, theFreeboardModel.datasourceData);
	}

	this.processSizeChange = function () {
		if (!_.isUndefined(self.widgetInstance) && _.isFunction(self.widgetInstance.onSizeChanged)) {
			self.widgetInstance.onSizeChanged();
		}
	}

	
	//This function is now a public API function.
	//Will not complete till the effect is resolved, but the function itself is async
	this.processCalculatedSetting = async function (settingName,showError) {
		if (_.isFunction(self.calculatedSettingScripts[settingName])) {
			var returnValue = undefined;

			try {
				returnValue = self.callValueFunction(self.calculatedSettingScripts[settingName]);
			}
			catch (e) {
				var rawValue = self.settings[settingName];

				// If there is a reference error and the value just contains letters and numbers, then
				if (e instanceof ReferenceError && (/^\w+$/).test(rawValue)) {
					returnValue = rawValue;
				}
				if(showError)
				{
					freeboard.showDialog(e, "Error with: "+settingName, "OK")
					freeboard.playSound('error')
				}				
			}

			var f = async function(returnValue)
			{
				if (!_.isUndefined(self.widgetInstance) && _.isFunction(self.widgetInstance.onCalculatedValueChanged) && !_.isUndefined(returnValue)) {
					try {
						//Maybe async, maybe not
						await self.widgetInstance.onCalculatedValueChanged(settingName, returnValue);
					}
					catch (e) {
						console.log(e.toString());
						
					}
				}
			}

	        //We might get a Promise as a return value. If that happens, we need to resolve it.
			var x =await returnValue;
			self.calculatedSettings[settingName]=x;
			await f(x)
		}
	}


	this.updateCalculatedSettings = async function () {
		self.datasourceRefreshNotifications = {};
		self.calculatedSettingScripts = {};

		if (!self.type) {
			return;
		}

		// Check for any calculated settings
		var settingsDefs = widgetPlugins[self.type].settings;
		var datasourceRegex = new RegExp("=\\s*datasources.([\\w_-]+)|datasources\\[['\"]([^'\"]+)", "g");
		var currentSettings = self.settings;

		for(var settingDefIndex in settingsDefs) {
			var settingDef=settingsDefs[settingDefIndex]
			if (settingDef.type == "calculated" || settingDef.type == "target" || settingDef.type == "constructor") {
				var script = currentSettings[settingDef.name];

				if (!_.isUndefined(script)) {
                    var isLiteralText=0
					
					var wasArray =0;

					//For arrays, we have to go down the line, check them, and convert to expressions as needed.
					if(_.isArray(script)) {
						wasArray=1;

						var s =[]
						for(i in script)
						{
							if(i[0]=='=')
							{
								s.push(i.substring(1))
							}
							else if(settingDef.type == "target" || settingDef.type == "constructor")
                            {
                                s.push(i)
                            }
							else
							{
								//String escaping
								s.push(JSON.stringify(i))
							}
						}
						script = "[" + s.join(",") + "]";
					}


					if(!script)
					{
						valueFunction = new Function("datasources", "return undefined;");   
					}
                    else if ((script[0]=='=' || settingDef.type == "target" || settingDef.type == "constructor"   || wasArray)){
                        
                        //We use the spreadsheet convention here. 
                        if (script[0]=='=')
                        {
                            script = script.substring(1)
                        }


						var getter=script;                        
						
						// If there is no return, add one
						//Only th the getter though, not the setter if it's a target.
						//But constructors have the implicit return.
						if(!(settingDef.type == "constructor")){
							if ((script.match(/;/g) || []).length <= 1 && script.indexOf("return") == -1) {
								getter = "return " + script;
							}
						}

                        var valueFunction;
						
						//Turns a constructor into just a regular function returning the thing you want.
						var wrapConstructerFunction = function(f1)
						{
							var f2 = function(datasources){
								return new f1(datasources)
							}
							return f2
						}

                        try {
							var valueFunction = new Function("datasources", getter);

							//If it is a constructor, wrap it so we can return the constructed object.
							if (settingDef.type == "constructor")
							{
								valueFunction = wrapConstructerFunction(valueFunction)
							}
                        }
                        catch (e) {
							if(settingDef.type == "constructor")
							{
								throw e;
							}
                            console.log(" arg "+getter+"\nlooks like a function but won't compile, treating as text")
                            isLiteralText=1
                        }
                    }
                    else
                    {
                        isLiteralText = 1;
                    }
					
					if (isLiteralText)
                    {
                        var literalText = currentSettings[settingDef.name].replace(/"/g, '\\"').replace(/[\r\n]/g, ' \\\n');
						// If the value function cannot be created, then go ahead and treat it as literal text
						valueFunction = new Function("datasources", "return \"" + literalText + "\";");   
                    }

					self.calculatedSettingScripts[settingDef.name] = valueFunction;
                    
                    //The settting is asking the uesr for a data target. So we create a function
                    //to set that value.
                    
                    //The datasource is then expected to handle this with a set function.
                    if (settingDef.type == "target")
                    {
                        try {
                           
                            self.dataTargets[settingDef.name] = targetFunctionFromScript(script);
                        }
                        catch (e) {
							console.log("Bad data target: "+ script)
							console.log(e)
							//The do nothing function
							self.dataTargets[settingDef.name]=function(v){}
                        }
					}
					
					//No error dialog for targets, they are created on-demand
					await self.processCalculatedSetting(settingDef.name,(settingDef.type == "calculated"|| settingDef.type == "constructor"));
					
					//Constructors do not auto-update like everything else.
					if(!(settingDef.type == "constructor")){
						// Are there any datasources we need to be subscribed to?
						var matches;

						while (matches = datasourceRegex.exec(script)) {
							var dsName = (matches[1] || matches[2]);
							var refreshSettingNames = self.datasourceRefreshNotifications[dsName];

							if (_.isUndefined(refreshSettingNames)) {
								refreshSettingNames = [];
								self.datasourceRefreshNotifications[dsName] = refreshSettingNames;
							}

							if(_.indexOf(refreshSettingNames, settingDef.name) == -1) // Only subscribe to this notification once.
							{
								refreshSettingNames.push(settingDef.name);
							}
						}
					}
				}
				else
				{
					//Dummy target setting
					self.dataTargets[settingDef.name]=function(v){};
				}
			}
		};

    };
	

	this._heightUpdate = ko.observable();
	this.height = ko.computed({
		read: function () {
			self._heightUpdate();

			if (!_.isUndefined(self.widgetInstance) && _.isFunction(self.widgetInstance.getHeight)) {
				return self.widgetInstance.getHeight();
			}

			return 1;
		}
	});

	this.shouldRender = ko.observable(false);
	this.render = async function (element) {
		self.shouldRender(false);
		if (!_.isUndefined(self.widgetInstance) && _.isFunction(self.widgetInstance.render)) {
			self.widgetInstance.render(element);
			await self.updateCalculatedSettings();
		}
	}

	this.dispose = function () {

	}

	this.serialize = function () {
		return {
			title: self.title(),
			type: self.type,
			settings: self.settings
		};
	}

	this.deserialize = async function (object) {
		self.title(object.title);
		await self.setSettings(object.settings);
		await self.setType(object.type);
	}
}

// ┌────────────────────────────────────────────────────────────────────┐ \\
// │ F R E E B O A R D                                                  │ \\
// ├────────────────────────────────────────────────────────────────────┤ \\
// │ Copyright © 2013 Jim Heising (https://github.com/jheising)         │ \\
// │ Copyright © 2013 Bug Labs, Inc. (http://buglabs.net)               │ \\
// ├────────────────────────────────────────────────────────────────────┤ \\
// │ Licensed under the MIT license.                                    │ \\
// └────────────────────────────────────────────────────────────────────┘ \\

// Jquery plugin to watch for attribute changes

(function ($) {
	function isDOMAttrModifiedSupported() {
		var p = document.createElement('p');
		var flag = false;

		if (p.addEventListener) {
			p.addEventListener('DOMAttrModified', function () {
				flag = true
			}, false);
		}
		else if (p.attachEvent) {
			p.attachEvent('onDOMAttrModified', function () {
				flag = true
			});
		}
		else {
			return false;
		}

		p.setAttribute('id', 'target');

		return flag;
	}

	function checkAttributes(chkAttr, e) {
		if (chkAttr) {
			var attributes = this.data('attr-old-value');

			if (e.attributeName.indexOf('style') >= 0) {
				if (!attributes['style']) {
					attributes['style'] = {};
				} //initialize
				var keys = e.attributeName.split('.');
				e.attributeName = keys[0];
				e.oldValue = attributes['style'][keys[1]]; //old value
				e.newValue = keys[1] + ':' + this.prop("style")[$.camelCase(keys[1])]; //new value
				attributes['style'][keys[1]] = e.newValue;
			}
			else {
				e.oldValue = attributes[e.attributeName];
				e.newValue = this.attr(e.attributeName);
				attributes[e.attributeName] = e.newValue;
			}

			this.data('attr-old-value', attributes); //update the old value object
		}
	}

	//initialize Mutation Observer
	var MutationObserver = window.MutationObserver || window.WebKitMutationObserver;

	$.fn.attrchange = function (o) {

		var cfg = {
			trackValues: false,
			callback: $.noop
		};

		//for backward compatibility
		if (typeof o === "function") {
			cfg.callback = o;
		}
		else {
			$.extend(cfg, o);
		}

		if (cfg.trackValues) { //get attributes old value
			$(this).each(function (i, el) {
				var attributes = {};
				for (var attr, i = 0, attrs = el.attributes, l = attrs.length; i < l; i++) {
					attr = attrs.item(i);
					attributes[attr.nodeName] = attr.value;
				}

				$(this).data('attr-old-value', attributes);
			});
		}

		if (MutationObserver) { //Modern Browsers supporting MutationObserver
			/*
			 Mutation Observer is still new and not supported by all browsers.
			 http://lists.w3.org/Archives/Public/public-webapps/2011JulSep/1622.html
			 */
			var mOptions = {
				subtree: false,
				attributes: true,
				attributeOldValue: cfg.trackValues
			};

			var observer = new MutationObserver(function (mutations) {
				mutations.forEach(function (e) {
					var _this = e.target;

					//get new value if trackValues is true
					if (cfg.trackValues) {
						/**
						 * @KNOWN_ISSUE: The new value is buggy for STYLE attribute as we don't have
						 * any additional information on which style is getting updated.
						 * */
						e.newValue = $(_this).attr(e.attributeName);
					}

					cfg.callback.call(_this, e);
				});
			});

			return this.each(function () {
				observer.observe(this, mOptions);
			});
		}
		else if (isDOMAttrModifiedSupported()) { //Opera
			//Good old Mutation Events but the performance is no good
			//http://hacks.mozilla.org/2012/05/dom-mutationobserver-reacting-to-dom-changes-without-killing-browser-performance/
			return this.on('DOMAttrModified', function (event) {
				if (event.originalEvent) {
					event = event.originalEvent;
				} //jQuery normalization is not required for us
				event.attributeName = event.attrName; //property names to be consistent with MutationObserver
				event.oldValue = event.prevValue; //property names to be consistent with MutationObserver
				cfg.callback.call(this, event);
			});
		}
		else if ('onpropertychange' in document.body) { //works only in IE
			return this.on('propertychange', function (e) {
				e.attributeName = window.event.propertyName;
				//to set the attr old value
				checkAttributes.call($(this), cfg.trackValues, e);
				cfg.callback.call(this, e);
			});
		}

		return this;
	}
})(jQuery);

(function (jQuery) {

	jQuery.eventEmitter = {
		_JQInit: function () {
			this._JQ = jQuery(this);
		},
		emit: function (evt, data) {
			!this._JQ && this._JQInit();
			this._JQ.trigger(evt, data);
		},
		once: function (evt, handler) {
			!this._JQ && this._JQInit();
			this._JQ.one(evt, handler);
		},
		on: function (evt, handler) {
			!this._JQ && this._JQInit();
			this._JQ.bind(evt, handler);
		},
		off: function (evt, handler) {
			!this._JQ && this._JQInit();
			this._JQ.unbind(evt, handler);
		}
	};

}(jQuery));

var freeboard = (function () {
	var datasourcePlugins = {};
	var widgetPlugins = {};

	var freeboardUI = new FreeboardUI();
	var theFreeboardModel = new FreeboardModel(datasourcePlugins, widgetPlugins, freeboardUI);

	var jsEditor = new JSEditor();
	var valueEditor = new ValueEditor(theFreeboardModel);
	var pluginEditor = new PluginEditor(jsEditor, valueEditor);

	var developerConsole = new DeveloperConsole(theFreeboardModel);

	var currentStyle = {
		values: {
			"font-family": '"HelveticaNeue-UltraLight", "Helvetica Neue Ultra Light", "Helvetica Neue", sans-serif',
			"color": "#d3d4d4",
			"font-weight": 100
		}
	};

	ko.bindingHandlers.pluginEditor = {
		init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
			var options = ko.unwrap(valueAccessor());

			var types = {};
			var settings = undefined;
			var title = "";

			if (options.type == 'datasource') {
				types = datasourcePlugins;
				title = "Datasource";
			}
			else if (options.type == 'widget') {
				types = widgetPlugins;
				title = "Widget";
			}
			else if (options.type == 'pane') {
				title = "Pane";
			}

			$(element).click(function (event) {
				if (options.operation == 'delete') {
					var phraseElement = $('<p>Are you sure you want to delete this ' + title + '?</p>');
					new DialogBox(phraseElement, "Confirm Delete", "Yes", "No", function () {

						if (options.type == 'datasource') {
							theFreeboardModel.deleteDatasource(viewModel);
						}
						else if (options.type == 'widget') {
							theFreeboardModel.deleteWidget(viewModel);
						}
						else if (options.type == 'pane') {
							theFreeboardModel.deletePane(viewModel);
						}

					});
				}
				else {
					var instanceType = undefined;

					if (options.type == 'datasource') {
						if (options.operation == 'add') {
							settings = {};
						}
						else {
							instanceType = viewModel.type;
							settings = viewModel.settings;
							settings.name = viewModel.name();
						}
					}
					else if (options.type == 'widget') {
						if (options.operation == 'add') {
							settings = {};
						}
						else {
							instanceType = viewModel.type;
							settings = viewModel.settings;
						}
					}
					else if (options.type == 'pane') {
						settings = {};

						if (options.operation == 'edit') {
							settings.title = viewModel.title();
							settings.col_width = viewModel.col_width();
						}

						types = {
							settings: {
								settings: [
									{
										name: "title",
										display_name: "Title",
										type: "text"
									},
									{
										name: "col_width",
										display_name: "Columns",
										type: "integer",
										default_value: 1,
										required: true
									}
								]
							}
						}
					}

					pluginEditor.createPluginEditor(title, types, instanceType, settings, async function (newSettings) {
						if (options.operation == 'add') {
							if (options.type == 'datasource') {
								var newViewModel = new DatasourceModel(theFreeboardModel, datasourcePlugins);
								theFreeboardModel.addDatasource(newViewModel);

								newViewModel.name(newSettings.settings.name);
								delete newSettings.settings.name;

								await newViewModel.setSettings(newSettings.settings);
								await newViewModel.setType(newSettings.type);
							}
							else if (options.type == 'widget') {
								var newViewModel = new WidgetModel(theFreeboardModel, widgetPlugins);
								await newViewModel.setSettings(newSettings.settings);
								await newViewModel.setType(newSettings.type);

								viewModel.widgets.push(newViewModel);

								freeboardUI.attachWidgetEditIcons(element);
							}
						}
						else if (options.operation == 'edit') {
							if (options.type == 'pane') {
								viewModel.title(newSettings.settings.title);
								viewModel.col_width(newSettings.settings.col_width);
								freeboardUI.processResize(false);
							}
							else {
								if (options.type == 'datasource') {
									viewModel.name(newSettings.settings.name);
									delete newSettings.settings.name;
								}

								await viewModel.setType(newSettings.type);
								await viewModel.setSettings(newSettings.settings);
							}
						}
					});
				}
			});
		}
	}

	ko.virtualElements.allowedBindings.datasourceTypeSettings = true;
	ko.bindingHandlers.datasourceTypeSettings = {
		update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
			processPluginSettings(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext);
		}
	}

	ko.bindingHandlers.pane = {
		init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
			if (theFreeboardModel.isEditing()) {
				$(element).css({ cursor: "pointer" });
			}

			freeboardUI.addPane(element, viewModel, bindingContext.$root.isEditing());
		},
		update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
			// If pane has been removed
			if (theFreeboardModel.panes.indexOf(viewModel) == -1) {
				//Part of atttempts at a Hack of unknown purpose to make it not do this: https://github.com/ducksboard/gridster.js/issues/271
				if(!_.isUndefined(element)){
				freeboardUI.removePane(element);
				}
			}
			freeboardUI.updatePane(element, viewModel);
		}
	}

	ko.bindingHandlers.widget = {
		init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
			if (theFreeboardModel.isEditing()) {
				freeboardUI.attachWidgetEditIcons($(element).parent());
			}
		},
		update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
			if (viewModel.shouldRender()) {
				$(element).empty();
				viewModel.render(element);
			}
		}
	}

	function getParameterByName(name) {
		name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
		var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"), results = regex.exec(location.search);
		return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
	}

	$(function () { //DOM Ready
		// Show the loading indicator when we first load
		freeboardUI.showLoadingIndicator(true);

		var resizeTimer;

		function resizeEnd() {
			freeboardUI.processResize(true);
		}

		$(window).resize(function () {
			clearTimeout(resizeTimer);
			resizeTimer = setTimeout(resizeEnd, 500);
		});

	});


	function showTemplatesPage() {

		var p = $("<select></select>")
		for (i in freeboard.templates) {
			p.append($("<option>" + i + "</option>"))
		}
		freeboard.showDialog(p, "Load example board(deleting the current board?)", "Load", "Cancel",
			function () {

				freeboard.loadDashboard(freeboard.templates[p.val()])
			}
		)
	}
	// PUBLIC FUNCTIONS
	return {
		model: theFreeboardModel,


		setGlobalSettings = theFreeboardModel.setGlobalSettings,
		globalSettingsHandlers = theFreeboardModel.globalSettingsHandlers,
		globalSettings = theFreeboardModel.globalSettings,
		showTemplatesPage=showTemplatesPage,
		templates=freeboardTemplates,
		ui=freeboardUI,
		defaultSounds={
			'low-click': "sounds/333429__brandondelehoy__ui-series-another-basic-click.opus",
			'scifi-beep': 'sounds/220176__gameaudio__confirm-click-spacey.opus',
			'error': 'sounds/423166__plasterbrain__minimalist-sci-fi-ui-error.opus',
			'soft-chime': 'sounds/419493__plasterbrain__bell-chime-alert.opus',
			'drop': 'sounds/DM-CGS-32.opus',
			'bamboo': 'sounds/DM-CGS-50.opus',
			'snap': 'sounds/333431__brandondelehoy__ui-series-miscellaneous-01.opus',
			'click': 'sounds/333427__brandondelehoy__ui-series-gravel-y-click.opus',
			'typewriter': 'sounds/380137__yottasounds__typewriter-single-key-type-2.opus',
			'scifi-descending': 'sounds/422515__nightflame__menu-fx-03-descending.opus',
			'scifi-ascending': 'sounds/422516__nightflame__menu-fx-03-ascending.opus',
			'scifi-flat': 'sounds/422514__nightflame__menu-fx-03-normal.opus'

		},


		/*Given a handlers object that contains functions like onClick, bind them so they get handled

		*/
		bindHandlers=function (h, element) {
			if (element) {
				if (h.onClick) {
					element.on('click', h.onClick)
				}
			}

			if (h.onSecond) {
				h.onSecond.fb_interval_id = setInterval(h.onSecond, 1000)
			}

			if (h.onTick) {
				h.onSecond.fb_interval_id = setInterval(h.onSecond, 48)
			}

		},

		//Unbind everything that happened in bindHandlers
		unbindHandlers=function (h, element) {
			if (element) {
				if (h.onClick) {
					element.off('click', h.onClick)
				}
			}

			if (h.onSecond) {
				clearInterval(h.onSecond.fb_interval_id)
			}

			if (h.onTick) {
				clearInterval(h.onTick.fb_interval_id)
			}

		},

		getAvailableCSSImageVars=function () {
			var r = {}
			var st = theFreeboardModel.globalSettings

			if (st.imageData) {
				for (var i in st.imageData) {
					r['var(' + i + ')'] = 'Uploaded Image'
				}
			}
			if (st.theme) {
				for (i in st.theme) {
					var x = st.theme[i]

					//Wrap URLs in the URL tag
					if (i.includes('-image')) {
						if (x) {
							r['var(' + i + ')'] = 'Image from settings'

						}

					}
				}
				document.body.style.setProperty(i, x)
			}

			return r

		},
		getAvailableSounds=function () {
			var r = {}
			var st = theFreeboardModel.globalSettings


			for (var i in freeboard.defaultSounds) {
				r[i] = 'Builtin'
			}

			if (st.soundData) {
				for (var i in st.soundData) {
					r[i] = 'Custom'
				}
			}
			return r

		},
		//https://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid
		genUUID: function () {
			return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
				(c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
			)
		},

		playSound: function (s, volume) {
			if (!s) {
				return
			}
			volume = volume || 0.8;

			//Allow sound theming
			var st = theFreeboardModel.globalSettings
			if (st.externalSounds) {
				if (st.externalSounds[s]) {
					s = st.externalSounds[s]
				}
			}

			else if (st.soundData) {
				if (st.soundData[s]) {
					s = st.soundData[s]
				}
			}

			else {
				if (freeboard.defaultSounds[s]) {
					s = freeboard.defaultSounds[s]
				}
			}

			var sound = new Howl({
				src: [s],
				html5: (window.location.protocol == 'file:'),
				volume: volume
			})
			sound.play()

		},

		getDatasourceInstance: function (n) {
			for (var i of freeboard.model.datasources()) {
				if (i.name() == n) {
					return i.datasourceInstance
				}
			}
		},
		eval: function (s) {
			if (typeof (s) == "string" && s[0] == '=') {
				return this.compile("return " + s.substring(1))()
			}
			else {
				return s;
			}
		},

		compile: function (s) {
			var f = new Function('datasources', 'ds', s)

			var f2 = function () {
				return f(theFreeboardModel.datasources, theFreeboardModel.datasources)
			}
			return f2
		},
		initialize: function (allowEdit, finishedCallback) {
			ko.applyBindings(theFreeboardModel);

			// Check to see if we have a query param called load. If so, we should load that dashboard initially
			var freeboardLocation = getParameterByName("load");

			if (freeboardLocation != "") {
				$.ajax({
					url: freeboardLocation,
					success: function (data) {
						theFreeboardModel.loadDashboard(data);

						if (_.isFunction(finishedCallback)) {
							finishedCallback();
						}
					}
				});
			}
			else {
				theFreeboardModel.allow_edit(allowEdit);
				theFreeboardModel.setEditing(allowEdit);

				freeboardUI.showLoadingIndicator(false);
				if (_.isFunction(finishedCallback)) {
					finishedCallback();
				}

				freeboard.emit("initialized");
				freeboardUI.processResize()
			}
		},


		showPageManager: function (p) {

			//Make sure current is in the list
			theFreeboardModel.serializecurrentPage()

			var delf = function (p) {

				return function () {
					if (confirm("Really delete?")) {
						theFreeboardModel.deletePage(p);
						refresh()
					}


				}
			}

			var gtf = function (p) {
				return function () {
					theFreeboardModel.gotoPage(p);
					refresh()
				}
			}

			var outer = $("<div></div>")


			var refresh = function () {
				outer.empty()

				outer.html("Current:")

				var name = $("<input>").val(theFreeboardModel.currentPageName()).appendTo(outer)
				var rename = $("<button></button>").on("click", async function () {
					await theFreeboardModel.renamePage(name.val())
					refresh()
				}).appendTo(outer).html("Rename Current")


				var duplicate = $("<button></button>").on("click", async function () {
					await theFreeboardModel.duplicatePage(prompt("New page name"))
					refresh()
				}).appendTo(outer).html("Duplicate Current")


				var duplicate = $("<button></button>").on("click", async function () {
					await theFreeboardModel.gotoPage(prompt("New page name"))
					refresh()
				}).appendTo(outer).html("New Page")

				var list = $("<ul></ul>").appendTo(outer)

				for (var i in theFreeboardModel.pagesData) {
					var li = $("<li></li>").html(i).appendTo(list)
					var gt = $("<button></button>").on("click", gtf(i)).html(("Goto")).appendTo(li)

					var gt2 = $("<button></button>").on("click", delf(i)).html(("Delete")).appendTo(li)

				}
			}
			refresh()

			freeboard.showDialog(outer, "Multipage Board Manager", "OK")
		},

		gotoPage: function (p) {
			theFreeboardModel.gotoPage(p);
		},
		deletePage: function (p) {
			theFreeboardModel.deletePage(p);
		},
		duplicatePage: function (p) {
			theFreeboardModel.deletePage(p);
		},
		renamePage: function (p) {
			theFreeboardModel.deletePage(p);
		},

		newDashboard: function () {
			theFreeboardModel.loadDashboard({ allow_edit: true });
		},
		loadDashboard: function (configuration, callback) {
			theFreeboardModel.loadDashboard(configuration, callback);
		},
		serialize: function () {
			return theFreeboardModel.serialize();
		},
		setEditing: function (editing, animate) {
			theFreeboardModel.setEditing(editing, animate);
		},
		isEditing: function () {
			return theFreeboardModel.isEditing();
		},
		loadDatasourcePlugin: function (plugin) {
			if (_.isUndefined(plugin.display_name)) {
				plugin.display_name = plugin.type_name;
			}

			// Add a required setting called name to the beginning
			plugin.settings.unshift({
				name: "name",
				display_name: "Name",
				type: "text",
				required: true
			});


			theFreeboardModel.addPluginSource(plugin.source);
			datasourcePlugins[plugin.type_name] = plugin;
			theFreeboardModel._datasourceTypes.valueHasMutated();
		},
		resize: function () {
			freeboardUI.processResize(true);
		},
		loadWidgetPlugin: function (plugin) {
			if (_.isUndefined(plugin.display_name)) {
				plugin.display_name = plugin.type_name;
			}

			theFreeboardModel.addPluginSource(plugin.source);
			widgetPlugins[plugin.type_name] = plugin;
			theFreeboardModel._widgetTypes.valueHasMutated();
		},
		// To be used if freeboard is going to load dynamic assets from a different root URL
		setAssetRoot: function (assetRoot) {
			jsEditor.setAssetRoot(assetRoot);
		},
		addStyle: function (selector, rules) {
			var styleString = selector + "{" + rules + "}";

			var styleElement = $("style#fb-styles");

			if (styleElement.length == 0) {
				styleElement = $('<style id="fb-styles" type="text/css"></style>');
				$("head").append(styleElement);
			}

			if (styleElement[0].styleSheet) {
				styleElement[0].styleSheet.cssText += styleString;
			}
			else {
				styleElement.text(styleElement.text() + styleString);
			}
		},
		showLoadingIndicator: function (show) {
			freeboardUI.showLoadingIndicator(show);
		},
		showDialog: function (contentElement, title, okTitle, cancelTitle, okCallback, cancelCallback) {
			new DialogBox(contentElement, title, okTitle, cancelTitle, okCallback, cancelCallback);
		},
		getDatasourceSettings: function (datasourceName) {
			var datasources = theFreeboardModel.datasources();

			// Find the datasource with the name specified
			var datasource = _.find(datasources, function (datasourceModel) {
				return (datasourceModel.name() === datasourceName);
			});

			if (datasource) {
				return datasource.settings;
			}
			else {
				return null;
			}
		},
		setDatasourceSettings: function (datasourceName, settings) {
			var datasources = theFreeboardModel.datasources();

			// Find the datasource with the name specified
			var datasource = _.find(datasources, function (datasourceModel) {
				return (datasourceModel.name() === datasourceName);
			});

			if (!datasource) {
				console.log("Datasource not found");
				return;
			}

			var combinedSettings = _.defaults(settings, datasource.settings);
			datasource.setSettings(combinedSettings);
		},
		getStyleString: function (name) {
			var returnString = "";

			_.each(currentStyle[name], function (value, name) {
				returnString = returnString + name + ":" + value + ";";
			});

			return returnString;
		},
		getStyleObject: function (name) {
			return currentStyle[name];
		},
		showDeveloperConsole: function () {
			developerConsole.showDeveloperConsole();
		}
	};
}());

$.extend(freeboard, jQuery.eventEmitter);



var fontlist = ['FBSans', 'FBSerif', 'Chalkboard', 'Chancery', 'Pandora', 'RoughScript', 'Handwriting', "B612", "FBMono", "Blackletter", "FBComic", "Pixel", "QTBlackForest", "Pixel", "FBCursive", "DIN", "PenguinAttack", "DSEG7", "DSEG14"]

var freeboardFontsList = fontlist

globalSettingsSchema = {
    type: "object",
    title: "Settings",
    properties: {

        soundData: {
            type: "object",
            title: "Sounds(saved as part of board)",
            additionalProperties: {
                type: "string",
                "media": {
                    "binaryEncoding": "base64",
                },
            },
        },


        imageData: {
            type: "object",
            title: "Images(name must start with --)",
            additionalProperties: {
                type: "string",
                "media": {
                    "binaryEncoding": "base64",
                },
            },
        },



        theme: {
            type: "object",
            title: "Theme",
            properties: {
                "--box-bg-color": {
                    type: "string",
                    format: 'color',
                    'options': {
                        'colorpicker': {
                            'editorFormat': 'rgb',
                            'alpha': true
                        }
                    }
                },
                "--main-bg-color": {
                    type: "string",
                    format: 'color',
                    'options': {
                        'colorpicker': {
                            'editorFormat': 'rgb',
                        }
                    }
                },
                "--main-bg-image": {
                    type: "string",
                    "media": {
                        "binaryEncoding": "base64",
                        "type": "img/png"
                    },
                },
                "--widget-bg-image": {
                    type: "string",
                    "media": {
                        "binaryEncoding": "base64",
                        "type": "img/png"
                    },
                },
                "--box-bg-image": {
                    type: "string",
                    "media": {
                        "binaryEncoding": "base64",
                        "type": "img/png"
                    },
                },
                "--bar-bg-image": {
                    type: "string",
                    "media": {
                        "binaryEncoding": "base64",
                        "type": "img/png"
                    },
                },
                "--logo-image": {
                    type: "string",
                    "media": {
                        "binaryEncoding": "base64",
                        "type": "img/png"
                    },
                },
                "--logo-text": {
                    type: "string",
                },
                "--box-backdrop": {
                    type: "string",
                    enum: ['', 'blur(1px)', 'blur(2px)', 'blur(4px)','blur(8px)','blur(16px)']
                },
                "--main-font": {
                    type: "string",
                    enum: fontlist
                },
                "--header-font": {
                    type: "string",
                    enum: fontlist
                },
                "--widget-font": {
                    type: "string",
                    enum: fontlist
                },
                "--main-font-size": {
                    type: "string",
                    enum: ['small', 'medium', 'large', 'x-large', 'xx-large', '12px', '16px', '24px', '32px', '48px', '64px', '80px']
                },
                "--header-font-size": {
                    type: "string",
                    enum: ['small', 'medium', 'large', 'x-large', 'xx-large', '12px', '16px', '24px', '32px', '48px', '64px', '80px']
                },
                "--widget-font-size": {
                    type: "string",
                    enum: ['small', 'medium', 'large', 'x-large', 'xx-large', '12px', '16px', '24px', '32px', '48px', '64px', '80px']
                },
                "--fg-color":
                {
                    type: "string",
                    format: 'color',
                    'options': {
                        'colorpicker': {
                            'editorFormat': 'rgb'
                        }
                    }
                },
                "--widget-bg-color":
                {
                    type: "string",
                    format: 'color',
                    'options': {
                        'colorpicker': {
                            'editorFormat': 'rgb',
                            'alpha': true
                        }
                    }
                },
                "--widget-fg-color":
                {
                    type: "string",
                    format: 'color',
                    'options': {
                        'colorpicker': {
                            'editorFormat': 'rgb'
                        }
                    }
                },
                "--bar-bg-color":
                {
                    type: "string",
                    format: 'color',
                    'options': {
                        'colorpicker': {
                            'editorFormat': 'rgb',
                            'alpha': true
                        }
                    }
                },
                "--pane-header-bg-color":
                {
                    type: "string",
                    format: 'color',
                    'options': {
                        'colorpicker': {
                            'editorFormat': 'rgb',
                            'alpha': true
                        }
                    }
                },
                "--header-fg-color":
                {
                    type: "string",
                    format: 'color',
                    'options': {
                        'colorpicker': {
                            'editorFormat': 'rgb'
                        }
                    }
                },
                "--label-bg-color":
                {
                    type: "string",
                    format: 'color',
                    'options': {
                        'colorpicker': {
                            'editorFormat': 'rgb',
                            'alpha': true
                        }
                    }
                },
                "--label-fg-color":
                {
                    type: "string",
                    format: 'color',
                    'options': {
                        'colorpicker': {
                            'editorFormat': 'rgb',
                        }
                    }
                },
                "--header-shadow":
                {
                    type: "string",
                    format: 'color',
                    'options': {
                        'colorpicker': {
                            'editorFormat': 'rgb',
                            'alpha': true
                        }
                    }
                },
                "--pane-shadow":
                {
                    type: "string",
                    format: 'color',
                    'options': {
                        'colorpicker': {
                            'editorFormat': 'rgb',
                            'alpha': true
                        }
                    }
                },
                "--widget-shadow":
                {
                    type: "string",
                    format: 'color',
                    'options': {
                        'colorpicker': {
                            'editorFormat': 'rgb',
                            'alpha': true
                        }
                    }
                },

                "--widget-text-shadow":
                {
                    type: "string",
                    format: 'color',
                    'options': {
                        'colorpicker': {
                            'editorFormat': 'rgb',
                            'alpha': true
                        }
                    }
                },

                "--border-color":
                {
                    type: "string",
                    format: 'color',
                    'options': {
                        'colorpicker': {
                            'editorFormat': 'rgb',
                            'alpha': true
                        }
                    }
                },
                "--widget-border-color":
                {
                    type: "string",
                    format: 'color',
                    'options': {
                        'colorpicker': {
                            'editorFormat': 'rgb',
                            'alpha': true
                        }
                    }
                },
                "--modal-tint":
                {
                    type: "string",
                    format: 'color',
                    'options': {
                        'colorpicker': {
                            'editorFormat': 'rgb',
                            'alpha': true
                        }
                    }
                },
                "--border-width":
                {
                    type: "string",
                    enum: ['0px', '1px', '2px', '3px', '4px', '5px']
                },

                "--header-border-radius":
                {
                    type: "string",
                    enum: ['0em', '0.3em', '0.6em', '1em', '2em', '3em', '4em', '5em']
                },
                "--logo-border-radius":
                {
                    type: "string",
                    enum: ['0em', '0.3em', '0.6em', '1em', '2em', '3em', '4em', '5em']
                },
                "--header-line-width":
                {
                    type: "string",
                    enum: ['0px', '1px', '2px', '3px']
                },
                "--pane-padding":
                {
                    type: "string",
                    enum: ['0.1em', '0.2em', ' 0.3em', '0.6em', '1.2em', '2.4em']
                },

                "--pane-border-radius":
                {
                    type: "string",
                    enum: ['0.1em', '0.2em', '0.3em', '0.6em', '1.2em', '2.4em']
                },

                "--widget-border-radius":
                {
                    type: "string",
                    enum: ['0em', '0.15em','0.3em', '0.6em', '1.2em', '2.4em', '4.8em']
                },

                "--main-bg-size":
                {
                    type: "string",
                    enum: ['auto', 'cover', 'contain']
                },


                "--pane-header-line-height":
                {
                    type: "string",
                    enum: ['20px', '40px', '60px', '80px', '100px']
                }


                // "--extra-grid-height":
                // {                  
                //     description: "Give grid panes a extra space in the grid, passt what the box actually takes up", 
                //     type: "string",
                //     enum: ['0px','20px','40px','60px', '80px', '100px']
                // }


            }
        }
    }
}
function generateFreeboardHelp() {


var x = `
<div style="overflow:scroll; height:50em;">

<h2>Data targets</h2>

<p>Input widgets use a data target to do something with the data.
If the target is just the name of a field of a datasource, it will try to write it there.</p>

<p>If the target contains any javascript, like assignments or function calls,
it will be interpreted as a function to call to handle new data.
You can access the value itself simply by using the variable called 'value'.</p>

<p>Nonexistant targets just create that target when the user enters some data, otherwise they have an empty or default value.   This means you don't always need ot worry
about declaring values.</p>

<h2>Calculated values</h2>

<p>These update in real time if the value of the expression changes.
Much like a spreadsheet, they must begin with an equals sign,
or else they get interpreted as just literal data.</p>


<h2> Data Tables </h2>
<p>FreeBoard works with table-like data using the nanoSQl2 library which is always available to the user.   The following 4 special fields are reserved and may be added
    to rows when used with widgets: time, the microseconds modification time of the record, arrival, the microseconds time the record arrived on the local node,
    uuid, a canonical UUID for the record, and name, a nonunique name.<p>


<p>When using the table widget in the raw data mode, all you need to worry about is your application data, the special fields are added automatically by the table widget.</p>

<p>Table widgets have a data target for their selected row.  This row acts just like a the data rows in your input array, however, you can write
the changes back to the original data table by setting the arrival property to anything you want(The actual value will be changed to the current time).</p>

<p>Where there is no selection, the selection is just an empty object, with all of the special underscore keys, and a random UUID.  Setting arrival on this will
create a new entry, as this triggers entering the row into whatever is managing the database.</p>

<p>All database backends should understand this spec, so to make a database form, you use a table to find the record you want, assign the selection
to a scratchpad data source, and use the usual controls to edit that selection.  When you're done, use a button widget to set the arrival property, and everything gets saved.</p>

<p>The tableview widget itself will act as the backend if you use the raw data array mode.</p>


<h2>Using Global Settings</h2>

<p>There are many "hidden" settings. If you click "Object properties", you will see a list of ones to enable.  Most in the theme category are fairly obvious</p>

<p>In addition, the settings panel is used to store images and sounds directly in the board config data.</p>

<h3>Images</h3>
<p>Images are stored as CSS data URLs. to upload one, to the main "properties" and enable imageData.</p>

<p>Each image within the imageData section is it's own "Setting" you can enable, using the "add" toolbar in the propperties</p>

<p>Image names must start with --, as in --my-awesome-background.  Once you have added the image, there will be a prompt to upload a file.</p>

<p>The image will now be available in the Rich Text widget backgrounds list. Other uses coming soon!</p>

<p>Internally, they are made available as global CSS data URIs.</p>

<p>Note that images can also be uploaded directly to the Rich Text Content widget</p>

<h3>Sounds</h3>

<p>Sounds work the same way. Enable the soundData category, add a setting, upload.  The sound will be available in the Button and Switch widgets as a sound effect.</p>

<p>This feature makes it very easy to create a basic "sound board"</p>





<h2>Mustache Templates(Use in the rich text edit component,  3rdparty doc, MIT)</h2>
<pre>
NAME
mustache - Logic-less templates.

SYNOPSIS
A typical Mustache template:

Hello {{name}}
You have just won {{value}} dollars!
{{#in_ca}}
Well, {{taxed_value}} dollars, after taxes.
{{/in_ca}}
Given the following hash:

{
  "name": "Chris",
  "value": 10000,
  "taxed_value": 10000 - (10000 * 0.4),
  "in_ca": true
}
Will produce the following:

Hello Chris
You have just won 10000 dollars!
Well, 6000.0 dollars, after taxes.
DESCRIPTION
Mustache can be used for HTML, config files, source code - anything. It works by expanding tags in a template using values provided in a hash or object.

We call it "logic-less" because there are no if statements, else clauses, or for loops. Instead there are only tags. Some tags are replaced with a value, some nothing, and others a series of values. This document explains the different types of Mustache tags.

TAG TYPES
Tags are indicated by the double mustaches. {{person}} is a tag, as is {{#person}}. In both examples, we'd refer to person as the key or tag key. Let's talk about the different types of tags.

Variables
The most basic tag type is the variable. A {{name}} tag in a basic template will try to find the name key in the current context. If there is no name key, the parent contexts will be checked recursively. If the top context is reached and the name key is still not found, nothing will be rendered.

All variables are HTML escaped by default. If you want to return unescaped HTML, use the triple mustache: {{{name}}}.

You can also use & to unescape a variable: {{& name}}. This may be useful when changing delimiters (see "Set Delimiter" below).

By default a variable "miss" returns an empty string. This can usually be configured in your Mustache library. The Ruby version of Mustache supports raising an exception in this situation, for instance.

Template:

* {{name}}
* {{age}}
* {{company}}
* {{{company}}}
Hash:

{
  "name": "Chris",
  "company": "<b>GitHub</b>"
}
Output:

* Chris
*
* &lt;b&gt;GitHub&lt;/b&gt;
* <b>GitHub</b>
Sections
Sections render blocks of text one or more times, depending on the value of the key in the current context.

A section begins with a pound and ends with a slash. That is, {{#person}} begins a "person" section while {{/person}} ends it.

The behavior of the section is determined by the value of the key.

False Values or Empty Lists

If the person key exists and has a value of false or an empty list, the HTML between the pound and slash will not be displayed.

Template:

Shown.
{{#person}}
  Never shown!
{{/person}}
Hash:

{
  "person": false
}
Output:

Shown.
Non-Empty Lists

If the person key exists and has a non-false value, the HTML between the pound and slash will be rendered and displayed one or more times.

When the value is a non-empty list, the text in the block will be displayed once for each item in the list. The context of the block will be set to the current item for each iteration. In this way we can loop over collections.

Template:

{{#repo}}
  <b>{{name}}</b>
{{/repo}}
Hash:

{
  "repo": [
    { "name": "resque" },
    { "name": "hub" },
    { "name": "rip" }
  ]
}
Output:

<b>resque</b>
<b>hub</b>
<b>rip</b>
Lambdas

When the value is a callable object, such as a function or lambda, the object will be invoked and passed the block of text. The text passed is the literal block, unrendered. {{tags}} will not have been expanded - the lambda should do that on its own. In this way you can implement filters or caching.

Template:

{{#wrapped}}
  {{name}} is awesome.
{{/wrapped}}
Hash:

{
  "name": "Willy",
  "wrapped": function() {
    return function(text, render) {
      return "<b>" + render(text) + "</b>"
    }
  }
}
Output:

<b>Willy is awesome.</b>
Non-False Values

When the value is non-false but not a list, it will be used as the context for a single rendering of the block.

Template:

{{#person?}}
  Hi {{name}}!
{{/person?}}
Hash:

{
  "person?": { "name": "Jon" }
}
Output:

Hi Jon!
Inverted Sections
An inverted section begins with a caret (hat) and ends with a slash. That is {{^person}} begins a "person" inverted section while {{/person}} ends it.

While sections can be used to render text one or more times based on the value of the key, inverted sections may render text once based on the inverse value of the key. That is, they will be rendered if the key doesn't exist, is false, or is an empty list.

Template:

{{#repo}}
  <b>{{name}}</b>
{{/repo}}
{{^repo}}
  No repos :(
{{/repo}}
Hash:

{
  "repo": []
}
Output:

No repos :(
Comments
Comments begin with a bang and are ignored. The following template:

<h1>Today{{! ignore me }}.</h1>
Will render as follows:

<h1>Today.</h1>
Comments may contain newlines.

Partials
Partials begin with a greater than sign, like {{> box}}.

Partials are rendered at runtime (as opposed to compile time), so recursive partials are possible. Just avoid infinite loops.

They also inherit the calling context. Whereas in an [ERB](http://en.wikipedia.org/wiki/ERuby) file you may have this:

<%= partial :next_more, :start => start, :size => size %>
Mustache requires only this:

{{> next_more}}
Why? Because the next_more.mustache file will inherit the size and start methods from the calling context.

In this way you may want to think of partials as includes, imports, template expansion, nested templates, or subtemplates, even though those aren't literally the case here.

For example, this template and partial:

base.mustache:
<h2>Names</h2>
{{#names}}
  {{> user}}
{{/names}}

user.mustache:
<strong>{{name}}</strong>
Can be thought of as a single, expanded template:

<h2>Names</h2>
{{#names}}
  <strong>{{name}}</strong>
{{/names}}
Set Delimiter
Set Delimiter tags start with an equal sign and change the tag delimiters from {{ and }} to custom strings.

Consider the following contrived example:

* {{default_tags}}
{{=<% %>=}}
* <% erb_style_tags %>
<%={{ }}=%>
* {{ default_tags_again }}
Here we have a list with three items. The first item uses the default tag style, the second uses erb style as defined by the Set Delimiter tag, and the third returns to the default style after yet another Set Delimiter declaration.

According to ctemplates, this "is useful for languages like TeX, where double-braces may occur in the text and are awkward to use for markup."

Custom delimiters may not contain whitespace or the equals sign.

COPYRIGHT
Mustache is Copyright (C) 2009 Chris Wanstrath

Original CTemplate by Google

SEE ALSO
mustache(1), http://mustache.github.io/
</pre>

`

return $(x)
}


function generateFreeboardEmojiCheats(){
  var x =`<h2>Smileys</h2>
  <p>😭😄😔☺️👍😁😂😘❤️😍😊💋😒😳😜🙈😉😃😢😝😱😡😏😞😅😚</p>
  <p>🙊😌😀😋👌😐😕😁😔😌😒😞😣😢😂😭😪😥😰😅😓😩😫😨😱😠</p>
  <p>😡😤😖😆😋😷😎😴😵😲😟😦😧😈👿😮😬😐😕😯😶😬😐😕😯😶</p>
  <p>😇😏😑</p>
  <p><br></p>
  <h2>People</h2>
  <p>👲👳👮👷💂👶👦👮👷💂👶👦👧👨👩👴👵👱👼👸</p>
  <h2>Cats</h2>
  <p>😺😸😻😽😼🙀😿😹😾</p>
  <h2>Creatures</h2>
  <p>👹👺🙈🙉🙊💀👽</p>
  <h2>Effects</h2>
  <p>🔥✨🌟💫💥💢💦💧💤💨</p>
  <h2>Body</h2>
  <p>👂👀👃👅👄👍👎👌👊✊✊✌️👋✋👐👆👇👉👈🙌🙏☝️👏💪</p>
  <h2>Figures</h2>
  <p>🚶🏃💃👫👪👬👭💏💑👯</p>
  <p>🙆🙅💁🙋💆💇💅👰🙎🙍🙇</p>
  <h2>Fashion</h2>
  <p>🎩👑👒👟👞👡👢👕👔👚👗🎽👖👘👙💼👜👝👛👓🎀🌂💄</p>
  <h2>Love</h2>
  <p>💛💙💜💚❤️💔💗💓💕💖💞💘💌💋💍💎</p>
  <h2>SocialMedia</h2>
  <p>👤👥💬👣💭</p>
  <h2>Animals</h2>
  <p>🐶🐺🐱🐭🐹🐰🐸🐯🐨🐻🐷🐽🐮🐗🐵🐒🐴🐑🐘🐼🐧🐦🐤🐥🐣🐔🐍🐢🐛🐝🐜🐞🐌🐙🐚🐠🐟🐬🐳🐋🐄🐏🐀🐃🐅🐇🐉🐎🐐🐓🐕🐖🐁🐂🐲🐡🐊🐫🐪🐆🐈🐩🐾
  </p>
  <p>💐🌸🌷🍀🌹🌻🌺🍁🍃🍂🌿🌾🍄🌵🌴🌲🌳🌰🌱🌼</p>
  <h2>Earth and Space</h2>
  <p>🌐🌞🌝🌚🌑🌒🌓🌔🌕🌖🌗🌘🌜🌛🌙🌍🌎🌏🌋🌌🌠⭐️☀️⛅️☁️⚡️☔️❄️⛄️🌁🌀🌈🌊❄️</p>
  <p><br></p>
  <h2>Parties</h2>
  <p>💝🎎🎒🎓🎓🎏🎆🎇🎐🎑🎃👻🎅🎄🎁🎋🎉🎊🎈</p>
  <p><br></p>
  <h2>Items</h2>
  <p>🎌🔮🎥📷💿📀💽💾💻📱☎️📞📟📠📡📺📻🔊🔉🔈🔇🔔🔕📣📢⏳⌛️</p>
  <p>⏰⌚️🔓🔒🔏🔐🔑🔓🔎💡🔦🔆🔅🔌🔋🔍🛀🛁🚿🚽🔧🔩🔨🚪🚬💣🔫</p>
  <p>🔪💊💉💰💴💵💷💶💳💸📲📧📥📤✉️📩📨📯📫📪📬📭📮📦📝📄📃</p>
  <p>📑📊📈📉📜📋📅📆📇📁📂✂️📌📎✒️✏️📏📐📕📗📘📙📓📔📒📚📖</p>
  <p>🔖📛🔬🔭📰</p>
  <p><br></p>
  <h2>Arts</h2>
  <p>🎨🎬🎤🎧🎼🎵🎶🎹🎻🎺🎷🎸</p>
  <p><br></p>
  <h2>Games</h2>
  <p>👾🎮🃏🎴🀄️🎲🎯🏈🏀⚽️⚾️🎾🎱🏉🎳⛳️🚵🚴🏁🏇🏆🎿🏂🏊🏄</p>
  <p><br></p>
  <h2>Food and Drink</h2>
  <p>🎣☕️🍵🍶🍼🍺🍻🍸🍹🍷🍴🍕🍔🍟🍗🍖🍝🍛🍤🍱🍣🍥🍙🍘🍚🍢🍡🍳🍞🍩🍮🍦🍨🍧🎂🍰🍪🍫🍭🍯🍎🍏🍊🍋🍒🍇🍉🍓🍑🍈🍌🍐🍆🍅🌽</p>
  <p>♨️🗿🎪🎭📍🚩🇯🇵🇰🇷🇩🇪🇨🇳🇺🇸🇫🇷🇪🇸🇮🇹🇷🇺🇬🇧</p>
  <p><br></p>
  <h2>Symbols</h2>
  <p>1️⃣2️⃣3️⃣4️⃣5️⃣6️⃣7️⃣8️⃣9️⃣0️⃣🔟🔢#️⃣🔣</p>
  <p>⬆️⬇️⬅️➡️🔠🔡🔤↗️↖️↘️↙️↔️↕️🔄◀️▶️🔼🔽</p>
  <p>↩️↪️ℹ️⤵️⏬⏫⏩⏪⤴️🆗🔀🔁🔂</p>
  <p>🆖🆓🆒🆙🆕📶🎦🈁🈯️🈳🈹🉐🈲🈴</p>
  <p>🈵🈺🈺🈶🈚️🚻🚹🚮🚰🚾🚼🚺🅿️♿️</p>
  <p>🚭🈷🈸🛅🛄🛂Ⓜ️🈂🛃🉑㊙️㊗️🆑📵</p>
  <p>🔞🚫🆔🆘🚯🚱🚳🚷🚸✅❎❇️✳️⛔️</p>
  <p>✴️💟🆚📳📴💠🅾🆎➿♻️</p>
  <p><br></p>
  <h2>Astrology</h2>
  <p>♈️♉️♊️♏️♎️♍️♌️♋️♐️♑️♒️♓️</p>
  <p><br></p>
  <h2>More Symbols</h2>
  <p>💱💲💹🏧🔯©®™❌‼️❔❕❓❗️⁉️⭕️⭕️🔝🔚🔙🔛</p>
  <p><br></p>
  <p>🕐🕧🕛🔃🔜🕜🕑🕝🕒🕞🕕🕠🕔🕟🕓🕖🕗🕘🕙🕚🕥🕤🕣🕢🕡🕦</p>
  <p>✖️➕➖➗💮♦️♣️♥️♠️💯✔️☑️🔘🔗◼️🔱〽️〰➰◻️▪️▫️⚪️⚫️🔳🔲🔺🔴🔵⬛️🔹🔸🔷🔶<br></p>
  
  
<h2>Pictographs</h2>
☀︎ ☼ ☽ ☾ ☁︎ ☂︎ ☔︎ ☃︎ ☇ ☈ ☻ ☹︎ ☺︎ ☕︎ ✌︎ ✍︎ ✎ ✏︎ ✐ ✑ ✒︎ ✁ ✂︎ ✃ ✄ ⚾︎ ✇ ✈︎ ⚓︎ ♨︎<br>
 ♈︎ ♉︎ ♊︎ ♋︎ ♌︎ ♍︎ ♎︎ ♏︎ ♐︎ ♑︎ ♒︎ ♓︎ ☉ ☿ ♀︎ ♁ ♂︎ ♃ ♄ ♅ ⛢ ♆ ♇ ☄︎ ⚲ ⚢ ⚣ ⚤ <br>
 ⚦ ⚧ ⚨ ⚩ ⚬ ⚭ ⚮ ⚯ ⚰︎ ⚱︎ ☊ ☋ ☌ ☍ ✦ ✧ ✙ ✚ ✛ ✜ ✝︎ ✞ ✟ ✠ ☦︎ ☨ ☩ ☥<br>
  ♰ ♱ ☓ ⚜︎ ☤ ⚚ ⚕︎ ⚖︎ ⚗︎ ⚙︎ ⚘ ☘︎ ⚛︎ ☧ ⚒︎ ☭ ☪︎ ☫ ☬ ⚑ ⚐ ☮︎ ☯︎ ☸︎ ⚔︎ ☗ ☖ ■ □ <br>
  ☐ ☑︎ ☒ ▪︎ ▫︎ ◻︎ ◼︎ ◘ ◆ ◇ ❖ ✓ ✔︎ ✕ ✖︎ ✗ ✘ ﹅ ﹆ ❍ ❏ ❐ ❑ ❒ ✰ ❤︎ ❥ ☙ <br>
  ❧ ❦ ❡ 🞡 🞢 🞣 🞤 🞥 🞦 🞧 🞨 🞩 🞪 🞫 🞬 🞭 🞮<br>



<h2>Currency Symbols</h2>
$ € ¥ ¢ £ ₽ ₨ ₩ ฿ ₺ ₮ ₱ ₭ ₴ ₦ ৲ ৳ ૱ ௹ ﷼ ₹ ₲ ₪ ₡ ₫ ៛ ₵ ₢ ₸ ₤ ₳ ₥ ₠ ₣ ₰ ₧ ₯ ₶ ₷


<h2>Stars and Circles</h2>
✢ ✣ ✤ ✥ ✦ ✧ ★ ☆ ✯ ✡︎ ✩ ✪ ✫ ✬ ✭ ✮ ✶ ✷ ✵ ✸ ✹ ✺ ❊ ✻ ✽ ✼<br>
 ❉ ✱ ✲ ✾ ❃ ❋ ✳︎ ✴︎ ❇︎ ❈ ※ ❅ ❆ ❄︎ ⚙︎ ✿ ❀ ❁ ❂ 🟀 🟁 🟂 🟃 🟄 🟅<br>
  🟆 🟇 🟈 🟉 🟊 🟋 🟌 🟍 🟎 🟏 🟐 🟑 🟒 🟓 🟔 ∙ • ・ ◦ ● ○ ◎ ◉ ⦿ ⁌ ⁍<br>

<h2>Nature</h2>
🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐽 🐸 🐵 🙈 🙉 🙊 🐒 🐔 🐧 🐦 🐤 🐣 🐥 🦆<br>
 🦅 🦉 🦇 🐺 🐗 🐴 🦄 🐝 🐛 🦋 🐌 🐞 🐜 🦟 🦗 🕷 🕸 🦂 🐢 🐍 🦎 🦖 🦕 🐙 🦑 🦐 🦞 🦀 <br>
 🐡 🐠 🐟 🐬 🐳 🐋 🦈 🐊 🐅 🐆 🦓 🦍 🦧 🐘 🦛 🦏 🐪 🐫 🦒 🦘 🐃 🐂 🐄 🐎 🐖 🐏 🐑 🦙 <br>
 🐐 🦌 🐕 🐩 🦮 🐕‍🦺 🐈 🐓 🦃 🦚 🦜 🦢 🦩 🕊 🐇 🦝 🦨 🦡 🦦 🦥 🐁 🐀 🐿 🦔 🐾 🐉 🐲<br>
  🌵 🎄 🌲 🌳 🌴 🌱 🌿 ☘️ 🍀 🎍 🎋 🍃 🍂 🍁 🍄 🐚 🌾 💐 🌷 🌹 🥀 🌺 🌸 🌼 🌻 🌞 🌝 🌛<br> 
  🌜 🌚 🌕 🌖 🌗 🌘 🌑 🌒 🌓 🌔 🌙 🌎 🌍 🌏 🪐 💫 ⭐️ 🌟 ✨ ⚡️ ☄️ 💥 🔥 🌪 <br>
  🌈 ☀️ 🌤 ⛅️ 🌥 ☁️ 🌦 🌧 ⛈ 🌩 🌨 ❄️ ☃️ ⛄️ 🌬 💨 💧 💦 ☔️ ☂️ 🌊 🌫<br>

  </pre>


  <h2>Icofont</h2>
  <pre>
  
abacus-alt

abacus

angle-180

angle-45

angle-90

angle

calculator-alt-1

calculator-alt-2

calculator

circle-ruler-alt

circle-ruler

compass-alt-1

compass-alt-2

compass-alt-3

compass-alt-4

golden-ratio

marker-alt-1

marker-alt-2

marker-alt-3

marker

math

mathematical-alt-1

mathematical-alt-2

mathematical

pen-alt-1

pen-alt-2

pen-alt-3

pen-holder-alt-1

pen-holder

pen

pencil-alt-1

pencil-alt-2

pencil-alt-3

pencil-alt-4

pencil

ruler-alt-1

ruler-alt-2

ruler-compass-alt

ruler-compass

ruler-pencil-alt-1

ruler-pencil-alt-2

ruler-pencil

ruler

rulers-alt

rulers

square-root

ui-calculator
Fitness(10 Icons)

cycling-alt

cycling

dumbbell

dumbbells

gym-alt-1

gym-alt-2

gym-alt-3

gym

muscle-weight

muscle
Chart(13 Icons)

chart-arrows-axis

chart-bar-graph

chart-flow-1

chart-flow-2

chart-flow

chart-growth

chart-histogram-alt

chart-histogram

chart-line-alt

chart-line

chart-pie-alt

chart-pie

chart-radar-graph
Search(11 Icons)

search-1

search-2

search-document

search-folder

search-job

search-map

search-property

search-restaurant

search-stock

search-user

search
Travel(14 Icons)

5-star-hotel

air-ticket

beach-bed

beach

camping-vest

direction-sign

hill-side

hill

hotel

island-alt

island

sandals-female

sandals-male

travelling
Kids(19 Icons)

baby-backpack

baby-cloth

baby-milk-bottle

baby-trolley

baby

candy

holding-hands

infant-nipple

kids-scooter

safety-pin

teddy-bear

toy-ball

toy-cat

toy-duck

toy-elephant

toy-hand

toy-horse

toy-lattu

toy-train
Emoticon(20 Icons)

angry

astonished

confounded

confused

crying

dizzy

expressionless

heart-eyes

laughing

nerd-smile

open-mouth

rage

rolling-eyes

sad

simple-smile

slightly-smile

smirk

stuck-out-tongue

wink-smile

worried
Business(23 Icons)

bank-alt

bank

barcode

bill-alt

billboard

briefcase-1

briefcase-2

businessman

businesswoman

chair

coins

company

contact-add

files-stack

handshake-deal

id-card

meeting-add

money-bag

pie-chart

presentation-alt

presentation

stamp

stock-mobile
Multimedia(35 Icons)

cassette-player

cassette

forward

guiter

movie

multimedia

music-alt

music-disk

music-note

music-notes

music

mute-volume

pause

play-alt-1

play-alt-2

play-alt-3

play-pause

play

record

retro-music-disk

rewind

song-notes

sound-wave-alt

sound-wave

stop

video-alt

video-cam

video-clapper

video

volume-bar

volume-down

volume-mute

volume-off

volume-up

youtube-play
Person(38 Icons)

boy

business-man-alt-1

business-man-alt-2

business-man-alt-3

business-man

female

funky-man

girl-alt

girl

group

hotel-boy-alt

hotel-boy

kid

man-in-glasses

people

support

user-alt-1

user-alt-2

user-alt-3

user-alt-4

user-alt-5

user-alt-6

user-alt-7

user-female

user-male

user-suited

user

users-alt-1

users-alt-2

users-alt-3

users-alt-4

users-alt-5

users-alt-6

users-social

users

waiter-alt

waiter

woman-in-glasses
Law(39 Icons)

burglar

cannon-firing

cc-camera

cop-badge

cop

court-hammer

court

finger-print

gavel

handcuff-alt

handcuff

investigation

investigator

jail

judge

law-alt-1

law-alt-2

law-alt-3

law-book

law-document

law-order

law-protect

law-scales

law

lawyer-alt-1

lawyer-alt-2

lawyer

legal

pistol

police-badge

police-cap

police-car-alt-1

police-car-alt-2

police-car

police-hat

police-van

police

thief-alt

thief
Food(98 Icons)

apple

arabian-coffee

artichoke

asparagus

avocado

baby-food

banana

bbq

beans

beer

bell-pepper-capsicum

birthday-cake

bread

broccoli

burger

cabbage

carrot

cauli-flower

cheese

chef

cherry

chicken-fry

chicken

cocktail

coconut-water

coconut

coffee-alt

coffee-cup

coffee-mug

coffee-pot

cola

corn

croissant

crop-plant

cucumber

culinary

cup-cake

dining-table

donut

egg-plant

egg-poached

farmer-alt

farmer

fast-food

food-basket

food-cart

fork-and-knife

french-fries

fruits

grapes

honey

hot-dog

ice-cream-alt

ice-cream

juice

ketchup

kiwi

layered-cake

lemon-alt

lemon

lobster

mango

milk

mushroom

noodles

onion

orange

pear

peas

pepper

pie-alt

pie

pineapple

pizza-slice

pizza

plant

popcorn

potato

pumpkin

raddish

restaurant-menu

restaurant

salt-and-pepper

sandwich

sausage

soft-drinks

soup-bowl

spoon-and-fork

steak

strawberry

sub-sandwich

sushi

taco

tea-pot

tea

tomato

watermelon

wheat
Education(40 Icons)

abc

atom

award

bell-alt

black-board

book-alt

book

brainstorming

certificate-alt-1

certificate-alt-2

certificate

education

electron

fountain-pen

globe-alt

graduate-alt

graduate

group-students

hat-alt

hat

instrument

lamp-light

medal

microscope-alt

microscope

paper

pen-alt-4

pen-nib

pencil-alt-5

quill-pen

read-book-alt

read-book

school-bag

school-bus

student-alt

student

teacher

test-bulb

test-tube-alt

university
Weather(81 Icons)

breakdown

celsius

clouds

cloudy

dust

eclipse

fahrenheit

forest-fire

full-night

full-sunny

hail-night

hail-rainy-night

hail-rainy-sunny

hail-rainy

hail-sunny

hail-thunder-night

hail-thunder-sunny

hail-thunder

hail

hill-night

hill-sunny

hurricane

meteor

night

rainy-night

rainy-sunny

rainy-thunder

rainy

snow-alt

snow-flake

snow-temp

snow

snowy-hail

snowy-night-hail

snowy-night-rainy

snowy-night

snowy-rainy

snowy-sunny-hail

snowy-sunny-rainy

snowy-sunny

snowy-thunder-night

snowy-thunder-sunny

snowy-thunder

snowy-windy-night

snowy-windy-sunny

snowy-windy

snowy

sun-alt

sun-rise

sun-set

sun

sunny-day-temp

sunny

thunder-light

tornado

umbrella-alt

umbrella

volcano

wave

wind-scale-0

wind-scale-1

wind-scale-10

wind-scale-11

wind-scale-12

wind-scale-2

wind-scale-3

wind-scale-4

wind-scale-5

wind-scale-6

wind-scale-7

wind-scale-8

wind-scale-9

wind-waves

wind

windy-hail

windy-night

windy-raining

windy-sunny

windy-thunder-raining

windy-thunder

windy
Sport(82 Icons)

badminton-birdie

baseball

baseballer

basketball-hoop

basketball

billiard-ball

boot-alt-1

boot-alt-2

boot

bowling-alt

bowling

canoe

cheer-leader

climbing

corner

field-alt

field

football-alt

football-american

football

foul

goal-keeper

goal

golf-alt

golf-bag

golf-cart

golf-field

golf

golfer

helmet

hockey-alt

hockey

ice-skate

jersey-alt

jersey

jumping

kick

leg

match-review

medal-sport

offside

olympic-logo

olympic

padding

penalty-card

racer

racing-car

racing-flag-alt

racing-flag

racings-wheel

referee

refree-jersey

result-sport

rugby-ball

rugby-player

rugby

runner-alt-1

runner-alt-2

runner

score-board

skiing-man

skydiving-goggles

snow-mobile

steering

stopwatch

substitute

swimmer

table-tennis

team-alt

team

tennis-player

tennis

tracking

trophy-alt

trophy

volleyball-alt

volleyball-fire

volleyball

water-bottle

whistle-alt

whistle

win-trophy
Mobile Ui(91 Icons)

ui-add

ui-alarm

ui-battery

ui-block

ui-bluetooth

ui-brightness

ui-browser

ui-calendar

ui-call

ui-camera

ui-cart

ui-cell-phone

ui-chat

ui-check

ui-clip-board

ui-clip

ui-clock

ui-close

ui-contact-list

ui-copy

ui-cut

ui-delete

ui-dial-phone

ui-edit

ui-email

ui-file

ui-fire-wall

ui-flash-light

ui-flight

ui-folder

ui-game

ui-handicapped

ui-home

ui-image

ui-laoding

ui-lock

ui-love-add

ui-love-broken

ui-love-remove

ui-love

ui-map

ui-message

ui-messaging

ui-movie

ui-music-player

ui-music

ui-mute

ui-network

ui-next

ui-note

ui-office

ui-password

ui-pause

ui-play-stop

ui-play

ui-pointer

ui-power

ui-press

ui-previous

ui-rate-add

ui-rate-blank

ui-rate-remove

ui-rating

ui-record

ui-remove

ui-reply

ui-rotation

ui-rss

ui-search

ui-settings

ui-social-link

ui-tag

ui-text-chat

ui-text-loading

ui-theme

ui-timer

ui-touch-phone

ui-travel

ui-unlock

ui-user-group

ui-user

ui-v-card

ui-video-chat

ui-video-message

ui-video-play

ui-video

ui-volume

ui-weather

ui-wifi

ui-zoom-in

ui-zoom-out
Animal(109 Icons)

bat

bear-face

bear-tracks

bear

bird-alt

bird-flying

bird

birds

bone

bull

butterfly-alt

butterfly

camel-alt

camel-head

camel

cat-alt-1

cat-alt-2

cat-alt-3

cat-dog

cat-face

cat

cow-head

cow

crab

crocodile

deer-head

dog-alt

dog-barking

dog

dolphin

duck-tracks

eagle-head

eaten-fish

elephant-alt

elephant-head-alt

elephant-head

elephant

elk

fish-1

fish-2

fish-3

fish-4

fish-5

fish

fox-alt

fox

frog-tracks

frog

froggy

giraffe-head-1

giraffe-head-2

giraffe-head

giraffe

goat-head

gorilla

hen-tracks

horse-head-1

horse-head-2

horse-head

horse-tracks

jellyfish

kangaroo

lemur

lion-head-1

lion-head-2

lion-head

lion

monkey-2

monkey-3

monkey-face

monkey

octopus-alt

octopus

owl

panda-face

panda

panther

parrot-lip

parrot

paw

pelican

penguin

pig-face

pig

pigeon-1

pigeon-2

pigeon

rabbit

rat

rhino-head

rhino

rooster

seahorse

seal

shrimp-alt

shrimp

snail-1

snail-2

snail-3

snail

snake

squid

squirrel

tiger-face

tiger

turtle

whale

woodpecker

zebra
Directional(113 Icons)

arrow-down

arrow-left

arrow-right

arrow-up

block-down

block-left

block-right

block-up

bubble-down

bubble-left

bubble-right

bubble-up

caret-down

caret-left

caret-right

caret-up

circled-down

circled-left

circled-right

circled-up

collapse

cursor-drag

curved-double-left

curved-double-right

curved-down

curved-left

curved-right

curved-up

dotted-down

dotted-left

dotted-right

dotted-up

double-left

double-right

expand-alt

hand-down

hand-drag

hand-drag1

hand-drag2

hand-drawn-alt-down

hand-drawn-alt-left

hand-drawn-alt-right

hand-drawn-alt-up

hand-drawn-down

hand-drawn-left

hand-drawn-right

hand-drawn-up

hand-grippers

hand-left

hand-right

hand-up

line-block-down

line-block-left

line-block-right

line-block-up

long-arrow-down

long-arrow-left

long-arrow-right

long-arrow-up

rounded-collapse

rounded-double-left

rounded-double-right

rounded-down

rounded-expand

rounded-left-down

rounded-left-up

rounded-left

rounded-right-down

rounded-right-up

rounded-right

rounded-up

scroll-bubble-down

scroll-bubble-left

scroll-bubble-right

scroll-bubble-up

scroll-double-down

scroll-double-left

scroll-double-right

scroll-double-up

scroll-down

scroll-left

scroll-long-down

scroll-long-left

scroll-long-right

scroll-long-up

scroll-right

scroll-up

simple-down

simple-left-down

simple-left-up

simple-left

simple-right-down

simple-right-up

simple-right

simple-up

square-down

square-left

square-right

square-up

stylish-down

stylish-left

stylish-right

stylish-up

swoosh-down

swoosh-left

swoosh-right

swoosh-up

thin-double-left

thin-double-right

thin-down

thin-left

thin-right

thin-up
Web Application(399 Icons)

addons

address-book

adjust

alarm

anchor

archive

at

attachment

audio

automation

badge

bag-alt

bag

ban

bar-code

bars

basket

battery-empty

battery-full

battery-half

battery-low

beaker

beard

bed

bell

beverage

bill

bin

binary

binoculars

bluetooth

bomb

book-mark

box

briefcase

broken

bucket

bucket1

bucket2

bug

building

bulb-alt

bullet

bullhorn

bullseye

calendar

camera-alt

camera

card

cart-alt

cart

cc

charging

chat

check-alt

check-circled

check

checked

children-care

clip

clock-time

close-circled

close-line-circled

close-line-squared-alt

close-line-squared

close-line

close-squared-alt

close-squared

close

cloud-download

cloud-refresh

cloud-upload

cloud

code-not-allowed

code

comment

compass-alt

compass

computer

connection

console

contacts

contrast

copyright

credit-card

crop

crown

cube

cubes

dashboard-web

dashboard

data

database-add

database-locked

database-remove

database

delete

diamond

dice-multiple

dice

disc

diskette

document-folder

download-alt

download

downloaded

drag

drag1

drag2

drag3

earth

ebook

edit

eject

email

envelope-open

envelope

eraser

error

excavator

exchange

exclamation-circle

exclamation-square

exclamation-tringle

exclamation

exit

expand

external-link

external

eye-alt

eye-blocked

eye-dropper

eye

favourite

fax

file-fill

film

filter

fire-alt

fire-burn

fire

flag-alt-1

flag-alt-2

flag

flame-torch

flash-light

flash

flask

focus

folder-open

folder

foot-print

garbage

gear-alt

gear

gears

gift

glass

globe

graffiti

grocery

hand

hanger

hard-disk

heart-alt

heart

history

home

horn

hour-glass

id

image

inbox

infinite

info-circle

info-square

info

institution

interface

invisible

jacket

jar

jewlery

karate

key-hole

key

label

lamp

layers

layout

leaf

leaflet

learn

lego

lens

letter

letterbox

library

license

life-bouy

life-buoy

life-jacket

life-ring

light-bulb

lighter

lightning-ray

like

line-height

link-alt

link

list

listening

listine-dots

listing-box

listing-number

live-support

location-arrow

location-pin

lock

login

logout

lollipop

long-drive

look

loop

luggage

lunch

lungs

magic-alt

magic

magnet

mail-box

mail

male

map-pins

map

maximize

measure

medicine

mega-phone

megaphone-alt

megaphone

memorial

memory-card

mic-mute

mic

military

mill

minus-circle

minus-square

minus

mobile-phone

molecule

money

moon

mop

muffin

mustache

navigation-menu

navigation

network-tower

network

news

newspaper

no-smoking

not-allowed

notebook

notepad

notification

numbered

opposite

optic

options

package

page

paint

paper-plane

paperclip

papers

pay

penguin-linux

pestle

phone-circle

phone

picture

pine

pixels

plugin

plus-circle

plus-square

plus

polygonal

power

price

print

puzzle

qr-code

queen

question-circle

question-square

question

quote-left

quote-right

random

recycle

refresh

repair

reply-all

reply

resize

responsive

retweet

road

robot

royal

rss-feed

safety

sale-discount

satellite

send-mail

server

settings-alt

settings

share-alt

share-boxed

share

shield

shopping-cart

sign-in

sign-out

signal

site-map

smart-phone

soccer

sort-alt

sort

space

spanner

speech-comments

speed-meter

spinner-alt-1

spinner-alt-2

spinner-alt-3

spinner-alt-4

spinner-alt-5

spinner-alt-6

spinner

spreadsheet

square

ssl-security

star-alt-1

star-alt-2

star

street-view

support-faq

tack-pin

tag

tags

tasks-alt

tasks

telephone

telescope

terminal

thumbs-down

thumbs-up

tick-boxed

tick-mark

ticket

tie

toggle-off

toggle-on

tools-alt-2

tools

touch

traffic-light

transparent

tree

unique-idea

unlock

unlocked

upload-alt

upload

usb-drive

usb

vector-path

verification-check

wall-clock

wall

wallet

warning-alt

warning

water-drop

web

wheelchair

wifi-alt

wifi

world

zigzag

zipped
Abstract(41 Icons)

angry-monster

bathtub

bird-wings

bow

castle

circuit

crown-king

crown-queen

dart

disability-race

diving-goggle

eye-open

flora-flower

flora

gift-box

halloween-pumpkin

hand-power

hand-thunder

king-monster

love

magician-hat

native-american

owl-look

phoenix

robot-face

sand-clock

shield-alt

ship-wheel

skull-danger

skull-face

snowmobile

space-shuttle

star-shape

swirl

tattoo-wing

throne

tree-alt

triangle

unity-hand

weed

woman-bird
Text Editor(45 Icons)

align-center

align-left

align-right

all-caps

bold

brush

clip-board

code-alt

color-bucket

color-picker

copy-invert

copy

cut

delete-alt

edit-alt

eraser-alt

font

heading

indent

italic-alt

italic

justify-all

justify-center

justify-left

justify-right

link-broken

outdent

paper-clip

paragraph

pin

printer

redo

rotation

save

small-cap

strike-through

sub-listing

subscript

superscript

table

text-height

text-width

trash

underline

undo
Device(50 Icons)

android-nexus

android-tablet

apple-watch

drawing-tablet

earphone

flash-drive

game-console

game-controller

game-pad

game

headphone-alt-1

headphone-alt-2

headphone-alt-3

headphone-alt

headphone

htc-one

imac

ipad

iphone

ipod-nano

ipod-touch

keyboard-alt

keyboard-wireless

keyboard

laptop-alt

laptop

macbook

magic-mouse

micro-chip

microphone-alt

microphone

monitor

mouse

mp3-player

nintendo

playstation-alt

psvita

radio-mic

radio

refrigerator

samsung-galaxy

surface-tablet

ui-head-phone

ui-keyboard

washing-machine

wifi-router

wii-u

windows-lumia

wireless-mouse

xbox-360
Transport(53 Icons)

air-balloon

airplane-alt

airplane

articulated-truck

auto-mobile

auto-rickshaw

bicycle-alt-1

bicycle-alt-2

bicycle

bus-alt-1

bus-alt-2

bus-alt-3

bus

cab

cable-car

car-alt-1

car-alt-2

car-alt-3

car-alt-4

car

delivery-time

fast-delivery

fire-truck-alt

fire-truck

free-delivery

helicopter

motor-bike-alt

motor-bike

motor-biker

oil-truck

rickshaw

rocket-alt-1

rocket-alt-2

rocket

sail-boat-alt-1

sail-boat-alt-2

sail-boat

scooter

sea-plane

ship-alt

ship

speed-boat

taxi

tractor

train-line

train-steam

tram

truck-alt

truck-loaded

truck

van-alt

van

yacht
Medical(56 Icons)

aids

ambulance-crescent

ambulance-cross

ambulance

autism

bandage

blind

blood-drop

blood-test

blood

brain-alt

brain

capsule

crutch

disabled

dna-alt-1

dna-alt-2

dna

doctor-alt

doctor

drug-pack

drug

first-aid-alt

first-aid

heart-beat-alt

heart-beat

heartbeat

herbal

hospital

icu

injection-syringe

laboratory

medical-sign-alt

medical-sign

nurse-alt

nurse

nursing-home

operation-theater

paralysis-disability

patient-bed

patient-file

pills

prescription

pulse

stethoscope-alt

stethoscope

stretcher

surgeon-alt

surgeon

tablets

test-bottle

test-tube

thermometer-alt

thermometer

tooth

xray
Construction(64 Icons)

architecture-alt

architecture

barricade

bolt

bricks

building-alt

bull-dozer

calculations

cement-mix

cement-mixer

concrete-mixer

danger-zone

drill

eco-energy

eco-environmen

energy-air

energy-oil

energy-savings

energy-solar

energy-water

engineer

fire-extinguisher-alt

fire-extinguisher

fix-tools

fork-lift

glue-oil

hammer-alt

hammer

help-robot

industries-1

industries-2

industries-3

industries-4

industries-5

industries

labour

mining

paint-brush

pollution

power-zone

radio-active

recycle-alt

recycling-man

safety-hat-light

safety-hat

saw

screw-driver

tools-1

tools-bag

tow-truck

trolley

trowel

under-construction-alt

under-construction

vehicle-cement

vehicle-crane

vehicle-delivery-van

vehicle-dozer

vehicle-excavator

vehicle-trucktor

vehicle-wrecking

worker

workers-group

wrench
  </pre>
  `

  return $(x)
}
// ┌────────────────────────────────────────────────────────────────────┐ \\
// │ freeboard-datagrid-plugin                                            │ \\
// ├────────────────────────────────────────────────────────────────────┤ \\
// │ http://blog.onlinux.fr/                                            │ \\
// ├────────────────────────────────────────────────────────────────────┤ \\
// │ Licensed under the MIT license.                                    │ \\
// ├────────────────────────────────────────────────────────────────────┤ \\
// │ Freeboard widget plugin.                                           │ \\
// └────────────────────────────────────────────────────────────────────┘ \\


var Button = function (config) {
	jsGrid.Field.call(this, config);
};

Button.prototype = new jsGrid.Field({

	align: "center", // redefine general property 'align'

	sorter: function (date1, date2) {
		return 0;
	},

	itemTemplate: function (value, item) {
		return $("<input>").on('click', function () { this.fn(item) }).title(this.title)
	},

	insertTemplate: function (value, item) {
		return ""
	},

	editTemplate: function (value, item) {
		return $("<input>").on('click', function () { this.fn(item) }).title(this.title)
	},

	insertValue: function () {
		return ''
	},

	editValue: function () {
		return ''
	}
});

jsGrid.fields.button = Button;

function uuidv4() {
	return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
		(c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
	);
}

(function () {
	//
	// DECLARATIONS
	//
	var LOADING_INDICATOR_DELAY = 1000;
	var SLIDER_ID = 0;

	freeboard.addStyle('.datagrid', "border: 2px solid #3d3d3d;background-color: #222;margin: 10px;");
	freeboard.addStyle('.datagrid-label', 'margin-left: 10px; margin-top: 10px; text-transform: capitalize;');
	freeboard.addStyle('.myui-datagrid-handle', "width: 1.5em !important; height: 1.5em !important; border-radius: 50%; top: -.4em !important; margin-left:-1.0em !important;");
	freeboard.addStyle('.ui-datagrid-range', 'background: #F90;');

	// ## A Widget Plugin
	//
	// -------------------
	// ### Widget Definition
	//
	// -------------------
	// **freeboard.loadWidgetPlugin(definition)** tells freeboard that we are giving it a widget plugin. It expects an object with the following:
	freeboard.loadWidgetPlugin({
		// Same stuff here as with datasource plugin.
		"type_name": "jsGrid",
		"display_name": "jsGrid Data grid View Plugin",
		"description": "Database grid view. Data is an array of objects.",
		// **external_scripts** : Any external scripts that should be loaded before the plugin instance is created.

		// **fill_size** : If this is set to true, the widget will fill be allowed to fill the entire space given it, otherwise it will contain an automatic padding of around 10 pixels around it.
		"fill_size": true,
		"settings": [
			{
				"name": "title",
				"display_name": "Title",
				"type": "text",
				"default_value": ""
			},


			{
				"name": "backend",
				"display_name": "Data backend. Can be any array, or a freeboard DB controller datasource.",
				"type": "target",
				"default_value": "=[]"
			},

			{
				"name": "selection",
				"display_name": "Selection",
				'description': "Selection gets assigned here. If no selection, empty obj.  Set obj.arrival to save changes back to array(The data doesn't matter, it reads as the time when it was set.)",
				"type": "target",
				"default_value": ""
			},
			{
				name: 'columns',
				type: 'json',
				display_name: "Columns",
				schema: {
					"type": "array",
					"items": {
						"type": "object",
						"additionalProperties": false,
						"properties": {
							"title": {
								"type": "string",
								"required":true,
							},
							"name": {
								"type": "string",
								"title":"Data column",
								"required":true,
							},
							"type":{
									"type": "string",
									"title":"Type",
									"required":true,
									"enum":['control','text','number','checkbox','textarea']
							},
							"width":{
								"type": "number",
								"title":"Width(px)",
								"required":true,
								"default": 40
						}
						}
					}
				},
				default_value:[{type:'text', title:"Name", name:"name",width:50},{type:'control', title:"", name:"",width:40}]

			}

	
		],
		// Same as with datasource plugin, but there is no updateCallback parameter in this case.
		newInstance: function (settings, newInstanceCallback) {
			newInstanceCallback(new datagrid(settings));
		}
	});





	// ### Widget Implementation
	//
	// -------------------
	// Here we implement the actual widget plugin. We pass in the settings;
	var datagrid = function (settings) {

		//jsgrid.sortStrategies.natural = Intl.Collator(undefined, {numeric: true, sensitivity: 'base'}).compare;

		if (settings.backend && settings.data) {
			throw new Error("Cannot use both the backend and the data options at the same time")
		}
		var self = this;



		self.currentSettings = settings;

		self.data = []

		var thisWidgetId = "datagrid-" + SLIDER_ID++;
		var thisWidgetContainer = $('<div class="datagrid-widget datagrid-label" id="__' + thisWidgetId + '"></div>');


		var titleElement = $('<h2 class="section-title datagrid-label"></h2>');

		var gridBox = $('<div>', { id: thisWidgetId }).css('width', '90%').css('height','400px');
		var theGridbox = '#' + thisWidgetId;
		var theValue = '#' + "value-" + thisWidgetId;

		self.backend = 0


		//When operating with direct data, we wrap the row that we give to selection targets so
		//that they can use it to edit stuff, and have the grid auto-update.

		//When we use a backend, it is expected that the backend object will provide the listeners.
		self.makeExternalEditRow = function (d) {
			var m = {
				set: function (o, k, v) {

					//We use time-triggered updates.
					//Saving a record is done by putting a listener on the arrival time.
					//The value we set is irrelevant, it is always set to the current time.
					if (k == 'arrival') {
						o.arrival = Date.now() * 1000
						o.time = Date.now() * 1000
						self.upsert(o)
						$(theGridbox).jsGrid('refresh');
					}
					else {
						//If we make a local change, update the timestamp to tell about it.
						o.time = Date.now() * 1000
						o[k] = v;
					}
				}
			}

			return new Proxy(d, m)
		}

		//Cleans up the data, so it has all the Freeboard DB spec required keys.
		var normalize = function (f) {
			f.id = f.id || uuidv4()
			f.name = f.name || f.id
			f.time = f.time || parseInt(Date.now() * 1000)
			f.arrival = f.arrival || f.time
		}


		self.upsert = function (d) {
			var x = 0
			if (!d) {
				return;
			}

			//Insert and update are always the same for now, on any of our builtin backends.
			if(self.backend)
			{
				return self.backend.insertItem(d)
			}


			if ((self.data == undefined) || (self.data == '')) {
				self.data = []
			}
			normalize(d)

			for (i of self.data) {
				if (i.id == d.id) {
					//No need to do anything, user never actually updated anything.
					if (_.isEqual(i, d)) {
						return;
					}

					//Newer takes precedence
					if(i.time >= d.time)
					{
						return
					}
					Object.assign(i, d);
					self.dataTargets['backend'](self.data)
					return;
				}
			}


		
			self.data.push(d)
			self.dataTargets['backend'](self.data)
		}


		self.arrayController =
		{

			deleteItem: function (d) {
				var x = 0
				if (_.isEqual(i.selection, d)) {
					self.setSelection({})
				}
				for (i of self.data) {
					if (i.id == d.id) {
						self.data = _.without(self.data, i)
					}
				}
				self.dataTargets['backend'](self.data)

			},
			updateItem: self.upsert,
			insertItem: self.upsert,
			loadData: function (filter) {
				var q = nSQL(self.data || []).query('select')
				for (i in filter) {
					if (filter[i] && !(['sortField', 'sortOrder', 'pageIndex', 'pageSize'].indexOf(i) > -1)) {
						q = q.where(['LOWER(' + i + ')', '=', String(filter[i]).toLowerCase()])
					}
				}
				if (filter.sortOrder) {
					q = q.orderBy([filter.sortField + ' ' + filter.sortOrder.toUpperCase()])
				}
				q = q.limit(filter.pageSize).offset((filter.pageIndex - 1) * filter.pageSize)

				var f = async function ex() {
					var d = await q.exec()
					//Someday this should show the right page count after filtering?
					return { data: d, itemsCount: self.data.length }
				}
				return f()
			}

		}

		self.setSelection = function (d) {
			self.dataTargets.selection(self.makeExternalEditRow(d))
		}


		self.acceptData = function (x) {
			if (x == 0) {
				x = self.data
			}

			self.data = x;

			//Normalize by adding the special DB properties.
			for (f in self.data) {
				normalize(f)
			}

		}

		self.refreshGrid = function (x) {
			if (x == 0) {
				x = self.data
			}

			self.data = x;

			//Normalize by adding the special DB properties.
			for (f in self.data) {
				normalize(f)
			}



			$(theGridbox).jsGrid('destroy');

			var writebackData = function () {
				self.dataTargets['backend'](self.data);
			}


			var columns = []
			for (i of self.currentSettings.columns || []) {
				var c = {}
				Object.assign(c, i)

				if (c.type == "SelectButton") {
				}
				columns.push(c)
			}

			var s ={
				width: "95%",
				height: "250px",

				inserting: true,
				editing: true,
				sorting: true,
				paging: true,
				pageLoading: true,
				filtering: true,
				
				rowClick: function (r) {
					self.setSelection(r.item)
				},

				controller: self.backend || self.arrayController,

				fields: columns
			}


			//Real backends do this themaselves.
			if(self.backend==0)
			{
				s.onItemDeleted=writebackData
				s.onItemUpdated=writebackData
				s.onItemInserted=writebackData
			}

			$(theGridbox).jsGrid(s);
			$(theGridbox).jsGrid('loadData');
			try {
				textFit($('.jsgrid-header-cell:not(.jsgrid-control-field)'))
			}
			catch (e) {
				console.log(e)
			}

		}
		$(theGridbox).jsGrid('refresh');



		//console.log( "theGridbox ", theGridbox);

		titleElement.html(self.currentSettings.title);
		self.value = self.currentSettings.value || 0;

		var requestChange = false;
		var target;

		// Here we create an element to hold the text we're going to display. We're going to set the value displayed in it below.

		// **render(containerElement)** (required) : A public function we must implement that will be called when freeboard wants us to render the contents of our widget. The container element is the DIV that will surround the widget.
		self.render = function (containerElement) {
			$(containerElement)
				.append(thisWidgetContainer);
			titleElement.appendTo(thisWidgetContainer);
			gridBox.appendTo(thisWidgetContainer);

			self.refreshGrid(0)



			$(theValue).html(self.value + self.currentSettings.unit);
			$(theGridbox).removeClass("ui-widget-content");
		}

		// **getHeight()** (required) : A public function we must implement that will be called when freeboard wants to know how big we expect to be when we render, and returns a height. This function will be called any time a user updates their settings (including the first time they create the widget).
		//
		// Note here that the height is not in pixels, but in blocks. A block in freeboard is currently defined as a rectangle that is fixed at 300 pixels wide and around 45 pixels multiplied by the value you return here.
		//
		// Blocks of different sizes may be supported in the future.
		self.getHeight = function () {
			return 6;
		}

		// **onSettingsChanged(newSettings)** (required) : A public function we must implement that will be called when a user makes a change to the settings.
		self.onSettingsChanged = function (newSettings) {
			if (newSettings.backend && newSettings.data) {
				throw new Error("Cannot use both the backend and the data options at the same time")
			}

			// Normally we'd update our text element with the value we defined in the user settings above (the_text), but there is a special case for settings that are of type **"calculated"** -- see below.
			self.currentSettings = newSettings;
			titleElement.html((_.isUndefined(newSettings.title) ? "" : newSettings.title));
			self.currentSettings.unit = self.currentSettings.unit || ''
			self.refreshGrid(0)

			self.setSelection({});

		}

		// **onCalculatedValueChanged(settingName, newValue)** (required) : A public function we must implement that will be called when a calculated value changes. Since calculated values can change at any time (like when a datasource is updated) we handle them in a special callback function here.
		self.onCalculatedValueChanged = function (settingName, newValue) {


			if (settingName == 'columns') {
				self.refreshGrid(0)
			}


			if (settingName == 'backend') {
				//Special case handle switching between locally managed data array mode, and backend mode.
				//The way we tell the difference is looking for a loadData function.

				if(typeof(newValue.loadData)=='function')
				{
					if(self.backend)
					{
						self.backend = newValue;
						$(theGridbox).jsGrid('loadData');
					}
					else{
						self.backend = newValue;
						self.refreshGrid(0)
					}
				}
				else{
					if(self.backend)
					{
						self.backend = 0;
						self.acceptData(newValue || []);
						self.refreshGrid(0);
					}
					else{
						self.acceptData(newValue || [])
						$(theGridbox).jsGrid('loadData');
					}
				}
			}

		}


		// **onDispose()** (required) : Same as with datasource plugins.
		self.onDispose = function () {
			$(theGridbox).jsGrid('destroy');
		}
	}
}());


    var htmlWidget = function (settings) {
        var self = this;

        self.id = freeboard.genUUID()
        self.fs=0

        var containerElement = $('<div style="overflow:auto;height:100%;width:auto;padding:0px;display:flex;flex-direction:column;"></div>')
        var toolbarElement = $('<div class="freeboard-hover-unhide" style="border-radius:4px; overflow:hidden;background-color:var(--widget-bg-color);width:100%;padding:3px;margin:0px;position:absolute;user-select: none;opacity:0;"></div>');
        var fsButton = $('<button></button>').on('click', function(){

            if(!self.fs){
                self.fs=1;

                //Backdrop filters break fixed positioning
                self.backup=getComputedStyle(document.body).getPropertyValue("--box-backdrop");

                document.body.style.setProperty("--box-backdrop", 'initial')

                containerElement.css({height:'100vh', width:'100vw', position:'fixed', "z-index":'100',top:'0px','left':'0px','background-color':getComputedStyle(document.body).getPropertyValue("--box-bg-color")})
                containerElement.css({"background-image":currentSettings.background||''})
                containerElement.css({'background-repeat':currentSettings.backgroundRepeat||''})
                containerElement.css({'background-size':currentSettings.backgroundSize||''})
            }
            else{
                self.fs=0;
                document.body.style.setProperty("--box-backdrop", self.backup)

                containerElement.css({height:'100%', width:'100%',position:'static','z-index':'auto','background-color':'transparent'})
                containerElement.css({"background-image":currentSettings.background||''})
                containerElement.css({'background-repeat':currentSettings.backgroundRepeat||''})
                containerElement.css({'background-size':currentSettings.backgroundSize||''})
            }
        })
        var printButton = $('<button></button>').on('click',function(){printJS(self.id, 'html')})


        toolbarElement.append(printButton)
        toolbarElement.append(fsButton)


   
        var htmlElement = $('<div class="html-widget" style="width:100%; height:auto; margin:0px;padding:0px;flex-grow:100;"></div>').attr('id', self.id);
        var currentSettings = settings;

        self.data = {}
        
        this.updateData=function()
        {
            if(self.data && typeof(self.data)=='object')
            {
                htmlElement.html(Mustache.render(currentSettings.html||'', self.data));
            }
            else
            {
                htmlElement.html(currentSettings.html||'');
            }

        }

        this.render = function (element) {
            $(element).append(containerElement);
         
                containerElement.append(toolbarElement);
                toolbarElement.append()

            

            containerElement.append(htmlElement);
             self.updateData()
        }

        this.onSettingsChanged = function (newSettings) {
            currentSettings = newSettings;
            self.updateData()

            if(newSettings.toolbar)
            {
                toolbarElement.css({display:'block'})
            }
            else
            {
                toolbarElement.css({display:'none'})
            }

            containerElement.css({background:newSettings.background||''})
            containerElement.css({'background-repeat':newSettings.backgroundRepeat||''})
            containerElement.css({'background-size':newSettings.backgroundSize||''})
        }

        this.onCalculatedValueChanged = function (settingName, newValue) {
            if (settingName == "html") {
                self.updateData();
            }
            if (settingName == "data") {
                      self.data=newValue
                self.updateData();
            }
        }

        this.onDispose = function () {
        }

        this.getHeight = function () {
            return Number(currentSettings.height);
        }

        this.onSettingsChanged(settings);
    };

    freeboard.loadWidgetPlugin({
        "type_name": "html-template",
        "display_name": "Rich Text Content",
        "fill_size": true,
        "settings": [
            {
                "name": "html",
                "display_name": "HTML",
                "type": "html-wysywig",
                "description": "HTML template.  You can paste images here, they are stored in the freeboard config itself as base64."
            },
            {
                    // **name** (required) : The name of the setting. This value will be used in your code to retrieve the value specified by the user. This should follow naming conventions for javascript variable and function declarations.
                    "name"         : "data",
                    // **display_name** : The pretty name that will be shown to the user when they adjust this setting.
                    "display_name" : "Variables to use",
					// **type** (required) : The type of input expected for this setting. "text" will display a single text box input. Examples of other types will follow in this documentation.
	
					"type"        : "calculated",
                    "default_value" : "={varName: 'value'}",
                    // **description** : Text that will be displayed below the setting to give the user any extra information.
                    "description"  : "Variables to use in Mustache templating, as a JS object.  Access a var with {{varname}} in your document template, it gets replaced with the value.",
            },
            {
                "name": "background",
                "display_name": "Background",
                "type": "text",
                "default_value": 'transparent',
                "description": "CSS Background(try 'blue' or 'url(--my-image) cover')",
                "options": freeboard.getAvailableCSSImageVars
            },
            {
                "name": "backgroundRepeat",
                "display_name": "Background Repeat",
                "type": "option",
                "options": [
                    {
                        "name": "no-repeat",
                        "value": "no-repeat"
                    },
                    {
                        "name": "Tile/Repeat",
                        "value": "repeat"
                    }
                ]
            },
            {
                "name": "backgroundSize",
                "display_name": "Background Image Size",
                "type": "option",
                "options": [
                    {
                        "name": "Cover",
                        "value": "cover"
                    },
                    {
                        "name": "Contain",
                        "value": "contain"
                    },
                    {
                        "name": "auto/actual size",
                        "value": "auto"
                    }
                ]
            },   
            {
                "name": "background",
                "display_name": "Background",
                "type": "text",
                "default_value": 'transparent',
                "description": "CSS Background(try 'blue' or 'url(--my-image) cover')",
                "options": freeboard.getAvailableCSSImageVars
            },
            {
                "name": "height",
                "display_name": "Height Blocks",
                "type": "number",
                "default_value": 4,
                "description": "A height block is around 60 pixels"
            },
            {
                "name": "toolbar",
                "display_name": "Show toolbar",
                "type": "boolean",
                "default_value": false,
                "description": "Fullscreen and print options"
            }
        ],
        newInstance: function (settings, newInstanceCallback) {
            newInstanceCallback(new htmlWidget(settings));
        }
    });


// ┌────────────────────────────────────────────────────────────────────┐ \\
// │ derived from freeboard-button-plugin                                            │ \\
// ├────────────────────────────────────────────────────────────────────┤ \\
// │ http://blog.onlinux.fr/                                            │ \\
// ├────────────────────────────────────────────────────────────────────┤ \\
// │ Licensed under the MIT license.                                    │ \\
// ├────────────────────────────────────────────────────────────────────┤ \\
// │ Freeboard widget plugin.                                           │ \\
// └────────────────────────────────────────────────────────────────────┘ \\
(function () {
	//
	// DECLARATIONS
	//
	var LOADING_INDICATOR_DELAY = 1000;
	var SLIDER_ID = 0;

	freeboard.addStyle('.button', "border: 2px solid #3d3d3d;background-color: #222;margin: 10px;");
	freeboard.addStyle('.button-label', 'margin-left: 10px; margin-top: 10px; text-transform: capitalize;');
	freeboard.addStyle('.myui-button-handle', "width: 1.5em !important; height: 1.5em !important; border-radius: 50%; top: -.4em !important; margin-left:-1.0em !important;");
	freeboard.addStyle('.ui-button-range', 'background: #F90;');

	// ## A Widget Plugin
	//
	// -------------------
	// ### Widget Definition
	//
	// -------------------
	// **freeboard.loadWidgetPlugin(definition)** tells freeboard that we are giving it a widget plugin. It expects an object with the following:
	freeboard.loadWidgetPlugin({
		// Same stuff here as with datasource plugin.
		"type_name": "button_plugin",
		"display_name": "Button",
		"description": "DataTarget compatible button that can run JS code when clicked",
		// **external_scripts** : Any external scripts that should be loaded before the plugin instance is created.

		// **fill_size** : If this is set to true, the widget will fill be allowed to fill the entire space given it, otherwise it will contain an automatic padding of around 10 pixels around it.
		"fill_size": true,
		"settings": [
			{
				"name": "html",
				"display_name": "Button Contents",
				"type": "calculated",
				"default_value": "<i>Button</i>"
			},

			{
				"name": "tooltip",
				"display_name": "Tooltip hint",
				"type": "text",
				"default_value": ""
			},
			{
				name: "value",
				display_name: "Value",
				description: 'This value gets pushed to the target when clicked.  If empty, a simple counter is used.  It recalculated every click.',
				type: "calculated"
			},

			{
				name: "target",
				display_name: "Data target when clicked",
				description: '"value" pushed defaults to a click counter',
				type: "target"
			},
			{
				name: "sound",
				display_name: "Sound(URL or builtin)",
				type: "text",
				default_value: '',
				options: freeboard.getAvailableSounds
			},
			{
				name: "height",
				display_name: "Height(px)",
				type: "number",
				default_value: 30,

			},
			{
				name: "code",
				display_name: "Code",
				description: 'JS Code for custom event handling',//GANDLING
				type: "constructor",
				default_value: "this.onClick = function(){};"
			},
		],
		// Same as with datasource plugin, but there is no updateCallback parameter in this case.
		newInstance: function (settings, newInstanceCallback) {
			newInstanceCallback(new button(settings));
		}
	});


	// ### Widget Implementation
	//
	// -------------------
	// Here we implement the actual widget plugin. We pass in the settings;
	var button = function (settings) {
		var self = this;
		self.currentSettings = settings;

		var thisWidgetId = "button-" + SLIDER_ID++;
		var thisWidgetContainer = $('<div class="button-widget button-label" id="__' + thisWidgetId + '"></div>');


		var inputElement = $('<button/>', { class: 'fullwidth-button', type: 'text', pattern: settings.pattern, id: thisWidgetId }).html(settings.html).css('width', '95%').css('height', self.currentSettings.height + 'px');
		var theButton = '#' + thisWidgetId;

		self.oldUserCode = {}

		//console.log( "theButton ", theButton);


		var requestChange = false;
		var target;

		self.clickCount = 0;
		self.value = ''
		

		// Here we create an element to hold the text we're going to display. We're going to set the value displayed in it below.

		// **render(containerElement)** (required) : A public function we must implement that will be called when freeboard wants us to render the contents of our widget. The container element is the DIV that will surround the widget.
		self.render = function (containerElement) {
			$(containerElement)
				.append(thisWidgetContainer);
			inputElement.appendTo(thisWidgetContainer);

			$(theButton).attr('title', self.currentSettings.tooltip);


			//$(theButton).html(self.currentSettings.html);

			$(theButton).on('click',
				async function (e) {


					var v = self.clickCount;

					//If an async background function is happening here,
					//disable user input until  everything is completed. so you can't
					//queue up a billion events
					$(theButton).attr('disabled', true).html(settings.html + "(waiting)")

					
					//We can refreshed in pull mode here
					await self.processCalculatedSetting('value',true);
					

					if (self.currentSettings.value) {
						v = self.value
					}

					try {
						//We can refreshed in pull mode here
						await self.dataTargets.target(v);
					}
					catch (e) {
						freeboard.showDialog(e, "Error in click handler", "OK")
						freeboard.playSound('error');
					}

					if (!_.isUndefined(self.currentSettings.value)) {
						v = self.value
					}

					self.clickCount += 1;
					$(theButton).attr('disabled', false).html(settings.html);
					freeboard.playSound(self.currentSettings.sound)
					textFit($(theButton), { alignHoriz: true, alignVert: true })

				}

			);



			$(theButton).removeClass("ui-widget-content");
		}

		// **getHeight()** (required) : A public function we must implement that will be called when freeboard wants to know how big we expect to be when we render, and returns a height. This function will be called any time a user updates their settings (including the first time they create the widget).
		//
		// Note here that the height is not in pixels, but in blocks. A block in freeboard is currently defined as a rectangle that is fixed at 300 pixels wide and around 45 pixels multiplied by the value you return here.
		//
		// Blocks of different sizes may be supported in the future.
		self.getHeight = function () {
			//Round Up
			return (parseInt((self.currentSettings.height + 59) / 60))
		}

		// **onSettingsChanged(newSettings)** (required) : A public function we must implement that will be called when a user makes a change to the settings.
		self.onSettingsChanged = function (newSettings) {
			// Normally we'd update our text element with the value we defined in the user settings above (the_text), but there is a special case for settings that are of type **"calculated"** -- see below.
			self.currentSettings = newSettings;
			self.currentSettings.unit = self.currentSettings.unit || ''
			$(theButton).attr('tooltip', newSettings.placeholder);
			$(theButton).css('height', self.currentSettings.height + 'px')
		}



		// **onCalculatedValueChanged(settingName, newValue)** (required) : A public function we must implement that will be called when a calculated value changes. Since calculated values can change at any time (like when a datasource is updated) we handle them in a special callback function here.
		self.onCalculatedValueChanged = function (settingName, newValue) {


			if (settingName == 'html') {
				$(theButton).html(newValue);
				textFit($('.fullwidth-button'), { alignHoriz: true, alignVert: true })
			}
			if (settingName == 'value') {
				self.value = newValue;
				
			}

			if (settingName == 'code') {

				freeboard.unbindHandlers(self.oldUserCode,inputElement)
				freeboard.bindHandlers(newValue,inputElement)
				self.oldUserCode = newValue;
				
			}

		

		}


		// **onDispose()** (required) : Same as with datasource plugins.
		self.onDispose = function () {
			freeboard.unbindHandlers(self.oldUserCode)
		}

	}
}());

// ┌────────────────────────────────────────────────────────────────────┐ \\
// │ freeboard-colorpicker-plugin                                            │ \\
// ├────────────────────────────────────────────────────────────────────┤ \\
// │ http://blog.onlinux.fr/                                            │ \\
// ├────────────────────────────────────────────────────────────────────┤ \\
// │ Licensed under the MIT license.                                    │ \\
// ├────────────────────────────────────────────────────────────────────┤ \\
// │ Freeboard widget plugin.                                           │ \\
// └────────────────────────────────────────────────────────────────────┘ \\
(function () {
    //
    // DECLARATIONS
    //
    var LOADING_INDICATOR_DELAY = 1000;
    var SLIDER_ID = 0;

    freeboard.addStyle('.colorpicker', "border: 2px solid #3d3d3d;background-color: #222;margin: 10px;");
    freeboard.addStyle('.colorpicker-label', 'margin-left: 10px; margin-top: 10px; text-transform: capitalize;');
    freeboard.addStyle('.myui-colorpicker-handle', "width: 1.5em !important; height: 1.5em !important; border-radius: 50%; top: -.4em !important; margin-left:-1.0em !important;");
    freeboard.addStyle('.ui-colorpicker-range', 'background: #F90;');






    var toCSSColor = function (c) {
        if (c._type == 'rgb') {
            c = chroma(c.r, c.g, c.b, c.a || 1).hex()
        }
        if (c._type == 'hsv') {
            c = chroma.hsv(c.h, c.s, c.v, c.a || 1).hex()
        }

        return c
    }
    // ## A Widget Plugin
    //
    // -------------------
    // ### Widget Definition
    //
    // -------------------
    // **freeboard.loadWidgetPlugin(definition)** tells freeboard that we are giving it a widget plugin. It expects an object with the following:
    freeboard.loadWidgetPlugin({
        // Same stuff here as with datasource plugin.
        "type_name": "colorpicker_plugin",
        "display_name": "Color Picker",
        "description": "Interactive colorpicker Plugin with 2-way data binding. ",
        // **external_scripts** : Any external scripts that should be loaded before the plugin instance is created.

        // **fill_size** : If this is set to true, the widget will fill be allowed to fill the entire space given it, otherwise it will contain an automatic padding of around 10 pixels around it.
        "fill_size": true,
        "settings": [
            {
                name: "title",
                display_name: "Title",
                description: '',
                type: "calculated"
            },
            {
                "name": "mode",
                "display_name": "Mode",
                "type": "option",
                "options": [
                    {
                        "name": "Real Time",
                        "value": "input"
                    },
                    {
                        "name": "When you click OK",
                        "value": "change"
                    }
                ]
            },

            {
                "name": "format",
                "display_name": "Format",
                "type": "option",
                "options": [
                    {
                        "name": "Hex String",
                        "value": "hex"
                    },
                    {
                        "name": "RGB Object",
                        "value": "rgb"
                    }
                ]
            },
            {
                name: "target",
                display_name: "Data target when value changes. ",
                description: 'Value pushed will be a value, timestamp pair.',
                type: "target"
            }
        ],
        // Same as with datasource plugin, but there is no updateCallback parameter in this case.
        newInstance: function (settings, newInstanceCallback) {
            newInstanceCallback(new colorpicker(settings));
        }
    });


    // ### Widget Implementation
    //
    // -------------------
    // Here we implement the actual widget plugin. We pass in the settings;
    var colorpicker = function (settings) {
        var self = this;
        self.currentSettings = settings;

        var thisWidgetId = "colorpicker-" + SLIDER_ID++;
        var thisWidgetContainer = $('<div class="colorpicker-widget colorpicker-label" id="__' + thisWidgetId + '"></div>');
        var titleElememt = $('<label></label>', { id: thisWidgetId, name: thisWidgetId }).css({ 'display': 'block' })


        var inputElement = $('<input/>', { id: thisWidgetId, name: thisWidgetId }).css('width', '90%')
        var thecolorpicker = '#' + thisWidgetId;

        //console.log( "thecolorpicker ", thecolorpicker);

        self.value = ''

        var requestChange = false;
        var target;

        // Here we create an element to hold the text we're going to display. We're going to set the value displayed in it below.

        // **render(containerElement)** (required) : A public function we must implement that will be called when freeboard wants us to render the contents of our widget. The container element is the DIV that will surround the widget.
        self.render = function (containerElement) {
            $(containerElement)
                .append(thisWidgetContainer);
            titleElememt.appendTo(thisWidgetContainer);
            inputElement.appendTo(thisWidgetContainer);



            inputElement.spectrum({
                type: "component",
                showInitial: "true"
            });


            var handle = function (e) {

                var m = [e.r, e.g, e.b, e.a]

                if (_.isEqual(self.value, m)) {
                    return;
                }
                self.value = m

                var c = chroma(e.r, e.g, e.b).alpha(e.a)
                //Avoid loops, only real user input triggers this
                if (true) {
                    if (settings.format == 'hex') {
                        self.dataTargets.target(c.hex())
                    }
                    if (settings.format == 'rgb') {
                        c = c.rgba()

                        //Add to existing, don't erase, because this might actually be a fade command with other stuff
                        var d = {
                            '_type':'rgb',
                            'r': c[0],
                            g: c[1],
                            b: c[2],
                            a: c[3]
                        }
                        self.lastDataFromTarget.assign(d)
                        self.dataTargets.target(self.lastDataFromTarget);
                    }
                }
            }


           
                inputElement.on('change.spectrum', function (e, c) { if (self.currentSettings.mode == 'change') { handle(c.toRgb()) }})
                inputElement.on('move.spectrum', function (e, c) { if (self.currentSettings.mode == 'input') { handle(c.toRgb()) }})



            $(thecolorpicker).removeClass("ui-widget-content");
        }

        // **getHeight()** (required) : A public function we must implement that will be called when freeboard wants to know how big we expect to be when we render, and returns a height. This function will be called any time a user updates their settings (including the first time they create the widget).
        //
        // Note here that the height is not in pixels, but in blocks. A block in freeboard is currently defined as a rectangle that is fixed at 300 pixels wide and around 45 pixels multiplied by the value you return here.
        //
        // Blocks of different sizes may be supported in the future.
        self.getHeight = function () {
            return 1;
        }

        // **onSettingsChanged(newSettings)** (required) : A public function we must implement that will be called when a user makes a change to the settings.
        self.onSettingsChanged = function (newSettings) {
            // Normally we'd update our text element with the value we defined in the user settings above (the_text), but there is a special case for settings that are of type **"calculated"** -- see below.
            self.currentSettings = newSettings;
            self.currentSettings.unit = self.currentSettings.unit || ''
            $(thecolorpicker).attr('tooltip', newSettings.placeholder);

        }

        // **onCalculatedValueChanged(settingName, newValue)** (required) : A public function we must implement that will be called when a calculated value changes. Since calculated values can change at any time (like when a datasource is updated) we handle them in a special callback function here.
        self.onCalculatedValueChanged = function (settingName, newValue) {

            if (settingName == 'target') {
                var x = toCSSColor(newValue)

                var c= chroma(x)
                var e = c.rgba()


                if (_.isEqual(self.value, e)) {
                    return;
                }
                self.value = e
                self.lastDataFromTarget = {}


                $(inputElement).spectrum('set', (c.css()))
            }

            if (settingName == 'title') {
                $(titleElememt).text(newValue)
            }


        }


        // **onDispose()** (required) : Same as with datasource plugins.
        self.onDispose = function () {
        }
    }
}());

// # Building a Freeboard Plugin
//
// A freeboard plugin is simply a javascript file that is loaded into a web page after the main freeboard.js file is loaded.
//
// Let's get started with an example of a datasource plugin and a widget plugin.
//
// -------------------


//This is a limited, easy-to-use nosql db build on alasql

function uuidv4() {
	return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
		(c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
	);
}

// Best to encapsulate your plugin in a closure, although not required.
(function () {
	// ## A Datasource Plugin
	//
	// -------------------
	// ### Datasource Definition
	//
	// -------------------
	// **freeboard.loadDatasourcePlugin(definition)** tells freeboard that we are giving it a datasource plugin. It expects an object with the following:
	freeboard.loadDatasourcePlugin({
		// **type_name** (required) : A unique name for this plugin. This name should be as unique as possible to avoid collisions with other plugins, and should follow naming conventions for javascript variable and function declarations.
		"type_name": "document_database_plugin",
		// **display_name** : The pretty name that will be used for display purposes for this plugin. If the name is not defined, type_name will be used instead.
		"display_name": "In-browser DrayerDB database",
		// **description** : A description of the plugin. This description will be displayed when the plugin is selected or within search results (in the future). The description may contain HTML if needed.
		"description": "DB for storing JSON records.  The entire datasource may be used as a controller for the table view. Choose permanent or temp when creating. If you choose wrong, you may need to refresh the page to switch.",
		// **external_scripts** : Any external scripts that should be loaded before the plugin instance is created.

		// **settings** : An array of settings that will be displayed for this plugin when the user adds it.
		"settings": [
			{
				// **name** (required) : The name of the setting. This value will be used in your code to retrieve the value specified by the user. This should follow naming conventions for javascript variable and function declarations.
				"name": "dbname",
				// **display_name** : The pretty name that will be shown to the user when they adjust this setting.
				"display_name": "Database Name",
				// **type** (required) : The type of input expected for this setting. "text" will display a single text box input. Examples of other types will follow in this documentation.
				"type": "text",
				// **default_value** : A default value for this setting.
				"default_value": "my_db",

				// **required** : If set to true, the field will be required to be filled in by the user. Defaults to false if not specified.
				"required": true
			},

			{
				// **name** (required) : The name of the setting. This value will be used in your code to retrieve the value specified by the user. This should follow naming conventions for javascript variable and function declarations.
				"name": "perm",
				// **display_name** : The pretty name that will be shown to the user when they adjust this setting.
				"display_name": "Permanant",
				// **type** (required) : The type of input expected for this setting. "text" will display a single text box input. Examples of other types will follow in this documentation.
				"type": "boolean",
				// **default_value** : A default value for this setting.
				"default_value": false,

				"description": "If true, data is saved to the user's browser",

			},




			{
				// **name** (required) : The name of the setting. This value will be used in your code to retrieve the value specified by the user. This should follow naming conventions for javascript variable and function declarations.
				"name": "",
				// **display_name** : The pretty name that will be shown to the user when they adjust this setting.
				"display_name": "",
				'html': "Download All Data",

				// **type** (required) : The type of input expected for this setting. "text" will display a single text box input. Examples of other types will follow in this documentation.
				"type": "button",


				// **description** : Text that will be displayed below the setting to give the user any extra information.
				"description": "",

				'onclick': async function (n, i) {

					"Returns a query object for getting the"
					nSQL().useDatabase(i.settings.dbname);
					var x = nSQL('records').query('select');
					x = x.orderBy(["arrival ASC"])

					var d = await x.exec()

					var d2 = []

					for(var r of d)
					{
						d2.push([r])
					}

					var blob = new Blob([JSON.stringify(d2),''], { type: "text/plain;charset=utf-8" });
					//Should be FileSaver.saveAs but it gets bugggy fun time or something
					window.saveAs(blob, i.settings.dbname + ".drayer.json");
				}
			},

			{
				// **name** (required) : The name of the setting. This value will be used in your code to retrieve the value specified by the user. This should follow naming conventions for javascript variable and function declarations.
				"name": "",
				// **display_name** : The pretty name that will be shown to the user when they adjust this setting.
				"display_name": "",
				'html': "Upload Data(Merges with existing)",

				// **type** (required) : The type of input expected for this setting. "text" will display a single text box input. Examples of other types will follow in this documentation.
				"type": "button",


				// **description** : Text that will be displayed below the setting to give the user any extra information.
				"description": "",

				'onclick': function (n, i) {

					"Returns a query object for getting the"

					var d = $("<div></div>")
					var c = $('<input id="fb-json-upload" type=file   accept=".json" name="files[]" size=30>').appendTo(d)
					var b = $('<button>Upload</button/>').appendTo(d).on('click',
						function () {
							var f = c[0].files[0]
							var reader = new FileReader();
							reader.onload = (function (theFile) {
								return function (e) {
									var x = JSON.parse(e.target.result)
									{
										for (r of x) {
											i.upsert(r[0],true)
										}
									}
									if (x){
										i.getData()
									}


								};
							})(f);
							reader.readAsText(f)

						})


					freeboard.showDialog(d, "Upload Data", "Finish")
				},


			}



		],
		// **newInstance(settings, newInstanceCallback, updateCallback)** (required) : A function that will be called when a new instance of this plugin is requested.
		// * **settings** : A javascript object with the initial settings set by the user. The names of the properties in the object will correspond to the setting names defined above.
		// * **newInstanceCallback** : A callback function that you'll call when the new instance of the plugin is ready. This function expects a single argument, which is the new instance of your plugin object.
		// * **updateCallback** : A callback function that you'll call if and when your datasource has an update for freeboard to recalculate. This function expects a single parameter which is a javascript object with the new, updated data. You should hold on to this reference and call it when needed.
		newInstance: async function (settings, newInstanceCallback, updateCallback) {
			var x = new myDatasourcePlugin(settings, updateCallback)
			// myDatasourcePlugin is defined below.
			await x.makeDB();
			newInstanceCallback(x);
		}
	});


	// ### Datasource Implementation
	//
	// -------------------
	// Here we implement the actual datasource plugin. We pass in the settings and updateCallback.
	var myDatasourcePlugin = function (settings, updateCallback) {
		var self = this;
		self.settings = settings

		var pt = "TEMP"

		if (settings.perm) {
			pt = "PERM"
		}


		self.makeDB = async function () {
			self.db = await nSQL().createDatabase({
				id: self.settings.dbname,
				mode: pt, // pass in "PERM" to switch to persistent storage mode!
				tables: [
					{
						name: "records",
						model:
						{
							"id:uuid": { pk: true },
							"parent:uuid": {},
							"time:int": {},
							"arrival:int": {},
							"type:string": {},
							"name:string": {},
							"title:string": {},
							"body:string": {},
							"description:string": {}
						},
						indexes:
						{
							"arrival:int": {},
							"parent:uuid": {},
							"time:int": {},
							"name:string": { search: true },
							"type:string": {},
							"body:string": { search: true },
							"title:string": { search: true },
						}
					}
				],
				plugins: [
					FuzzySearch()
				]
			})
		}

		// Good idea to create a variable to hold on to our settings, because they might change in the future. See below.
		var currentSettings = settings;

		self.handler = {
			set: function (obj, prop, val) {
				throw new Error("You can't set anything here. Use getMatching({}) to get all matching records, and set() to set a record.");
			}

		}
		self.makeExternalEditRow = function (d) {
			var m = {
				set: function (o, k, v) {

					//We use time-triggered updates.
					//Saving a record is done by putting a listener on the arrival time.
					//The value we set is irrelevant, it is always set to the current time.
					if (k == 'id') {
						if (v != o.id) {
							throw new Error("You cannot change a record's ID")
						}
					}
					if (k == 'arrival') {
						o.arrival = Date.now() * 1000
						self.upsert(o);
						self.data.set(o);
					}
					else {
						//If we make a local change, update the timestamp to tell about it.
						o.time = Date.now() * 1000
						o[k] = v;
					}
				}
			}

			return new Proxy(d, m)
		}

		self.data = {
			loadData: async function (filter) {
				"Returns a query object for getting the"
				nSQL().useDatabase(self.settings.dbname);
				var x = nSQL('records').query('select').where(['type', '!=', '__null__']);

				//Everything in the DB must match
				for (i in filter) {
					if (filter[i]) {
						if (((i != 'sortField') && (i != "sortOrder") && (i != "pageSize") && (i != "pageIndex") && (i != "pageLoading"))) {
							if ((i == 'body') || (i == 'name') || (i == 'title') || (i == 'description')) {
								x = x.where(["SEARCH(" + i.replace("'", '') + ",'" + filter[i].replace("'", '') + "')", "=", 0])
							}
							else {
								x = x.where([i, '=', filter[i]]);
							}
						}
					}
				}


				if (filter.sortOrder) {
					x = x.orderBy([filter.sortField + ' ' + filter.sortOrder.toUpperCase()])
				}

				x = x.limit(filter.pageSize).offset((filter.pageIndex - 1) * filter.pageSize)

				try {

					var d = await x.exec()

					//Someday this should show the right page count after filtering?
					return { data: d, itemsCount: (filter.pageIndex + 1) * filter.pageSize }
				}
				catch (e) {

					console.log(e)
				}

			},

			insertItem: async function (record) {
				record.time = Date.now() * 1000
				self.upsert(record)
			},

			deleteItem: async function (record) {
				if (record.id) {
					nSQL().useDatabase(self.settings.dbname);
					var x = await nSQL('records').query('select').where(['id', '=', record.id]).exec()
					if (x) {
						self.upsert({ type: "__null__", id: record.id })
					}
				}

			}
		}

		self.data.updateItem = self.data.insertItem
		self.proxy = new Proxy(self.data, self.handler)

		self.upsert = async function (record, noRefresh) {
			try {
				var r = {}
				Object.assign(r, record);
				r['time'] = r['time'] || Date.now() * 1000;
				r['arrival'] = r['arrival'] || r['time']
				r['id'] = r['id'] || freeboard.genUUID();
				r['name'] = r['name'] || r['id']

				nSQL().useDatabase(self.settings.dbname);

				//Newer version already exists, discard this one.
				//Note that time, not arrival, determines conflic resolution
				var x = await nSQL('records').query('delete').where(["id", '=', r.id]).where(['time', '>=', r.time]).exec()
				if (x.length) {
					return
				}
				await nSQL('records').query('delete').where(["id", '=', r.id]).exec()

				var x = nSQL('records').query('upsert', [r]).exec()
				await x
				if (!noRefresh) {
					updateCallback(self.proxy);
				}
			}
			catch (e) {
				console.log(e);
				throw e;
			}
		}


		/* This is some function where I'll get my data from somewhere */
		function getData() {
			var newData = self.proxy; // Just putting some sample data in for fun.

			/* Get my data from somewhere and populate newData with it... Probably a JSON API or something. */
			/* ... */
			// I'm calling updateCallback to tell it I've got new data for it to munch on.
			updateCallback(newData);
		}



		// **onSettingsChanged(newSettings)** (required) : A public function we must implement that will be called when a user makes a change to the settings.
		self.onSettingsChanged = function (newSettings) {

			var oldDBName = newSettings.dbname;

			// Here we update our current settings with the variable that is passed in.
			currentSettings = newSettings;
			self.data = freeboard.eval(newSettings['data']);

			updateCallback(self.proxy)
		}

		// **updateNow()** (required) : A public function we must implement that will be called when the user wants to manually refresh the datasource
		self.updateNow = function () {
			// Most likely I'll just call getData() here.
			getData();
		}

		// **onDispose()** (required) : A public function we must implement that will be called when this instance of this plugin is no longer needed. Do anything you need to cleanup after yourself here.
		self.onDispose = function () {

		}

	}

}());

// ┌────────────────────────────────────────────────────────────────────┐ \\
// │ F R E E B O A R D                                                  │ \\
// ├────────────────────────────────────────────────────────────────────┤ \\
// │ Copyright © 2013 Jim Heising (https://github.com/jheising)         │ \\
// │ Copyright © 2013 Bug Labs, Inc. (http://buglabs.net)               │ \\
// ├────────────────────────────────────────────────────────────────────┤ \\
// │ Licensed under the MIT license.                                    │ \\
// └────────────────────────────────────────────────────────────────────┘ \\

(function () {
	var jsonDatasource = function (settings, updateCallback) {
		var self = this;
		var updateTimer = null;
		var currentSettings = settings;
		var errorStage = 0; 	// 0 = try standard request
		// 1 = try JSONP
		// 2 = try thingproxy.freeboard.io
		var lockErrorStage = false;

		function updateRefresh(refreshTime) {
			if (updateTimer) {
				clearInterval(updateTimer);
			}

			updateTimer = setInterval(function () {
				self.updateNow();
			}, refreshTime);
		}

		updateRefresh(currentSettings.refresh * 1000);

		this.updateNow = function () {
			if ((errorStage > 1 && !currentSettings.use_thingproxy) || errorStage > 2) // We've tried everything, let's quit
			{
				return; // TODO: Report an error
			}

			var requestURL = currentSettings.url;

			if (errorStage == 2 && currentSettings.use_thingproxy) {
				requestURL = (location.protocol == "https:" ? "https:" : "http:") + "//thingproxy.freeboard.io/fetch/" + encodeURI(currentSettings.url);
			}

			var body = currentSettings.body;

			// Can the body be converted to JSON?
			if (body) {
				try {
					body = JSON.parse(body);
				}
				catch (e) {
				}
			}

			$.ajax({
				url: requestURL,
				dataType: (errorStage == 1) ? "JSONP" : "JSON",
				type: currentSettings.method || "GET",
				data: body,
				beforeSend: function (xhr) {
					try {
						_.each(currentSettings.headers, function (header) {
							var name = header.name;
							var value = header.value;

							if (!_.isUndefined(name) && !_.isUndefined(value)) {
								xhr.setRequestHeader(name, value);
							}
						});
					}
					catch (e) {
					}
				},
				success: function (data) {
					lockErrorStage = true;
					updateCallback(data);
				},
				error: function (xhr, status, error) {
					if (!lockErrorStage) {
						// TODO: Figure out a way to intercept CORS errors only. The error message for CORS errors seems to be a standard 404.
						errorStage++;
						self.updateNow();
					}
				}
			});
		}

		this.onDispose = function () {
			clearInterval(updateTimer);
			updateTimer = null;
		}

		this.onSettingsChanged = function (newSettings) {
			lockErrorStage = false;
			errorStage = 0;

			currentSettings = newSettings;
			updateRefresh(currentSettings.refresh * 1000);
			self.updateNow();
		}
	};

	freeboard.loadDatasourcePlugin({
		type_name: "JSON",
		settings: [
			{
				name: "url",
				display_name: "URL",
				type: "text"
			},
			{
				name: "use_thingproxy",
				display_name: "Try thingproxy",
				description: 'A direct JSON connection will be tried first, if that fails, a JSONP connection will be tried. If that fails, you can use thingproxy, which can solve many connection problems to APIs. <a href="https://github.com/Freeboard/thingproxy" target="_blank">More information</a>.',
				type: "boolean",
				default_value: true
			},
			{
				name: "refresh",
				display_name: "Refresh Every",
				type: "number",
				suffix: "seconds",
				default_value: 5
			},
			{
				name: "method",
				display_name: "Method",
				type: "option",
				options: [
					{
						name: "GET",
						value: "GET"
					},
					{
						name: "POST",
						value: "POST"
					},
					{
						name: "PUT",
						value: "PUT"
					},
					{
						name: "DELETE",
						value: "DELETE"
					}
				]
			},
			{
				name: "body",
				display_name: "Body",
				type: "text",
				description: "The body of the request. Normally only used if method is POST"
			},
			{
				name: "headers",
				display_name: "Headers",
				type: "array",
				settings: [
					{
						name: "name",
						display_name: "Name",
						type: "text"
					},
					{
						name: "value",
						display_name: "Value",
						type: "text"
					}
				]
			}
		],
		newInstance: function (settings, newInstanceCallback, updateCallback) {
			newInstanceCallback(new jsonDatasource(settings, updateCallback));
		}
	});

	var openWeatherMapDatasource = function (settings, updateCallback) {
		var self = this;
		var updateTimer = null;
		var currentSettings = settings;

		function updateRefresh(refreshTime) {
			if (updateTimer) {
				clearInterval(updateTimer);
			}

			updateTimer = setInterval(function () {
				self.updateNow();
			}, refreshTime);
		}

		function toTitleCase(str) {
			return str.replace(/\w\S*/g, function (txt) {
				return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
			});
		}

		updateRefresh(currentSettings.refresh * 1000);

		this.updateNow = function () {
			$.ajax({
				url: "http://api.openweathermap.org/data/2.5/weather?APPID="+currentSettings.api_key+"&q=" + encodeURIComponent(currentSettings.location) + "&units=" + currentSettings.units,
				dataType: "JSONP",
				success: function (data) {
					// Rejigger our data into something easier to understand
					var newData = {
						place_name: data.name,
						sunrise: (new Date(data.sys.sunrise * 1000)).toLocaleTimeString(),
						sunset: (new Date(data.sys.sunset * 1000)).toLocaleTimeString(),
						conditions: toTitleCase(data.weather[0].description),
						current_temp: data.main.temp,
						high_temp: data.main.temp_max,
						low_temp: data.main.temp_min,
						pressure: data.main.pressure,
						humidity: data.main.humidity,
						wind_speed: data.wind.speed,
						wind_direction: data.wind.deg
					};

					updateCallback(newData);
				},
				error: function (xhr, status, error) {
				}
			});
		}

		this.onDispose = function () {
			clearInterval(updateTimer);
			updateTimer = null;
		}

		this.onSettingsChanged = function (newSettings) {
			currentSettings = newSettings;
			self.updateNow();
			updateRefresh(currentSettings.refresh * 1000);
		}
	};

	freeboard.loadDatasourcePlugin({
		type_name: "openweathermap",
		display_name: "Open Weather Map API",
		settings: [
			{
				name: "api_key",
				display_name: "API Key",
				type: "text",
				description: "Your personal API Key from Open Weather Map"
			},
            {
				name: "location",
				display_name: "Location",
				type: "text",
				description: "Example: London, UK"
			},
			{
				name: "units",
				display_name: "Units",
				type: "option",
				default: "imperial",
				options: [
					{
						name: "Imperial",
						value: "imperial"
					},
					{
						name: "Metric",
						value: "metric"
					}
				]
			},
			{
				name: "refresh",
				display_name: "Refresh Every",
				type: "number",
				suffix: "seconds",
				default_value: 5
			}
		],
		newInstance: function (settings, newInstanceCallback, updateCallback) {
			newInstanceCallback(new openWeatherMapDatasource(settings, updateCallback));
		}
	});

	var dweetioDatasource = function (settings, updateCallback) {
		var self = this;
		var currentSettings = settings;

		function onNewDweet(dweet) {
			updateCallback(dweet);
		}

		this.updateNow = function () {
			dweetio.get_latest_dweet_for(currentSettings.thing_id, function (err, dweet) {
				if (err) {
					//onNewDweet({});
				}
				else {
					onNewDweet(dweet[0].content);
				}
			});
		}

		this.onDispose = function () {

		}

		this.onSettingsChanged = function (newSettings) {
			dweetio.stop_listening_for(currentSettings.thing_id);

			currentSettings = newSettings;

			dweetio.listen_for(currentSettings.thing_id, function (dweet) {
				onNewDweet(dweet.content);
			});
		}

		self.onSettingsChanged(settings);
	};

	freeboard.loadDatasourcePlugin({
		"type_name": "dweet_io",
		"display_name": "Dweet.io",
		"external_scripts": [
			"http://dweet.io/client/dweet.io.min.js"
		],
		"settings": [
			{
				name: "thing_id",
				display_name: "Thing Name",
				"description": "Example: salty-dog-1",
				type: "text"
			}
		],
		newInstance: function (settings, newInstanceCallback, updateCallback) {
			newInstanceCallback(new dweetioDatasource(settings, updateCallback));
		}
	});

	var playbackDatasource = function (settings, updateCallback) {
		var self = this;
		var currentSettings = settings;
		var currentDataset = [];
		var currentIndex = 0;
		var currentTimeout;

		function moveNext() {
			if (currentDataset.length > 0) {
				if (currentIndex < currentDataset.length) {
					updateCallback(currentDataset[currentIndex]);
					currentIndex++;
				}

				if (currentIndex >= currentDataset.length && currentSettings.loop) {
					currentIndex = 0;
				}

				if (currentIndex < currentDataset.length) {
					currentTimeout = setTimeout(moveNext, currentSettings.refresh * 1000);
				}
			}
			else {
				updateCallback({});
			}
		}

		function stopTimeout() {
			currentDataset = [];
			currentIndex = 0;

			if (currentTimeout) {
				clearTimeout(currentTimeout);
				currentTimeout = null;
			}
		}

		this.updateNow = function () {
			stopTimeout();

			$.ajax({
				url: currentSettings.datafile,
				dataType: (currentSettings.is_jsonp) ? "JSONP" : "JSON",
				success: function (data) {
					if (_.isArray(data)) {
						currentDataset = data;
					}
					else {
						currentDataset = [];
					}

					currentIndex = 0;

					moveNext();
				},
				error: function (xhr, status, error) {
				}
			});
		}

		this.onDispose = function () {
			stopTimeout();
		}

		this.onSettingsChanged = function (newSettings) {
			currentSettings = newSettings;
			self.updateNow();
		}
	};

	freeboard.loadDatasourcePlugin({
		"type_name": "playback",
		"display_name": "Playback",
		"settings": [
			{
				"name": "datafile",
				"display_name": "Data File URL",
				"type": "text",
				"description": "A link to a JSON array of data."
			},
			{
				name: "is_jsonp",
				display_name: "Is JSONP",
				type: "boolean"
			},
			{
				"name": "loop",
				"display_name": "Loop",
				"type": "boolean",
				"description": "Rewind and loop when finished"
			},
			{
				"name": "refresh",
				"display_name": "Refresh Every",
				"type": "number",
				"suffix": "seconds",
				"default_value": 5
			}
		],
		newInstance: function (settings, newInstanceCallback, updateCallback) {
			newInstanceCallback(new playbackDatasource(settings, updateCallback));
		}
	});

	var clockDatasource = function (settings, updateCallback) {
		var self = this;
		var currentSettings = settings;
		var timer;

		function stopTimer() {
			if (timer) {
				clearTimeout(timer);
				timer = null;
			}
		}

		function updateTimer() {
			stopTimer();
			timer = setInterval(self.updateNow, currentSettings.refresh * 1000);
		}

		this.updateNow = function () {
			var date = new Date();
            var st = ""
            
            if (currentSettings.strftime)
            {
                st = strftime(currentSettings.strftime, date)
            }
        

			var data = {
				numeric_value: date.getTime(),
                custom_value: st,
				full_string_value: date.toLocaleString(),
				date_string_value: date.toLocaleDateString(),
				time_string_value: date.toLocaleTimeString(),
				date_object: date
			};

			updateCallback(data);
		}

		this.onDispose = function () {
			stopTimer();
		}

		this.onSettingsChanged = function (newSettings) {
			currentSettings = newSettings;
			updateTimer();
		}

		updateTimer();
	};

	freeboard.loadDatasourcePlugin({
		"type_name": "clock",
		"display_name": "Clock",
		"settings": [
			{
				"name": "refresh",
				"display_name": "Refresh Every",
				"type": "number",
				"suffix": "seconds",
				"default_value": 1
			},
            {
				"name": "strftime",
				"display_name": "Strftime String for custom_value",
				"type": "text",
				"suffix": "seconds",
				"default_value": "%I:%M:%S %p %b %d %Y"
			}
		],
		newInstance: function (settings, newInstanceCallback, updateCallback) {
			newInstanceCallback(new clockDatasource(settings, updateCallback));
		}
	});
freeboard.loadDatasourcePlugin({
		// **type_name** (required) : A unique name for this plugin. This name should be as unique as possible to avoid collisions with other plugins, and should follow naming conventions for javascript variable and function declarations.
		"type_name"   : "meshblu",
		// **display_name** : The pretty name that will be used for display purposes for this plugin. If the name is not defined, type_name will be used instead.
		"display_name": "Octoblu",
        // **description** : A description of the plugin. This description will be displayed when the plugin is selected or within search results (in the future). The description may contain HTML if needed.
        "description" : "app.octoblu.com",
		// **external_scripts** : Any external scripts that should be loaded before the plugin instance is created.
		"external_scripts" : [
			"http://meshblu.octoblu.com/js/meshblu.js"
		],
		// **settings** : An array of settings that will be displayed for this plugin when the user adds it.
		"settings"    : [
			{
				// **name** (required) : The name of the setting. This value will be used in your code to retrieve the value specified by the user. This should follow naming conventions for javascript variable and function declarations.
				"name"         : "uuid",
				// **display_name** : The pretty name that will be shown to the user when they adjust this setting.
				"display_name" : "UUID",
				// **type** (required) : The type of input expected for this setting. "text" will display a single text box input. Examples of other types will follow in this documentation.
				"type"         : "text",
				// **default_value** : A default value for this setting.
				"default_value": "device uuid",
				// **description** : Text that will be displayed below the setting to give the user any extra information.
				"description"  : "your device UUID",
                // **required** : Set to true if this setting is required for the datasource to be created.
                "required" : true
			},
			{
				// **name** (required) : The name of the setting. This value will be used in your code to retrieve the value specified by the user. This should follow naming conventions for javascript variable and function declarations.
				"name"         : "token",
				// **display_name** : The pretty name that will be shown to the user when they adjust this setting.
				"display_name" : "Token",
				// **type** (required) : The type of input expected for this setting. "text" will display a single text box input. Examples of other types will follow in this documentation.
				"type"         : "text",
				// **default_value** : A default value for this setting.
				"default_value": "device token",
				// **description** : Text that will be displayed below the setting to give the user any extra information.
				"description"  : "your device TOKEN",
                // **required** : Set to true if this setting is required for the datasource to be created.
                "required" : true
			},
			{
				// **name** (required) : The name of the setting. This value will be used in your code to retrieve the value specified by the user. This should follow naming conventions for javascript variable and function declarations.
				"name"         : "server",
				// **display_name** : The pretty name that will be shown to the user when they adjust this setting.
				"display_name" : "Server",
				// **type** (required) : The type of input expected for this setting. "text" will display a single text box input. Examples of other types will follow in this documentation.
				"type"         : "text",
				// **default_value** : A default value for this setting.
				"default_value": "meshblu.octoblu.com",
				// **description** : Text that will be displayed below the setting to give the user any extra information.
				"description"  : "your server",
                // **required** : Set to true if this setting is required for the datasource to be created.
                "required" : true
			},
			{
				// **name** (required) : The name of the setting. This value will be used in your code to retrieve the value specified by the user. This should follow naming conventions for javascript variable and function declarations.
				"name"         : "port",
				// **display_name** : The pretty name that will be shown to the user when they adjust this setting.
				"display_name" : "Port",
				// **type** (required) : The type of input expected for this setting. "text" will display a single text box input. Examples of other types will follow in this documentation.
				"type"         : "number",
				// **default_value** : A default value for this setting.
				"default_value": 80,
				// **description** : Text that will be displayed below the setting to give the user any extra information.
				"description"  : "server port",
                // **required** : Set to true if this setting is required for the datasource to be created.
                "required" : true
			}
			
		],
		// **newInstance(settings, newInstanceCallback, updateCallback)** (required) : A function that will be called when a new instance of this plugin is requested.
		// * **settings** : A javascript object with the initial settings set by the user. The names of the properties in the object will correspond to the setting names defined above.
		// * **newInstanceCallback** : A callback function that you'll call when the new instance of the plugin is ready. This function expects a single argument, which is the new instance of your plugin object.
		// * **updateCallback** : A callback function that you'll call if and when your datasource has an update for freeboard to recalculate. This function expects a single parameter which is a javascript object with the new, updated data. You should hold on to this reference and call it when needed.
		newInstance   : function(settings, newInstanceCallback, updateCallback)
		{
			// myDatasourcePlugin is defined below.
			newInstanceCallback(new meshbluSource(settings, updateCallback));
		}
	});


	// ### Datasource Implementation
	//
	// -------------------
	// Here we implement the actual datasource plugin. We pass in the settings and updateCallback.
	var meshbluSource = function(settings, updateCallback)
	{
		// Always a good idea...
		var self = this;

		// Good idea to create a variable to hold on to our settings, because they might change in the future. See below.
		var currentSettings = settings;

		

		/* This is some function where I'll get my data from somewhere */

 	
		function getData()
		{


		 var conn = skynet.createConnection({
    		"uuid": currentSettings.uuid,
    		"token": currentSettings.token,
    		"server": currentSettings.server, 
    		"port": currentSettings.port
  				});	
			 
			 conn.on('ready', function(data){	

			 	conn.on('message', function(message){

    				var newData = message;
    				updateCallback(newData);

 						 });

			 });
			}

	

		// **onSettingsChanged(newSettings)** (required) : A public function we must implement that will be called when a user makes a change to the settings.
		self.onSettingsChanged = function(newSettings)
		{
			// Here we update our current settings with the variable that is passed in.
			currentSettings = newSettings;
		}

		// **updateNow()** (required) : A public function we must implement that will be called when the user wants to manually refresh the datasource
		self.updateNow = function()
		{
			// Most likely I'll just call getData() here.
			getData();
		}

		// **onDispose()** (required) : A public function we must implement that will be called when this instance of this plugin is no longer needed. Do anything you need to cleanup after yourself here.
		self.onDispose = function()
		{
		
			//conn.close();
		}

		// Here we call createRefreshTimer with our current settings, to kick things off, initially. Notice how we make use of one of the user defined settings that we setup earlier.
	//	createRefreshTimer(currentSettings.refresh_time);
	}


}());

// ┌────────────────────────────────────────────────────────────────────┐ \\
// │ F R E E B O A R D                                                  │ \\
// ├────────────────────────────────────────────────────────────────────┤ \\
// │ Copyright © 2013 Jim Heising (https://github.com/jheising)         │ \\
// │ Copyright © 2013 Bug Labs, Inc. (http://buglabs.net)               │ \\
// ├────────────────────────────────────────────────────────────────────┤ \\
// │ Licensed under the MIT license.                                    │ \\
// └────────────────────────────────────────────────────────────────────┘ \\

//const { set } = require("grunt");

(function () {
    var SPARKLINE_HISTORY_LENGTH = 100;
    var SPARKLINE_COLORS = ["#FF9900", "#FFFFFF", "#B3B4B4", "#6B6B6B", "#28DE28", "#13F7F9", "#E6EE18", "#C41204", "#CA3CB8", "#0B1CFB"];

    function easeTransitionText(newValue, textElement, duration) {

        var currentValue = $(textElement).text();

        if (currentValue == newValue)
            return;

        if ($.isNumeric(newValue) && $.isNumeric(currentValue)) {
            var numParts = newValue.toString().split('.');
            var endingPrecision = 0;

            if (numParts.length > 1) {
                endingPrecision = numParts[1].length;
            }

            numParts = currentValue.toString().split('.');
            var startingPrecision = 0;

            if (numParts.length > 1) {
                startingPrecision = numParts[1].length;
            }

            jQuery({ transitionValue: Number(currentValue), precisionValue: startingPrecision }).animate({ transitionValue: Number(newValue), precisionValue: endingPrecision }, {
                duration: duration,
                step: function () {
                    $(textElement).text(this.transitionValue.toFixed(this.precisionValue));
                },
                done: function () {
                    $(textElement).text(newValue);
                }
            });
        }
        else {
            $(textElement).text(newValue);
        }
    }

    function addSparklineLegend(element, legend) {
        var legendElt = $("<div class='sparkline-legend'></div>");
        for (var i = 0; i < legend.length; i++) {
            var color = SPARKLINE_COLORS[i % SPARKLINE_COLORS.length];
            var label = legend[i];
            legendElt.append("<div class='sparkline-legend-value'><span style='color:" +
                color + "'>&#9679;</span>" + label + "</div>");
        }
        element.empty().append(legendElt);

        freeboard.addStyle('.sparkline-legend', "margin:5px;");
        freeboard.addStyle('.sparkline-legend-value',
            'color:white; font:10px arial,san serif; float:left; overflow:hidden; width:50%;');
        freeboard.addStyle('.sparkline-legend-value span',
            'font-weight:bold; padding-right:5px;');
    }

    function addValueToSparkline(element, value, legend) {
        var values = $(element).data().values;
        var valueMin = $(element).data().valueMin;
        var valueMax = $(element).data().valueMax;
        if (!values) {
            values = [];
            valueMin = undefined;
            valueMax = undefined;
        }

        var collateValues = function (val, plotIndex) {
            if (!values[plotIndex]) {
                values[plotIndex] = [];
            }
            if (values[plotIndex].length >= SPARKLINE_HISTORY_LENGTH) {
                values[plotIndex].shift();
            }
            values[plotIndex].push(Number(val));

            if (valueMin === undefined || val < valueMin) {
                valueMin = val;
            }
            if (valueMax === undefined || val > valueMax) {
                valueMax = val;
            }
        }

        if (_.isArray(value)) {
            _.each(value, collateValues);
        } else {
            collateValues(value, 0);
        }
        $(element).data().values = values;
        $(element).data().valueMin = valueMin;
        $(element).data().valueMax = valueMax;

        var tooltipHTML = '<span style="color: {{color}}">&#9679;</span> {{y}}';

        var composite = false;
        _.each(values, function (valueArray, valueIndex) {
            $(element).sparkline(valueArray, {
                type: "line",
                composite: composite,
                height: "100%",
                width: "100%",
                fillColor: false,
                lineColor: SPARKLINE_COLORS[valueIndex % SPARKLINE_COLORS.length],
                lineWidth: 2,
                spotRadius: 3,
                spotColor: false,
                minSpotColor: "#78AB49",
                maxSpotColor: "#78AB49",
                highlightSpotColor: "#9D3926",
                highlightLineColor: "#9D3926",
                chartRangeMin: valueMin,
                chartRangeMax: valueMax,
                tooltipFormat: (legend && legend[valueIndex]) ? tooltipHTML + ' (' + legend[valueIndex] + ')' : tooltipHTML
            });
            composite = true;
        });
    }

    var valueStyle = freeboard.getStyleString("values");

    freeboard.addStyle('.widget-big-text', valueStyle + "font-size:75px;");

    freeboard.addStyle('.tw-display', 'width: 100%; height:100%; display:table; table-layout:fixed;');

    freeboard.addStyle('.tw-tr',
        'display:table-row;');

    freeboard.addStyle('.tw-tg',
        'display:table-row-group;');

    freeboard.addStyle('.tw-tc',
        'display:table-caption;');

    freeboard.addStyle('.tw-td',
        'display:table-cell;');

    freeboard.addStyle('.tw-value',
        valueStyle +
        'overflow: hidden;' +
        'display: inline-block;' +
        'text-overflow: ellipsis;');

    freeboard.addStyle('.tw-unit',
        'display: inline-block;' +
        'padding-left: 10px;' +
        'padding-bottom: 1.1em;' +
        'vertical-align: bottom;');

    freeboard.addStyle('.tw-value-wrapper',
        'position: relative;' +
        'vertical-align: middle;' +
        'height:100%;');

    freeboard.addStyle('.tw-sparkline',
        'height:20px;');

    var textWidget = function (settings) {

        var self = this;

        var currentSettings = settings;
        var displayElement = $('<div class="tw-display"></div>');
        var titleElement = $('<h2 class="section-title tw-title tw-td"></h2>');
        var valueElement = $('<div class="tw-value"></div>');
        var unitsElement = $('<div class="tw-unit"></div>');
        var sparklineElement = $('<div class="tw-sparkline tw-td"></div>');

        function updateValueSizing() {
            if (!_.isUndefined(currentSettings.units) && currentSettings.units != "") // If we're displaying our units
            {
                valueElement.css("max-width", (displayElement.innerWidth() - unitsElement.outerWidth(true)) + "px");
            }
            else {
                valueElement.css("max-width", "100%");
            }
        }

        this.render = function (element) {
            $(element).empty();

            $(displayElement)
                .append($('<div class="tw-tr"></div>').append(titleElement))
                .append($('<div class="tw-tr"></div>').append($('<div class="tw-value-wrapper tw-td"></div>').append(valueElement).append(unitsElement)))
                .append($('<div class="tw-tr"></div>').append(sparklineElement));

            $(element).append(displayElement);

            updateValueSizing();
        }

        this.onSettingsChanged = function (newSettings) {
            currentSettings = newSettings;

            var shouldDisplayTitle = (!_.isUndefined(newSettings.title) && newSettings.title != "");
            var shouldDisplayUnits = (!_.isUndefined(newSettings.units) && newSettings.units != "");

            if (newSettings.sparkline) {
                sparklineElement.attr("style", null);
            }
            else {
                delete sparklineElement.data().values;
                sparklineElement.empty();
                sparklineElement.hide();
            }

            if (shouldDisplayTitle) {
                titleElement.html((_.isUndefined(newSettings.title) ? "" : newSettings.title));
                titleElement.attr("style", null);
            }
            else {
                titleElement.empty();
                titleElement.hide();
            }

            if (shouldDisplayUnits) {
                unitsElement.html((_.isUndefined(newSettings.units) ? "" : newSettings.units));
                unitsElement.attr("style", null);
            }
            else {
                unitsElement.empty();
                unitsElement.hide();
            }


            if (newSettings.size == "big") {
                valueFontSize = '60px';
            }
            else if (newSettings.size == "regular") {
                valueFontSize = '30px';
            }
            else {
                valueFontSize = newSettings.size;
            }


            valueElement.css({ "font-size": valueFontSize });

            updateValueSizing();
        }

        this.onSizeChanged = function () {
            updateValueSizing();
        }

        this.onCalculatedValueChanged = function (settingName, newValue) {
            if (settingName == "value") {

                if (currentSettings.animate) {
                    easeTransitionText(newValue, valueElement, 500);
                }
                else {
                    valueElement.text(newValue);
                }

                if (currentSettings.sparkline) {
                    addValueToSparkline(sparklineElement, newValue);
                }
            }
        }

        this.onDispose = function () {

        }

        this.getHeight = function () {
            if (currentSettings.size == "big" || currentSettings.sparkline) {
                return 2;
            }
            else {
                return 1;
            }
        }

        this.onSettingsChanged(settings);
    };

    freeboard.loadWidgetPlugin({
        type_name: "text_widget",
        display_name: "Text",
        settings: [
            {
                name: "title",
                display_name: "Title",
                type: "text"
            },
            {
                name: "size",
                display_name: "Size",
                type: "option",
                options: [
                    {
                        name: "Regular",
                        value: "regular"
                    },
                    {
                        name: "Big",
                        value: "big"
                    },
                    {
                        name: "Small",
                        value: "small"
                    },
                    {
                        name: "Medium",
                        value: "Medium"
                    },
                    {
                        name: "Large",
                        value: "large"
                    },
                    {
                        name: "Extra Large",
                        value: "x-large"
                    },
                    {
                        name: "32px",
                        value: "32px"
                    },
                    {
                        name: "48px",
                        value: "48px"
                    },
                    {
                        name: "64px",
                        value: "64px"
                    }
                ]
            },
            {
                name: "value",
                display_name: "Value",
                type: "calculated"
            },
            {
                name: "sparkline",
                display_name: "Include Sparkline",
                type: "boolean"
            },
            {
                name: "animate",
                display_name: "Animate Value Changes",
                type: "boolean",
                default_value: true
            },
            {
                name: "units",
                display_name: "Units",
                type: "text",
                options: function () {
                    return {
                        'lbs': '',
                        'kgs': '',
                        'psi': '',
                        'meters': '',
                        'feet': '',
                        'mm': '',
                        'degC': '',
                        'degF': '',
                    }
                }
            },

            {
                name: "font",
                display_name: "Font",
                type: "text",
                options: function () {
                    return {
                        'FBMono': '',
                        'FBSans': '',
                        'DSEG7': '',
                        'DSEG14': '',
                        'Pandora': '',
                        'FBCursive': '',
                        'FBSerif': '',
                        'DIN': '',
                        'FBComic': '',
                        'QTBlackForest': '',
                        'PenguinAttack': '',
                        'Chancery': '',
                        'Pixel': '',
                        'Handwriting': '',
                        'Chalkboard': '',
                        'RoughScript': '',
                    }
                }
            }
        ],
        newInstance: function (settings, newInstanceCallback) {
            newInstanceCallback(new textWidget(settings));
        }
    });

    var gaugeID = 0;
    freeboard.addStyle('.gauge-widget-wrapper', "width: 100%;text-align: center;");

    var gaugeWidget = function (settings) {
        var self = this;

        var thisGaugeID = "gauge-" + gaugeID++;
        var titleElement = $('<h2 class="section-title"></h2>');
    
        var gaugeElement = $('<canvas width=180 height=180 id="' + thisGaugeID + '"></canvas>')

        var gaugeObject;
        var rendered = false;

        self.value = 0

        self.currentSettings = settings;

        settings.style = settings.style || {}

        function createGauge() {
            if (!rendered) {
                return;
            }

            gaugeElement.empty();

            if (gaugeObject) {
                gaugeObject.destroy();
            }

            //10px just for extra margin
            var tlh = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--title-line-height'))+10;
            gaugeElement.attr('width', parseInt(settings.style.size) * 60-tlh).attr('height', parseInt(settings.style.size)* 60-tlh);
            var target = document.getElementById(thisGaugeID); // your canvas element

            //Decimals to contain the max possible value
            var places = String(self.currentSettings.max_value||100).split('.')[0].length




            var ops = {
                renderTo: target,
                width: (Number(settings.style.size) * 60)-tlh,
                height: Number(settings.style.size) * 60-tlh,
                units: self.currentSettings.units,
                title: self.currentSettings.title,
                value: self.value,
                minValue: self.currentSettings.min_value,
                maxValue: self.currentSettings.max_value,
                majorTicks: [
                ],
                minorTicks: self.currentSettings.minorTicks,
                strokeTicks: false,
                highlights: [
                ],
                colorBorderOuter: self.currentSettings.style.borderOuter,
                colorBorderOuterEnd: self.currentSettings.style.borderOuterEnd,
                colorBorderMiddle: self.currentSettings.style.borderMiddle,
                colorBorderMiddleEnd: self.currentSettings.style.borderMiddleEnd,
                colorBorderInner: self.currentSettings.style.borderInner,
                colorBorderInnerEnd: self.currentSettings.style.borderInnerEnd,

                borderInnerWidth: self.currentSettings.style.borderInnerWidth,
                borderMiddleWidth: self.currentSettings.style.borderMiddleWidth,
                borderOuterWidth: self.currentSettings.style.borderOuterWidth,


                colorBorderShadow: self.currentSettings.style.borderShadow,



                

                colorPlate: self.currentSettings.style.plateColor,
                colorPlateEnd: self.currentSettings.style.plateColorEnd,

                colorMajorTicks: self.currentSettings.style.fgColor,
                colorMinorTicks: self.currentSettings.style.fgColor,
                colorTitle: self.currentSettings.style.fgColor,
                colorUnits: self.currentSettings.style.fgColor,
                colorNumbers: self.currentSettings.style.fgColor,
                colorNeedle: self.currentSettings.style.pointerColor,
                colorNeedleShadowUp: self.currentSettings.style.pointerShadowTop,
                colorNeedleShadowBottom: self.currentSettings.style.pointerShadowBottom,


                colorNeedleEnd: self.currentSettings.style.pointerTipColor,

                colorNeedleCircleOuter: self.currentSettings.style.pointerCircleOuter,
                colorNeedleCircleOuterEnd: self.currentSettings.style.pointerCircleOuterEnd,
                colorNeedleCircleInner: self.currentSettings.style.pointerCircleInner,
                colorNeedleCircleInnerEnd: self.currentSettings.style.pointerCircleInnerEnd,


                fontTitleSize: self.currentSettings.style.fontTitleSize,
                fontUnitsSize: self.currentSettings.style.fontTitleSize,

                fontValueSize: self.currentSettings.style.fontValueSize,


                valueBox: self.currentSettings.digits>0,
                valueInt: places,
                valueDec: Math.max(self.currentSettings.digits-places,0),
                animationRule: 'bounce',
                animationDuration: 500,
                animation: false
            }

            var tick = parseInt(self.currentSettings.min_value)


            while (tick <= parseInt(self.currentSettings.max_value)) {
                ops.majorTicks.push(String(tick));
                tick += parseInt(self.currentSettings.tick_interval);
            }


            var gauge = new RadialGauge(ops);
            gauge.draw()





            gaugeObject = gauge


        }

        this.render = function (element) {
            rendered = true;
            $(element).append(titleElement).append($('<div class="gauge-widget-wrapper"></div>').append(gaugeElement));
            createGauge();
        }

        this.onSettingsChanged = function (newSettings) {

            self.currentSettings = newSettings;
            createGauge();

            titleElement.html(newSettings.heading || '');
        }

        this.onCalculatedValueChanged = function (settingName, value) {
            self.value = value
            if (!_.isUndefined(gaugeObject)) {

                gaugeObject.value = (Number(value));
                gaugeElement.attr('title', String(value)+(self.currentSettings.units||''))

            }
        }

        this.onDispose = function () {
            if (gaugeObject) {
                gaugeObject.destroy();
            }
        }

        this.getHeight = function () {
            try {
                return self.currentSettings.style.size;
            }
            catch (e) { 
                console.log(e);
                return 3
             }
        }

        this.onSettingsChanged(settings);
    };

    freeboard.loadWidgetPlugin({
        type_name: "gauge",
        display_name: "Gauge",
        settings: [
            {
                name: "title",
                display_name: "Title",
                type: "text"
            },
            {
                name: "heading",
                display_name: "Heading",
                type: "text"
            },

            {
                name: 'style',
                type: 'json',
                display_name: "Theming",
                schema: {
                    type: "object",
                    title: "Theme",
                    properties: {
                        "pointerColor": {
                            type: "string",
                            format: 'color',
                            'options': {
                                'colorpicker': {
                                    'editorFormat': 'rgb',
                                }
                            }
                        },
                        "pointerTipColor": {
                            type: "string",
                            format: 'color',
                            'options': {
                                'colorpicker': {
                                    'editorFormat': 'rgb',
                                }
                            }

                        },
                        "pointerCircleInner": {
                            type: "string",
                            format: 'color',
                            'options': {
                                'colorpicker': {
                                    'editorFormat': 'rgb',
                                }
                            }

                        },
                        "pointerCircleInnerEnd": {
                            type: "string",
                            format: 'color',
                            'options': {
                                'colorpicker': {
                                    'editorFormat': 'rgb',
                                }
                            }

                        },
                        "pointerCircleOuter": {
                            type: "string",
                            format: 'color',
                            'options': {
                                'colorpicker': {
                                    'editorFormat': 'rgb',
                                }
                            }

                        },
                        "pointerCircleOuterEnd": {
                            type: "string",
                            format: 'color',
                            'options': {
                                'colorpicker': {
                                    'editorFormat': 'rgb',
                                }
                            }

                        },
                        "pointerShadowBottom": {
                            type: "string",
                            format: 'color',
                            'options': {
                                'colorpicker': {
                                    'editorFormat': 'rgb',
                                }
                            }

                        }, 
                        "pointerShadowTop": {
                            type: "string",
                            format: 'color',
                            'options': {
                                'colorpicker': {
                                    'editorFormat': 'rgb',
                                }
                            }

                        },

                        "fgColor": {
                            type: "string",
                            format: 'color',
                            'options': {
                                'colorpicker': {
                                    'editorFormat': 'rgb',
                                }
                            },
                        },
                        "borderInner": {
                            type: "string",
                            format: 'color',
                            'options': {
                                'colorpicker': {
                                    'editorFormat': 'rgb',
                                }
                            },
                        }, "borderInnerEnd": {
                            type: "string",
                            format: 'color',
                            'options': {
                                'colorpicker': {
                                    'editorFormat': 'rgb',
                                }
                            },
                        }, "borderMiddle": {
                            type: "string",
                            format: 'color',
                            'options': {
                                'colorpicker': {
                                    'editorFormat': 'rgb',
                                }
                            }
                        },

                        "borderMiddleEnd": {
                            type: "string",
                            format: 'color',
                            'options': {
                                'colorpicker': {
                                    'editorFormat': 'rgb',
                                }
                            },
                        }, "borderOuter": {
                            type: "string",
                            format: 'color',
                            'options': {
                                'colorpicker': {
                                    'editorFormat': 'rgb',
                                }
                            },
                        }, "borderOuterEnd": {
                            type: "string",
                            format: 'color',
                            'options': {
                                'colorpicker': {
                                    'editorFormat': 'rgb',
                                }
                            }
                        },
                        "borderInnerWidth": {
                            type: "number",
                            min: 0,
                            max: 12,
                        },
                        "borderMiddleWidth": {
                            type: "number",
                            min: 0,
                            max: 12,
                        },
                        "borderOuterWidth": {
                            type: "number",
                            min: 0,
                            max: 12,
                        },
                        "size": {
                            type: "number",
                            min: 1,
                            max: 8,
                        },


                        "borderShadow": {
                            type: "string",
                            format: 'color',
                            'options': {
                                'colorpicker': {
                                    'editorFormat': 'rgb',
                                    alpha: true
                                }
                            },
                        },
                        "plateColor": {
                            type: "string",
                            format: 'color',
                            'options': {
                                'colorpicker': {
                                    'editorFormat': 'rgb',
                                }
                            },
                            default_value: "rgb(0,0,0)"

                        },
                        "plateColorEnd": {
                            type: "string",
                            format: 'color',
                            'options': {
                                'colorpicker': {
                                    'editorFormat': 'rgb',
                                }
                            },
                            default_value: "rgb(0,0,0)"

                        },

                        "fontTitleSize": {
                            type: "number",
                            min: 8,
                            max: 64
                        },
                        "fontValueSize": {
                            type: "number",
                            min: 8,
                            max: 64
                        }
                    }
                },

                default_value: {
                    "pointerCircleInner": "rgb(57,43,21)",
                    "pointerCircleInnerEnd": "rgb(57,43,21)",
                    "pointerCircleOuter": "rgb(87,63,41)",
                    "pointerCircleOuterEnd": "rgb(57,43,21)",

                    "pointerShadowTop": "#000000",
                    "pointerShadowBottom": "#000000",

                    "pointerColor": "#000000",
                    "pointerTipColor": "#002000",
                    "fgColor": "rgb(57,43,21)",
                    "borderInner": "rgb(77,68,56)",
                    "borderInnerEnd": "rgb(59,44,36)",
                    "borderMiddle": "rgb(202,192,155)",
                    "borderMiddleEnd": "rgb(163,145,96)",
                    "borderOuter": "rgb(102,90,67)",
                    "borderOuterEnd": "rgb(57,41,34)",
                    "borderInnerWidth": 2,
                    "borderMiddleWidth": 3,
                    "borderOuterWidth": 2,
                    "borderShadow": "#000000",
                    "plateColor": "rgb(204,198,190)",
                    "plateColorEnd": "rgb(195,190,180)",

                    "fontTitleSize": 32,
                    "fontValueSize": 40,

                    size: 4
                }
            },



            {
                name: "value",
                display_name: "Value",
                type: "calculated"
            },

            {
                name: "units",
                display_name: "Units",
                type: "text"
            },
            {
                name: "min_value",
                display_name: "Minimum",
                type: "text",
                default_value: 0
            },
            {
                name: "max_value",
                display_name: "Maximum",
                type: "text",
                default_value: 100
            },
            {
                name: "tick_interval",
                display_name: "Tick Spacing",
                type: "text",
                default_value: 10
            },
            {
                name: "minor_ticks",
                display_name: "Tick divisions",
                type: "text",
                default_value: 5
            },
            {
                name: "digits",
                display_name: "Show digits",
                type: "number",
                default_value: 4
            }
        ],
        newInstance: function (settings, newInstanceCallback) {
            newInstanceCallback(new gaugeWidget(settings));
        }
    });


    freeboard.addStyle('.sparkline', "width:100%;height: 75px;");
    var sparklineWidget = function (settings) {
        var self = this;

        var titleElement = $('<h2 class="section-title"></h2>');
        var sparklineElement = $('<div class="sparkline"></div>');
        var sparklineLegend = $('<div></div>');
        var currentSettings = settings;

        this.render = function (element) {
            $(element).append(titleElement).append(sparklineElement).append(sparklineLegend);
        }

        this.onSettingsChanged = function (newSettings) {
            currentSettings = newSettings;
            titleElement.html((_.isUndefined(newSettings.title) ? "" : newSettings.title));

            if (newSettings.include_legend) {
                addSparklineLegend(sparklineLegend, newSettings.legend.split(","));
            }
        }

        this.onCalculatedValueChanged = function (settingName, newValue) {
            if (currentSettings.legend) {
                addValueToSparkline(sparklineElement, newValue, currentSettings.legend.split(","));
            } else {
                addValueToSparkline(sparklineElement, newValue);
            }
        }

        this.onDispose = function () {
        }

        this.getHeight = function () {
            var legendHeight = 0;
            if (currentSettings.include_legend && currentSettings.legend) {
                var legendLength = currentSettings.legend.split(",").length;
                if (legendLength > 4) {
                    legendHeight = Math.floor((legendLength - 1) / 4) * 0.5;
                } else if (legendLength) {
                    legendHeight = 0.5;
                }
            }
            return 2 + legendHeight;
        }

        this.onSettingsChanged(settings);
    };

    freeboard.loadWidgetPlugin({
        type_name: "sparkline",
        display_name: "Sparkline",
        settings: [
            {
                name: "title",
                display_name: "Title",
                type: "text"
            },
            {
                name: "value",
                display_name: "Value",
                type: "calculated",
                multi_input: "true"
            },
            {
                name: "include_legend",
                display_name: "Include Legend",
                type: "boolean"
            },
            {
                name: "legend",
                display_name: "Legend",
                type: "text",
                description: "Comma-separated for multiple sparklines"
            }
        ],
        newInstance: function (settings, newInstanceCallback) {
            newInstanceCallback(new sparklineWidget(settings));
        }
    });

    freeboard.addStyle('div.pointer-value', "position:absolute;height:95px;margin: auto;top: 0px;bottom: 0px;width: 100%;text-align:center;");
    var pointerWidget = function (settings) {
        var self = this;
        var paper;
        var strokeWidth = 3;
        var triangle;
        var width, height;
        var currentValue = 0;
        var valueDiv = $('<div class="widget-big-text"></div>');
        var unitsDiv = $('<div></div>');

        function polygonPath(points) {
            if (!points || points.length < 2)
                return [];
            var path = []; //will use path object type
            path.push(['m', points[0], points[1]]);
            for (var i = 2; i < points.length; i += 2) {
                path.push(['l', points[i], points[i + 1]]);
            }
            path.push(['z']);
            return path;
        }

        this.render = function (element) {
            width = $(element).width();
            height = $(element).height();

            var radius = Math.min(width, height) / 2 - strokeWidth * 2;

            paper = Raphael($(element).get()[0], width, height);
            var circle = paper.circle(width / 2, height / 2, radius);
            circle.attr("stroke", "#FF9900");
            circle.attr("stroke-width", strokeWidth);

            triangle = paper.path(polygonPath([width / 2, (height / 2) - radius + strokeWidth, 15, 20, -30, 0]));
            triangle.attr("stroke-width", 0);
            triangle.attr("fill", "#fff");

            $(element).append($('<div class="pointer-value"></div>').append(valueDiv).append(unitsDiv));
        }

        this.onSettingsChanged = function (newSettings) {
            unitsDiv.html(newSettings.units);
        }

        this.onCalculatedValueChanged = function (settingName, newValue) {
            if (settingName == "direction") {
                if (!_.isUndefined(triangle)) {
                    var direction = "r";

                    var oppositeCurrent = currentValue + 180;

                    if (oppositeCurrent < newValue) {
                        //direction = "l";
                    }

                    triangle.animate({ transform: "r" + newValue + "," + (width / 2) + "," + (height / 2) }, 250, "bounce");
                }

                currentValue = newValue;
            }
            else if (settingName == "value_text") {
                valueDiv.html(newValue);
            }
        }

        this.onDispose = function () {
        }

        this.getHeight = function () {
            return 4;
        }

        this.onSettingsChanged(settings);
    };

    freeboard.loadWidgetPlugin({
        type_name: "pointer",
        display_name: "Pointer",
        settings: [
            {
                name: "direction",
                display_name: "Direction",
                type: "calculated",
                description: "In degrees"
            },
            {
                name: "value_text",
                display_name: "Value Text",
                type: "calculated"
            },
            {
                name: "units",
                display_name: "Units",
                type: "text"
            }
        ],
        newInstance: function (settings, newInstanceCallback) {
            newInstanceCallback(new pointerWidget(settings));
        }
    });

    var pictureWidget = function (settings) {
        var self = this;
        var widgetElement;
        var timer;
        var imageURL;

        function stopTimer() {
            if (timer) {
                clearInterval(timer);
                timer = null;
            }
        }

        function updateImage() {
            if (widgetElement && imageURL) {
                //var cacheBreakerURL = imageURL + (imageURL.indexOf("?") == -1 ? "?" : "&") + Date.now();

                //Overriding cache is generally a bad thing if there is polling happening.  If needed, fix your cache settings.
                var cacheBreakerURL = imageURL


                $(widgetElement).css({
                    "background-image": "url(" + cacheBreakerURL + ")"
                });


            }
        }

        this.render = function (element) {
            $(element).css({
                width: "100%",
                height: "100%",
                "background-size": "cover",
                "background-position": "center"
            });

            widgetElement = element;
        }

        this.onSettingsChanged = function (newSettings) {
            stopTimer();

            if (newSettings.refresh && newSettings.refresh > 0) {
                timer = setInterval(updateImage, Number(newSettings.refresh) * 1000);
            }
        }

        this.onCalculatedValueChanged = function (settingName, newValue) {
            if (settingName == "src") {
                imageURL = newValue;
            }

            updateImage();
        }

        this.onDispose = function () {
            stopTimer();
        }

        this.getHeight = function () {
            return 4;
        }

        this.onSettingsChanged(settings);
    };

    freeboard.loadWidgetPlugin({
        type_name: "picture",
        display_name: "Picture",
        fill_size: true,
        settings: [
            {
                name: "src",
                display_name: "Image URL",
                type: "calculated"
            },
            {
                "type": "number",
                "display_name": "Refresh every",
                "name": "refresh",
                "suffix": "seconds",
                "description": "Leave blank if the image doesn't need to be refreshed"
            }
        ],
        newInstance: function (settings, newInstanceCallback) {
            newInstanceCallback(new pictureWidget(settings));
        }
    });

    freeboard.addStyle('.indicator-light', "border-radius:50%;width:22px;height:22px;border:2px solid #3d3d3d;margin-top:5px;float:left;background-color:#222;margin-right:10px;");
    freeboard.addStyle('.indicator-light.on', "background-color:#FFC773;box-shadow: 0px 0px 15px #FF9900;border-color:#FDF1DF;");
    freeboard.addStyle('.indicator-text', "margin-top:10px;");
    var indicatorWidget = function (settings) {
        var self = this;
        var titleElement = $('<h2 class="section-title"></h2>');
        var stateElement = $('<div class="indicator-text"></div>');
        var indicatorElement = $('<div class="indicator-light"></div>');
        var currentSettings = settings;
        var isOn = false;
        var onText;
        var offText;

        function updateState() {
            indicatorElement.toggleClass("on", isOn);

            if (isOn) {
                stateElement.text((_.isUndefined(onText) ? (_.isUndefined(currentSettings.on_text) ? "" : currentSettings.on_text) : onText));
            }
            else {
                stateElement.text((_.isUndefined(offText) ? (_.isUndefined(currentSettings.off_text) ? "" : currentSettings.off_text) : offText));
            }
        }

        this.render = function (element) {
            $(element).append(titleElement).append(indicatorElement).append(stateElement);
        }

        this.onSettingsChanged = function (newSettings) {
            currentSettings = newSettings;
            titleElement.html((_.isUndefined(newSettings.title) ? "" : newSettings.title));
            updateState();
        }

        this.onCalculatedValueChanged = function (settingName, newValue) {
            if (settingName == "value") {
                isOn = Boolean(newValue);
            }
            if (settingName == "on_text") {
                onText = newValue;
            }
            if (settingName == "off_text") {
                offText = newValue;
            }

            updateState();
        }

        this.onDispose = function () {
        }

        this.getHeight = function () {
            return 1;
        }

        this.onSettingsChanged(settings);
    };

    freeboard.loadWidgetPlugin({
        type_name: "indicator",
        display_name: "Indicator Light",
        settings: [
            {
                name: "title",
                display_name: "Title",
                type: "text"
            },
            {
                name: "value",
                display_name: "Value",
                type: "calculated"
            },
            {
                name: "on_text",
                display_name: "On Text",
                type: "calculated"
            },
            {
                name: "off_text",
                display_name: "Off Text",
                type: "calculated"
            }
        ],
        newInstance: function (settings, newInstanceCallback) {
            newInstanceCallback(new indicatorWidget(settings));
        }
    });

    freeboard.addStyle('.gm-style-cc a', "text-shadow:none;");

    freeboard.addStyle('.html-widget', "white-space:normal;width:100%;height:100%");

    var htmlWidget = function (settings) {
        var self = this;
        var htmlElement = $('<div class="html-widget"></div>');
        var currentSettings = settings;

        this.render = function (element) {
            $(element).append(htmlElement);
        }

        this.onSettingsChanged = function (newSettings) {
            currentSettings = newSettings;
        }

        this.onCalculatedValueChanged = function (settingName, newValue) {
            if (settingName == "html") {
                htmlElement.html(newValue);
            }
        }

        this.onDispose = function () {
        }

        this.getHeight = function () {
            return Number(currentSettings.height);
        }

        this.onSettingsChanged(settings);
    };

    freeboard.loadWidgetPlugin({
        "type_name": "html",
        "display_name": "Show computed HTML",
        "fill_size": true,
        "settings": [
            {
                "name": "html",
                "display_name": "HTML",
                "type": "calculated",
                "description": "Can be literal HTML, or javascript that outputs HTML."
            },
            {
                "name": "height",
                "display_name": "Height Blocks",
                "type": "number",
                "default_value": 4,
                "description": "A height block is around 60 pixels"
            }
        ],
        newInstance: function (settings, newInstanceCallback) {
            newInstanceCallback(new htmlWidget(settings));
        }
    });

}());

// ┌────────────────────────────────────────────────────────────────────┐ \\
// │ freeboard-textbox-plugin                                            │ \\
// ├────────────────────────────────────────────────────────────────────┤ \\
// │ http://blog.onlinux.fr/                                            │ \\
// ├────────────────────────────────────────────────────────────────────┤ \\
// │ Licensed under the MIT license.                                    │ \\
// ├────────────────────────────────────────────────────────────────────┤ \\
// │ Freeboard widget plugin.                                           │ \\
// └────────────────────────────────────────────────────────────────────┘ \\
(function () {
	//
	// DECLARATIONS
	//
	var LOADING_INDICATOR_DELAY = 1000;
	var SLIDER_ID = 0;

	freeboard.addStyle('.textbox', "border: 2px solid #3d3d3d;background-color: #222;margin: 10px;");
	freeboard.addStyle('.textbox-label', 'margin-left: 10px; margin-top: 10px; text-transform: capitalize;');
	freeboard.addStyle('.myui-textbox-handle', "width: 1.5em !important; height: 1.5em !important; border-radius: 50%; top: -.4em !important; margin-left:-1.0em !important;");
	freeboard.addStyle('.ui-textbox-range', 'background: #F90;');

	// ## A Widget Plugin
	//
	// -------------------
	// ### Widget Definition
	//
	// -------------------
	// **freeboard.loadWidgetPlugin(definition)** tells freeboard that we are giving it a widget plugin. It expects an object with the following:
	freeboard.loadWidgetPlugin({
		// Same stuff here as with datasource plugin.
		"type_name": "richtextbox_plugin",
		"display_name": "Rich Text Box",
		"description": "Interactive Textbox Plugin with 2-way data binding.",
		// **external_scripts** : Any external scripts that should be loaded before the plugin instance is created.

		// **fill_size** : If this is set to true, the widget will fill be allowed to fill the entire space given it, otherwise it will contain an automatic padding of around 10 pixels around it.
		"fill_size": true,
		"settings": [
			{
				"name": "title",
				"display_name": "Title",
				"type": "text",
                "default_value": ""
			},
        	{
				"name": "size",
				"display_name": "Size(height blocks)",
				"type": "number",
                "default_value": 8
			},
			{
				"name": "mode",
				"display_name": "Mode",
				"type": "option",
				"options": [
					{
						"name": "Real Time",
						"value": "input"
					},
					{
						"name": "When element loses focus",
						"value": "change"
					}
				]
			},
			{
				name: "target",
				display_name: "Data target when value changes. ",
                description:'Value pushed will be the text',
				type: "target"
			}
		],
		// Same as with datasource plugin, but there is no updateCallback parameter in this case.
		newInstance: function (settings, newInstanceCallback) {
			newInstanceCallback(new textbox(settings));
		}
	});


	// ### Widget Implementation
	//
	// -------------------
	// Here we implement the actual widget plugin. We pass in the settings;
	var textbox = function (settings) {
		var self = this;
		self.currentSettings = settings;

		var thisWidgetId = "textbox-" + SLIDER_ID++;
		var thisWidgetContainer = $('<div id="__' + thisWidgetId + '"></div>').css('position','static').css('overflow','scroll').height('100%');


		var titleElement = $('<h2 class="section-title textbox-label"></h2>');
		var theTextbox = '#' + thisWidgetId+"-trumbo"

		//console.log( "theTextbox ", theTextbox);

		titleElement.html(self.currentSettings.title);
		self.value = ''

		var requestChange = false;
        var target;
        



        //We use font awesome instead of the SVG
        $.trumbowyg.svgPath = false;
        $.trumbowyg.hideButtonTexts = true;


        var inputElement = $('<textarea id="' + thisWidgetId + '-trumbo"></textarea>').appendTo(thisWidgetContainer);
        var l = ["ffffff", "000000", "eeece1", "1f497d", "4f81bd", "c0504d", "9bbb59", "8064a2", "4bacc6", "f79646", "ffff00", "f2f2f2", "7f7f7f", "ddd9c3", "c6d9f0", "dbe5f1", "f2dcdb", "ebf1dd"]
        


        $('#' + thisWidgetId + '-trumbo').on('tbwchange', function (e) {
			if(self.currentSettings.mode=='realtime')
			{
				self.dataTargets.target($('#' + thisWidgetId + '-trumbo').trumbowyg('html'))
			}
        });
        $('#' + thisWidgetId + '-trumbo').on('tbwblur', function (e) {
			self.dataTargets.target($('#' + thisWidgetId + '-trumbo').trumbowyg('html'))
        });


		// Here we create an element to hold the text we're going to display. We're going to set the value displayed in it below.

		// **render(containerElement)** (required) : A public function we must implement that will be called when freeboard wants us to render the contents of our widget. The container element is the DIV that will surround the widget.
		self.render = function (containerElement) {
			$(containerElement)
				.append(thisWidgetContainer);
			titleElement.appendTo(thisWidgetContainer);
			inputElement.appendTo(thisWidgetContainer);
			if(self.toDestroy)
			{
			self.toDestroy('destroy')
			}

			$('#' + thisWidgetId + '-trumbo').trumbowyg({
				btns: [
					['viewHTML'],
					['undo', 'redo'], // Only supported in Blink browsers
					['formatting'],
					['strong', 'em', 'del'],
					['superscript', 'subscript'],
					['foreColor', 'backColor'],
					['link'],
					['base64'],
					['justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull'],
					['unorderedList', 'orderedList'],
					['horizontalRule'],
					['removeformat'],
					['fullscreen'],
					['fontsize', 'fontfamily', 'preformatted'],
					['emoji', 'table', 'specialChars']
				],
				semantic:false,
		
				plugins: {
					colors: {
						displayAsList: true,
						foreColorList: l,
						backColorList: l,
	
					},
					fontfamily:
					{
						fontList: [
							{ name: 'Seriff', family: 'FBSerif' },
							{ name: 'Sans', family: 'FBSans' },
							{ name: 'Monospace', family: 'FBMono' },
							{ name: 'Cursive', family: 'FBCursive' },
							{ name: 'Pandora', family: 'Pandora' },
							{ name: 'Chalkboard', family: 'Chalkboard' },
							{ name: 'Handwriting', family: 'Handwriting' },
							{ name: 'Rough Script', family: 'RoughScript' },
							{ name: 'Chancery', family: 'Chancery' },
							{ name: 'Comic', family: 'FBComic' },
							{ name: 'Blackletter', family: 'Blackletter' },
							{ name: 'Stencil', family: 'Stencil' },
							{ name: 'Pixel', family: 'Pixel' },
							{ name: 'B612', family: 'B612' },
							{ name: 'DIN', family: 'DIN' },
							{ name: 'Penguin Attack', family: 'PenguinAttack' },
							{ name: 'DSEG7', family: 'DSEG7' },
							{ name: 'DSEG14', family: 'DSEG14' }
	
	
						]
					}
				}
			});

			self.toDestroy= $('#' + thisWidgetId + '-trumbo').trumbowyg


			$('#' + thisWidgetId + '-trumbo').closest(".trumbowyg-box").css('min-height',Math.max( parseInt(self.currentSettings.size)*60 - 80, 30))
			$('#' + thisWidgetId + '-trumbo').prev(".trumbowyg-editor").css('min-height',Math.max( parseInt(self.currentSettings.size)*60 - 80, 30))
			$('#' + thisWidgetId + '-trumbo').closest(".trumbowyg-box").css('height',Math.max( parseInt(self.currentSettings.size)*60 - 80, 30))
			$('#' + thisWidgetId + '-trumbo').prev(".trumbowyg-editor").css('height',Math.max( parseInt(self.currentSettings.size)*60 - 80, 30))

			$('#' + thisWidgetId + '-trumbo').on('change',
				function (e) {
						//Avoid loops, only real user input triggers this
						if (true) {
							self.dataTargets.target(e.target.value);
						}
				});
            
			$('#' + thisWidgetId + '-trumbo').on('input',
				function (e) {
					self.value = e.target.value;

					if (self.currentSettings.mode == 'change') {
						//This mode does not affect anything till the user releases the mouse
						return;
					}
					if (_.isUndefined(self.currentSettings.target)) { }
					else {
						//todo Avoid loops, only real user input triggers this
						if (true) {
							self.dataTargets.target(e.target.value);
						}
					}
				}
			);
			$(theTextbox).removeClass("ui-widget-content");
		}

		// **getHeight()** (required) : A public function we must implement that will be called when freeboard wants to know how big we expect to be when we render, and returns a height. This function will be called any time a user updates their settings (including the first time they create the widget).
		//
		// Note here that the height is not in pixels, but in blocks. A block in freeboard is currently defined as a rectangle that is fixed at 300 pixels wide and around 45 pixels multiplied by the value you return here.
		//
		// Blocks of different sizes may be supported in the future.
		self.getHeight = function () {
			return parseInt(self.currentSettings.size)
		}

		// **onSettingsChanged(newSettings)** (required) : A public function we must implement that will be called when a user makes a change to the settings.
		self.onSettingsChanged = function (newSettings) {
			// Normally we'd update our text element with the value we defined in the user settings above (the_text), but there is a special case for settings that are of type **"calculated"** -- see below.
			self.currentSettings = newSettings;
			titleElement.html((_.isUndefined(newSettings.title) ? "" : newSettings.title));
			self.currentSettings.unit = self.currentSettings.unit || ''
            $(theTextbox).attr('pattern', newSettings.pattern);
            $(theTextbox).attr('placeholder', newSettings.placeholder);
			$(theTextbox).attr('tooltip', newSettings.placeholder);

			$('#' + thisWidgetId + '-trumbo').closest(".trumbowyg-box").css('min-height',Math.max( parseInt(self.currentSettings.size)*60 - 80, 30))
			$('#' + thisWidgetId + '-trumbo').prev(".trumbowyg-editor").css('min-height',Math.max( parseInt(self.currentSettings.size)*60 - 80, 30))
			$('#' + thisWidgetId + '-trumbo').closest(".trumbowyg-box").css('height',Math.max( parseInt(self.currentSettings.size)*60 - 80, 30))
			$('#' + thisWidgetId + '-trumbo').prev(".trumbowyg-editor").css('height',Math.max( parseInt(self.currentSettings.size)*60 - 80, 30))

		}

		// **onCalculatedValueChanged(settingName, newValue)** (required) : A public function we must implement that will be called when a calculated value changes. Since calculated values can change at any time (like when a datasource is updated) we handle them in a special callback function here.
		self.onCalculatedValueChanged = function (settingName, newValue) {

			// Remember we defined "the_text" up above in our settings.
			if (settingName == "target") {
				self.value = newValue;
				
				var value= newValue;
				
			

				//Attempt to break l00ps
				if(value!=$(theTextbox).val())
				{
					$(theTextbox).val(value);
				}
			}

			
			if(settingName=='placeholder')
			{
                $(theTextbox).attr('placeholder', newValue);
			}
			
		}


		// **onDispose()** (required) : Same as with datasource plugins.
		self.onDispose = function () {
			self.toDestroy('destroy')
		}
	}
}());

// # Building a Freeboard Plugin
//
// A freeboard plugin is simply a javascript file that is loaded into a web page after the main freeboard.js file is loaded.
//
// Let's get started with an example of a datasource plugin and a widget plugin.
//
// -------------------

// Best to encapsulate your plugin in a closure, although not required.
(function()
{
	// ## A Datasource Plugin
	//
	// -------------------
	// ### Datasource Definition
	//
	// -------------------
	// **freeboard.loadDatasourcePlugin(definition)** tells freeboard that we are giving it a datasource plugin. It expects an object with the following:
	freeboard.loadDatasourcePlugin({
		// **type_name** (required) : A unique name for this plugin. This name should be as unique as possible to avoid collisions with other plugins, and should follow naming conventions for javascript variable and function declarations.
		"type_name"   : "core_scratchpad_plugin",
		// **display_name** : The pretty name that will be used for display purposes for this plugin. If the name is not defined, type_name will be used instead.
		"display_name": "Scratchpad Variables",
        // **description** : A description of the plugin. This description will be displayed when the plugin is selected or within search results (in the future). The description may contain HTML if needed.
        "description" : "The data is just an empty space.  To set some data, use datasources['scratchpad']['SomeName'] as a data target.  It will be available to read in other widgets.  You can also set the default data using JSON.",
		// **external_scripts** : Any external scripts that should be loaded before the plugin instance is created.
	
		// **settings** : An array of settings that will be displayed for this plugin when the user adds it.
		"settings"    : [
                {
                    // **name** (required) : The name of the setting. This value will be used in your code to retrieve the value specified by the user. This should follow naming conventions for javascript variable and function declarations.
                    "name"         : "data",
                    // **display_name** : The pretty name that will be shown to the user when they adjust this setting.
                    "display_name" : "Default Data(as JSON or JS expression)",
                    // **type** (required) : The type of input expected for this setting. "text" will display a single text box input. Examples of other types will follow in this documentation.
                    "type"         : "calculated",
                    // **default_value** : A default value for this setting.
                    "default_value": "={}",
                    "options" : function(){
                        return {"={key: 'value'}":""}
                    },
                    // **description** : Text that will be displayed below the setting to give the user any extra information.
                    "description"  : "Must be a valid JS =expression that returns an object. Whatever it returns will be the default data.",
                    // **required** : If set to true, the field will be required to be filled in by the user. Defaults to false if not specified.
                    "required" : true
				},

				 {
                    // **name** (required) : The name of the setting. This value will be used in your code to retrieve the value specified by the user. This should follow naming conventions for javascript variable and function declarations.
                    "name"         : "persist",
                    // **display_name** : The pretty name that will be shown to the user when they adjust this setting.
                    "display_name" : "Persistance Mode",
                    // **type** (required) : The type of input expected for this setting. "text" will display a single text box input. Examples of other types will follow in this documentation.
                    "type"         : "option",
                    // **default_value** : A default value for this setting.
                    "default_value": "off",
					'options':[
						{
							'name': 'Off',
							'value': 'off'
						},
						{
							'name': 'Board',
							'value': 'board'
						},
					],
                    // **description** : Text that will be displayed below the setting to give the user any extra information.
                    "description"  : "off: no persistance,  board: changes are passed to the Default Data field and can be exported with the board.",
                    // **required** : If set to true, the field will be required to be filled in by the user. Defaults to false if not specified.
                    "required" : true
				},
				

				{
                    // **name** (required) : The name of the setting. This value will be used in your code to retrieve the value specified by the user. This should follow naming conventions for javascript variable and function declarations.
                    "name"         : "lock",
                    // **display_name** : The pretty name that will be shown to the user when they adjust this setting.
                    "display_name" : "Lock data(read only)",
                    // **type** (required) : The type of input expected for this setting. "text" will display a single text box input. Examples of other types will follow in this documentation.
                    "type"         : "boolean",
                    // **default_value** : A default value for this setting.
                    "default_value": false,
				},

				{
                    // **name** (required) : The name of the setting. This value will be used in your code to retrieve the value specified by the user. This should follow naming conventions for javascript variable and function declarations.
                    "name"         : "",
                    // **display_name** : The pretty name that will be shown to the user when they adjust this setting.
					"display_name" : "",
					'html': "Show current data",
					
                    // **type** (required) : The type of input expected for this setting. "text" will display a single text box input. Examples of other types will follow in this documentation.
                    "type"         : "button",
                    
                    'onclick': function(n,i){
						freeboard.showDialog(JSON.stringify(i.data),"Debug data for: "+n+" (non-JSON not shown)","OK")
					},
                    // **description** : Text that will be displayed below the setting to give the user any extra information.
                    "description"  : "",
                  
				},
				



				{
					  // **name** (required) : The name of the setting. This value will be used in your code to retrieve the value specified by the user. This should follow naming conventions for javascript variable and function declarations.
					  "name"         : "",
					  // **display_name** : The pretty name that will be shown to the user when they adjust this setting.
					  "display_name" : "",
					  'html': "Show current data in JSON editor",
					  
					  // **type** (required) : The type of input expected for this setting. "text" will display a single text box input. Examples of other types will follow in this documentation.
					  "type"         : "button",
					
					
					  // **description** : Text that will be displayed below the setting to give the user any extra information.
					  "description"  : "",

					'onclick': function(n,i){
						var x = []
						freeboard.showDialog($('<div id="fb-global-json-editor">'),"Debug data for: "+n+" (non-JSON not shown)","OK","Cancel",
						function(){
							Object.assign(i.proxy, x[0].getValue());
							x[0].destroy();
						},
						function(){
							x[0].destroy();
						}
						)

						var Editor = new JSONEditor(document.getElementById('fb-global-json-editor'), {schema:{}
							
						});
						x.push(Editor);
						Editor.setValue(i.data)
					
	

					}
				}
			
		],
		// **newInstance(settings, newInstanceCallback, updateCallback)** (required) : A function that will be called when a new instance of this plugin is requested.
		// * **settings** : A javascript object with the initial settings set by the user. The names of the properties in the object will correspond to the setting names defined above.
		// * **newInstanceCallback** : A callback function that you'll call when the new instance of the plugin is ready. This function expects a single argument, which is the new instance of your plugin object.
		// * **updateCallback** : A callback function that you'll call if and when your datasource has an update for freeboard to recalculate. This function expects a single parameter which is a javascript object with the new, updated data. You should hold on to this reference and call it when needed.
		newInstance   : function(settings, newInstanceCallback, updateCallback)
		{
			// myDatasourcePlugin is defined below.
			newInstanceCallback(new myDatasourcePlugin(settings, updateCallback));
		}
	});


	// ### Datasource Implementation
	//
	// -------------------
	// Here we implement the actual datasource plugin. We pass in the settings and updateCallback.
	var myDatasourcePlugin = function(settings, updateCallback)
	{
		// Always a good idea...
		var self = this;

		// Good idea to create a variable to hold on to our settings, because they might change in the future. See below.
		var currentSettings = settings;

        self.handler={
			set: function(obj,prop,val)
			{
				if(currentSettings.lock)
				{
					throw new Error("Cannot change this. It is locked in the datasource settings")
				}
				obj[prop]=val;
				updateCallback(self.proxy);

				//Update the default settings field
				if (currentSettings.persist=='board')
				{
					currentSettings.data = "="+JSON.stringify(obj)
					freeboard.setDatasourceSettings(currentSettings.name, obj)
				}
				return true;
			}

        }
        self.data={}
        self.proxy = new Proxy(self.data, self.handler)
        

		/* This is some function where I'll get my data from somewhere */
		function getData()
		{
			var newData= self.proxy ; // Just putting some sample data in for fun.

			/* Get my data from somewhere and populate newData with it... Probably a JSON API or something. */
			/* ... */

			// I'm calling updateCallback to tell it I've got new data for it to munch on.
			updateCallback(newData);
		}



		// **onSettingsChanged(newSettings)** (required) : A public function we must implement that will be called when a user makes a change to the settings.
		self.onSettingsChanged = function(newSettings)
		{
			// Here we update our current settings with the variable that is passed in.
			currentSettings = newSettings;

            updateCallback(self.proxy)
		}
		self.onCalculatedSettingChanged=function(k,v)
		{
			if(k=='data')
			{
				self.data = v;
				self.proxy = new Proxy(self.data, self.handler)
				updateCallback(self.proxy);

			}
		}

		// **updateNow()** (required) : A public function we must implement that will be called when the user wants to manually refresh the datasource
		self.updateNow = function()
		{
			// Most likely I'll just call getData() here.
			getData();
		}

		// **onDispose()** (required) : A public function we must implement that will be called when this instance of this plugin is no longer needed. Do anything you need to cleanup after yourself here.
		self.onDispose = function()
		{
		
		}

	}

}());

// ┌────────────────────────────────────────────────────────────────────┐ \\
// │ freeboard-slider-plugin                                            │ \\
// ├────────────────────────────────────────────────────────────────────┤ \\
// │ http://blog.onlinux.fr/                                            │ \\
// ├────────────────────────────────────────────────────────────────────┤ \\
// │ Licensed under the MIT license.                                    │ \\
// ├────────────────────────────────────────────────────────────────────┤ \\
// │ Freeboard widget plugin.                                           │ \\
// └────────────────────────────────────────────────────────────────────┘ \\
(function () {
	//
	// DECLARATIONS
	//
	var LOADING_INDICATOR_DELAY = 1000;
	var SLIDER_ID = 0;

	freeboard.addStyle('.slider', "border: 2px solid #3d3d3d;background-color: #222;margin: 10px;");
	freeboard.addStyle('.slider-label', 'margin-left: 10px; margin-top: 10px; text-transform: capitalize;');
	freeboard.addStyle('.myui-slider-handle', "width: 1.5em !important; height: 1.5em !important; border-radius: 50%; top: -.4em !important; margin-left:-1.0em !important;");
	freeboard.addStyle('.ui-slider-range', 'background: #F90;');

	// ## A Widget Plugin
	//
	// -------------------
	// ### Widget Definition
	//
	// -------------------
	// **freeboard.loadWidgetPlugin(definition)** tells freeboard that we are giving it a widget plugin. It expects an object with the following:
	freeboard.loadWidgetPlugin({
		// Same stuff here as with datasource plugin.
		"type_name": "slider_plugin",
		"display_name": "Slider",
		"description": "Interactive Slider Plugin with 2-way data binding.  Value is a list of 2 items, the value and the timestamp.",
		// **external_scripts** : Any external scripts that should be loaded before the plugin instance is created.

		// **fill_size** : If this is set to true, the widget will fill be allowed to fill the entire space given it, otherwise it will contain an automatic padding of around 10 pixels around it.
		"fill_size": true,
		"settings": [
			{
				"name": "title",
				"display_name": "Title",
				"type": "text"
			},

			{
				"name": "unit",
				"display_name": "Unit of measure",
				"type": "text"
			},

			{
				"name": "min",
				"display_name": "Min",
				"type": "calculated",
				"default_value": "0"
			},
			{
				"name": "max",
				"display_name": "Max",
				"type": "calculated",
				"default_value": "100"
			},
			{
				"name": "step",
				"display_name": "Step",
				"type": "calculated",
				"default_value": "1"
			},
			{
				"name": "default",
				"display_name": "Default Value",
				"type": "calculated",
				"default_value": "0"
			},
			{
				"name": "mode",
				"display_name": "Mode",
				"type": "option",
				"options": [
					{
						"name": "Real Time",
						"value": "input"
					},
					{
						"name": "When Released",
						"value": "change"
					}
				]
			},
			{
				name: "target",
				display_name: "Data target when value changes. ",
				description: 'Value pushed will be a value, timestamp pair.',
				type: "target"
			}
		],
		// Same as with datasource plugin, but there is no updateCallback parameter in this case.
		newInstance: function (settings, newInstanceCallback) {
			newInstanceCallback(new slider(settings));
		}
	});


	// ### Widget Implementation
	//
	// -------------------
	// Here we implement the actual widget plugin. We pass in the settings;
	var slider = function (settings) {
		var self = this;
		currentSettings = settings;
		currentSettings.unit = currentSettings.unit || ''

		var thisWidgetId = "slider-" + SLIDER_ID++;
		var thisWidgetContainer = $('<div class="slider-widget slider-label" id="__' + thisWidgetId + '"></div>');


		var titleElement = $('<h2 class="section-title slider-label"></h2>');
		var valueElement = $('<div id="value-' + thisWidgetId + '" style="display:inline-block; padding-left: 10px; font-weight:bold; color: #d3d4d4" ></div>');
		var sliderElement = $('<input/>', { type: 'range', id: thisWidgetId });
		var theSlider = '#' + thisWidgetId;
		var theValue = '#' + "value-" + thisWidgetId;

		//console.log( "theSlider ", theSlider);

		var value = (_.isUndefined(currentSettings.value) ? 50 : currentSettings.value);
		titleElement.html((_.isUndefined(currentSettings.title) ? "" : currentSettings.title));
		self.min = (_.isUndefined(currentSettings.min) ? 0 : currentSettings.min);
		self.max = (_.isUndefined(currentSettings.max) ? 100 : currentSettings.max);
		self.step = (_.isUndefined(currentSettings.step) ? 100 : currentSettings.step);

		self.value = undefined;

		var requestChange = false;
		var target;

		// Here we create an element to hold the text we're going to display. We're going to set the value displayed in it below.

		// **render(containerElement)** (required) : A public function we must implement that will be called when freeboard wants us to render the contents of our widget. The container element is the DIV that will surround the widget.
		self.render = function (containerElement) {
			$(containerElement)
				.append(thisWidgetContainer);
			titleElement.appendTo(thisWidgetContainer);
			$(titleElement).append(valueElement);
			sliderElement.appendTo(thisWidgetContainer);

			$(theSlider).attr('min', self.min);
			$(theSlider).attr('max', self.max);
			$(theSlider).attr('step', self.step);
			$(theSlider).css('width', "95%");

			$(theSlider).on('input', function (e) { $("#value-" + thisWidgetId).html(e.value) });


			$(theValue).html((self.value || 0) + currentSettings.unit);

			$(theSlider).on('change',
				function (e) {
					//Avoid loops, only real user input triggers this
					if (true) {
						self.dataTargets.target(parseFloat(e.target.value));
					}
				});

			$(theSlider).on('input',
				function (e) {
					self.value = e.target.value;
					$(theValue).html(e.target.value + currentSettings.unit);

					if (currentSettings.mode == 'change') {
						//This mode does not affect anything till the user releases the mouse
						return;
					}

					//todo Avoid loops, only real user input triggers this
					if (true) {
						self.dataTargets.target(parseFloat(e.target.value));
					}

				}
			);
			$(theSlider).removeClass("ui-widget-content");
		}

		// **getHeight()** (required) : A public function we must implement that will be called when freeboard wants to know how big we expect to be when we render, and returns a height. This function will be called any time a user updates their settings (including the first time they create the widget).
		//
		// Note here that the height is not in pixels, but in blocks. A block in freeboard is currently defined as a rectangle that is fixed at 300 pixels wide and around 45 pixels multiplied by the value you return here.
		//
		// Blocks of different sizes may be supported in the future.
		self.getHeight = function () {
			if (currentSettings.size == "big") {
				return 2;
			}
			else {
				return 1;
			}
		}

		// **onSettingsChanged(newSettings)** (required) : A public function we must implement that will be called when a user makes a change to the settings.
		self.onSettingsChanged = function (newSettings) {
			// Normally we'd update our text element with the value we defined in the user settings above (the_text), but there is a special case for settings that are of type **"calculated"** -- see below.
			currentSettings = newSettings;
			titleElement.html((_.isUndefined(newSettings.title) ? "" : newSettings.title));
			$(titleElement).append(valueElement);
			currentSettings.unit = currentSettings.unit || ''

			$(theValue).html((self.value || 0) + currentSettings.unit);

		}

		// **onCalculatedValueChanged(settingName, newValue)** (required) : A public function we must implement that will be called when a calculated value changes. Since calculated values can change at any time (like when a datasource is updated) we handle them in a special callback function here.
		self.onCalculatedValueChanged = function (settingName, newValue) {

			// Remember we defined "the_text" up above in our settings.
			if (settingName == "target") {
				self.value = newValue

				var value = newValue


				$(valueElement).html(value + currentSettings.unit);

				//Attempt to break l00ps
				if (value != $(theSlider).val()) {
					$(theSlider).val(value);
				}
			}
			if (settingName == 'default') {
				if (_.isUndefined(self.value)) {
					newValue=parseFloat(newValue)
					self.dataTargets.target(newValue);


					self.value = newValue

					var value = newValue


					$(valueElement).html(value + currentSettings.unit);

					//Attempt to break l00ps
					if (value != $(theSlider).val()) {
						$(theSlider).val(value);
					}
				}
			}
			if (settingName == 'step') {
				self.step = newValue
				$(theSlider).attr('step', self.step);
			}
			if (settingName == "max") {
				if (newValue > self.min) {
					self.max = newValue;
					$(theSlider).attr('max', newValue);
				} else {
					currentSettings.max = self.max; // Keep it unchanged
					freeboard.showDialog($("<div align='center'> Max value cannot be lower than Min value!</div>"), "Warning!", "OK", null, function () { });
				}
			}
			if (settingName == "min") {
				if (newValue < self.max) {
					self.min = newValue;
					$(theSlider).attr('min', newValue);
				} else {
					currentSettings.min = self.min;// Keep it unchanged
					freeboard.showDialog($("<div align='center'> Min value cannot be greater than Max value!</div>"), "Warning!", "OK", null, function () { });
				}
			}
		}


		// **onDispose()** (required) : Same as with datasource plugins.
		self.onDispose = function () {
		}
	}
}());

// ┌────────────────────────────────────────────────────────────────────┐ \\
// │ freeboard-switch-plugin                                            │ \\
// ├────────────────────────────────────────────────────────────────────┤ \\
// │ http://blog.onlinux.fr/dynamic-highcharts-plugin-for-freeboard-io/ │ \\
// ├────────────────────────────────────────────────────────────────────┤ \\
// │ Licensed under the MIT license.                                    │ \\
// ├────────────────────────────────────────────────────────────────────┤ \\
// │ Freeboard widget plugin for Highcharts.                            │ \\
// └────────────────────────────────────────────────────────────────────┘ \\

(function()
{
    //
    // DECLARATIONS
    //
    var SWITCH_ID = 0;
    //
   
    
    freeboard.loadWidgetPlugin({
        type_name: "switch_plugin",
        display_name: "Switch",
        description : "Interactive on-off switch",
        settings: [
            {
                name: "title",
                display_name: "Title",
                type: "text"
            },
            {
                name: "target",
                display_name: "Data Target",
                type: "target",
                description:"Bind state to this datasource"
            },
            {
                name: "default",
                display_name: "Default",
                type: "calculated",
            },
            {
                name: "on_text",
                display_name: "On Text",
                type: "text",
                default_value: 'On'
            },
            {
                name: "off_text",
                display_name: "Off Text",
                type: "text",
                default_value: 'Off'
            },
            {
                name: "sound",
                display_name: "Sound(URL or builtin)",
                type: "text",
                default_value: '',
                options: freeboard.getAvailableSounds
            },


        ],
        newInstance: function (settings, newInstanceCallback) {
            newInstanceCallback(new wswitch(settings));
        }
    });

     freeboard.addStyle ('.floating-box',"display: inline-block; vertical-align: top; width: 78px; background-color: #222;margin-top: 10px; margin-right: 5px;");
     
     freeboard.addStyle ('.round' ,"border-radius: 50%;");
    var wswitch = function (settings) {
        var self = this;    
        var thisWidgetId = "onoffswitch-" + SWITCH_ID++;
        var currentSettings = settings;

        var box1 =  $('<div class="floating-box"></div>');
        var box2 =  $('<div class="floating-box onoffswitch-title">' + settings.title + '</div>');
        
        var onOffSwitch = $('<div class="onoffswitch"><label class="onoffswitch-label" for="'+ thisWidgetId +'"><div class="onoffswitch-inner"><span class="on"></span><span class="off"></span></div><div class="onoffswitch-switch round"></div></label></div>');
        
        
        //onOffSwitch.find("span.on").text("True");
        
        onOffSwitch.prependTo(box1);
        
        self.isOn = false;

        self.rawTargetValue= undefined;
    
        
        function updateState() {
            $('#'+thisWidgetId).prop('checked', self.isOn);
            onOffSwitch.find("span.on").text(self.onText);
            onOffSwitch.find("span.off").text(self.offText);
        }
         

        this.render = function (element) {
           
            $(element).append(box1).append(box2);
             var input = $('<input type="checkbox" name="onoffswitch" class="onoffswitch-checkbox" id="'+ thisWidgetId +'">').prependTo(onOffSwitch).change(function(e)
                {
                    self.isOn =e.target.checked
                    

						//todo Avoid loops, only real user input triggers this
						if (true) {
                            freeboard.playSound(currentSettings.sound)

                            self.dataTargets.target(self.isOn);
                            self.rawTargetValue=self.isOn;
						}
                    
                });
        }

        this.onSettingsChanged = function (newSettings) {
            currentSettings = newSettings;
            box2.html((_.isUndefined(newSettings.title) ? "" : newSettings.title));
            self.onText = newSettings.on_text;
            self.offText = newSettings.off_text;
            updateState();
        }

        this.onCalculatedValueChanged = function (settingName, newValue) {
            
             if (settingName == "target") {
                self.rawTargetValue = newValue

                var value = newValue


                var x = Boolean(value);

                if(x!=self.isOn)
                {
                    self.isOn=x;
                    freeboard.playSound(currentSettings.sound)
                }
            }

            if (settingName == "default") {
                if(_.isUndefined(self.rawTargetValue))
                {
                    self.rawTargetValue = newValue
                    var value = newValue
                    var x = Boolean(value);

                    if(x!=self.isOn)
                    {
                        self.isOn=x;
                    }
                    self.dataTargets.target(x);
                }
            }
            
            updateState();
        }
        
        
        this.onDispose = function () {
        }

        this.getHeight = function () {
            return 1;
        }

        this.onSettingsChanged(settings);
    };

}());

// ┌────────────────────────────────────────────────────────────────────┐ \\
// │ freeboard-textbox-plugin                                            │ \\
// ├────────────────────────────────────────────────────────────────────┤ \\
// │ http://blog.onlinux.fr/                                            │ \\
// ├────────────────────────────────────────────────────────────────────┤ \\
// │ Licensed under the MIT license.                                    │ \\
// ├────────────────────────────────────────────────────────────────────┤ \\
// │ Freeboard widget plugin.                                           │ \\
// └────────────────────────────────────────────────────────────────────┘ \\
(function () {
	//
	// DECLARATIONS
	//
	var LOADING_INDICATOR_DELAY = 1000;
	var SLIDER_ID = 0;

	freeboard.addStyle('.textbox', "border: 2px solid #3d3d3d;background-color: #222;margin: 10px;");
	freeboard.addStyle('.textbox-label', 'margin-left: 10px; margin-top: 10px; text-transform: capitalize;');
	freeboard.addStyle('.myui-textbox-handle', "width: 1.5em !important; height: 1.5em !important; border-radius: 50%; top: -.4em !important; margin-left:-1.0em !important;");
	freeboard.addStyle('.ui-textbox-range', 'background: #F90;');

	// ## A Widget Plugin
	//
	// -------------------
	// ### Widget Definition
	//
	// -------------------
	// **freeboard.loadWidgetPlugin(definition)** tells freeboard that we are giving it a widget plugin. It expects an object with the following:
	freeboard.loadWidgetPlugin({
		// Same stuff here as with datasource plugin.
		"type_name": "textbox_plugin",
		"display_name": "Text Box",
		"description": "Interactive Textbox Plugin with 2-way data binding.",
		// **external_scripts** : Any external scripts that should be loaded before the plugin instance is created.

		// **fill_size** : If this is set to true, the widget will fill be allowed to fill the entire space given it, otherwise it will contain an automatic padding of around 10 pixels around it.
		"fill_size": true,
		"settings": [
			{
				"name": "title",
				"display_name": "Title",
				"type": "text",
				"default_value": ""
			},

			{
				"name": "tooltip",
				"display_name": "Tooltip hint",
				"type": "text",
				"default_value": ""
			},
			{
				"name": "pattern",
				"display_name": "Validation Regex",
				"type": "text",
				"default_value": ".*"
			},
			{
				"name": "placeholder",
				"display_name": "Placeholder text",
				"type": "calculated",
				"default_value": ""
			},
			{
				"name": "mode",
				"display_name": "Mode",
				"type": "option",
				"options": [
					{
						"name": "Real Time",
						"value": "input"
					},
					{
						"name": "When element loses focus",
						"value": "change"
					}
				]
			},
			{
				name: "target",
				display_name: "Data target when value changes. ",
				description: 'Value pushed will be the text',
				type: "target"
			},
			{
				name: "default",
				display_name: "Default Value",
				type: "calculated"
			}
		],
		// Same as with datasource plugin, but there is no updateCallback parameter in this case.
		newInstance: function (settings, newInstanceCallback) {
			newInstanceCallback(new textbox(settings));
		}
	});


	// ### Widget Implementation
	//
	// -------------------
	// Here we implement the actual widget plugin. We pass in the settings;
	var textbox = function (settings) {
		var self = this;
		self.currentSettings = settings;

		var thisWidgetId = "textbox-" + SLIDER_ID++;
		var thisWidgetContainer = $('<div class="textbox-widget textbox-label" id="__' + thisWidgetId + '"></div>');


		var titleElement = $('<h2 class="section-title textbox-label"></h2>');
		var inputElement = $('<input/>', { type: 'text', pattern: settings.pattern, id: thisWidgetId, name: thisWidgetId }).css('width', '90%');
		var theTextbox = '#' + thisWidgetId;
		var theValue = '#' + "value-" + thisWidgetId;

		//console.log( "theTextbox ", theTextbox);

		titleElement.html(self.currentSettings.title);
		self.value = undefined

		var requestChange = false;
		var target;

		// Here we create an element to hold the text we're going to display. We're going to set the value displayed in it below.

		// **render(containerElement)** (required) : A public function we must implement that will be called when freeboard wants us to render the contents of our widget. The container element is the DIV that will surround the widget.
		self.render = function (containerElement) {
			$(containerElement)
				.append(thisWidgetContainer);
			titleElement.appendTo(thisWidgetContainer);
			inputElement.appendTo(thisWidgetContainer);

			$(theTextbox).attr('placeholder', self.currentSettings.placeholder);
			$(theTextbox).attr('title', self.currentSettings.tooltip);
			$(theTextbox).attr('pattern', self.currentSettings.pattern);


			$(theValue).html((self.value || '') + self.currentSettings.unit);

			$(theTextbox).on('change',
				async function (e) {
					//Avoid loops, only real user input triggers this
					if (_.isUndefined(self.currentSettings.target)) { } {
						try {
							//We can refreshed in pull mode here
							await self.dataTargets.target(e.target.value);
						}
						catch (e) {
							freeboard.showDialog(e, "Bad data target", "OK")
							freeboard.playSound('error');
						}
					}
				});

			$(theTextbox).on('input',
				function (e) {
					self.value = e.target.value;
					$(theValue).html(e.target.value + self.currentSettings.unit);

					if (self.currentSettings.mode == 'change') {
						//This mode does not affect anything till the user releases the mouse
						return;
					}
					if (_.isUndefined(self.currentSettings.target)) { }
					else {
						//todo Avoid loops, only real user input triggers this
						if (true) {
							self.dataTargets.target(e.target.value);
						}
					}
				}
			);
			$(theTextbox).removeClass("ui-widget-content");
		}

		// **getHeight()** (required) : A public function we must implement that will be called when freeboard wants to know how big we expect to be when we render, and returns a height. This function will be called any time a user updates their settings (including the first time they create the widget).
		//
		// Note here that the height is not in pixels, but in blocks. A block in freeboard is currently defined as a rectangle that is fixed at 300 pixels wide and around 45 pixels multiplied by the value you return here.
		//
		// Blocks of different sizes may be supported in the future.
		self.getHeight = function () {
			if (self.currentSettings.size == "big") {
				return 2;
			}
			else {
				return 1;
			}
		}

		// **onSettingsChanged(newSettings)** (required) : A public function we must implement that will be called when a user makes a change to the settings.
		self.onSettingsChanged = function (newSettings) {
			// Normally we'd update our text element with the value we defined in the user settings above (the_text), but there is a special case for settings that are of type **"calculated"** -- see below.
			self.currentSettings = newSettings;
			titleElement.html((_.isUndefined(newSettings.title) ? "" : newSettings.title));
			self.currentSettings.unit = self.currentSettings.unit || ''
			$(theTextbox).attr('pattern', newSettings.pattern);
			$(theTextbox).attr('placeholder', newSettings.placeholder);
			$(theTextbox).attr('tooltip', newSettings.placeholder);



		}

		// **onCalculatedValueChanged(settingName, newValue)** (required) : A public function we must implement that will be called when a calculated value changes. Since calculated values can change at any time (like when a datasource is updated) we handle them in a special callback function here.
		self.onCalculatedValueChanged = function (settingName, newValue) {

			// Remember we defined "the_text" up above in our settings.
			if (settingName == "target") {
				self.value = newValue;

				var value = newValue;



				//Attempt to break l00ps
				if (value != $(theTextbox).val()) {
					$(theTextbox).val(value);
				}
			}

			// Remember we defined "the_text" up above in our settings.
			if (settingName == "default") {
				if (_.isUndefined(self.value)) {
					self.value = newValue;

					var value = newValue;



					//Attempt to break l00ps
					if (value != $(theTextbox).val()) {
						$(theTextbox).val(value);
					}
					self.dataTargets.target(newValue);
				}
			}

			if (settingName == 'placeholder') {
				$(theTextbox).attr('placeholder', newValue);
			}

		}


		// **onDispose()** (required) : Same as with datasource plugins.
		self.onDispose = function () {
		}
	}
}());
