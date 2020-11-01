
    var htmlWidget = function (settings) {
        var self = this;
        var htmlElement = $('<div class="html-widget" style="overflow:auto;height:100%;width:100%;"></div>');
        var currentSettings = settings;

        self.data = {}
        
        this.updateData=function()
        {
            if(self.data && typeof(self.data)=='object')
            {
                htmlElement.html(Mustache.render(currentSettings.html, self.data));
            }
            else
            {
                htmlElement.html(currentSettings.html);
            }

        }

        this.render = function (element) {
            $(element).append(htmlElement);
             self.updateData()
        }

        this.onSettingsChanged = function (newSettings) {
            currentSettings = newSettings;
            self.updateData()
        }

        this.onCalculatedValueChanged = function (settingName, newValue) {
            if (settingName == "html") {
                self.updateData();
            }
            if (settingName == "data") {
                      self.data=newValue
                self.updateData();
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
        "type_name": "html-template",
        "display_name": "Rich Text Content",
        "fill_size": true,
        "settings": [
            {
                "name": "html",
                "display_name": "HTML",
                "type": "html-wysywig",
                "description": "HTML template.  You can paste images here, they are stored in the freeboard config itself as base64."
            },
            {
                    // **name** (required) : The name of the setting. This value will be used in your code to retrieve the value specified by the user. This should follow naming conventions for javascript variable and function declarations.
                    "name"         : "data",
                    // **display_name** : The pretty name that will be shown to the user when they adjust this setting.
                    "display_name" : "Variables to use",
					// **type** (required) : The type of input expected for this setting. "text" will display a single text box input. Examples of other types will follow in this documentation.
	
					"type"        : "calculated",
                    "default_value" : "={varName: 'value'}",
                    // **description** : Text that will be displayed below the setting to give the user any extra information.
                    "description"  : "Variables to use in Mustache templating, as a JS object.  Access a var with {{varname}} in your document template, it gets replaced with the value.",
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

