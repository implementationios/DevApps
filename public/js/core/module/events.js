/*
 *******************************************************************************

 * All rights reserved
 *  

 *
 * You may obtain a copy of the License at LICENSE.txt
 *******************************************************************************
 */

/**
 * Handles custom events via `trigger`, `on`, `off` etc.
 * 
 * @author AuroraTech
 * @class Events
 * @abstract
 */

Events = (function(){
	return {
        /**
         * @property {Object} event_stack=null stack of events 
         * @private
         */
		event_stack: null,

		/**
		 * Triggers custom event, optional arguments will be passed to listeners
		 * 
		 * @param {String} event_name
		 * @return {Boolean}
		 */
		trigger: function(event_name){
			var args = Array.prototype.slice.call(arguments, 1),
				scope = this, cb, fn, once, ret, stopped = false;
		
			args.push(function(){
				stopped = true;
			});

			if(this.event_stack && this.event_stack[event_name]){
				for(var i in this.event_stack[event_name]){
					cb = this.event_stack[event_name][i];

					if(typeof cb !== 'undefined' && cb){
						fn = cb[1];
						once = cb[2] || false;

						// Antes: un listener que tirara una excepción (ej. usar
						// Focus.focused sin chequear null) rompía este for-loop
						// entero SIN que nadie la atajara -- y como 'key' es
						// justo el evento que Control usa para repartir cada
						// tecla del control remoto a la escena activa, un solo
						// error de foco durante una transición de pantalla
						// (ej. volviendo de la escena offline) dejaba el
						// control remoto sin responder PARA SIEMPRE: si la
						// condición que causó el error no se arregla sola,
						// cada tecla siguiente vuelve a chocar en el mismo
						// punto. Un try/catch acá no arregla el bug de fondo
						// en cada listener, pero evita que UNO roto se lleve
						// puesto el resto de la app.
						try {
							ret = fn.apply(cb[0] || scope, args);
						} catch (e) {
							console.error('[Events] listener para "' + event_name + '" falló, se continúa con el resto:', e);
							ret = undefined;
						}

						if(once){
							// event was binded as `one` => remove after first trigger
							scope.event_stack[event_name][i] = null;
						}

						if(ret === false || stopped){
							return false;
						}
					}
				}
			}

			if(this.event_stack && this.event_stack['all']){
				for(var i in this.event_stack['all']){
					cb = this.event_stack['all'][i];

					if(typeof cb !== 'undefined' && cb){
						fn = cb[1];
						args.unshift(event_name);
						try {
							fn.apply(cb[0] || scope, args);
						} catch (e) {
							console.error('[Events] listener "all" para "' + event_name + '" falló, se continúa con el resto:', e);
						}
					}
				}
			}
			
			return true;
		},

		/**
		 * Bind listener to given event name
		 * 
		 * @chainable
		 * @param {String} event_name
		 * @param {Function} callback Callback function
		 * @param {Object} [scope=this] Callback's scope
		 * @param {Boolean} [one=false] If TRUE, listener will be removed after first call
		 */
		on: function(event_name, cb, scope, one){
			if(typeof this.event_stack !== 'object' || this.event_stack === null){
				this.event_stack = {};
			}

			if(! this.event_stack[event_name]){
				this.event_stack[event_name] = [];
			}

			this.event_stack[event_name].push([scope || this, cb, one || false]);
			
			return this;
		},

		/**
		 * Same as `on` but only for one-time listeners
		 * 
		 * @chainable
		 * @param {Function} callback Callback function
		 * @param {Object} [scope=this] Callback's scope
		 * @param {Boolean} [one=false] If TRUE, listener will be removed after first call
		 */
		one: function(event_name, cb, scope){
			return this.on(event_name, cb, scope, true);
		},

		/**
		 * Removes listener
		 * 
		 * @chainable
		 * @param {String} event_name
		 * @param {Function} [callback] Callback function
		 * @param {Object} [scope=this] Callback's scope
		 */
		off: function(event_name, _cb, _scope){
			var scope = this, cb;
			
			if(this.event_stack === null){
				this.event_stack = {};
			}

			if(! this.event_stack[event_name]){
				return this;
			}

			if(! _cb && ! _scope){
				this.event_stack[event_name] = [];
				return this;
			}
			
			for(var i in this.event_stack[event_name]){
				cb = this.event_stack[event_name][i];
				
				if(cb && cb[1] === _cb && (! _scope || _scope === cb[0])){
					scope.event_stack[event_name].splice(i, 1);
				}
			}
			
			return this;
		}
	};
})();