/*
 *******************************************************************************

 * All rights reserved
 *  

 *
 * You may obtain a copy of the License at LICENSE.txt
 *******************************************************************************
 */

/**
 * Toshiba keyboard support
 * 
 * @author AuroraTech
 * @class Device_Toshiba_Keyboard
 * @extends Keyboard
 */

Device_Toshiba_Keyboard = (function () {
	var Device_Toshiba_Keyboard =  function () {
		this.init.apply(this, arguments);
	};

	$.extend(true, Device_Toshiba_Keyboard.prototype, {
		init: function() {
		},

		show: function (input, lang) {
			input.$el.focus();
		},

	});

	return Device_Toshiba_Keyboard;

})();
