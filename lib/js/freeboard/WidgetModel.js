
function WidgetModel(theFreeboardModel, widgetPlugins) {

	var targetFunctionFromScript = function (script) {

		var insideSingle = false
		var insideDouble = false
		var lastWasSlash=false

		var r=''
		// First we compile the user's code, appending to make it into an assignment to the target
		if (!script) {
			return new Function("datasources", 'value', "");
		}
	
		//Remove ? from script if unquoted.
		//The user may want to use ?. in a data target, but you can't assign to those.  So we convert to just plain .
		//expressions when we use them for setting.  Which is fine, because when setting we usually want to see any nonexistant errors.
		//But when getting, we let the user tell us that they should be ignored.
		for(var idx in script)
		{
			var i = script[idx]
			if(lastWasSlash)
			{
				r+=i;
				lastWasSlash=false
			}
			else if(i=="\\")
			{
				lastWasSlash=1
			}
			else{
				if(i=="?")
				{
					if((!insideDouble) && (!insideSingle))
					{
						continue
					}
				}
				r+=i
				if(i=='"')
				{
					if(!insideSingle)
					{
						insideDouble = !insideDouble;
					}
				}
				if(i=="'")
				{
					if(!insideDouble)
					{
						insideSingle = !insideSingle;
					}
				}
			}
		}
		script=r
		

		
		var append = ''

		//Assignments or function calls let you ado something other than what you expect with the value.
		if (!(script.includes('=') || script.includes('('))) {
			append = '=value'
		}
		var targetFunction = new Function("datasources", 'value', script + append);

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
	this.dataTargets = {}

	this.title = ko.observable();
	this.fillSize = ko.observable(false);

	this.type = ''

	//Sync function.  We are sure t always call this after calculating settings.
	//Note that we don't have any way to wait on the newinstance function
	//because i don't know how to use head.js with async.  Nonetheless, the api semi-spec already
	//clearly doesn't care about waiting
	this.setType = async function (newValue, settings) {
		if (self.type == newValue) {
			return;
		}
		self.type = newValue

		disposeWidgetInstance();
		await self.updateCalculatedSettings();

		if ((newValue in widgetPlugins) && _.isFunction(widgetPlugins[newValue].newInstance)) {
			var widgetType = widgetPlugins[newValue];

			async function finishLoad() {
				await widgetType.newInstance(self.calculatedSettings, function (widgetInstance) {

					self.fillSize((widgetType.fill_size === true));
					self.widgetInstance = widgetInstance;


					self.widgetInstance.dataTargets = self.dataTargets;
					self.widgetInstance.processCalculatedSetting = self.processCalculatedSetting;

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
	};

	this.settings = {}

	//After processing
	this.calculatedSettings = {}

	this.setSettings = async function (newValue) {
		this.settings = newValue

		//Make the processed copy
		Object.assign(this.calculatedSettings, this.settings);

		//Now we are gonna calc the real values
		await self.updateCalculatedSettings();

		if (!_.isUndefined(self.widgetInstance) && _.isFunction(self.widgetInstance.onSettingsChanged)) {
			try {
				await self.widgetInstance.onSettingsChanged(this.settings);
			}
			catch (e) {
				freeboard.showDialog($("<pre>").text(String(e)), "Error changing settings", "OK")
				throw e;
			}
		}

		self._heightUpdate.valueHasMutated();
	};

	this.processDatasourceUpdate = function (datasourceName) {
		var refreshSettingNames = self.datasourceRefreshNotifications[datasourceName];

		if (_.isArray(refreshSettingNames)) {
			_.each(refreshSettingNames, function (settingName) {
				//All those updates are async
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


	//This function is now a public API function.
	//Will not complete till the effect is resolved, but the function itself is async
	this.processCalculatedSetting = async function (settingName, showError) {
		if (_.isFunction(self.calculatedSettingScripts[settingName])) {
			var returnValue = undefined;

			try {
				returnValue = self.callValueFunction(self.calculatedSettingScripts[settingName]);
			}
			catch (e) {
				var rawValue = self.settings[settingName];

				// If there is a reference error and the value just contains letters and numbers, then
				if (e instanceof ReferenceError && (/^\w+$/).test(rawValue)) {
					returnValue = rawValue;
				}
				/*
				if (showError) {
					freeboard.showDialog(e, "xError with: " + settingName, "OK")
					freeboard.playSound('error')
				}
				*/
			}

			var f = async function (returnValue) {
				if (!_.isUndefined(self.widgetInstance) && _.isFunction(self.widgetInstance.onCalculatedValueChanged) && !_.isUndefined(returnValue)) {
					try {
						//Maybe async, maybe not
						await self.widgetInstance.onCalculatedValueChanged(settingName, returnValue);
					}
					catch (e) {
						console.log(e.toString());

					}
				}
			}

			try {
				//We might get a Promise as a return value. If that happens, we need to resolve it.
				var x = await returnValue;
				self.calculatedSettings[settingName] = x;
				await f(x)
			}
			catch (e) {
				console.log(e.toString());
				if (showError) {
					freeboard.showDialog(e, "yError with: " + settingName, "OK")
					freeboard.playSound('error')
				}
			}

		}
	}


	this.updateCalculatedSettings = async function () {
		self.datasourceRefreshNotifications = {};
		self.calculatedSettingScripts = {};

		if (!self.type) {
			return;
		}

		// Check for any calculated settings
		var settingsDefs = widgetPlugins[self.type].settings;
		var currentSettings = self.settings;

		for (var settingDefIndex in settingsDefs) {
			var settingDef = settingsDefs[settingDefIndex]
			if (settingDef.type == "calculated" || settingDef.type == "target" || settingDef.type == "constructor") {
				var script = currentSettings[settingDef.name];

				if (!_.isUndefined(script)) {
					var isLiteralText = 0

					var wasArray = 0;

					//For arrays, we have to go down the line, check them, and convert to expressions as needed.
					if (_.isArray(script)) {
						wasArray = 1;

						var s = []
						for (i in script) {
							if (i[0] == '=') {
								s.push(i.substring(1))
							}
							else if (settingDef.type == "target" || settingDef.type == "constructor") {
								s.push(i)
							}
							else {
								//String escaping
								s.push(JSON.stringify(i))
							}
						}
						script = "[" + s.join(",") + "]";
					}


					if (!script) {
						valueFunction = new Function("datasources", "return undefined;");
					}
					else if ((script[0] == '=' || settingDef.type == "target" || settingDef.type == "constructor" || wasArray)) {

						//We use the spreadsheet convention here. 
						if (script[0] == '=') {
							script = script.substring(1)
						}


						var getter = script;

						// If there is no return, add one
						//Only th the getter though, not the setter if it's a target.
						//But constructors have the implicit return.
						if (!(settingDef.type == "constructor")) {
							if ((script.match(/;/g) || []).length <= 1 && script.indexOf("return") == -1) {
								getter = "return " + script;
							}
						}

						var valueFunction;

						//Turns a constructor into just a regular function returning the thing you want.
						var wrapConstructerFunction = function (f1) {
							var f2 = function (datasources) {
								return new f1(datasources)
							}
							return f2
						}

						try {
							var valueFunction = new Function("datasources", getter);

							//If it is a constructor, wrap it so we can return the constructed object.
							if (settingDef.type == "constructor") {
								valueFunction = wrapConstructerFunction(valueFunction)
							}
						}
						catch (e) {
							if (settingDef.type == "constructor") {
								throw e;
							}
							console.log(" arg " + getter + "\nlooks like a function but won't compile, treating as text")
							isLiteralText = 1
						}
					}
					else {
						isLiteralText = 1;
					}

					if (isLiteralText) {
						var literalText = currentSettings[settingDef.name].replace(/"/g, '\\"').replace(/[\r\n]/g, ' \\\n');
						// If the value function cannot be created, then go ahead and treat it as literal text
						valueFunction = new Function("datasources", "return \"" + literalText + "\";");
					}

					self.calculatedSettingScripts[settingDef.name] = valueFunction;

					//The settting is asking the uesr for a data target. So we create a function
					//to set that value.

					//The datasource is then expected to handle this with a set function.
					if (settingDef.type == "target") {
						try {

							self.dataTargets[settingDef.name] = targetFunctionFromScript(script);
						}
						catch (e) {
							console.log("Bad data target: " + script)
							console.log(e)
							//The do nothing function
							self.dataTargets[settingDef.name] = function (v) { }
						}
					}

					//No error dialog for targets, they are created on-demand
					await self.processCalculatedSetting(settingDef.name, (settingDef.type == "calculated" || settingDef.type == "constructor"));

					//Constructors do not auto-update like everything else.
					if (!(settingDef.type == "constructor")) {
						// Are there any datasources we need to be subscribed to?
						var matches;
						var datasourceRegex = new RegExp("\\s*datasources.([\\w_-]+)|datasources\\[['\"]([^'\"]+)", "g");

						while (matches = datasourceRegex.exec(script)) {
							var dsName = (matches[1] || matches[2]);
							var refreshSettingNames = self.datasourceRefreshNotifications[dsName];

							if (_.isUndefined(refreshSettingNames)) {
								refreshSettingNames = [];
								self.datasourceRefreshNotifications[dsName] = refreshSettingNames;
							}

							if (_.indexOf(refreshSettingNames, settingDef.name) == -1) // Only subscribe to this notification once.
							{
								refreshSettingNames.push(settingDef.name);
							}
						}
					}
				}
				else {
					//Dummy target setting
					self.dataTargets[settingDef.name] = function (v) { };
				}
			}
		};

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
	this.render = async function (element) {
		self.shouldRender(false);
		if (!_.isUndefined(self.widgetInstance) && _.isFunction(self.widgetInstance.render)) {
			self.widgetInstance.render(element);
			await self.updateCalculatedSettings();
		}
	}

	this.dispose = function () {

	}

	this.serialize = function () {
		return {
			title: self.title(),
			type: self.type,
			settings: self.settings
		};
	}

	this.deserialize = async function (object) {
		self.title(object.title);
		await self.setSettings(object.settings);
		await self.setType(object.type);
	}
}
