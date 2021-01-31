function FreeboardModel(datasourcePlugins, widgetPlugins, freeboardUI) {
	var self = this;

	var SERIALIZATION_VERSION = 1;

	this.version = 0;
	this.isEditing = ko.observable(false);
	this.currentPageName = ko.observable("default");
	this.pagesDataObservable = ko.observable({});

	//Tracks any unsaved items that might prevent leaving the page.
	this.unsaved = {}

	//Where we store all loadable panes, not just the active one.
	this.pagesData = {}
	self.pagesDataObservable(self.pagesData)
	this.allow_edit = ko.observable(false);
	this.allow_edit.subscribe(function (newValue) {
		if (newValue) {
			$("#main-header").show();
		}
		else {
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
		set: function (obj, prop, value) {
			throw new Error("You cannot directly overwrite a datasource here. Try assigning to one of the properties of the source instead")
		}
	};

	self.protectedDataSourceData = new Proxy(self.datasourceData, dataSourceProtectionHandler)

	this.processDatasourceUpdate = function (datasourceModel, newData) {
		//TODO should we actually iterate everything on every change?
		var datasourceName = datasourceModel.name();

		self.datasourceData[datasourceName] = newData;

		_.each(self.panes(), function (pane) {
			_.each(pane.widgets(), function (widget) {
				widget.processDatasourceUpdate(datasourceName);
			});
		});
	}

	this._datasourceTypes = ko.observable();
	this.datasourceTypes = ko.computed({
		read: function () {
			self._datasourceTypes();

			var returnTypes = [];

			_.each(datasourcePlugins, function (datasourcePluginType) {
				var typeName = datasourcePluginType.type_name;
				var displayName = typeName;

				if (!_.isUndefined(datasourcePluginType.display_name)) {
					displayName = datasourcePluginType.display_name;
				}

				returnTypes.push({
					name: typeName,
					display_name: displayName
				});
			});

			return returnTypes;
		}
	});

	this._widgetTypes = ko.observable();
	this.widgetTypes = ko.computed({
		read: function () {
			self._widgetTypes();

			var returnTypes = [];

			_.each(widgetPlugins, function (widgetPluginType) {
				var typeName = widgetPluginType.type_name;
				var displayName = typeName;

				if (!_.isUndefined(widgetPluginType.display_name)) {
					displayName = widgetPluginType.display_name;
				}

				returnTypes.push({
					name: typeName,
					display_name: displayName
				});
			});

			return returnTypes;
		}
	});

	this.addPluginSource = function (pluginSource) {
		if (pluginSource && self.plugins.indexOf(pluginSource) == -1) {
			self.plugins.push(pluginSource);
		}
	}

	this.globalSettings = {}
	this.globalSettingsDefaults = { theme: {} }
	Object.assign(this.globalSettings, this.globalSettingsDefaults)


	this.globalSettingsHandlers = {}


	//Swap out in the sense of push the data into the cold storage.
	//We need ot do this before we can load a new pane
	this.serializecurrentPage = function () {
		var panes = [];

		_.each(self.panes(), function (pane) {
			panes.push(pane.serialize());
		});
		var n = self.currentPageName()
		//Time to update the panes data, it could have changed while it was the active pane
		self.pagesData[n] = { 'contents': panes, name: n }
		self.pagesDataObservable(self.pagesData)
	}


	this.serialize = function () {


		var datasources = [];


		_.each(self.datasources(), function (datasource) {
			datasources.push(datasource.serialize());
		});

		self.serializecurrentPage()


		return {
			version: SERIALIZATION_VERSION,
			header_image: self.header_image(),
			allow_edit: self.allow_edit(),
			plugins: self.plugins(),
			pages: self.pagesData,
			datasources: datasources,
			columns: freeboardUI.getUserColumns(),
			globalSettings: self.globalSettings
		};
	}

	this.setGlobalSettings = function (d) {
		Object.assign(self.globalSettings, d)
		for (var i in self.globalSettingsHandlers) {
			try{
			self.globalSettingsHandlers[i](self.globalSettings)
			}
			catch(e){
				console.log(self.globalSettingsHandlers[i])
				console.error(e)
			}
		}
	}



	this.globalSettingsHandlers['css'] = function (d) {
		for (i in d.theme) {
			var x = d.theme[i]

			//Wrap URLs in the URL tag
			if (i.includes('-image')) {
				if (x) {
					x = 'url(' + x + ')'
				}

			}
			document.body.style.setProperty(i, x)
		}

		d.imageData = d.imageData || {}

		for (i in d.imageData) {
			var x = d.imageData[i]

			if (x) {
				x = 'url(' + x + ')'
			}

			document.body.style.setProperty(i, x)
		}

		if (d.theme['--logo-text']) {
			$("#board-logo").html(d.theme['--logo-text'])
		}

		if (self.sparticles) {
			try {
				self.sparticles.destroy()
			}
			catch (e) {

				console.error(e)
			}
			self.sparticles = null
		}

		if (d.theme['background-particles']) {
			var particles = _.clone(d.theme['background-particles'])
			particles.count = particles.count || 0
			particles.count
			if (particles.count) {
				let myElement = document.getElementById("bg_particle_fx")
				try{
					self.sparticles = new Sparticles(myElement, particles);
				}
				catch(e){
					self.sparticles=null
					console.error(e)
					freeboard.showDialog(outer, "Bad particle FX settings", "OK")
				}
			}
		}
		setTimeout(function () { freeboardUI.processResize(true) }, 30);
	}

	this.deserialize = async function (object, finishedCallback) {
		self.clearDashboard();

		async function finishLoad() {
			freeboardUI.setUserColumns(object.columns);

			if (!_.isUndefined(object.allow_edit)) {
				self.allow_edit(object.allow_edit);
			}
			else {
				self.allow_edit(true);
			}
			self.version = object.version || 0;
			self.header_image(object.header_image);


			_.each(object.datasources, async function (datasourceConfig) {
				var datasource = new DatasourceModel(self, datasourcePlugins);
				//Deserialize can be an async function if it wants to be.
				await Promise.resolve(datasource.deserialize(datasourceConfig));
				self.addDatasource(datasource);
			});


			//Legacy single page model
			if (object.panes) {
				await self.setPage({ 'contents': object.panes, name: 'default' })
				self.pagesData = { 'default': { 'contents': object.panes, name: 'default' } }
			}
			else {
				Object.assign(self.pagesData, object.pages)
				await self.setPage(object.pages['default'])

			}
			self.pagesDataObservable(self.pagesData)

			if (self.allow_edit() && self.panes().length == 0) {
				self.setEditing(true);
			}

			if (_.isFunction(finishedCallback)) {
				await Promise.resolve(finishedCallback());
			}

			for (var prop in self.globalSettings) {
				delete self.globalSettings[prop];
			}
			Object.assign(self.globalSettings, self.globalSettingsDefaults)


			self.setGlobalSettings(object.globalSettings || {})



		}

		// This could have been self.plugins(object.plugins), but for some weird reason head.js was causing a function to be added to the list of plugins.
		_.each(object.plugins, function (plugin) {
			self.addPluginSource(plugin);
		});

		// Load any plugins referenced in this definition
		if (_.isArray(object.plugins) && object.plugins.length > 0) {
			head.js(object.plugins, async function () {
				await finishLoad();
			});
		}
		else {
			await finishLoad();
		}
	}

	this.gotoPage = async function (pageName) {
		if (!pageName) {
			return
		}

		if (!_.isString(pageName)) {
			//Support jumping to an entire page object
			if (pageName.name) {
				pageName = pageName.name
				if (!self.pagesData[pageName]) {
					throw new Error("Can't currently jump to unregistered page")
				}
			}
			else {
				return
			}
		}

		if (self.pagesData[pageName]) {
			await self.setPage(self.pagesData[pageName])
		}
		else {
			//Make a new empty page
			await self.setPage({ name: pageName, contents: [] })
			//Make it show in listings right away
			self.serializecurrentPage()
		}

	}

	this.renamePage = async function (pageName) {
		if (!pageName) {
			return
		}
		var p = self.pagesData[self.currentPageName()]
		p.name = pageName

		delete self.pagesData[self.currentPageName()]
		self.pagesData[pageName] = p
		self.pagesDataObservable(self.pagesData)
		self.currentPageName(pageName)

		await self.setPage(p)
	}

	this.deletePage = async function (pageName) {
		if (!pageName) {
			return
		}
		if (self.currentPageName() == pageName) {
			await self.gotoPage("default")
		}

		delete self.pagesData[pageName]
		self.pagesDataObservable(self.pagesData)
	}

	this.duplicatePage = async function (pageName) {
		if (!pageName) {
			return
		}
		if (self.pagesData[pageName]) {
			throw Error("Page exists!")
		}
		//Handle nonexistant current page
		var p = self.pagesData[self.currentPageName()] || { name: pageName }
		p = _.clone(p)
		p.name = pageName
		self.pagesData[pageName] = p
		self.pagesDataObservable(self.pagesData)
		await self.setPage(p)
	}

	this.setPage = async function (page) {

		//If the page data could have changed, we must serialize.
		if (self.hasBeenEditingSincePageFlush) {
			//Save any changes now that we are going to a new page
			self.serializecurrentPage()
			self.hasBeenEditingSincePageFlush = false
		}
		if (self.isEditing()) {
			self.hasBeenEditingSincePageFlush = true
		}

		var contents = page.contents || []
		self.currentPageName(page.name || String(freeboard.genUUID()))
		page.name = self.currentPageName()


		_.each(self.panes(), function (pane) {
			pane.dispose();
		});

		self.panes.removeAll()
		$(freeboard._gridRootElement).html('').append("<ul></ul>");

		var sortedPanes = _.sortBy(contents, function (pane) {
			return freeboardUI.getPositionForScreenSize(pane).row;
		});

		_.each(sortedPanes, function (paneConfig) {
			var pane = new PaneModel(self, widgetPlugins);
			pane.deserialize(paneConfig);
			self.panes.push(pane);
		});

		//Do after render and all, but wait for it
		await async function () { freeboardUI.processResize(true) }()
		const event = new CustomEvent('fbPageLoaded', { detail: { name: page.name } })
		document.dispatchEvent(event)
	}

	this.clearDashboard = function () {
		freeboardUI.removeAllPanes();

		for (var member in self.pagesData) { delete self.pagesData[member] };

		self.pagesDataObservable(self.pagesData)
		_.each(self.datasources(), function (datasource) {
			datasource.dispose();
		});

		_.each(self.panes(), function (pane) {
			pane.dispose();
		});

		self.plugins.removeAll();
		self.datasources.removeAll();
		self.panes.removeAll();
		//Needed to prevent 
		//https://github.com/ducksboard/gridster.js/issues/271
		//during rapid page switching
		$(freeboard._gridRootElement).html('').append("<ul></ul>");


	}

	this.loadDashboard = function (dashboardData, callback) {
		freeboardUI.showLoadingIndicator(true);
		self.deserialize(dashboardData, function () {
			freeboardUI.showLoadingIndicator(false);

			if (_.isFunction(callback)) {
				callback();
			}

			freeboard.emit("dashboard_loaded");
		});
	}

	this.loadDashboardFromLocalFile = function () {
		// Check for the various File API support.
		if (window.File && window.FileReader && window.FileList && window.Blob) {
			var input = document.createElement('input');
			input.type = "file";
			$(input).on("change", function (event) {
				var files = event.target.files;

				if (files && files.length > 0) {
					var file = files[0];
					var reader = new FileReader();

					reader.addEventListener("load", function (fileReaderEvent) {

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
		else {
			alert('Unable to load a file in this browser.');
		}
	}

	this.downloadDashboardClicked = function () {
		var target = $(event.currentTarget);
		var siblingsShown = target.data('siblings-shown') || false;
		if (!siblingsShown) {
			$(event.currentTarget).siblings('label').fadeIn('slow');
		} else {
			$(event.currentTarget).siblings('label').fadeOut('slow');
		}
		target.data('siblings-shown', !siblingsShown);
	}

	this.downloadDashboard = function (_thisref, event) {
		var pretty = $(event.currentTarget).data('pretty');
		var contentType = 'application/octet-stream';
		var a = document.createElement('a');
		if (pretty) {
			var blob = new Blob([JSON.stringify(self.serialize(), null, '\t')], { 'type': contentType });
		} else {
			var blob = new Blob([JSON.stringify(self.serialize())], { 'type': contentType });
		}
		document.body.appendChild(a);
		a.href = window.URL.createObjectURL(blob);
		a.download = "dashboard.json";
		a.target = "_self";
		a.click();
		freeboard.unsaved["Board Definition"] = false
	}

	this.addDatasource = function (datasource) {
		self.datasources.push(datasource);
	}

	this.deleteDatasource = function (datasource) {
		delete self.datasourceData[datasource.name()];
		datasource.dispose();
		self.datasources.remove(datasource);
	}

	this.createPane = function () {
		var newPane = new PaneModel(self, widgetPlugins);
		self.addPane(newPane);
	}

	this.addGridColumnLeft = function () {
		freeboardUI.addGridColumnLeft();
	}

	this.addGridColumnRight = function () {
		freeboardUI.addGridColumnRight();
	}

	this.subGridColumnLeft = function () {
		freeboardUI.subGridColumnLeft();
	}

	this.subGridColumnRight = function () {
		freeboardUI.subGridColumnRight();
	}

	this.addPane = function (pane) {
		self.panes.push(pane);
	}

	this.deletePane = function (pane) {
		pane.dispose();
		self.panes.remove(pane);
	}

	this.deleteWidget = function (widget) {
		ko.utils.arrayForEach(self.panes(), function (pane) {
			pane.widgets.remove(widget);
		});

		widget.dispose();
	}

	this.setEditing = function (editing, animate) {
		// Don't allow editing if it's not allowed
		if (!self.allow_edit() && editing) {
			return;
		}
		self.hasBeenEditingSincePageFlush = true

		self.isEditing(editing);

		if (_.isUndefined(animate)) {
			animate = true;
		}

		var animateLength = (animate) ? 250 : 0;
		var barHeight = $("#admin-bar").outerHeight();

		if (!editing) {
			$("#toggle-header-icon").addClass("icon-wrench").removeClass("icon-chevron-up");
			$(".gridster .gs_w").css({ cursor: "default" });
			$("#main-header").animate({ "top": "-" + barHeight + "px" }, animateLength);
			$("#board-content").animate({ "top": "20" }, animateLength);
			$("#main-header").data().shown = false;
			$(".sub-section").unbind();
			freeboardUI.disableGrid();
		}
		else {
			$("#toggle-header-icon").addClass("icon-chevron-up").removeClass("icon-wrench");
			$(".gridster .gs_w").css({ cursor: "pointer" });
			$("#main-header").animate({ "top": "0px" }, animateLength);
			$("#board-content").animate({ "top": (barHeight + 20) + "px" }, animateLength);
			$("#main-header").data().shown = true;
			freeboardUI.attachWidgetEditIcons($(".sub-section"));
			freeboardUI.enableGrid();
		}

		freeboardUI.showPaneEditIcons(editing, animate);
	}


	this.toggleEditing = function () {
		var editing = !self.isEditing();
		self.setEditing(editing);
	}
}
