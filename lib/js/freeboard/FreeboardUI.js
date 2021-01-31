//https://gist.github.com/OwlyCode/6421823
//Allows dynamic settings changes
(function($) {
    $.Gridster.generate_stylesheet = function(opts) {
        var styles = '';
        var max_size_x = this.options.max_size_x;
        var max_rows = 0;
        var max_cols = 0;
        var i;
        var rules;

        opts || (opts = {});
        opts.cols || (opts.cols = this.cols);
        opts.rows || (opts.rows = this.rows);
        opts.namespace || (opts.namespace = this.options.namespace);
        opts.widget_base_dimensions || (opts.widget_base_dimensions = this.options.widget_base_dimensions);
        opts.widget_margins || (opts.widget_margins = this.options.widget_margins);
        opts.min_widget_width = (opts.widget_margins[0] * 2) +
            opts.widget_base_dimensions[0];
        opts.min_widget_height = (opts.widget_margins[1] * 2) +
            opts.widget_base_dimensions[1];


        /* generate CSS styles for cols */
        for (i = opts.cols; i >= 0; i--) {
            styles += (opts.namespace + ' [data-col="'+ (i + 1) + '"] { left:' +
                ((i * opts.widget_base_dimensions[0]) +
                (i * opts.widget_margins[0]) +
                ((i + 1) * opts.widget_margins[0])) + 'px;} ');
        }

        /* generate CSS styles for rows */
        for (i = opts.rows; i >= 0; i--) {
            styles += (opts.namespace + ' [data-row="' + (i + 1) + '"] { top:' +
                ((i * opts.widget_base_dimensions[1]) +
                (i * opts.widget_margins[1]) +
                ((i + 1) * opts.widget_margins[1]) ) + 'px;} ');
        }

        for (var y = 1; y <= opts.rows; y++) {
            styles += (opts.namespace + ' [data-sizey="' + y + '"] { height:' +
                (y * opts.widget_base_dimensions[1] +
                (y - 1) * (opts.widget_margins[1] * 2)) + 'px;}');
        }

        for (var x = 1; x <= max_size_x; x++) {
            styles += (opts.namespace + ' [data-sizex="' + x + '"] { width:' +
                (x * opts.widget_base_dimensions[0] +
                (x - 1) * (opts.widget_margins[0] * 2)) + 'px;}');
        }

        return this.add_style_tag(styles);
    };

    $.Gridster.add_style_tag = function(css) {
        var d = document;
        var tag = d.createElement('style');

        tag.setAttribute('generated-from', 'gridster');

        d.getElementsByTagName('head')[0].appendChild(tag);
        tag.setAttribute('type', 'text/css');

        if (tag.styleSheet) {
            tag.styleSheet.cssText = css;
        } else {
            tag.appendChild(document.createTextNode(css));
        }
        return this;
    };

    $.Gridster.resize_widget_dimensions = function(options) {
        if (options.widget_margins) {
            this.options.widget_margins = options.widget_margins;
        }

        if (options.widget_base_dimensions) {
             this.options.widget_base_dimensions = options.widget_base_dimensions;
        }

        this.min_widget_width  = (this.options.widget_margins[0] * 2) + this.options.widget_base_dimensions[0];
        this.min_widget_height = (this.options.widget_margins[1] * 2) + this.options.widget_base_dimensions[1];

        var serializedGrid = this.serialize();
        this.$widgets.each($.proxy(function(i, widget) {
            var $widget = $(widget);
            this.resize_widget($widget);
        }, this));

        this.generate_grid_and_stylesheet();
        this.get_widgets_from_DOM();
        this.set_dom_grid_height();

        return false;
    };
})(jQuery);

