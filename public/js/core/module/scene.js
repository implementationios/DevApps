/*
 *******************************************************************************
 * Copyright (c) 2013 SmartTv, s.r.o. (Czech Republic)
 * All rights reserved
 *  
 * Questions and comments should be directed https://github.com/SmartTv/sdk/issues
 *
 * You may obtain a copy of the License at LICENSE.txt
 *******************************************************************************
 */

/**
 * Scene abstract class for each scene. It is recommended to use this abstract class.
 *
 * @author SmartTv s.r.o.
 * @class Scene
 * @abstract
 * @mixins Events
 */

 Scene = (function (Events) {
    var Scene = function () {
        this.config = {
            /**
             * @cfg {Boolean} focusOnRender Whether call a focus method after scene is rendered
             */
            focusOnRender: true
        };

        this.construct.apply(this, arguments);
    };

    $.extend(true, Scene.prototype, Events, {
        /**
         * @event show
         * Will be called when scene is shown
         */

        /**
         * @event hide
         * Will be called when scene is hidden
         */

        /**
         * @event beforekey
         * Will be called before a `key` event
         * @preventable
         * @param {Number} keyCode
         * @param {Event} event
         * @param {Function} stop
         */

        /**
         * @event key
         * Will be called when a keyboard/RC event is triggered
         * @param {Number} keyCode
         * @param {Event} event
         * @param {Function} stop
         */

        /**
         * @event click
         * Will be called when a click event is triggered
         * @param {Object} target Target element, jQuery colleciton
         * @param {Event} event
         */

        /**
         * @event scroll
         * Will be called when user scrolls
         * @param {Object} target Target element, jQuery colleciton
         * @param {Number} delta -1/+1
         * @param {Event} event
         */

        /**
         * @property {Boolean} isVisible TRUE, if this scene is visible
         */

        /**
         * @property {Boolean} isActive TRUE, if this scene has been activated and is visible, this property is set when an 'activate' method if successfuly executed
         */

        /**
         * @property {Object} $el Scene's element, jQuery collection
         */

        /**
         * @property {String} name Scene's name
         */

        /**
         * @property {String} [id] Scene's identificator related to HTML element
         */

        /**
         * @property {String} [cls] Scene's class related to HTML element
         */

        /**
         * Construct object
         *
         * @constructor
         * @param {String} name Unique name
         * @param {Object} [config={}] Config
         */
        construct: function (name, config) {
            if (!config && typeof name === 'object') {
                config = $.extend(true, {}, name);
                name = null;
            }

            this.name = name;
            this.resetProperties(config);
            this.$el = this.create();

            if (this.id) {
                this.$el.attr('id', this.id);
            }

            if (this.cls) {
                this.$el.addClass(this.cls);
            }

            this.init.apply(this, arguments);
            this.initEvents();
            this.onLangChange(true, I18n.locale);

            // initialize nb alert objects
            this.$nbAlertConfirm = this.$el.find(".nb-alert-confirm");
            this.$nbAlertMessage = this.$el.find(".nb-alert-message");
            this.$nbAlertInputMessage = this.$el.find(".nb-alert-input");

            if (this.$nbAlertMessage.length == 0) {
                var alertMessageHTML = '<div class="modal fade alerts nb-alert nb-alert-message" role="dialog">'
                    + '<div class="modal-dialog modal-center">'
                    + '<div class="modal-content">'
                    + '<div class="modal-body"><label class="nb-alert-message-label"></label></div>'
                    + '<div class="modal-footer">'
                    + '<button type="button" class="btn-default btn-lg focusable nb-alert-message-ok-button" data-dismiss="modal" data-parent-type="message"></button>'
                    + '</div></div></div></div>';
                this.$el.append(alertMessageHTML);
                this.$nbAlertMessage = this.$el.find(".nb-alert-message");
            }

            if (this.$nbAlertConfirm.length == 0) {
                var alertConfirmHTML = '<div class="modal fade alerts nb-alert nb-alert-confirm" role="dialog">'
                    + '<div class="modal-dialog modal-center">'
                    + '<div class="modal-content">'
                    + '<div class="modal-body"><label class="nb-alert-confirm-label"></label></div>'
                    + '<div class="modal-footer">'
                    + '<button type="button" class="btn-default btn-lg focusable nb-alert-confirm-cancel-button" data-dismiss="modal" data-parent-type="confirm"></button>'
                    + '<button type="button" class="btn-default btn-lg focusable nb-alert-confirm-ok-button" data-dismiss="modal" data-parent-type="confirm"></button>'
                    + '</div></div></div></div>';
                this.$el.append(alertConfirmHTML);
                this.$nbAlertConfirm = this.$el.find(".nb-alert-confirm");
            }

            if (this.$nbAlertInputMessage.length == 0) {
                var alertInputHTML = '<div class="modal fade alerts nb-alert nb-alert-input" role="dialog">'
                    + '<div class="modal-dialog modal-center">'
                    + '<div class="modal-content">'
                    + '<div class="modal-body">'

                    + '<div>'
                    + '<label class="nb-alert-input-label col-form-label"></label>'
                    + '<input type="text" class="form-control-lg focusable inputuser" id="recipient-name" data-parent-type="input">'
                    + '</div>'

                    + '</div>'
                    + '<div class="modal-footer">'
                    + '<button type="button" class="btn-default btn-lg focusable nb-alert-input-cancel-button" data-dismiss="modal" data-parent-type="input"></button>'
                    + '<button type="button" class="btn-default btn-lg focusable nb-alert-input-ok-button" data-dismiss="modal" data-parent-type="input"></button>'
                    + '</div></div></div></div>';
                this.$el.append(alertInputHTML);
                this.$nbAlertInputMessage = this.$el.find(".nb-alert-input");
            }

            this.$nbAlertConfirmOkButton = this.$nbAlertConfirm.find(".nb-alert-confirm-ok-button");
            this.$nbAlertConfirmCancelButton = this.$nbAlertConfirm.find(".nb-alert-confirm-cancel-button");
            this.$nbAlertMessageOkButton = this.$nbAlertMessage.find(".nb-alert-message-ok-button");
            this.$nbAlertInputOkButton = this.$nbAlertInputMessage.find(".nb-alert-input-ok-button");
            this.$nbAlertInputCancelButton = this.$nbAlertInputMessage.find(".nb-alert-input-cancel-button");
        },
        /**
         * Destruct object. It means calling deinitialization and destroying functions
         *
         * @private
         */
        desctruct: function () {
            // Antes: nunca se desligaban los listeners globales registrados en
            // initEvents() (Control/Mouse/Focus/I18n), acumulándose en cada
            // cambio de pantalla y reteniendo esta instancia en memoria.
            this.unbindEvents();
            this.deinit.apply(this, arguments);
            this.destroy();
        },
        /**
         * Set properties to default values.
         * @private
         * @param {Object} [config={}] Config
         */
        resetProperties: function (config) {
            this.config = $.extend(this.config, config || {});
            this.id = this.config.id || null;
            this.cls = this.config.cls || null;
            this.isVisible = false;
            this.isActive = false;
        },
        /**
         * Bind listeners to the `key` event and some others
         * Mouse (MRCU or some other "mouse" remote controllers) events (click or scroll) is binding here.
         *
         * @private
         */
        initEvents: function () {
            // Las funciones se guardan en variables (en vez de pasarse anónimas
            // directo a `.on`) para poder desligarlas con `.off` exactamente en
            // unbindEvents() — Events.off() solo compara por referencia de
            // función, así que una anónima nunca podría desligarse.
            var _click, _scroll, _focus, _langchange;

            _click = function ($el) {
                if (!this.isVisible || !$el.belongsTo(this.$el)) {
                    return;
                }

                return this.onClick.apply(this, arguments);
            };

            _scroll = function ($el) {
                if (!this.isVisible || !$el.belongsTo(this.$el)) {
                    return;
                }

                return this.onScroll.apply(this, arguments);
            };

            _focus = function ($el) {
                if (!this.isVisible || !$el.belongsTo(this.$el)) {
                    return;
                }

                return this.onFocus.apply(this, arguments);
            };

            _langchange = function () {
                this.onLangChange.apply(this, arguments);
            };

            Control.on('key', this.onKeyDown, this);

            if (typeof Mouse !== 'undefined') {
                Mouse.on('click', _click, this);
                Mouse.on('scroll', _scroll, this);
            }

            // register of focus event
            Focus.on('focus', _focus, this);

            // register of langchange event
            I18n.on('langchange', _langchange, this);

            // set array of events for unbind (ver unbindEvents)
            this.eventsArray = [_click, _scroll, _focus, _langchange];
        },
        /**
         * Unbind all listeners registered in initEvents(). Se llama desde
         * desctruct() para no dejar referencias vivas de esta escena en los
         * singletons globales (Control/Mouse/Focus/I18n) tras cada transición.
         */
        unbindEvents: function () {
            Control.off('key', this.onKeyDown, this);

            if (typeof Mouse !== 'undefined' && this.eventsArray) {
                Mouse.off('click', this.eventsArray[0], this);
                Mouse.off('scroll', this.eventsArray[1], this);
            }

            if (this.eventsArray) {
                Focus.off('focus', this.eventsArray[2], this);
                I18n.off('langchange', this.eventsArray[3], this);
            }
        },
        /**
         * This method is called every time, when the language of application is changed.
         * For change language, you gotta call function I18n.changeLanguage()
         *
         * @template
         * @param {Boolean} firstTime
         * @param {String} langCode
         */
        onLangChange: function (firstTime, langCode) {

        },
        /**
         * Initialise scene
         * You can overwrite me in own scene class
         *
         * @template
         */
        init: function () {

        },
        /**
         * De-initialise scene
         * You can overwrite me in own scene class
         *
         * @template
         */
        deinit: function () {

        },
        /**
         * Set focus to the scene
         * You can overwrite me in own scene class
         *
         * @template
         */
        focus: function () {

        },
        /**
         * Render scene
         * It is recommended to render all visual components here.
         * You can overwrite me in own scene class
         *
         * @template
         */
        render: function () {

        },
        /**
         * Remove scene's elements when scene is hiding
         * You can overwrite me in own scene class
         *
         * @template
         */
        remove: function () {

        },
        /**
         * Create scene's element, is called when scene is being constructed
         * You can overwrite me in own scene class
         *
         * @template
         * @returns {Object} Element, jQuery collection
         */
        create: function () {

        },
        /**
         * Remove or hide scene's element, is called when scene is being destructed
         * You can overwrite me in own scene class
         *
         * @template
         * @return {Boolean/Promise} Return FALSE when you don't want to hide this scene, Promise may be also returned
         */
        destroy: function () {

        },
        /**
         * Activate and focus scene when its shown
         * You can overwrite me in own scene class
         *
         * @template
         * @return {Boolean/Promise} Return FALSE when you don't want to show this scene, Promise may be also returned
         */
        activate: function () {

        },
        /**
         * Deactivate scene when its hidden
         * You can overwrite me in own scene class
         *
         * @template
         * @return {Boolean} Return FALSE when you don't want to destroy this scene when its hidden
         */
        deactivate: function () {

        },
        /**
         * This method is called when and 'activate' method fails
         * You can overwrite me in own scene class
         *
         * @template
         * @return {Boolean} If TRUE is returned, router will call goBack (default action)
         */
        revert: function () {
            return true;
        },
        /**
         * Refresh is called by a Router when scene is already visible, you can call anytime you need
         * You can overwrite me in own scene class
         *
         * @template
         */
        refresh: function () {

        },
        /**
         * Display scene's element and set `this.isVisible` to TRUE
         */
        show: function () {
            var args = arguments;
            return new Promise(function (resolve, reject) {
                var activated;

                activated = this.activate.apply(this, args);

                if (activated && typeof activated.then === 'function') {
                    activated
                        .bind(this)
                        .then(function () {
                            var p_args = Array.prototype.slice.call(arguments, 1);
                            this.isActive = status;
                            resolve(p_args);
                        }).catch(function (err) {
                        reject(err);
                    });
                } else if (activated !== false) {
                    this.isActive = true;
                    resolve();

                } else {
                    this.isActive = false;
                    reject('scene_show_error');
                }

            }.bind(this))
                .bind(this)
                .then(
                    function (data) {
                        this.$el.show();
                        this.isVisible = true;
                        this.trigger('show');
                        return Promise.resolve(true);
                    },
                    function (err) {
                        this.hide();
                        // CORRECCIÓN: Pasar el error al reject para evitar "rejected with a non-error: [object Undefined]"
                        return Promise.reject(err || new Error('Scene show failed'));
                    }
                );
        },
        /**
         * Hide scene's element and set `this.isVisible` to FALSE
         */
        hide: function () {
            return new Promise(function (resolve, reject) {
                var deactivated;
                deactivated = this.deactivate();
                // if object is Promise
                if (deactivated && typeof deactivated.then === 'function') {
                    deactivated
                        .bind(this)
                        .then(function () {
                            this.isActive = false;
                            resolve();
                        })
                        .catch(function () {
                            reject();
                        });

                } else if (deactivated !== false) {
                    this.isActive = false;
                    resolve();

                } else {
                    reject();
                }

            }.bind(this))
                .bind(this)
                .then(function () {
                    this.$el.hide();
                    this.isVisible = false;
                    this.trigger('hide');
                    return Promise.resolve();
                });
        },
        /**
         * Test if this scene has focus (or any snippet inside this scene)
         *
         * @returns {Boolean} Either TRUE if scene has focus or FALSE if scene has no focus
         */
        hasFocus: function () {
            return Focus.isIn(this.$el);
        },
        /**
         * Handles keyDown events
         * Handling is executed only when scene has focus
         * According keyCodes here are fired right events (for navigate keys or enter event etc.)
         *
         * @fires beforekey
         * @fires key
         * @private
         */
        onKeyDown: function (keyCode, ev, stop) {
            
            //$("#LOG").html("TIZEN keyCode:" + keyCode + " | KEY_FF:" + Control.key.KEY_FF + " | FF:" + Control.key.FF);
            if (!this.isVisible) {
                return;
            }

            User.updateLastInteraction();

            if (this.trigger('beforekey', keyCode, ev) === false) {
                return false;
            }
            if (this.trigger('key', keyCode, ev) === false) {
                return false;

            } else if (keyCode === Control.key.LEFT) {
                return this.navigate('left', stop);

            } else if (keyCode === Control.key.RIGHT) {
                return this.navigate('right', stop);

            } else if (keyCode === Control.key.UP) {
                return this.navigate('up', stop);

            } else if (keyCode === Control.key.DOWN) {
                return this.navigate('down', stop);

            } else if (keyCode === Control.key.ENTER) {
                return this.onEnter(Focus.focused, ev, stop);

            } else if (keyCode === Control.key.RETURN) {
                return this.onReturn(Focus.focused, ev, stop);
            } else if (keyCode === Control.key.PUP) {
                return this.channelUp();
            } else if (keyCode === Control.key.PDOWN) {
                return this.channelDown();
            } else if (keyCode === Control.key.PLAY) {
                return this.playPause();
            } else if (keyCode === Control.key.PAUSE) {
                return this.playPause();
            } else if (keyCode === Control.key.PLAY_PAUSE) {
                return this.playPause();
            } else if (keyCode === Control.key.KEY_FF || keyCode === Control.key.FF) {
                return this.keyFFAction();
            } else if (keyCode === Control.key.KEY_RW || keyCode === Control.key.RW) {
                return this.keyRWAction();
            } else if (keyCode === Control.key.STOP) {
                return this.keyStopAction();
            } else if (keyCode === Control.key.RED) {
                return this.keyRedAction();
            } else if (keyCode === Control.key.GREEN) {
                return this.keyGreenAction();
            } else if (keyCode === Control.key.YELLOW) {
                return this.keyYellowAction();
            } else if (keyCode === Control.key.BLUE) {
                return this.keyBlueAction();
            } else if (keyCode === Control.key.ZERO) {
                return this.keyNumberAction(0);
            } else if (keyCode === Control.key.ONE) {
                return this.keyNumberAction(1);
            } else if (keyCode === Control.key.TWO) {
                return this.keyNumberAction(2);
            } else if (keyCode === Control.key.THREE) {
                return this.keyNumberAction(3);
            } else if (keyCode === Control.key.FOUR) {
                return this.keyNumberAction(4);
            } else if (keyCode === Control.key.FIVE) {
                return this.keyNumberAction(5);
            } else if (keyCode === Control.key.SIX) {
                return this.keyNumberAction(6);
            } else if (keyCode === Control.key.SEVEN) {
                return this.keyNumberAction(7);
            } else if (keyCode === Control.key.EIGHT) {
                return this.keyNumberAction(8);
            } else if (keyCode === Control.key.NINE) {
                return this.keyNumberAction(9);
            } else if (keyCode === Control.key.GUIDE) {
                return this.keyGuideAction();
            }
        },
        /**
         * Handles ENTER event
         * You can overwrite me in own scene class
         *
         * @template
         * @param {Object} $el Target element, jQuery collection
         * @param {Event} event
         */
        onEnter: function ($el, event) {

        },
        /**
         * Handles RETURN event
         * You can overwrite me in own scene class
         *
         * @template
         * @param {Object} $el Target element, jQuery collection
         * @param {Event} event
         */
        onReturn: function ($el, event) {

        },
        /**
         * Handles Click event when this scene is visible
         *
         * @param {Object} $el Target element, jQuery collection
         * @param {Event} event Mouse event
         * @fires click
         */
        onClick: function ($el, event) {
            this.trigger('click', $el, event);
        },
        /**
         * Handles Scroll event when this scene is visible
         *
         * @param {Object} $el Target element, jQuery collection
         * @param {Number} delta, 1 or -1
         * @param {Event} event Mouse event
         * @fires scroll
         */
        onScroll: function ($el, delta, event) {
            this.trigger('scroll', $el, delta, event);
        },
        /**
         * Handles Focus event
         * You can overwrite me in own scene class
         *
         * @template
         * @param {Object} $el Target element, jQuery collection
         * @fires focus
         */
        onFocus: function ($el) {
            this.trigger('focus', $el);
        },
        /**
         * Navigate in 4-way direction
         *
         * @template
         * @param {String} direction Possible values: 'left', 'right', 'up', 'down'
         * @return {Boolean} Return FALSE to prevent event from bubeling
         */
        navigate: function (direction) {

        },

        channelUp: function() {

        },

        channelDown: function() {

        },

        play: function() {

        },

        pause: function() {

        },

        playPause: function() {

        },

        keyFFAction: function() {

        },

        keyRWAction: function() {

        },

        keyStopAction: function() {

        },

        keyRedAction: function() {

        },

        keyGreenAction: function() {

        },

        keyYellowAction: function() {

        },

        keyBlueAction: function() {
            
        },

        keyNumberAction: function(number) {

        },

        keyGuideAction: function() {

        },

        /**
         * Get all focusable elements inside this snippet. This takes currentyl focused
         * element and calculates new one. If the new sibling is not exits, new focus
         * is getting from the start / end of collection - cyclic.
         *
         * Is the same like getFocusable, but you can specify parent and also you can
         * walkthrough all elements in cyclic.
         *
         * @param {Number} direction left is equal to -1, right to 1
         * @param {Object} parent jquery object. All focusable elements belongs only to this parent.
         * @returns {Object} jQuery collection
         */
        getCircleFocusable: function (direction, parent) {
            var els = $('.focusable', parent || this.$el).not('.disabled').filter(':visible'),
                focusedIndex = Focus.focused ? els.index(Focus.focused) : -1;
            if (focusedIndex != -1) {
                focusedIndex += direction;
                if (focusedIndex == -1)
                    return els.eq(els.length - 1);
                else if (focusedIndex > els.length - 1)
                    return els.eq(0);
                else
                    return els.eq(focusedIndex);
            }
        },
        /**
         * Get all focusable elements inside this scene
         *
         * @param {Number} [index] If specified, then returns only one element at the specified position
         * @param {Boolean} [fromCurrentlyFocused=false] If TRUE, than elements before focused element are cut off
         * @param {Object} [$el=this.$el] Limit search for just this specified element, jQuery collection
         * @returns {Object} jQuery collection
         */
        getFocusable: function (index, fromCurrentlyFocused, $el) {
            // Antes: .filter(':visible') corría ANTES de .not('.disabled'), es
            // decir, se pagaba el costo de layout de `:visible` (offsetWidth/
            // offsetHeight) sobre TODOS los .focusable, incluyendo los que de
            // entrada iban a descartarse por estar deshabilitados. Al invertir
            // el orden (igual que ya hace getCircleFocusable), `:visible` solo
            // se evalúa sobre el subconjunto ya reducido.
            var els = $('.focusable', $el || this.$el).not('.disabled').filter(':visible'), focusedIndex,
                _index = index;

            if (_index === 'LAST') {
                _index = els.length - 1;
            }
            if (fromCurrentlyFocused) {
                focusedIndex = Focus.focused ? els.index(Focus.focused) : -1;

                if (typeof index !== 'undefined' && _index < 0) {
                    els = els.slice(0, (focusedIndex >= 0 ? focusedIndex : 1));
                    //_index += els.length;

                } else {
                    els = els.slice(focusedIndex >= 0 ? focusedIndex : 0);
                }
            }

            if (typeof _index !== 'undefined') {
                return els.eq(_index >> 0);
            }

            return els;
        },
        /*
         * This method is called, when you use Router.goBack on active scene, the
         * last scene fires this method with the name of the current scene.
         *
         * @param {String} sceneName
         */
        onBeforeGoBack: function (fromScene) {
        },
        /**
         * Replace in-text translations date-tr="..."
         */
        replaceI18n: function () {
            if (!this.$el) {
                return false;
            }

            this.$el.find('*[data-tr]').each(function () {
                var str;

                if (this._translated) {
                    return;
                }

                for (var i in this.attributes) {
                    if (this.attributes[i].name === 'data-tr') {
                        str = this.attributes[i].value;
                    }
                }

                if (str) {
                    this.innerHTML = __(str);
                    this._translated = true;
                }
            });
        },

        manageFocusOnAlert: function(direction, type) {
            if (type == 'message') {
                Focus.to(this.$nbAlertMessageOkButton);
                return;
            }

            if (direction == 'left') {
                Focus.to(this.$nbAlertConfirmCancelButton);
            } else if (direction == 'right') {
                Focus.to(this.$nbAlertConfirmOkButton);
            }
        }
    });

    return Scene;

})(Events);