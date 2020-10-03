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
