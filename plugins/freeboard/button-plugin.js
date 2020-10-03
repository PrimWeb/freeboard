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
