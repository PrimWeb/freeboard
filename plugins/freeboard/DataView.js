// ┌────────────────────────────────────────────────────────────────────┐ \\
// │ freeboard-datagrid-plugin                                            │ \\
// ├────────────────────────────────────────────────────────────────────┤ \\
// │ http://blog.onlinux.fr/                                            │ \\
// ├────────────────────────────────────────────────────────────────────┤ \\
// │ Licensed under the MIT license.                                    │ \\
// ├────────────────────────────────────────────────────────────────────┤ \\
// │ Freeboard widget plugin.                                           │ \\
// └────────────────────────────────────────────────────────────────────┘ \\
function uuidv4() {
	return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
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
				"display_name": "Data backend(JS Grid CSontroller)",
				"type": "calculated",
				"default_value": ""
            },
			
			
			{
				"name": "data",
				"display_name": "Direct data array",
				'description':"",
				"type": "target",
				"default_value": ""
            },
            {
				"name": "columns",
                "display_name": "Display Columns",
				"type": "array",

				"settings"    : [
					{
						"name"        : "name",
						"display_name": "Data Field(match key on row)",
						"type"        : "text",
					},
					{
						"name":"type",
						"display_name": "Type",
						"type": 'option',
						'options':[
						{
							'name': 'Text',
							'value': 'text'
						},
						{
							'name': 'Long Textarea',
							'value': 'textarea'
						},
						{
							'name': 'Number',
							'value': 'number'
						},
						{
							'name': 'Checkbox',
							'value': 'checkbox'
						},
						{
							'name': 'Add/Edit/Del Controls',
							'value': 'control'
						}
					]
					}
				],
			},
		
			{
				name: "selectionTarget",
				display_name: "Data target when selection changes. ",
                description:'Value pushed will be a value, timestamp pair. Value will be the entire selected record object',
				type: "target"
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

		if(settings.backend && settings.data)
		{
			throw new Error("Cannot use both the backend and the data options at the same time")
		}
        var self = this;
        


		self.currentSettings = settings;

		self.data = settings['data'] || [] 

		var thisWidgetId = "datagrid-" + SLIDER_ID++;
		var thisWidgetContainer = $('<div class="datagrid-widget datagrid-label" id="__' + thisWidgetId + '"></div>');


		var titleElement = $('<h2 class="section-title datagrid-label"></h2>');

		var gridBox = $('<div>',{id:thisWidgetId}).css('width', '90%');
		var theGridbox = '#' + thisWidgetId;
		var theValue = '#' + "value-" + thisWidgetId;

		self.arrayController =
		{
			insertItem: function(f){
				self.data.push(f)
			},
			deleteItem: function(d){
				self.data = _.without(self.data,d)
			},
			deleteItem: function(d){
				var x = 0
				for(i in self.data)
				{
					if(i._uuid==d._uuid)
					{
						self.data = _.without(self.data,i)
					}
				}
				self.data.push(f)
				self.dataTargets['data'](self.data)
				
			},
			insertItem: function(f){
				f._uuid = f._uuid || uuidv4()
				f._name = f._name || f._uuid
				f._time = f._time || parseInt(Date.now()*1000)
				f._arrival = f._arrival || f._time


				self.data.push(f)
				self.dataTargets['data'](self.data)
			},
			loadData: function(filter)
			{
				var q = nSQL(self.data||[]).query('select')
				for(i in filter)
				{
					if(filter[i] && !(['sortField','sortOrder','pageIndex','pageSize'].indexOf(i)>-1))
					{
						q=q.where(['LOWER('+i+')','=',String(filter[i]).toLowerCase()])
					}
				}
				if(filter.sortOrder)
				{
				q=q.orderBy([filter.sortField+' '+filter.sortOrder.toUpperCase()])
				}
				q=q.limit(filter.pageSize).offset((filter.pageIndex-1)*filter.pageSize)

				var f = async function ex()
				{
					var d = await q.exec()
					//Someday this should show the right page count after filtering?
					return {data:d, itemsCount:self.data.length}
				}
				return f()
			}

		}

        self.refreshGrid= function(x){
			if(x==0)
			{
				x = self.data
			}
			
			self.data=x;

			//Normalize by adding the special DB properties.
			for (f in self.data)
			{
				f._uuid = f._uuid || uuidv4()
				f._name = f._name || f._uuid
				f._time = f._time || parseInt(Date.now()*1000)
				f._arrival = f._arrival || f._time
			}



			$(theGridbox).jsGrid('destroy');
			
			var writebackData = function()
			{
				self.dataTargets['data']([self.data, Date.now()*1000]);
			}
            $(theGridbox).jsGrid({
                width: "95%",
                height: "250px",
         
                inserting: true,
                editing: true,
                sorting: true,
				paging: true,
				pageLoading: true,
				filtering:true,
				onItemDeleted: writebackData,
				onItemUpdated: writebackData,
				onItemInserted: writebackData,


         
                controller: self.currentSettings.backend || self.arrayController,
         
                fields: self.currentSettings.columns||[]
                
            });
        }
            


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
			if(settings.backend && settings.data)
			{
				throw new Error("Cannot use both the backend and the data options at the same time")
			}

			// Normally we'd update our text element with the value we defined in the user settings above (the_text), but there is a special case for settings that are of type **"calculated"** -- see below.
			self.currentSettings = newSettings;
			titleElement.html((_.isUndefined(newSettings.title) ? "" : newSettings.title));
			self.currentSettings.unit = self.currentSettings.unit || ''
            $(theGridbox).attr('pattern', newSettings.pattern);
            $(theGridbox).attr('placeholder', newSettings.placeholder);
            $(theGridbox).attr('tooltip', newSettings.placeholder);

		}

		// **onCalculatedValueChanged(settingName, newValue)** (required) : A public function we must implement that will be called when a calculated value changes. Since calculated values can change at any time (like when a datasource is updated) we handle them in a special callback function here.
		self.onCalculatedValueChanged = function (settingName, newValue) {

			
			if(settingName=='columns')
			{
                self.refreshGrid(0)
			}

			if(settingName=='data')
			{
				//Value, timestamp pair
				if (newValue)
				{
					newValue=newValue[0]
				}
                self.refreshGrid(newValue||[])
			}
			
		}


		// **onDispose()** (required) : Same as with datasource plugins.
		self.onDispose = function () {
            $(theGridbox).jsGrid('destroy');
		}
	}
}());
