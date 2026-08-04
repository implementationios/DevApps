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
 * AJAX / XHR utility class for creating all requests in specific format. 
 * It is strongly recommended using this class for better ajax calls management
 * 
 * @author SmartTv s.r.o.
 * @class Ajax
 * @singleton
 * @mixins Events
 */

 Ajax = (function (Events) {
    var Ajax = {
		/**
		 * @property {Object} config General config hash
		 */
        config: null,
		/**
		 * @property {String} proxy URL address of a proxy that should be used for every request
		 * Placeholders: {PROTOCOL} will be replace with http/https; {URL} will be replaced with target URL address
		 */
        proxy: null
    };

    $.extend(true, Ajax, Events, {
        /**
         * Initialization of Ajax class
         */
        init: function (config) {
            this.configure(config);
        },
		/**
		 * Set class config hash
		 * 
		 * @param {Object} config Hash of parameters
		 */
        configure: function (config) {
            this.config = $.extend(true, this.config || {}, config);

            this.proxy = this.config.proxy || null;
        },
		/**
		 * Returns final URL with proxy, if configured
		 * 
		 * @param {String} url
		 * @returns {String}
		 */
        buildURL: function (url, data) {
            var protocol = 'http', m;

            if (data instanceof Array) {
                url += (url.lastIndexOf('?') >= 0 ? '' : '?') + data.join('&');

            } else if (data && typeof data === 'object') {
                url += (url.lastIndexOf('?') >= 0 ? '' : '?') + jQuery.param(data);

            } else if (data) {
                url += (url.lastIndexOf('?') >= 0 ? '' : '?') + data;
            }

            if (this.proxy) {
                m = url.match(/^(\w+):\/\//);

                if (m && m[1]) {
                    protocol = m[1];
                }

                return String(this.proxy).replace(/\{PROTOCOL\}/gi, protocol).replace(/\{URL\}/gi, encodeURIComponent(url));
            }

            return url;
        },
		/**
		 * Make an AJAX call to a specified URL, returns new Promise
		 * 
		 * @param {String} url URL address
		 * @param {Object} [params] Hash of attributes, see jQuery Ajax config options
		 * @param {Function} [callback] Callback function
		 * @param {Object} [scope] Callback scope
		 * @returns {Promise}
		 */
        request: function (url, params, callback, scope) {
            if (typeof params === 'function') {
                scope = callback;
                callback = params;
                params = {};
            }

            // For more information about these params, see jQuery docs
            params = $.extend({
                // GET, POST, HEAD, etc.
                method: 'GET',
                // xml, json, jsonp, script, html, text
                type: '',
                cache: false,
                data: null,
                processData: true,
                timeout: this.config.timeout || 30000,
                jsonpCallback: undefined,
                headers: {},
                // optional jQuery ajax params [object]
                options: null
            }, params);

            var req, _url = this.buildURL(url, params.method !== 'POST' ? params.data : null), uid;

            return new Promise(function (resolve, reject) {
                uid = console.network(params.method, _url);

                req = $.ajax($.extend(true, {
                    url: this.buildURL(url),
                    cache: params.cache,
                    method: params.method,
                    dataType: params.type,
                    processData: params.processData,
                    data: params.data,
                    headers: params.headers,
                    timeout: params.timeout,
                    async: params.async || true, // default true
                    jsonpCallback: params.jsonpCallback

                }, params.options || {}));

                Promise.resolve(req).then(function (data, status, xhr) {
                    console.network(uid, status);
                    resolve(data);

                }).catch(function (xhr, status, error) {
                    var resp = xhr.responseText;

                    if (resp) {
                        resp = resp.substring(0, 60) + (resp.length > 60 ? '...' : '');
                    }
                    if (xhr.statusText === 'error' && xhr.status === 0 && !resp) {
                        resp = 'Connection refused';
                    }
                    console.network(uid, 'error', '>>> ' + ' [' + xhr, status, error+ ' ' + xhr.statusText + '] ' + resp);

                    reject(xhr);
                });
            }.bind(this)).then(function (data) {
                // abort request when promise is resolved or rejected elsewhere
                if (!req.status && req.statusText !== 'abort') {
                    req.abort();
                }
                return Promise.resolve(data);
            });
        }
    });

    // Initialize this class when Main is ready
    Main.ready(function () {
        Ajax.init(CONFIG.ajax);
    });

    return Ajax;

})(Events);