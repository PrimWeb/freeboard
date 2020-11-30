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
		"display_name": " In-browser DrayerDB database",
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
				throw new Error("You can't set anything here. Use loadData({}) to get all fuzzy matching records, and insertRecord(r) to set a record.");
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
