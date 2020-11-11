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
		"display_name": "In-browser database",
		// **description** : A description of the plugin. This description will be displayed when the plugin is selected or within search results (in the future). The description may contain HTML if needed.
		"description": "DB for storing JSON records.  The entire datasource may be used as a controller for the table view.  EXPERIMENTAL RAM ONLY DB",
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


		self.makeDB = async function () {
			self.db = await nSQL().createDatabase({
				id: self.settings.dbname,
				mode: "TEMP", // pass in "PERM" to switch to persistent storage mode!
				tables: [
					{
						name: "records",
						model:
						{
							"id:uuid": {pk: true},
							"time:int":{},
							"arrival:int":{},
							"type:string":{},
							"name:string":{},
						}
					}
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
				var x = nSQL('records').query('select');

				//Everything in the DB must match
				for (i in filter) {
					if(filter[i])
					{
						if (((i != 'sortField') && (i != "sortOrder") && (i != "pageSize") && (i != "pageIndex") && (i != "pageLoading"))) {
							x = x.where([i, '=', filter[i]]);
						}
					}
				}


				if (filter.sortOrder) {
					x = x.orderBy([filter.sortField + ' ' + filter.sortOrder.toUpperCase()])
				}

				x = x.limit(filter.pageSize).offset((filter.pageIndex -1) * filter.pageSize)


				var d = await x.exec()
				
			
				//Someday this should show the right page count after filtering?
				return { data: d, itemsCount: (filter.pageIndex + 1) * filter.pageSize }
					
				},

			insertItem: async function (record) {
				try {
					var r = {}
					Object.assign(r, record);
					r['time'] = r['time'] || Date.now() * 1000;
					r['arrival'] = r['arrival'] || r['time']
					r['id'] = r['id'] || freeboard.genUUID();
					r['name'] = r['name'] || r['id']

					nSQL().useDatabase(self.settings.dbname);
					await nSQL('records').query('delete').where(["id", '=', record.id]).exec()
					var x =nSQL('records').query('upsert', [r]).exec()
					await x
					updateCallback(self.proxy);
				}
				catch (e) {
					console.log(e);
					throw e;
				}
			},
			deleteItem: async function (record) {
				nSQL().useDatabase(self.settings.dbname);
				var x = nSQL('records').query('delete').where(['id', '=', record.id]).exec()
				await x
				updateCallback(self.proxy);
				

				return x
			}

		}
		self.data.updateItem = self.data.insertItem
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
