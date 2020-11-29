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
                    "type"         : "json",
                    // **default_value** : A default value for this setting.
                    "default_value": {},
            
                    // **description** : Text that will be displayed below the setting to give the user any extra information.
                    "description"  : "Default data when the object is created",
                    // **required** : If set to true, the field will be required to be filled in by the user. Defaults to false if not specified.
					"required" : true,
					schema:{}
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
					currentSettings.data = obj
					freeboard.setDatasourceSettings(currentSettings.name, obj)
				}
				return true;
			}

		}
	
		if(_.isObject(currentSettings.data))
		{
		self.data=currentSettings.data || {}
		}
		else
		{
			self.data={}
		}
		
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
