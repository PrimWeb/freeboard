function DialogBox(contentElement, title, okTitle, cancelTitle, okCallback,cancelCallback)
{
	var modal_width = 900;

	// Initialize our modal overlay
	var overlay = $('<div id="modal_overlay" style="display:none;"></div>');

	var modalDialog = $('<div class="modal"></div>');

	function closeModal()
	{
		overlay.fadeOut(200, function()
		{
			$(this).remove();
		});
	}

	// Create our header
	var x = $('<h2 class="title">' + title + '</h2>')//.css('height','25px').css('width',"800px")
	var y = $('<header></header>')//.css('overflow','hidden')
	y.append(x)
	modalDialog.append(y)	

	$('<section></section>').appendTo(modalDialog).append(contentElement);

	// Create our footer
	var footer = $('<footer></footer>').appendTo(modalDialog);

	if(okTitle)
	{
		$('<span id="dialog-ok" class="text-button"> ' + okTitle + '</span>').appendTo(footer).click(function()
		{
			var hold = false;

			if(_.isFunction(okCallback))
			{
				hold = okCallback();
			}

			if(!hold)
			{
				closeModal();
			}
		});
	}

	if(cancelTitle)
	{
		$('<span id="dialog-cancel" class="text-button"> ' + cancelTitle + '</span>').appendTo(footer).click(function()
		{
			if(_.isFunction(cancelCallback))
			{
				cancelCallback();
			}


			closeModal();
		});
	}

	overlay.append(modalDialog);
	$("body").append(overlay);
	setTimeout(function(){ textFit(x)},10);

	overlay.fadeIn(200);
}
