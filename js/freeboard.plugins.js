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
				name: "target",
				display_name: "Data target or JS code when clicked",
                description:'"value" pushed will be a clickCount,timestamp pair.',
				type: "target"
			}
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


		var inputElement = $('<button/>', { type: 'text', pattern:settings.pattern, id: thisWidgetId }).html(settings.html);
		var theButton = '#' + thisWidgetId;

		//console.log( "theButton ", theButton);


		var requestChange = false;
		var target;
        
        self.clickCount = 0;

		// Here we create an element to hold the text we're going to display. We're going to set the value displayed in it below.

		// **render(containerElement)** (required) : A public function we must implement that will be called when freeboard wants us to render the contents of our widget. The container element is the DIV that will surround the widget.
		self.render = function (containerElement) {
			$(containerElement)
				.append(thisWidgetContainer);
			inputElement.appendTo(thisWidgetContainer);

			$(theButton).attr('title', self.currentSettings.tooltip);
			

			//$(theButton).html(self.currentSettings.html);

			$(theButton).on('click',
				function (e) {
					if (_.isUndefined(self.currentSettings.target)) { }
					else {
						//Avoid loops, only real user input triggers this
						if (true) {
                            self.dataTargets.target([self.clickCount,Date.now()/1000]);
                            self.clickCount+=1;
						}
					}
				});
            
			

			$(theButton).removeClass("ui-widget-content");
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
			self.currentSettings.unit = self.currentSettings.unit || ''
            $(theButton).attr('tooltip', newSettings.placeholder);
        }

		

		// **onCalculatedValueChanged(settingName, newValue)** (required) : A public function we must implement that will be called when a calculated value changes. Since calculated values can change at any time (like when a datasource is updated) we handle them in a special callback function here.
		self.onCalculatedValueChanged = function (settingName, newValue) {

			
			if(settingName=='html')
			{
                $(theButton).html(newValue);
			}
			
		}


		// **onDispose()** (required) : Same as with datasource plugins.
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

            jQuery({transitionValue: Number(currentValue), precisionValue: startingPrecision}).animate({transitionValue: Number(newValue), precisionValue: endingPrecision}, {
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
		for(var i=0; i<legend.length; i++) {
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

		var collateValues = function(val, plotIndex) {
			if(!values[plotIndex]) {
				values[plotIndex] = [];
			}
			if (values[plotIndex].length >= SPARKLINE_HISTORY_LENGTH) {
				values[plotIndex].shift();
			}
			values[plotIndex].push(Number(val));

			if(valueMin === undefined || val < valueMin) {
				valueMin = val;
			}
			if(valueMax === undefined || val > valueMax) {
				valueMax = val;
			}
		}

		if(_.isArray(value)) {
			_.each(value, collateValues);
		} else {
			collateValues(value, 0);
		}
		$(element).data().values = values;
		$(element).data().valueMin = valueMin;
		$(element).data().valueMax = valueMax;

		var tooltipHTML = '<span style="color: {{color}}">&#9679;</span> {{y}}';

		var composite = false;
		_.each(values, function(valueArray, valueIndex) {
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
				tooltipFormat: (legend && legend[valueIndex])?tooltipHTML + ' (' + legend[valueIndex] + ')':tooltipHTML
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

		function updateValueSizing()
		{
			if(!_.isUndefined(currentSettings.units) && currentSettings.units != "") // If we're displaying our units
			{
				valueElement.css("max-width", (displayElement.innerWidth() - unitsElement.outerWidth(true)) + "px");
			}
			else
			{
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

			if(newSettings.sparkline)
			{
				sparklineElement.attr("style", null);
			}
			else
			{
				delete sparklineElement.data().values;
				sparklineElement.empty();
				sparklineElement.hide();
			}

			if(shouldDisplayTitle)
			{
				titleElement.html((_.isUndefined(newSettings.title) ? "" : newSettings.title));
				titleElement.attr("style", null);
			}
			else
			{
				titleElement.empty();
				titleElement.hide();
			}

			if(shouldDisplayUnits)
			{
				unitsElement.html((_.isUndefined(newSettings.units) ? "" : newSettings.units));
				unitsElement.attr("style", null);
			}
			else
			{
				unitsElement.empty();
				unitsElement.hide();
			}

			var valueFontSize = 30;

			if(newSettings.size == "big")
			{
				valueFontSize = 75;

				if(newSettings.sparkline)
				{
					valueFontSize = 60;
				}
			}

			valueElement.css({"font-size" : valueFontSize + "px"});

			updateValueSizing();
        }

		this.onSizeChanged = function()
		{
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
                options:function(){return{
                    'lbs':'',
                    'kgs':'',
                    'psi':'',
                    'meters':'',
                    'feet':'',
                    'mm':'',
                    'degC':'',
                    'degF':'',
                }}
            }
        ],
        newInstance: function (settings, newInstanceCallback) {
            newInstanceCallback(new textWidget(settings));
        }
    });

    var gaugeID = 0;
	freeboard.addStyle('.gauge-widget-wrapper', "width: 100%;text-align: center;");
	freeboard.addStyle('.gauge-widget', "width:200px;height:160px;display:inline-block;");

    var gaugeWidget = function (settings) {
        var self = this;

        var thisGaugeID = "gauge-" + gaugeID++;
        var titleElement = $('<h2 class="section-title"></h2>');
        var gaugeElement = $('<div class="gauge-widget" id="' + thisGaugeID + '"></div>');

        var gaugeObject;
        var rendered = false;

        var currentSettings = settings;

        function createGauge() {
            if (!rendered) {
                return;
            }

            gaugeElement.empty();

            gaugeObject = new JustGage({
                id: thisGaugeID,
                value: (_.isUndefined(currentSettings.min_value) ? 0 : currentSettings.min_value),
                min: (_.isUndefined(currentSettings.min_value) ? 0 : currentSettings.min_value),
                max: (_.isUndefined(currentSettings.max_value) ? 0 : currentSettings.max_value),
                label: currentSettings.units,
                showInnerShadow: false,
                valueFontColor: "#d3d4d4"
            });
        }

        this.render = function (element) {
            rendered = true;
            $(element).append(titleElement).append($('<div class="gauge-widget-wrapper"></div>').append(gaugeElement));
            createGauge();
        }

        this.onSettingsChanged = function (newSettings) {
            if (newSettings.min_value != currentSettings.min_value || newSettings.max_value != currentSettings.max_value || newSettings.units != currentSettings.units) {
                currentSettings = newSettings;
                createGauge();
            }
            else {
                currentSettings = newSettings;
            }

            titleElement.html(newSettings.title);
        }

        this.onCalculatedValueChanged = function (settingName, value) {
            if (!_.isUndefined(gaugeObject)) {
                //Handle either "input widget spec" value, timestamp pairs or straight numbers.
				if(typeof(value)=='object')
                {
                    value=value[0]
                }
                gaugeObject.refresh(Number(value));
            }
        }

        this.onDispose = function () {
        }

        this.getHeight = function () {
            return 3;
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

			if(newSettings.include_legend) {
				addSparklineLegend(sparklineLegend,  newSettings.legend.split(","));
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
					legendHeight = Math.floor((legendLength-1) / 4) * 0.5;
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

                    triangle.animate({transform: "r" + newValue + "," + (width / 2) + "," + (height / 2)}, 250, "bounce");
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

    var pictureWidget = function(settings)
    {
        var self = this;
        var widgetElement;
        var timer;
        var imageURL;

        function stopTimer()
        {
            if(timer)
            {
                clearInterval(timer);
                timer = null;
            }
        }

        function updateImage()
        {
            if(widgetElement && imageURL)
            {
                //var cacheBreakerURL = imageURL + (imageURL.indexOf("?") == -1 ? "?" : "&") + Date.now();
                
                //Overriding cache is generally a bad thing if there is polling happening.  If needed, fix your cache settings.
                var cacheBreakerURL = imageURL 
                

                $(widgetElement).css({
                    "background-image" :  "url(" + cacheBreakerURL + ")"
                });
                

            }
        }

        this.render = function(element)
        {
            $(element).css({
                width : "100%",
                height: "100%",
                "background-size" : "cover",
                "background-position" : "center"
            });

            widgetElement = element;
        }

        this.onSettingsChanged = function(newSettings)
        {
            stopTimer();

            if(newSettings.refresh && newSettings.refresh > 0)
            {
                timer = setInterval(updateImage, Number(newSettings.refresh) * 1000);
            }
        }

        this.onCalculatedValueChanged = function(settingName, newValue)
        {
            if(settingName == "src")
            {
                imageURL = newValue;
            }

            updateImage();
        }

        this.onDispose = function()
        {
            stopTimer();
        }

        this.getHeight = function()
        {
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
                "description":"Leave blank if the image doesn't need to be refreshed"
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
        "display_name": "HTML",
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
                    "type"         : "text",
                    // **default_value** : A default value for this setting.
                    "default_value": "={}",
                    "options" : function(){
                        return {"={key: 'value'}":""}
                    },
                    // **description** : Text that will be displayed below the setting to give the user any extra information.
                    "description"  : "Must be a valid JS =expression that returns an object. Whatever it returns will be the default data.",
                    // **required** : If set to true, the field will be required to be filled in by the user. Defaults to false if not specified.
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
				obj[prop]=val;
				updateCallback(self.proxy)
			}

        }
        self.data=freeboard.eval(settings['data'])
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
            self.data =  freeboard.eval(newSettings['data']);

            updateCallback(self.proxy)
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
                description:'Value pushed will be a value, timestamp pair.',
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

		self.value = currentSettings.value || 0;

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


			$(theValue).html(self.value + currentSettings.unit);

			$(theSlider).on('change',
				function (e) {
					if (_.isUndefined(currentSettings.target)) { }
					else {
						//Avoid loops, only real user input triggers this
						if (true) {
							self.dataTargets.target([e.target.value, Date.now()/1000]);
						}
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
					if (_.isUndefined(currentSettings.target)) { }
					else {
						//todo Avoid loops, only real user input triggers this
						if (true) {
							self.dataTargets.target([parseFloat(e.target.value), Date.now()/1000]);
						}
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

			$(theValue).html(self.value + currentSettings.unit);

		}

		// **onCalculatedValueChanged(settingName, newValue)** (required) : A public function we must implement that will be called when a calculated value changes. Since calculated values can change at any time (like when a datasource is updated) we handle them in a special callback function here.
		self.onCalculatedValueChanged = function (settingName, newValue) {

			// Remember we defined "the_text" up above in our settings.
			if (settingName == "target") {
				self.value = newValue
				
				var value= newValue
				
				//Handle either "input widget spec" value, timestamp pairs or straight numbers.
				if(typeof(value)=='object')
                {
                    value=value[0]
                }

				$(valueElement).html(value + currentSettings.unit);

				//Attempt to break l00ps
				if(value!=$(theSlider).val())
				{
					$(theSlider).val(value);
				}
			}
			if(settingName=='step')
			{
				self.step=newValue
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
				if (newValue <self. max) {
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

        ],
        newInstance: function (settings, newInstanceCallback) {
            newInstanceCallback(new wswitch(settings));
        }
    });

     freeboard.addStyle ('.floating-box',"display: inline-block; vertical-align: top; width: 78px; background-color: #222;margin-top: 10px; margin-right: 5px;");
     
     freeboard.addStyle ('.onoffswitch-title',"font-size: 17px; line-height: 29px; width: 65%; height: 29px; padding-left: 10px;border: 1px solid #3d3d3d;");
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
    
        
        function updateState() {
            $('#'+thisWidgetId).prop('checked', self.isOn);
            console.log(onOffSwitch.find("span.on"));
            onOffSwitch.find("span.on").text(self.onText);
            onOffSwitch.find("span.off").text(self.offText);
        }
         

        this.render = function (element) {
           
            $(element).append(box1).append(box2);
             var input = $('<input type="checkbox" name="onoffswitch" class="onoffswitch-checkbox" id="'+ thisWidgetId +'">').prependTo(onOffSwitch).change(function(e)
                {
                    self.isOn =e.target.checked
                    
                    if (_.isUndefined(currentSettings.target)) { }
					else {
						//todo Avoid loops, only real user input triggers this
						if (true) {
							self.dataTargets.target([self.isOn, Date.now()/1000]);
						}
					}
                    
                });
        }

        this.onSettingsChanged = function (newSettings) {
            currentSettings = newSettings;
            box2.html((_.isUndefined(newSettings.title) ? "" : newSettings.title));
            console.log( "isUndefined on_text: " + _.isUndefined(newSettings.on_text) );
            self.onText = newSettings.on_text;
            self.offText = newSettings.off_text;
            updateState();
        }

        this.onCalculatedValueChanged = function (settingName, newValue) {
            console.log(settingName, newValue);
            
             if (settingName == "target") {
                //Handle either "input widget spec" value, timestamp pairs or straight numbers.
                var value = newValue
				if(typeof(value)=='object')
                {
                    value=value[0]
                }

                self.isOn = Boolean(value);
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
		"description": "Interactive Textbox Plugin with 2-way data binding.  Value is a list of 2 items, the value and the timestamp.",
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
                description:'Value pushed will be a value, timestamp pair.',
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
		var thisWidgetContainer = $('<div class="textbox-widget textbox-label" id="__' + thisWidgetId + '"></div>');


		var titleElement = $('<h2 class="section-title textbox-label"></h2>');
		var inputElement = $('<input/>', { type: 'text', pattern:settings.pattern, id: thisWidgetId,name:thisWidgetId}).css('width', '90%');
		var theTextbox = '#' + thisWidgetId;
		var theValue = '#' + "value-" + thisWidgetId;

		//console.log( "theTextbox ", theTextbox);

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
			inputElement.appendTo(thisWidgetContainer);

			$(theTextbox).attr('placeholder', self.currentSettings.placeholder);
			$(theTextbox).attr('title', self.currentSettings.tooltip);
			$(theTextbox).attr('pattern', self.currentSettings.pattern);
			

			$(theValue).html(self.value + self.currentSettings.unit);

			$(theTextbox).on('change',
				function (e) {
					if (_.isUndefined(self.currentSettings.target)) { }
					else {
						//Avoid loops, only real user input triggers this
						if (true) {
							self.dataTargets.target([e.target.value, Date.now()/1000]);
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
							self.dataTargets.target([e.target.value, Date.now()/1000]);
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
				
				var value= newValue;
				
				//Handle either "input widget spec" value, timestamp pairs or straight numbers.
				if(typeof(value)=='object')
                {
                    value=value[0];
                }


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
		}
	}
}());
