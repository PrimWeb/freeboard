function PaneModel(theFreeboardModel, widgetPlugins) {
	var self = this;

	this.title = ko.observable();
	this.width = ko.observable(1);
	this.row = {};
	this.col = {};

	this.col_width = ko.observable(1);

	//refit the text
	this.title.subscribe(function(v){
		freeboard.ui.processResize()
	})
	this.col_width.subscribe(function(newValue)
	{
		self.processSizeChange();
	});

	this.widgets = ko.observableArray();

	this.addWidget = function (widget) {
		this.widgets.push(widget);
	}

	this.widgetCanMoveUp = function (widget) {
		return (self.widgets.indexOf(widget) >= 1);
	}

	this.widgetCanMoveDown = function (widget) {
		var i = self.widgets.indexOf(widget);

		return (i < self.widgets().length - 1);
	}

	this.moveWidgetUp = function (widget) {
		if (self.widgetCanMoveUp(widget)) {
			var i = self.widgets.indexOf(widget);
			var array = self.widgets();
			self.widgets.splice(i - 1, 2, array[i], array[i - 1]);
		}
	}

	this.moveWidgetDown = function (widget) {
		if (self.widgetCanMoveDown(widget)) {
			var i = self.widgets.indexOf(widget);
			var array = self.widgets();
			self.widgets.splice(i, 2, array[i + 1], array[i]);
		}
	}

	this.processSizeChange = function()
	{
		// Give the animation a moment to complete. Really hacky.
		// TODO: Make less hacky. Also, doesn't work when screen resizes.
		setTimeout(function(){
			_.each(self.widgets(), function (widget) {
				widget.processSizeChange();
			});
		}, 1000);
	}

	this.getCalculatedHeight = function () {
		var sumHeights = _.reduce(self.widgets(), function (memo, widget) {
			return memo + widget.height();
		}, 0);

		//Convert from 60px height blocks presumably
		sumHeights *= 6;

		//Add 3 because we want an extra 30px for... margins?
		sumHeights += 3;

		sumHeights *= 10;

		// var extraGridSize = getComputedStyle(document.documentElement).getPropertyValue('--extra-grid-height')
		// //Remove the px
		// extraGridSize = extraGridSize.substring(0,extraGridSize.length-2);

		// sumHeights+= extraGridSize;

		var titleHeight = getComputedStyle(document.documentElement).getPropertyValue('--pane-header-line-height')
		//Remove the px
		titleHeight = titleHeight.substring(0,titleHeight.length-2);
		var rows = Math.ceil((sumHeights + parseFloat(titleHeight)) / 30);

		return Math.max(4, rows);
	}

	this.serialize = function () {
		var widgets = [];

		_.each(self.widgets(), function (widget) {
			widgets.push(widget.serialize());
		});

		if(_.isUndefined(self.row)||_.isUndefined(self.row))
		{
			freeboard.showDialog($("<div>Invalid grid, cannot save. Perhaps element is in an invalid position?</div>"),"Error","OK")
			throw Error("Undefined row or column attribute")
		}
		return {
			title: self.title(),
			width: self.width(),
			row: self.row,
			col: self.col,
			col_width: Number(self.col_width()),
			widgets: widgets
		};
	}

	this.deserialize = function (object) {
		self.title(object.title);
		self.width(object.width);

		self.row = object.row;
		self.col = object.col;
		self.col_width(object.col_width || 1);

		_.each(object.widgets, function (widgetConfig) {
			var widget = new WidgetModel(theFreeboardModel, widgetPlugins);
			widget.deserialize(widgetConfig);
			self.widgets.push(widget);
		});
	}

	this.dispose = function () {
		_.each(self.widgets(), function (widget) {
			widget.dispose();
		});
	}
}
