/*
 *******************************************************************************

 * All rights reserved
 *  

 *
 * You may obtain a copy of the License at LICENSE.txt
 *******************************************************************************
 */

/**
 * Keyboard class
 * TODO - config override for layouts
 * 
 * Limitations - Samsung - this virtual Keyboard doesn't work with External USB keyboard (keys a-z). It won't be fixed: http://www.samsungdforum.com/SamsungDForum/ForumView/df3455b529adf7c4?forumID=a44c9c78b565ea69
 * 
 * @author AuroraTech
 * @class Keyboard
 * @abstract
 * @mixins Events
 */

Keyboard = (function (Events) {
	var Keyboard = {};

	$.extend(true, Keyboard, Events, {
		/**
		 * @property {Object} config General config hash
		 */
		config: {
			oneLayout: false, // only one layout
			suggestionsLimit: 3 // máximo de chips de sugerencia mostrados a la vez
		},
		/**
		 * Init Keyboard object
		 * @param {Object} [config={}] Keyboard configuration
		 */
		init: function (config) {
			this.configure(config);
			this.create();
			this.layouts = { // v - values; s - size; t - type (K key, F function key, S space, N numeric key); sec - secundary button; w - change width in %;
				"SPECIAL": {
					layout: [
						[
							{ v: ".com", s: 2, t: "K" },
							{ v: "#", t: "K" },
							{ v: "$", t: "K" },
							{ v: "%", t: "K" },
							{ v: "-", t: "K" },
							{ v: "_", t: "K" },
							{ v: "+", t: "K" },
							{ v: "(", t: "K" },
							{ v: ")", t: "K" },
							{ v: "/", s: 1, t: "K" },
							{ v: "*", s: 1, t: "K" },
							{ v: "BSP", t: "F" },
							{ v: "7", t: "N" },
							{ v: "8", t: "N" },
							{ v: "9", t: "N" }
						],
						[
							{ v: ".net", s: 2, t: "K" },
							{ v: "\"", t: "K" },
							{ v: "'", t: "K" },
							{ v: ":", t: "K" },
							{ v: ";", t: "K" },
							{ v: "?", t: "K" },
							{ v: "~", t: "K" },
							{ v: "`", t: "K" },
							{ v: "|", t: "K" },
							{ v: "@", s: 1, t: "K" },
							{ v: "Done", id: "done", t: "F", s: 2 },
							{ v: "4", t: "N" },
							{ v: "5", t: "N" },
							{ v: "6", t: "N" }
						],
						[
							{ v: ".cz", s: 2, t: "K" },
							{ v: "{", t: "K" },
							{ v: "}", t: "K" },
							{ v: "^", t: "K" },
							{ v: "=", t: "K" },
							{ v: "[", t: "K" },
							{ v: "]", t: "K" },
							{ v: "\\", t: "K" },
							{ v: "<", t: "K" },
							{ v: ">", t: "K" },
							{ v: "!", t: "K" },
							{ v: "&", t: "K" },
							{ v: "1", t: "N" },
							{ v: "2", t: "N" },
							{ v: "3", t: "N" }
						],
						[
							{ v: "", s: 3, t: "F" }, // empty space
							{ v: "GEAR", s: 1, t: "F" },
							{ v: ".", s: 1, t: "K" },
							{ v: "SPACE", s: 4, t: "F" },
							{ v: ",", t: "K" },
							{ v: "CA", s: 1, t: "F" },
							{ v: "LC", t: "F" },
							{ v: "RC", t: "F" },
							{ v: "0", s: 1, t: "N" },
							{ v: "", s: 2, t: "F" }, // empty space
						]
					]
				},
				"ONELAYOUT": { // override for one layout - bottom 4th line
					layout: [
						{ v: ".cz", s: 2, t: "K" },
						{ v: ".com", s: 2, t: "K" },
						{ v: ".", s: 1, t: "K" },
						{ v: "SPACE", s: 4, t: "F" },
						{ v: "@", s: 1, t: "K" },
						{ v: "CA", s: 1, t: "F" },
						{ v: "LC", t: "F" },
						{ v: "RC", t: "F" },
						{ v: "0", s: 1, t: "N" },
						{ v: "/", s: 1, t: "K" },
						{ v: "*", s: 1, t: "K" }
					]
				},
				// Rediseño completo (2ª vuelta): antes cada fila mezclaba letras +
				// columna numérica + símbolos (13-16 celdas por fila) -- teclas
				// chicas y look de teclado de hace 10 años. Ahora: 3 filas de
				// SOLO letras, las tres con exactamente 10 columnas (misma
				// cantidad, para que subir/bajar entre ellas quede alineado por
				// columna de forma predecible) + 1 fila de controles abajo.
				// Números/símbolos en la capa SPECIAL (tecla GEAR). Sin SHIFT
				// (redundante con CAPSLOCK acá: usuario/búsqueda, no texto largo
				// con mayúsculas intercaladas).
				"EN": {
					layout: [
						[
							{ v: "q", t: "K" },
							{ v: "w", t: "K" },
							{ v: "e", t: "K" },
							{ v: "r", t: "K" },
							{ v: "t", t: "K" },
							{ v: "y", t: "K" },
							{ v: "u", t: "K" },
							{ v: "i", t: "K" },
							{ v: "o", t: "K" },
							{ v: "p", t: "K" }
						],
						[
							{ v: "a", t: "K" },
							{ v: "s", t: "K" },
							{ v: "d", t: "K" },
							{ v: "f", t: "K" },
							{ v: "g", t: "K" },
							{ v: "h", t: "K" },
							{ v: "j", t: "K" },
							{ v: "k", t: "K" },
							{ v: "l", t: "K" },
							{ v: "BSP", t: "F" }
						],
						[
							{ v: "Caps Lock", s: 2, t: "F", id: "CAPSLOCK" },
							{ v: "z", t: "K" },
							{ v: "x", t: "K" },
							{ v: "c", t: "K" },
							{ v: "v", t: "K" },
							{ v: "b", t: "K" },
							{ v: "n", t: "K" },
							{ v: "m", t: "K" },
							{ v: ".", t: "K" }
						],
						[
							{ v: "GEAR", s: 1, t: "F" },
							{ v: "Arabic", s: 2, t: "F", id: "LANGCHANGE" },
							{ v: "SPACE", s: 4, t: "F" },
							{ v: "CA", s: 1, t: "F" },
							{ v: "LC", t: "F" },
							{ v: "RC", t: "F" },
							{ v: "@", s: 1, t: "K" },
							{ v: "Done", id: "done", t: "F", s: 2 }
						]
					]
				},
				"AR": {
					layout: [
						[
							{ v: "ض", t: "K" },
							{ v: "ص", t: "K" },
							{ v: "ث", t: "K" },
							{ v: "ق", t: "K" },
							{ v: "ف", t: "K" },
							{ v: "غ", t: "K" },
							{ v: "ع", t: "K" },
							{ v: "ه", t: "K" },
							{ v: "خ", t: "K" },
							{ v: "ح", t: "K" },
							{ v: "ج", t: "K" },
							{ v: "د", t: "K" },
							{ v: "BSP", t: "F" },
							{ v: "7", t: "N" },
							{ v: "8", t: "N" },
							{ v: "9", t: "N" }
						],
						[
							{ v: "ش", t: "K" },
							{ v: "س", t: "K" },
							{ v: "ي", t: "K" },
							{ v: "ب", t: "K" },
							{ v: "ل", t: "K" },
							{ v: "ا", t: "K" },
							{ v: "ت", t: "K" },
							{ v: "ن", t: "K" },
							{ v: "م", t: "K" },
							{ v: "ك", t: "K" },
							{ v: "ط", t: "K" },
							{ v: "منتهى", id: "done", t: "F", s: 2 },
							{ v: "4", t: "N" },
							{ v: "5", t: "N" },
							{ v: "6", t: "N" }
						],
						[
							{ v: "#", t: "K" },
							{ v: "ئ", t: "K" },
							{ v: "ء", t: "K" },
							{ v: "ؤ", t: "K" },
							{ v: "ر", t: "K" },
							{ v: "لا", t: "K" },
							{ v: "ى", t: "K" },
							{ v: "ة", t: "K" },
							{ v: "و", t: "K" },
							{ v: "ز", t: "K" },
							{ v: "ظ", t: "K" },
							{ v: "_", t: "K" },
							{ v: "-", t: "K" },
							{ v: "1", t: "N" },
							{ v: "2", t: "N" },
							{ v: "3", t: "N" }
						],
						[
							{ v: "English", s: 3, t: "F", id: "LANGCHANGE" },
							{ v: ".", s: 1, t: "K" },
							{ v: "SPACE", s: 5, t: "F" },
							{ v: "@", s: 1, t: "K" },
							{ v: "CA", s: 1, t: "F" },
							{ v: "LC", t: "F" },
							{ v: "RC", t: "F" },
							{ v: "0", s: 1, t: "N" },
							{ v: "/", s: 1, t: "K" },
							{ v: "*", s: 1, t: "K" }
						]
					]
				},
				// Idiomas agregados para que el teclado cubra los mismos idiomas
				// configurados en el i18n de la app (antes solo existían layouts
				// para EN y AR, así que ES/PT/HU/SK caían en el layout de inglés
				// en silencio). Los acentos más comunes de cada idioma se escriben
				// pulsando dos veces la misma tecla en menos de 1 segundo (mismo
				// mecanismo "sec" que ya usaba el layout EN). Cobertura de acentos
				// no exhaustiva por limitación de ese mecanismo (una sola variante
				// por tecla) -- cubre los caracteres más frecuentes de cada idioma;
				// se puede refinar por idioma si se necesita.
				"ES": {
					layout: [
						[
							{ v: "q", t: "K" },
							{ v: "w", t: "K" },
							{ v: "e", t: "K", sec: "é" },
							{ v: "r", t: "K" },
							{ v: "t", t: "K" },
							{ v: "y", t: "K" },
							{ v: "u", t: "K", sec: "ú" },
							{ v: "i", t: "K", sec: "í" },
							{ v: "o", t: "K", sec: "ó" },
							{ v: "p", t: "K" }
						],
						[
							{ v: "a", t: "K", sec: "á" },
							{ v: "s", t: "K" },
							{ v: "d", t: "K" },
							{ v: "f", t: "K" },
							{ v: "g", t: "K" },
							{ v: "h", t: "K" },
							{ v: "j", t: "K" },
							{ v: "k", t: "K" },
							{ v: "l", t: "K" },
							{ v: "BSP", t: "F" }
						],
						[
							{ v: "Caps Lock", s: 2, t: "F", id: "CAPSLOCK" },
							{ v: "z", t: "K" },
							{ v: "x", t: "K" },
							{ v: "c", t: "K" },
							{ v: "v", t: "K" },
							{ v: "b", t: "K" },
							{ v: "n", t: "K" },
							{ v: "m", t: "K" },
							{ v: "ñ", t: "K" }
						],
						[
							{ v: "GEAR", s: 1, t: "F" },
							{ v: "", s: 2, t: "F", id: "LANGCHANGE" }, // etiqueta/target asignados en wireLangChangeButtons()
							{ v: "SPACE", s: 4, t: "F" },
							{ v: "CA", s: 1, t: "F" },
							{ v: "LC", t: "F" },
							{ v: "RC", t: "F" },
							{ v: "@", s: 1, t: "K" },
							{ v: "Done", id: "done", t: "F", s: 2 }
						]
					]
				},
				"PT": {
					layout: [
						[
							{ v: "q", t: "K" },
							{ v: "w", t: "K" },
							{ v: "e", t: "K", sec: "é" },
							{ v: "r", t: "K" },
							{ v: "t", t: "K" },
							{ v: "y", t: "K" },
							{ v: "u", t: "K", sec: "ú" },
							{ v: "i", t: "K", sec: "í" },
							{ v: "o", t: "K", sec: "ó" },
							{ v: "p", t: "K" }
						],
						[
							{ v: "a", t: "K", sec: "á" },
							{ v: "s", t: "K" },
							{ v: "d", t: "K" },
							{ v: "f", t: "K" },
							{ v: "g", t: "K" },
							{ v: "h", t: "K" },
							{ v: "j", t: "K" },
							{ v: "k", t: "K" },
							{ v: "l", t: "K" },
							{ v: "BSP", t: "F" }
						],
						[
							{ v: "Caps Lock", s: 2, t: "F", id: "CAPSLOCK" },
							{ v: "z", t: "K" },
							{ v: "x", t: "K" },
							{ v: "c", t: "K" },
							{ v: "v", t: "K" },
							{ v: "b", t: "K" },
							{ v: "n", t: "K" },
							{ v: "m", t: "K" },
							{ v: "ç", t: "K" }
						],
						[
							{ v: "GEAR", s: 1, t: "F" },
							{ v: "", s: 2, t: "F", id: "LANGCHANGE" },
							{ v: "SPACE", s: 4, t: "F" },
							{ v: "CA", s: 1, t: "F" },
							{ v: "LC", t: "F" },
							{ v: "RC", t: "F" },
							{ v: "@", s: 1, t: "K" },
							{ v: "Done", id: "done", t: "F", s: 2 }
						]
					]
				},
				"HU": {
					layout: [
						[
							{ v: "q", t: "K" },
							{ v: "w", t: "K" },
							{ v: "e", t: "K", sec: "é" },
							{ v: "r", t: "K" },
							{ v: "t", t: "K" },
							{ v: "y", t: "K" },
							{ v: "u", t: "K", sec: "ü" },
							{ v: "i", t: "K", sec: "í" },
							{ v: "o", t: "K", sec: "ö" },
							{ v: "p", t: "K" }
						],
						[
							{ v: "a", t: "K", sec: "á" },
							{ v: "s", t: "K" },
							{ v: "d", t: "K" },
							{ v: "f", t: "K" },
							{ v: "g", t: "K" },
							{ v: "h", t: "K" },
							{ v: "j", t: "K" },
							{ v: "k", t: "K" },
							{ v: "l", t: "K" },
							{ v: "BSP", t: "F" }
						],
						[
							{ v: "Caps Lock", s: 2, t: "F", id: "CAPSLOCK" },
							{ v: "z", t: "K" },
							{ v: "x", t: "K" },
							{ v: "c", t: "K" },
							{ v: "v", t: "K" },
							{ v: "b", t: "K" },
							{ v: "n", t: "K" },
							{ v: "m", t: "K" },
							{ v: ".", t: "K" }
						],
						[
							{ v: "GEAR", s: 1, t: "F" },
							{ v: "", s: 2, t: "F", id: "LANGCHANGE" },
							{ v: "SPACE", s: 4, t: "F" },
							{ v: "CA", s: 1, t: "F" },
							{ v: "LC", t: "F" },
							{ v: "RC", t: "F" },
							{ v: "@", s: 1, t: "K" },
							{ v: "Done", id: "done", t: "F", s: 2 }
						]
					]
				},
				"SK": {
					layout: [
						[
							{ v: "q", t: "K" },
							{ v: "w", t: "K" },
							{ v: "e", t: "K", sec: "é" },
							{ v: "r", t: "K" },
							{ v: "t", t: "K" },
							{ v: "y", t: "K", sec: "ý" },
							{ v: "u", t: "K", sec: "ú" },
							{ v: "i", t: "K", sec: "í" },
							{ v: "o", t: "K", sec: "ó" },
							{ v: "p", t: "K" }
						],
						[
							{ v: "a", t: "K", sec: "á" },
							{ v: "s", t: "K" },
							{ v: "d", t: "K" },
							{ v: "f", t: "K" },
							{ v: "g", t: "K" },
							{ v: "h", t: "K" },
							{ v: "j", t: "K" },
							{ v: "k", t: "K" },
							{ v: "l", t: "K" },
							{ v: "BSP", t: "F" }
						],
						[
							{ v: "Caps Lock", s: 2, t: "F", id: "CAPSLOCK" },
							{ v: "č", t: "K" },
							{ v: "z", t: "K" },
							{ v: "x", t: "K" },
							{ v: "c", t: "K" },
							{ v: "v", t: "K" },
							{ v: "b", t: "K" },
							{ v: "n", t: "K" },
							{ v: "m", t: "K" },
							{ v: "š", t: "K" },
							{ v: "ž", t: "K" }
						],
						[
							{ v: "GEAR", s: 1, t: "F" },
							{ v: "", s: 2, t: "F", id: "LANGCHANGE" },
							{ v: "SPACE", s: 4, t: "F" },
							{ v: "CA", s: 1, t: "F" },
							{ v: "LC", t: "F" },
							{ v: "RC", t: "F" },
							{ v: "@", s: 1, t: "K" },
							{ v: "Done", id: "done", t: "F", s: 2 }
						]
					]
				}
			};

			this.initEvents();

			this.enums = { "BOTTOM": 0, "TOP": 1, "NORESTRICTION": 2, "ONLYNUMBERS": 3 };

			this.position = { x: 0, y: 0 };
			this.keyboardPosition = this.enums["BOTTOM"];
			this.mode = this.enums["NORESTRICTION"];

			this.capsLock = false;
			this.specialState = false;
			this.accentsState = false;

			// Sugerencias predictivas (fila de chips sobre el teclado, ver
			// setSuggestions()/setSuggestionSource()). `suggestions` es la lista
			// realmente mostrada ahora mismo; `suggestionSource` es una lista
			// estática opcional que, si se define, hace que el propio teclado
			// filtre y arme `suggestions` en cada tecla (modo "auto"). Si el
			// llamador arma sus resultados por su cuenta (ej. Search.js, que ya
			// tiene una búsqueda con debounce/relevancia), usa setSuggestions()
			// directamente y suggestionSource queda vacío (modo "manual").
			this.suggestions = [];
			this.suggestionSource = [];
			this.suggestReturnX = 0; // columna de la fila superior a la que volver al salir de sugerencias

			// variables for repeat pressing on keys to write the accents
			this.accentsTime = 0;
			this.accentsTimeRepeat = 1000; // time in miliseconds
			this.accentsKey = false;

			// only one layout
			if (this.config.oneLayout) {
				this.layouts["EN"].layout[3] = this.layouts["ONELAYOUT"].layout;
			}

			// Idiomas disponibles para ciclar con el botón LANGCHANGE: la
			// intersección entre lo que la app tiene realmente cargado en el
			// i18n (I18n.translations, que depende de qué js/i18n/*.js incluye
			// el index.html de cada marca) y los idiomas con layout de teclado
			// definido arriba. Se recalcula aquí para que agregar un idioma
			// nuevo sea (1) su archivo de traducciones, (2) incluirlo en
			// index.html y (3) agregar su layout arriba -- sin más cambios.
			this.cycleLangs = this.getCycleLanguages();
			this.wireLangChangeButtons();
		},
		/**
			 * Set class config hash
			 * 
			 * @param {Object} config Hash of parameters
			 */
		configure: function (config) {
			this.config = $.extend(true, this.config || {}, config);
		},
		/**
		 * Bind events for mouse and keyboard.
		*/
		initEvents: function () {
			Control.on('key', this.onKeyDown, this);
			Mouse.on('click', this.onClick, this);
		},
		/**
		 * Handle keydown keyboard function.
		 * @param {Object} $el Target element, jQuery collection
		 * @param {Event} event
		*/
		onKeyDown: function ($el, event) {
			if (!this.$el.is(":visible")) return;

			var keyCode;
			if (typeof event === 'object') {
				keyCode = event.keyCode;
			} else {
				keyCode = event;
			}

			if (keyCode == Control.key.RETURN) {
				this.exit();
			}
			else if (keyCode == Control.key.ENTER) {
				this.onEnter($el);
			}
			else if (keyCode == 32) { // spacebar todo
				if (typeof event === 'object') {
					event.preventDefault();
				}
				this.insertValue(" ", "SPACE");
			}
			else if (Control.isNavigational(keyCode)) {
				var direction = "left";
				if (keyCode == Control.key.RIGHT) direction = "right";
				else if (keyCode == Control.key.UP) direction = "up";
				else if (keyCode == Control.key.DOWN) direction = "down";

				this.navigate(direction);
			}
			else if(this.isForbiddenKey(keyCode)) {
				// do nothing
			}
			else if (Control.isNumeric(keyCode)) {
				if (typeof event === 'object') {
					event.stopPropagation();
					event.preventDefault();
				}
				var value = Control.getTextValue(keyCode);
				this.insertValue(value, "NUMERIC");
				this.focusByInput(value);
			}
			else if (keyCode >= 65 && keyCode <= 90) {
				if (typeof event === 'object') {
					event.stopPropagation();
					event.preventDefault();
				}
				var value = String.fromCharCode(keyCode);
				value = value.toLowerCase();
				this.insertValue(value, "LETTER");
				this.focusByInput(value);
			}

			// Importante: mientras el teclado está visible, NINGUNA tecla debe
			// seguir propagándose a la Scene activa de fondo (antes solo RETURN
			// detenía la propagación devolviendo `false`; el resto caía en
			// `undefined` y la Scene de fondo también reaccionaba a la misma
			// tecla -por ejemplo moviendo el foco de la grilla EPG mientras se
			// escribe-). Como este teclado nunca se había conectado hasta ahora,
			// este riesgo estaba latente sin manifestarse.
			return false;
		},

		/**
		 * Check forbidden keys for onKeyDown. Currently it is implemented only for Samsung (Orsay) models. 
         * @param {Number} keyCode Key code which be checked if is forbidden or not
         * @returns {Boolean} Flag if key is forbidden or not
		 */
		isForbiddenKey: function(keyCode) {
			var isForbiddenKey = false;
			if (Device.isSAMSUNG) {
				var forbiddenKeys = [Control.key.PLAY_PAUSE, Control.key.PLAY, Control.key.PAUSE, Control.key.STOP, Control.key.FF, Control.key.RW, 
									Control.key.PUP, Control.key.PDOWN, Control.key.CHLIST, Control.key.TOOLS];
				isForbiddenKey = forbiddenKeys.indexOf(keyCode) >= 0 ? true : false;
			}

			return isForbiddenKey;
		},

		/**
		 * Enter action for keys, this function also uses mouse click.
        * @param {Object} $el Target element, on which element is used enter
		*/
		onEnter: function ($el) {
			// Chip de sugerencia: no vive en this.layouts, se resuelve aparte.
			if (Focus.focused.hasClass("suggest")) {
				return this.selectSuggestion(parseInt(Focus.focused.attr("data-posx"), 10));
			}

			var posx = parseInt(Focus.focused.attr("data-posx"), 10), posy = parseInt(Focus.focused.attr("data-posy"), 10),
				 selElem = this.specialState ? this.layouts["SPECIAL"].layout[posy][posx] : this.accentsState ? this.layouts["ACENTOS"].layout[posy][posx] : this.layouts[this.lang].layout[posy][posx];

			if (selElem.t == "K") {
				// normal letter assign
				var value = '';
				var date = new Date;
				var time = date.getTime();

				// test if the key was pressed again in the selected time
				if (selElem.sec && this.accentsKey == selElem.v && ((time - this.accentsTime) < this.accentsTimeRepeat)) {
					this.input.backspace();
					value = selElem.sec;
				} else if (selElem.sec && this.accentsKey == selElem.sec && ((time - this.accentsTime) < this.accentsTimeRepeat)) {
					this.input.backspace();
					value = selElem.v;
				} else {
					value = selElem.v;
				}
				this.accentsKey = value;
				this.accentsTime = time;
				this.insertValue(value, "LETTER");
			}
			else if (selElem.t == "N") {
				this.insertValue(selElem.v, "NUMERIC");
			}
			else if (selElem.t == "F") {
				if (selElem.v == "SPACE") {
					this.insertValue(" ", "SPACE");
				}
				else if (selElem.id === "done") {
					this.exit();
				}
				else if (selElem.v == "GEAR") {
					this.specialState = !this.specialState;
					
					if (this.specialState) {
						// show special keys
						this.capsLock = false;
						this.shift = false;
						this.createKeys(this.layouts["SPECIAL"].layout);
						this.input.moveCaret(0, "end"); // move cursor to the end
						// default focus
						Focus.to(this.$el.find(".key[data-val='GEAR']"));
					}
					else {
						// back to normal
						this.capsLock = false;
						this.shift = false;
						this.createKeys();
						Focus.to(this.$el.find(".key[data-val='GEAR']"));
					}
				}
				else if (selElem.v == "CA") {
					// clear all
					this.input.clearAllText();
					this.trigger("insert", ["", 0]); // callback function for inserted value
					this.updateSuggestions();
				}
				else if (selElem.v == "BSP") {
					// call interface
					this.input.backspace();
					this.updateSuggestions();
				}
				else if (selElem.v == "LC") {
					var direction = (this.lang == "AR" ? 1 : -1);
					// call interface
					this.input.moveCaret(direction);
				}
				else if (selElem.v == "RC") {
					var direction = (this.lang == "AR" ? -1 : 1);
					// call interface
					this.input.moveCaret(direction);
				}
				else if (selElem.id == "CAPSLOCK") {
					this.capsLock = !this.capsLock;
					var tt = (this.capsLock ? "uppercase" : "");

					this.$el.find(".tt").each(function () {
						$(this).css("text-transform", tt);
					});
				}
				else if (selElem.v == "SHIFT") {
					this.shift = !this.shift;
					this.capsLock = false;

					var tt = (this.shift ? "uppercase" : "");

					this.$el.find(".tt").each(function () {
						$(this).css("text-transform", tt);
					});
				}
				else if (selElem.id == "LANGCHANGE") {
					// Generalizado para ciclar entre TODOS los idiomas configurados
					// en el i18n de la app (antes alternaba solo entre "English"/
					// "Arabic" fijos por texto). El próximo idioma y su etiqueta se
					// calculan dinámicamente en wireLangChangeButtons().
					this.switchLayout(selElem.target);
				}
			}

			return false;
		},
		/**
		 * Navigate using cursor keys.
        * @param {Number} direction direction of moving
        * @return {Boolean} Return FALSE to prevent event from bubeling
        * @private
		*/
		navigate: function (direction) {
			this.position.x = parseInt(Focus.focused.attr("data-posx"), 10);
			this.position.y = parseInt(Focus.focused.attr("data-posy"), 10);

			// Dentro de la fila de sugerencias (posy -1): izquierda/derecha
			// ciclan entre chips, abajo vuelve a la fila superior del teclado,
			// arriba no hace nada (ya es lo más alto). No pasa por move(), que
			// asume índices de this.layouts y no sabe nada de sugerencias.
			if (this.position.y === -1) {
				if (direction == "left") return this.moveSuggestions(-1);
				else if (direction == "right") return this.moveSuggestions(1);
				else if (direction == "down") return this.leaveSuggestions();
				return false;
			}

			// Desde la fila superior del teclado (posy 0), arriba entra a la
			// fila de sugerencias si hay alguna visible.
			if (this.position.y === 0 && direction == "up" && this.suggestions.length) {
				return this.enterSuggestions();
			}

			if (direction == "left") this.move(-1, 0, "X");
			else if (direction == "right") this.move(1, 0, "X");
			else if (direction == "up") this.move(0, -1, "Y");
			else if (direction == "down") this.move(0, 1, "Y");
			return false;
		},
		/**
		 * Entra a la fila de sugerencias desde la fila superior del teclado.
		 * Siempre aterriza en el primer chip (la sugerencia más relevante,
		 * `this.suggestions` viene ordenado por relevancia): los chips son
		 * pocos (1-3) y no tienen ninguna correspondencia real de columna con
		 * las columnas del teclado, así que "la columna más cercana" sería
		 * arbitraria. La columna de origen se guarda aparte
		 * (this.suggestReturnX) para poder volver a ella con leaveSuggestions().
		 * @private
		 */
		enterSuggestions: function () {
			this.suggestReturnX = this.position.x;

			this.position.y = -1;
			this.position.x = 0;
			Focus.to(this.$el.find(".key.suggest[data-posx='0']"));
			return false;
		},
		/**
		 * Vuelve de la fila de sugerencias a la fila superior del teclado
		 * (posy 0), a la columna desde donde se entró (this.suggestReturnX).
		 * @private
		 */
		leaveSuggestions: function () {
			var layout = this.specialState ? this.layouts["SPECIAL"].layout : this.layouts[this.lang].layout,
				lenX = layout[0].length,
				x = (typeof this.suggestReturnX === "number") ? this.suggestReturnX : 0;

			if (x > lenX - 1) x = lenX - 1;
			if (x < 0) x = 0;

			this.position.y = 0;
			this.position.x = x;

			Focus.to(this.$el.find(".key[data-posx='" + x + "'][data-posy='0']"));
			return false;
		},
		/**
		 * Mueve el foco entre chips de sugerencia (cíclico).
		 * @param {Number} dir -1 izquierda, 1 derecha
		 * @private
		 */
		moveSuggestions: function (dir) {
			var len = this.suggestions.length;
			if (!len) return false;

			this.position.x = (this.position.x + dir + len) % len;
			Focus.to(this.$el.find(".key.suggest[data-posx='" + this.position.x + "']"));
			return false;
		},
		/**
		* This function is called from navigate. It focus new key.
        * @param {Number} dirX X-axis direction of moving
        * @param {Number} dirY Y-axis direction of moving
        * @param {String} axis X or Y axis
        * @private
		*/
		move: function (dirX, dirY, axis) {
			// current x
			var currentX = 0, layout = this.specialState ? this.layouts["SPECIAL"].layout : this.layouts[this.lang].layout;

			for (var i = 0; i <= this.position.x; i++) {
				var item = layout[this.position.y][i];
				var size = (item.s ? item.s : 1);
				if (this.position.x == i) size = 1;
				currentX += size;
			}

			this.position.x += dirX;
			this.position.y += dirY;
			this.assingIndToArray(axis, currentX);

			Focus.to(this.$el.find(".key[data-posx='" + this.position.x + "'][data-posy='" + this.position.y + "']"));
		},
		/**
		 * Move between lines, assign new index to visible keys.
        * @param {String} axis X or Y axis
        * @param {Number} currentX Current X items on the line
        * @private
		*/
		assingIndToArray: function (axis, currentX) {
			var layout = this.specialState ? this.layouts["SPECIAL"].layout : this.layouts[this.lang].layout, newCurrentX = 0, newSize = 0;

			// for a line
			if (axis == "X") {
				var len = layout[this.position.y].length;
				if (this.position.x < 0) this.position.x = len - 1;
				if (this.position.x > len - 1) this.position.x = 0;
			}
            // for a column
			else if (axis == "Y") {
				var len = layout.length;
				if (this.position.y < 0) this.position.y = len - 1;
				if (this.position.y > len - 1) this.position.y = 0;

				// change on axis x
				for (var i = 0; i < layout[this.position.y].length; i++) {
					var item = layout[this.position.y][i];
					var size = (item.s ? item.s : 1);
					newSize += size;
					if (newSize >= currentX) { break; }
					newCurrentX++;
				}

				if (newCurrentX != this.position.x) this.position.x = newCurrentX;

				// problem with x ?
				var lenX = layout[this.position.y].length;
				if (this.position.x > lenX - 1) this.position.x = lenX - 1;
			}
		},
		/**
		 * Insert a new value to the input
        * @param {String} value Value which should be inserted. It can be modified (Caps/Shift etc.)
        * @param {String} type Type of keyboard
		*/
		insertValue: function (value, type) {
			if (this.mode != this.enums["NORESTRICTION"]) { // "NUMERIC" "LETTER" "SPACE"
				if (this.mode == this.enums["ONLYNUMBERS"] && type != "NUMERIC") return;
			}

			if (this.capsLock) value = value.toUpperCase();
			else if (this.shift) {
				value = value.toUpperCase();
				this.shift = false;
				this.$el.find(".tt").each(function () {
					$(this).css("text-transform", "");
				});
			}

			if (value.length > 1) {
				for (var i = 0; i < value.length; i++) this.input.insert(value[i]);
			}
			else {
				this.input.insert(value);
			}

			this.updateSuggestions();
		},
		/**
		 * Define la lista completa de posibles sugerencias (ej. usuarios
		 * escritos antes). A partir de acá, el propio teclado recalcula qué
		 * mostrar en cada tecla (modo "auto"), filtrando por prefijo/contenido
		 * contra el texto actual del input.
		 * @param {Array<String>} list
		 */
		setSuggestionSource: function (list) {
			this.suggestionSource = ($.isArray(list) ? list : []);
			this.updateSuggestions();
		},
		/**
		 * Setea directamente los chips a mostrar ahora mismo, sin que el
		 * teclado los filtre (modo "manual"). Pensado para llamadores que ya
		 * calculan sus propios resultados relevantes (ej. Search.js, con su
		 * propia búsqueda por relevancia). No pisa/depende de
		 * `suggestionSource`.
		 * @param {Array<String>} list
		 */
		setSuggestions: function (list) {
			var limit = this.config.suggestionsLimit || 3;
			this.suggestions = ($.isArray(list) ? list : []).slice(0, limit);
			this.renderSuggestions();
		},
		/**
		 * Oculta las sugerencias actuales.
		 */
		clearSuggestions: function () {
			this.setSuggestions([]);
		},
		/**
		 * Recalcula `this.suggestions` a partir de `suggestionSource` y el
		 * texto actual del input (modo "auto"). No hace nada si no hay
		 * `suggestionSource` configurado -- en ese caso las sugerencias sólo
		 * cambian cuando el llamador invoca setSuggestions()/clearSuggestions()
		 * explícitamente (modo "manual", ej. Search.js).
		 * @private
		 */
		updateSuggestions: function () {
			if (!this.suggestionSource || !this.suggestionSource.length || !this.input) return;

			var text = (typeof this.input.getValue === "function" ? this.input.getValue() : (this.input.value || "")) || "";
			text = text.toLowerCase();

			if (!text.length) {
				this.suggestions = [];
				this.renderSuggestions();
				return;
			}

			var limit = this.config.suggestionsLimit || 3, starts = [], contains = [];

			for (var i = 0; i < this.suggestionSource.length; i++) {
				var item = this.suggestionSource[i];
				if (!item) continue;
				var lower = String(item).toLowerCase();
				if (lower === text) continue; // ya coincide exacto, no aporta sugerirlo
				if (lower.indexOf(text) === 0) starts.push(item);
				else if (lower.indexOf(text) > -1) contains.push(item);
			}

			this.suggestions = starts.concat(contains).slice(0, limit);
			this.renderSuggestions();
		},
		/**
		 * Dibuja (o quita) la fila de chips de sugerencia a partir de
		 * `this.suggestions`. Vive fuera de la rejilla del teclado (posición
		 * absoluta sobre ella, ver .line.suggest en keyboard.css), así que
		 * regenerarla no reflowea el resto del teclado.
		 * @private
		 */
		renderSuggestions: function () {
			var wasInSuggestions = (this.position.y === -1);

			this.$el.find(".line.suggest").remove();

			if (!this.suggestions.length) {
				if (wasInSuggestions) this.leaveSuggestions();
				return;
			}

			var $line = $("<div class='line suggest' />"), width = (100 / this.suggestions.length).toFixed(2) + "%";

			for (var i = 0; i < this.suggestions.length; i++) {
				var $key = $("<span class='key suggest focusable' />");
				$key.attr("data-posx", i);
				$key.attr("data-posy", -1);
				$key.css("width", width);

				$key.append($('<span class="content" />').text(this.suggestions[i]));
				$line.append($key);
			}

			this.$el.prepend($line);

			if (wasInSuggestions) {
				var idx = Math.min(this.position.x, this.suggestions.length - 1);
				this.position.x = idx < 0 ? 0 : idx;
				Focus.to(this.$el.find(".key.suggest[data-posx='" + this.position.x + "']"));
			}
		},
		/**
		 * El usuario aceptó un chip de sugerencia: reemplaza todo el texto del
		 * input por la sugerencia completa (mismo camino que si la hubiese
		 * tecleado letra por letra, así cualquier listener existente en
		 * 'inserted'/'backspace'/'clear-all-text' sigue funcionando igual) y
		 * deja el foco en "Done" para confirmar de una.
		 * @param {Number} index Índice del chip dentro de this.suggestions
		 * @private
		 */
		selectSuggestion: function (index) {
			var value = this.suggestions[index];
			if (typeof value === "undefined") return false;

			this.input.clearAllText();
			for (var i = 0; i < value.length; i++) this.input.insert(value[i]);
			this.input.moveCaret(0, "end");

			this.suggestions = [];
			this.renderSuggestions();

			this.position.y = 0;
			Focus.to(this.$el.find(".key[data-id='done']"));
			return false;
		},
		/**
		* Switch between English and Arabic layout or other available language.
        * @param {String} lang Language identification. Which language be newly set.
		*/
		switchLayout: function (lang) {
			if (this.lang != lang) {
				this.lang = lang;
				this.capsLock = false;
				this.shift = false;
				this.createKeys();
				this.input.moveCaret(0, "end"); // move cursor to the end
				// default focus on language
				Focus.to(this.$el.find(".key[data-id='LANGCHANGE']"));
			}
		},
		/**
		* Which button on keyboard be focused
        * @param {String} Identification of button which be focused
        * @private
		*/
		focusByInput: function (value) {
			Focus.to(this.$el.find(".focusable[data-val='" + value.toUpperCase() + "']"));
		},
		/**
		 * Mouse onclick handle.
		 * @param {Object} $el Target element, jQuery collection
		 * @param {Event} event Mouse event
		*/
		onClick: function ($el, event) {
			if (!this.$el.is(":visible")) return;
			return this.onEnter($el);
		},
		/**
		 * Create function, cover is created only for default and LG driver.
		*/
		create: function () {
			if (Device && !Device.isPHILIPS) { this.cover(); } // because Philips bugs
			this.content();
		},
		/**
		 * Set keyboard mode. Keyboard works in these modes: 
		 * NORESTRICTION = this.enums["NORESTRICTION"] no restrictions
		 * ONLYNUMBERS = this.enums["ONLYNUMBERS"] only numbers are working
        * @param {String} mode String represents which keyboard mode be used
		*/
		setMode: function (mode) {
			this.mode = this.enums[mode];
		},
		/**
		 * Set keyboard position, only available modes are BOTTOM x TOP.
        * @param {String} position String represents keyboard position (BOTTOM or TOP)
		*/
		setKeyboardPosition: function (position) { // position == BOTTOM x TOP
			this.keyboardPosition = this.enums[position];
		},
		/**
		* Get available language. This is because default I18n locale does not have its own layout.¨
        * @param {String} lang Keyboard language 
		*/
		getAvailableLang: function (lang) {
			if (!this.layouts[lang]) return "EN"; // default
			else return lang;
		},
		/**
		 * Determina el idioma principal por defecto del teclado: el idioma real
		 * del dispositivo (Device.getLanguage(), no el I18n.locale de la app,
		 * que hoy está limitado a ES/EN/PT por Device.getValidLanguage()) si
		 * está entre los idiomas configurados en el i18n de la app Y tiene
		 * layout de teclado definido; si no, inglés por defecto.
        * @returns {String} código de idioma en mayúsculas (ej. "ES", "EN")
        * @private
		*/
		getDeviceDefaultLang: function () {
			var deviceLang = "";

			try {
				deviceLang = String(Device.getLanguage() || "").split("-")[0].toUpperCase();
			} catch (e) {
				// Device.getLanguage() puede fallar/no estar listo en algunos drivers
			}

			if (deviceLang && I18n.translations[deviceLang] && this.layouts[deviceLang]) {
				return deviceLang;
			}

			return "EN";
		},
		/**
		 * Idiomas disponibles para ciclar con el botón LANGCHANGE: la
		 * intersección entre los idiomas cargados en I18n.translations y los
		 * que tienen layout de teclado definido en this.layouts.
        * @returns {Array} lista de códigos de idioma en mayúsculas
        * @private
		*/
		getCycleLanguages: function () {
			var langs = [];

			for (var code in I18n.translations) {
				if (I18n.translations.hasOwnProperty(code) && this.layouts[code]) {
					langs.push(code);
				}
			}

			// Red de seguridad: si por algún motivo I18n.translations.EN no
			// estuviera cargado, EN sigue disponible como fallback.
			if (langs.indexOf("EN") === -1) {
				langs.unshift("EN");
			}

			return langs;
		},
		/**
		 * Asigna a cada layout con botón LANGCHANGE la etiqueta y el idioma de
		 * destino: el SIGUIENTE idioma en el ciclo this.cycleLangs (orden
		 * circular). Antes el botón alternaba entre "English"/"Arabic" fijos
		 * por texto; ahora funciona con cualquier cantidad de idiomas.
        * @private
		*/
		wireLangChangeButtons: function () {
			// Antes mostraba el nombre del PRÓXIMO idioma en SU PROPIO idioma
			// (ej. "Magyar" en vez de "Húngaro") -- confuso para cualquiera
			// que no reconozca ese endónimo, sobre todo viniendo de un
			// teclado en otro idioma. Un código corto (EN/ES/HU/...) es
			// universal, no depende de que el usuario reconozca la palabra,
			// y es el mismo patrón que usan los selectores de idioma de
			// teclado en celulares.
			for (var i = 0; i < this.cycleLangs.length; i++) {
				var code = this.cycleLangs[i];
				var layoutDef = this.layouts[code];
				if (!layoutDef) continue;

				var nextCode = this.cycleLangs[(i + 1) % this.cycleLangs.length];
				var nextLabel = nextCode;

				for (var r = 0; r < layoutDef.layout.length; r++) {
					for (var c = 0; c < layoutDef.layout[r].length; c++) {
						if (layoutDef.layout[r][c].id === "LANGCHANGE") {
							layoutDef.layout[r][c].v = nextLabel;
							layoutDef.layout[r][c].target = nextCode;
						}
					}
				}
			}
		},
		/**
		 * Main function for show keyboard in the application.
        * @param {Object} Input object
        * @param {String} [lang] Keyboard language
		*/
		show: function (input, lang) {
			if (!input) return;

			this.input = input;
			this.lang = this.getAvailableLang(lang || this.getDeviceDefaultLang());
			// Reset de sugerencias: son propias de cada sesión de teclado, no
			// deben sobrevivir de un campo (ej. búsqueda) al siguiente (ej.
			// login), que reutilizan la misma instancia singleton de Keyboard.
			this.suggestions = [];
			this.suggestionSource = [];
			this.createKeys();
			this.showKeyboard();
			this.input.moveCaret(0, "end"); // move cursor to the end
			this.$saveFocus = Focus.focused;
			Focus.to(this.$el.find(".key[data-id='done']"));
			document.body.onselectstart = function () { return false; };
		},
		/**
		 * Exit keyboard and go back to the scene.
		*/
		exit: function () {
			this.specialState = false;
			this.accentsState = false;
			this.capsLock = false;
			this.shift = false;
			this.input.blur();
			this.hideKeyboard();
			Focus.to(this.$saveFocus);
			this.trigger("exit");
			document.body.onselectstart = function () { return true; };
		},
		/**
		 * Because of different of each line, createKeys() need to count each width of the line.
        * @param {Number} line Index of line
        * @returns {Number} size Size of lines
        * @private
		*/
		getLineSize: function(line) {
			if (!line || line.length == 0) return 1; // 0 divide zero

			var size = 0;
			
			for (var i = 0; i < line.length; i++) {
				if (!line[i].s) line[i].s = 1;
				size += line[i].s;
			}
			return size;
		},
		/**
		 * Create selected layout.
        * @param {String} layout Layout identification
        * @private
		*/
		createKeys: function (layout) {
			var $line = null, $key = null, $keyContent = null, signElemSize = 0;
			if (!layout) layout = this.layouts[this.lang].layout;

			this.$el.html("");

			for (var i = 0; i < layout.length; i++) {
				$line = $("<div class='line' />");
				signElemSize = 100 / this.getLineSize(layout[i]);
				this.$el.append($line);

				for (var j = 0; j < layout[i].length; j++) {
					$key = $("<span class='key focusable' />");
					$line.append($key);

					$keyContent = $('<span class="content" />');
					$keyContent.html(layout[i][j].v);
					$key.append($keyContent);

					if (layout[i][j].sec) {
						// Antes flotaba 40px por ARRIBA de la tecla (fuera de
						// sus límites) -- no sumaba ancho a la fila (ver
						// comentario en keyboard.css), pero al sobresalir
						// hacia arriba hacía que esa tecla se viera "más
						// alta" que las que no tienen acento, y esa asimetría
						// se leía como que la fila no estaba alineada. Ahora
						// va DENTRO de .content (esquina inferior derecha,
						// ver .seccontent en keyboard.css): cada tecla ocupa
						// exactamente la misma caja tenga o no acento, nada
						// sobresale.
						$keySecContent = $('<span class="seccontent" />');
						$keySecContent.html(layout[i][j].sec);
						$keyContent.append($keySecContent);
					}

					if (!layout[i][j].s) layout[i][j].s = 1;
					$key.attr("data-width", layout[i][j].s);
					$key.attr("data-posx", j);
					$key.attr("data-posy", i);
					if (layout[i][j].t == "K" || layout[i][j].t == "N") $key.addClass("tt");
					$key.css("width", (signElemSize * layout[i][j].s).toFixed(2) + "%");
					$key.attr("data-val", layout[i][j].v.toUpperCase());
					$key.attr("data-keycode", layout[i][j].v.toUpperCase().charCodeAt(0) ? layout[i][j].v.toUpperCase().charCodeAt(0) : "");
					if (layout[i][j].t === "F") {
						if (!layout[i][j].id) {
							$keyContent.html("&nbsp;");
						} else {
							$key.attr("data-id", layout[i][j].id);
							// "Caps Lock"/"Done" en texto asumían que todos leen
							// inglés -- igual de confuso que el "Magyar" del
							// botón de idioma. Se vacía el texto y se deja
							// solo el ícono (ver .CAPSLOCK/.DONE en
							// keyboard.css), universal sin importar el idioma
							// del teclado. LANGCHANGE es la única excepción:
							// necesita mostrar el código del próximo idioma
							// (ver wireLangChangeButtons()).
							if (layout[i][j].id !== "LANGCHANGE") $keyContent.html("&nbsp;");
						}
						$keyContent.addClass(layout[i][j].id === "CAPSLOCK" ? "CAPSLOCK" : layout[i][j].v.toUpperCase());
					}
				}
			}

			// createKeys() vacía this.$el.html(""), así que cualquier fila de
			// sugerencias que hubiera queda pisada. Se vuelve a dibujar acá a
			// partir del estado ya calculado en this.suggestions (no se
			// recalcula el filtro, sólo se repinta), para que sobreviva a
			// cambios de layout (GEAR, idioma) mientras el teclado sigue abierto.
			this.renderSuggestions();
		},
		/**
		 * Only show element of keyboard.
		*/
		showKeyboard: function () {
			// BOTTOM ahora se ancla con `bottom: 0` (en vez de un `top` fijo en
			// píxeles calculado para una resolución específica) para que el
			// teclado quede siempre pegado al borde inferior real de la
			// pantalla, sin importar la altura de la ventana. El ancho completo
			// (100%) ya lo define la clase .keyboard-content en keyboard.css.
			if (this.keyboardPosition == this.enums["BOTTOM"]) {
				this.$el.css({ "top": "", "bottom": "0" });
			} else if (this.keyboardPosition == this.enums["TOP"]) {
				this.$el.css({ "bottom": "", "top": "50px" });
			}

			if(this.$cover) { this.$cover.show(); }
			this.$el.show();
		},
		/**
		 * Only hide element of keyboard.
		*/
		hideKeyboard: function () {
			if(this.$cover) { this.$cover.hide(); }
			this.$el.hide();
		},
		/**
		 * Create clickable cover under the keyboard.
		*/
		cover: function () {
			var scope = this;

			this.$cover = $("<div class='keyboard-cover' />");
			this.$cover.bind("click", function () { scope.exit(); });
			this.$cover.hide();
			$("body").append(this.$cover);
		},
		/**
		 * Create content which holds the keyboard itself.
		*/
		content: function () {
			this.$el = $("<div class='keyboard-content' />");
			this.$el.hide();
			$("body").append(this.$el);
		}
	});

	Main.ready(function () {
		Keyboard.init(CONFIG.keyboard);
	});

	return Keyboard;

})(Events);
