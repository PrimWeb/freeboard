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
		"type_name"   : "core_board_plugin",
		// **display_name** : The pretty name that will be used for display purposes for this plugin. If the name is not defined, type_name will be used instead.
		"display_name": " Basic Info",
        // **description** : A description of the plugin. This description will be displayed when the plugin is selected or within search results (in the future). The description may contain HTML if needed.
        "description" : "Provides access to basic things like the currentPage",
		// **external_scripts** : Any external scripts that should be loaded before the plugin instance is created.
	
		// **settings** : An array of settings that will be displayed for this plugin when the user adds it.
		"settings"    : [
  
			
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
            
                    if (prop =='currentPage')
                    {
                            freeboard.gotoPage(val);
                            return
                    }
					throw new Error("Cannot change this property. It is readonly.")
            }
        }
        self.data={}
        self.proxy = new Proxy(self.data, self.handler)
        

        function makePDView(p)
        {
            var x = []
            for (var i in p){
                x.push({name: p[i].name })
            }
            var handler={
                    set: function(obj,prop,val)
                    {
                        throw new Error("Page view data is read only")
                    }
                }
            return new Proxy(x,handler)
        }

        self.cpUnsub = freeboard.currentPage.subscribe(function(v){
            self.data.currentPage=v
            updateCallback(self.proxy)
        })

        self.pdUnsub = freeboard.pagesData.subscribe(function(v){
            self.data.allPages=makePDView(v)
            updateCallback(self.proxy)
        })

        self.data.currentPage = freeboard.currentPage()
        self.data.allPages = makePDView(freeboard.pagesData())


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
            self.cpUnsub.unsubscribe()
		
		}

	}

}());
