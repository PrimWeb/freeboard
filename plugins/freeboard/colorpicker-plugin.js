// ┌────────────────────────────────────────────────────────────────────┐ \\
// │ freeboard-colorpicker-plugin                                            │ \\
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

    freeboard.addStyle('.colorpicker', "border: 2px solid #3d3d3d;background-color: #222;margin: 10px;");
    freeboard.addStyle('.colorpicker-label', 'margin-left: 10px; margin-top: 10px; text-transform: capitalize;');
    freeboard.addStyle('.myui-colorpicker-handle', "width: 1.5em !important; height: 1.5em !important; border-radius: 50%; top: -.4em !important; margin-left:-1.0em !important;");
    freeboard.addStyle('.ui-colorpicker-range', 'background: #F90;');






    var toCSSColor = function (c) {
        if (c._type == 'rgb') {
            c = chroma(c.r, c.g, c.b, c.a || 1).hex()
        }
        if (c._type == 'hsv') {
            c = chroma.hsv(c.h, c.s, c.v, c.a || 1).hex()
        }

        return c
    }
    // ## A Widget Plugin
    //
    // -------------------
    // ### Widget Definition
    //
    // -------------------
    // **freeboard.loadWidgetPlugin(definition)** tells freeboard that we are giving it a widget plugin. It expects an object with the following:
    freeboard.loadWidgetPlugin({
        // Same stuff here as with datasource plugin.
        "type_name": "colorpicker_plugin",
        "display_name": "Color Picker",
        "description": "Interactive colorpicker Plugin with 2-way data binding. ",
        // **external_scripts** : Any external scripts that should be loaded before the plugin instance is created.

        // **fill_size** : If this is set to true, the widget will fill be allowed to fill the entire space given it, otherwise it will contain an automatic padding of around 10 pixels around it.
        "fill_size": true,
        "settings": [
            {
                name: "title",
                display_name: "Title",
                description: '',
                type: "calculated"
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
                        "name": "When you click OK",
                        "value": "change"
                    }
                ]
            },

            {
                "name": "format",
                "display_name": "Format",
                "type": "option",
                "options": [
                    {
                        "name": "Hex String",
                        "value": "hex"
                    },
                    {
                        "name": "RGB Object",
                        "value": "rgb"
                    }
                ]
            },
            {
                name: "target",
                display_name: "Data target when value changes. ",
                description: 'Value pushed will be a value, timestamp pair.',
                type: "target"
            }
        ],
        // Same as with datasource plugin, but there is no updateCallback parameter in this case.
        newInstance: function (settings, newInstanceCallback) {
            newInstanceCallback(new colorpicker(settings));
        }
    });


    // ### Widget Implementation
    //
    // -------------------
    // Here we implement the actual widget plugin. We pass in the settings;
    var colorpicker = function (settings) {
        var self = this;
        self.currentSettings = settings;

        var thisWidgetId = "colorpicker-" + SLIDER_ID++;
        var thisWidgetContainer = $('<div class="colorpicker-widget colorpicker-label" id="__' + thisWidgetId + '"></div>');
        var titleElememt = $('<label></label>', { id: thisWidgetId, name: thisWidgetId }).css({ 'display': 'block' })


        var inputElement = $('<input/>', { id: thisWidgetId, name: thisWidgetId }).css('width', '90%')
        var thecolorpicker = '#' + thisWidgetId;

        //console.log( "thecolorpicker ", thecolorpicker);

        self.value = ''

        var requestChange = false;
        var target;

        // Here we create an element to hold the text we're going to display. We're going to set the value displayed in it below.

        // **render(containerElement)** (required) : A public function we must implement that will be called when freeboard wants us to render the contents of our widget. The container element is the DIV that will surround the widget.
        self.render = function (containerElement) {
            $(containerElement)
                .append(thisWidgetContainer);
            titleElememt.appendTo(thisWidgetContainer);
            inputElement.appendTo(thisWidgetContainer);



            inputElement.spectrum({
                type: "component",
                showInitial: "true"
            });


            var handle = function (e) {

                var m = [e.r, e.g, e.b, e.a]

                if (_.isEqual(self.value, m)) {
                    return;
                }
                self.value = m

                var c = chroma(e.r, e.g, e.b).alpha(e.a)
                //Avoid loops, only real user input triggers this
                if (true) {
                    if (settings.format == 'hex') {
                        self.dataTargets.target(c.hex())
                    }
                    if (settings.format == 'rgb') {
                        c = c.rgba()

                        //Add to existing, don't erase, because this might actually be a fade command with other stuff
                        var d = {
                            '_type':'rgb',
                            'r': c[0],
                            g: c[1],
                            b: c[2],
                            a: c[3]
                        }
                        self.lastDataFromTarget.assign(d)
                        self.dataTargets.target(self.lastDataFromTarget);
                    }
                }
            }


           
                inputElement.on('change.spectrum', function (e, c) { if (self.currentSettings.mode == 'change') { handle(c.toRgb()) }})
                inputElement.on('move.spectrum', function (e, c) { if (self.currentSettings.mode == 'input') { handle(c.toRgb()) }})



            $(thecolorpicker).removeClass("ui-widget-content");
        }

        // **getHeight()** (required) : A public function we must implement that will be called when freeboard wants to know how big we expect to be when we render, and returns a height. This function will be called any time a user updates their settings (including the first time they create the widget).
        //
        // Note here that the height is not in pixels, but in blocks. A block in freeboard is currently defined as a rectangle that is fixed at 300 pixels wide and around 45 pixels multiplied by the value you return here.
        //
        // Blocks of different sizes may be supported in the future.
        self.getHeight = function () {
            return 1;
        }

        // **onSettingsChanged(newSettings)** (required) : A public function we must implement that will be called when a user makes a change to the settings.
        self.onSettingsChanged = function (newSettings) {
            // Normally we'd update our text element with the value we defined in the user settings above (the_text), but there is a special case for settings that are of type **"calculated"** -- see below.
            self.currentSettings = newSettings;
            self.currentSettings.unit = self.currentSettings.unit || ''
            $(thecolorpicker).attr('tooltip', newSettings.placeholder);

        }

        // **onCalculatedValueChanged(settingName, newValue)** (required) : A public function we must implement that will be called when a calculated value changes. Since calculated values can change at any time (like when a datasource is updated) we handle them in a special callback function here.
        self.onCalculatedValueChanged = function (settingName, newValue) {

            if (settingName == 'target') {
                var x = toCSSColor(newValue)

                var c= chroma(x)
                var e = c.rgba()


                if (_.isEqual(self.value, e)) {
                    return;
                }
                self.value = e
                self.lastDataFromTarget = {}


                $(inputElement).spectrum('set', (c.css()))
            }

            if (settingName == 'title') {
                $(titleElememt).text(newValue)
            }


        }


        // **onDispose()** (required) : Same as with datasource plugins.
        self.onDispose = function () {
        }
    }
}());
