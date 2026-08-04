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
 * Manages scenes
 *
 * @author SmartTv s.r.o.
 * @class Router
 * @singleton
 * @mixins Events
 */

 Router = (function (Events) {
    var Router = {
        /**
         * @property {Object} config General config hash
         */
        config: null,
        /**
         * @property {Array} scenes All registered scenes
         */
        scenes: [],
        /**
         * @property {Array} history Scene history
         */
        history: [],
        /**
         * @property {Scene} activeScene Currently active scene
         */
        activeScene: null,
        /**
         * @property {String} activeSceneName Currently active scene's name
         */
        activeSceneName: null,

        activeSceneArgs: null
    };

    $.extend(true, Router, Events, {
        /**
         * @event scene
         * Will be called when a scene is changed, args: sceneName, Scene, config
         * @param {String} name
         * @param {Object} scene
         * @param {Array} arguments
         */

        /**
         * Init Router object
         * @param {Object} [config={}] Router configuration
         */
        init: function (config) {
            this.configure(config);

            this.showPromise = null;
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
         * Register new Scene
         *
         * @chainable
         * @param {String} name Unique scene name
         * @param {Scene} Scene
         */
        addScene: function (name, Scene) {
            this.scenes[name] = Scene;
            return this;
        },
        /**
         * Find registered scene by its name
         *
         * @param {String} name
         * @returns {Scene} Returns FALSE if not found
         */
        getScene: function (name) {
            return (this.scenes[name] || false);
        },
        /**
         * Go to the specified scene
         *
         * @param {String} name Scene's name
         * @param {Boolean} [historyPush=false] Set to FALSE if you don't want to push this scene into a history stack
         * @returns {Scene} Return FALSE if failed
         */
        go: function (name) {
            var args = Array.prototype.slice.call(arguments, 0), scene, currentScene, destruct = true, show, hide,
                onShow, onHide, historyPush, resolver = Promise.defer();

            if (typeof name === 'boolean') {
                historyPush = name;
                name = args[1];
                args = args.slice(1);
            }

            console.log('[Router] Go to ' + name);

            onHide = function () {
                if (typeof scene === 'function') {
                    currentScene = new scene(name, args.slice(1));

                } else {
                    currentScene = scene;
                }

                this.showPromise = show = currentScene.show.apply(currentScene, args.slice(1));

                if (show && typeof show.then === 'function') {
                    show
                        .bind(this)
                        .then(function (status) {
                            p_args = Array.prototype.slice.call(arguments, 1);	// PP!
                            onShow.apply(this, p_args);					// PP!
                        })
                        .catch(function (err) {
                            if (this.activeScene) {
                                if (currentScene.revert() === true) {
                                    // go back if rejected
                                    this.go.apply(this, this.activeSceneArgs);
                                }
                                resolver.reject(err);
                            }
                        })
                } else if (show !== false) {
                    onShow.call(this);
                } else {
                    // go back if rejected
                    this.go.apply(this, this.activeSceneArgs);
                    resolver.reject('Router rejected');
                }
            };

            onShow = function () {
                if (this.activeScene) {
                    this.activeScene.remove();

                    if (destruct) {
                        this.activeScene.desctruct();
                    }
                }

                if (historyPush !== false) {
                    this.history.unshift(args);
                }

                this.activeScene = currentScene;
                this.activeSceneName = name;
                this.activeSceneArgs = args;

                this.trigger('scene', name, this.activeScene, args);

                this.activeScene.render.apply(this.activeScene, arguments);		// PP!

                if (this.activeScene.config.focusOnRender !== false) {
                    this.activeScene.focus();
                }

                resolver.resolve();
            };

            if ((scene = this.getScene(name)) !== false) {
                if (this.activeScene === scene && this.activeScene.isVisible) {
                    this.history.shift();										// TS
                    this.history.unshift(args);									// TS
                    this.activeScene.refresh(args.slice(1));

                    if (this.activeScene.config.focusOnRender !== false) {
                        this.activeScene.focus();
                    }

                    return false;
                }

                if (this.showPromise && typeof this.showPromise.then === 'function' && typeof this.showPromise.reject === 'function' && !this.showPromise.isFulfilled()) {
                    this.showPromise.reject();
                }

                if (this.activeScene) {
                    hide = this.activeScene.hide();

                    if (hide && typeof hide.then === 'function') {
                        hide
                            .bind(this)
                            .then(function () {
                                onHide.call(this);
                            })
                            .catch(function () {
                                destruct = false;
                                onHide.call(this);
                            });

                    } else if (hide === false) {
                        destruct = false;
                        onHide.call(this);

                    } else {
                        onHide.call(this);
                    }

                } else {
                    onHide.call(this);
                }
            }

            return resolver.promise;
        },
        /**
         * Routes to the previous scene
         *
         * @returns {Scene} Return FALSE if failed
         */
        goBack: function (config) {
            var args, returnScene = null;

            if ((args = this.history.shift())) {
                if (args && args[0] === this.activeSceneName) {
                    return this.goBack(config);
                }

                returnScene = (args && args[0] ? this.getScene(args[0]) : null);
                if (returnScene) returnScene.onBeforeGoBack(this.activeSceneName);

                return new Promise(function (resolve, reject) {
                    if (config) {
                        args[1] = config
                    }
                    this.go.apply(this, args)
                        .then(function (status) {
                            resolve();
                        }).catch(function () {
                        reject();
                    });
                }.bind(this))
            } else {
                return new Promise(function (resolve, reject) {
                    reject();
                })
            }
        },
        /**
         * Check, if given scene name is the current active scene
         *
         * @param {String} name Check if scene with this name is active
         * @returns {Boolean}
         */
        isSceneActive: function (name) {
            return (this.activeSceneName === name);
        },
        /**
         * Clear router history
         */
        clearHistory: function () {
            this.history = [];
        },
        /**
         * Shift the last scene from a history
         *
         * @param {String} [sceneName] sceneName Name of scene be shifted from history
         * @returns {Object}
         */
        shiftHistory: function (sceneName) {
            if (sceneName) {
                if (this.history[0] && this.history[0][0] === sceneName) {
                    return this.history.shift();
                }

                return false;
            }

            return this.history.shift();
        }
    });

    // Initialize this class when Main is ready
    Main.ready(function () {
        Router.init();
    });

    return Router;

})(Events);