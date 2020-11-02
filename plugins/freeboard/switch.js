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
            {
                name: "sound",
                display_name: "Sound(URL or builtin)",
                type: "text",
                default_value: '',
                options: freeboard.getAvailableSounds
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
                    

						//todo Avoid loops, only real user input triggers this
						if (true) {
                            freeboard.playSound(currentSettings.sound)

							self.dataTargets.target(self.isOn);
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
                var value = newValue


                var x = Boolean(value);

                if(x!=self.isOn)
                {
                    self.isOn=x;
                    freeboard.playSound(currentSettings.sound)
                }
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