function FreeboardUI() {
	var PANE_MARGIN = 10;
	var PANE_WIDTH = 300;
	var MIN_COLUMNS = 3;
	var COLUMN_WIDTH = PANE_MARGIN + PANE_WIDTH + PANE_MARGIN;

	var userColumns = MIN_COLUMNS;

	var loadingIndicator = $('<div class="wrapperloading"><div class="loading up" ></div><div class="loading down"></div></div>');
	var grid;


	// function doNetWidget(){
	// 	var connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

	// 	if(connection){
	// 	var type = connection.effectiveType;

	// 	var main = $('<label id="freeboard-net-status-widget"><span>Net:</span></label>').appendTo($('#freeboard-extra-tools'))
	// 	var inner = $('<span></span>').html(type).appendTo(main)


	// 	function updateConnectionStatus() {
	// 		inner.html(connection.effectiveType);
	// 		}
	
	// 		connection.addEventListener('change', updateConnectionStatus);
	// 	}
	// }
	// doNetWidget()


	function processResize(layoutWidgets) {
		PANE_WIDTH = 300
		try{
			PANE_WIDTH += parseFloat(getComputedStyle($('.gs_w')[0]).getPropertyValue('padding'))*2
		}
		catch(e)
		{
			PANE_WIDTH +=10;
			console.log("No panes, guessing padding")
		}

		var borderHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--border-width'))

		PANE_WIDTH += borderHeight*2

		var maxDisplayableColumns = getMaxDisplayableColumnCount();
		var repositionFunction = function () { };
		if (layoutWidgets) {
			repositionFunction = function (index) {
				var paneElement = this;
				var paneModel = ko.dataFor(paneElement);

				var newPosition = getPositionForScreenSize(paneModel);
				$(paneElement).attr("data-sizex", Math.min(paneModel.col_width(),
					maxDisplayableColumns, grid.cols))
					.attr("data-row", newPosition.row)
					.attr("data-col", newPosition.col);

				paneModel.processSizeChange();
			}
		}

		updateGridWidth(Math.min(maxDisplayableColumns, userColumns));

		repositionGrid(repositionFunction);
		updateGridColumnControls();
		if (true) {
			try {
				textFit($('#board-logo'))
				textFit($('.gs_w header h1'))
				textFit($('#datasources h2'))
				textFit($('#globalSettingsDialog h2'))
				textFit($('.jsgrid-header-cell:not(.jsgrid-control-field)'))
			}
			catch (e) {
				console.log(e)
			}
		}
		try {
			textFit($('.fullwidth-button'),{alignHoriz: true,alignVert:true})		
		}
		catch (e) {
			console.log(e)
		}

	}

	function addGridColumn(shift) {
		var num_cols = grid.cols + 1;
		if (updateGridWidth(num_cols)) {
			repositionGrid(function () {
				var paneElement = this;
				var paneModel = ko.dataFor(paneElement);

				var prevColumnIndex = grid.cols > 1 ? grid.cols - 1 : 1;
				var prevCol = paneModel.col[prevColumnIndex];
				var prevRow = paneModel.row[prevColumnIndex];
				var newPosition;
				if (shift) {
					leftPreviewCol = true;
					var newCol = prevCol < grid.cols ? prevCol + 1 : grid.cols;
					newPosition = { row: prevRow, col: newCol };
				}
				else {
					rightPreviewCol = true;
					newPosition = { row: prevRow, col: prevCol };
				}
				$(paneElement).attr("data-sizex", Math.min(paneModel.col_width(), grid.cols))
					.attr("data-row", newPosition.row)
					.attr("data-col", newPosition.col);
			});
		}
		updateGridColumnControls();
		userColumns = grid.cols;
	}

	function subtractGridColumn(shift) {
		var num_cols = grid.cols - 1;
		if (updateGridWidth(num_cols)) {
			repositionGrid(function () {
				var paneElement = this;
				var paneModel = ko.dataFor(paneElement);

				var prevColumnIndex = grid.cols + 1;
				var prevCol = paneModel.col[prevColumnIndex];
				var prevRow = paneModel.row[prevColumnIndex];
				var newPosition;
				if (shift) {
					var newCol = prevCol > 1 ? prevCol - 1 : 1;
					newPosition = { row: prevRow, col: newCol };
				}
				else {
					var newCol = prevCol <= grid.cols ? prevCol : grid.cols;
					newPosition = { row: prevRow, col: newCol };
				}
				$(paneElement).attr("data-sizex", Math.min(paneModel.col_width(), grid.cols))
					.attr("data-row", newPosition.row)
					.attr("data-col", newPosition.col);
			});
		}
		updateGridColumnControls();
		userColumns = grid.cols;
	}

	function updateGridColumnControls() {
		var col_controls = $(".column-tool");
		var available_width = $("#board-content").width();
		var max_columns = Math.floor(available_width / COLUMN_WIDTH);

		if (grid.cols <= MIN_COLUMNS) {
			col_controls.addClass("min");
		}
		else {
			col_controls.removeClass("min");
		}

		if (grid.cols >= max_columns) {
			col_controls.addClass("max");
		}
		else {
			col_controls.removeClass("max");
		}
	}

	function getMaxDisplayableColumnCount() {
		var available_width = $("#board-content").width();
		return Math.floor(available_width / COLUMN_WIDTH);
	}

	function updateGridWidth(newCols) {
		if (newCols === undefined || newCols < MIN_COLUMNS) {
			newCols = MIN_COLUMNS;
		}

		var max_columns = getMaxDisplayableColumnCount();
		if (newCols > max_columns) {
			newCols = max_columns;
		}

		// +newCols to account for scaling on zoomed browsers
		var new_width = (COLUMN_WIDTH * newCols) + newCols;
		$(".responsive-column-width").css("max-width", new_width);

		if (newCols === grid.cols) {
			return false;
		}
		else {
			return true;
		}
	}

	function repositionGrid(repositionFunction) {
		var rootElement = grid.$el;

		rootElement.find("> li").unbind().removeData();
		$(".responsive-column-width").css("width", "");
		grid.generate_grid_and_stylesheet();

		rootElement.find("> li").each(repositionFunction);

		grid.init();
		$(".responsive-column-width").css("width", grid.cols * PANE_WIDTH + (grid.cols * PANE_MARGIN * 2));
	}

	function getUserColumns() {
		return userColumns;
	}

	function setUserColumns(numCols) {
		userColumns = Math.max(MIN_COLUMNS, numCols);
	}

	ko.bindingHandlers.grid = {
		init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
			// Initialize our grid
			freeboard._gridRootElement = element
			grid = $(element).gridster({
				widget_margins: [PANE_MARGIN, PANE_MARGIN],
				widget_base_dimensions: [PANE_WIDTH, 10],
				resize: {
					enabled: false,
					axes: "x"
				}
			}).data("gridster");

			processResize(false)

			grid.disable();
		}
	}

	function addPane(element, viewModel, isEditing) {
		var position = getPositionForScreenSize(viewModel);
		var col = position.col;
		var row = position.row;
		var width = Number(viewModel.width());
		var height = Number(viewModel.getCalculatedHeight());

		grid.add_widget(element, width, height, col, row);

		if (isEditing) {
			showPaneEditIcons(true);
		}

		updatePositionForScreenSize(viewModel, row, col);

		$(element).attrchange({
			trackValues: true,
			callback: function (event) {
				if (event.attributeName == "data-row") {
					updatePositionForScreenSize(viewModel, Number(event.newValue), undefined);
				}
				else if (event.attributeName == "data-col") {
					updatePositionForScreenSize(viewModel, undefined, Number(event.newValue));
				}
			}
		});
	}

	function updatePane(element, viewModel) {
		// If widget has been added or removed
		var calculatedHeight = viewModel.getCalculatedHeight();

		var elementHeight = Number($(element).attr("data-sizey"));
		var elementWidth = Number($(element).attr("data-sizex"));

		if (calculatedHeight != elementHeight || viewModel.col_width() != elementWidth) {
			grid.resize_widget($(element), viewModel.col_width(), calculatedHeight, function () {
				grid.set_dom_grid_height();
			});
		}
	}

	function updatePositionForScreenSize(paneModel, row, col) {
		var displayCols = grid.cols;

		if (!_.isUndefined(row)) paneModel.row[displayCols] = row;
		if (!_.isUndefined(col)) paneModel.col[displayCols] = col;
	}

	function showLoadingIndicator(show) {
		if (show) {
			loadingIndicator.fadeOut(0).appendTo("body").fadeIn(500);
		}
		else {
			loadingIndicator.fadeOut(500).remove();
		}
	}

	function showPaneEditIcons(show, animate) {
		if (_.isUndefined(animate)) {
			animate = true;
		}

		var animateLength = (animate) ? 250 : 0;

		if (show) {
			$(".pane-tools").fadeIn(animateLength);//.css("display", "block").animate({opacity: 1.0}, animateLength);
			$("#column-tools").fadeIn(animateLength);
		}
		else {
			$(".pane-tools").fadeOut(animateLength);//.animate({opacity: 0.0}, animateLength).css("display", "none");//, function()
			$("#column-tools").fadeOut(animateLength);
		}
	}

	function attachWidgetEditIcons(element) {
		$(element).hover(function () {
			showWidgetEditIcons(this, true);
		}, function () {
			showWidgetEditIcons(this, false);
		});
	}

	function showWidgetEditIcons(element, show) {
		if (show) {
			$(element).find(".sub-section-tools").fadeIn(250);
		}
		else {
			$(element).find(".sub-section-tools").fadeOut(250);
		}
	}

	function getPositionForScreenSize(paneModel) {
		var cols = grid.cols;

		if (_.isNumber(paneModel.row) && _.isNumber(paneModel.col)) // Support for legacy format
		{
			var obj = {};
			obj[cols] = paneModel.row;
			paneModel.row = obj;


			obj = {};
			obj[cols] = paneModel.col;
			paneModel.col = obj;
		}

		var newColumnIndex = 1;
		var columnDiff = 1000;

		for (var columnIndex in paneModel.col) {
			if (columnIndex == cols)	 // If we already have a position defined for this number of columns, return that position
			{
				return { row: paneModel.row[columnIndex], col: paneModel.col[columnIndex] };
			}
			else if (paneModel.col[columnIndex] > cols) // If it's greater than our display columns, put it in the last column
			{
				newColumnIndex = cols;
			}
			else // If it's less than, pick whichever one is closest
			{
				var delta = cols - columnIndex;

				if (delta < columnDiff) {
					newColumnIndex = columnIndex;
					columnDiff = delta;
				}
			}
		}

		if (newColumnIndex in paneModel.col && newColumnIndex in paneModel.row) {
			return { row: paneModel.row[newColumnIndex], col: paneModel.col[newColumnIndex] };
		}

		return { row: 1, col: newColumnIndex };
	}


	// Public Functions
	return {
		showLoadingIndicator: function (show) {
			showLoadingIndicator(show);
		},
		showPaneEditIcons: function (show, animate) {
			showPaneEditIcons(show, animate);
		},
		attachWidgetEditIcons: function (element) {
			attachWidgetEditIcons(element);
		},
		getPositionForScreenSize: function (paneModel) {
			return getPositionForScreenSize(paneModel);
		},
		processResize: function (layoutWidgets) {
			processResize(layoutWidgets);
		},
		disableGrid: function () {
			grid.disable();
		},
		enableGrid: function () {
			grid.enable();
		},
		addPane: function (element, viewModel, isEditing) {
			addPane(element, viewModel, isEditing);
		},
		updatePane: function (element, viewModel) {
			updatePane(element, viewModel);
		},
		removePane: function (element) {
			grid.remove_widget(element);
		},
		removeAllPanes: function () {
			grid.remove_all_widgets();
		},
		addGridColumnLeft: function () {
			addGridColumn(true);
		},
		addGridColumnRight: function () {
			addGridColumn(false);
		},
		subGridColumnLeft: function () {
			subtractGridColumn(true);
		},
		subGridColumnRight: function () {
			subtractGridColumn(false);
		},
		getUserColumns: function () {
			return getUserColumns();
		},
		setUserColumns: function (numCols) {
			setUserColumns(numCols);
		}
	}
}
