
    var htmlWidget = function (settings) {
        var self = this;

        self.id = freeboard.genUUID()
        self.fs=0

        var containerElement = $('<div style="overflow:auto;height:100%;width:auto;padding:0px;display:flex;flex-direction:column;"></div>')
        var toolbarElement = $('<div class="freeboard-hover-unhide" style="border-radius:4px; overflow:hidden;background-color:var(--widget-bg-color);width:100%;padding:3px;margin:0px;position:absolute;user-select: none;opacity:0;"></div>');
        var fsButton = $('<button></button>').on('click', function(){

            if(!self.fs){
                self.fs=1;

                //Backdrop filters break fixed positioning
                self.backup=getComputedStyle(document.body).getPropertyValue("--box-backdrop");

                document.body.style.setProperty("--box-backdrop", 'initial')

                containerElement.css({height:'100vh', width:'100vw', position:'fixed', "z-index":'100',top:'0px','left':'0px','background-color':getComputedStyle(document.body).getPropertyValue("--box-bg-color")})
                containerElement.css({"background-image":currentSettings.background||''})
                containerElement.css({'background-repeat':currentSettings.backgroundRepeat||''})
                containerElement.css({'background-size':currentSettings.backgroundSize||''})
            }
            else{
                self.fs=0;
                document.body.style.setProperty("--box-backdrop", self.backup)

                containerElement.css({height:'100%', width:'100%',position:'static','z-index':'auto','background-color':'transparent'})
                containerElement.css({"background-image":currentSettings.background||''})
                containerElement.css({'background-repeat':currentSettings.backgroundRepeat||''})
                containerElement.css({'background-size':currentSettings.backgroundSize||''})
            }
        })
        var printButton = $('<button></button>').on('click',function(){printJS(self.id, 'html')})


        toolbarElement.append(printButton)
        toolbarElement.append(fsButton)


   
        var htmlElement = $('<div class="html-widget" style="width:100%; height:auto; margin:0px;padding:0px;flex-grow:100;"></div>').attr('id', self.id);
        var currentSettings = settings;

        self.data = {}
        
        this.updateData=function()
        {
            if(self.data && typeof(self.data)=='object')
            {
                htmlElement.html(Mustache.render(currentSettings.html||'', self.data));
            }
            else
            {
                htmlElement.html(currentSettings.html||'');
            }

        }

        this.render = function (element) {
            $(element).append(containerElement);
         
                containerElement.append(toolbarElement);
                toolbarElement.append()

            

            containerElement.append(htmlElement);
             self.updateData()
        }

        this.onSettingsChanged = function (newSettings) {
            currentSettings = newSettings;
            self.updateData()

            if(newSettings.toolbar)
            {
                toolbarElement.css({display:'block'})
            }
            else
            {
                toolbarElement.css({display:'none'})
            }

            containerElement.css({background:newSettings.background||''})
            containerElement.css({'background-repeat':newSettings.backgroundRepeat||''})
            containerElement.css({'background-size':newSettings.backgroundSize||''})
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
                "name": "background",
                "display_name": "Background",
                "type": "text",
                "default_value": 'transparent',
                "description": "CSS Background(try 'blue' or 'url(--my-image) cover')",
                "options": freeboard.getAvailableCSSImageVars
            },
            {
                "name": "backgroundRepeat",
                "display_name": "Background Repeat",
                "type": "option",
                "options": [
                    {
                        "name": "no-repeat",
                        "value": "no-repeat"
                    },
                    {
                        "name": "Tile/Repeat",
                        "value": "repeat"
                    }
                ]
            },
            {
                "name": "backgroundSize",
                "display_name": "Background Image Size",
                "type": "option",
                "options": [
                    {
                        "name": "Cover",
                        "value": "cover"
                    },
                    {
                        "name": "Contain",
                        "value": "contain"
                    },
                    {
                        "name": "auto/actual size",
                        "value": "auto"
                    }
                ]
            },   
            {
                "name": "background",
                "display_name": "Background",
                "type": "text",
                "default_value": 'transparent',
                "description": "CSS Background(try 'blue' or 'url(--my-image) cover')",
                "options": freeboard.getAvailableCSSImageVars
            },
            {
                "name": "height",
                "display_name": "Height Blocks",
                "type": "number",
                "default_value": 4,
                "description": "A height block is around 60 pixels"
            },
            {
                "name": "toolbar",
                "display_name": "Show toolbar",
                "type": "boolean",
                "default_value": false,
                "description": "Fullscreen and print options"
            }
        ],
        newInstance: function (settings, newInstanceCallback) {
            newInstanceCallback(new htmlWidget(settings));
        }
    });

