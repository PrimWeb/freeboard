
    var htmlWidget = function (settings) {
        var self = this;
        var htmlElement = $('<div class="html-widget" style="overflow:auto;height:100%;width:100%;"></div>');
        var currentSettings = settings;

        this.render = function (element) {
            $(element).append(htmlElement);
             htmlElement.html(settings.html);
        }

        this.onSettingsChanged = function (newSettings) {
            currentSettings = newSettings;
            htmlElement.html(settings.html);

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

