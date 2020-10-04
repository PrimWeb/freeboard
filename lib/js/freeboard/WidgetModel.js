
function WidgetModel(theFreeboardModel, widgetPlugins) {

	var targetFunctionFromScript = function(script)
	{
		// First we compile the user's code, appending to make it into an assignment to the target

		var append =''

		//Assignments or function calls let you ado something other than what you expect with the value.
		if (!(script.includes('=') || script.includes('(')))
		{
			append = '=value'
		}
		var targetFunction = new Function("datasources",'value', script+append);
		
		//Next we wrap this into another function that supplies the neccesary context.
		var f = function (val) {
			return targetFunction(theFreeboardModel.protectedDataSourceData, val);
		}
		
		return f
	}

	function disposeWidgetInstance() {
		if (!_.isUndefined(self.widgetInstance)) {
			if (_.isFunction(self.widgetInstance.onDispose)) {
				self.widgetInstance.onDispose();
			}

			self.widgetInstance = undefined;
		}
	}

	var self = this;

	this.datasourceRefreshNotifications = {};
	this.calculatedSettingScripts = {};

	//When you have a setting of type 'target', that setting gets an entry here, and it's a function you call to set the target with new data.
	this.dataTargets={}

	this.title = ko.observable();
	this.fillSize = ko.observable(false);

	this.type = ko.observable();
	this.type.subscribe(function (newValue) {
		disposeWidgetInstance();

		if ((newValue in widgetPlugins) && _.isFunction(widgetPlugins[newValue].newInstance)) {
			var widgetType = widgetPlugins[newValue];

			function finishLoad() {
				widgetType.newInstance(self.settings(), function (widgetInstance) {

					self.fillSize((widgetType.fill_size === true));
					self.widgetInstance = widgetInstance;

				
					self.widgetInstance.dataTargets= self.dataTargets;
                    self.widgetInstance.processCalculatedSetting= self.processCalculatedSetting;

					self.shouldRender(true);
					self._heightUpdate.valueHasMutated();

				});
			}

			// Do we need to load any external scripts?
			if (widgetType.external_scripts) {
				head.js(widgetType.external_scripts.slice(0), finishLoad); // Need to clone the array because head.js adds some weird functions to it
			}
			else {
				finishLoad();
			}
		}
	});

	this.settings = ko.observable({});
	this.settings.subscribe(function (newValue) {
		if (!_.isUndefined(self.widgetInstance) && _.isFunction(self.widgetInstance.onSettingsChanged)) {
			self.widgetInstance.onSettingsChanged(newValue);
		}

		self.updateCalculatedSettings();
		self._heightUpdate.valueHasMutated();
	});

	this.processDatasourceUpdate = function (datasourceName) {
		var refreshSettingNames = self.datasourceRefreshNotifications[datasourceName];

		if (_.isArray(refreshSettingNames)) {
			_.each(refreshSettingNames, function (settingName) {
				self.processCalculatedSetting(settingName);
			});
		}
	}

	this.callValueFunction = function (theFunction) {
		return theFunction.call(undefined, theFreeboardModel.datasourceData);
	}

	this.processSizeChange = function () {
		if (!_.isUndefined(self.widgetInstance) && _.isFunction(self.widgetInstance.onSizeChanged)) {
			self.widgetInstance.onSizeChanged();
		}
	}

	
	//This function is now a public API function
	this.processCalculatedSetting = function (settingName) {
		if (_.isFunction(self.calculatedSettingScripts[settingName])) {
			var returnValue = undefined;

			try {
				returnValue = self.callValueFunction(self.calculatedSettingScripts[settingName]);
			}
			catch (e) {
				var rawValue = self.settings()[settingName];

				// If there is a reference error and the value just contains letters and numbers, then
				if (e instanceof ReferenceError && (/^\w+$/).test(rawValue)) {
					returnValue = rawValue;
				}
			}

			if (!_.isUndefined(self.widgetInstance) && _.isFunction(self.widgetInstance.onCalculatedValueChanged) && !_.isUndefined(returnValue)) {
				try {
					self.widgetInstance.onCalculatedValueChanged(settingName, returnValue);
				}
				catch (e) {
					console.log(e.toString());
				}
			}
		}
	}


	this.updateCalculatedSettings = function () {
		self.datasourceRefreshNotifications = {};
		self.calculatedSettingScripts = {};

		if (_.isUndefined(self.type())) {
			return;
		}

		// Check for any calculated settings
		var settingsDefs = widgetPlugins[self.type()].settings;
		var datasourceRegex = new RegExp("=\\s*datasources.([\\w_-]+)|datasources\\[['\"]([^'\"]+)", "g");
		var currentSettings = self.settings();

		_.each(settingsDefs, function (settingDef) {
			if (settingDef.type == "calculated" || settingDef.type == "target") {
				var script = currentSettings[settingDef.name];

				if (!_.isUndefined(script)) {
                    var isLiteralText=0
					
					var wasArray =0;

					//For arrays, we have to go down the line, check them, and convert to expressions as needed.
					if(_.isArray(script)) {
						wasArray=1;

						var s =[]
						for(i in script)
						{
							if(i[0]=='=')
							{
								s.push(i.substring(1))
							}
							else if(settingDef.type == "target")
                            {
                                s.push(i)
                            }
							else
							{
								//String escaping
								s.push(JSON.stringify(i))
							}
						}
						script = "[" + s.join(",") + "]";
					}


                    if (script[0]=='=' || settingDef.type == "target" || wasArray){
                        
                        //We use the spreadsheet convention here. 
                        if (script[0]=='=')
                        {
                            script = script.substring(1)
                        }


						var getter=script;                        
						
						// If there is no return, add one
						//Only th the getter though, not the setter if it's a target.
                        if ((script.match(/;/g) || []).length <= 1 && script.indexOf("return") == -1) {
                            getter = "return " + script;
						}

                        var valueFunction;

                        try {
                            valueFunction = new Function("datasources", getter);
                        }
                        catch (e) {
                            console.log(" arg "+getter+"\nlooks like a function but won't compile, treating as text")
                            isLiteralText=1
                        }
                    }
                    else
                    {
                        isLiteralText = 1;
                    }
					
					if (isLiteralText)
                    {
                        var literalText = currentSettings[settingDef.name].replace(/"/g, '\\"').replace(/[\r\n]/g, ' \\\n');
						// If the value function cannot be created, then go ahead and treat it as literal text
						valueFunction = new Function("datasources", "return \"" + literalText + "\";");   
                    }

					self.calculatedSettingScripts[settingDef.name] = valueFunction;
                    
                    //The settting is asking the uesr for a data target. So we create a function
                    //to set that value.
                    
                    //The datasource is then expected to handle this with a set function.
                    if (settingDef.type == "target")
                    {
                        try {
                           
                            self.dataTargets[settingDef.name] = targetFunctionFromScript(script);
                        }
                        catch (e) {
							console.log("Bad data target: "+ script)
							console.log(e)
							self.dataTargets[settingDef.name]=undefined
                        }
                    }
					self.processCalculatedSetting(settingDef.name);

					// Are there any datasources we need to be subscribed to?
					var matches;

					while (matches = datasourceRegex.exec(script)) {
						var dsName = (matches[1] || matches[2]);
						var refreshSettingNames = self.datasourceRefreshNotifications[dsName];

						if (_.isUndefined(refreshSettingNames)) {
							refreshSettingNames = [];
							self.datasourceRefreshNotifications[dsName] = refreshSettingNames;
						}

						if(_.indexOf(refreshSettingNames, settingDef.name) == -1) // Only subscribe to this notification once.
						{
							refreshSettingNames.push(settingDef.name);
						}
					}
				}
				else
				{
					self.dataTargets[settingDef.name]=undefined;
				}
			}
		});
    };
	

	this._heightUpdate = ko.observable();
	this.height = ko.computed({
		read: function () {
			self._heightUpdate();

			if (!_.isUndefined(self.widgetInstance) && _.isFunction(self.widgetInstance.getHeight)) {
				return self.widgetInstance.getHeight();
			}

			return 1;
		}
	});

	this.shouldRender = ko.observable(false);
	this.render = function (element) {
		self.shouldRender(false);
		if (!_.isUndefined(self.widgetInstance) && _.isFunction(self.widgetInstance.render)) {
			self.widgetInstance.render(element);
			self.updateCalculatedSettings();
		}
	}

	this.dispose = function () {

	}

	this.serialize = function () {
		return {
			title: self.title(),
			type: self.type(),
			settings: self.settings()
		};
	}

	this.deserialize = function (object) {
		self.title(object.title);
		self.settings(object.settings);
		self.type(object.type);
	}
}
