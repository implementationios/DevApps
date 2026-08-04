/**
 * InputAdapter
 *
 * `Keyboard` (core/module/keyboard.js) espera un objeto "input" con esta
 * interfaz: insert(char), backspace(), moveCaret(direction, special),
 * clearAllText(), blur(), getValue(). La clase `Input` (core/module/input.js) la
 * implementa creando su propio DOM (texto + cursor parpadeante), pero eso
 * exige rehacer el markup/estilos de cada campo existente.
 *
 * `InputAdapter` implementa la MISMA interfaz pero escribe directamente
 * sobre un <input> real ya existente (vía jQuery .val()), sin crear DOM
 * propio. Así se puede reemplazar el teclado nativo del dispositivo (OSK)
 * por el teclado propio (Keyboard) en campos que ya existen (login,
 * búsqueda) sin tocar su estilo.
 *
 * @mixins Events
 */
InputAdapter = (function (Events) {
	var InputAdapter = function ($el) {
		this.$el = $el;
		this.value = ($el && $el.val()) || '';
		this.cursorPos = this.value.length;
	};

	$.extend(true, InputAdapter.prototype, Events, {
		/**
		 * Inserta un carácter en la posición actual del cursor.
		 * @param {String} xchar
		 * @fires inserted
		 */
		insert: function (xchar) {
			var before = this.value.substring(0, this.cursorPos);
			var after = this.value.substring(this.cursorPos);
			this.value = before + xchar + after;
			this.cursorPos += xchar.length;
			this.$el.val(this.value);
			this.trigger('inserted', this.value, xchar);
		},

		/**
		 * Borra el carácter anterior a la posición del cursor.
		 * @fires backspace
		 */
		backspace: function () {
			if (this.cursorPos > 0) {
				var before = this.value.substring(0, this.cursorPos - 1);
				var after = this.value.substring(this.cursorPos);
				this.value = before + after;
				this.cursorPos -= 1;
				this.$el.val(this.value);
			}
			this.trigger('backspace', this.value, this.cursorPos);
		},

		/**
		 * Devuelve el texto actual (usado por Keyboard para el modo "auto" de
		 * sugerencias, ver setSuggestionSource() en keyboard.js).
		 * @returns {String}
		 */
		getValue: function () {
			return this.value;
		},

		/**
		 * Mueve el cursor lógico (no hay cursor visual propio, ver clase Input
		 * para eso).
		 * @param {Number} direction 1 derecha, -1 izquierda
		 * @param {String} [special] 'start' o 'end'
		 */
		moveCaret: function (direction, special) {
			if (special === 'start') {
				this.cursorPos = 0;
			} else if (special === 'end') {
				this.cursorPos = this.value.length;
			} else {
				this.cursorPos += direction;
				if (this.cursorPos < 0) this.cursorPos = 0;
				if (this.cursorPos > this.value.length) this.cursorPos = this.value.length;
			}
		},

		/**
		 * Vacía el campo.
		 * @fires clear-all-text
		 */
		clearAllText: function () {
			this.value = '';
			this.cursorPos = 0;
			this.$el.val('');
			this.trigger('clear-all-text');
		},

		/**
		 * No-op: se reutiliza el <input> real (readonly), no hay overlay de
		 * texto/cursor propio que ocultar.
		 */
		blur: function () {}
	});

	return InputAdapter;
})(Events);
