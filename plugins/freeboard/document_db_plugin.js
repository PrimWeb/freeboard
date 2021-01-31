// # Building a Freeboard Plugin
//
// A freeboard plugin is simply a javascript file that is loaded into a web page after the main freeboard.js file is loaded.
//
// Let's get started with an example of a datasource plugin and a widget plugin.
//
// -------------------



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
		"display_name": " In-browser DrayerDB database(alpha)",
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
				"default_value": "",
				"description": "If true, data is saved to the user's browser",

			},

			{
				// **name** (required) : The name of the setting. This value will be used in your code to retrieve the value specified by the user. This should follow naming conventions for javascript variable and function declarations.
				"name": "syncURL",
				// **display_name** : The pretty name that will be shown to the user when they adjust this setting.
				"display_name": "DrayerDB API Sync URL",
				// **type** (required) : The type of input expected for this setting. "text" will display a single text box input. Examples of other types will follow in this documentation.
				"type": "text",
				// **default_value** : A default value for this setting.
				"description": "A database server is not required to use this in-browser. You can add one later of change it at any time without losing anything.",

				
			},

			{
					// **name** (required) : The name of the setting. This value will be used in your code to retrieve the value specified by the user. This should follow naming conventions for javascript variable and function declarations.
					"name": "syncKey",
					// **display_name** : The pretty name that will be shown to the user when they adjust this setting.
					"display_name": "API Sync Key",
					// **type** (required) : The type of input expected for this setting. "text" will display a single text box input. Examples of other types will follow in this documentation.
					"type": "text",
					// **default_value** : A default value for this setting.
					"default_value": "",
					"description": "This key is required to read records from the sync database"
			},
	
		    {
				// **name** (required) : The name of the setting. This value will be used in your code to retrieve the value specified by the user. This should follow naming conventions for javascript variable and function declarations.
				"name": "writePassword",
				// **display_name** : The pretty name that will be shown to the user when they adjust this setting.
				"display_name": "API Write Password",
				// **type** (required) : The type of input expected for this setting. "text" will display a single text box input. Examples of other types will follow in this documentation.
				"type": "text",
				// **default_value** : A default value for this setting.
				"default_value": "",
				"description": "This separate key is required to write records to the database."
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
                                            //Second param is true, don't fire callbacks till we are done with the full set.
											i.db.insertDocument(r[0],true)
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

	
		
		self.statusCallback = function(x)
		{
			self.data.connected=x
			try{
				updateCallback(self.proxy)
			}
			catch(e)
			{
				console.log(e)
			}
		}

		self.makeDB = async function () {
			self.db = new DrayerDatabaseConnection({perm:settings.perm, dbname:settings.dbname,syncKey:settings.syncKey, writePassword:settings.writePassword})
			self.db.onChangeset=function(){updateCallback(self.proxy)}
			self.db.statusCallback=self.statusCallback
			if(settings.syncURL)
			{
			self.db.connect(settings.syncURL)
			}
			await self.db.dbSuccess

		}

		// Good idea to create a variable to hold on to our settings, because they might change in the future. See below.
		var currentSettings = settings;

		self.handler = {
			set: function (obj, prop, val) {
				throw new Error("You can't set anything here. Use loadData({}) to get all fuzzy matching records, and insertDocument(r) to set a record.  Insert a record with type=__null__ to delete");
			}

		}


		self.data = {
			connected: false,

			loadData: async function (filter) {
				return self.db.loadData(filter);
			},

			insertItem: async function (record) {
				await self.db.insertDocument(record)
			},
			updateItem: async function (record) {
				await self.db.insertDocument(record)
			},

			deleteItem: async function (record) {
				await self.db.insertDocument({id=record.id, type="__null__"})
			}
		}

		self.proxy = new Proxy(self.data, self.handler)


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

			if(currentSettings.dbname != newSettings.dbname)
			{
				throw error("Cannot change DB name. Delete and re-create this datasource to do so.")
			}

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
