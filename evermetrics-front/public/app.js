(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = after

function after(count, callback, err_cb) {
    var bail = false
    err_cb = err_cb || noop
    proxy.count = count

    return (count === 0) ? callback() : proxy

    function proxy(err, result) {
        if (proxy.count <= 0) {
            throw new Error('after called too many times')
        }
        --proxy.count

        // after first error, rest are passed to err_cb
        if (err) {
            bail = true
            callback(err)
            // future error callbacks will go to error handler
            callback = err_cb
        } else if (proxy.count === 0 && !bail) {
            callback(null, result)
        }
    }
}

function noop() {}

},{}],2:[function(require,module,exports){
/**
 * An abstraction for slicing an arraybuffer even when
 * ArrayBuffer.prototype.slice is not supported
 *
 * @api public
 */

module.exports = function(arraybuffer, start, end) {
  var bytes = arraybuffer.byteLength;
  start = start || 0;
  end = end || bytes;

  if (arraybuffer.slice) { return arraybuffer.slice(start, end); }

  if (start < 0) { start += bytes; }
  if (end < 0) { end += bytes; }
  if (end > bytes) { end = bytes; }

  if (start >= bytes || start >= end || bytes === 0) {
    return new ArrayBuffer(0);
  }

  var abv = new Uint8Array(arraybuffer);
  var result = new Uint8Array(end - start);
  for (var i = start, ii = 0; i < end; i++, ii++) {
    result[ii] = abv[i];
  }
  return result.buffer;
};

},{}],3:[function(require,module,exports){
module.exports = require('./lib/axios');
},{"./lib/axios":5}],4:[function(require,module,exports){
(function (process){
'use strict';

var utils = require('./../utils');
var settle = require('./../core/settle');
var buildURL = require('./../helpers/buildURL');
var parseHeaders = require('./../helpers/parseHeaders');
var isURLSameOrigin = require('./../helpers/isURLSameOrigin');
var createError = require('../core/createError');
var btoa = (typeof window !== 'undefined' && window.btoa && window.btoa.bind(window)) || require('./../helpers/btoa');

module.exports = function xhrAdapter(config) {
  return new Promise(function dispatchXhrRequest(resolve, reject) {
    var requestData = config.data;
    var requestHeaders = config.headers;

    if (utils.isFormData(requestData)) {
      delete requestHeaders['Content-Type']; // Let the browser set it
    }

    var request = new XMLHttpRequest();
    var loadEvent = 'onreadystatechange';
    var xDomain = false;

    // For IE 8/9 CORS support
    // Only supports POST and GET calls and doesn't returns the response headers.
    // DON'T do this for testing b/c XMLHttpRequest is mocked, not XDomainRequest.
    if (process.env.NODE_ENV !== 'test' &&
        typeof window !== 'undefined' &&
        window.XDomainRequest && !('withCredentials' in request) &&
        !isURLSameOrigin(config.url)) {
      request = new window.XDomainRequest();
      loadEvent = 'onload';
      xDomain = true;
      request.onprogress = function handleProgress() {};
      request.ontimeout = function handleTimeout() {};
    }

    // HTTP basic authentication
    if (config.auth) {
      var username = config.auth.username || '';
      var password = config.auth.password || '';
      requestHeaders.Authorization = 'Basic ' + btoa(username + ':' + password);
    }

    request.open(config.method.toUpperCase(), buildURL(config.url, config.params, config.paramsSerializer), true);

    // Set the request timeout in MS
    request.timeout = config.timeout;

    // Listen for ready state
    request[loadEvent] = function handleLoad() {
      if (!request || (request.readyState !== 4 && !xDomain)) {
        return;
      }

      // The request errored out and we didn't get a response, this will be
      // handled by onerror instead
      // With one exception: request that using file: protocol, most browsers
      // will return status as 0 even though it's a successful request
      if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf('file:') === 0)) {
        return;
      }

      // Prepare the response
      var responseHeaders = 'getAllResponseHeaders' in request ? parseHeaders(request.getAllResponseHeaders()) : null;
      var responseData = !config.responseType || config.responseType === 'text' ? request.responseText : request.response;
      var response = {
        data: responseData,
        // IE sends 1223 instead of 204 (https://github.com/mzabriskie/axios/issues/201)
        status: request.status === 1223 ? 204 : request.status,
        statusText: request.status === 1223 ? 'No Content' : request.statusText,
        headers: responseHeaders,
        config: config,
        request: request
      };

      settle(resolve, reject, response);

      // Clean up request
      request = null;
    };

    // Handle low level network errors
    request.onerror = function handleError() {
      // Real errors are hidden from us by the browser
      // onerror should only fire if it's a network error
      reject(createError('Network Error', config));

      // Clean up request
      request = null;
    };

    // Handle timeout
    request.ontimeout = function handleTimeout() {
      reject(createError('timeout of ' + config.timeout + 'ms exceeded', config, 'ECONNABORTED'));

      // Clean up request
      request = null;
    };

    // Add xsrf header
    // This is only done if running in a standard browser environment.
    // Specifically not if we're in a web worker, or react-native.
    if (utils.isStandardBrowserEnv()) {
      var cookies = require('./../helpers/cookies');

      // Add xsrf header
      var xsrfValue = (config.withCredentials || isURLSameOrigin(config.url)) && config.xsrfCookieName ?
          cookies.read(config.xsrfCookieName) :
          undefined;

      if (xsrfValue) {
        requestHeaders[config.xsrfHeaderName] = xsrfValue;
      }
    }

    // Add headers to the request
    if ('setRequestHeader' in request) {
      utils.forEach(requestHeaders, function setRequestHeader(val, key) {
        if (typeof requestData === 'undefined' && key.toLowerCase() === 'content-type') {
          // Remove Content-Type if data is undefined
          delete requestHeaders[key];
        } else {
          // Otherwise add header to the request
          request.setRequestHeader(key, val);
        }
      });
    }

    // Add withCredentials to request if needed
    if (config.withCredentials) {
      request.withCredentials = true;
    }

    // Add responseType to request if needed
    if (config.responseType) {
      try {
        request.responseType = config.responseType;
      } catch (e) {
        if (request.responseType !== 'json') {
          throw e;
        }
      }
    }

    // Handle progress if needed
    if (typeof config.onDownloadProgress === 'function') {
      request.addEventListener('progress', config.onDownloadProgress);
    }

    // Not all browsers support upload events
    if (typeof config.onUploadProgress === 'function' && request.upload) {
      request.upload.addEventListener('progress', config.onUploadProgress);
    }

    if (config.cancelToken) {
      // Handle cancellation
      config.cancelToken.promise.then(function onCanceled(cancel) {
        if (!request) {
          return;
        }

        request.abort();
        reject(cancel);
        // Clean up request
        request = null;
      });
    }

    if (requestData === undefined) {
      requestData = null;
    }

    // Send the request
    request.send(requestData);
  });
};

}).call(this,require('_process'))
},{"../core/createError":11,"./../core/settle":14,"./../helpers/btoa":18,"./../helpers/buildURL":19,"./../helpers/cookies":21,"./../helpers/isURLSameOrigin":23,"./../helpers/parseHeaders":25,"./../utils":27,"_process":366}],5:[function(require,module,exports){
'use strict';

var utils = require('./utils');
var bind = require('./helpers/bind');
var Axios = require('./core/Axios');
var defaults = require('./defaults');

/**
 * Create an instance of Axios
 *
 * @param {Object} defaultConfig The default config for the instance
 * @return {Axios} A new instance of Axios
 */
function createInstance(defaultConfig) {
  var context = new Axios(defaultConfig);
  var instance = bind(Axios.prototype.request, context);

  // Copy axios.prototype to instance
  utils.extend(instance, Axios.prototype, context);

  // Copy context to instance
  utils.extend(instance, context);

  return instance;
}

// Create the default instance to be exported
var axios = createInstance(defaults);

// Expose Axios class to allow class inheritance
axios.Axios = Axios;

// Factory for creating new instances
axios.create = function create(instanceConfig) {
  return createInstance(utils.merge(defaults, instanceConfig));
};

// Expose Cancel & CancelToken
axios.Cancel = require('./cancel/Cancel');
axios.CancelToken = require('./cancel/CancelToken');
axios.isCancel = require('./cancel/isCancel');

// Expose all/spread
axios.all = function all(promises) {
  return Promise.all(promises);
};
axios.spread = require('./helpers/spread');

module.exports = axios;

// Allow use of default import syntax in TypeScript
module.exports.default = axios;

},{"./cancel/Cancel":6,"./cancel/CancelToken":7,"./cancel/isCancel":8,"./core/Axios":9,"./defaults":16,"./helpers/bind":17,"./helpers/spread":26,"./utils":27}],6:[function(require,module,exports){
'use strict';

/**
 * A `Cancel` is an object that is thrown when an operation is canceled.
 *
 * @class
 * @param {string=} message The message.
 */
function Cancel(message) {
  this.message = message;
}

Cancel.prototype.toString = function toString() {
  return 'Cancel' + (this.message ? ': ' + this.message : '');
};

Cancel.prototype.__CANCEL__ = true;

module.exports = Cancel;

},{}],7:[function(require,module,exports){
'use strict';

var Cancel = require('./Cancel');

/**
 * A `CancelToken` is an object that can be used to request cancellation of an operation.
 *
 * @class
 * @param {Function} executor The executor function.
 */
function CancelToken(executor) {
  if (typeof executor !== 'function') {
    throw new TypeError('executor must be a function.');
  }

  var resolvePromise;
  this.promise = new Promise(function promiseExecutor(resolve) {
    resolvePromise = resolve;
  });

  var token = this;
  executor(function cancel(message) {
    if (token.reason) {
      // Cancellation has already been requested
      return;
    }

    token.reason = new Cancel(message);
    resolvePromise(token.reason);
  });
}

/**
 * Throws a `Cancel` if cancellation has been requested.
 */
CancelToken.prototype.throwIfRequested = function throwIfRequested() {
  if (this.reason) {
    throw this.reason;
  }
};

/**
 * Returns an object that contains a new `CancelToken` and a function that, when called,
 * cancels the `CancelToken`.
 */
CancelToken.source = function source() {
  var cancel;
  var token = new CancelToken(function executor(c) {
    cancel = c;
  });
  return {
    token: token,
    cancel: cancel
  };
};

module.exports = CancelToken;

},{"./Cancel":6}],8:[function(require,module,exports){
'use strict';

module.exports = function isCancel(value) {
  return !!(value && value.__CANCEL__);
};

},{}],9:[function(require,module,exports){
'use strict';

var defaults = require('./../defaults');
var utils = require('./../utils');
var InterceptorManager = require('./InterceptorManager');
var dispatchRequest = require('./dispatchRequest');
var isAbsoluteURL = require('./../helpers/isAbsoluteURL');
var combineURLs = require('./../helpers/combineURLs');

/**
 * Create a new instance of Axios
 *
 * @param {Object} instanceConfig The default config for the instance
 */
function Axios(instanceConfig) {
  this.defaults = instanceConfig;
  this.interceptors = {
    request: new InterceptorManager(),
    response: new InterceptorManager()
  };
}

/**
 * Dispatch a request
 *
 * @param {Object} config The config specific for this request (merged with this.defaults)
 */
Axios.prototype.request = function request(config) {
  /*eslint no-param-reassign:0*/
  // Allow for axios('example/url'[, config]) a la fetch API
  if (typeof config === 'string') {
    config = utils.merge({
      url: arguments[0]
    }, arguments[1]);
  }

  config = utils.merge(defaults, this.defaults, { method: 'get' }, config);

  // Support baseURL config
  if (config.baseURL && !isAbsoluteURL(config.url)) {
    config.url = combineURLs(config.baseURL, config.url);
  }

  // Hook up interceptors middleware
  var chain = [dispatchRequest, undefined];
  var promise = Promise.resolve(config);

  this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
    chain.unshift(interceptor.fulfilled, interceptor.rejected);
  });

  this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
    chain.push(interceptor.fulfilled, interceptor.rejected);
  });

  while (chain.length) {
    promise = promise.then(chain.shift(), chain.shift());
  }

  return promise;
};

// Provide aliases for supported request methods
utils.forEach(['delete', 'get', 'head'], function forEachMethodNoData(method) {
  /*eslint func-names:0*/
  Axios.prototype[method] = function(url, config) {
    return this.request(utils.merge(config || {}, {
      method: method,
      url: url
    }));
  };
});

utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
  /*eslint func-names:0*/
  Axios.prototype[method] = function(url, data, config) {
    return this.request(utils.merge(config || {}, {
      method: method,
      url: url,
      data: data
    }));
  };
});

module.exports = Axios;

},{"./../defaults":16,"./../helpers/combineURLs":20,"./../helpers/isAbsoluteURL":22,"./../utils":27,"./InterceptorManager":10,"./dispatchRequest":12}],10:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

function InterceptorManager() {
  this.handlers = [];
}

/**
 * Add a new interceptor to the stack
 *
 * @param {Function} fulfilled The function to handle `then` for a `Promise`
 * @param {Function} rejected The function to handle `reject` for a `Promise`
 *
 * @return {Number} An ID used to remove interceptor later
 */
InterceptorManager.prototype.use = function use(fulfilled, rejected) {
  this.handlers.push({
    fulfilled: fulfilled,
    rejected: rejected
  });
  return this.handlers.length - 1;
};

/**
 * Remove an interceptor from the stack
 *
 * @param {Number} id The ID that was returned by `use`
 */
InterceptorManager.prototype.eject = function eject(id) {
  if (this.handlers[id]) {
    this.handlers[id] = null;
  }
};

/**
 * Iterate over all the registered interceptors
 *
 * This method is particularly useful for skipping over any
 * interceptors that may have become `null` calling `eject`.
 *
 * @param {Function} fn The function to call for each interceptor
 */
InterceptorManager.prototype.forEach = function forEach(fn) {
  utils.forEach(this.handlers, function forEachHandler(h) {
    if (h !== null) {
      fn(h);
    }
  });
};

module.exports = InterceptorManager;

},{"./../utils":27}],11:[function(require,module,exports){
'use strict';

var enhanceError = require('./enhanceError');

/**
 * Create an Error with the specified message, config, error code, and response.
 *
 * @param {string} message The error message.
 * @param {Object} config The config.
 * @param {string} [code] The error code (for example, 'ECONNABORTED').
 @ @param {Object} [response] The response.
 * @returns {Error} The created error.
 */
module.exports = function createError(message, config, code, response) {
  var error = new Error(message);
  return enhanceError(error, config, code, response);
};

},{"./enhanceError":13}],12:[function(require,module,exports){
'use strict';

var utils = require('./../utils');
var transformData = require('./transformData');
var isCancel = require('../cancel/isCancel');
var defaults = require('../defaults');

/**
 * Throws a `Cancel` if cancellation has been requested.
 */
function throwIfCancellationRequested(config) {
  if (config.cancelToken) {
    config.cancelToken.throwIfRequested();
  }
}

/**
 * Dispatch a request to the server using the configured adapter.
 *
 * @param {object} config The config that is to be used for the request
 * @returns {Promise} The Promise to be fulfilled
 */
module.exports = function dispatchRequest(config) {
  throwIfCancellationRequested(config);

  // Ensure headers exist
  config.headers = config.headers || {};

  // Transform request data
  config.data = transformData(
    config.data,
    config.headers,
    config.transformRequest
  );

  // Flatten headers
  config.headers = utils.merge(
    config.headers.common || {},
    config.headers[config.method] || {},
    config.headers || {}
  );

  utils.forEach(
    ['delete', 'get', 'head', 'post', 'put', 'patch', 'common'],
    function cleanHeaderConfig(method) {
      delete config.headers[method];
    }
  );

  var adapter = config.adapter || defaults.adapter;

  return adapter(config).then(function onAdapterResolution(response) {
    throwIfCancellationRequested(config);

    // Transform response data
    response.data = transformData(
      response.data,
      response.headers,
      config.transformResponse
    );

    return response;
  }, function onAdapterRejection(reason) {
    if (!isCancel(reason)) {
      throwIfCancellationRequested(config);

      // Transform response data
      if (reason && reason.response) {
        reason.response.data = transformData(
          reason.response.data,
          reason.response.headers,
          config.transformResponse
        );
      }
    }

    return Promise.reject(reason);
  });
};

},{"../cancel/isCancel":8,"../defaults":16,"./../utils":27,"./transformData":15}],13:[function(require,module,exports){
'use strict';

/**
 * Update an Error with the specified config, error code, and response.
 *
 * @param {Error} error The error to update.
 * @param {Object} config The config.
 * @param {string} [code] The error code (for example, 'ECONNABORTED').
 @ @param {Object} [response] The response.
 * @returns {Error} The error.
 */
module.exports = function enhanceError(error, config, code, response) {
  error.config = config;
  if (code) {
    error.code = code;
  }
  error.response = response;
  return error;
};

},{}],14:[function(require,module,exports){
'use strict';

var createError = require('./createError');

/**
 * Resolve or reject a Promise based on response status.
 *
 * @param {Function} resolve A function that resolves the promise.
 * @param {Function} reject A function that rejects the promise.
 * @param {object} response The response.
 */
module.exports = function settle(resolve, reject, response) {
  var validateStatus = response.config.validateStatus;
  // Note: status is not exposed by XDomainRequest
  if (!response.status || !validateStatus || validateStatus(response.status)) {
    resolve(response);
  } else {
    reject(createError(
      'Request failed with status code ' + response.status,
      response.config,
      null,
      response
    ));
  }
};

},{"./createError":11}],15:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

/**
 * Transform the data for a request or a response
 *
 * @param {Object|String} data The data to be transformed
 * @param {Array} headers The headers for the request or response
 * @param {Array|Function} fns A single function or Array of functions
 * @returns {*} The resulting transformed data
 */
module.exports = function transformData(data, headers, fns) {
  /*eslint no-param-reassign:0*/
  utils.forEach(fns, function transform(fn) {
    data = fn(data, headers);
  });

  return data;
};

},{"./../utils":27}],16:[function(require,module,exports){
(function (process){
'use strict';

var utils = require('./utils');
var normalizeHeaderName = require('./helpers/normalizeHeaderName');

var PROTECTION_PREFIX = /^\)\]\}',?\n/;
var DEFAULT_CONTENT_TYPE = {
  'Content-Type': 'application/x-www-form-urlencoded'
};

function setContentTypeIfUnset(headers, value) {
  if (!utils.isUndefined(headers) && utils.isUndefined(headers['Content-Type'])) {
    headers['Content-Type'] = value;
  }
}

function getDefaultAdapter() {
  var adapter;
  if (typeof XMLHttpRequest !== 'undefined') {
    // For browsers use XHR adapter
    adapter = require('./adapters/xhr');
  } else if (typeof process !== 'undefined') {
    // For node use HTTP adapter
    adapter = require('./adapters/http');
  }
  return adapter;
}

var defaults = {
  adapter: getDefaultAdapter(),

  transformRequest: [function transformRequest(data, headers) {
    normalizeHeaderName(headers, 'Content-Type');
    if (utils.isFormData(data) ||
      utils.isArrayBuffer(data) ||
      utils.isStream(data) ||
      utils.isFile(data) ||
      utils.isBlob(data)
    ) {
      return data;
    }
    if (utils.isArrayBufferView(data)) {
      return data.buffer;
    }
    if (utils.isURLSearchParams(data)) {
      setContentTypeIfUnset(headers, 'application/x-www-form-urlencoded;charset=utf-8');
      return data.toString();
    }
    if (utils.isObject(data)) {
      setContentTypeIfUnset(headers, 'application/json;charset=utf-8');
      return JSON.stringify(data);
    }
    return data;
  }],

  transformResponse: [function transformResponse(data) {
    /*eslint no-param-reassign:0*/
    if (typeof data === 'string') {
      data = data.replace(PROTECTION_PREFIX, '');
      try {
        data = JSON.parse(data);
      } catch (e) { /* Ignore */ }
    }
    return data;
  }],

  timeout: 0,

  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',

  maxContentLength: -1,

  validateStatus: function validateStatus(status) {
    return status >= 200 && status < 300;
  }
};

defaults.headers = {
  common: {
    'Accept': 'application/json, text/plain, */*'
  }
};

utils.forEach(['delete', 'get', 'head'], function forEachMehtodNoData(method) {
  defaults.headers[method] = {};
});

utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
  defaults.headers[method] = utils.merge(DEFAULT_CONTENT_TYPE);
});

module.exports = defaults;

}).call(this,require('_process'))
},{"./adapters/http":4,"./adapters/xhr":4,"./helpers/normalizeHeaderName":24,"./utils":27,"_process":366}],17:[function(require,module,exports){
'use strict';

module.exports = function bind(fn, thisArg) {
  return function wrap() {
    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i];
    }
    return fn.apply(thisArg, args);
  };
};

},{}],18:[function(require,module,exports){
'use strict';

// btoa polyfill for IE<10 courtesy https://github.com/davidchambers/Base64.js

var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

function E() {
  this.message = 'String contains an invalid character';
}
E.prototype = new Error;
E.prototype.code = 5;
E.prototype.name = 'InvalidCharacterError';

function btoa(input) {
  var str = String(input);
  var output = '';
  for (
    // initialize result and counter
    var block, charCode, idx = 0, map = chars;
    // if the next str index does not exist:
    //   change the mapping table to "="
    //   check if d has no fractional digits
    str.charAt(idx | 0) || (map = '=', idx % 1);
    // "8 - idx % 1 * 8" generates the sequence 2, 4, 6, 8
    output += map.charAt(63 & block >> 8 - idx % 1 * 8)
  ) {
    charCode = str.charCodeAt(idx += 3 / 4);
    if (charCode > 0xFF) {
      throw new E();
    }
    block = block << 8 | charCode;
  }
  return output;
}

module.exports = btoa;

},{}],19:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

function encode(val) {
  return encodeURIComponent(val).
    replace(/%40/gi, '@').
    replace(/%3A/gi, ':').
    replace(/%24/g, '$').
    replace(/%2C/gi, ',').
    replace(/%20/g, '+').
    replace(/%5B/gi, '[').
    replace(/%5D/gi, ']');
}

/**
 * Build a URL by appending params to the end
 *
 * @param {string} url The base of the url (e.g., http://www.google.com)
 * @param {object} [params] The params to be appended
 * @returns {string} The formatted url
 */
module.exports = function buildURL(url, params, paramsSerializer) {
  /*eslint no-param-reassign:0*/
  if (!params) {
    return url;
  }

  var serializedParams;
  if (paramsSerializer) {
    serializedParams = paramsSerializer(params);
  } else if (utils.isURLSearchParams(params)) {
    serializedParams = params.toString();
  } else {
    var parts = [];

    utils.forEach(params, function serialize(val, key) {
      if (val === null || typeof val === 'undefined') {
        return;
      }

      if (utils.isArray(val)) {
        key = key + '[]';
      }

      if (!utils.isArray(val)) {
        val = [val];
      }

      utils.forEach(val, function parseValue(v) {
        if (utils.isDate(v)) {
          v = v.toISOString();
        } else if (utils.isObject(v)) {
          v = JSON.stringify(v);
        }
        parts.push(encode(key) + '=' + encode(v));
      });
    });

    serializedParams = parts.join('&');
  }

  if (serializedParams) {
    url += (url.indexOf('?') === -1 ? '?' : '&') + serializedParams;
  }

  return url;
};

},{"./../utils":27}],20:[function(require,module,exports){
'use strict';

/**
 * Creates a new URL by combining the specified URLs
 *
 * @param {string} baseURL The base URL
 * @param {string} relativeURL The relative URL
 * @returns {string} The combined URL
 */
module.exports = function combineURLs(baseURL, relativeURL) {
  return baseURL.replace(/\/+$/, '') + '/' + relativeURL.replace(/^\/+/, '');
};

},{}],21:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

module.exports = (
  utils.isStandardBrowserEnv() ?

  // Standard browser envs support document.cookie
  (function standardBrowserEnv() {
    return {
      write: function write(name, value, expires, path, domain, secure) {
        var cookie = [];
        cookie.push(name + '=' + encodeURIComponent(value));

        if (utils.isNumber(expires)) {
          cookie.push('expires=' + new Date(expires).toGMTString());
        }

        if (utils.isString(path)) {
          cookie.push('path=' + path);
        }

        if (utils.isString(domain)) {
          cookie.push('domain=' + domain);
        }

        if (secure === true) {
          cookie.push('secure');
        }

        document.cookie = cookie.join('; ');
      },

      read: function read(name) {
        var match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
        return (match ? decodeURIComponent(match[3]) : null);
      },

      remove: function remove(name) {
        this.write(name, '', Date.now() - 86400000);
      }
    };
  })() :

  // Non standard browser env (web workers, react-native) lack needed support.
  (function nonStandardBrowserEnv() {
    return {
      write: function write() {},
      read: function read() { return null; },
      remove: function remove() {}
    };
  })()
);

},{"./../utils":27}],22:[function(require,module,exports){
'use strict';

/**
 * Determines whether the specified URL is absolute
 *
 * @param {string} url The URL to test
 * @returns {boolean} True if the specified URL is absolute, otherwise false
 */
module.exports = function isAbsoluteURL(url) {
  // A URL is considered absolute if it begins with "<scheme>://" or "//" (protocol-relative URL).
  // RFC 3986 defines scheme name as a sequence of characters beginning with a letter and followed
  // by any combination of letters, digits, plus, period, or hyphen.
  return /^([a-z][a-z\d\+\-\.]*:)?\/\//i.test(url);
};

},{}],23:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

module.exports = (
  utils.isStandardBrowserEnv() ?

  // Standard browser envs have full support of the APIs needed to test
  // whether the request URL is of the same origin as current location.
  (function standardBrowserEnv() {
    var msie = /(msie|trident)/i.test(navigator.userAgent);
    var urlParsingNode = document.createElement('a');
    var originURL;

    /**
    * Parse a URL to discover it's components
    *
    * @param {String} url The URL to be parsed
    * @returns {Object}
    */
    function resolveURL(url) {
      var href = url;

      if (msie) {
        // IE needs attribute set twice to normalize properties
        urlParsingNode.setAttribute('href', href);
        href = urlParsingNode.href;
      }

      urlParsingNode.setAttribute('href', href);

      // urlParsingNode provides the UrlUtils interface - http://url.spec.whatwg.org/#urlutils
      return {
        href: urlParsingNode.href,
        protocol: urlParsingNode.protocol ? urlParsingNode.protocol.replace(/:$/, '') : '',
        host: urlParsingNode.host,
        search: urlParsingNode.search ? urlParsingNode.search.replace(/^\?/, '') : '',
        hash: urlParsingNode.hash ? urlParsingNode.hash.replace(/^#/, '') : '',
        hostname: urlParsingNode.hostname,
        port: urlParsingNode.port,
        pathname: (urlParsingNode.pathname.charAt(0) === '/') ?
                  urlParsingNode.pathname :
                  '/' + urlParsingNode.pathname
      };
    }

    originURL = resolveURL(window.location.href);

    /**
    * Determine if a URL shares the same origin as the current location
    *
    * @param {String} requestURL The URL to test
    * @returns {boolean} True if URL shares the same origin, otherwise false
    */
    return function isURLSameOrigin(requestURL) {
      var parsed = (utils.isString(requestURL)) ? resolveURL(requestURL) : requestURL;
      return (parsed.protocol === originURL.protocol &&
            parsed.host === originURL.host);
    };
  })() :

  // Non standard browser envs (web workers, react-native) lack needed support.
  (function nonStandardBrowserEnv() {
    return function isURLSameOrigin() {
      return true;
    };
  })()
);

},{"./../utils":27}],24:[function(require,module,exports){
'use strict';

var utils = require('../utils');

module.exports = function normalizeHeaderName(headers, normalizedName) {
  utils.forEach(headers, function processHeader(value, name) {
    if (name !== normalizedName && name.toUpperCase() === normalizedName.toUpperCase()) {
      headers[normalizedName] = value;
      delete headers[name];
    }
  });
};

},{"../utils":27}],25:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

/**
 * Parse headers into an object
 *
 * ```
 * Date: Wed, 27 Aug 2014 08:58:49 GMT
 * Content-Type: application/json
 * Connection: keep-alive
 * Transfer-Encoding: chunked
 * ```
 *
 * @param {String} headers Headers needing to be parsed
 * @returns {Object} Headers parsed into an object
 */
module.exports = function parseHeaders(headers) {
  var parsed = {};
  var key;
  var val;
  var i;

  if (!headers) { return parsed; }

  utils.forEach(headers.split('\n'), function parser(line) {
    i = line.indexOf(':');
    key = utils.trim(line.substr(0, i)).toLowerCase();
    val = utils.trim(line.substr(i + 1));

    if (key) {
      parsed[key] = parsed[key] ? parsed[key] + ', ' + val : val;
    }
  });

  return parsed;
};

},{"./../utils":27}],26:[function(require,module,exports){
'use strict';

/**
 * Syntactic sugar for invoking a function and expanding an array for arguments.
 *
 * Common use case would be to use `Function.prototype.apply`.
 *
 *  ```js
 *  function f(x, y, z) {}
 *  var args = [1, 2, 3];
 *  f.apply(null, args);
 *  ```
 *
 * With `spread` this example can be re-written.
 *
 *  ```js
 *  spread(function(x, y, z) {})([1, 2, 3]);
 *  ```
 *
 * @param {Function} callback
 * @returns {Function}
 */
module.exports = function spread(callback) {
  return function wrap(arr) {
    return callback.apply(null, arr);
  };
};

},{}],27:[function(require,module,exports){
'use strict';

var bind = require('./helpers/bind');

/*global toString:true*/

// utils is a library of generic helper functions non-specific to axios

var toString = Object.prototype.toString;

/**
 * Determine if a value is an Array
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an Array, otherwise false
 */
function isArray(val) {
  return toString.call(val) === '[object Array]';
}

/**
 * Determine if a value is an ArrayBuffer
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an ArrayBuffer, otherwise false
 */
function isArrayBuffer(val) {
  return toString.call(val) === '[object ArrayBuffer]';
}

/**
 * Determine if a value is a FormData
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an FormData, otherwise false
 */
function isFormData(val) {
  return (typeof FormData !== 'undefined') && (val instanceof FormData);
}

/**
 * Determine if a value is a view on an ArrayBuffer
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a view on an ArrayBuffer, otherwise false
 */
function isArrayBufferView(val) {
  var result;
  if ((typeof ArrayBuffer !== 'undefined') && (ArrayBuffer.isView)) {
    result = ArrayBuffer.isView(val);
  } else {
    result = (val) && (val.buffer) && (val.buffer instanceof ArrayBuffer);
  }
  return result;
}

/**
 * Determine if a value is a String
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a String, otherwise false
 */
function isString(val) {
  return typeof val === 'string';
}

/**
 * Determine if a value is a Number
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Number, otherwise false
 */
function isNumber(val) {
  return typeof val === 'number';
}

/**
 * Determine if a value is undefined
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if the value is undefined, otherwise false
 */
function isUndefined(val) {
  return typeof val === 'undefined';
}

/**
 * Determine if a value is an Object
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an Object, otherwise false
 */
function isObject(val) {
  return val !== null && typeof val === 'object';
}

/**
 * Determine if a value is a Date
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Date, otherwise false
 */
function isDate(val) {
  return toString.call(val) === '[object Date]';
}

/**
 * Determine if a value is a File
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a File, otherwise false
 */
function isFile(val) {
  return toString.call(val) === '[object File]';
}

/**
 * Determine if a value is a Blob
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Blob, otherwise false
 */
function isBlob(val) {
  return toString.call(val) === '[object Blob]';
}

/**
 * Determine if a value is a Function
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Function, otherwise false
 */
function isFunction(val) {
  return toString.call(val) === '[object Function]';
}

/**
 * Determine if a value is a Stream
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Stream, otherwise false
 */
function isStream(val) {
  return isObject(val) && isFunction(val.pipe);
}

/**
 * Determine if a value is a URLSearchParams object
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a URLSearchParams object, otherwise false
 */
function isURLSearchParams(val) {
  return typeof URLSearchParams !== 'undefined' && val instanceof URLSearchParams;
}

/**
 * Trim excess whitespace off the beginning and end of a string
 *
 * @param {String} str The String to trim
 * @returns {String} The String freed of excess whitespace
 */
function trim(str) {
  return str.replace(/^\s*/, '').replace(/\s*$/, '');
}

/**
 * Determine if we're running in a standard browser environment
 *
 * This allows axios to run in a web worker, and react-native.
 * Both environments support XMLHttpRequest, but not fully standard globals.
 *
 * web workers:
 *  typeof window -> undefined
 *  typeof document -> undefined
 *
 * react-native:
 *  typeof document.createElement -> undefined
 */
function isStandardBrowserEnv() {
  return (
    typeof window !== 'undefined' &&
    typeof document !== 'undefined' &&
    typeof document.createElement === 'function'
  );
}

/**
 * Iterate over an Array or an Object invoking a function for each item.
 *
 * If `obj` is an Array callback will be called passing
 * the value, index, and complete array for each item.
 *
 * If 'obj' is an Object callback will be called passing
 * the value, key, and complete object for each property.
 *
 * @param {Object|Array} obj The object to iterate
 * @param {Function} fn The callback to invoke for each item
 */
function forEach(obj, fn) {
  // Don't bother if no value provided
  if (obj === null || typeof obj === 'undefined') {
    return;
  }

  // Force an array if not already something iterable
  if (typeof obj !== 'object' && !isArray(obj)) {
    /*eslint no-param-reassign:0*/
    obj = [obj];
  }

  if (isArray(obj)) {
    // Iterate over array values
    for (var i = 0, l = obj.length; i < l; i++) {
      fn.call(null, obj[i], i, obj);
    }
  } else {
    // Iterate over object keys
    for (var key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        fn.call(null, obj[key], key, obj);
      }
    }
  }
}

/**
 * Accepts varargs expecting each argument to be an object, then
 * immutably merges the properties of each object and returns result.
 *
 * When multiple objects contain the same key the later object in
 * the arguments list will take precedence.
 *
 * Example:
 *
 * ```js
 * var result = merge({foo: 123}, {foo: 456});
 * console.log(result.foo); // outputs 456
 * ```
 *
 * @param {Object} obj1 Object to merge
 * @returns {Object} Result of all merge properties
 */
function merge(/* obj1, obj2, obj3, ... */) {
  var result = {};
  function assignValue(val, key) {
    if (typeof result[key] === 'object' && typeof val === 'object') {
      result[key] = merge(result[key], val);
    } else {
      result[key] = val;
    }
  }

  for (var i = 0, l = arguments.length; i < l; i++) {
    forEach(arguments[i], assignValue);
  }
  return result;
}

/**
 * Extends object a by mutably adding to it the properties of object b.
 *
 * @param {Object} a The object to be extended
 * @param {Object} b The object to copy properties from
 * @param {Object} thisArg The object to bind function to
 * @return {Object} The resulting value of object a
 */
function extend(a, b, thisArg) {
  forEach(b, function assignValue(val, key) {
    if (thisArg && typeof val === 'function') {
      a[key] = bind(val, thisArg);
    } else {
      a[key] = val;
    }
  });
  return a;
}

module.exports = {
  isArray: isArray,
  isArrayBuffer: isArrayBuffer,
  isFormData: isFormData,
  isArrayBufferView: isArrayBufferView,
  isString: isString,
  isNumber: isNumber,
  isObject: isObject,
  isUndefined: isUndefined,
  isDate: isDate,
  isFile: isFile,
  isBlob: isBlob,
  isFunction: isFunction,
  isStream: isStream,
  isURLSearchParams: isURLSearchParams,
  isStandardBrowserEnv: isStandardBrowserEnv,
  forEach: forEach,
  merge: merge,
  extend: extend,
  trim: trim
};

},{"./helpers/bind":17}],28:[function(require,module,exports){
(function (global){
"use strict";

require("core-js/shim");

require("regenerator-runtime/runtime");

require("core-js/fn/regexp/escape");

if (global._babelPolyfill) {
  throw new Error("only one instance of babel-polyfill is allowed");
}
global._babelPolyfill = true;

var DEFINE_PROPERTY = "defineProperty";
function define(O, key, value) {
  O[key] || Object[DEFINE_PROPERTY](O, key, {
    writable: true,
    configurable: true,
    value: value
  });
}

define(String.prototype, "padLeft", "".padStart);
define(String.prototype, "padRight", "".padEnd);

"pop,reverse,shift,keys,values,entries,indexOf,every,some,forEach,map,filter,find,findIndex,includes,join,slice,concat,push,splice,unshift,sort,lastIndexOf,reduce,reduceRight,copyWithin,fill".split(",").forEach(function (key) {
  [][key] && define(Array, key, Function.call.bind([][key]));
});
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"core-js/fn/regexp/escape":37,"core-js/shim":330,"regenerator-runtime/runtime":367}],29:[function(require,module,exports){

/**
 * Expose `Backoff`.
 */

module.exports = Backoff;

/**
 * Initialize backoff timer with `opts`.
 *
 * - `min` initial timeout in milliseconds [100]
 * - `max` max timeout [10000]
 * - `jitter` [0]
 * - `factor` [2]
 *
 * @param {Object} opts
 * @api public
 */

function Backoff(opts) {
  opts = opts || {};
  this.ms = opts.min || 100;
  this.max = opts.max || 10000;
  this.factor = opts.factor || 2;
  this.jitter = opts.jitter > 0 && opts.jitter <= 1 ? opts.jitter : 0;
  this.attempts = 0;
}

/**
 * Return the backoff duration.
 *
 * @return {Number}
 * @api public
 */

Backoff.prototype.duration = function(){
  var ms = this.ms * Math.pow(this.factor, this.attempts++);
  if (this.jitter) {
    var rand =  Math.random();
    var deviation = Math.floor(rand * this.jitter * ms);
    ms = (Math.floor(rand * 10) & 1) == 0  ? ms - deviation : ms + deviation;
  }
  return Math.min(ms, this.max) | 0;
};

/**
 * Reset the number of attempts.
 *
 * @api public
 */

Backoff.prototype.reset = function(){
  this.attempts = 0;
};

/**
 * Set the minimum duration
 *
 * @api public
 */

Backoff.prototype.setMin = function(min){
  this.ms = min;
};

/**
 * Set the maximum duration
 *
 * @api public
 */

Backoff.prototype.setMax = function(max){
  this.max = max;
};

/**
 * Set the jitter
 *
 * @api public
 */

Backoff.prototype.setJitter = function(jitter){
  this.jitter = jitter;
};


},{}],30:[function(require,module,exports){
/*
 * base64-arraybuffer
 * https://github.com/niklasvh/base64-arraybuffer
 *
 * Copyright (c) 2012 Niklas von Hertzen
 * Licensed under the MIT license.
 */
(function(){
  "use strict";

  var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

  // Use a lookup table to find the index.
  var lookup = new Uint8Array(256);
  for (var i = 0; i < chars.length; i++) {
    lookup[chars.charCodeAt(i)] = i;
  }

  exports.encode = function(arraybuffer) {
    var bytes = new Uint8Array(arraybuffer),
    i, len = bytes.length, base64 = "";

    for (i = 0; i < len; i+=3) {
      base64 += chars[bytes[i] >> 2];
      base64 += chars[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
      base64 += chars[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
      base64 += chars[bytes[i + 2] & 63];
    }

    if ((len % 3) === 2) {
      base64 = base64.substring(0, base64.length - 1) + "=";
    } else if (len % 3 === 1) {
      base64 = base64.substring(0, base64.length - 2) + "==";
    }

    return base64;
  };

  exports.decode =  function(base64) {
    var bufferLength = base64.length * 0.75,
    len = base64.length, i, p = 0,
    encoded1, encoded2, encoded3, encoded4;

    if (base64[base64.length - 1] === "=") {
      bufferLength--;
      if (base64[base64.length - 2] === "=") {
        bufferLength--;
      }
    }

    var arraybuffer = new ArrayBuffer(bufferLength),
    bytes = new Uint8Array(arraybuffer);

    for (i = 0; i < len; i+=4) {
      encoded1 = lookup[base64.charCodeAt(i)];
      encoded2 = lookup[base64.charCodeAt(i+1)];
      encoded3 = lookup[base64.charCodeAt(i+2)];
      encoded4 = lookup[base64.charCodeAt(i+3)];

      bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
      bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
      bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
    }

    return arraybuffer;
  };
})();

},{}],31:[function(require,module,exports){
var document = require('global/document')
var hyperx = require('hyperx')
var onload = require('on-load')

var SVGNS = 'http://www.w3.org/2000/svg'
var XLINKNS = 'http://www.w3.org/1999/xlink'

var BOOL_PROPS = {
  autofocus: 1,
  checked: 1,
  defaultchecked: 1,
  disabled: 1,
  formnovalidate: 1,
  indeterminate: 1,
  readonly: 1,
  required: 1,
  selected: 1,
  willvalidate: 1
}
var SVG_TAGS = [
  'svg',
  'altGlyph', 'altGlyphDef', 'altGlyphItem', 'animate', 'animateColor',
  'animateMotion', 'animateTransform', 'circle', 'clipPath', 'color-profile',
  'cursor', 'defs', 'desc', 'ellipse', 'feBlend', 'feColorMatrix',
  'feComponentTransfer', 'feComposite', 'feConvolveMatrix', 'feDiffuseLighting',
  'feDisplacementMap', 'feDistantLight', 'feFlood', 'feFuncA', 'feFuncB',
  'feFuncG', 'feFuncR', 'feGaussianBlur', 'feImage', 'feMerge', 'feMergeNode',
  'feMorphology', 'feOffset', 'fePointLight', 'feSpecularLighting',
  'feSpotLight', 'feTile', 'feTurbulence', 'filter', 'font', 'font-face',
  'font-face-format', 'font-face-name', 'font-face-src', 'font-face-uri',
  'foreignObject', 'g', 'glyph', 'glyphRef', 'hkern', 'image', 'line',
  'linearGradient', 'marker', 'mask', 'metadata', 'missing-glyph', 'mpath',
  'path', 'pattern', 'polygon', 'polyline', 'radialGradient', 'rect',
  'set', 'stop', 'switch', 'symbol', 'text', 'textPath', 'title', 'tref',
  'tspan', 'use', 'view', 'vkern'
]

function belCreateElement (tag, props, children) {
  var el

  // If an svg tag, it needs a namespace
  if (SVG_TAGS.indexOf(tag) !== -1) {
    props.namespace = SVGNS
  }

  // If we are using a namespace
  var ns = false
  if (props.namespace) {
    ns = props.namespace
    delete props.namespace
  }

  // Create the element
  if (ns) {
    el = document.createElementNS(ns, tag)
  } else {
    el = document.createElement(tag)
  }

  // If adding onload events
  if (props.onload || props.onunload) {
    var load = props.onload || function () {}
    var unload = props.onunload || function () {}
    onload(el, function belOnload () {
      load(el)
    }, function belOnunload () {
      unload(el)
    },
    // We have to use non-standard `caller` to find who invokes `belCreateElement`
    belCreateElement.caller.caller.caller)
    delete props.onload
    delete props.onunload
  }

  // Create the properties
  for (var p in props) {
    if (props.hasOwnProperty(p)) {
      var key = p.toLowerCase()
      var val = props[p]
      // Normalize className
      if (key === 'classname') {
        key = 'class'
        p = 'class'
      }
      // The for attribute gets transformed to htmlFor, but we just set as for
      if (p === 'htmlFor') {
        p = 'for'
      }
      // If a property is boolean, set itself to the key
      if (BOOL_PROPS[key]) {
        if (val === 'true') val = key
        else if (val === 'false') continue
      }
      // If a property prefers being set directly vs setAttribute
      if (key.slice(0, 2) === 'on') {
        el[p] = val
      } else {
        if (ns) {
          if (p === 'xlink:href') {
            el.setAttributeNS(XLINKNS, p, val)
          } else {
            el.setAttributeNS(null, p, val)
          }
        } else {
          el.setAttribute(p, val)
        }
      }
    }
  }

  function appendChild (childs) {
    if (!Array.isArray(childs)) return
    for (var i = 0; i < childs.length; i++) {
      var node = childs[i]
      if (Array.isArray(node)) {
        appendChild(node)
        continue
      }

      if (typeof node === 'number' ||
        typeof node === 'boolean' ||
        node instanceof Date ||
        node instanceof RegExp) {
        node = node.toString()
      }

      if (typeof node === 'string') {
        if (el.lastChild && el.lastChild.nodeName === '#text') {
          el.lastChild.nodeValue += node
          continue
        }
        node = document.createTextNode(node)
      }

      if (node && node.nodeType) {
        el.appendChild(node)
      }
    }
  }
  appendChild(children)

  return el
}

module.exports = hyperx(belCreateElement)
module.exports.createElement = belCreateElement

},{"global/document":349,"hyperx":354,"on-load":360}],32:[function(require,module,exports){
(function (global){
/**
 * Create a blob builder even when vendor prefixes exist
 */

var BlobBuilder = global.BlobBuilder
  || global.WebKitBlobBuilder
  || global.MSBlobBuilder
  || global.MozBlobBuilder;

/**
 * Check if Blob constructor is supported
 */

var blobSupported = (function() {
  try {
    var a = new Blob(['hi']);
    return a.size === 2;
  } catch(e) {
    return false;
  }
})();

/**
 * Check if Blob constructor supports ArrayBufferViews
 * Fails in Safari 6, so we need to map to ArrayBuffers there.
 */

var blobSupportsArrayBufferView = blobSupported && (function() {
  try {
    var b = new Blob([new Uint8Array([1,2])]);
    return b.size === 2;
  } catch(e) {
    return false;
  }
})();

/**
 * Check if BlobBuilder is supported
 */

var blobBuilderSupported = BlobBuilder
  && BlobBuilder.prototype.append
  && BlobBuilder.prototype.getBlob;

/**
 * Helper function that maps ArrayBufferViews to ArrayBuffers
 * Used by BlobBuilder constructor and old browsers that didn't
 * support it in the Blob constructor.
 */

function mapArrayBufferViews(ary) {
  for (var i = 0; i < ary.length; i++) {
    var chunk = ary[i];
    if (chunk.buffer instanceof ArrayBuffer) {
      var buf = chunk.buffer;

      // if this is a subarray, make a copy so we only
      // include the subarray region from the underlying buffer
      if (chunk.byteLength !== buf.byteLength) {
        var copy = new Uint8Array(chunk.byteLength);
        copy.set(new Uint8Array(buf, chunk.byteOffset, chunk.byteLength));
        buf = copy.buffer;
      }

      ary[i] = buf;
    }
  }
}

function BlobBuilderConstructor(ary, options) {
  options = options || {};

  var bb = new BlobBuilder();
  mapArrayBufferViews(ary);

  for (var i = 0; i < ary.length; i++) {
    bb.append(ary[i]);
  }

  return (options.type) ? bb.getBlob(options.type) : bb.getBlob();
};

function BlobConstructor(ary, options) {
  mapArrayBufferViews(ary);
  return new Blob(ary, options || {});
};

module.exports = (function() {
  if (blobSupported) {
    return blobSupportsArrayBufferView ? global.Blob : BlobConstructor;
  } else if (blobBuilderSupported) {
    return BlobBuilderConstructor;
  } else {
    return undefined;
  }
})();

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],33:[function(require,module,exports){

},{}],34:[function(require,module,exports){
/**
 * Slice reference.
 */

var slice = [].slice;

/**
 * Bind `obj` to `fn`.
 *
 * @param {Object} obj
 * @param {Function|String} fn or string
 * @return {Function}
 * @api public
 */

module.exports = function(obj, fn){
  if ('string' == typeof fn) fn = obj[fn];
  if ('function' != typeof fn) throw new Error('bind() requires a function');
  var args = slice.call(arguments, 2);
  return function(){
    return fn.apply(obj, args.concat(slice.call(arguments)));
  }
};

},{}],35:[function(require,module,exports){

/**
 * Expose `Emitter`.
 */

if (typeof module !== 'undefined') {
  module.exports = Emitter;
}

/**
 * Initialize a new `Emitter`.
 *
 * @api public
 */

function Emitter(obj) {
  if (obj) return mixin(obj);
};

/**
 * Mixin the emitter properties.
 *
 * @param {Object} obj
 * @return {Object}
 * @api private
 */

function mixin(obj) {
  for (var key in Emitter.prototype) {
    obj[key] = Emitter.prototype[key];
  }
  return obj;
}

/**
 * Listen on the given `event` with `fn`.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.on =
Emitter.prototype.addEventListener = function(event, fn){
  this._callbacks = this._callbacks || {};
  (this._callbacks['$' + event] = this._callbacks['$' + event] || [])
    .push(fn);
  return this;
};

/**
 * Adds an `event` listener that will be invoked a single
 * time then automatically removed.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.once = function(event, fn){
  function on() {
    this.off(event, on);
    fn.apply(this, arguments);
  }

  on.fn = fn;
  this.on(event, on);
  return this;
};

/**
 * Remove the given callback for `event` or all
 * registered callbacks.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.off =
Emitter.prototype.removeListener =
Emitter.prototype.removeAllListeners =
Emitter.prototype.removeEventListener = function(event, fn){
  this._callbacks = this._callbacks || {};

  // all
  if (0 == arguments.length) {
    this._callbacks = {};
    return this;
  }

  // specific event
  var callbacks = this._callbacks['$' + event];
  if (!callbacks) return this;

  // remove all handlers
  if (1 == arguments.length) {
    delete this._callbacks['$' + event];
    return this;
  }

  // remove specific handler
  var cb;
  for (var i = 0; i < callbacks.length; i++) {
    cb = callbacks[i];
    if (cb === fn || cb.fn === fn) {
      callbacks.splice(i, 1);
      break;
    }
  }
  return this;
};

/**
 * Emit `event` with the given args.
 *
 * @param {String} event
 * @param {Mixed} ...
 * @return {Emitter}
 */

Emitter.prototype.emit = function(event){
  this._callbacks = this._callbacks || {};
  var args = [].slice.call(arguments, 1)
    , callbacks = this._callbacks['$' + event];

  if (callbacks) {
    callbacks = callbacks.slice(0);
    for (var i = 0, len = callbacks.length; i < len; ++i) {
      callbacks[i].apply(this, args);
    }
  }

  return this;
};

/**
 * Return array of callbacks for `event`.
 *
 * @param {String} event
 * @return {Array}
 * @api public
 */

Emitter.prototype.listeners = function(event){
  this._callbacks = this._callbacks || {};
  return this._callbacks['$' + event] || [];
};

/**
 * Check if this emitter has `event` handlers.
 *
 * @param {String} event
 * @return {Boolean}
 * @api public
 */

Emitter.prototype.hasListeners = function(event){
  return !! this.listeners(event).length;
};

},{}],36:[function(require,module,exports){

module.exports = function(a, b){
  var fn = function(){};
  fn.prototype = b.prototype;
  a.prototype = new fn;
  a.prototype.constructor = a;
};
},{}],37:[function(require,module,exports){
require('../../modules/core.regexp.escape');
module.exports = require('../../modules/_core').RegExp.escape;
},{"../../modules/_core":58,"../../modules/core.regexp.escape":154}],38:[function(require,module,exports){
module.exports = function(it){
  if(typeof it != 'function')throw TypeError(it + ' is not a function!');
  return it;
};
},{}],39:[function(require,module,exports){
var cof = require('./_cof');
module.exports = function(it, msg){
  if(typeof it != 'number' && cof(it) != 'Number')throw TypeError(msg);
  return +it;
};
},{"./_cof":53}],40:[function(require,module,exports){
// 22.1.3.31 Array.prototype[@@unscopables]
var UNSCOPABLES = require('./_wks')('unscopables')
  , ArrayProto  = Array.prototype;
if(ArrayProto[UNSCOPABLES] == undefined)require('./_hide')(ArrayProto, UNSCOPABLES, {});
module.exports = function(key){
  ArrayProto[UNSCOPABLES][key] = true;
};
},{"./_hide":75,"./_wks":152}],41:[function(require,module,exports){
module.exports = function(it, Constructor, name, forbiddenField){
  if(!(it instanceof Constructor) || (forbiddenField !== undefined && forbiddenField in it)){
    throw TypeError(name + ': incorrect invocation!');
  } return it;
};
},{}],42:[function(require,module,exports){
var isObject = require('./_is-object');
module.exports = function(it){
  if(!isObject(it))throw TypeError(it + ' is not an object!');
  return it;
};
},{"./_is-object":84}],43:[function(require,module,exports){
// 22.1.3.3 Array.prototype.copyWithin(target, start, end = this.length)
'use strict';
var toObject = require('./_to-object')
  , toIndex  = require('./_to-index')
  , toLength = require('./_to-length');

module.exports = [].copyWithin || function copyWithin(target/*= 0*/, start/*= 0, end = @length*/){
  var O     = toObject(this)
    , len   = toLength(O.length)
    , to    = toIndex(target, len)
    , from  = toIndex(start, len)
    , end   = arguments.length > 2 ? arguments[2] : undefined
    , count = Math.min((end === undefined ? len : toIndex(end, len)) - from, len - to)
    , inc   = 1;
  if(from < to && to < from + count){
    inc  = -1;
    from += count - 1;
    to   += count - 1;
  }
  while(count-- > 0){
    if(from in O)O[to] = O[from];
    else delete O[to];
    to   += inc;
    from += inc;
  } return O;
};
},{"./_to-index":140,"./_to-length":143,"./_to-object":144}],44:[function(require,module,exports){
// 22.1.3.6 Array.prototype.fill(value, start = 0, end = this.length)
'use strict';
var toObject = require('./_to-object')
  , toIndex  = require('./_to-index')
  , toLength = require('./_to-length');
module.exports = function fill(value /*, start = 0, end = @length */){
  var O      = toObject(this)
    , length = toLength(O.length)
    , aLen   = arguments.length
    , index  = toIndex(aLen > 1 ? arguments[1] : undefined, length)
    , end    = aLen > 2 ? arguments[2] : undefined
    , endPos = end === undefined ? length : toIndex(end, length);
  while(endPos > index)O[index++] = value;
  return O;
};
},{"./_to-index":140,"./_to-length":143,"./_to-object":144}],45:[function(require,module,exports){
var forOf = require('./_for-of');

module.exports = function(iter, ITERATOR){
  var result = [];
  forOf(iter, false, result.push, result, ITERATOR);
  return result;
};

},{"./_for-of":72}],46:[function(require,module,exports){
// false -> Array#indexOf
// true  -> Array#includes
var toIObject = require('./_to-iobject')
  , toLength  = require('./_to-length')
  , toIndex   = require('./_to-index');
module.exports = function(IS_INCLUDES){
  return function($this, el, fromIndex){
    var O      = toIObject($this)
      , length = toLength(O.length)
      , index  = toIndex(fromIndex, length)
      , value;
    // Array#includes uses SameValueZero equality algorithm
    if(IS_INCLUDES && el != el)while(length > index){
      value = O[index++];
      if(value != value)return true;
    // Array#toIndex ignores holes, Array#includes - not
    } else for(;length > index; index++)if(IS_INCLUDES || index in O){
      if(O[index] === el)return IS_INCLUDES || index || 0;
    } return !IS_INCLUDES && -1;
  };
};
},{"./_to-index":140,"./_to-iobject":142,"./_to-length":143}],47:[function(require,module,exports){
// 0 -> Array#forEach
// 1 -> Array#map
// 2 -> Array#filter
// 3 -> Array#some
// 4 -> Array#every
// 5 -> Array#find
// 6 -> Array#findIndex
var ctx      = require('./_ctx')
  , IObject  = require('./_iobject')
  , toObject = require('./_to-object')
  , toLength = require('./_to-length')
  , asc      = require('./_array-species-create');
module.exports = function(TYPE, $create){
  var IS_MAP        = TYPE == 1
    , IS_FILTER     = TYPE == 2
    , IS_SOME       = TYPE == 3
    , IS_EVERY      = TYPE == 4
    , IS_FIND_INDEX = TYPE == 6
    , NO_HOLES      = TYPE == 5 || IS_FIND_INDEX
    , create        = $create || asc;
  return function($this, callbackfn, that){
    var O      = toObject($this)
      , self   = IObject(O)
      , f      = ctx(callbackfn, that, 3)
      , length = toLength(self.length)
      , index  = 0
      , result = IS_MAP ? create($this, length) : IS_FILTER ? create($this, 0) : undefined
      , val, res;
    for(;length > index; index++)if(NO_HOLES || index in self){
      val = self[index];
      res = f(val, index, O);
      if(TYPE){
        if(IS_MAP)result[index] = res;            // map
        else if(res)switch(TYPE){
          case 3: return true;                    // some
          case 5: return val;                     // find
          case 6: return index;                   // findIndex
          case 2: result.push(val);               // filter
        } else if(IS_EVERY)return false;          // every
      }
    }
    return IS_FIND_INDEX ? -1 : IS_SOME || IS_EVERY ? IS_EVERY : result;
  };
};
},{"./_array-species-create":50,"./_ctx":60,"./_iobject":80,"./_to-length":143,"./_to-object":144}],48:[function(require,module,exports){
var aFunction = require('./_a-function')
  , toObject  = require('./_to-object')
  , IObject   = require('./_iobject')
  , toLength  = require('./_to-length');

module.exports = function(that, callbackfn, aLen, memo, isRight){
  aFunction(callbackfn);
  var O      = toObject(that)
    , self   = IObject(O)
    , length = toLength(O.length)
    , index  = isRight ? length - 1 : 0
    , i      = isRight ? -1 : 1;
  if(aLen < 2)for(;;){
    if(index in self){
      memo = self[index];
      index += i;
      break;
    }
    index += i;
    if(isRight ? index < 0 : length <= index){
      throw TypeError('Reduce of empty array with no initial value');
    }
  }
  for(;isRight ? index >= 0 : length > index; index += i)if(index in self){
    memo = callbackfn(memo, self[index], index, O);
  }
  return memo;
};
},{"./_a-function":38,"./_iobject":80,"./_to-length":143,"./_to-object":144}],49:[function(require,module,exports){
var isObject = require('./_is-object')
  , isArray  = require('./_is-array')
  , SPECIES  = require('./_wks')('species');

module.exports = function(original){
  var C;
  if(isArray(original)){
    C = original.constructor;
    // cross-realm fallback
    if(typeof C == 'function' && (C === Array || isArray(C.prototype)))C = undefined;
    if(isObject(C)){
      C = C[SPECIES];
      if(C === null)C = undefined;
    }
  } return C === undefined ? Array : C;
};
},{"./_is-array":82,"./_is-object":84,"./_wks":152}],50:[function(require,module,exports){
// 9.4.2.3 ArraySpeciesCreate(originalArray, length)
var speciesConstructor = require('./_array-species-constructor');

module.exports = function(original, length){
  return new (speciesConstructor(original))(length);
};
},{"./_array-species-constructor":49}],51:[function(require,module,exports){
'use strict';
var aFunction  = require('./_a-function')
  , isObject   = require('./_is-object')
  , invoke     = require('./_invoke')
  , arraySlice = [].slice
  , factories  = {};

var construct = function(F, len, args){
  if(!(len in factories)){
    for(var n = [], i = 0; i < len; i++)n[i] = 'a[' + i + ']';
    factories[len] = Function('F,a', 'return new F(' + n.join(',') + ')');
  } return factories[len](F, args);
};

module.exports = Function.bind || function bind(that /*, args... */){
  var fn       = aFunction(this)
    , partArgs = arraySlice.call(arguments, 1);
  var bound = function(/* args... */){
    var args = partArgs.concat(arraySlice.call(arguments));
    return this instanceof bound ? construct(fn, args.length, args) : invoke(fn, args, that);
  };
  if(isObject(fn.prototype))bound.prototype = fn.prototype;
  return bound;
};
},{"./_a-function":38,"./_invoke":79,"./_is-object":84}],52:[function(require,module,exports){
// getting tag from 19.1.3.6 Object.prototype.toString()
var cof = require('./_cof')
  , TAG = require('./_wks')('toStringTag')
  // ES3 wrong here
  , ARG = cof(function(){ return arguments; }()) == 'Arguments';

// fallback for IE11 Script Access Denied error
var tryGet = function(it, key){
  try {
    return it[key];
  } catch(e){ /* empty */ }
};

module.exports = function(it){
  var O, T, B;
  return it === undefined ? 'Undefined' : it === null ? 'Null'
    // @@toStringTag case
    : typeof (T = tryGet(O = Object(it), TAG)) == 'string' ? T
    // builtinTag case
    : ARG ? cof(O)
    // ES3 arguments fallback
    : (B = cof(O)) == 'Object' && typeof O.callee == 'function' ? 'Arguments' : B;
};
},{"./_cof":53,"./_wks":152}],53:[function(require,module,exports){
var toString = {}.toString;

module.exports = function(it){
  return toString.call(it).slice(8, -1);
};
},{}],54:[function(require,module,exports){
'use strict';
var dP          = require('./_object-dp').f
  , create      = require('./_object-create')
  , redefineAll = require('./_redefine-all')
  , ctx         = require('./_ctx')
  , anInstance  = require('./_an-instance')
  , defined     = require('./_defined')
  , forOf       = require('./_for-of')
  , $iterDefine = require('./_iter-define')
  , step        = require('./_iter-step')
  , setSpecies  = require('./_set-species')
  , DESCRIPTORS = require('./_descriptors')
  , fastKey     = require('./_meta').fastKey
  , SIZE        = DESCRIPTORS ? '_s' : 'size';

var getEntry = function(that, key){
  // fast case
  var index = fastKey(key), entry;
  if(index !== 'F')return that._i[index];
  // frozen object case
  for(entry = that._f; entry; entry = entry.n){
    if(entry.k == key)return entry;
  }
};

module.exports = {
  getConstructor: function(wrapper, NAME, IS_MAP, ADDER){
    var C = wrapper(function(that, iterable){
      anInstance(that, C, NAME, '_i');
      that._i = create(null); // index
      that._f = undefined;    // first entry
      that._l = undefined;    // last entry
      that[SIZE] = 0;         // size
      if(iterable != undefined)forOf(iterable, IS_MAP, that[ADDER], that);
    });
    redefineAll(C.prototype, {
      // 23.1.3.1 Map.prototype.clear()
      // 23.2.3.2 Set.prototype.clear()
      clear: function clear(){
        for(var that = this, data = that._i, entry = that._f; entry; entry = entry.n){
          entry.r = true;
          if(entry.p)entry.p = entry.p.n = undefined;
          delete data[entry.i];
        }
        that._f = that._l = undefined;
        that[SIZE] = 0;
      },
      // 23.1.3.3 Map.prototype.delete(key)
      // 23.2.3.4 Set.prototype.delete(value)
      'delete': function(key){
        var that  = this
          , entry = getEntry(that, key);
        if(entry){
          var next = entry.n
            , prev = entry.p;
          delete that._i[entry.i];
          entry.r = true;
          if(prev)prev.n = next;
          if(next)next.p = prev;
          if(that._f == entry)that._f = next;
          if(that._l == entry)that._l = prev;
          that[SIZE]--;
        } return !!entry;
      },
      // 23.2.3.6 Set.prototype.forEach(callbackfn, thisArg = undefined)
      // 23.1.3.5 Map.prototype.forEach(callbackfn, thisArg = undefined)
      forEach: function forEach(callbackfn /*, that = undefined */){
        anInstance(this, C, 'forEach');
        var f = ctx(callbackfn, arguments.length > 1 ? arguments[1] : undefined, 3)
          , entry;
        while(entry = entry ? entry.n : this._f){
          f(entry.v, entry.k, this);
          // revert to the last existing entry
          while(entry && entry.r)entry = entry.p;
        }
      },
      // 23.1.3.7 Map.prototype.has(key)
      // 23.2.3.7 Set.prototype.has(value)
      has: function has(key){
        return !!getEntry(this, key);
      }
    });
    if(DESCRIPTORS)dP(C.prototype, 'size', {
      get: function(){
        return defined(this[SIZE]);
      }
    });
    return C;
  },
  def: function(that, key, value){
    var entry = getEntry(that, key)
      , prev, index;
    // change existing entry
    if(entry){
      entry.v = value;
    // create new entry
    } else {
      that._l = entry = {
        i: index = fastKey(key, true), // <- index
        k: key,                        // <- key
        v: value,                      // <- value
        p: prev = that._l,             // <- previous entry
        n: undefined,                  // <- next entry
        r: false                       // <- removed
      };
      if(!that._f)that._f = entry;
      if(prev)prev.n = entry;
      that[SIZE]++;
      // add to index
      if(index !== 'F')that._i[index] = entry;
    } return that;
  },
  getEntry: getEntry,
  setStrong: function(C, NAME, IS_MAP){
    // add .keys, .values, .entries, [@@iterator]
    // 23.1.3.4, 23.1.3.8, 23.1.3.11, 23.1.3.12, 23.2.3.5, 23.2.3.8, 23.2.3.10, 23.2.3.11
    $iterDefine(C, NAME, function(iterated, kind){
      this._t = iterated;  // target
      this._k = kind;      // kind
      this._l = undefined; // previous
    }, function(){
      var that  = this
        , kind  = that._k
        , entry = that._l;
      // revert to the last existing entry
      while(entry && entry.r)entry = entry.p;
      // get next entry
      if(!that._t || !(that._l = entry = entry ? entry.n : that._t._f)){
        // or finish the iteration
        that._t = undefined;
        return step(1);
      }
      // return step by kind
      if(kind == 'keys'  )return step(0, entry.k);
      if(kind == 'values')return step(0, entry.v);
      return step(0, [entry.k, entry.v]);
    }, IS_MAP ? 'entries' : 'values' , !IS_MAP, true);

    // add [@@species], 23.1.2.2, 23.2.2.2
    setSpecies(NAME);
  }
};
},{"./_an-instance":41,"./_ctx":60,"./_defined":62,"./_descriptors":63,"./_for-of":72,"./_iter-define":88,"./_iter-step":90,"./_meta":97,"./_object-create":101,"./_object-dp":102,"./_redefine-all":121,"./_set-species":126}],55:[function(require,module,exports){
// https://github.com/DavidBruant/Map-Set.prototype.toJSON
var classof = require('./_classof')
  , from    = require('./_array-from-iterable');
module.exports = function(NAME){
  return function toJSON(){
    if(classof(this) != NAME)throw TypeError(NAME + "#toJSON isn't generic");
    return from(this);
  };
};
},{"./_array-from-iterable":45,"./_classof":52}],56:[function(require,module,exports){
'use strict';
var redefineAll       = require('./_redefine-all')
  , getWeak           = require('./_meta').getWeak
  , anObject          = require('./_an-object')
  , isObject          = require('./_is-object')
  , anInstance        = require('./_an-instance')
  , forOf             = require('./_for-of')
  , createArrayMethod = require('./_array-methods')
  , $has              = require('./_has')
  , arrayFind         = createArrayMethod(5)
  , arrayFindIndex    = createArrayMethod(6)
  , id                = 0;

// fallback for uncaught frozen keys
var uncaughtFrozenStore = function(that){
  return that._l || (that._l = new UncaughtFrozenStore);
};
var UncaughtFrozenStore = function(){
  this.a = [];
};
var findUncaughtFrozen = function(store, key){
  return arrayFind(store.a, function(it){
    return it[0] === key;
  });
};
UncaughtFrozenStore.prototype = {
  get: function(key){
    var entry = findUncaughtFrozen(this, key);
    if(entry)return entry[1];
  },
  has: function(key){
    return !!findUncaughtFrozen(this, key);
  },
  set: function(key, value){
    var entry = findUncaughtFrozen(this, key);
    if(entry)entry[1] = value;
    else this.a.push([key, value]);
  },
  'delete': function(key){
    var index = arrayFindIndex(this.a, function(it){
      return it[0] === key;
    });
    if(~index)this.a.splice(index, 1);
    return !!~index;
  }
};

module.exports = {
  getConstructor: function(wrapper, NAME, IS_MAP, ADDER){
    var C = wrapper(function(that, iterable){
      anInstance(that, C, NAME, '_i');
      that._i = id++;      // collection id
      that._l = undefined; // leak store for uncaught frozen objects
      if(iterable != undefined)forOf(iterable, IS_MAP, that[ADDER], that);
    });
    redefineAll(C.prototype, {
      // 23.3.3.2 WeakMap.prototype.delete(key)
      // 23.4.3.3 WeakSet.prototype.delete(value)
      'delete': function(key){
        if(!isObject(key))return false;
        var data = getWeak(key);
        if(data === true)return uncaughtFrozenStore(this)['delete'](key);
        return data && $has(data, this._i) && delete data[this._i];
      },
      // 23.3.3.4 WeakMap.prototype.has(key)
      // 23.4.3.4 WeakSet.prototype.has(value)
      has: function has(key){
        if(!isObject(key))return false;
        var data = getWeak(key);
        if(data === true)return uncaughtFrozenStore(this).has(key);
        return data && $has(data, this._i);
      }
    });
    return C;
  },
  def: function(that, key, value){
    var data = getWeak(anObject(key), true);
    if(data === true)uncaughtFrozenStore(that).set(key, value);
    else data[that._i] = value;
    return that;
  },
  ufstore: uncaughtFrozenStore
};
},{"./_an-instance":41,"./_an-object":42,"./_array-methods":47,"./_for-of":72,"./_has":74,"./_is-object":84,"./_meta":97,"./_redefine-all":121}],57:[function(require,module,exports){
'use strict';
var global            = require('./_global')
  , $export           = require('./_export')
  , redefine          = require('./_redefine')
  , redefineAll       = require('./_redefine-all')
  , meta              = require('./_meta')
  , forOf             = require('./_for-of')
  , anInstance        = require('./_an-instance')
  , isObject          = require('./_is-object')
  , fails             = require('./_fails')
  , $iterDetect       = require('./_iter-detect')
  , setToStringTag    = require('./_set-to-string-tag')
  , inheritIfRequired = require('./_inherit-if-required');

module.exports = function(NAME, wrapper, methods, common, IS_MAP, IS_WEAK){
  var Base  = global[NAME]
    , C     = Base
    , ADDER = IS_MAP ? 'set' : 'add'
    , proto = C && C.prototype
    , O     = {};
  var fixMethod = function(KEY){
    var fn = proto[KEY];
    redefine(proto, KEY,
      KEY == 'delete' ? function(a){
        return IS_WEAK && !isObject(a) ? false : fn.call(this, a === 0 ? 0 : a);
      } : KEY == 'has' ? function has(a){
        return IS_WEAK && !isObject(a) ? false : fn.call(this, a === 0 ? 0 : a);
      } : KEY == 'get' ? function get(a){
        return IS_WEAK && !isObject(a) ? undefined : fn.call(this, a === 0 ? 0 : a);
      } : KEY == 'add' ? function add(a){ fn.call(this, a === 0 ? 0 : a); return this; }
        : function set(a, b){ fn.call(this, a === 0 ? 0 : a, b); return this; }
    );
  };
  if(typeof C != 'function' || !(IS_WEAK || proto.forEach && !fails(function(){
    new C().entries().next();
  }))){
    // create collection constructor
    C = common.getConstructor(wrapper, NAME, IS_MAP, ADDER);
    redefineAll(C.prototype, methods);
    meta.NEED = true;
  } else {
    var instance             = new C
      // early implementations not supports chaining
      , HASNT_CHAINING       = instance[ADDER](IS_WEAK ? {} : -0, 1) != instance
      // V8 ~  Chromium 40- weak-collections throws on primitives, but should return false
      , THROWS_ON_PRIMITIVES = fails(function(){ instance.has(1); })
      // most early implementations doesn't supports iterables, most modern - not close it correctly
      , ACCEPT_ITERABLES     = $iterDetect(function(iter){ new C(iter); }) // eslint-disable-line no-new
      // for early implementations -0 and +0 not the same
      , BUGGY_ZERO = !IS_WEAK && fails(function(){
        // V8 ~ Chromium 42- fails only with 5+ elements
        var $instance = new C()
          , index     = 5;
        while(index--)$instance[ADDER](index, index);
        return !$instance.has(-0);
      });
    if(!ACCEPT_ITERABLES){ 
      C = wrapper(function(target, iterable){
        anInstance(target, C, NAME);
        var that = inheritIfRequired(new Base, target, C);
        if(iterable != undefined)forOf(iterable, IS_MAP, that[ADDER], that);
        return that;
      });
      C.prototype = proto;
      proto.constructor = C;
    }
    if(THROWS_ON_PRIMITIVES || BUGGY_ZERO){
      fixMethod('delete');
      fixMethod('has');
      IS_MAP && fixMethod('get');
    }
    if(BUGGY_ZERO || HASNT_CHAINING)fixMethod(ADDER);
    // weak collections should not contains .clear method
    if(IS_WEAK && proto.clear)delete proto.clear;
  }

  setToStringTag(C, NAME);

  O[NAME] = C;
  $export($export.G + $export.W + $export.F * (C != Base), O);

  if(!IS_WEAK)common.setStrong(C, NAME, IS_MAP);

  return C;
};
},{"./_an-instance":41,"./_export":67,"./_fails":69,"./_for-of":72,"./_global":73,"./_inherit-if-required":78,"./_is-object":84,"./_iter-detect":89,"./_meta":97,"./_redefine":122,"./_redefine-all":121,"./_set-to-string-tag":127}],58:[function(require,module,exports){
var core = module.exports = {version: '2.4.0'};
if(typeof __e == 'number')__e = core; // eslint-disable-line no-undef
},{}],59:[function(require,module,exports){
'use strict';
var $defineProperty = require('./_object-dp')
  , createDesc      = require('./_property-desc');

module.exports = function(object, index, value){
  if(index in object)$defineProperty.f(object, index, createDesc(0, value));
  else object[index] = value;
};
},{"./_object-dp":102,"./_property-desc":120}],60:[function(require,module,exports){
// optional / simple context binding
var aFunction = require('./_a-function');
module.exports = function(fn, that, length){
  aFunction(fn);
  if(that === undefined)return fn;
  switch(length){
    case 1: return function(a){
      return fn.call(that, a);
    };
    case 2: return function(a, b){
      return fn.call(that, a, b);
    };
    case 3: return function(a, b, c){
      return fn.call(that, a, b, c);
    };
  }
  return function(/* ...args */){
    return fn.apply(that, arguments);
  };
};
},{"./_a-function":38}],61:[function(require,module,exports){
'use strict';
var anObject    = require('./_an-object')
  , toPrimitive = require('./_to-primitive')
  , NUMBER      = 'number';

module.exports = function(hint){
  if(hint !== 'string' && hint !== NUMBER && hint !== 'default')throw TypeError('Incorrect hint');
  return toPrimitive(anObject(this), hint != NUMBER);
};
},{"./_an-object":42,"./_to-primitive":145}],62:[function(require,module,exports){
// 7.2.1 RequireObjectCoercible(argument)
module.exports = function(it){
  if(it == undefined)throw TypeError("Can't call method on  " + it);
  return it;
};
},{}],63:[function(require,module,exports){
// Thank's IE8 for his funny defineProperty
module.exports = !require('./_fails')(function(){
  return Object.defineProperty({}, 'a', {get: function(){ return 7; }}).a != 7;
});
},{"./_fails":69}],64:[function(require,module,exports){
var isObject = require('./_is-object')
  , document = require('./_global').document
  // in old IE typeof document.createElement is 'object'
  , is = isObject(document) && isObject(document.createElement);
module.exports = function(it){
  return is ? document.createElement(it) : {};
};
},{"./_global":73,"./_is-object":84}],65:[function(require,module,exports){
// IE 8- don't enum bug keys
module.exports = (
  'constructor,hasOwnProperty,isPrototypeOf,propertyIsEnumerable,toLocaleString,toString,valueOf'
).split(',');
},{}],66:[function(require,module,exports){
// all enumerable object keys, includes symbols
var getKeys = require('./_object-keys')
  , gOPS    = require('./_object-gops')
  , pIE     = require('./_object-pie');
module.exports = function(it){
  var result     = getKeys(it)
    , getSymbols = gOPS.f;
  if(getSymbols){
    var symbols = getSymbols(it)
      , isEnum  = pIE.f
      , i       = 0
      , key;
    while(symbols.length > i)if(isEnum.call(it, key = symbols[i++]))result.push(key);
  } return result;
};
},{"./_object-gops":108,"./_object-keys":111,"./_object-pie":112}],67:[function(require,module,exports){
var global    = require('./_global')
  , core      = require('./_core')
  , hide      = require('./_hide')
  , redefine  = require('./_redefine')
  , ctx       = require('./_ctx')
  , PROTOTYPE = 'prototype';

var $export = function(type, name, source){
  var IS_FORCED = type & $export.F
    , IS_GLOBAL = type & $export.G
    , IS_STATIC = type & $export.S
    , IS_PROTO  = type & $export.P
    , IS_BIND   = type & $export.B
    , target    = IS_GLOBAL ? global : IS_STATIC ? global[name] || (global[name] = {}) : (global[name] || {})[PROTOTYPE]
    , exports   = IS_GLOBAL ? core : core[name] || (core[name] = {})
    , expProto  = exports[PROTOTYPE] || (exports[PROTOTYPE] = {})
    , key, own, out, exp;
  if(IS_GLOBAL)source = name;
  for(key in source){
    // contains in native
    own = !IS_FORCED && target && target[key] !== undefined;
    // export native or passed
    out = (own ? target : source)[key];
    // bind timers to global for call from export context
    exp = IS_BIND && own ? ctx(out, global) : IS_PROTO && typeof out == 'function' ? ctx(Function.call, out) : out;
    // extend global
    if(target)redefine(target, key, out, type & $export.U);
    // export
    if(exports[key] != out)hide(exports, key, exp);
    if(IS_PROTO && expProto[key] != out)expProto[key] = out;
  }
};
global.core = core;
// type bitmap
$export.F = 1;   // forced
$export.G = 2;   // global
$export.S = 4;   // static
$export.P = 8;   // proto
$export.B = 16;  // bind
$export.W = 32;  // wrap
$export.U = 64;  // safe
$export.R = 128; // real proto method for `library` 
module.exports = $export;
},{"./_core":58,"./_ctx":60,"./_global":73,"./_hide":75,"./_redefine":122}],68:[function(require,module,exports){
var MATCH = require('./_wks')('match');
module.exports = function(KEY){
  var re = /./;
  try {
    '/./'[KEY](re);
  } catch(e){
    try {
      re[MATCH] = false;
      return !'/./'[KEY](re);
    } catch(f){ /* empty */ }
  } return true;
};
},{"./_wks":152}],69:[function(require,module,exports){
module.exports = function(exec){
  try {
    return !!exec();
  } catch(e){
    return true;
  }
};
},{}],70:[function(require,module,exports){
'use strict';
var hide     = require('./_hide')
  , redefine = require('./_redefine')
  , fails    = require('./_fails')
  , defined  = require('./_defined')
  , wks      = require('./_wks');

module.exports = function(KEY, length, exec){
  var SYMBOL   = wks(KEY)
    , fns      = exec(defined, SYMBOL, ''[KEY])
    , strfn    = fns[0]
    , rxfn     = fns[1];
  if(fails(function(){
    var O = {};
    O[SYMBOL] = function(){ return 7; };
    return ''[KEY](O) != 7;
  })){
    redefine(String.prototype, KEY, strfn);
    hide(RegExp.prototype, SYMBOL, length == 2
      // 21.2.5.8 RegExp.prototype[@@replace](string, replaceValue)
      // 21.2.5.11 RegExp.prototype[@@split](string, limit)
      ? function(string, arg){ return rxfn.call(string, this, arg); }
      // 21.2.5.6 RegExp.prototype[@@match](string)
      // 21.2.5.9 RegExp.prototype[@@search](string)
      : function(string){ return rxfn.call(string, this); }
    );
  }
};
},{"./_defined":62,"./_fails":69,"./_hide":75,"./_redefine":122,"./_wks":152}],71:[function(require,module,exports){
'use strict';
// 21.2.5.3 get RegExp.prototype.flags
var anObject = require('./_an-object');
module.exports = function(){
  var that   = anObject(this)
    , result = '';
  if(that.global)     result += 'g';
  if(that.ignoreCase) result += 'i';
  if(that.multiline)  result += 'm';
  if(that.unicode)    result += 'u';
  if(that.sticky)     result += 'y';
  return result;
};
},{"./_an-object":42}],72:[function(require,module,exports){
var ctx         = require('./_ctx')
  , call        = require('./_iter-call')
  , isArrayIter = require('./_is-array-iter')
  , anObject    = require('./_an-object')
  , toLength    = require('./_to-length')
  , getIterFn   = require('./core.get-iterator-method')
  , BREAK       = {}
  , RETURN      = {};
var exports = module.exports = function(iterable, entries, fn, that, ITERATOR){
  var iterFn = ITERATOR ? function(){ return iterable; } : getIterFn(iterable)
    , f      = ctx(fn, that, entries ? 2 : 1)
    , index  = 0
    , length, step, iterator, result;
  if(typeof iterFn != 'function')throw TypeError(iterable + ' is not iterable!');
  // fast case for arrays with default iterator
  if(isArrayIter(iterFn))for(length = toLength(iterable.length); length > index; index++){
    result = entries ? f(anObject(step = iterable[index])[0], step[1]) : f(iterable[index]);
    if(result === BREAK || result === RETURN)return result;
  } else for(iterator = iterFn.call(iterable); !(step = iterator.next()).done; ){
    result = call(iterator, f, step.value, entries);
    if(result === BREAK || result === RETURN)return result;
  }
};
exports.BREAK  = BREAK;
exports.RETURN = RETURN;
},{"./_an-object":42,"./_ctx":60,"./_is-array-iter":81,"./_iter-call":86,"./_to-length":143,"./core.get-iterator-method":153}],73:[function(require,module,exports){
// https://github.com/zloirock/core-js/issues/86#issuecomment-115759028
var global = module.exports = typeof window != 'undefined' && window.Math == Math
  ? window : typeof self != 'undefined' && self.Math == Math ? self : Function('return this')();
if(typeof __g == 'number')__g = global; // eslint-disable-line no-undef
},{}],74:[function(require,module,exports){
var hasOwnProperty = {}.hasOwnProperty;
module.exports = function(it, key){
  return hasOwnProperty.call(it, key);
};
},{}],75:[function(require,module,exports){
var dP         = require('./_object-dp')
  , createDesc = require('./_property-desc');
module.exports = require('./_descriptors') ? function(object, key, value){
  return dP.f(object, key, createDesc(1, value));
} : function(object, key, value){
  object[key] = value;
  return object;
};
},{"./_descriptors":63,"./_object-dp":102,"./_property-desc":120}],76:[function(require,module,exports){
module.exports = require('./_global').document && document.documentElement;
},{"./_global":73}],77:[function(require,module,exports){
module.exports = !require('./_descriptors') && !require('./_fails')(function(){
  return Object.defineProperty(require('./_dom-create')('div'), 'a', {get: function(){ return 7; }}).a != 7;
});
},{"./_descriptors":63,"./_dom-create":64,"./_fails":69}],78:[function(require,module,exports){
var isObject       = require('./_is-object')
  , setPrototypeOf = require('./_set-proto').set;
module.exports = function(that, target, C){
  var P, S = target.constructor;
  if(S !== C && typeof S == 'function' && (P = S.prototype) !== C.prototype && isObject(P) && setPrototypeOf){
    setPrototypeOf(that, P);
  } return that;
};
},{"./_is-object":84,"./_set-proto":125}],79:[function(require,module,exports){
// fast apply, http://jsperf.lnkit.com/fast-apply/5
module.exports = function(fn, args, that){
  var un = that === undefined;
  switch(args.length){
    case 0: return un ? fn()
                      : fn.call(that);
    case 1: return un ? fn(args[0])
                      : fn.call(that, args[0]);
    case 2: return un ? fn(args[0], args[1])
                      : fn.call(that, args[0], args[1]);
    case 3: return un ? fn(args[0], args[1], args[2])
                      : fn.call(that, args[0], args[1], args[2]);
    case 4: return un ? fn(args[0], args[1], args[2], args[3])
                      : fn.call(that, args[0], args[1], args[2], args[3]);
  } return              fn.apply(that, args);
};
},{}],80:[function(require,module,exports){
// fallback for non-array-like ES3 and non-enumerable old V8 strings
var cof = require('./_cof');
module.exports = Object('z').propertyIsEnumerable(0) ? Object : function(it){
  return cof(it) == 'String' ? it.split('') : Object(it);
};
},{"./_cof":53}],81:[function(require,module,exports){
// check on default Array iterator
var Iterators  = require('./_iterators')
  , ITERATOR   = require('./_wks')('iterator')
  , ArrayProto = Array.prototype;

module.exports = function(it){
  return it !== undefined && (Iterators.Array === it || ArrayProto[ITERATOR] === it);
};
},{"./_iterators":91,"./_wks":152}],82:[function(require,module,exports){
// 7.2.2 IsArray(argument)
var cof = require('./_cof');
module.exports = Array.isArray || function isArray(arg){
  return cof(arg) == 'Array';
};
},{"./_cof":53}],83:[function(require,module,exports){
// 20.1.2.3 Number.isInteger(number)
var isObject = require('./_is-object')
  , floor    = Math.floor;
module.exports = function isInteger(it){
  return !isObject(it) && isFinite(it) && floor(it) === it;
};
},{"./_is-object":84}],84:[function(require,module,exports){
module.exports = function(it){
  return typeof it === 'object' ? it !== null : typeof it === 'function';
};
},{}],85:[function(require,module,exports){
// 7.2.8 IsRegExp(argument)
var isObject = require('./_is-object')
  , cof      = require('./_cof')
  , MATCH    = require('./_wks')('match');
module.exports = function(it){
  var isRegExp;
  return isObject(it) && ((isRegExp = it[MATCH]) !== undefined ? !!isRegExp : cof(it) == 'RegExp');
};
},{"./_cof":53,"./_is-object":84,"./_wks":152}],86:[function(require,module,exports){
// call something on iterator step with safe closing on error
var anObject = require('./_an-object');
module.exports = function(iterator, fn, value, entries){
  try {
    return entries ? fn(anObject(value)[0], value[1]) : fn(value);
  // 7.4.6 IteratorClose(iterator, completion)
  } catch(e){
    var ret = iterator['return'];
    if(ret !== undefined)anObject(ret.call(iterator));
    throw e;
  }
};
},{"./_an-object":42}],87:[function(require,module,exports){
'use strict';
var create         = require('./_object-create')
  , descriptor     = require('./_property-desc')
  , setToStringTag = require('./_set-to-string-tag')
  , IteratorPrototype = {};

// 25.1.2.1.1 %IteratorPrototype%[@@iterator]()
require('./_hide')(IteratorPrototype, require('./_wks')('iterator'), function(){ return this; });

module.exports = function(Constructor, NAME, next){
  Constructor.prototype = create(IteratorPrototype, {next: descriptor(1, next)});
  setToStringTag(Constructor, NAME + ' Iterator');
};
},{"./_hide":75,"./_object-create":101,"./_property-desc":120,"./_set-to-string-tag":127,"./_wks":152}],88:[function(require,module,exports){
'use strict';
var LIBRARY        = require('./_library')
  , $export        = require('./_export')
  , redefine       = require('./_redefine')
  , hide           = require('./_hide')
  , has            = require('./_has')
  , Iterators      = require('./_iterators')
  , $iterCreate    = require('./_iter-create')
  , setToStringTag = require('./_set-to-string-tag')
  , getPrototypeOf = require('./_object-gpo')
  , ITERATOR       = require('./_wks')('iterator')
  , BUGGY          = !([].keys && 'next' in [].keys()) // Safari has buggy iterators w/o `next`
  , FF_ITERATOR    = '@@iterator'
  , KEYS           = 'keys'
  , VALUES         = 'values';

var returnThis = function(){ return this; };

module.exports = function(Base, NAME, Constructor, next, DEFAULT, IS_SET, FORCED){
  $iterCreate(Constructor, NAME, next);
  var getMethod = function(kind){
    if(!BUGGY && kind in proto)return proto[kind];
    switch(kind){
      case KEYS: return function keys(){ return new Constructor(this, kind); };
      case VALUES: return function values(){ return new Constructor(this, kind); };
    } return function entries(){ return new Constructor(this, kind); };
  };
  var TAG        = NAME + ' Iterator'
    , DEF_VALUES = DEFAULT == VALUES
    , VALUES_BUG = false
    , proto      = Base.prototype
    , $native    = proto[ITERATOR] || proto[FF_ITERATOR] || DEFAULT && proto[DEFAULT]
    , $default   = $native || getMethod(DEFAULT)
    , $entries   = DEFAULT ? !DEF_VALUES ? $default : getMethod('entries') : undefined
    , $anyNative = NAME == 'Array' ? proto.entries || $native : $native
    , methods, key, IteratorPrototype;
  // Fix native
  if($anyNative){
    IteratorPrototype = getPrototypeOf($anyNative.call(new Base));
    if(IteratorPrototype !== Object.prototype){
      // Set @@toStringTag to native iterators
      setToStringTag(IteratorPrototype, TAG, true);
      // fix for some old engines
      if(!LIBRARY && !has(IteratorPrototype, ITERATOR))hide(IteratorPrototype, ITERATOR, returnThis);
    }
  }
  // fix Array#{values, @@iterator}.name in V8 / FF
  if(DEF_VALUES && $native && $native.name !== VALUES){
    VALUES_BUG = true;
    $default = function values(){ return $native.call(this); };
  }
  // Define iterator
  if((!LIBRARY || FORCED) && (BUGGY || VALUES_BUG || !proto[ITERATOR])){
    hide(proto, ITERATOR, $default);
  }
  // Plug for library
  Iterators[NAME] = $default;
  Iterators[TAG]  = returnThis;
  if(DEFAULT){
    methods = {
      values:  DEF_VALUES ? $default : getMethod(VALUES),
      keys:    IS_SET     ? $default : getMethod(KEYS),
      entries: $entries
    };
    if(FORCED)for(key in methods){
      if(!(key in proto))redefine(proto, key, methods[key]);
    } else $export($export.P + $export.F * (BUGGY || VALUES_BUG), NAME, methods);
  }
  return methods;
};
},{"./_export":67,"./_has":74,"./_hide":75,"./_iter-create":87,"./_iterators":91,"./_library":93,"./_object-gpo":109,"./_redefine":122,"./_set-to-string-tag":127,"./_wks":152}],89:[function(require,module,exports){
var ITERATOR     = require('./_wks')('iterator')
  , SAFE_CLOSING = false;

try {
  var riter = [7][ITERATOR]();
  riter['return'] = function(){ SAFE_CLOSING = true; };
  Array.from(riter, function(){ throw 2; });
} catch(e){ /* empty */ }

module.exports = function(exec, skipClosing){
  if(!skipClosing && !SAFE_CLOSING)return false;
  var safe = false;
  try {
    var arr  = [7]
      , iter = arr[ITERATOR]();
    iter.next = function(){ return {done: safe = true}; };
    arr[ITERATOR] = function(){ return iter; };
    exec(arr);
  } catch(e){ /* empty */ }
  return safe;
};
},{"./_wks":152}],90:[function(require,module,exports){
module.exports = function(done, value){
  return {value: value, done: !!done};
};
},{}],91:[function(require,module,exports){
module.exports = {};
},{}],92:[function(require,module,exports){
var getKeys   = require('./_object-keys')
  , toIObject = require('./_to-iobject');
module.exports = function(object, el){
  var O      = toIObject(object)
    , keys   = getKeys(O)
    , length = keys.length
    , index  = 0
    , key;
  while(length > index)if(O[key = keys[index++]] === el)return key;
};
},{"./_object-keys":111,"./_to-iobject":142}],93:[function(require,module,exports){
module.exports = false;
},{}],94:[function(require,module,exports){
// 20.2.2.14 Math.expm1(x)
var $expm1 = Math.expm1;
module.exports = (!$expm1
  // Old FF bug
  || $expm1(10) > 22025.465794806719 || $expm1(10) < 22025.4657948067165168
  // Tor Browser bug
  || $expm1(-2e-17) != -2e-17
) ? function expm1(x){
  return (x = +x) == 0 ? x : x > -1e-6 && x < 1e-6 ? x + x * x / 2 : Math.exp(x) - 1;
} : $expm1;
},{}],95:[function(require,module,exports){
// 20.2.2.20 Math.log1p(x)
module.exports = Math.log1p || function log1p(x){
  return (x = +x) > -1e-8 && x < 1e-8 ? x - x * x / 2 : Math.log(1 + x);
};
},{}],96:[function(require,module,exports){
// 20.2.2.28 Math.sign(x)
module.exports = Math.sign || function sign(x){
  return (x = +x) == 0 || x != x ? x : x < 0 ? -1 : 1;
};
},{}],97:[function(require,module,exports){
var META     = require('./_uid')('meta')
  , isObject = require('./_is-object')
  , has      = require('./_has')
  , setDesc  = require('./_object-dp').f
  , id       = 0;
var isExtensible = Object.isExtensible || function(){
  return true;
};
var FREEZE = !require('./_fails')(function(){
  return isExtensible(Object.preventExtensions({}));
});
var setMeta = function(it){
  setDesc(it, META, {value: {
    i: 'O' + ++id, // object ID
    w: {}          // weak collections IDs
  }});
};
var fastKey = function(it, create){
  // return primitive with prefix
  if(!isObject(it))return typeof it == 'symbol' ? it : (typeof it == 'string' ? 'S' : 'P') + it;
  if(!has(it, META)){
    // can't set metadata to uncaught frozen object
    if(!isExtensible(it))return 'F';
    // not necessary to add metadata
    if(!create)return 'E';
    // add missing metadata
    setMeta(it);
  // return object ID
  } return it[META].i;
};
var getWeak = function(it, create){
  if(!has(it, META)){
    // can't set metadata to uncaught frozen object
    if(!isExtensible(it))return true;
    // not necessary to add metadata
    if(!create)return false;
    // add missing metadata
    setMeta(it);
  // return hash weak collections IDs
  } return it[META].w;
};
// add metadata on freeze-family methods calling
var onFreeze = function(it){
  if(FREEZE && meta.NEED && isExtensible(it) && !has(it, META))setMeta(it);
  return it;
};
var meta = module.exports = {
  KEY:      META,
  NEED:     false,
  fastKey:  fastKey,
  getWeak:  getWeak,
  onFreeze: onFreeze
};
},{"./_fails":69,"./_has":74,"./_is-object":84,"./_object-dp":102,"./_uid":149}],98:[function(require,module,exports){
var Map     = require('./es6.map')
  , $export = require('./_export')
  , shared  = require('./_shared')('metadata')
  , store   = shared.store || (shared.store = new (require('./es6.weak-map')));

var getOrCreateMetadataMap = function(target, targetKey, create){
  var targetMetadata = store.get(target);
  if(!targetMetadata){
    if(!create)return undefined;
    store.set(target, targetMetadata = new Map);
  }
  var keyMetadata = targetMetadata.get(targetKey);
  if(!keyMetadata){
    if(!create)return undefined;
    targetMetadata.set(targetKey, keyMetadata = new Map);
  } return keyMetadata;
};
var ordinaryHasOwnMetadata = function(MetadataKey, O, P){
  var metadataMap = getOrCreateMetadataMap(O, P, false);
  return metadataMap === undefined ? false : metadataMap.has(MetadataKey);
};
var ordinaryGetOwnMetadata = function(MetadataKey, O, P){
  var metadataMap = getOrCreateMetadataMap(O, P, false);
  return metadataMap === undefined ? undefined : metadataMap.get(MetadataKey);
};
var ordinaryDefineOwnMetadata = function(MetadataKey, MetadataValue, O, P){
  getOrCreateMetadataMap(O, P, true).set(MetadataKey, MetadataValue);
};
var ordinaryOwnMetadataKeys = function(target, targetKey){
  var metadataMap = getOrCreateMetadataMap(target, targetKey, false)
    , keys        = [];
  if(metadataMap)metadataMap.forEach(function(_, key){ keys.push(key); });
  return keys;
};
var toMetaKey = function(it){
  return it === undefined || typeof it == 'symbol' ? it : String(it);
};
var exp = function(O){
  $export($export.S, 'Reflect', O);
};

module.exports = {
  store: store,
  map: getOrCreateMetadataMap,
  has: ordinaryHasOwnMetadata,
  get: ordinaryGetOwnMetadata,
  set: ordinaryDefineOwnMetadata,
  keys: ordinaryOwnMetadataKeys,
  key: toMetaKey,
  exp: exp
};
},{"./_export":67,"./_shared":129,"./es6.map":184,"./es6.weak-map":290}],99:[function(require,module,exports){
var global    = require('./_global')
  , macrotask = require('./_task').set
  , Observer  = global.MutationObserver || global.WebKitMutationObserver
  , process   = global.process
  , Promise   = global.Promise
  , isNode    = require('./_cof')(process) == 'process';

module.exports = function(){
  var head, last, notify;

  var flush = function(){
    var parent, fn;
    if(isNode && (parent = process.domain))parent.exit();
    while(head){
      fn   = head.fn;
      head = head.next;
      try {
        fn();
      } catch(e){
        if(head)notify();
        else last = undefined;
        throw e;
      }
    } last = undefined;
    if(parent)parent.enter();
  };

  // Node.js
  if(isNode){
    notify = function(){
      process.nextTick(flush);
    };
  // browsers with MutationObserver
  } else if(Observer){
    var toggle = true
      , node   = document.createTextNode('');
    new Observer(flush).observe(node, {characterData: true}); // eslint-disable-line no-new
    notify = function(){
      node.data = toggle = !toggle;
    };
  // environments with maybe non-completely correct, but existent Promise
  } else if(Promise && Promise.resolve){
    var promise = Promise.resolve();
    notify = function(){
      promise.then(flush);
    };
  // for other environments - macrotask based on:
  // - setImmediate
  // - MessageChannel
  // - window.postMessag
  // - onreadystatechange
  // - setTimeout
  } else {
    notify = function(){
      // strange IE + webpack dev server bug - use .call(global)
      macrotask.call(global, flush);
    };
  }

  return function(fn){
    var task = {fn: fn, next: undefined};
    if(last)last.next = task;
    if(!head){
      head = task;
      notify();
    } last = task;
  };
};
},{"./_cof":53,"./_global":73,"./_task":139}],100:[function(require,module,exports){
'use strict';
// 19.1.2.1 Object.assign(target, source, ...)
var getKeys  = require('./_object-keys')
  , gOPS     = require('./_object-gops')
  , pIE      = require('./_object-pie')
  , toObject = require('./_to-object')
  , IObject  = require('./_iobject')
  , $assign  = Object.assign;

// should work with symbols and should have deterministic property order (V8 bug)
module.exports = !$assign || require('./_fails')(function(){
  var A = {}
    , B = {}
    , S = Symbol()
    , K = 'abcdefghijklmnopqrst';
  A[S] = 7;
  K.split('').forEach(function(k){ B[k] = k; });
  return $assign({}, A)[S] != 7 || Object.keys($assign({}, B)).join('') != K;
}) ? function assign(target, source){ // eslint-disable-line no-unused-vars
  var T     = toObject(target)
    , aLen  = arguments.length
    , index = 1
    , getSymbols = gOPS.f
    , isEnum     = pIE.f;
  while(aLen > index){
    var S      = IObject(arguments[index++])
      , keys   = getSymbols ? getKeys(S).concat(getSymbols(S)) : getKeys(S)
      , length = keys.length
      , j      = 0
      , key;
    while(length > j)if(isEnum.call(S, key = keys[j++]))T[key] = S[key];
  } return T;
} : $assign;
},{"./_fails":69,"./_iobject":80,"./_object-gops":108,"./_object-keys":111,"./_object-pie":112,"./_to-object":144}],101:[function(require,module,exports){
// 19.1.2.2 / 15.2.3.5 Object.create(O [, Properties])
var anObject    = require('./_an-object')
  , dPs         = require('./_object-dps')
  , enumBugKeys = require('./_enum-bug-keys')
  , IE_PROTO    = require('./_shared-key')('IE_PROTO')
  , Empty       = function(){ /* empty */ }
  , PROTOTYPE   = 'prototype';

// Create object with fake `null` prototype: use iframe Object with cleared prototype
var createDict = function(){
  // Thrash, waste and sodomy: IE GC bug
  var iframe = require('./_dom-create')('iframe')
    , i      = enumBugKeys.length
    , lt     = '<'
    , gt     = '>'
    , iframeDocument;
  iframe.style.display = 'none';
  require('./_html').appendChild(iframe);
  iframe.src = 'javascript:'; // eslint-disable-line no-script-url
  // createDict = iframe.contentWindow.Object;
  // html.removeChild(iframe);
  iframeDocument = iframe.contentWindow.document;
  iframeDocument.open();
  iframeDocument.write(lt + 'script' + gt + 'document.F=Object' + lt + '/script' + gt);
  iframeDocument.close();
  createDict = iframeDocument.F;
  while(i--)delete createDict[PROTOTYPE][enumBugKeys[i]];
  return createDict();
};

module.exports = Object.create || function create(O, Properties){
  var result;
  if(O !== null){
    Empty[PROTOTYPE] = anObject(O);
    result = new Empty;
    Empty[PROTOTYPE] = null;
    // add "__proto__" for Object.getPrototypeOf polyfill
    result[IE_PROTO] = O;
  } else result = createDict();
  return Properties === undefined ? result : dPs(result, Properties);
};

},{"./_an-object":42,"./_dom-create":64,"./_enum-bug-keys":65,"./_html":76,"./_object-dps":103,"./_shared-key":128}],102:[function(require,module,exports){
var anObject       = require('./_an-object')
  , IE8_DOM_DEFINE = require('./_ie8-dom-define')
  , toPrimitive    = require('./_to-primitive')
  , dP             = Object.defineProperty;

exports.f = require('./_descriptors') ? Object.defineProperty : function defineProperty(O, P, Attributes){
  anObject(O);
  P = toPrimitive(P, true);
  anObject(Attributes);
  if(IE8_DOM_DEFINE)try {
    return dP(O, P, Attributes);
  } catch(e){ /* empty */ }
  if('get' in Attributes || 'set' in Attributes)throw TypeError('Accessors not supported!');
  if('value' in Attributes)O[P] = Attributes.value;
  return O;
};
},{"./_an-object":42,"./_descriptors":63,"./_ie8-dom-define":77,"./_to-primitive":145}],103:[function(require,module,exports){
var dP       = require('./_object-dp')
  , anObject = require('./_an-object')
  , getKeys  = require('./_object-keys');

module.exports = require('./_descriptors') ? Object.defineProperties : function defineProperties(O, Properties){
  anObject(O);
  var keys   = getKeys(Properties)
    , length = keys.length
    , i = 0
    , P;
  while(length > i)dP.f(O, P = keys[i++], Properties[P]);
  return O;
};
},{"./_an-object":42,"./_descriptors":63,"./_object-dp":102,"./_object-keys":111}],104:[function(require,module,exports){
// Forced replacement prototype accessors methods
module.exports = require('./_library')|| !require('./_fails')(function(){
  var K = Math.random();
  // In FF throws only define methods
  __defineSetter__.call(null, K, function(){ /* empty */});
  delete require('./_global')[K];
});
},{"./_fails":69,"./_global":73,"./_library":93}],105:[function(require,module,exports){
var pIE            = require('./_object-pie')
  , createDesc     = require('./_property-desc')
  , toIObject      = require('./_to-iobject')
  , toPrimitive    = require('./_to-primitive')
  , has            = require('./_has')
  , IE8_DOM_DEFINE = require('./_ie8-dom-define')
  , gOPD           = Object.getOwnPropertyDescriptor;

exports.f = require('./_descriptors') ? gOPD : function getOwnPropertyDescriptor(O, P){
  O = toIObject(O);
  P = toPrimitive(P, true);
  if(IE8_DOM_DEFINE)try {
    return gOPD(O, P);
  } catch(e){ /* empty */ }
  if(has(O, P))return createDesc(!pIE.f.call(O, P), O[P]);
};
},{"./_descriptors":63,"./_has":74,"./_ie8-dom-define":77,"./_object-pie":112,"./_property-desc":120,"./_to-iobject":142,"./_to-primitive":145}],106:[function(require,module,exports){
// fallback for IE11 buggy Object.getOwnPropertyNames with iframe and window
var toIObject = require('./_to-iobject')
  , gOPN      = require('./_object-gopn').f
  , toString  = {}.toString;

var windowNames = typeof window == 'object' && window && Object.getOwnPropertyNames
  ? Object.getOwnPropertyNames(window) : [];

var getWindowNames = function(it){
  try {
    return gOPN(it);
  } catch(e){
    return windowNames.slice();
  }
};

module.exports.f = function getOwnPropertyNames(it){
  return windowNames && toString.call(it) == '[object Window]' ? getWindowNames(it) : gOPN(toIObject(it));
};

},{"./_object-gopn":107,"./_to-iobject":142}],107:[function(require,module,exports){
// 19.1.2.7 / 15.2.3.4 Object.getOwnPropertyNames(O)
var $keys      = require('./_object-keys-internal')
  , hiddenKeys = require('./_enum-bug-keys').concat('length', 'prototype');

exports.f = Object.getOwnPropertyNames || function getOwnPropertyNames(O){
  return $keys(O, hiddenKeys);
};
},{"./_enum-bug-keys":65,"./_object-keys-internal":110}],108:[function(require,module,exports){
exports.f = Object.getOwnPropertySymbols;
},{}],109:[function(require,module,exports){
// 19.1.2.9 / 15.2.3.2 Object.getPrototypeOf(O)
var has         = require('./_has')
  , toObject    = require('./_to-object')
  , IE_PROTO    = require('./_shared-key')('IE_PROTO')
  , ObjectProto = Object.prototype;

module.exports = Object.getPrototypeOf || function(O){
  O = toObject(O);
  if(has(O, IE_PROTO))return O[IE_PROTO];
  if(typeof O.constructor == 'function' && O instanceof O.constructor){
    return O.constructor.prototype;
  } return O instanceof Object ? ObjectProto : null;
};
},{"./_has":74,"./_shared-key":128,"./_to-object":144}],110:[function(require,module,exports){
var has          = require('./_has')
  , toIObject    = require('./_to-iobject')
  , arrayIndexOf = require('./_array-includes')(false)
  , IE_PROTO     = require('./_shared-key')('IE_PROTO');

module.exports = function(object, names){
  var O      = toIObject(object)
    , i      = 0
    , result = []
    , key;
  for(key in O)if(key != IE_PROTO)has(O, key) && result.push(key);
  // Don't enum bug & hidden keys
  while(names.length > i)if(has(O, key = names[i++])){
    ~arrayIndexOf(result, key) || result.push(key);
  }
  return result;
};
},{"./_array-includes":46,"./_has":74,"./_shared-key":128,"./_to-iobject":142}],111:[function(require,module,exports){
// 19.1.2.14 / 15.2.3.14 Object.keys(O)
var $keys       = require('./_object-keys-internal')
  , enumBugKeys = require('./_enum-bug-keys');

module.exports = Object.keys || function keys(O){
  return $keys(O, enumBugKeys);
};
},{"./_enum-bug-keys":65,"./_object-keys-internal":110}],112:[function(require,module,exports){
exports.f = {}.propertyIsEnumerable;
},{}],113:[function(require,module,exports){
// most Object methods by ES6 should accept primitives
var $export = require('./_export')
  , core    = require('./_core')
  , fails   = require('./_fails');
module.exports = function(KEY, exec){
  var fn  = (core.Object || {})[KEY] || Object[KEY]
    , exp = {};
  exp[KEY] = exec(fn);
  $export($export.S + $export.F * fails(function(){ fn(1); }), 'Object', exp);
};
},{"./_core":58,"./_export":67,"./_fails":69}],114:[function(require,module,exports){
var getKeys   = require('./_object-keys')
  , toIObject = require('./_to-iobject')
  , isEnum    = require('./_object-pie').f;
module.exports = function(isEntries){
  return function(it){
    var O      = toIObject(it)
      , keys   = getKeys(O)
      , length = keys.length
      , i      = 0
      , result = []
      , key;
    while(length > i)if(isEnum.call(O, key = keys[i++])){
      result.push(isEntries ? [key, O[key]] : O[key]);
    } return result;
  };
};
},{"./_object-keys":111,"./_object-pie":112,"./_to-iobject":142}],115:[function(require,module,exports){
// all object keys, includes non-enumerable and symbols
var gOPN     = require('./_object-gopn')
  , gOPS     = require('./_object-gops')
  , anObject = require('./_an-object')
  , Reflect  = require('./_global').Reflect;
module.exports = Reflect && Reflect.ownKeys || function ownKeys(it){
  var keys       = gOPN.f(anObject(it))
    , getSymbols = gOPS.f;
  return getSymbols ? keys.concat(getSymbols(it)) : keys;
};
},{"./_an-object":42,"./_global":73,"./_object-gopn":107,"./_object-gops":108}],116:[function(require,module,exports){
var $parseFloat = require('./_global').parseFloat
  , $trim       = require('./_string-trim').trim;

module.exports = 1 / $parseFloat(require('./_string-ws') + '-0') !== -Infinity ? function parseFloat(str){
  var string = $trim(String(str), 3)
    , result = $parseFloat(string);
  return result === 0 && string.charAt(0) == '-' ? -0 : result;
} : $parseFloat;
},{"./_global":73,"./_string-trim":137,"./_string-ws":138}],117:[function(require,module,exports){
var $parseInt = require('./_global').parseInt
  , $trim     = require('./_string-trim').trim
  , ws        = require('./_string-ws')
  , hex       = /^[\-+]?0[xX]/;

module.exports = $parseInt(ws + '08') !== 8 || $parseInt(ws + '0x16') !== 22 ? function parseInt(str, radix){
  var string = $trim(String(str), 3);
  return $parseInt(string, (radix >>> 0) || (hex.test(string) ? 16 : 10));
} : $parseInt;
},{"./_global":73,"./_string-trim":137,"./_string-ws":138}],118:[function(require,module,exports){
'use strict';
var path      = require('./_path')
  , invoke    = require('./_invoke')
  , aFunction = require('./_a-function');
module.exports = function(/* ...pargs */){
  var fn     = aFunction(this)
    , length = arguments.length
    , pargs  = Array(length)
    , i      = 0
    , _      = path._
    , holder = false;
  while(length > i)if((pargs[i] = arguments[i++]) === _)holder = true;
  return function(/* ...args */){
    var that = this
      , aLen = arguments.length
      , j = 0, k = 0, args;
    if(!holder && !aLen)return invoke(fn, pargs, that);
    args = pargs.slice();
    if(holder)for(;length > j; j++)if(args[j] === _)args[j] = arguments[k++];
    while(aLen > k)args.push(arguments[k++]);
    return invoke(fn, args, that);
  };
};
},{"./_a-function":38,"./_invoke":79,"./_path":119}],119:[function(require,module,exports){
module.exports = require('./_global');
},{"./_global":73}],120:[function(require,module,exports){
module.exports = function(bitmap, value){
  return {
    enumerable  : !(bitmap & 1),
    configurable: !(bitmap & 2),
    writable    : !(bitmap & 4),
    value       : value
  };
};
},{}],121:[function(require,module,exports){
var redefine = require('./_redefine');
module.exports = function(target, src, safe){
  for(var key in src)redefine(target, key, src[key], safe);
  return target;
};
},{"./_redefine":122}],122:[function(require,module,exports){
var global    = require('./_global')
  , hide      = require('./_hide')
  , has       = require('./_has')
  , SRC       = require('./_uid')('src')
  , TO_STRING = 'toString'
  , $toString = Function[TO_STRING]
  , TPL       = ('' + $toString).split(TO_STRING);

require('./_core').inspectSource = function(it){
  return $toString.call(it);
};

(module.exports = function(O, key, val, safe){
  var isFunction = typeof val == 'function';
  if(isFunction)has(val, 'name') || hide(val, 'name', key);
  if(O[key] === val)return;
  if(isFunction)has(val, SRC) || hide(val, SRC, O[key] ? '' + O[key] : TPL.join(String(key)));
  if(O === global){
    O[key] = val;
  } else {
    if(!safe){
      delete O[key];
      hide(O, key, val);
    } else {
      if(O[key])O[key] = val;
      else hide(O, key, val);
    }
  }
// add fake Function#toString for correct work wrapped methods / constructors with methods like LoDash isNative
})(Function.prototype, TO_STRING, function toString(){
  return typeof this == 'function' && this[SRC] || $toString.call(this);
});
},{"./_core":58,"./_global":73,"./_has":74,"./_hide":75,"./_uid":149}],123:[function(require,module,exports){
module.exports = function(regExp, replace){
  var replacer = replace === Object(replace) ? function(part){
    return replace[part];
  } : replace;
  return function(it){
    return String(it).replace(regExp, replacer);
  };
};
},{}],124:[function(require,module,exports){
// 7.2.9 SameValue(x, y)
module.exports = Object.is || function is(x, y){
  return x === y ? x !== 0 || 1 / x === 1 / y : x != x && y != y;
};
},{}],125:[function(require,module,exports){
// Works with __proto__ only. Old v8 can't work with null proto objects.
/* eslint-disable no-proto */
var isObject = require('./_is-object')
  , anObject = require('./_an-object');
var check = function(O, proto){
  anObject(O);
  if(!isObject(proto) && proto !== null)throw TypeError(proto + ": can't set as prototype!");
};
module.exports = {
  set: Object.setPrototypeOf || ('__proto__' in {} ? // eslint-disable-line
    function(test, buggy, set){
      try {
        set = require('./_ctx')(Function.call, require('./_object-gopd').f(Object.prototype, '__proto__').set, 2);
        set(test, []);
        buggy = !(test instanceof Array);
      } catch(e){ buggy = true; }
      return function setPrototypeOf(O, proto){
        check(O, proto);
        if(buggy)O.__proto__ = proto;
        else set(O, proto);
        return O;
      };
    }({}, false) : undefined),
  check: check
};
},{"./_an-object":42,"./_ctx":60,"./_is-object":84,"./_object-gopd":105}],126:[function(require,module,exports){
'use strict';
var global      = require('./_global')
  , dP          = require('./_object-dp')
  , DESCRIPTORS = require('./_descriptors')
  , SPECIES     = require('./_wks')('species');

module.exports = function(KEY){
  var C = global[KEY];
  if(DESCRIPTORS && C && !C[SPECIES])dP.f(C, SPECIES, {
    configurable: true,
    get: function(){ return this; }
  });
};
},{"./_descriptors":63,"./_global":73,"./_object-dp":102,"./_wks":152}],127:[function(require,module,exports){
var def = require('./_object-dp').f
  , has = require('./_has')
  , TAG = require('./_wks')('toStringTag');

module.exports = function(it, tag, stat){
  if(it && !has(it = stat ? it : it.prototype, TAG))def(it, TAG, {configurable: true, value: tag});
};
},{"./_has":74,"./_object-dp":102,"./_wks":152}],128:[function(require,module,exports){
var shared = require('./_shared')('keys')
  , uid    = require('./_uid');
module.exports = function(key){
  return shared[key] || (shared[key] = uid(key));
};
},{"./_shared":129,"./_uid":149}],129:[function(require,module,exports){
var global = require('./_global')
  , SHARED = '__core-js_shared__'
  , store  = global[SHARED] || (global[SHARED] = {});
module.exports = function(key){
  return store[key] || (store[key] = {});
};
},{"./_global":73}],130:[function(require,module,exports){
// 7.3.20 SpeciesConstructor(O, defaultConstructor)
var anObject  = require('./_an-object')
  , aFunction = require('./_a-function')
  , SPECIES   = require('./_wks')('species');
module.exports = function(O, D){
  var C = anObject(O).constructor, S;
  return C === undefined || (S = anObject(C)[SPECIES]) == undefined ? D : aFunction(S);
};
},{"./_a-function":38,"./_an-object":42,"./_wks":152}],131:[function(require,module,exports){
var fails = require('./_fails');

module.exports = function(method, arg){
  return !!method && fails(function(){
    arg ? method.call(null, function(){}, 1) : method.call(null);
  });
};
},{"./_fails":69}],132:[function(require,module,exports){
var toInteger = require('./_to-integer')
  , defined   = require('./_defined');
// true  -> String#at
// false -> String#codePointAt
module.exports = function(TO_STRING){
  return function(that, pos){
    var s = String(defined(that))
      , i = toInteger(pos)
      , l = s.length
      , a, b;
    if(i < 0 || i >= l)return TO_STRING ? '' : undefined;
    a = s.charCodeAt(i);
    return a < 0xd800 || a > 0xdbff || i + 1 === l || (b = s.charCodeAt(i + 1)) < 0xdc00 || b > 0xdfff
      ? TO_STRING ? s.charAt(i) : a
      : TO_STRING ? s.slice(i, i + 2) : (a - 0xd800 << 10) + (b - 0xdc00) + 0x10000;
  };
};
},{"./_defined":62,"./_to-integer":141}],133:[function(require,module,exports){
// helper for String#{startsWith, endsWith, includes}
var isRegExp = require('./_is-regexp')
  , defined  = require('./_defined');

module.exports = function(that, searchString, NAME){
  if(isRegExp(searchString))throw TypeError('String#' + NAME + " doesn't accept regex!");
  return String(defined(that));
};
},{"./_defined":62,"./_is-regexp":85}],134:[function(require,module,exports){
var $export = require('./_export')
  , fails   = require('./_fails')
  , defined = require('./_defined')
  , quot    = /"/g;
// B.2.3.2.1 CreateHTML(string, tag, attribute, value)
var createHTML = function(string, tag, attribute, value) {
  var S  = String(defined(string))
    , p1 = '<' + tag;
  if(attribute !== '')p1 += ' ' + attribute + '="' + String(value).replace(quot, '&quot;') + '"';
  return p1 + '>' + S + '</' + tag + '>';
};
module.exports = function(NAME, exec){
  var O = {};
  O[NAME] = exec(createHTML);
  $export($export.P + $export.F * fails(function(){
    var test = ''[NAME]('"');
    return test !== test.toLowerCase() || test.split('"').length > 3;
  }), 'String', O);
};
},{"./_defined":62,"./_export":67,"./_fails":69}],135:[function(require,module,exports){
// https://github.com/tc39/proposal-string-pad-start-end
var toLength = require('./_to-length')
  , repeat   = require('./_string-repeat')
  , defined  = require('./_defined');

module.exports = function(that, maxLength, fillString, left){
  var S            = String(defined(that))
    , stringLength = S.length
    , fillStr      = fillString === undefined ? ' ' : String(fillString)
    , intMaxLength = toLength(maxLength);
  if(intMaxLength <= stringLength || fillStr == '')return S;
  var fillLen = intMaxLength - stringLength
    , stringFiller = repeat.call(fillStr, Math.ceil(fillLen / fillStr.length));
  if(stringFiller.length > fillLen)stringFiller = stringFiller.slice(0, fillLen);
  return left ? stringFiller + S : S + stringFiller;
};

},{"./_defined":62,"./_string-repeat":136,"./_to-length":143}],136:[function(require,module,exports){
'use strict';
var toInteger = require('./_to-integer')
  , defined   = require('./_defined');

module.exports = function repeat(count){
  var str = String(defined(this))
    , res = ''
    , n   = toInteger(count);
  if(n < 0 || n == Infinity)throw RangeError("Count can't be negative");
  for(;n > 0; (n >>>= 1) && (str += str))if(n & 1)res += str;
  return res;
};
},{"./_defined":62,"./_to-integer":141}],137:[function(require,module,exports){
var $export = require('./_export')
  , defined = require('./_defined')
  , fails   = require('./_fails')
  , spaces  = require('./_string-ws')
  , space   = '[' + spaces + ']'
  , non     = '\u200b\u0085'
  , ltrim   = RegExp('^' + space + space + '*')
  , rtrim   = RegExp(space + space + '*$');

var exporter = function(KEY, exec, ALIAS){
  var exp   = {};
  var FORCE = fails(function(){
    return !!spaces[KEY]() || non[KEY]() != non;
  });
  var fn = exp[KEY] = FORCE ? exec(trim) : spaces[KEY];
  if(ALIAS)exp[ALIAS] = fn;
  $export($export.P + $export.F * FORCE, 'String', exp);
};

// 1 -> String#trimLeft
// 2 -> String#trimRight
// 3 -> String#trim
var trim = exporter.trim = function(string, TYPE){
  string = String(defined(string));
  if(TYPE & 1)string = string.replace(ltrim, '');
  if(TYPE & 2)string = string.replace(rtrim, '');
  return string;
};

module.exports = exporter;
},{"./_defined":62,"./_export":67,"./_fails":69,"./_string-ws":138}],138:[function(require,module,exports){
module.exports = '\x09\x0A\x0B\x0C\x0D\x20\xA0\u1680\u180E\u2000\u2001\u2002\u2003' +
  '\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\u2028\u2029\uFEFF';
},{}],139:[function(require,module,exports){
var ctx                = require('./_ctx')
  , invoke             = require('./_invoke')
  , html               = require('./_html')
  , cel                = require('./_dom-create')
  , global             = require('./_global')
  , process            = global.process
  , setTask            = global.setImmediate
  , clearTask          = global.clearImmediate
  , MessageChannel     = global.MessageChannel
  , counter            = 0
  , queue              = {}
  , ONREADYSTATECHANGE = 'onreadystatechange'
  , defer, channel, port;
var run = function(){
  var id = +this;
  if(queue.hasOwnProperty(id)){
    var fn = queue[id];
    delete queue[id];
    fn();
  }
};
var listener = function(event){
  run.call(event.data);
};
// Node.js 0.9+ & IE10+ has setImmediate, otherwise:
if(!setTask || !clearTask){
  setTask = function setImmediate(fn){
    var args = [], i = 1;
    while(arguments.length > i)args.push(arguments[i++]);
    queue[++counter] = function(){
      invoke(typeof fn == 'function' ? fn : Function(fn), args);
    };
    defer(counter);
    return counter;
  };
  clearTask = function clearImmediate(id){
    delete queue[id];
  };
  // Node.js 0.8-
  if(require('./_cof')(process) == 'process'){
    defer = function(id){
      process.nextTick(ctx(run, id, 1));
    };
  // Browsers with MessageChannel, includes WebWorkers
  } else if(MessageChannel){
    channel = new MessageChannel;
    port    = channel.port2;
    channel.port1.onmessage = listener;
    defer = ctx(port.postMessage, port, 1);
  // Browsers with postMessage, skip WebWorkers
  // IE8 has postMessage, but it's sync & typeof its postMessage is 'object'
  } else if(global.addEventListener && typeof postMessage == 'function' && !global.importScripts){
    defer = function(id){
      global.postMessage(id + '', '*');
    };
    global.addEventListener('message', listener, false);
  // IE8-
  } else if(ONREADYSTATECHANGE in cel('script')){
    defer = function(id){
      html.appendChild(cel('script'))[ONREADYSTATECHANGE] = function(){
        html.removeChild(this);
        run.call(id);
      };
    };
  // Rest old browsers
  } else {
    defer = function(id){
      setTimeout(ctx(run, id, 1), 0);
    };
  }
}
module.exports = {
  set:   setTask,
  clear: clearTask
};
},{"./_cof":53,"./_ctx":60,"./_dom-create":64,"./_global":73,"./_html":76,"./_invoke":79}],140:[function(require,module,exports){
var toInteger = require('./_to-integer')
  , max       = Math.max
  , min       = Math.min;
module.exports = function(index, length){
  index = toInteger(index);
  return index < 0 ? max(index + length, 0) : min(index, length);
};
},{"./_to-integer":141}],141:[function(require,module,exports){
// 7.1.4 ToInteger
var ceil  = Math.ceil
  , floor = Math.floor;
module.exports = function(it){
  return isNaN(it = +it) ? 0 : (it > 0 ? floor : ceil)(it);
};
},{}],142:[function(require,module,exports){
// to indexed object, toObject with fallback for non-array-like ES3 strings
var IObject = require('./_iobject')
  , defined = require('./_defined');
module.exports = function(it){
  return IObject(defined(it));
};
},{"./_defined":62,"./_iobject":80}],143:[function(require,module,exports){
// 7.1.15 ToLength
var toInteger = require('./_to-integer')
  , min       = Math.min;
module.exports = function(it){
  return it > 0 ? min(toInteger(it), 0x1fffffffffffff) : 0; // pow(2, 53) - 1 == 9007199254740991
};
},{"./_to-integer":141}],144:[function(require,module,exports){
// 7.1.13 ToObject(argument)
var defined = require('./_defined');
module.exports = function(it){
  return Object(defined(it));
};
},{"./_defined":62}],145:[function(require,module,exports){
// 7.1.1 ToPrimitive(input [, PreferredType])
var isObject = require('./_is-object');
// instead of the ES6 spec version, we didn't implement @@toPrimitive case
// and the second argument - flag - preferred type is a string
module.exports = function(it, S){
  if(!isObject(it))return it;
  var fn, val;
  if(S && typeof (fn = it.toString) == 'function' && !isObject(val = fn.call(it)))return val;
  if(typeof (fn = it.valueOf) == 'function' && !isObject(val = fn.call(it)))return val;
  if(!S && typeof (fn = it.toString) == 'function' && !isObject(val = fn.call(it)))return val;
  throw TypeError("Can't convert object to primitive value");
};
},{"./_is-object":84}],146:[function(require,module,exports){
'use strict';
if(require('./_descriptors')){
  var LIBRARY             = require('./_library')
    , global              = require('./_global')
    , fails               = require('./_fails')
    , $export             = require('./_export')
    , $typed              = require('./_typed')
    , $buffer             = require('./_typed-buffer')
    , ctx                 = require('./_ctx')
    , anInstance          = require('./_an-instance')
    , propertyDesc        = require('./_property-desc')
    , hide                = require('./_hide')
    , redefineAll         = require('./_redefine-all')
    , toInteger           = require('./_to-integer')
    , toLength            = require('./_to-length')
    , toIndex             = require('./_to-index')
    , toPrimitive         = require('./_to-primitive')
    , has                 = require('./_has')
    , same                = require('./_same-value')
    , classof             = require('./_classof')
    , isObject            = require('./_is-object')
    , toObject            = require('./_to-object')
    , isArrayIter         = require('./_is-array-iter')
    , create              = require('./_object-create')
    , getPrototypeOf      = require('./_object-gpo')
    , gOPN                = require('./_object-gopn').f
    , getIterFn           = require('./core.get-iterator-method')
    , uid                 = require('./_uid')
    , wks                 = require('./_wks')
    , createArrayMethod   = require('./_array-methods')
    , createArrayIncludes = require('./_array-includes')
    , speciesConstructor  = require('./_species-constructor')
    , ArrayIterators      = require('./es6.array.iterator')
    , Iterators           = require('./_iterators')
    , $iterDetect         = require('./_iter-detect')
    , setSpecies          = require('./_set-species')
    , arrayFill           = require('./_array-fill')
    , arrayCopyWithin     = require('./_array-copy-within')
    , $DP                 = require('./_object-dp')
    , $GOPD               = require('./_object-gopd')
    , dP                  = $DP.f
    , gOPD                = $GOPD.f
    , RangeError          = global.RangeError
    , TypeError           = global.TypeError
    , Uint8Array          = global.Uint8Array
    , ARRAY_BUFFER        = 'ArrayBuffer'
    , SHARED_BUFFER       = 'Shared' + ARRAY_BUFFER
    , BYTES_PER_ELEMENT   = 'BYTES_PER_ELEMENT'
    , PROTOTYPE           = 'prototype'
    , ArrayProto          = Array[PROTOTYPE]
    , $ArrayBuffer        = $buffer.ArrayBuffer
    , $DataView           = $buffer.DataView
    , arrayForEach        = createArrayMethod(0)
    , arrayFilter         = createArrayMethod(2)
    , arraySome           = createArrayMethod(3)
    , arrayEvery          = createArrayMethod(4)
    , arrayFind           = createArrayMethod(5)
    , arrayFindIndex      = createArrayMethod(6)
    , arrayIncludes       = createArrayIncludes(true)
    , arrayIndexOf        = createArrayIncludes(false)
    , arrayValues         = ArrayIterators.values
    , arrayKeys           = ArrayIterators.keys
    , arrayEntries        = ArrayIterators.entries
    , arrayLastIndexOf    = ArrayProto.lastIndexOf
    , arrayReduce         = ArrayProto.reduce
    , arrayReduceRight    = ArrayProto.reduceRight
    , arrayJoin           = ArrayProto.join
    , arraySort           = ArrayProto.sort
    , arraySlice          = ArrayProto.slice
    , arrayToString       = ArrayProto.toString
    , arrayToLocaleString = ArrayProto.toLocaleString
    , ITERATOR            = wks('iterator')
    , TAG                 = wks('toStringTag')
    , TYPED_CONSTRUCTOR   = uid('typed_constructor')
    , DEF_CONSTRUCTOR     = uid('def_constructor')
    , ALL_CONSTRUCTORS    = $typed.CONSTR
    , TYPED_ARRAY         = $typed.TYPED
    , VIEW                = $typed.VIEW
    , WRONG_LENGTH        = 'Wrong length!';

  var $map = createArrayMethod(1, function(O, length){
    return allocate(speciesConstructor(O, O[DEF_CONSTRUCTOR]), length);
  });

  var LITTLE_ENDIAN = fails(function(){
    return new Uint8Array(new Uint16Array([1]).buffer)[0] === 1;
  });

  var FORCED_SET = !!Uint8Array && !!Uint8Array[PROTOTYPE].set && fails(function(){
    new Uint8Array(1).set({});
  });

  var strictToLength = function(it, SAME){
    if(it === undefined)throw TypeError(WRONG_LENGTH);
    var number = +it
      , length = toLength(it);
    if(SAME && !same(number, length))throw RangeError(WRONG_LENGTH);
    return length;
  };

  var toOffset = function(it, BYTES){
    var offset = toInteger(it);
    if(offset < 0 || offset % BYTES)throw RangeError('Wrong offset!');
    return offset;
  };

  var validate = function(it){
    if(isObject(it) && TYPED_ARRAY in it)return it;
    throw TypeError(it + ' is not a typed array!');
  };

  var allocate = function(C, length){
    if(!(isObject(C) && TYPED_CONSTRUCTOR in C)){
      throw TypeError('It is not a typed array constructor!');
    } return new C(length);
  };

  var speciesFromList = function(O, list){
    return fromList(speciesConstructor(O, O[DEF_CONSTRUCTOR]), list);
  };

  var fromList = function(C, list){
    var index  = 0
      , length = list.length
      , result = allocate(C, length);
    while(length > index)result[index] = list[index++];
    return result;
  };

  var addGetter = function(it, key, internal){
    dP(it, key, {get: function(){ return this._d[internal]; }});
  };

  var $from = function from(source /*, mapfn, thisArg */){
    var O       = toObject(source)
      , aLen    = arguments.length
      , mapfn   = aLen > 1 ? arguments[1] : undefined
      , mapping = mapfn !== undefined
      , iterFn  = getIterFn(O)
      , i, length, values, result, step, iterator;
    if(iterFn != undefined && !isArrayIter(iterFn)){
      for(iterator = iterFn.call(O), values = [], i = 0; !(step = iterator.next()).done; i++){
        values.push(step.value);
      } O = values;
    }
    if(mapping && aLen > 2)mapfn = ctx(mapfn, arguments[2], 2);
    for(i = 0, length = toLength(O.length), result = allocate(this, length); length > i; i++){
      result[i] = mapping ? mapfn(O[i], i) : O[i];
    }
    return result;
  };

  var $of = function of(/*...items*/){
    var index  = 0
      , length = arguments.length
      , result = allocate(this, length);
    while(length > index)result[index] = arguments[index++];
    return result;
  };

  // iOS Safari 6.x fails here
  var TO_LOCALE_BUG = !!Uint8Array && fails(function(){ arrayToLocaleString.call(new Uint8Array(1)); });

  var $toLocaleString = function toLocaleString(){
    return arrayToLocaleString.apply(TO_LOCALE_BUG ? arraySlice.call(validate(this)) : validate(this), arguments);
  };

  var proto = {
    copyWithin: function copyWithin(target, start /*, end */){
      return arrayCopyWithin.call(validate(this), target, start, arguments.length > 2 ? arguments[2] : undefined);
    },
    every: function every(callbackfn /*, thisArg */){
      return arrayEvery(validate(this), callbackfn, arguments.length > 1 ? arguments[1] : undefined);
    },
    fill: function fill(value /*, start, end */){ // eslint-disable-line no-unused-vars
      return arrayFill.apply(validate(this), arguments);
    },
    filter: function filter(callbackfn /*, thisArg */){
      return speciesFromList(this, arrayFilter(validate(this), callbackfn,
        arguments.length > 1 ? arguments[1] : undefined));
    },
    find: function find(predicate /*, thisArg */){
      return arrayFind(validate(this), predicate, arguments.length > 1 ? arguments[1] : undefined);
    },
    findIndex: function findIndex(predicate /*, thisArg */){
      return arrayFindIndex(validate(this), predicate, arguments.length > 1 ? arguments[1] : undefined);
    },
    forEach: function forEach(callbackfn /*, thisArg */){
      arrayForEach(validate(this), callbackfn, arguments.length > 1 ? arguments[1] : undefined);
    },
    indexOf: function indexOf(searchElement /*, fromIndex */){
      return arrayIndexOf(validate(this), searchElement, arguments.length > 1 ? arguments[1] : undefined);
    },
    includes: function includes(searchElement /*, fromIndex */){
      return arrayIncludes(validate(this), searchElement, arguments.length > 1 ? arguments[1] : undefined);
    },
    join: function join(separator){ // eslint-disable-line no-unused-vars
      return arrayJoin.apply(validate(this), arguments);
    },
    lastIndexOf: function lastIndexOf(searchElement /*, fromIndex */){ // eslint-disable-line no-unused-vars
      return arrayLastIndexOf.apply(validate(this), arguments);
    },
    map: function map(mapfn /*, thisArg */){
      return $map(validate(this), mapfn, arguments.length > 1 ? arguments[1] : undefined);
    },
    reduce: function reduce(callbackfn /*, initialValue */){ // eslint-disable-line no-unused-vars
      return arrayReduce.apply(validate(this), arguments);
    },
    reduceRight: function reduceRight(callbackfn /*, initialValue */){ // eslint-disable-line no-unused-vars
      return arrayReduceRight.apply(validate(this), arguments);
    },
    reverse: function reverse(){
      var that   = this
        , length = validate(that).length
        , middle = Math.floor(length / 2)
        , index  = 0
        , value;
      while(index < middle){
        value         = that[index];
        that[index++] = that[--length];
        that[length]  = value;
      } return that;
    },
    some: function some(callbackfn /*, thisArg */){
      return arraySome(validate(this), callbackfn, arguments.length > 1 ? arguments[1] : undefined);
    },
    sort: function sort(comparefn){
      return arraySort.call(validate(this), comparefn);
    },
    subarray: function subarray(begin, end){
      var O      = validate(this)
        , length = O.length
        , $begin = toIndex(begin, length);
      return new (speciesConstructor(O, O[DEF_CONSTRUCTOR]))(
        O.buffer,
        O.byteOffset + $begin * O.BYTES_PER_ELEMENT,
        toLength((end === undefined ? length : toIndex(end, length)) - $begin)
      );
    }
  };

  var $slice = function slice(start, end){
    return speciesFromList(this, arraySlice.call(validate(this), start, end));
  };

  var $set = function set(arrayLike /*, offset */){
    validate(this);
    var offset = toOffset(arguments[1], 1)
      , length = this.length
      , src    = toObject(arrayLike)
      , len    = toLength(src.length)
      , index  = 0;
    if(len + offset > length)throw RangeError(WRONG_LENGTH);
    while(index < len)this[offset + index] = src[index++];
  };

  var $iterators = {
    entries: function entries(){
      return arrayEntries.call(validate(this));
    },
    keys: function keys(){
      return arrayKeys.call(validate(this));
    },
    values: function values(){
      return arrayValues.call(validate(this));
    }
  };

  var isTAIndex = function(target, key){
    return isObject(target)
      && target[TYPED_ARRAY]
      && typeof key != 'symbol'
      && key in target
      && String(+key) == String(key);
  };
  var $getDesc = function getOwnPropertyDescriptor(target, key){
    return isTAIndex(target, key = toPrimitive(key, true))
      ? propertyDesc(2, target[key])
      : gOPD(target, key);
  };
  var $setDesc = function defineProperty(target, key, desc){
    if(isTAIndex(target, key = toPrimitive(key, true))
      && isObject(desc)
      && has(desc, 'value')
      && !has(desc, 'get')
      && !has(desc, 'set')
      // TODO: add validation descriptor w/o calling accessors
      && !desc.configurable
      && (!has(desc, 'writable') || desc.writable)
      && (!has(desc, 'enumerable') || desc.enumerable)
    ){
      target[key] = desc.value;
      return target;
    } else return dP(target, key, desc);
  };

  if(!ALL_CONSTRUCTORS){
    $GOPD.f = $getDesc;
    $DP.f   = $setDesc;
  }

  $export($export.S + $export.F * !ALL_CONSTRUCTORS, 'Object', {
    getOwnPropertyDescriptor: $getDesc,
    defineProperty:           $setDesc
  });

  if(fails(function(){ arrayToString.call({}); })){
    arrayToString = arrayToLocaleString = function toString(){
      return arrayJoin.call(this);
    }
  }

  var $TypedArrayPrototype$ = redefineAll({}, proto);
  redefineAll($TypedArrayPrototype$, $iterators);
  hide($TypedArrayPrototype$, ITERATOR, $iterators.values);
  redefineAll($TypedArrayPrototype$, {
    slice:          $slice,
    set:            $set,
    constructor:    function(){ /* noop */ },
    toString:       arrayToString,
    toLocaleString: $toLocaleString
  });
  addGetter($TypedArrayPrototype$, 'buffer', 'b');
  addGetter($TypedArrayPrototype$, 'byteOffset', 'o');
  addGetter($TypedArrayPrototype$, 'byteLength', 'l');
  addGetter($TypedArrayPrototype$, 'length', 'e');
  dP($TypedArrayPrototype$, TAG, {
    get: function(){ return this[TYPED_ARRAY]; }
  });

  module.exports = function(KEY, BYTES, wrapper, CLAMPED){
    CLAMPED = !!CLAMPED;
    var NAME       = KEY + (CLAMPED ? 'Clamped' : '') + 'Array'
      , ISNT_UINT8 = NAME != 'Uint8Array'
      , GETTER     = 'get' + KEY
      , SETTER     = 'set' + KEY
      , TypedArray = global[NAME]
      , Base       = TypedArray || {}
      , TAC        = TypedArray && getPrototypeOf(TypedArray)
      , FORCED     = !TypedArray || !$typed.ABV
      , O          = {}
      , TypedArrayPrototype = TypedArray && TypedArray[PROTOTYPE];
    var getter = function(that, index){
      var data = that._d;
      return data.v[GETTER](index * BYTES + data.o, LITTLE_ENDIAN);
    };
    var setter = function(that, index, value){
      var data = that._d;
      if(CLAMPED)value = (value = Math.round(value)) < 0 ? 0 : value > 0xff ? 0xff : value & 0xff;
      data.v[SETTER](index * BYTES + data.o, value, LITTLE_ENDIAN);
    };
    var addElement = function(that, index){
      dP(that, index, {
        get: function(){
          return getter(this, index);
        },
        set: function(value){
          return setter(this, index, value);
        },
        enumerable: true
      });
    };
    if(FORCED){
      TypedArray = wrapper(function(that, data, $offset, $length){
        anInstance(that, TypedArray, NAME, '_d');
        var index  = 0
          , offset = 0
          , buffer, byteLength, length, klass;
        if(!isObject(data)){
          length     = strictToLength(data, true)
          byteLength = length * BYTES;
          buffer     = new $ArrayBuffer(byteLength);
        } else if(data instanceof $ArrayBuffer || (klass = classof(data)) == ARRAY_BUFFER || klass == SHARED_BUFFER){
          buffer = data;
          offset = toOffset($offset, BYTES);
          var $len = data.byteLength;
          if($length === undefined){
            if($len % BYTES)throw RangeError(WRONG_LENGTH);
            byteLength = $len - offset;
            if(byteLength < 0)throw RangeError(WRONG_LENGTH);
          } else {
            byteLength = toLength($length) * BYTES;
            if(byteLength + offset > $len)throw RangeError(WRONG_LENGTH);
          }
          length = byteLength / BYTES;
        } else if(TYPED_ARRAY in data){
          return fromList(TypedArray, data);
        } else {
          return $from.call(TypedArray, data);
        }
        hide(that, '_d', {
          b: buffer,
          o: offset,
          l: byteLength,
          e: length,
          v: new $DataView(buffer)
        });
        while(index < length)addElement(that, index++);
      });
      TypedArrayPrototype = TypedArray[PROTOTYPE] = create($TypedArrayPrototype$);
      hide(TypedArrayPrototype, 'constructor', TypedArray);
    } else if(!$iterDetect(function(iter){
      // V8 works with iterators, but fails in many other cases
      // https://code.google.com/p/v8/issues/detail?id=4552
      new TypedArray(null); // eslint-disable-line no-new
      new TypedArray(iter); // eslint-disable-line no-new
    }, true)){
      TypedArray = wrapper(function(that, data, $offset, $length){
        anInstance(that, TypedArray, NAME);
        var klass;
        // `ws` module bug, temporarily remove validation length for Uint8Array
        // https://github.com/websockets/ws/pull/645
        if(!isObject(data))return new Base(strictToLength(data, ISNT_UINT8));
        if(data instanceof $ArrayBuffer || (klass = classof(data)) == ARRAY_BUFFER || klass == SHARED_BUFFER){
          return $length !== undefined
            ? new Base(data, toOffset($offset, BYTES), $length)
            : $offset !== undefined
              ? new Base(data, toOffset($offset, BYTES))
              : new Base(data);
        }
        if(TYPED_ARRAY in data)return fromList(TypedArray, data);
        return $from.call(TypedArray, data);
      });
      arrayForEach(TAC !== Function.prototype ? gOPN(Base).concat(gOPN(TAC)) : gOPN(Base), function(key){
        if(!(key in TypedArray))hide(TypedArray, key, Base[key]);
      });
      TypedArray[PROTOTYPE] = TypedArrayPrototype;
      if(!LIBRARY)TypedArrayPrototype.constructor = TypedArray;
    }
    var $nativeIterator   = TypedArrayPrototype[ITERATOR]
      , CORRECT_ITER_NAME = !!$nativeIterator && ($nativeIterator.name == 'values' || $nativeIterator.name == undefined)
      , $iterator         = $iterators.values;
    hide(TypedArray, TYPED_CONSTRUCTOR, true);
    hide(TypedArrayPrototype, TYPED_ARRAY, NAME);
    hide(TypedArrayPrototype, VIEW, true);
    hide(TypedArrayPrototype, DEF_CONSTRUCTOR, TypedArray);

    if(CLAMPED ? new TypedArray(1)[TAG] != NAME : !(TAG in TypedArrayPrototype)){
      dP(TypedArrayPrototype, TAG, {
        get: function(){ return NAME; }
      });
    }

    O[NAME] = TypedArray;

    $export($export.G + $export.W + $export.F * (TypedArray != Base), O);

    $export($export.S, NAME, {
      BYTES_PER_ELEMENT: BYTES,
      from: $from,
      of: $of
    });

    if(!(BYTES_PER_ELEMENT in TypedArrayPrototype))hide(TypedArrayPrototype, BYTES_PER_ELEMENT, BYTES);

    $export($export.P, NAME, proto);

    setSpecies(NAME);

    $export($export.P + $export.F * FORCED_SET, NAME, {set: $set});

    $export($export.P + $export.F * !CORRECT_ITER_NAME, NAME, $iterators);

    $export($export.P + $export.F * (TypedArrayPrototype.toString != arrayToString), NAME, {toString: arrayToString});

    $export($export.P + $export.F * fails(function(){
      new TypedArray(1).slice();
    }), NAME, {slice: $slice});

    $export($export.P + $export.F * (fails(function(){
      return [1, 2].toLocaleString() != new TypedArray([1, 2]).toLocaleString()
    }) || !fails(function(){
      TypedArrayPrototype.toLocaleString.call([1, 2]);
    })), NAME, {toLocaleString: $toLocaleString});

    Iterators[NAME] = CORRECT_ITER_NAME ? $nativeIterator : $iterator;
    if(!LIBRARY && !CORRECT_ITER_NAME)hide(TypedArrayPrototype, ITERATOR, $iterator);
  };
} else module.exports = function(){ /* empty */ };
},{"./_an-instance":41,"./_array-copy-within":43,"./_array-fill":44,"./_array-includes":46,"./_array-methods":47,"./_classof":52,"./_ctx":60,"./_descriptors":63,"./_export":67,"./_fails":69,"./_global":73,"./_has":74,"./_hide":75,"./_is-array-iter":81,"./_is-object":84,"./_iter-detect":89,"./_iterators":91,"./_library":93,"./_object-create":101,"./_object-dp":102,"./_object-gopd":105,"./_object-gopn":107,"./_object-gpo":109,"./_property-desc":120,"./_redefine-all":121,"./_same-value":124,"./_set-species":126,"./_species-constructor":130,"./_to-index":140,"./_to-integer":141,"./_to-length":143,"./_to-object":144,"./_to-primitive":145,"./_typed":148,"./_typed-buffer":147,"./_uid":149,"./_wks":152,"./core.get-iterator-method":153,"./es6.array.iterator":165}],147:[function(require,module,exports){
'use strict';
var global         = require('./_global')
  , DESCRIPTORS    = require('./_descriptors')
  , LIBRARY        = require('./_library')
  , $typed         = require('./_typed')
  , hide           = require('./_hide')
  , redefineAll    = require('./_redefine-all')
  , fails          = require('./_fails')
  , anInstance     = require('./_an-instance')
  , toInteger      = require('./_to-integer')
  , toLength       = require('./_to-length')
  , gOPN           = require('./_object-gopn').f
  , dP             = require('./_object-dp').f
  , arrayFill      = require('./_array-fill')
  , setToStringTag = require('./_set-to-string-tag')
  , ARRAY_BUFFER   = 'ArrayBuffer'
  , DATA_VIEW      = 'DataView'
  , PROTOTYPE      = 'prototype'
  , WRONG_LENGTH   = 'Wrong length!'
  , WRONG_INDEX    = 'Wrong index!'
  , $ArrayBuffer   = global[ARRAY_BUFFER]
  , $DataView      = global[DATA_VIEW]
  , Math           = global.Math
  , RangeError     = global.RangeError
  , Infinity       = global.Infinity
  , BaseBuffer     = $ArrayBuffer
  , abs            = Math.abs
  , pow            = Math.pow
  , floor          = Math.floor
  , log            = Math.log
  , LN2            = Math.LN2
  , BUFFER         = 'buffer'
  , BYTE_LENGTH    = 'byteLength'
  , BYTE_OFFSET    = 'byteOffset'
  , $BUFFER        = DESCRIPTORS ? '_b' : BUFFER
  , $LENGTH        = DESCRIPTORS ? '_l' : BYTE_LENGTH
  , $OFFSET        = DESCRIPTORS ? '_o' : BYTE_OFFSET;

// IEEE754 conversions based on https://github.com/feross/ieee754
var packIEEE754 = function(value, mLen, nBytes){
  var buffer = Array(nBytes)
    , eLen   = nBytes * 8 - mLen - 1
    , eMax   = (1 << eLen) - 1
    , eBias  = eMax >> 1
    , rt     = mLen === 23 ? pow(2, -24) - pow(2, -77) : 0
    , i      = 0
    , s      = value < 0 || value === 0 && 1 / value < 0 ? 1 : 0
    , e, m, c;
  value = abs(value)
  if(value != value || value === Infinity){
    m = value != value ? 1 : 0;
    e = eMax;
  } else {
    e = floor(log(value) / LN2);
    if(value * (c = pow(2, -e)) < 1){
      e--;
      c *= 2;
    }
    if(e + eBias >= 1){
      value += rt / c;
    } else {
      value += rt * pow(2, 1 - eBias);
    }
    if(value * c >= 2){
      e++;
      c /= 2;
    }
    if(e + eBias >= eMax){
      m = 0;
      e = eMax;
    } else if(e + eBias >= 1){
      m = (value * c - 1) * pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * pow(2, eBias - 1) * pow(2, mLen);
      e = 0;
    }
  }
  for(; mLen >= 8; buffer[i++] = m & 255, m /= 256, mLen -= 8);
  e = e << mLen | m;
  eLen += mLen;
  for(; eLen > 0; buffer[i++] = e & 255, e /= 256, eLen -= 8);
  buffer[--i] |= s * 128;
  return buffer;
};
var unpackIEEE754 = function(buffer, mLen, nBytes){
  var eLen  = nBytes * 8 - mLen - 1
    , eMax  = (1 << eLen) - 1
    , eBias = eMax >> 1
    , nBits = eLen - 7
    , i     = nBytes - 1
    , s     = buffer[i--]
    , e     = s & 127
    , m;
  s >>= 7;
  for(; nBits > 0; e = e * 256 + buffer[i], i--, nBits -= 8);
  m = e & (1 << -nBits) - 1;
  e >>= -nBits;
  nBits += mLen;
  for(; nBits > 0; m = m * 256 + buffer[i], i--, nBits -= 8);
  if(e === 0){
    e = 1 - eBias;
  } else if(e === eMax){
    return m ? NaN : s ? -Infinity : Infinity;
  } else {
    m = m + pow(2, mLen);
    e = e - eBias;
  } return (s ? -1 : 1) * m * pow(2, e - mLen);
};

var unpackI32 = function(bytes){
  return bytes[3] << 24 | bytes[2] << 16 | bytes[1] << 8 | bytes[0];
};
var packI8 = function(it){
  return [it & 0xff];
};
var packI16 = function(it){
  return [it & 0xff, it >> 8 & 0xff];
};
var packI32 = function(it){
  return [it & 0xff, it >> 8 & 0xff, it >> 16 & 0xff, it >> 24 & 0xff];
};
var packF64 = function(it){
  return packIEEE754(it, 52, 8);
};
var packF32 = function(it){
  return packIEEE754(it, 23, 4);
};

var addGetter = function(C, key, internal){
  dP(C[PROTOTYPE], key, {get: function(){ return this[internal]; }});
};

var get = function(view, bytes, index, isLittleEndian){
  var numIndex = +index
    , intIndex = toInteger(numIndex);
  if(numIndex != intIndex || intIndex < 0 || intIndex + bytes > view[$LENGTH])throw RangeError(WRONG_INDEX);
  var store = view[$BUFFER]._b
    , start = intIndex + view[$OFFSET]
    , pack  = store.slice(start, start + bytes);
  return isLittleEndian ? pack : pack.reverse();
};
var set = function(view, bytes, index, conversion, value, isLittleEndian){
  var numIndex = +index
    , intIndex = toInteger(numIndex);
  if(numIndex != intIndex || intIndex < 0 || intIndex + bytes > view[$LENGTH])throw RangeError(WRONG_INDEX);
  var store = view[$BUFFER]._b
    , start = intIndex + view[$OFFSET]
    , pack  = conversion(+value);
  for(var i = 0; i < bytes; i++)store[start + i] = pack[isLittleEndian ? i : bytes - i - 1];
};

var validateArrayBufferArguments = function(that, length){
  anInstance(that, $ArrayBuffer, ARRAY_BUFFER);
  var numberLength = +length
    , byteLength   = toLength(numberLength);
  if(numberLength != byteLength)throw RangeError(WRONG_LENGTH);
  return byteLength;
};

if(!$typed.ABV){
  $ArrayBuffer = function ArrayBuffer(length){
    var byteLength = validateArrayBufferArguments(this, length);
    this._b       = arrayFill.call(Array(byteLength), 0);
    this[$LENGTH] = byteLength;
  };

  $DataView = function DataView(buffer, byteOffset, byteLength){
    anInstance(this, $DataView, DATA_VIEW);
    anInstance(buffer, $ArrayBuffer, DATA_VIEW);
    var bufferLength = buffer[$LENGTH]
      , offset       = toInteger(byteOffset);
    if(offset < 0 || offset > bufferLength)throw RangeError('Wrong offset!');
    byteLength = byteLength === undefined ? bufferLength - offset : toLength(byteLength);
    if(offset + byteLength > bufferLength)throw RangeError(WRONG_LENGTH);
    this[$BUFFER] = buffer;
    this[$OFFSET] = offset;
    this[$LENGTH] = byteLength;
  };

  if(DESCRIPTORS){
    addGetter($ArrayBuffer, BYTE_LENGTH, '_l');
    addGetter($DataView, BUFFER, '_b');
    addGetter($DataView, BYTE_LENGTH, '_l');
    addGetter($DataView, BYTE_OFFSET, '_o');
  }

  redefineAll($DataView[PROTOTYPE], {
    getInt8: function getInt8(byteOffset){
      return get(this, 1, byteOffset)[0] << 24 >> 24;
    },
    getUint8: function getUint8(byteOffset){
      return get(this, 1, byteOffset)[0];
    },
    getInt16: function getInt16(byteOffset /*, littleEndian */){
      var bytes = get(this, 2, byteOffset, arguments[1]);
      return (bytes[1] << 8 | bytes[0]) << 16 >> 16;
    },
    getUint16: function getUint16(byteOffset /*, littleEndian */){
      var bytes = get(this, 2, byteOffset, arguments[1]);
      return bytes[1] << 8 | bytes[0];
    },
    getInt32: function getInt32(byteOffset /*, littleEndian */){
      return unpackI32(get(this, 4, byteOffset, arguments[1]));
    },
    getUint32: function getUint32(byteOffset /*, littleEndian */){
      return unpackI32(get(this, 4, byteOffset, arguments[1])) >>> 0;
    },
    getFloat32: function getFloat32(byteOffset /*, littleEndian */){
      return unpackIEEE754(get(this, 4, byteOffset, arguments[1]), 23, 4);
    },
    getFloat64: function getFloat64(byteOffset /*, littleEndian */){
      return unpackIEEE754(get(this, 8, byteOffset, arguments[1]), 52, 8);
    },
    setInt8: function setInt8(byteOffset, value){
      set(this, 1, byteOffset, packI8, value);
    },
    setUint8: function setUint8(byteOffset, value){
      set(this, 1, byteOffset, packI8, value);
    },
    setInt16: function setInt16(byteOffset, value /*, littleEndian */){
      set(this, 2, byteOffset, packI16, value, arguments[2]);
    },
    setUint16: function setUint16(byteOffset, value /*, littleEndian */){
      set(this, 2, byteOffset, packI16, value, arguments[2]);
    },
    setInt32: function setInt32(byteOffset, value /*, littleEndian */){
      set(this, 4, byteOffset, packI32, value, arguments[2]);
    },
    setUint32: function setUint32(byteOffset, value /*, littleEndian */){
      set(this, 4, byteOffset, packI32, value, arguments[2]);
    },
    setFloat32: function setFloat32(byteOffset, value /*, littleEndian */){
      set(this, 4, byteOffset, packF32, value, arguments[2]);
    },
    setFloat64: function setFloat64(byteOffset, value /*, littleEndian */){
      set(this, 8, byteOffset, packF64, value, arguments[2]);
    }
  });
} else {
  if(!fails(function(){
    new $ArrayBuffer;     // eslint-disable-line no-new
  }) || !fails(function(){
    new $ArrayBuffer(.5); // eslint-disable-line no-new
  })){
    $ArrayBuffer = function ArrayBuffer(length){
      return new BaseBuffer(validateArrayBufferArguments(this, length));
    };
    var ArrayBufferProto = $ArrayBuffer[PROTOTYPE] = BaseBuffer[PROTOTYPE];
    for(var keys = gOPN(BaseBuffer), j = 0, key; keys.length > j; ){
      if(!((key = keys[j++]) in $ArrayBuffer))hide($ArrayBuffer, key, BaseBuffer[key]);
    };
    if(!LIBRARY)ArrayBufferProto.constructor = $ArrayBuffer;
  }
  // iOS Safari 7.x bug
  var view = new $DataView(new $ArrayBuffer(2))
    , $setInt8 = $DataView[PROTOTYPE].setInt8;
  view.setInt8(0, 2147483648);
  view.setInt8(1, 2147483649);
  if(view.getInt8(0) || !view.getInt8(1))redefineAll($DataView[PROTOTYPE], {
    setInt8: function setInt8(byteOffset, value){
      $setInt8.call(this, byteOffset, value << 24 >> 24);
    },
    setUint8: function setUint8(byteOffset, value){
      $setInt8.call(this, byteOffset, value << 24 >> 24);
    }
  }, true);
}
setToStringTag($ArrayBuffer, ARRAY_BUFFER);
setToStringTag($DataView, DATA_VIEW);
hide($DataView[PROTOTYPE], $typed.VIEW, true);
exports[ARRAY_BUFFER] = $ArrayBuffer;
exports[DATA_VIEW] = $DataView;
},{"./_an-instance":41,"./_array-fill":44,"./_descriptors":63,"./_fails":69,"./_global":73,"./_hide":75,"./_library":93,"./_object-dp":102,"./_object-gopn":107,"./_redefine-all":121,"./_set-to-string-tag":127,"./_to-integer":141,"./_to-length":143,"./_typed":148}],148:[function(require,module,exports){
var global = require('./_global')
  , hide   = require('./_hide')
  , uid    = require('./_uid')
  , TYPED  = uid('typed_array')
  , VIEW   = uid('view')
  , ABV    = !!(global.ArrayBuffer && global.DataView)
  , CONSTR = ABV
  , i = 0, l = 9, Typed;

var TypedArrayConstructors = (
  'Int8Array,Uint8Array,Uint8ClampedArray,Int16Array,Uint16Array,Int32Array,Uint32Array,Float32Array,Float64Array'
).split(',');

while(i < l){
  if(Typed = global[TypedArrayConstructors[i++]]){
    hide(Typed.prototype, TYPED, true);
    hide(Typed.prototype, VIEW, true);
  } else CONSTR = false;
}

module.exports = {
  ABV:    ABV,
  CONSTR: CONSTR,
  TYPED:  TYPED,
  VIEW:   VIEW
};
},{"./_global":73,"./_hide":75,"./_uid":149}],149:[function(require,module,exports){
var id = 0
  , px = Math.random();
module.exports = function(key){
  return 'Symbol('.concat(key === undefined ? '' : key, ')_', (++id + px).toString(36));
};
},{}],150:[function(require,module,exports){
var global         = require('./_global')
  , core           = require('./_core')
  , LIBRARY        = require('./_library')
  , wksExt         = require('./_wks-ext')
  , defineProperty = require('./_object-dp').f;
module.exports = function(name){
  var $Symbol = core.Symbol || (core.Symbol = LIBRARY ? {} : global.Symbol || {});
  if(name.charAt(0) != '_' && !(name in $Symbol))defineProperty($Symbol, name, {value: wksExt.f(name)});
};
},{"./_core":58,"./_global":73,"./_library":93,"./_object-dp":102,"./_wks-ext":151}],151:[function(require,module,exports){
exports.f = require('./_wks');
},{"./_wks":152}],152:[function(require,module,exports){
var store      = require('./_shared')('wks')
  , uid        = require('./_uid')
  , Symbol     = require('./_global').Symbol
  , USE_SYMBOL = typeof Symbol == 'function';

var $exports = module.exports = function(name){
  return store[name] || (store[name] =
    USE_SYMBOL && Symbol[name] || (USE_SYMBOL ? Symbol : uid)('Symbol.' + name));
};

$exports.store = store;
},{"./_global":73,"./_shared":129,"./_uid":149}],153:[function(require,module,exports){
var classof   = require('./_classof')
  , ITERATOR  = require('./_wks')('iterator')
  , Iterators = require('./_iterators');
module.exports = require('./_core').getIteratorMethod = function(it){
  if(it != undefined)return it[ITERATOR]
    || it['@@iterator']
    || Iterators[classof(it)];
};
},{"./_classof":52,"./_core":58,"./_iterators":91,"./_wks":152}],154:[function(require,module,exports){
// https://github.com/benjamingr/RexExp.escape
var $export = require('./_export')
  , $re     = require('./_replacer')(/[\\^$*+?.()|[\]{}]/g, '\\$&');

$export($export.S, 'RegExp', {escape: function escape(it){ return $re(it); }});

},{"./_export":67,"./_replacer":123}],155:[function(require,module,exports){
// 22.1.3.3 Array.prototype.copyWithin(target, start, end = this.length)
var $export = require('./_export');

$export($export.P, 'Array', {copyWithin: require('./_array-copy-within')});

require('./_add-to-unscopables')('copyWithin');
},{"./_add-to-unscopables":40,"./_array-copy-within":43,"./_export":67}],156:[function(require,module,exports){
'use strict';
var $export = require('./_export')
  , $every  = require('./_array-methods')(4);

$export($export.P + $export.F * !require('./_strict-method')([].every, true), 'Array', {
  // 22.1.3.5 / 15.4.4.16 Array.prototype.every(callbackfn [, thisArg])
  every: function every(callbackfn /* , thisArg */){
    return $every(this, callbackfn, arguments[1]);
  }
});
},{"./_array-methods":47,"./_export":67,"./_strict-method":131}],157:[function(require,module,exports){
// 22.1.3.6 Array.prototype.fill(value, start = 0, end = this.length)
var $export = require('./_export');

$export($export.P, 'Array', {fill: require('./_array-fill')});

require('./_add-to-unscopables')('fill');
},{"./_add-to-unscopables":40,"./_array-fill":44,"./_export":67}],158:[function(require,module,exports){
'use strict';
var $export = require('./_export')
  , $filter = require('./_array-methods')(2);

$export($export.P + $export.F * !require('./_strict-method')([].filter, true), 'Array', {
  // 22.1.3.7 / 15.4.4.20 Array.prototype.filter(callbackfn [, thisArg])
  filter: function filter(callbackfn /* , thisArg */){
    return $filter(this, callbackfn, arguments[1]);
  }
});
},{"./_array-methods":47,"./_export":67,"./_strict-method":131}],159:[function(require,module,exports){
'use strict';
// 22.1.3.9 Array.prototype.findIndex(predicate, thisArg = undefined)
var $export = require('./_export')
  , $find   = require('./_array-methods')(6)
  , KEY     = 'findIndex'
  , forced  = true;
// Shouldn't skip holes
if(KEY in [])Array(1)[KEY](function(){ forced = false; });
$export($export.P + $export.F * forced, 'Array', {
  findIndex: function findIndex(callbackfn/*, that = undefined */){
    return $find(this, callbackfn, arguments.length > 1 ? arguments[1] : undefined);
  }
});
require('./_add-to-unscopables')(KEY);
},{"./_add-to-unscopables":40,"./_array-methods":47,"./_export":67}],160:[function(require,module,exports){
'use strict';
// 22.1.3.8 Array.prototype.find(predicate, thisArg = undefined)
var $export = require('./_export')
  , $find   = require('./_array-methods')(5)
  , KEY     = 'find'
  , forced  = true;
// Shouldn't skip holes
if(KEY in [])Array(1)[KEY](function(){ forced = false; });
$export($export.P + $export.F * forced, 'Array', {
  find: function find(callbackfn/*, that = undefined */){
    return $find(this, callbackfn, arguments.length > 1 ? arguments[1] : undefined);
  }
});
require('./_add-to-unscopables')(KEY);
},{"./_add-to-unscopables":40,"./_array-methods":47,"./_export":67}],161:[function(require,module,exports){
'use strict';
var $export  = require('./_export')
  , $forEach = require('./_array-methods')(0)
  , STRICT   = require('./_strict-method')([].forEach, true);

$export($export.P + $export.F * !STRICT, 'Array', {
  // 22.1.3.10 / 15.4.4.18 Array.prototype.forEach(callbackfn [, thisArg])
  forEach: function forEach(callbackfn /* , thisArg */){
    return $forEach(this, callbackfn, arguments[1]);
  }
});
},{"./_array-methods":47,"./_export":67,"./_strict-method":131}],162:[function(require,module,exports){
'use strict';
var ctx            = require('./_ctx')
  , $export        = require('./_export')
  , toObject       = require('./_to-object')
  , call           = require('./_iter-call')
  , isArrayIter    = require('./_is-array-iter')
  , toLength       = require('./_to-length')
  , createProperty = require('./_create-property')
  , getIterFn      = require('./core.get-iterator-method');

$export($export.S + $export.F * !require('./_iter-detect')(function(iter){ Array.from(iter); }), 'Array', {
  // 22.1.2.1 Array.from(arrayLike, mapfn = undefined, thisArg = undefined)
  from: function from(arrayLike/*, mapfn = undefined, thisArg = undefined*/){
    var O       = toObject(arrayLike)
      , C       = typeof this == 'function' ? this : Array
      , aLen    = arguments.length
      , mapfn   = aLen > 1 ? arguments[1] : undefined
      , mapping = mapfn !== undefined
      , index   = 0
      , iterFn  = getIterFn(O)
      , length, result, step, iterator;
    if(mapping)mapfn = ctx(mapfn, aLen > 2 ? arguments[2] : undefined, 2);
    // if object isn't iterable or it's array with default iterator - use simple case
    if(iterFn != undefined && !(C == Array && isArrayIter(iterFn))){
      for(iterator = iterFn.call(O), result = new C; !(step = iterator.next()).done; index++){
        createProperty(result, index, mapping ? call(iterator, mapfn, [step.value, index], true) : step.value);
      }
    } else {
      length = toLength(O.length);
      for(result = new C(length); length > index; index++){
        createProperty(result, index, mapping ? mapfn(O[index], index) : O[index]);
      }
    }
    result.length = index;
    return result;
  }
});

},{"./_create-property":59,"./_ctx":60,"./_export":67,"./_is-array-iter":81,"./_iter-call":86,"./_iter-detect":89,"./_to-length":143,"./_to-object":144,"./core.get-iterator-method":153}],163:[function(require,module,exports){
'use strict';
var $export       = require('./_export')
  , $indexOf      = require('./_array-includes')(false)
  , $native       = [].indexOf
  , NEGATIVE_ZERO = !!$native && 1 / [1].indexOf(1, -0) < 0;

$export($export.P + $export.F * (NEGATIVE_ZERO || !require('./_strict-method')($native)), 'Array', {
  // 22.1.3.11 / 15.4.4.14 Array.prototype.indexOf(searchElement [, fromIndex])
  indexOf: function indexOf(searchElement /*, fromIndex = 0 */){
    return NEGATIVE_ZERO
      // convert -0 to +0
      ? $native.apply(this, arguments) || 0
      : $indexOf(this, searchElement, arguments[1]);
  }
});
},{"./_array-includes":46,"./_export":67,"./_strict-method":131}],164:[function(require,module,exports){
// 22.1.2.2 / 15.4.3.2 Array.isArray(arg)
var $export = require('./_export');

$export($export.S, 'Array', {isArray: require('./_is-array')});
},{"./_export":67,"./_is-array":82}],165:[function(require,module,exports){
'use strict';
var addToUnscopables = require('./_add-to-unscopables')
  , step             = require('./_iter-step')
  , Iterators        = require('./_iterators')
  , toIObject        = require('./_to-iobject');

// 22.1.3.4 Array.prototype.entries()
// 22.1.3.13 Array.prototype.keys()
// 22.1.3.29 Array.prototype.values()
// 22.1.3.30 Array.prototype[@@iterator]()
module.exports = require('./_iter-define')(Array, 'Array', function(iterated, kind){
  this._t = toIObject(iterated); // target
  this._i = 0;                   // next index
  this._k = kind;                // kind
// 22.1.5.2.1 %ArrayIteratorPrototype%.next()
}, function(){
  var O     = this._t
    , kind  = this._k
    , index = this._i++;
  if(!O || index >= O.length){
    this._t = undefined;
    return step(1);
  }
  if(kind == 'keys'  )return step(0, index);
  if(kind == 'values')return step(0, O[index]);
  return step(0, [index, O[index]]);
}, 'values');

// argumentsList[@@iterator] is %ArrayProto_values% (9.4.4.6, 9.4.4.7)
Iterators.Arguments = Iterators.Array;

addToUnscopables('keys');
addToUnscopables('values');
addToUnscopables('entries');
},{"./_add-to-unscopables":40,"./_iter-define":88,"./_iter-step":90,"./_iterators":91,"./_to-iobject":142}],166:[function(require,module,exports){
'use strict';
// 22.1.3.13 Array.prototype.join(separator)
var $export   = require('./_export')
  , toIObject = require('./_to-iobject')
  , arrayJoin = [].join;

// fallback for not array-like strings
$export($export.P + $export.F * (require('./_iobject') != Object || !require('./_strict-method')(arrayJoin)), 'Array', {
  join: function join(separator){
    return arrayJoin.call(toIObject(this), separator === undefined ? ',' : separator);
  }
});
},{"./_export":67,"./_iobject":80,"./_strict-method":131,"./_to-iobject":142}],167:[function(require,module,exports){
'use strict';
var $export       = require('./_export')
  , toIObject     = require('./_to-iobject')
  , toInteger     = require('./_to-integer')
  , toLength      = require('./_to-length')
  , $native       = [].lastIndexOf
  , NEGATIVE_ZERO = !!$native && 1 / [1].lastIndexOf(1, -0) < 0;

$export($export.P + $export.F * (NEGATIVE_ZERO || !require('./_strict-method')($native)), 'Array', {
  // 22.1.3.14 / 15.4.4.15 Array.prototype.lastIndexOf(searchElement [, fromIndex])
  lastIndexOf: function lastIndexOf(searchElement /*, fromIndex = @[*-1] */){
    // convert -0 to +0
    if(NEGATIVE_ZERO)return $native.apply(this, arguments) || 0;
    var O      = toIObject(this)
      , length = toLength(O.length)
      , index  = length - 1;
    if(arguments.length > 1)index = Math.min(index, toInteger(arguments[1]));
    if(index < 0)index = length + index;
    for(;index >= 0; index--)if(index in O)if(O[index] === searchElement)return index || 0;
    return -1;
  }
});
},{"./_export":67,"./_strict-method":131,"./_to-integer":141,"./_to-iobject":142,"./_to-length":143}],168:[function(require,module,exports){
'use strict';
var $export = require('./_export')
  , $map    = require('./_array-methods')(1);

$export($export.P + $export.F * !require('./_strict-method')([].map, true), 'Array', {
  // 22.1.3.15 / 15.4.4.19 Array.prototype.map(callbackfn [, thisArg])
  map: function map(callbackfn /* , thisArg */){
    return $map(this, callbackfn, arguments[1]);
  }
});
},{"./_array-methods":47,"./_export":67,"./_strict-method":131}],169:[function(require,module,exports){
'use strict';
var $export        = require('./_export')
  , createProperty = require('./_create-property');

// WebKit Array.of isn't generic
$export($export.S + $export.F * require('./_fails')(function(){
  function F(){}
  return !(Array.of.call(F) instanceof F);
}), 'Array', {
  // 22.1.2.3 Array.of( ...items)
  of: function of(/* ...args */){
    var index  = 0
      , aLen   = arguments.length
      , result = new (typeof this == 'function' ? this : Array)(aLen);
    while(aLen > index)createProperty(result, index, arguments[index++]);
    result.length = aLen;
    return result;
  }
});
},{"./_create-property":59,"./_export":67,"./_fails":69}],170:[function(require,module,exports){
'use strict';
var $export = require('./_export')
  , $reduce = require('./_array-reduce');

$export($export.P + $export.F * !require('./_strict-method')([].reduceRight, true), 'Array', {
  // 22.1.3.19 / 15.4.4.22 Array.prototype.reduceRight(callbackfn [, initialValue])
  reduceRight: function reduceRight(callbackfn /* , initialValue */){
    return $reduce(this, callbackfn, arguments.length, arguments[1], true);
  }
});
},{"./_array-reduce":48,"./_export":67,"./_strict-method":131}],171:[function(require,module,exports){
'use strict';
var $export = require('./_export')
  , $reduce = require('./_array-reduce');

$export($export.P + $export.F * !require('./_strict-method')([].reduce, true), 'Array', {
  // 22.1.3.18 / 15.4.4.21 Array.prototype.reduce(callbackfn [, initialValue])
  reduce: function reduce(callbackfn /* , initialValue */){
    return $reduce(this, callbackfn, arguments.length, arguments[1], false);
  }
});
},{"./_array-reduce":48,"./_export":67,"./_strict-method":131}],172:[function(require,module,exports){
'use strict';
var $export    = require('./_export')
  , html       = require('./_html')
  , cof        = require('./_cof')
  , toIndex    = require('./_to-index')
  , toLength   = require('./_to-length')
  , arraySlice = [].slice;

// fallback for not array-like ES3 strings and DOM objects
$export($export.P + $export.F * require('./_fails')(function(){
  if(html)arraySlice.call(html);
}), 'Array', {
  slice: function slice(begin, end){
    var len   = toLength(this.length)
      , klass = cof(this);
    end = end === undefined ? len : end;
    if(klass == 'Array')return arraySlice.call(this, begin, end);
    var start  = toIndex(begin, len)
      , upTo   = toIndex(end, len)
      , size   = toLength(upTo - start)
      , cloned = Array(size)
      , i      = 0;
    for(; i < size; i++)cloned[i] = klass == 'String'
      ? this.charAt(start + i)
      : this[start + i];
    return cloned;
  }
});
},{"./_cof":53,"./_export":67,"./_fails":69,"./_html":76,"./_to-index":140,"./_to-length":143}],173:[function(require,module,exports){
'use strict';
var $export = require('./_export')
  , $some   = require('./_array-methods')(3);

$export($export.P + $export.F * !require('./_strict-method')([].some, true), 'Array', {
  // 22.1.3.23 / 15.4.4.17 Array.prototype.some(callbackfn [, thisArg])
  some: function some(callbackfn /* , thisArg */){
    return $some(this, callbackfn, arguments[1]);
  }
});
},{"./_array-methods":47,"./_export":67,"./_strict-method":131}],174:[function(require,module,exports){
'use strict';
var $export   = require('./_export')
  , aFunction = require('./_a-function')
  , toObject  = require('./_to-object')
  , fails     = require('./_fails')
  , $sort     = [].sort
  , test      = [1, 2, 3];

$export($export.P + $export.F * (fails(function(){
  // IE8-
  test.sort(undefined);
}) || !fails(function(){
  // V8 bug
  test.sort(null);
  // Old WebKit
}) || !require('./_strict-method')($sort)), 'Array', {
  // 22.1.3.25 Array.prototype.sort(comparefn)
  sort: function sort(comparefn){
    return comparefn === undefined
      ? $sort.call(toObject(this))
      : $sort.call(toObject(this), aFunction(comparefn));
  }
});
},{"./_a-function":38,"./_export":67,"./_fails":69,"./_strict-method":131,"./_to-object":144}],175:[function(require,module,exports){
require('./_set-species')('Array');
},{"./_set-species":126}],176:[function(require,module,exports){
// 20.3.3.1 / 15.9.4.4 Date.now()
var $export = require('./_export');

$export($export.S, 'Date', {now: function(){ return new Date().getTime(); }});
},{"./_export":67}],177:[function(require,module,exports){
'use strict';
// 20.3.4.36 / 15.9.5.43 Date.prototype.toISOString()
var $export = require('./_export')
  , fails   = require('./_fails')
  , getTime = Date.prototype.getTime;

var lz = function(num){
  return num > 9 ? num : '0' + num;
};

// PhantomJS / old WebKit has a broken implementations
$export($export.P + $export.F * (fails(function(){
  return new Date(-5e13 - 1).toISOString() != '0385-07-25T07:06:39.999Z';
}) || !fails(function(){
  new Date(NaN).toISOString();
})), 'Date', {
  toISOString: function toISOString(){
    if(!isFinite(getTime.call(this)))throw RangeError('Invalid time value');
    var d = this
      , y = d.getUTCFullYear()
      , m = d.getUTCMilliseconds()
      , s = y < 0 ? '-' : y > 9999 ? '+' : '';
    return s + ('00000' + Math.abs(y)).slice(s ? -6 : -4) +
      '-' + lz(d.getUTCMonth() + 1) + '-' + lz(d.getUTCDate()) +
      'T' + lz(d.getUTCHours()) + ':' + lz(d.getUTCMinutes()) +
      ':' + lz(d.getUTCSeconds()) + '.' + (m > 99 ? m : '0' + lz(m)) + 'Z';
  }
});
},{"./_export":67,"./_fails":69}],178:[function(require,module,exports){
'use strict';
var $export     = require('./_export')
  , toObject    = require('./_to-object')
  , toPrimitive = require('./_to-primitive');

$export($export.P + $export.F * require('./_fails')(function(){
  return new Date(NaN).toJSON() !== null || Date.prototype.toJSON.call({toISOString: function(){ return 1; }}) !== 1;
}), 'Date', {
  toJSON: function toJSON(key){
    var O  = toObject(this)
      , pv = toPrimitive(O);
    return typeof pv == 'number' && !isFinite(pv) ? null : O.toISOString();
  }
});
},{"./_export":67,"./_fails":69,"./_to-object":144,"./_to-primitive":145}],179:[function(require,module,exports){
var TO_PRIMITIVE = require('./_wks')('toPrimitive')
  , proto        = Date.prototype;

if(!(TO_PRIMITIVE in proto))require('./_hide')(proto, TO_PRIMITIVE, require('./_date-to-primitive'));
},{"./_date-to-primitive":61,"./_hide":75,"./_wks":152}],180:[function(require,module,exports){
var DateProto    = Date.prototype
  , INVALID_DATE = 'Invalid Date'
  , TO_STRING    = 'toString'
  , $toString    = DateProto[TO_STRING]
  , getTime      = DateProto.getTime;
if(new Date(NaN) + '' != INVALID_DATE){
  require('./_redefine')(DateProto, TO_STRING, function toString(){
    var value = getTime.call(this);
    return value === value ? $toString.call(this) : INVALID_DATE;
  });
}
},{"./_redefine":122}],181:[function(require,module,exports){
// 19.2.3.2 / 15.3.4.5 Function.prototype.bind(thisArg, args...)
var $export = require('./_export');

$export($export.P, 'Function', {bind: require('./_bind')});
},{"./_bind":51,"./_export":67}],182:[function(require,module,exports){
'use strict';
var isObject       = require('./_is-object')
  , getPrototypeOf = require('./_object-gpo')
  , HAS_INSTANCE   = require('./_wks')('hasInstance')
  , FunctionProto  = Function.prototype;
// 19.2.3.6 Function.prototype[@@hasInstance](V)
if(!(HAS_INSTANCE in FunctionProto))require('./_object-dp').f(FunctionProto, HAS_INSTANCE, {value: function(O){
  if(typeof this != 'function' || !isObject(O))return false;
  if(!isObject(this.prototype))return O instanceof this;
  // for environment w/o native `@@hasInstance` logic enough `instanceof`, but add this:
  while(O = getPrototypeOf(O))if(this.prototype === O)return true;
  return false;
}});
},{"./_is-object":84,"./_object-dp":102,"./_object-gpo":109,"./_wks":152}],183:[function(require,module,exports){
var dP         = require('./_object-dp').f
  , createDesc = require('./_property-desc')
  , has        = require('./_has')
  , FProto     = Function.prototype
  , nameRE     = /^\s*function ([^ (]*)/
  , NAME       = 'name';

var isExtensible = Object.isExtensible || function(){
  return true;
};

// 19.2.4.2 name
NAME in FProto || require('./_descriptors') && dP(FProto, NAME, {
  configurable: true,
  get: function(){
    try {
      var that = this
        , name = ('' + that).match(nameRE)[1];
      has(that, NAME) || !isExtensible(that) || dP(that, NAME, createDesc(5, name));
      return name;
    } catch(e){
      return '';
    }
  }
});
},{"./_descriptors":63,"./_has":74,"./_object-dp":102,"./_property-desc":120}],184:[function(require,module,exports){
'use strict';
var strong = require('./_collection-strong');

// 23.1 Map Objects
module.exports = require('./_collection')('Map', function(get){
  return function Map(){ return get(this, arguments.length > 0 ? arguments[0] : undefined); };
}, {
  // 23.1.3.6 Map.prototype.get(key)
  get: function get(key){
    var entry = strong.getEntry(this, key);
    return entry && entry.v;
  },
  // 23.1.3.9 Map.prototype.set(key, value)
  set: function set(key, value){
    return strong.def(this, key === 0 ? 0 : key, value);
  }
}, strong, true);
},{"./_collection":57,"./_collection-strong":54}],185:[function(require,module,exports){
// 20.2.2.3 Math.acosh(x)
var $export = require('./_export')
  , log1p   = require('./_math-log1p')
  , sqrt    = Math.sqrt
  , $acosh  = Math.acosh;

$export($export.S + $export.F * !($acosh
  // V8 bug: https://code.google.com/p/v8/issues/detail?id=3509
  && Math.floor($acosh(Number.MAX_VALUE)) == 710
  // Tor Browser bug: Math.acosh(Infinity) -> NaN 
  && $acosh(Infinity) == Infinity
), 'Math', {
  acosh: function acosh(x){
    return (x = +x) < 1 ? NaN : x > 94906265.62425156
      ? Math.log(x) + Math.LN2
      : log1p(x - 1 + sqrt(x - 1) * sqrt(x + 1));
  }
});
},{"./_export":67,"./_math-log1p":95}],186:[function(require,module,exports){
// 20.2.2.5 Math.asinh(x)
var $export = require('./_export')
  , $asinh  = Math.asinh;

function asinh(x){
  return !isFinite(x = +x) || x == 0 ? x : x < 0 ? -asinh(-x) : Math.log(x + Math.sqrt(x * x + 1));
}

// Tor Browser bug: Math.asinh(0) -> -0 
$export($export.S + $export.F * !($asinh && 1 / $asinh(0) > 0), 'Math', {asinh: asinh});
},{"./_export":67}],187:[function(require,module,exports){
// 20.2.2.7 Math.atanh(x)
var $export = require('./_export')
  , $atanh  = Math.atanh;

// Tor Browser bug: Math.atanh(-0) -> 0 
$export($export.S + $export.F * !($atanh && 1 / $atanh(-0) < 0), 'Math', {
  atanh: function atanh(x){
    return (x = +x) == 0 ? x : Math.log((1 + x) / (1 - x)) / 2;
  }
});
},{"./_export":67}],188:[function(require,module,exports){
// 20.2.2.9 Math.cbrt(x)
var $export = require('./_export')
  , sign    = require('./_math-sign');

$export($export.S, 'Math', {
  cbrt: function cbrt(x){
    return sign(x = +x) * Math.pow(Math.abs(x), 1 / 3);
  }
});
},{"./_export":67,"./_math-sign":96}],189:[function(require,module,exports){
// 20.2.2.11 Math.clz32(x)
var $export = require('./_export');

$export($export.S, 'Math', {
  clz32: function clz32(x){
    return (x >>>= 0) ? 31 - Math.floor(Math.log(x + 0.5) * Math.LOG2E) : 32;
  }
});
},{"./_export":67}],190:[function(require,module,exports){
// 20.2.2.12 Math.cosh(x)
var $export = require('./_export')
  , exp     = Math.exp;

$export($export.S, 'Math', {
  cosh: function cosh(x){
    return (exp(x = +x) + exp(-x)) / 2;
  }
});
},{"./_export":67}],191:[function(require,module,exports){
// 20.2.2.14 Math.expm1(x)
var $export = require('./_export')
  , $expm1  = require('./_math-expm1');

$export($export.S + $export.F * ($expm1 != Math.expm1), 'Math', {expm1: $expm1});
},{"./_export":67,"./_math-expm1":94}],192:[function(require,module,exports){
// 20.2.2.16 Math.fround(x)
var $export   = require('./_export')
  , sign      = require('./_math-sign')
  , pow       = Math.pow
  , EPSILON   = pow(2, -52)
  , EPSILON32 = pow(2, -23)
  , MAX32     = pow(2, 127) * (2 - EPSILON32)
  , MIN32     = pow(2, -126);

var roundTiesToEven = function(n){
  return n + 1 / EPSILON - 1 / EPSILON;
};


$export($export.S, 'Math', {
  fround: function fround(x){
    var $abs  = Math.abs(x)
      , $sign = sign(x)
      , a, result;
    if($abs < MIN32)return $sign * roundTiesToEven($abs / MIN32 / EPSILON32) * MIN32 * EPSILON32;
    a = (1 + EPSILON32 / EPSILON) * $abs;
    result = a - (a - $abs);
    if(result > MAX32 || result != result)return $sign * Infinity;
    return $sign * result;
  }
});
},{"./_export":67,"./_math-sign":96}],193:[function(require,module,exports){
// 20.2.2.17 Math.hypot([value1[, value2[, … ]]])
var $export = require('./_export')
  , abs     = Math.abs;

$export($export.S, 'Math', {
  hypot: function hypot(value1, value2){ // eslint-disable-line no-unused-vars
    var sum  = 0
      , i    = 0
      , aLen = arguments.length
      , larg = 0
      , arg, div;
    while(i < aLen){
      arg = abs(arguments[i++]);
      if(larg < arg){
        div  = larg / arg;
        sum  = sum * div * div + 1;
        larg = arg;
      } else if(arg > 0){
        div  = arg / larg;
        sum += div * div;
      } else sum += arg;
    }
    return larg === Infinity ? Infinity : larg * Math.sqrt(sum);
  }
});
},{"./_export":67}],194:[function(require,module,exports){
// 20.2.2.18 Math.imul(x, y)
var $export = require('./_export')
  , $imul   = Math.imul;

// some WebKit versions fails with big numbers, some has wrong arity
$export($export.S + $export.F * require('./_fails')(function(){
  return $imul(0xffffffff, 5) != -5 || $imul.length != 2;
}), 'Math', {
  imul: function imul(x, y){
    var UINT16 = 0xffff
      , xn = +x
      , yn = +y
      , xl = UINT16 & xn
      , yl = UINT16 & yn;
    return 0 | xl * yl + ((UINT16 & xn >>> 16) * yl + xl * (UINT16 & yn >>> 16) << 16 >>> 0);
  }
});
},{"./_export":67,"./_fails":69}],195:[function(require,module,exports){
// 20.2.2.21 Math.log10(x)
var $export = require('./_export');

$export($export.S, 'Math', {
  log10: function log10(x){
    return Math.log(x) / Math.LN10;
  }
});
},{"./_export":67}],196:[function(require,module,exports){
// 20.2.2.20 Math.log1p(x)
var $export = require('./_export');

$export($export.S, 'Math', {log1p: require('./_math-log1p')});
},{"./_export":67,"./_math-log1p":95}],197:[function(require,module,exports){
// 20.2.2.22 Math.log2(x)
var $export = require('./_export');

$export($export.S, 'Math', {
  log2: function log2(x){
    return Math.log(x) / Math.LN2;
  }
});
},{"./_export":67}],198:[function(require,module,exports){
// 20.2.2.28 Math.sign(x)
var $export = require('./_export');

$export($export.S, 'Math', {sign: require('./_math-sign')});
},{"./_export":67,"./_math-sign":96}],199:[function(require,module,exports){
// 20.2.2.30 Math.sinh(x)
var $export = require('./_export')
  , expm1   = require('./_math-expm1')
  , exp     = Math.exp;

// V8 near Chromium 38 has a problem with very small numbers
$export($export.S + $export.F * require('./_fails')(function(){
  return !Math.sinh(-2e-17) != -2e-17;
}), 'Math', {
  sinh: function sinh(x){
    return Math.abs(x = +x) < 1
      ? (expm1(x) - expm1(-x)) / 2
      : (exp(x - 1) - exp(-x - 1)) * (Math.E / 2);
  }
});
},{"./_export":67,"./_fails":69,"./_math-expm1":94}],200:[function(require,module,exports){
// 20.2.2.33 Math.tanh(x)
var $export = require('./_export')
  , expm1   = require('./_math-expm1')
  , exp     = Math.exp;

$export($export.S, 'Math', {
  tanh: function tanh(x){
    var a = expm1(x = +x)
      , b = expm1(-x);
    return a == Infinity ? 1 : b == Infinity ? -1 : (a - b) / (exp(x) + exp(-x));
  }
});
},{"./_export":67,"./_math-expm1":94}],201:[function(require,module,exports){
// 20.2.2.34 Math.trunc(x)
var $export = require('./_export');

$export($export.S, 'Math', {
  trunc: function trunc(it){
    return (it > 0 ? Math.floor : Math.ceil)(it);
  }
});
},{"./_export":67}],202:[function(require,module,exports){
'use strict';
var global            = require('./_global')
  , has               = require('./_has')
  , cof               = require('./_cof')
  , inheritIfRequired = require('./_inherit-if-required')
  , toPrimitive       = require('./_to-primitive')
  , fails             = require('./_fails')
  , gOPN              = require('./_object-gopn').f
  , gOPD              = require('./_object-gopd').f
  , dP                = require('./_object-dp').f
  , $trim             = require('./_string-trim').trim
  , NUMBER            = 'Number'
  , $Number           = global[NUMBER]
  , Base              = $Number
  , proto             = $Number.prototype
  // Opera ~12 has broken Object#toString
  , BROKEN_COF        = cof(require('./_object-create')(proto)) == NUMBER
  , TRIM              = 'trim' in String.prototype;

// 7.1.3 ToNumber(argument)
var toNumber = function(argument){
  var it = toPrimitive(argument, false);
  if(typeof it == 'string' && it.length > 2){
    it = TRIM ? it.trim() : $trim(it, 3);
    var first = it.charCodeAt(0)
      , third, radix, maxCode;
    if(first === 43 || first === 45){
      third = it.charCodeAt(2);
      if(third === 88 || third === 120)return NaN; // Number('+0x1') should be NaN, old V8 fix
    } else if(first === 48){
      switch(it.charCodeAt(1)){
        case 66 : case 98  : radix = 2; maxCode = 49; break; // fast equal /^0b[01]+$/i
        case 79 : case 111 : radix = 8; maxCode = 55; break; // fast equal /^0o[0-7]+$/i
        default : return +it;
      }
      for(var digits = it.slice(2), i = 0, l = digits.length, code; i < l; i++){
        code = digits.charCodeAt(i);
        // parseInt parses a string to a first unavailable symbol
        // but ToNumber should return NaN if a string contains unavailable symbols
        if(code < 48 || code > maxCode)return NaN;
      } return parseInt(digits, radix);
    }
  } return +it;
};

if(!$Number(' 0o1') || !$Number('0b1') || $Number('+0x1')){
  $Number = function Number(value){
    var it = arguments.length < 1 ? 0 : value
      , that = this;
    return that instanceof $Number
      // check on 1..constructor(foo) case
      && (BROKEN_COF ? fails(function(){ proto.valueOf.call(that); }) : cof(that) != NUMBER)
        ? inheritIfRequired(new Base(toNumber(it)), that, $Number) : toNumber(it);
  };
  for(var keys = require('./_descriptors') ? gOPN(Base) : (
    // ES3:
    'MAX_VALUE,MIN_VALUE,NaN,NEGATIVE_INFINITY,POSITIVE_INFINITY,' +
    // ES6 (in case, if modules with ES6 Number statics required before):
    'EPSILON,isFinite,isInteger,isNaN,isSafeInteger,MAX_SAFE_INTEGER,' +
    'MIN_SAFE_INTEGER,parseFloat,parseInt,isInteger'
  ).split(','), j = 0, key; keys.length > j; j++){
    if(has(Base, key = keys[j]) && !has($Number, key)){
      dP($Number, key, gOPD(Base, key));
    }
  }
  $Number.prototype = proto;
  proto.constructor = $Number;
  require('./_redefine')(global, NUMBER, $Number);
}
},{"./_cof":53,"./_descriptors":63,"./_fails":69,"./_global":73,"./_has":74,"./_inherit-if-required":78,"./_object-create":101,"./_object-dp":102,"./_object-gopd":105,"./_object-gopn":107,"./_redefine":122,"./_string-trim":137,"./_to-primitive":145}],203:[function(require,module,exports){
// 20.1.2.1 Number.EPSILON
var $export = require('./_export');

$export($export.S, 'Number', {EPSILON: Math.pow(2, -52)});
},{"./_export":67}],204:[function(require,module,exports){
// 20.1.2.2 Number.isFinite(number)
var $export   = require('./_export')
  , _isFinite = require('./_global').isFinite;

$export($export.S, 'Number', {
  isFinite: function isFinite(it){
    return typeof it == 'number' && _isFinite(it);
  }
});
},{"./_export":67,"./_global":73}],205:[function(require,module,exports){
// 20.1.2.3 Number.isInteger(number)
var $export = require('./_export');

$export($export.S, 'Number', {isInteger: require('./_is-integer')});
},{"./_export":67,"./_is-integer":83}],206:[function(require,module,exports){
// 20.1.2.4 Number.isNaN(number)
var $export = require('./_export');

$export($export.S, 'Number', {
  isNaN: function isNaN(number){
    return number != number;
  }
});
},{"./_export":67}],207:[function(require,module,exports){
// 20.1.2.5 Number.isSafeInteger(number)
var $export   = require('./_export')
  , isInteger = require('./_is-integer')
  , abs       = Math.abs;

$export($export.S, 'Number', {
  isSafeInteger: function isSafeInteger(number){
    return isInteger(number) && abs(number) <= 0x1fffffffffffff;
  }
});
},{"./_export":67,"./_is-integer":83}],208:[function(require,module,exports){
// 20.1.2.6 Number.MAX_SAFE_INTEGER
var $export = require('./_export');

$export($export.S, 'Number', {MAX_SAFE_INTEGER: 0x1fffffffffffff});
},{"./_export":67}],209:[function(require,module,exports){
// 20.1.2.10 Number.MIN_SAFE_INTEGER
var $export = require('./_export');

$export($export.S, 'Number', {MIN_SAFE_INTEGER: -0x1fffffffffffff});
},{"./_export":67}],210:[function(require,module,exports){
var $export     = require('./_export')
  , $parseFloat = require('./_parse-float');
// 20.1.2.12 Number.parseFloat(string)
$export($export.S + $export.F * (Number.parseFloat != $parseFloat), 'Number', {parseFloat: $parseFloat});
},{"./_export":67,"./_parse-float":116}],211:[function(require,module,exports){
var $export   = require('./_export')
  , $parseInt = require('./_parse-int');
// 20.1.2.13 Number.parseInt(string, radix)
$export($export.S + $export.F * (Number.parseInt != $parseInt), 'Number', {parseInt: $parseInt});
},{"./_export":67,"./_parse-int":117}],212:[function(require,module,exports){
'use strict';
var $export      = require('./_export')
  , toInteger    = require('./_to-integer')
  , aNumberValue = require('./_a-number-value')
  , repeat       = require('./_string-repeat')
  , $toFixed     = 1..toFixed
  , floor        = Math.floor
  , data         = [0, 0, 0, 0, 0, 0]
  , ERROR        = 'Number.toFixed: incorrect invocation!'
  , ZERO         = '0';

var multiply = function(n, c){
  var i  = -1
    , c2 = c;
  while(++i < 6){
    c2 += n * data[i];
    data[i] = c2 % 1e7;
    c2 = floor(c2 / 1e7);
  }
};
var divide = function(n){
  var i = 6
    , c = 0;
  while(--i >= 0){
    c += data[i];
    data[i] = floor(c / n);
    c = (c % n) * 1e7;
  }
};
var numToString = function(){
  var i = 6
    , s = '';
  while(--i >= 0){
    if(s !== '' || i === 0 || data[i] !== 0){
      var t = String(data[i]);
      s = s === '' ? t : s + repeat.call(ZERO, 7 - t.length) + t;
    }
  } return s;
};
var pow = function(x, n, acc){
  return n === 0 ? acc : n % 2 === 1 ? pow(x, n - 1, acc * x) : pow(x * x, n / 2, acc);
};
var log = function(x){
  var n  = 0
    , x2 = x;
  while(x2 >= 4096){
    n += 12;
    x2 /= 4096;
  }
  while(x2 >= 2){
    n  += 1;
    x2 /= 2;
  } return n;
};

$export($export.P + $export.F * (!!$toFixed && (
  0.00008.toFixed(3) !== '0.000' ||
  0.9.toFixed(0) !== '1' ||
  1.255.toFixed(2) !== '1.25' ||
  1000000000000000128..toFixed(0) !== '1000000000000000128'
) || !require('./_fails')(function(){
  // V8 ~ Android 4.3-
  $toFixed.call({});
})), 'Number', {
  toFixed: function toFixed(fractionDigits){
    var x = aNumberValue(this, ERROR)
      , f = toInteger(fractionDigits)
      , s = ''
      , m = ZERO
      , e, z, j, k;
    if(f < 0 || f > 20)throw RangeError(ERROR);
    if(x != x)return 'NaN';
    if(x <= -1e21 || x >= 1e21)return String(x);
    if(x < 0){
      s = '-';
      x = -x;
    }
    if(x > 1e-21){
      e = log(x * pow(2, 69, 1)) - 69;
      z = e < 0 ? x * pow(2, -e, 1) : x / pow(2, e, 1);
      z *= 0x10000000000000;
      e = 52 - e;
      if(e > 0){
        multiply(0, z);
        j = f;
        while(j >= 7){
          multiply(1e7, 0);
          j -= 7;
        }
        multiply(pow(10, j, 1), 0);
        j = e - 1;
        while(j >= 23){
          divide(1 << 23);
          j -= 23;
        }
        divide(1 << j);
        multiply(1, 1);
        divide(2);
        m = numToString();
      } else {
        multiply(0, z);
        multiply(1 << -e, 0);
        m = numToString() + repeat.call(ZERO, f);
      }
    }
    if(f > 0){
      k = m.length;
      m = s + (k <= f ? '0.' + repeat.call(ZERO, f - k) + m : m.slice(0, k - f) + '.' + m.slice(k - f));
    } else {
      m = s + m;
    } return m;
  }
});
},{"./_a-number-value":39,"./_export":67,"./_fails":69,"./_string-repeat":136,"./_to-integer":141}],213:[function(require,module,exports){
'use strict';
var $export      = require('./_export')
  , $fails       = require('./_fails')
  , aNumberValue = require('./_a-number-value')
  , $toPrecision = 1..toPrecision;

$export($export.P + $export.F * ($fails(function(){
  // IE7-
  return $toPrecision.call(1, undefined) !== '1';
}) || !$fails(function(){
  // V8 ~ Android 4.3-
  $toPrecision.call({});
})), 'Number', {
  toPrecision: function toPrecision(precision){
    var that = aNumberValue(this, 'Number#toPrecision: incorrect invocation!');
    return precision === undefined ? $toPrecision.call(that) : $toPrecision.call(that, precision); 
  }
});
},{"./_a-number-value":39,"./_export":67,"./_fails":69}],214:[function(require,module,exports){
// 19.1.3.1 Object.assign(target, source)
var $export = require('./_export');

$export($export.S + $export.F, 'Object', {assign: require('./_object-assign')});
},{"./_export":67,"./_object-assign":100}],215:[function(require,module,exports){
var $export = require('./_export')
// 19.1.2.2 / 15.2.3.5 Object.create(O [, Properties])
$export($export.S, 'Object', {create: require('./_object-create')});
},{"./_export":67,"./_object-create":101}],216:[function(require,module,exports){
var $export = require('./_export');
// 19.1.2.3 / 15.2.3.7 Object.defineProperties(O, Properties)
$export($export.S + $export.F * !require('./_descriptors'), 'Object', {defineProperties: require('./_object-dps')});
},{"./_descriptors":63,"./_export":67,"./_object-dps":103}],217:[function(require,module,exports){
var $export = require('./_export');
// 19.1.2.4 / 15.2.3.6 Object.defineProperty(O, P, Attributes)
$export($export.S + $export.F * !require('./_descriptors'), 'Object', {defineProperty: require('./_object-dp').f});
},{"./_descriptors":63,"./_export":67,"./_object-dp":102}],218:[function(require,module,exports){
// 19.1.2.5 Object.freeze(O)
var isObject = require('./_is-object')
  , meta     = require('./_meta').onFreeze;

require('./_object-sap')('freeze', function($freeze){
  return function freeze(it){
    return $freeze && isObject(it) ? $freeze(meta(it)) : it;
  };
});
},{"./_is-object":84,"./_meta":97,"./_object-sap":113}],219:[function(require,module,exports){
// 19.1.2.6 Object.getOwnPropertyDescriptor(O, P)
var toIObject                 = require('./_to-iobject')
  , $getOwnPropertyDescriptor = require('./_object-gopd').f;

require('./_object-sap')('getOwnPropertyDescriptor', function(){
  return function getOwnPropertyDescriptor(it, key){
    return $getOwnPropertyDescriptor(toIObject(it), key);
  };
});
},{"./_object-gopd":105,"./_object-sap":113,"./_to-iobject":142}],220:[function(require,module,exports){
// 19.1.2.7 Object.getOwnPropertyNames(O)
require('./_object-sap')('getOwnPropertyNames', function(){
  return require('./_object-gopn-ext').f;
});
},{"./_object-gopn-ext":106,"./_object-sap":113}],221:[function(require,module,exports){
// 19.1.2.9 Object.getPrototypeOf(O)
var toObject        = require('./_to-object')
  , $getPrototypeOf = require('./_object-gpo');

require('./_object-sap')('getPrototypeOf', function(){
  return function getPrototypeOf(it){
    return $getPrototypeOf(toObject(it));
  };
});
},{"./_object-gpo":109,"./_object-sap":113,"./_to-object":144}],222:[function(require,module,exports){
// 19.1.2.11 Object.isExtensible(O)
var isObject = require('./_is-object');

require('./_object-sap')('isExtensible', function($isExtensible){
  return function isExtensible(it){
    return isObject(it) ? $isExtensible ? $isExtensible(it) : true : false;
  };
});
},{"./_is-object":84,"./_object-sap":113}],223:[function(require,module,exports){
// 19.1.2.12 Object.isFrozen(O)
var isObject = require('./_is-object');

require('./_object-sap')('isFrozen', function($isFrozen){
  return function isFrozen(it){
    return isObject(it) ? $isFrozen ? $isFrozen(it) : false : true;
  };
});
},{"./_is-object":84,"./_object-sap":113}],224:[function(require,module,exports){
// 19.1.2.13 Object.isSealed(O)
var isObject = require('./_is-object');

require('./_object-sap')('isSealed', function($isSealed){
  return function isSealed(it){
    return isObject(it) ? $isSealed ? $isSealed(it) : false : true;
  };
});
},{"./_is-object":84,"./_object-sap":113}],225:[function(require,module,exports){
// 19.1.3.10 Object.is(value1, value2)
var $export = require('./_export');
$export($export.S, 'Object', {is: require('./_same-value')});
},{"./_export":67,"./_same-value":124}],226:[function(require,module,exports){
// 19.1.2.14 Object.keys(O)
var toObject = require('./_to-object')
  , $keys    = require('./_object-keys');

require('./_object-sap')('keys', function(){
  return function keys(it){
    return $keys(toObject(it));
  };
});
},{"./_object-keys":111,"./_object-sap":113,"./_to-object":144}],227:[function(require,module,exports){
// 19.1.2.15 Object.preventExtensions(O)
var isObject = require('./_is-object')
  , meta     = require('./_meta').onFreeze;

require('./_object-sap')('preventExtensions', function($preventExtensions){
  return function preventExtensions(it){
    return $preventExtensions && isObject(it) ? $preventExtensions(meta(it)) : it;
  };
});
},{"./_is-object":84,"./_meta":97,"./_object-sap":113}],228:[function(require,module,exports){
// 19.1.2.17 Object.seal(O)
var isObject = require('./_is-object')
  , meta     = require('./_meta').onFreeze;

require('./_object-sap')('seal', function($seal){
  return function seal(it){
    return $seal && isObject(it) ? $seal(meta(it)) : it;
  };
});
},{"./_is-object":84,"./_meta":97,"./_object-sap":113}],229:[function(require,module,exports){
// 19.1.3.19 Object.setPrototypeOf(O, proto)
var $export = require('./_export');
$export($export.S, 'Object', {setPrototypeOf: require('./_set-proto').set});
},{"./_export":67,"./_set-proto":125}],230:[function(require,module,exports){
'use strict';
// 19.1.3.6 Object.prototype.toString()
var classof = require('./_classof')
  , test    = {};
test[require('./_wks')('toStringTag')] = 'z';
if(test + '' != '[object z]'){
  require('./_redefine')(Object.prototype, 'toString', function toString(){
    return '[object ' + classof(this) + ']';
  }, true);
}
},{"./_classof":52,"./_redefine":122,"./_wks":152}],231:[function(require,module,exports){
var $export     = require('./_export')
  , $parseFloat = require('./_parse-float');
// 18.2.4 parseFloat(string)
$export($export.G + $export.F * (parseFloat != $parseFloat), {parseFloat: $parseFloat});
},{"./_export":67,"./_parse-float":116}],232:[function(require,module,exports){
var $export   = require('./_export')
  , $parseInt = require('./_parse-int');
// 18.2.5 parseInt(string, radix)
$export($export.G + $export.F * (parseInt != $parseInt), {parseInt: $parseInt});
},{"./_export":67,"./_parse-int":117}],233:[function(require,module,exports){
'use strict';
var LIBRARY            = require('./_library')
  , global             = require('./_global')
  , ctx                = require('./_ctx')
  , classof            = require('./_classof')
  , $export            = require('./_export')
  , isObject           = require('./_is-object')
  , aFunction          = require('./_a-function')
  , anInstance         = require('./_an-instance')
  , forOf              = require('./_for-of')
  , speciesConstructor = require('./_species-constructor')
  , task               = require('./_task').set
  , microtask          = require('./_microtask')()
  , PROMISE            = 'Promise'
  , TypeError          = global.TypeError
  , process            = global.process
  , $Promise           = global[PROMISE]
  , process            = global.process
  , isNode             = classof(process) == 'process'
  , empty              = function(){ /* empty */ }
  , Internal, GenericPromiseCapability, Wrapper;

var USE_NATIVE = !!function(){
  try {
    // correct subclassing with @@species support
    var promise     = $Promise.resolve(1)
      , FakePromise = (promise.constructor = {})[require('./_wks')('species')] = function(exec){ exec(empty, empty); };
    // unhandled rejections tracking support, NodeJS Promise without it fails @@species test
    return (isNode || typeof PromiseRejectionEvent == 'function') && promise.then(empty) instanceof FakePromise;
  } catch(e){ /* empty */ }
}();

// helpers
var sameConstructor = function(a, b){
  // with library wrapper special case
  return a === b || a === $Promise && b === Wrapper;
};
var isThenable = function(it){
  var then;
  return isObject(it) && typeof (then = it.then) == 'function' ? then : false;
};
var newPromiseCapability = function(C){
  return sameConstructor($Promise, C)
    ? new PromiseCapability(C)
    : new GenericPromiseCapability(C);
};
var PromiseCapability = GenericPromiseCapability = function(C){
  var resolve, reject;
  this.promise = new C(function($$resolve, $$reject){
    if(resolve !== undefined || reject !== undefined)throw TypeError('Bad Promise constructor');
    resolve = $$resolve;
    reject  = $$reject;
  });
  this.resolve = aFunction(resolve);
  this.reject  = aFunction(reject);
};
var perform = function(exec){
  try {
    exec();
  } catch(e){
    return {error: e};
  }
};
var notify = function(promise, isReject){
  if(promise._n)return;
  promise._n = true;
  var chain = promise._c;
  microtask(function(){
    var value = promise._v
      , ok    = promise._s == 1
      , i     = 0;
    var run = function(reaction){
      var handler = ok ? reaction.ok : reaction.fail
        , resolve = reaction.resolve
        , reject  = reaction.reject
        , domain  = reaction.domain
        , result, then;
      try {
        if(handler){
          if(!ok){
            if(promise._h == 2)onHandleUnhandled(promise);
            promise._h = 1;
          }
          if(handler === true)result = value;
          else {
            if(domain)domain.enter();
            result = handler(value);
            if(domain)domain.exit();
          }
          if(result === reaction.promise){
            reject(TypeError('Promise-chain cycle'));
          } else if(then = isThenable(result)){
            then.call(result, resolve, reject);
          } else resolve(result);
        } else reject(value);
      } catch(e){
        reject(e);
      }
    };
    while(chain.length > i)run(chain[i++]); // variable length - can't use forEach
    promise._c = [];
    promise._n = false;
    if(isReject && !promise._h)onUnhandled(promise);
  });
};
var onUnhandled = function(promise){
  task.call(global, function(){
    var value = promise._v
      , abrupt, handler, console;
    if(isUnhandled(promise)){
      abrupt = perform(function(){
        if(isNode){
          process.emit('unhandledRejection', value, promise);
        } else if(handler = global.onunhandledrejection){
          handler({promise: promise, reason: value});
        } else if((console = global.console) && console.error){
          console.error('Unhandled promise rejection', value);
        }
      });
      // Browsers should not trigger `rejectionHandled` event if it was handled here, NodeJS - should
      promise._h = isNode || isUnhandled(promise) ? 2 : 1;
    } promise._a = undefined;
    if(abrupt)throw abrupt.error;
  });
};
var isUnhandled = function(promise){
  if(promise._h == 1)return false;
  var chain = promise._a || promise._c
    , i     = 0
    , reaction;
  while(chain.length > i){
    reaction = chain[i++];
    if(reaction.fail || !isUnhandled(reaction.promise))return false;
  } return true;
};
var onHandleUnhandled = function(promise){
  task.call(global, function(){
    var handler;
    if(isNode){
      process.emit('rejectionHandled', promise);
    } else if(handler = global.onrejectionhandled){
      handler({promise: promise, reason: promise._v});
    }
  });
};
var $reject = function(value){
  var promise = this;
  if(promise._d)return;
  promise._d = true;
  promise = promise._w || promise; // unwrap
  promise._v = value;
  promise._s = 2;
  if(!promise._a)promise._a = promise._c.slice();
  notify(promise, true);
};
var $resolve = function(value){
  var promise = this
    , then;
  if(promise._d)return;
  promise._d = true;
  promise = promise._w || promise; // unwrap
  try {
    if(promise === value)throw TypeError("Promise can't be resolved itself");
    if(then = isThenable(value)){
      microtask(function(){
        var wrapper = {_w: promise, _d: false}; // wrap
        try {
          then.call(value, ctx($resolve, wrapper, 1), ctx($reject, wrapper, 1));
        } catch(e){
          $reject.call(wrapper, e);
        }
      });
    } else {
      promise._v = value;
      promise._s = 1;
      notify(promise, false);
    }
  } catch(e){
    $reject.call({_w: promise, _d: false}, e); // wrap
  }
};

// constructor polyfill
if(!USE_NATIVE){
  // 25.4.3.1 Promise(executor)
  $Promise = function Promise(executor){
    anInstance(this, $Promise, PROMISE, '_h');
    aFunction(executor);
    Internal.call(this);
    try {
      executor(ctx($resolve, this, 1), ctx($reject, this, 1));
    } catch(err){
      $reject.call(this, err);
    }
  };
  Internal = function Promise(executor){
    this._c = [];             // <- awaiting reactions
    this._a = undefined;      // <- checked in isUnhandled reactions
    this._s = 0;              // <- state
    this._d = false;          // <- done
    this._v = undefined;      // <- value
    this._h = 0;              // <- rejection state, 0 - default, 1 - handled, 2 - unhandled
    this._n = false;          // <- notify
  };
  Internal.prototype = require('./_redefine-all')($Promise.prototype, {
    // 25.4.5.3 Promise.prototype.then(onFulfilled, onRejected)
    then: function then(onFulfilled, onRejected){
      var reaction    = newPromiseCapability(speciesConstructor(this, $Promise));
      reaction.ok     = typeof onFulfilled == 'function' ? onFulfilled : true;
      reaction.fail   = typeof onRejected == 'function' && onRejected;
      reaction.domain = isNode ? process.domain : undefined;
      this._c.push(reaction);
      if(this._a)this._a.push(reaction);
      if(this._s)notify(this, false);
      return reaction.promise;
    },
    // 25.4.5.1 Promise.prototype.catch(onRejected)
    'catch': function(onRejected){
      return this.then(undefined, onRejected);
    }
  });
  PromiseCapability = function(){
    var promise  = new Internal;
    this.promise = promise;
    this.resolve = ctx($resolve, promise, 1);
    this.reject  = ctx($reject, promise, 1);
  };
}

$export($export.G + $export.W + $export.F * !USE_NATIVE, {Promise: $Promise});
require('./_set-to-string-tag')($Promise, PROMISE);
require('./_set-species')(PROMISE);
Wrapper = require('./_core')[PROMISE];

// statics
$export($export.S + $export.F * !USE_NATIVE, PROMISE, {
  // 25.4.4.5 Promise.reject(r)
  reject: function reject(r){
    var capability = newPromiseCapability(this)
      , $$reject   = capability.reject;
    $$reject(r);
    return capability.promise;
  }
});
$export($export.S + $export.F * (LIBRARY || !USE_NATIVE), PROMISE, {
  // 25.4.4.6 Promise.resolve(x)
  resolve: function resolve(x){
    // instanceof instead of internal slot check because we should fix it without replacement native Promise core
    if(x instanceof $Promise && sameConstructor(x.constructor, this))return x;
    var capability = newPromiseCapability(this)
      , $$resolve  = capability.resolve;
    $$resolve(x);
    return capability.promise;
  }
});
$export($export.S + $export.F * !(USE_NATIVE && require('./_iter-detect')(function(iter){
  $Promise.all(iter)['catch'](empty);
})), PROMISE, {
  // 25.4.4.1 Promise.all(iterable)
  all: function all(iterable){
    var C          = this
      , capability = newPromiseCapability(C)
      , resolve    = capability.resolve
      , reject     = capability.reject;
    var abrupt = perform(function(){
      var values    = []
        , index     = 0
        , remaining = 1;
      forOf(iterable, false, function(promise){
        var $index        = index++
          , alreadyCalled = false;
        values.push(undefined);
        remaining++;
        C.resolve(promise).then(function(value){
          if(alreadyCalled)return;
          alreadyCalled  = true;
          values[$index] = value;
          --remaining || resolve(values);
        }, reject);
      });
      --remaining || resolve(values);
    });
    if(abrupt)reject(abrupt.error);
    return capability.promise;
  },
  // 25.4.4.4 Promise.race(iterable)
  race: function race(iterable){
    var C          = this
      , capability = newPromiseCapability(C)
      , reject     = capability.reject;
    var abrupt = perform(function(){
      forOf(iterable, false, function(promise){
        C.resolve(promise).then(capability.resolve, reject);
      });
    });
    if(abrupt)reject(abrupt.error);
    return capability.promise;
  }
});
},{"./_a-function":38,"./_an-instance":41,"./_classof":52,"./_core":58,"./_ctx":60,"./_export":67,"./_for-of":72,"./_global":73,"./_is-object":84,"./_iter-detect":89,"./_library":93,"./_microtask":99,"./_redefine-all":121,"./_set-species":126,"./_set-to-string-tag":127,"./_species-constructor":130,"./_task":139,"./_wks":152}],234:[function(require,module,exports){
// 26.1.1 Reflect.apply(target, thisArgument, argumentsList)
var $export   = require('./_export')
  , aFunction = require('./_a-function')
  , anObject  = require('./_an-object')
  , rApply    = (require('./_global').Reflect || {}).apply
  , fApply    = Function.apply;
// MS Edge argumentsList argument is optional
$export($export.S + $export.F * !require('./_fails')(function(){
  rApply(function(){});
}), 'Reflect', {
  apply: function apply(target, thisArgument, argumentsList){
    var T = aFunction(target)
      , L = anObject(argumentsList);
    return rApply ? rApply(T, thisArgument, L) : fApply.call(T, thisArgument, L);
  }
});
},{"./_a-function":38,"./_an-object":42,"./_export":67,"./_fails":69,"./_global":73}],235:[function(require,module,exports){
// 26.1.2 Reflect.construct(target, argumentsList [, newTarget])
var $export    = require('./_export')
  , create     = require('./_object-create')
  , aFunction  = require('./_a-function')
  , anObject   = require('./_an-object')
  , isObject   = require('./_is-object')
  , fails      = require('./_fails')
  , bind       = require('./_bind')
  , rConstruct = (require('./_global').Reflect || {}).construct;

// MS Edge supports only 2 arguments and argumentsList argument is optional
// FF Nightly sets third argument as `new.target`, but does not create `this` from it
var NEW_TARGET_BUG = fails(function(){
  function F(){}
  return !(rConstruct(function(){}, [], F) instanceof F);
});
var ARGS_BUG = !fails(function(){
  rConstruct(function(){});
});

$export($export.S + $export.F * (NEW_TARGET_BUG || ARGS_BUG), 'Reflect', {
  construct: function construct(Target, args /*, newTarget*/){
    aFunction(Target);
    anObject(args);
    var newTarget = arguments.length < 3 ? Target : aFunction(arguments[2]);
    if(ARGS_BUG && !NEW_TARGET_BUG)return rConstruct(Target, args, newTarget);
    if(Target == newTarget){
      // w/o altered newTarget, optimization for 0-4 arguments
      switch(args.length){
        case 0: return new Target;
        case 1: return new Target(args[0]);
        case 2: return new Target(args[0], args[1]);
        case 3: return new Target(args[0], args[1], args[2]);
        case 4: return new Target(args[0], args[1], args[2], args[3]);
      }
      // w/o altered newTarget, lot of arguments case
      var $args = [null];
      $args.push.apply($args, args);
      return new (bind.apply(Target, $args));
    }
    // with altered newTarget, not support built-in constructors
    var proto    = newTarget.prototype
      , instance = create(isObject(proto) ? proto : Object.prototype)
      , result   = Function.apply.call(Target, instance, args);
    return isObject(result) ? result : instance;
  }
});
},{"./_a-function":38,"./_an-object":42,"./_bind":51,"./_export":67,"./_fails":69,"./_global":73,"./_is-object":84,"./_object-create":101}],236:[function(require,module,exports){
// 26.1.3 Reflect.defineProperty(target, propertyKey, attributes)
var dP          = require('./_object-dp')
  , $export     = require('./_export')
  , anObject    = require('./_an-object')
  , toPrimitive = require('./_to-primitive');

// MS Edge has broken Reflect.defineProperty - throwing instead of returning false
$export($export.S + $export.F * require('./_fails')(function(){
  Reflect.defineProperty(dP.f({}, 1, {value: 1}), 1, {value: 2});
}), 'Reflect', {
  defineProperty: function defineProperty(target, propertyKey, attributes){
    anObject(target);
    propertyKey = toPrimitive(propertyKey, true);
    anObject(attributes);
    try {
      dP.f(target, propertyKey, attributes);
      return true;
    } catch(e){
      return false;
    }
  }
});
},{"./_an-object":42,"./_export":67,"./_fails":69,"./_object-dp":102,"./_to-primitive":145}],237:[function(require,module,exports){
// 26.1.4 Reflect.deleteProperty(target, propertyKey)
var $export  = require('./_export')
  , gOPD     = require('./_object-gopd').f
  , anObject = require('./_an-object');

$export($export.S, 'Reflect', {
  deleteProperty: function deleteProperty(target, propertyKey){
    var desc = gOPD(anObject(target), propertyKey);
    return desc && !desc.configurable ? false : delete target[propertyKey];
  }
});
},{"./_an-object":42,"./_export":67,"./_object-gopd":105}],238:[function(require,module,exports){
'use strict';
// 26.1.5 Reflect.enumerate(target)
var $export  = require('./_export')
  , anObject = require('./_an-object');
var Enumerate = function(iterated){
  this._t = anObject(iterated); // target
  this._i = 0;                  // next index
  var keys = this._k = []       // keys
    , key;
  for(key in iterated)keys.push(key);
};
require('./_iter-create')(Enumerate, 'Object', function(){
  var that = this
    , keys = that._k
    , key;
  do {
    if(that._i >= keys.length)return {value: undefined, done: true};
  } while(!((key = keys[that._i++]) in that._t));
  return {value: key, done: false};
});

$export($export.S, 'Reflect', {
  enumerate: function enumerate(target){
    return new Enumerate(target);
  }
});
},{"./_an-object":42,"./_export":67,"./_iter-create":87}],239:[function(require,module,exports){
// 26.1.7 Reflect.getOwnPropertyDescriptor(target, propertyKey)
var gOPD     = require('./_object-gopd')
  , $export  = require('./_export')
  , anObject = require('./_an-object');

$export($export.S, 'Reflect', {
  getOwnPropertyDescriptor: function getOwnPropertyDescriptor(target, propertyKey){
    return gOPD.f(anObject(target), propertyKey);
  }
});
},{"./_an-object":42,"./_export":67,"./_object-gopd":105}],240:[function(require,module,exports){
// 26.1.8 Reflect.getPrototypeOf(target)
var $export  = require('./_export')
  , getProto = require('./_object-gpo')
  , anObject = require('./_an-object');

$export($export.S, 'Reflect', {
  getPrototypeOf: function getPrototypeOf(target){
    return getProto(anObject(target));
  }
});
},{"./_an-object":42,"./_export":67,"./_object-gpo":109}],241:[function(require,module,exports){
// 26.1.6 Reflect.get(target, propertyKey [, receiver])
var gOPD           = require('./_object-gopd')
  , getPrototypeOf = require('./_object-gpo')
  , has            = require('./_has')
  , $export        = require('./_export')
  , isObject       = require('./_is-object')
  , anObject       = require('./_an-object');

function get(target, propertyKey/*, receiver*/){
  var receiver = arguments.length < 3 ? target : arguments[2]
    , desc, proto;
  if(anObject(target) === receiver)return target[propertyKey];
  if(desc = gOPD.f(target, propertyKey))return has(desc, 'value')
    ? desc.value
    : desc.get !== undefined
      ? desc.get.call(receiver)
      : undefined;
  if(isObject(proto = getPrototypeOf(target)))return get(proto, propertyKey, receiver);
}

$export($export.S, 'Reflect', {get: get});
},{"./_an-object":42,"./_export":67,"./_has":74,"./_is-object":84,"./_object-gopd":105,"./_object-gpo":109}],242:[function(require,module,exports){
// 26.1.9 Reflect.has(target, propertyKey)
var $export = require('./_export');

$export($export.S, 'Reflect', {
  has: function has(target, propertyKey){
    return propertyKey in target;
  }
});
},{"./_export":67}],243:[function(require,module,exports){
// 26.1.10 Reflect.isExtensible(target)
var $export       = require('./_export')
  , anObject      = require('./_an-object')
  , $isExtensible = Object.isExtensible;

$export($export.S, 'Reflect', {
  isExtensible: function isExtensible(target){
    anObject(target);
    return $isExtensible ? $isExtensible(target) : true;
  }
});
},{"./_an-object":42,"./_export":67}],244:[function(require,module,exports){
// 26.1.11 Reflect.ownKeys(target)
var $export = require('./_export');

$export($export.S, 'Reflect', {ownKeys: require('./_own-keys')});
},{"./_export":67,"./_own-keys":115}],245:[function(require,module,exports){
// 26.1.12 Reflect.preventExtensions(target)
var $export            = require('./_export')
  , anObject           = require('./_an-object')
  , $preventExtensions = Object.preventExtensions;

$export($export.S, 'Reflect', {
  preventExtensions: function preventExtensions(target){
    anObject(target);
    try {
      if($preventExtensions)$preventExtensions(target);
      return true;
    } catch(e){
      return false;
    }
  }
});
},{"./_an-object":42,"./_export":67}],246:[function(require,module,exports){
// 26.1.14 Reflect.setPrototypeOf(target, proto)
var $export  = require('./_export')
  , setProto = require('./_set-proto');

if(setProto)$export($export.S, 'Reflect', {
  setPrototypeOf: function setPrototypeOf(target, proto){
    setProto.check(target, proto);
    try {
      setProto.set(target, proto);
      return true;
    } catch(e){
      return false;
    }
  }
});
},{"./_export":67,"./_set-proto":125}],247:[function(require,module,exports){
// 26.1.13 Reflect.set(target, propertyKey, V [, receiver])
var dP             = require('./_object-dp')
  , gOPD           = require('./_object-gopd')
  , getPrototypeOf = require('./_object-gpo')
  , has            = require('./_has')
  , $export        = require('./_export')
  , createDesc     = require('./_property-desc')
  , anObject       = require('./_an-object')
  , isObject       = require('./_is-object');

function set(target, propertyKey, V/*, receiver*/){
  var receiver = arguments.length < 4 ? target : arguments[3]
    , ownDesc  = gOPD.f(anObject(target), propertyKey)
    , existingDescriptor, proto;
  if(!ownDesc){
    if(isObject(proto = getPrototypeOf(target))){
      return set(proto, propertyKey, V, receiver);
    }
    ownDesc = createDesc(0);
  }
  if(has(ownDesc, 'value')){
    if(ownDesc.writable === false || !isObject(receiver))return false;
    existingDescriptor = gOPD.f(receiver, propertyKey) || createDesc(0);
    existingDescriptor.value = V;
    dP.f(receiver, propertyKey, existingDescriptor);
    return true;
  }
  return ownDesc.set === undefined ? false : (ownDesc.set.call(receiver, V), true);
}

$export($export.S, 'Reflect', {set: set});
},{"./_an-object":42,"./_export":67,"./_has":74,"./_is-object":84,"./_object-dp":102,"./_object-gopd":105,"./_object-gpo":109,"./_property-desc":120}],248:[function(require,module,exports){
var global            = require('./_global')
  , inheritIfRequired = require('./_inherit-if-required')
  , dP                = require('./_object-dp').f
  , gOPN              = require('./_object-gopn').f
  , isRegExp          = require('./_is-regexp')
  , $flags            = require('./_flags')
  , $RegExp           = global.RegExp
  , Base              = $RegExp
  , proto             = $RegExp.prototype
  , re1               = /a/g
  , re2               = /a/g
  // "new" creates a new object, old webkit buggy here
  , CORRECT_NEW       = new $RegExp(re1) !== re1;

if(require('./_descriptors') && (!CORRECT_NEW || require('./_fails')(function(){
  re2[require('./_wks')('match')] = false;
  // RegExp constructor can alter flags and IsRegExp works correct with @@match
  return $RegExp(re1) != re1 || $RegExp(re2) == re2 || $RegExp(re1, 'i') != '/a/i';
}))){
  $RegExp = function RegExp(p, f){
    var tiRE = this instanceof $RegExp
      , piRE = isRegExp(p)
      , fiU  = f === undefined;
    return !tiRE && piRE && p.constructor === $RegExp && fiU ? p
      : inheritIfRequired(CORRECT_NEW
        ? new Base(piRE && !fiU ? p.source : p, f)
        : Base((piRE = p instanceof $RegExp) ? p.source : p, piRE && fiU ? $flags.call(p) : f)
      , tiRE ? this : proto, $RegExp);
  };
  var proxy = function(key){
    key in $RegExp || dP($RegExp, key, {
      configurable: true,
      get: function(){ return Base[key]; },
      set: function(it){ Base[key] = it; }
    });
  };
  for(var keys = gOPN(Base), i = 0; keys.length > i; )proxy(keys[i++]);
  proto.constructor = $RegExp;
  $RegExp.prototype = proto;
  require('./_redefine')(global, 'RegExp', $RegExp);
}

require('./_set-species')('RegExp');
},{"./_descriptors":63,"./_fails":69,"./_flags":71,"./_global":73,"./_inherit-if-required":78,"./_is-regexp":85,"./_object-dp":102,"./_object-gopn":107,"./_redefine":122,"./_set-species":126,"./_wks":152}],249:[function(require,module,exports){
// 21.2.5.3 get RegExp.prototype.flags()
if(require('./_descriptors') && /./g.flags != 'g')require('./_object-dp').f(RegExp.prototype, 'flags', {
  configurable: true,
  get: require('./_flags')
});
},{"./_descriptors":63,"./_flags":71,"./_object-dp":102}],250:[function(require,module,exports){
// @@match logic
require('./_fix-re-wks')('match', 1, function(defined, MATCH, $match){
  // 21.1.3.11 String.prototype.match(regexp)
  return [function match(regexp){
    'use strict';
    var O  = defined(this)
      , fn = regexp == undefined ? undefined : regexp[MATCH];
    return fn !== undefined ? fn.call(regexp, O) : new RegExp(regexp)[MATCH](String(O));
  }, $match];
});
},{"./_fix-re-wks":70}],251:[function(require,module,exports){
// @@replace logic
require('./_fix-re-wks')('replace', 2, function(defined, REPLACE, $replace){
  // 21.1.3.14 String.prototype.replace(searchValue, replaceValue)
  return [function replace(searchValue, replaceValue){
    'use strict';
    var O  = defined(this)
      , fn = searchValue == undefined ? undefined : searchValue[REPLACE];
    return fn !== undefined
      ? fn.call(searchValue, O, replaceValue)
      : $replace.call(String(O), searchValue, replaceValue);
  }, $replace];
});
},{"./_fix-re-wks":70}],252:[function(require,module,exports){
// @@search logic
require('./_fix-re-wks')('search', 1, function(defined, SEARCH, $search){
  // 21.1.3.15 String.prototype.search(regexp)
  return [function search(regexp){
    'use strict';
    var O  = defined(this)
      , fn = regexp == undefined ? undefined : regexp[SEARCH];
    return fn !== undefined ? fn.call(regexp, O) : new RegExp(regexp)[SEARCH](String(O));
  }, $search];
});
},{"./_fix-re-wks":70}],253:[function(require,module,exports){
// @@split logic
require('./_fix-re-wks')('split', 2, function(defined, SPLIT, $split){
  'use strict';
  var isRegExp   = require('./_is-regexp')
    , _split     = $split
    , $push      = [].push
    , $SPLIT     = 'split'
    , LENGTH     = 'length'
    , LAST_INDEX = 'lastIndex';
  if(
    'abbc'[$SPLIT](/(b)*/)[1] == 'c' ||
    'test'[$SPLIT](/(?:)/, -1)[LENGTH] != 4 ||
    'ab'[$SPLIT](/(?:ab)*/)[LENGTH] != 2 ||
    '.'[$SPLIT](/(.?)(.?)/)[LENGTH] != 4 ||
    '.'[$SPLIT](/()()/)[LENGTH] > 1 ||
    ''[$SPLIT](/.?/)[LENGTH]
  ){
    var NPCG = /()??/.exec('')[1] === undefined; // nonparticipating capturing group
    // based on es5-shim implementation, need to rework it
    $split = function(separator, limit){
      var string = String(this);
      if(separator === undefined && limit === 0)return [];
      // If `separator` is not a regex, use native split
      if(!isRegExp(separator))return _split.call(string, separator, limit);
      var output = [];
      var flags = (separator.ignoreCase ? 'i' : '') +
                  (separator.multiline ? 'm' : '') +
                  (separator.unicode ? 'u' : '') +
                  (separator.sticky ? 'y' : '');
      var lastLastIndex = 0;
      var splitLimit = limit === undefined ? 4294967295 : limit >>> 0;
      // Make `global` and avoid `lastIndex` issues by working with a copy
      var separatorCopy = new RegExp(separator.source, flags + 'g');
      var separator2, match, lastIndex, lastLength, i;
      // Doesn't need flags gy, but they don't hurt
      if(!NPCG)separator2 = new RegExp('^' + separatorCopy.source + '$(?!\\s)', flags);
      while(match = separatorCopy.exec(string)){
        // `separatorCopy.lastIndex` is not reliable cross-browser
        lastIndex = match.index + match[0][LENGTH];
        if(lastIndex > lastLastIndex){
          output.push(string.slice(lastLastIndex, match.index));
          // Fix browsers whose `exec` methods don't consistently return `undefined` for NPCG
          if(!NPCG && match[LENGTH] > 1)match[0].replace(separator2, function(){
            for(i = 1; i < arguments[LENGTH] - 2; i++)if(arguments[i] === undefined)match[i] = undefined;
          });
          if(match[LENGTH] > 1 && match.index < string[LENGTH])$push.apply(output, match.slice(1));
          lastLength = match[0][LENGTH];
          lastLastIndex = lastIndex;
          if(output[LENGTH] >= splitLimit)break;
        }
        if(separatorCopy[LAST_INDEX] === match.index)separatorCopy[LAST_INDEX]++; // Avoid an infinite loop
      }
      if(lastLastIndex === string[LENGTH]){
        if(lastLength || !separatorCopy.test(''))output.push('');
      } else output.push(string.slice(lastLastIndex));
      return output[LENGTH] > splitLimit ? output.slice(0, splitLimit) : output;
    };
  // Chakra, V8
  } else if('0'[$SPLIT](undefined, 0)[LENGTH]){
    $split = function(separator, limit){
      return separator === undefined && limit === 0 ? [] : _split.call(this, separator, limit);
    };
  }
  // 21.1.3.17 String.prototype.split(separator, limit)
  return [function split(separator, limit){
    var O  = defined(this)
      , fn = separator == undefined ? undefined : separator[SPLIT];
    return fn !== undefined ? fn.call(separator, O, limit) : $split.call(String(O), separator, limit);
  }, $split];
});
},{"./_fix-re-wks":70,"./_is-regexp":85}],254:[function(require,module,exports){
'use strict';
require('./es6.regexp.flags');
var anObject    = require('./_an-object')
  , $flags      = require('./_flags')
  , DESCRIPTORS = require('./_descriptors')
  , TO_STRING   = 'toString'
  , $toString   = /./[TO_STRING];

var define = function(fn){
  require('./_redefine')(RegExp.prototype, TO_STRING, fn, true);
};

// 21.2.5.14 RegExp.prototype.toString()
if(require('./_fails')(function(){ return $toString.call({source: 'a', flags: 'b'}) != '/a/b'; })){
  define(function toString(){
    var R = anObject(this);
    return '/'.concat(R.source, '/',
      'flags' in R ? R.flags : !DESCRIPTORS && R instanceof RegExp ? $flags.call(R) : undefined);
  });
// FF44- RegExp#toString has a wrong name
} else if($toString.name != TO_STRING){
  define(function toString(){
    return $toString.call(this);
  });
}
},{"./_an-object":42,"./_descriptors":63,"./_fails":69,"./_flags":71,"./_redefine":122,"./es6.regexp.flags":249}],255:[function(require,module,exports){
'use strict';
var strong = require('./_collection-strong');

// 23.2 Set Objects
module.exports = require('./_collection')('Set', function(get){
  return function Set(){ return get(this, arguments.length > 0 ? arguments[0] : undefined); };
}, {
  // 23.2.3.1 Set.prototype.add(value)
  add: function add(value){
    return strong.def(this, value = value === 0 ? 0 : value, value);
  }
}, strong);
},{"./_collection":57,"./_collection-strong":54}],256:[function(require,module,exports){
'use strict';
// B.2.3.2 String.prototype.anchor(name)
require('./_string-html')('anchor', function(createHTML){
  return function anchor(name){
    return createHTML(this, 'a', 'name', name);
  }
});
},{"./_string-html":134}],257:[function(require,module,exports){
'use strict';
// B.2.3.3 String.prototype.big()
require('./_string-html')('big', function(createHTML){
  return function big(){
    return createHTML(this, 'big', '', '');
  }
});
},{"./_string-html":134}],258:[function(require,module,exports){
'use strict';
// B.2.3.4 String.prototype.blink()
require('./_string-html')('blink', function(createHTML){
  return function blink(){
    return createHTML(this, 'blink', '', '');
  }
});
},{"./_string-html":134}],259:[function(require,module,exports){
'use strict';
// B.2.3.5 String.prototype.bold()
require('./_string-html')('bold', function(createHTML){
  return function bold(){
    return createHTML(this, 'b', '', '');
  }
});
},{"./_string-html":134}],260:[function(require,module,exports){
'use strict';
var $export = require('./_export')
  , $at     = require('./_string-at')(false);
$export($export.P, 'String', {
  // 21.1.3.3 String.prototype.codePointAt(pos)
  codePointAt: function codePointAt(pos){
    return $at(this, pos);
  }
});
},{"./_export":67,"./_string-at":132}],261:[function(require,module,exports){
// 21.1.3.6 String.prototype.endsWith(searchString [, endPosition])
'use strict';
var $export   = require('./_export')
  , toLength  = require('./_to-length')
  , context   = require('./_string-context')
  , ENDS_WITH = 'endsWith'
  , $endsWith = ''[ENDS_WITH];

$export($export.P + $export.F * require('./_fails-is-regexp')(ENDS_WITH), 'String', {
  endsWith: function endsWith(searchString /*, endPosition = @length */){
    var that = context(this, searchString, ENDS_WITH)
      , endPosition = arguments.length > 1 ? arguments[1] : undefined
      , len    = toLength(that.length)
      , end    = endPosition === undefined ? len : Math.min(toLength(endPosition), len)
      , search = String(searchString);
    return $endsWith
      ? $endsWith.call(that, search, end)
      : that.slice(end - search.length, end) === search;
  }
});
},{"./_export":67,"./_fails-is-regexp":68,"./_string-context":133,"./_to-length":143}],262:[function(require,module,exports){
'use strict';
// B.2.3.6 String.prototype.fixed()
require('./_string-html')('fixed', function(createHTML){
  return function fixed(){
    return createHTML(this, 'tt', '', '');
  }
});
},{"./_string-html":134}],263:[function(require,module,exports){
'use strict';
// B.2.3.7 String.prototype.fontcolor(color)
require('./_string-html')('fontcolor', function(createHTML){
  return function fontcolor(color){
    return createHTML(this, 'font', 'color', color);
  }
});
},{"./_string-html":134}],264:[function(require,module,exports){
'use strict';
// B.2.3.8 String.prototype.fontsize(size)
require('./_string-html')('fontsize', function(createHTML){
  return function fontsize(size){
    return createHTML(this, 'font', 'size', size);
  }
});
},{"./_string-html":134}],265:[function(require,module,exports){
var $export        = require('./_export')
  , toIndex        = require('./_to-index')
  , fromCharCode   = String.fromCharCode
  , $fromCodePoint = String.fromCodePoint;

// length should be 1, old FF problem
$export($export.S + $export.F * (!!$fromCodePoint && $fromCodePoint.length != 1), 'String', {
  // 21.1.2.2 String.fromCodePoint(...codePoints)
  fromCodePoint: function fromCodePoint(x){ // eslint-disable-line no-unused-vars
    var res  = []
      , aLen = arguments.length
      , i    = 0
      , code;
    while(aLen > i){
      code = +arguments[i++];
      if(toIndex(code, 0x10ffff) !== code)throw RangeError(code + ' is not a valid code point');
      res.push(code < 0x10000
        ? fromCharCode(code)
        : fromCharCode(((code -= 0x10000) >> 10) + 0xd800, code % 0x400 + 0xdc00)
      );
    } return res.join('');
  }
});
},{"./_export":67,"./_to-index":140}],266:[function(require,module,exports){
// 21.1.3.7 String.prototype.includes(searchString, position = 0)
'use strict';
var $export  = require('./_export')
  , context  = require('./_string-context')
  , INCLUDES = 'includes';

$export($export.P + $export.F * require('./_fails-is-regexp')(INCLUDES), 'String', {
  includes: function includes(searchString /*, position = 0 */){
    return !!~context(this, searchString, INCLUDES)
      .indexOf(searchString, arguments.length > 1 ? arguments[1] : undefined);
  }
});
},{"./_export":67,"./_fails-is-regexp":68,"./_string-context":133}],267:[function(require,module,exports){
'use strict';
// B.2.3.9 String.prototype.italics()
require('./_string-html')('italics', function(createHTML){
  return function italics(){
    return createHTML(this, 'i', '', '');
  }
});
},{"./_string-html":134}],268:[function(require,module,exports){
'use strict';
var $at  = require('./_string-at')(true);

// 21.1.3.27 String.prototype[@@iterator]()
require('./_iter-define')(String, 'String', function(iterated){
  this._t = String(iterated); // target
  this._i = 0;                // next index
// 21.1.5.2.1 %StringIteratorPrototype%.next()
}, function(){
  var O     = this._t
    , index = this._i
    , point;
  if(index >= O.length)return {value: undefined, done: true};
  point = $at(O, index);
  this._i += point.length;
  return {value: point, done: false};
});
},{"./_iter-define":88,"./_string-at":132}],269:[function(require,module,exports){
'use strict';
// B.2.3.10 String.prototype.link(url)
require('./_string-html')('link', function(createHTML){
  return function link(url){
    return createHTML(this, 'a', 'href', url);
  }
});
},{"./_string-html":134}],270:[function(require,module,exports){
var $export   = require('./_export')
  , toIObject = require('./_to-iobject')
  , toLength  = require('./_to-length');

$export($export.S, 'String', {
  // 21.1.2.4 String.raw(callSite, ...substitutions)
  raw: function raw(callSite){
    var tpl  = toIObject(callSite.raw)
      , len  = toLength(tpl.length)
      , aLen = arguments.length
      , res  = []
      , i    = 0;
    while(len > i){
      res.push(String(tpl[i++]));
      if(i < aLen)res.push(String(arguments[i]));
    } return res.join('');
  }
});
},{"./_export":67,"./_to-iobject":142,"./_to-length":143}],271:[function(require,module,exports){
var $export = require('./_export');

$export($export.P, 'String', {
  // 21.1.3.13 String.prototype.repeat(count)
  repeat: require('./_string-repeat')
});
},{"./_export":67,"./_string-repeat":136}],272:[function(require,module,exports){
'use strict';
// B.2.3.11 String.prototype.small()
require('./_string-html')('small', function(createHTML){
  return function small(){
    return createHTML(this, 'small', '', '');
  }
});
},{"./_string-html":134}],273:[function(require,module,exports){
// 21.1.3.18 String.prototype.startsWith(searchString [, position ])
'use strict';
var $export     = require('./_export')
  , toLength    = require('./_to-length')
  , context     = require('./_string-context')
  , STARTS_WITH = 'startsWith'
  , $startsWith = ''[STARTS_WITH];

$export($export.P + $export.F * require('./_fails-is-regexp')(STARTS_WITH), 'String', {
  startsWith: function startsWith(searchString /*, position = 0 */){
    var that   = context(this, searchString, STARTS_WITH)
      , index  = toLength(Math.min(arguments.length > 1 ? arguments[1] : undefined, that.length))
      , search = String(searchString);
    return $startsWith
      ? $startsWith.call(that, search, index)
      : that.slice(index, index + search.length) === search;
  }
});
},{"./_export":67,"./_fails-is-regexp":68,"./_string-context":133,"./_to-length":143}],274:[function(require,module,exports){
'use strict';
// B.2.3.12 String.prototype.strike()
require('./_string-html')('strike', function(createHTML){
  return function strike(){
    return createHTML(this, 'strike', '', '');
  }
});
},{"./_string-html":134}],275:[function(require,module,exports){
'use strict';
// B.2.3.13 String.prototype.sub()
require('./_string-html')('sub', function(createHTML){
  return function sub(){
    return createHTML(this, 'sub', '', '');
  }
});
},{"./_string-html":134}],276:[function(require,module,exports){
'use strict';
// B.2.3.14 String.prototype.sup()
require('./_string-html')('sup', function(createHTML){
  return function sup(){
    return createHTML(this, 'sup', '', '');
  }
});
},{"./_string-html":134}],277:[function(require,module,exports){
'use strict';
// 21.1.3.25 String.prototype.trim()
require('./_string-trim')('trim', function($trim){
  return function trim(){
    return $trim(this, 3);
  };
});
},{"./_string-trim":137}],278:[function(require,module,exports){
'use strict';
// ECMAScript 6 symbols shim
var global         = require('./_global')
  , has            = require('./_has')
  , DESCRIPTORS    = require('./_descriptors')
  , $export        = require('./_export')
  , redefine       = require('./_redefine')
  , META           = require('./_meta').KEY
  , $fails         = require('./_fails')
  , shared         = require('./_shared')
  , setToStringTag = require('./_set-to-string-tag')
  , uid            = require('./_uid')
  , wks            = require('./_wks')
  , wksExt         = require('./_wks-ext')
  , wksDefine      = require('./_wks-define')
  , keyOf          = require('./_keyof')
  , enumKeys       = require('./_enum-keys')
  , isArray        = require('./_is-array')
  , anObject       = require('./_an-object')
  , toIObject      = require('./_to-iobject')
  , toPrimitive    = require('./_to-primitive')
  , createDesc     = require('./_property-desc')
  , _create        = require('./_object-create')
  , gOPNExt        = require('./_object-gopn-ext')
  , $GOPD          = require('./_object-gopd')
  , $DP            = require('./_object-dp')
  , $keys          = require('./_object-keys')
  , gOPD           = $GOPD.f
  , dP             = $DP.f
  , gOPN           = gOPNExt.f
  , $Symbol        = global.Symbol
  , $JSON          = global.JSON
  , _stringify     = $JSON && $JSON.stringify
  , PROTOTYPE      = 'prototype'
  , HIDDEN         = wks('_hidden')
  , TO_PRIMITIVE   = wks('toPrimitive')
  , isEnum         = {}.propertyIsEnumerable
  , SymbolRegistry = shared('symbol-registry')
  , AllSymbols     = shared('symbols')
  , OPSymbols      = shared('op-symbols')
  , ObjectProto    = Object[PROTOTYPE]
  , USE_NATIVE     = typeof $Symbol == 'function'
  , QObject        = global.QObject;
// Don't use setters in Qt Script, https://github.com/zloirock/core-js/issues/173
var setter = !QObject || !QObject[PROTOTYPE] || !QObject[PROTOTYPE].findChild;

// fallback for old Android, https://code.google.com/p/v8/issues/detail?id=687
var setSymbolDesc = DESCRIPTORS && $fails(function(){
  return _create(dP({}, 'a', {
    get: function(){ return dP(this, 'a', {value: 7}).a; }
  })).a != 7;
}) ? function(it, key, D){
  var protoDesc = gOPD(ObjectProto, key);
  if(protoDesc)delete ObjectProto[key];
  dP(it, key, D);
  if(protoDesc && it !== ObjectProto)dP(ObjectProto, key, protoDesc);
} : dP;

var wrap = function(tag){
  var sym = AllSymbols[tag] = _create($Symbol[PROTOTYPE]);
  sym._k = tag;
  return sym;
};

var isSymbol = USE_NATIVE && typeof $Symbol.iterator == 'symbol' ? function(it){
  return typeof it == 'symbol';
} : function(it){
  return it instanceof $Symbol;
};

var $defineProperty = function defineProperty(it, key, D){
  if(it === ObjectProto)$defineProperty(OPSymbols, key, D);
  anObject(it);
  key = toPrimitive(key, true);
  anObject(D);
  if(has(AllSymbols, key)){
    if(!D.enumerable){
      if(!has(it, HIDDEN))dP(it, HIDDEN, createDesc(1, {}));
      it[HIDDEN][key] = true;
    } else {
      if(has(it, HIDDEN) && it[HIDDEN][key])it[HIDDEN][key] = false;
      D = _create(D, {enumerable: createDesc(0, false)});
    } return setSymbolDesc(it, key, D);
  } return dP(it, key, D);
};
var $defineProperties = function defineProperties(it, P){
  anObject(it);
  var keys = enumKeys(P = toIObject(P))
    , i    = 0
    , l = keys.length
    , key;
  while(l > i)$defineProperty(it, key = keys[i++], P[key]);
  return it;
};
var $create = function create(it, P){
  return P === undefined ? _create(it) : $defineProperties(_create(it), P);
};
var $propertyIsEnumerable = function propertyIsEnumerable(key){
  var E = isEnum.call(this, key = toPrimitive(key, true));
  if(this === ObjectProto && has(AllSymbols, key) && !has(OPSymbols, key))return false;
  return E || !has(this, key) || !has(AllSymbols, key) || has(this, HIDDEN) && this[HIDDEN][key] ? E : true;
};
var $getOwnPropertyDescriptor = function getOwnPropertyDescriptor(it, key){
  it  = toIObject(it);
  key = toPrimitive(key, true);
  if(it === ObjectProto && has(AllSymbols, key) && !has(OPSymbols, key))return;
  var D = gOPD(it, key);
  if(D && has(AllSymbols, key) && !(has(it, HIDDEN) && it[HIDDEN][key]))D.enumerable = true;
  return D;
};
var $getOwnPropertyNames = function getOwnPropertyNames(it){
  var names  = gOPN(toIObject(it))
    , result = []
    , i      = 0
    , key;
  while(names.length > i){
    if(!has(AllSymbols, key = names[i++]) && key != HIDDEN && key != META)result.push(key);
  } return result;
};
var $getOwnPropertySymbols = function getOwnPropertySymbols(it){
  var IS_OP  = it === ObjectProto
    , names  = gOPN(IS_OP ? OPSymbols : toIObject(it))
    , result = []
    , i      = 0
    , key;
  while(names.length > i){
    if(has(AllSymbols, key = names[i++]) && (IS_OP ? has(ObjectProto, key) : true))result.push(AllSymbols[key]);
  } return result;
};

// 19.4.1.1 Symbol([description])
if(!USE_NATIVE){
  $Symbol = function Symbol(){
    if(this instanceof $Symbol)throw TypeError('Symbol is not a constructor!');
    var tag = uid(arguments.length > 0 ? arguments[0] : undefined);
    var $set = function(value){
      if(this === ObjectProto)$set.call(OPSymbols, value);
      if(has(this, HIDDEN) && has(this[HIDDEN], tag))this[HIDDEN][tag] = false;
      setSymbolDesc(this, tag, createDesc(1, value));
    };
    if(DESCRIPTORS && setter)setSymbolDesc(ObjectProto, tag, {configurable: true, set: $set});
    return wrap(tag);
  };
  redefine($Symbol[PROTOTYPE], 'toString', function toString(){
    return this._k;
  });

  $GOPD.f = $getOwnPropertyDescriptor;
  $DP.f   = $defineProperty;
  require('./_object-gopn').f = gOPNExt.f = $getOwnPropertyNames;
  require('./_object-pie').f  = $propertyIsEnumerable;
  require('./_object-gops').f = $getOwnPropertySymbols;

  if(DESCRIPTORS && !require('./_library')){
    redefine(ObjectProto, 'propertyIsEnumerable', $propertyIsEnumerable, true);
  }

  wksExt.f = function(name){
    return wrap(wks(name));
  }
}

$export($export.G + $export.W + $export.F * !USE_NATIVE, {Symbol: $Symbol});

for(var symbols = (
  // 19.4.2.2, 19.4.2.3, 19.4.2.4, 19.4.2.6, 19.4.2.8, 19.4.2.9, 19.4.2.10, 19.4.2.11, 19.4.2.12, 19.4.2.13, 19.4.2.14
  'hasInstance,isConcatSpreadable,iterator,match,replace,search,species,split,toPrimitive,toStringTag,unscopables'
).split(','), i = 0; symbols.length > i; )wks(symbols[i++]);

for(var symbols = $keys(wks.store), i = 0; symbols.length > i; )wksDefine(symbols[i++]);

$export($export.S + $export.F * !USE_NATIVE, 'Symbol', {
  // 19.4.2.1 Symbol.for(key)
  'for': function(key){
    return has(SymbolRegistry, key += '')
      ? SymbolRegistry[key]
      : SymbolRegistry[key] = $Symbol(key);
  },
  // 19.4.2.5 Symbol.keyFor(sym)
  keyFor: function keyFor(key){
    if(isSymbol(key))return keyOf(SymbolRegistry, key);
    throw TypeError(key + ' is not a symbol!');
  },
  useSetter: function(){ setter = true; },
  useSimple: function(){ setter = false; }
});

$export($export.S + $export.F * !USE_NATIVE, 'Object', {
  // 19.1.2.2 Object.create(O [, Properties])
  create: $create,
  // 19.1.2.4 Object.defineProperty(O, P, Attributes)
  defineProperty: $defineProperty,
  // 19.1.2.3 Object.defineProperties(O, Properties)
  defineProperties: $defineProperties,
  // 19.1.2.6 Object.getOwnPropertyDescriptor(O, P)
  getOwnPropertyDescriptor: $getOwnPropertyDescriptor,
  // 19.1.2.7 Object.getOwnPropertyNames(O)
  getOwnPropertyNames: $getOwnPropertyNames,
  // 19.1.2.8 Object.getOwnPropertySymbols(O)
  getOwnPropertySymbols: $getOwnPropertySymbols
});

// 24.3.2 JSON.stringify(value [, replacer [, space]])
$JSON && $export($export.S + $export.F * (!USE_NATIVE || $fails(function(){
  var S = $Symbol();
  // MS Edge converts symbol values to JSON as {}
  // WebKit converts symbol values to JSON as null
  // V8 throws on boxed symbols
  return _stringify([S]) != '[null]' || _stringify({a: S}) != '{}' || _stringify(Object(S)) != '{}';
})), 'JSON', {
  stringify: function stringify(it){
    if(it === undefined || isSymbol(it))return; // IE8 returns string on undefined
    var args = [it]
      , i    = 1
      , replacer, $replacer;
    while(arguments.length > i)args.push(arguments[i++]);
    replacer = args[1];
    if(typeof replacer == 'function')$replacer = replacer;
    if($replacer || !isArray(replacer))replacer = function(key, value){
      if($replacer)value = $replacer.call(this, key, value);
      if(!isSymbol(value))return value;
    };
    args[1] = replacer;
    return _stringify.apply($JSON, args);
  }
});

// 19.4.3.4 Symbol.prototype[@@toPrimitive](hint)
$Symbol[PROTOTYPE][TO_PRIMITIVE] || require('./_hide')($Symbol[PROTOTYPE], TO_PRIMITIVE, $Symbol[PROTOTYPE].valueOf);
// 19.4.3.5 Symbol.prototype[@@toStringTag]
setToStringTag($Symbol, 'Symbol');
// 20.2.1.9 Math[@@toStringTag]
setToStringTag(Math, 'Math', true);
// 24.3.3 JSON[@@toStringTag]
setToStringTag(global.JSON, 'JSON', true);
},{"./_an-object":42,"./_descriptors":63,"./_enum-keys":66,"./_export":67,"./_fails":69,"./_global":73,"./_has":74,"./_hide":75,"./_is-array":82,"./_keyof":92,"./_library":93,"./_meta":97,"./_object-create":101,"./_object-dp":102,"./_object-gopd":105,"./_object-gopn":107,"./_object-gopn-ext":106,"./_object-gops":108,"./_object-keys":111,"./_object-pie":112,"./_property-desc":120,"./_redefine":122,"./_set-to-string-tag":127,"./_shared":129,"./_to-iobject":142,"./_to-primitive":145,"./_uid":149,"./_wks":152,"./_wks-define":150,"./_wks-ext":151}],279:[function(require,module,exports){
'use strict';
var $export      = require('./_export')
  , $typed       = require('./_typed')
  , buffer       = require('./_typed-buffer')
  , anObject     = require('./_an-object')
  , toIndex      = require('./_to-index')
  , toLength     = require('./_to-length')
  , isObject     = require('./_is-object')
  , ArrayBuffer  = require('./_global').ArrayBuffer
  , speciesConstructor = require('./_species-constructor')
  , $ArrayBuffer = buffer.ArrayBuffer
  , $DataView    = buffer.DataView
  , $isView      = $typed.ABV && ArrayBuffer.isView
  , $slice       = $ArrayBuffer.prototype.slice
  , VIEW         = $typed.VIEW
  , ARRAY_BUFFER = 'ArrayBuffer';

$export($export.G + $export.W + $export.F * (ArrayBuffer !== $ArrayBuffer), {ArrayBuffer: $ArrayBuffer});

$export($export.S + $export.F * !$typed.CONSTR, ARRAY_BUFFER, {
  // 24.1.3.1 ArrayBuffer.isView(arg)
  isView: function isView(it){
    return $isView && $isView(it) || isObject(it) && VIEW in it;
  }
});

$export($export.P + $export.U + $export.F * require('./_fails')(function(){
  return !new $ArrayBuffer(2).slice(1, undefined).byteLength;
}), ARRAY_BUFFER, {
  // 24.1.4.3 ArrayBuffer.prototype.slice(start, end)
  slice: function slice(start, end){
    if($slice !== undefined && end === undefined)return $slice.call(anObject(this), start); // FF fix
    var len    = anObject(this).byteLength
      , first  = toIndex(start, len)
      , final  = toIndex(end === undefined ? len : end, len)
      , result = new (speciesConstructor(this, $ArrayBuffer))(toLength(final - first))
      , viewS  = new $DataView(this)
      , viewT  = new $DataView(result)
      , index  = 0;
    while(first < final){
      viewT.setUint8(index++, viewS.getUint8(first++));
    } return result;
  }
});

require('./_set-species')(ARRAY_BUFFER);
},{"./_an-object":42,"./_export":67,"./_fails":69,"./_global":73,"./_is-object":84,"./_set-species":126,"./_species-constructor":130,"./_to-index":140,"./_to-length":143,"./_typed":148,"./_typed-buffer":147}],280:[function(require,module,exports){
var $export = require('./_export');
$export($export.G + $export.W + $export.F * !require('./_typed').ABV, {
  DataView: require('./_typed-buffer').DataView
});
},{"./_export":67,"./_typed":148,"./_typed-buffer":147}],281:[function(require,module,exports){
require('./_typed-array')('Float32', 4, function(init){
  return function Float32Array(data, byteOffset, length){
    return init(this, data, byteOffset, length);
  };
});
},{"./_typed-array":146}],282:[function(require,module,exports){
require('./_typed-array')('Float64', 8, function(init){
  return function Float64Array(data, byteOffset, length){
    return init(this, data, byteOffset, length);
  };
});
},{"./_typed-array":146}],283:[function(require,module,exports){
require('./_typed-array')('Int16', 2, function(init){
  return function Int16Array(data, byteOffset, length){
    return init(this, data, byteOffset, length);
  };
});
},{"./_typed-array":146}],284:[function(require,module,exports){
require('./_typed-array')('Int32', 4, function(init){
  return function Int32Array(data, byteOffset, length){
    return init(this, data, byteOffset, length);
  };
});
},{"./_typed-array":146}],285:[function(require,module,exports){
require('./_typed-array')('Int8', 1, function(init){
  return function Int8Array(data, byteOffset, length){
    return init(this, data, byteOffset, length);
  };
});
},{"./_typed-array":146}],286:[function(require,module,exports){
require('./_typed-array')('Uint16', 2, function(init){
  return function Uint16Array(data, byteOffset, length){
    return init(this, data, byteOffset, length);
  };
});
},{"./_typed-array":146}],287:[function(require,module,exports){
require('./_typed-array')('Uint32', 4, function(init){
  return function Uint32Array(data, byteOffset, length){
    return init(this, data, byteOffset, length);
  };
});
},{"./_typed-array":146}],288:[function(require,module,exports){
require('./_typed-array')('Uint8', 1, function(init){
  return function Uint8Array(data, byteOffset, length){
    return init(this, data, byteOffset, length);
  };
});
},{"./_typed-array":146}],289:[function(require,module,exports){
require('./_typed-array')('Uint8', 1, function(init){
  return function Uint8ClampedArray(data, byteOffset, length){
    return init(this, data, byteOffset, length);
  };
}, true);
},{"./_typed-array":146}],290:[function(require,module,exports){
'use strict';
var each         = require('./_array-methods')(0)
  , redefine     = require('./_redefine')
  , meta         = require('./_meta')
  , assign       = require('./_object-assign')
  , weak         = require('./_collection-weak')
  , isObject     = require('./_is-object')
  , getWeak      = meta.getWeak
  , isExtensible = Object.isExtensible
  , uncaughtFrozenStore = weak.ufstore
  , tmp          = {}
  , InternalMap;

var wrapper = function(get){
  return function WeakMap(){
    return get(this, arguments.length > 0 ? arguments[0] : undefined);
  };
};

var methods = {
  // 23.3.3.3 WeakMap.prototype.get(key)
  get: function get(key){
    if(isObject(key)){
      var data = getWeak(key);
      if(data === true)return uncaughtFrozenStore(this).get(key);
      return data ? data[this._i] : undefined;
    }
  },
  // 23.3.3.5 WeakMap.prototype.set(key, value)
  set: function set(key, value){
    return weak.def(this, key, value);
  }
};

// 23.3 WeakMap Objects
var $WeakMap = module.exports = require('./_collection')('WeakMap', wrapper, methods, weak, true, true);

// IE11 WeakMap frozen keys fix
if(new $WeakMap().set((Object.freeze || Object)(tmp), 7).get(tmp) != 7){
  InternalMap = weak.getConstructor(wrapper);
  assign(InternalMap.prototype, methods);
  meta.NEED = true;
  each(['delete', 'has', 'get', 'set'], function(key){
    var proto  = $WeakMap.prototype
      , method = proto[key];
    redefine(proto, key, function(a, b){
      // store frozen objects on internal weakmap shim
      if(isObject(a) && !isExtensible(a)){
        if(!this._f)this._f = new InternalMap;
        var result = this._f[key](a, b);
        return key == 'set' ? this : result;
      // store all the rest on native weakmap
      } return method.call(this, a, b);
    });
  });
}
},{"./_array-methods":47,"./_collection":57,"./_collection-weak":56,"./_is-object":84,"./_meta":97,"./_object-assign":100,"./_redefine":122}],291:[function(require,module,exports){
'use strict';
var weak = require('./_collection-weak');

// 23.4 WeakSet Objects
require('./_collection')('WeakSet', function(get){
  return function WeakSet(){ return get(this, arguments.length > 0 ? arguments[0] : undefined); };
}, {
  // 23.4.3.1 WeakSet.prototype.add(value)
  add: function add(value){
    return weak.def(this, value, true);
  }
}, weak, false, true);
},{"./_collection":57,"./_collection-weak":56}],292:[function(require,module,exports){
'use strict';
// https://github.com/tc39/Array.prototype.includes
var $export   = require('./_export')
  , $includes = require('./_array-includes')(true);

$export($export.P, 'Array', {
  includes: function includes(el /*, fromIndex = 0 */){
    return $includes(this, el, arguments.length > 1 ? arguments[1] : undefined);
  }
});

require('./_add-to-unscopables')('includes');
},{"./_add-to-unscopables":40,"./_array-includes":46,"./_export":67}],293:[function(require,module,exports){
// https://github.com/rwaldron/tc39-notes/blob/master/es6/2014-09/sept-25.md#510-globalasap-for-enqueuing-a-microtask
var $export   = require('./_export')
  , microtask = require('./_microtask')()
  , process   = require('./_global').process
  , isNode    = require('./_cof')(process) == 'process';

$export($export.G, {
  asap: function asap(fn){
    var domain = isNode && process.domain;
    microtask(domain ? domain.bind(fn) : fn);
  }
});
},{"./_cof":53,"./_export":67,"./_global":73,"./_microtask":99}],294:[function(require,module,exports){
// https://github.com/ljharb/proposal-is-error
var $export = require('./_export')
  , cof     = require('./_cof');

$export($export.S, 'Error', {
  isError: function isError(it){
    return cof(it) === 'Error';
  }
});
},{"./_cof":53,"./_export":67}],295:[function(require,module,exports){
// https://github.com/DavidBruant/Map-Set.prototype.toJSON
var $export  = require('./_export');

$export($export.P + $export.R, 'Map', {toJSON: require('./_collection-to-json')('Map')});
},{"./_collection-to-json":55,"./_export":67}],296:[function(require,module,exports){
// https://gist.github.com/BrendanEich/4294d5c212a6d2254703
var $export = require('./_export');

$export($export.S, 'Math', {
  iaddh: function iaddh(x0, x1, y0, y1){
    var $x0 = x0 >>> 0
      , $x1 = x1 >>> 0
      , $y0 = y0 >>> 0;
    return $x1 + (y1 >>> 0) + (($x0 & $y0 | ($x0 | $y0) & ~($x0 + $y0 >>> 0)) >>> 31) | 0;
  }
});
},{"./_export":67}],297:[function(require,module,exports){
// https://gist.github.com/BrendanEich/4294d5c212a6d2254703
var $export = require('./_export');

$export($export.S, 'Math', {
  imulh: function imulh(u, v){
    var UINT16 = 0xffff
      , $u = +u
      , $v = +v
      , u0 = $u & UINT16
      , v0 = $v & UINT16
      , u1 = $u >> 16
      , v1 = $v >> 16
      , t  = (u1 * v0 >>> 0) + (u0 * v0 >>> 16);
    return u1 * v1 + (t >> 16) + ((u0 * v1 >>> 0) + (t & UINT16) >> 16);
  }
});
},{"./_export":67}],298:[function(require,module,exports){
// https://gist.github.com/BrendanEich/4294d5c212a6d2254703
var $export = require('./_export');

$export($export.S, 'Math', {
  isubh: function isubh(x0, x1, y0, y1){
    var $x0 = x0 >>> 0
      , $x1 = x1 >>> 0
      , $y0 = y0 >>> 0;
    return $x1 - (y1 >>> 0) - ((~$x0 & $y0 | ~($x0 ^ $y0) & $x0 - $y0 >>> 0) >>> 31) | 0;
  }
});
},{"./_export":67}],299:[function(require,module,exports){
// https://gist.github.com/BrendanEich/4294d5c212a6d2254703
var $export = require('./_export');

$export($export.S, 'Math', {
  umulh: function umulh(u, v){
    var UINT16 = 0xffff
      , $u = +u
      , $v = +v
      , u0 = $u & UINT16
      , v0 = $v & UINT16
      , u1 = $u >>> 16
      , v1 = $v >>> 16
      , t  = (u1 * v0 >>> 0) + (u0 * v0 >>> 16);
    return u1 * v1 + (t >>> 16) + ((u0 * v1 >>> 0) + (t & UINT16) >>> 16);
  }
});
},{"./_export":67}],300:[function(require,module,exports){
'use strict';
var $export         = require('./_export')
  , toObject        = require('./_to-object')
  , aFunction       = require('./_a-function')
  , $defineProperty = require('./_object-dp');

// B.2.2.2 Object.prototype.__defineGetter__(P, getter)
require('./_descriptors') && $export($export.P + require('./_object-forced-pam'), 'Object', {
  __defineGetter__: function __defineGetter__(P, getter){
    $defineProperty.f(toObject(this), P, {get: aFunction(getter), enumerable: true, configurable: true});
  }
});
},{"./_a-function":38,"./_descriptors":63,"./_export":67,"./_object-dp":102,"./_object-forced-pam":104,"./_to-object":144}],301:[function(require,module,exports){
'use strict';
var $export         = require('./_export')
  , toObject        = require('./_to-object')
  , aFunction       = require('./_a-function')
  , $defineProperty = require('./_object-dp');

// B.2.2.3 Object.prototype.__defineSetter__(P, setter)
require('./_descriptors') && $export($export.P + require('./_object-forced-pam'), 'Object', {
  __defineSetter__: function __defineSetter__(P, setter){
    $defineProperty.f(toObject(this), P, {set: aFunction(setter), enumerable: true, configurable: true});
  }
});
},{"./_a-function":38,"./_descriptors":63,"./_export":67,"./_object-dp":102,"./_object-forced-pam":104,"./_to-object":144}],302:[function(require,module,exports){
// https://github.com/tc39/proposal-object-values-entries
var $export  = require('./_export')
  , $entries = require('./_object-to-array')(true);

$export($export.S, 'Object', {
  entries: function entries(it){
    return $entries(it);
  }
});
},{"./_export":67,"./_object-to-array":114}],303:[function(require,module,exports){
// https://github.com/tc39/proposal-object-getownpropertydescriptors
var $export        = require('./_export')
  , ownKeys        = require('./_own-keys')
  , toIObject      = require('./_to-iobject')
  , gOPD           = require('./_object-gopd')
  , createProperty = require('./_create-property');

$export($export.S, 'Object', {
  getOwnPropertyDescriptors: function getOwnPropertyDescriptors(object){
    var O       = toIObject(object)
      , getDesc = gOPD.f
      , keys    = ownKeys(O)
      , result  = {}
      , i       = 0
      , key;
    while(keys.length > i)createProperty(result, key = keys[i++], getDesc(O, key));
    return result;
  }
});
},{"./_create-property":59,"./_export":67,"./_object-gopd":105,"./_own-keys":115,"./_to-iobject":142}],304:[function(require,module,exports){
'use strict';
var $export                  = require('./_export')
  , toObject                 = require('./_to-object')
  , toPrimitive              = require('./_to-primitive')
  , getPrototypeOf           = require('./_object-gpo')
  , getOwnPropertyDescriptor = require('./_object-gopd').f;

// B.2.2.4 Object.prototype.__lookupGetter__(P)
require('./_descriptors') && $export($export.P + require('./_object-forced-pam'), 'Object', {
  __lookupGetter__: function __lookupGetter__(P){
    var O = toObject(this)
      , K = toPrimitive(P, true)
      , D;
    do {
      if(D = getOwnPropertyDescriptor(O, K))return D.get;
    } while(O = getPrototypeOf(O));
  }
});
},{"./_descriptors":63,"./_export":67,"./_object-forced-pam":104,"./_object-gopd":105,"./_object-gpo":109,"./_to-object":144,"./_to-primitive":145}],305:[function(require,module,exports){
'use strict';
var $export                  = require('./_export')
  , toObject                 = require('./_to-object')
  , toPrimitive              = require('./_to-primitive')
  , getPrototypeOf           = require('./_object-gpo')
  , getOwnPropertyDescriptor = require('./_object-gopd').f;

// B.2.2.5 Object.prototype.__lookupSetter__(P)
require('./_descriptors') && $export($export.P + require('./_object-forced-pam'), 'Object', {
  __lookupSetter__: function __lookupSetter__(P){
    var O = toObject(this)
      , K = toPrimitive(P, true)
      , D;
    do {
      if(D = getOwnPropertyDescriptor(O, K))return D.set;
    } while(O = getPrototypeOf(O));
  }
});
},{"./_descriptors":63,"./_export":67,"./_object-forced-pam":104,"./_object-gopd":105,"./_object-gpo":109,"./_to-object":144,"./_to-primitive":145}],306:[function(require,module,exports){
// https://github.com/tc39/proposal-object-values-entries
var $export = require('./_export')
  , $values = require('./_object-to-array')(false);

$export($export.S, 'Object', {
  values: function values(it){
    return $values(it);
  }
});
},{"./_export":67,"./_object-to-array":114}],307:[function(require,module,exports){
'use strict';
// https://github.com/zenparsing/es-observable
var $export     = require('./_export')
  , global      = require('./_global')
  , core        = require('./_core')
  , microtask   = require('./_microtask')()
  , OBSERVABLE  = require('./_wks')('observable')
  , aFunction   = require('./_a-function')
  , anObject    = require('./_an-object')
  , anInstance  = require('./_an-instance')
  , redefineAll = require('./_redefine-all')
  , hide        = require('./_hide')
  , forOf       = require('./_for-of')
  , RETURN      = forOf.RETURN;

var getMethod = function(fn){
  return fn == null ? undefined : aFunction(fn);
};

var cleanupSubscription = function(subscription){
  var cleanup = subscription._c;
  if(cleanup){
    subscription._c = undefined;
    cleanup();
  }
};

var subscriptionClosed = function(subscription){
  return subscription._o === undefined;
};

var closeSubscription = function(subscription){
  if(!subscriptionClosed(subscription)){
    subscription._o = undefined;
    cleanupSubscription(subscription);
  }
};

var Subscription = function(observer, subscriber){
  anObject(observer);
  this._c = undefined;
  this._o = observer;
  observer = new SubscriptionObserver(this);
  try {
    var cleanup      = subscriber(observer)
      , subscription = cleanup;
    if(cleanup != null){
      if(typeof cleanup.unsubscribe === 'function')cleanup = function(){ subscription.unsubscribe(); };
      else aFunction(cleanup);
      this._c = cleanup;
    }
  } catch(e){
    observer.error(e);
    return;
  } if(subscriptionClosed(this))cleanupSubscription(this);
};

Subscription.prototype = redefineAll({}, {
  unsubscribe: function unsubscribe(){ closeSubscription(this); }
});

var SubscriptionObserver = function(subscription){
  this._s = subscription;
};

SubscriptionObserver.prototype = redefineAll({}, {
  next: function next(value){
    var subscription = this._s;
    if(!subscriptionClosed(subscription)){
      var observer = subscription._o;
      try {
        var m = getMethod(observer.next);
        if(m)return m.call(observer, value);
      } catch(e){
        try {
          closeSubscription(subscription);
        } finally {
          throw e;
        }
      }
    }
  },
  error: function error(value){
    var subscription = this._s;
    if(subscriptionClosed(subscription))throw value;
    var observer = subscription._o;
    subscription._o = undefined;
    try {
      var m = getMethod(observer.error);
      if(!m)throw value;
      value = m.call(observer, value);
    } catch(e){
      try {
        cleanupSubscription(subscription);
      } finally {
        throw e;
      }
    } cleanupSubscription(subscription);
    return value;
  },
  complete: function complete(value){
    var subscription = this._s;
    if(!subscriptionClosed(subscription)){
      var observer = subscription._o;
      subscription._o = undefined;
      try {
        var m = getMethod(observer.complete);
        value = m ? m.call(observer, value) : undefined;
      } catch(e){
        try {
          cleanupSubscription(subscription);
        } finally {
          throw e;
        }
      } cleanupSubscription(subscription);
      return value;
    }
  }
});

var $Observable = function Observable(subscriber){
  anInstance(this, $Observable, 'Observable', '_f')._f = aFunction(subscriber);
};

redefineAll($Observable.prototype, {
  subscribe: function subscribe(observer){
    return new Subscription(observer, this._f);
  },
  forEach: function forEach(fn){
    var that = this;
    return new (core.Promise || global.Promise)(function(resolve, reject){
      aFunction(fn);
      var subscription = that.subscribe({
        next : function(value){
          try {
            return fn(value);
          } catch(e){
            reject(e);
            subscription.unsubscribe();
          }
        },
        error: reject,
        complete: resolve
      });
    });
  }
});

redefineAll($Observable, {
  from: function from(x){
    var C = typeof this === 'function' ? this : $Observable;
    var method = getMethod(anObject(x)[OBSERVABLE]);
    if(method){
      var observable = anObject(method.call(x));
      return observable.constructor === C ? observable : new C(function(observer){
        return observable.subscribe(observer);
      });
    }
    return new C(function(observer){
      var done = false;
      microtask(function(){
        if(!done){
          try {
            if(forOf(x, false, function(it){
              observer.next(it);
              if(done)return RETURN;
            }) === RETURN)return;
          } catch(e){
            if(done)throw e;
            observer.error(e);
            return;
          } observer.complete();
        }
      });
      return function(){ done = true; };
    });
  },
  of: function of(){
    for(var i = 0, l = arguments.length, items = Array(l); i < l;)items[i] = arguments[i++];
    return new (typeof this === 'function' ? this : $Observable)(function(observer){
      var done = false;
      microtask(function(){
        if(!done){
          for(var i = 0; i < items.length; ++i){
            observer.next(items[i]);
            if(done)return;
          } observer.complete();
        }
      });
      return function(){ done = true; };
    });
  }
});

hide($Observable.prototype, OBSERVABLE, function(){ return this; });

$export($export.G, {Observable: $Observable});

require('./_set-species')('Observable');
},{"./_a-function":38,"./_an-instance":41,"./_an-object":42,"./_core":58,"./_export":67,"./_for-of":72,"./_global":73,"./_hide":75,"./_microtask":99,"./_redefine-all":121,"./_set-species":126,"./_wks":152}],308:[function(require,module,exports){
var metadata                  = require('./_metadata')
  , anObject                  = require('./_an-object')
  , toMetaKey                 = metadata.key
  , ordinaryDefineOwnMetadata = metadata.set;

metadata.exp({defineMetadata: function defineMetadata(metadataKey, metadataValue, target, targetKey){
  ordinaryDefineOwnMetadata(metadataKey, metadataValue, anObject(target), toMetaKey(targetKey));
}});
},{"./_an-object":42,"./_metadata":98}],309:[function(require,module,exports){
var metadata               = require('./_metadata')
  , anObject               = require('./_an-object')
  , toMetaKey              = metadata.key
  , getOrCreateMetadataMap = metadata.map
  , store                  = metadata.store;

metadata.exp({deleteMetadata: function deleteMetadata(metadataKey, target /*, targetKey */){
  var targetKey   = arguments.length < 3 ? undefined : toMetaKey(arguments[2])
    , metadataMap = getOrCreateMetadataMap(anObject(target), targetKey, false);
  if(metadataMap === undefined || !metadataMap['delete'](metadataKey))return false;
  if(metadataMap.size)return true;
  var targetMetadata = store.get(target);
  targetMetadata['delete'](targetKey);
  return !!targetMetadata.size || store['delete'](target);
}});
},{"./_an-object":42,"./_metadata":98}],310:[function(require,module,exports){
var Set                     = require('./es6.set')
  , from                    = require('./_array-from-iterable')
  , metadata                = require('./_metadata')
  , anObject                = require('./_an-object')
  , getPrototypeOf          = require('./_object-gpo')
  , ordinaryOwnMetadataKeys = metadata.keys
  , toMetaKey               = metadata.key;

var ordinaryMetadataKeys = function(O, P){
  var oKeys  = ordinaryOwnMetadataKeys(O, P)
    , parent = getPrototypeOf(O);
  if(parent === null)return oKeys;
  var pKeys  = ordinaryMetadataKeys(parent, P);
  return pKeys.length ? oKeys.length ? from(new Set(oKeys.concat(pKeys))) : pKeys : oKeys;
};

metadata.exp({getMetadataKeys: function getMetadataKeys(target /*, targetKey */){
  return ordinaryMetadataKeys(anObject(target), arguments.length < 2 ? undefined : toMetaKey(arguments[1]));
}});
},{"./_an-object":42,"./_array-from-iterable":45,"./_metadata":98,"./_object-gpo":109,"./es6.set":255}],311:[function(require,module,exports){
var metadata               = require('./_metadata')
  , anObject               = require('./_an-object')
  , getPrototypeOf         = require('./_object-gpo')
  , ordinaryHasOwnMetadata = metadata.has
  , ordinaryGetOwnMetadata = metadata.get
  , toMetaKey              = metadata.key;

var ordinaryGetMetadata = function(MetadataKey, O, P){
  var hasOwn = ordinaryHasOwnMetadata(MetadataKey, O, P);
  if(hasOwn)return ordinaryGetOwnMetadata(MetadataKey, O, P);
  var parent = getPrototypeOf(O);
  return parent !== null ? ordinaryGetMetadata(MetadataKey, parent, P) : undefined;
};

metadata.exp({getMetadata: function getMetadata(metadataKey, target /*, targetKey */){
  return ordinaryGetMetadata(metadataKey, anObject(target), arguments.length < 3 ? undefined : toMetaKey(arguments[2]));
}});
},{"./_an-object":42,"./_metadata":98,"./_object-gpo":109}],312:[function(require,module,exports){
var metadata                = require('./_metadata')
  , anObject                = require('./_an-object')
  , ordinaryOwnMetadataKeys = metadata.keys
  , toMetaKey               = metadata.key;

metadata.exp({getOwnMetadataKeys: function getOwnMetadataKeys(target /*, targetKey */){
  return ordinaryOwnMetadataKeys(anObject(target), arguments.length < 2 ? undefined : toMetaKey(arguments[1]));
}});
},{"./_an-object":42,"./_metadata":98}],313:[function(require,module,exports){
var metadata               = require('./_metadata')
  , anObject               = require('./_an-object')
  , ordinaryGetOwnMetadata = metadata.get
  , toMetaKey              = metadata.key;

metadata.exp({getOwnMetadata: function getOwnMetadata(metadataKey, target /*, targetKey */){
  return ordinaryGetOwnMetadata(metadataKey, anObject(target)
    , arguments.length < 3 ? undefined : toMetaKey(arguments[2]));
}});
},{"./_an-object":42,"./_metadata":98}],314:[function(require,module,exports){
var metadata               = require('./_metadata')
  , anObject               = require('./_an-object')
  , getPrototypeOf         = require('./_object-gpo')
  , ordinaryHasOwnMetadata = metadata.has
  , toMetaKey              = metadata.key;

var ordinaryHasMetadata = function(MetadataKey, O, P){
  var hasOwn = ordinaryHasOwnMetadata(MetadataKey, O, P);
  if(hasOwn)return true;
  var parent = getPrototypeOf(O);
  return parent !== null ? ordinaryHasMetadata(MetadataKey, parent, P) : false;
};

metadata.exp({hasMetadata: function hasMetadata(metadataKey, target /*, targetKey */){
  return ordinaryHasMetadata(metadataKey, anObject(target), arguments.length < 3 ? undefined : toMetaKey(arguments[2]));
}});
},{"./_an-object":42,"./_metadata":98,"./_object-gpo":109}],315:[function(require,module,exports){
var metadata               = require('./_metadata')
  , anObject               = require('./_an-object')
  , ordinaryHasOwnMetadata = metadata.has
  , toMetaKey              = metadata.key;

metadata.exp({hasOwnMetadata: function hasOwnMetadata(metadataKey, target /*, targetKey */){
  return ordinaryHasOwnMetadata(metadataKey, anObject(target)
    , arguments.length < 3 ? undefined : toMetaKey(arguments[2]));
}});
},{"./_an-object":42,"./_metadata":98}],316:[function(require,module,exports){
var metadata                  = require('./_metadata')
  , anObject                  = require('./_an-object')
  , aFunction                 = require('./_a-function')
  , toMetaKey                 = metadata.key
  , ordinaryDefineOwnMetadata = metadata.set;

metadata.exp({metadata: function metadata(metadataKey, metadataValue){
  return function decorator(target, targetKey){
    ordinaryDefineOwnMetadata(
      metadataKey, metadataValue,
      (targetKey !== undefined ? anObject : aFunction)(target),
      toMetaKey(targetKey)
    );
  };
}});
},{"./_a-function":38,"./_an-object":42,"./_metadata":98}],317:[function(require,module,exports){
// https://github.com/DavidBruant/Map-Set.prototype.toJSON
var $export  = require('./_export');

$export($export.P + $export.R, 'Set', {toJSON: require('./_collection-to-json')('Set')});
},{"./_collection-to-json":55,"./_export":67}],318:[function(require,module,exports){
'use strict';
// https://github.com/mathiasbynens/String.prototype.at
var $export = require('./_export')
  , $at     = require('./_string-at')(true);

$export($export.P, 'String', {
  at: function at(pos){
    return $at(this, pos);
  }
});
},{"./_export":67,"./_string-at":132}],319:[function(require,module,exports){
'use strict';
// https://tc39.github.io/String.prototype.matchAll/
var $export     = require('./_export')
  , defined     = require('./_defined')
  , toLength    = require('./_to-length')
  , isRegExp    = require('./_is-regexp')
  , getFlags    = require('./_flags')
  , RegExpProto = RegExp.prototype;

var $RegExpStringIterator = function(regexp, string){
  this._r = regexp;
  this._s = string;
};

require('./_iter-create')($RegExpStringIterator, 'RegExp String', function next(){
  var match = this._r.exec(this._s);
  return {value: match, done: match === null};
});

$export($export.P, 'String', {
  matchAll: function matchAll(regexp){
    defined(this);
    if(!isRegExp(regexp))throw TypeError(regexp + ' is not a regexp!');
    var S     = String(this)
      , flags = 'flags' in RegExpProto ? String(regexp.flags) : getFlags.call(regexp)
      , rx    = new RegExp(regexp.source, ~flags.indexOf('g') ? flags : 'g' + flags);
    rx.lastIndex = toLength(regexp.lastIndex);
    return new $RegExpStringIterator(rx, S);
  }
});
},{"./_defined":62,"./_export":67,"./_flags":71,"./_is-regexp":85,"./_iter-create":87,"./_to-length":143}],320:[function(require,module,exports){
'use strict';
// https://github.com/tc39/proposal-string-pad-start-end
var $export = require('./_export')
  , $pad    = require('./_string-pad');

$export($export.P, 'String', {
  padEnd: function padEnd(maxLength /*, fillString = ' ' */){
    return $pad(this, maxLength, arguments.length > 1 ? arguments[1] : undefined, false);
  }
});
},{"./_export":67,"./_string-pad":135}],321:[function(require,module,exports){
'use strict';
// https://github.com/tc39/proposal-string-pad-start-end
var $export = require('./_export')
  , $pad    = require('./_string-pad');

$export($export.P, 'String', {
  padStart: function padStart(maxLength /*, fillString = ' ' */){
    return $pad(this, maxLength, arguments.length > 1 ? arguments[1] : undefined, true);
  }
});
},{"./_export":67,"./_string-pad":135}],322:[function(require,module,exports){
'use strict';
// https://github.com/sebmarkbage/ecmascript-string-left-right-trim
require('./_string-trim')('trimLeft', function($trim){
  return function trimLeft(){
    return $trim(this, 1);
  };
}, 'trimStart');
},{"./_string-trim":137}],323:[function(require,module,exports){
'use strict';
// https://github.com/sebmarkbage/ecmascript-string-left-right-trim
require('./_string-trim')('trimRight', function($trim){
  return function trimRight(){
    return $trim(this, 2);
  };
}, 'trimEnd');
},{"./_string-trim":137}],324:[function(require,module,exports){
require('./_wks-define')('asyncIterator');
},{"./_wks-define":150}],325:[function(require,module,exports){
require('./_wks-define')('observable');
},{"./_wks-define":150}],326:[function(require,module,exports){
// https://github.com/ljharb/proposal-global
var $export = require('./_export');

$export($export.S, 'System', {global: require('./_global')});
},{"./_export":67,"./_global":73}],327:[function(require,module,exports){
var $iterators    = require('./es6.array.iterator')
  , redefine      = require('./_redefine')
  , global        = require('./_global')
  , hide          = require('./_hide')
  , Iterators     = require('./_iterators')
  , wks           = require('./_wks')
  , ITERATOR      = wks('iterator')
  , TO_STRING_TAG = wks('toStringTag')
  , ArrayValues   = Iterators.Array;

for(var collections = ['NodeList', 'DOMTokenList', 'MediaList', 'StyleSheetList', 'CSSRuleList'], i = 0; i < 5; i++){
  var NAME       = collections[i]
    , Collection = global[NAME]
    , proto      = Collection && Collection.prototype
    , key;
  if(proto){
    if(!proto[ITERATOR])hide(proto, ITERATOR, ArrayValues);
    if(!proto[TO_STRING_TAG])hide(proto, TO_STRING_TAG, NAME);
    Iterators[NAME] = ArrayValues;
    for(key in $iterators)if(!proto[key])redefine(proto, key, $iterators[key], true);
  }
}
},{"./_global":73,"./_hide":75,"./_iterators":91,"./_redefine":122,"./_wks":152,"./es6.array.iterator":165}],328:[function(require,module,exports){
var $export = require('./_export')
  , $task   = require('./_task');
$export($export.G + $export.B, {
  setImmediate:   $task.set,
  clearImmediate: $task.clear
});
},{"./_export":67,"./_task":139}],329:[function(require,module,exports){
// ie9- setTimeout & setInterval additional parameters fix
var global     = require('./_global')
  , $export    = require('./_export')
  , invoke     = require('./_invoke')
  , partial    = require('./_partial')
  , navigator  = global.navigator
  , MSIE       = !!navigator && /MSIE .\./.test(navigator.userAgent); // <- dirty ie9- check
var wrap = function(set){
  return MSIE ? function(fn, time /*, ...args */){
    return set(invoke(
      partial,
      [].slice.call(arguments, 2),
      typeof fn == 'function' ? fn : Function(fn)
    ), time);
  } : set;
};
$export($export.G + $export.B + $export.F * MSIE, {
  setTimeout:  wrap(global.setTimeout),
  setInterval: wrap(global.setInterval)
});
},{"./_export":67,"./_global":73,"./_invoke":79,"./_partial":118}],330:[function(require,module,exports){
require('./modules/es6.symbol');
require('./modules/es6.object.create');
require('./modules/es6.object.define-property');
require('./modules/es6.object.define-properties');
require('./modules/es6.object.get-own-property-descriptor');
require('./modules/es6.object.get-prototype-of');
require('./modules/es6.object.keys');
require('./modules/es6.object.get-own-property-names');
require('./modules/es6.object.freeze');
require('./modules/es6.object.seal');
require('./modules/es6.object.prevent-extensions');
require('./modules/es6.object.is-frozen');
require('./modules/es6.object.is-sealed');
require('./modules/es6.object.is-extensible');
require('./modules/es6.object.assign');
require('./modules/es6.object.is');
require('./modules/es6.object.set-prototype-of');
require('./modules/es6.object.to-string');
require('./modules/es6.function.bind');
require('./modules/es6.function.name');
require('./modules/es6.function.has-instance');
require('./modules/es6.parse-int');
require('./modules/es6.parse-float');
require('./modules/es6.number.constructor');
require('./modules/es6.number.to-fixed');
require('./modules/es6.number.to-precision');
require('./modules/es6.number.epsilon');
require('./modules/es6.number.is-finite');
require('./modules/es6.number.is-integer');
require('./modules/es6.number.is-nan');
require('./modules/es6.number.is-safe-integer');
require('./modules/es6.number.max-safe-integer');
require('./modules/es6.number.min-safe-integer');
require('./modules/es6.number.parse-float');
require('./modules/es6.number.parse-int');
require('./modules/es6.math.acosh');
require('./modules/es6.math.asinh');
require('./modules/es6.math.atanh');
require('./modules/es6.math.cbrt');
require('./modules/es6.math.clz32');
require('./modules/es6.math.cosh');
require('./modules/es6.math.expm1');
require('./modules/es6.math.fround');
require('./modules/es6.math.hypot');
require('./modules/es6.math.imul');
require('./modules/es6.math.log10');
require('./modules/es6.math.log1p');
require('./modules/es6.math.log2');
require('./modules/es6.math.sign');
require('./modules/es6.math.sinh');
require('./modules/es6.math.tanh');
require('./modules/es6.math.trunc');
require('./modules/es6.string.from-code-point');
require('./modules/es6.string.raw');
require('./modules/es6.string.trim');
require('./modules/es6.string.iterator');
require('./modules/es6.string.code-point-at');
require('./modules/es6.string.ends-with');
require('./modules/es6.string.includes');
require('./modules/es6.string.repeat');
require('./modules/es6.string.starts-with');
require('./modules/es6.string.anchor');
require('./modules/es6.string.big');
require('./modules/es6.string.blink');
require('./modules/es6.string.bold');
require('./modules/es6.string.fixed');
require('./modules/es6.string.fontcolor');
require('./modules/es6.string.fontsize');
require('./modules/es6.string.italics');
require('./modules/es6.string.link');
require('./modules/es6.string.small');
require('./modules/es6.string.strike');
require('./modules/es6.string.sub');
require('./modules/es6.string.sup');
require('./modules/es6.date.now');
require('./modules/es6.date.to-json');
require('./modules/es6.date.to-iso-string');
require('./modules/es6.date.to-string');
require('./modules/es6.date.to-primitive');
require('./modules/es6.array.is-array');
require('./modules/es6.array.from');
require('./modules/es6.array.of');
require('./modules/es6.array.join');
require('./modules/es6.array.slice');
require('./modules/es6.array.sort');
require('./modules/es6.array.for-each');
require('./modules/es6.array.map');
require('./modules/es6.array.filter');
require('./modules/es6.array.some');
require('./modules/es6.array.every');
require('./modules/es6.array.reduce');
require('./modules/es6.array.reduce-right');
require('./modules/es6.array.index-of');
require('./modules/es6.array.last-index-of');
require('./modules/es6.array.copy-within');
require('./modules/es6.array.fill');
require('./modules/es6.array.find');
require('./modules/es6.array.find-index');
require('./modules/es6.array.species');
require('./modules/es6.array.iterator');
require('./modules/es6.regexp.constructor');
require('./modules/es6.regexp.to-string');
require('./modules/es6.regexp.flags');
require('./modules/es6.regexp.match');
require('./modules/es6.regexp.replace');
require('./modules/es6.regexp.search');
require('./modules/es6.regexp.split');
require('./modules/es6.promise');
require('./modules/es6.map');
require('./modules/es6.set');
require('./modules/es6.weak-map');
require('./modules/es6.weak-set');
require('./modules/es6.typed.array-buffer');
require('./modules/es6.typed.data-view');
require('./modules/es6.typed.int8-array');
require('./modules/es6.typed.uint8-array');
require('./modules/es6.typed.uint8-clamped-array');
require('./modules/es6.typed.int16-array');
require('./modules/es6.typed.uint16-array');
require('./modules/es6.typed.int32-array');
require('./modules/es6.typed.uint32-array');
require('./modules/es6.typed.float32-array');
require('./modules/es6.typed.float64-array');
require('./modules/es6.reflect.apply');
require('./modules/es6.reflect.construct');
require('./modules/es6.reflect.define-property');
require('./modules/es6.reflect.delete-property');
require('./modules/es6.reflect.enumerate');
require('./modules/es6.reflect.get');
require('./modules/es6.reflect.get-own-property-descriptor');
require('./modules/es6.reflect.get-prototype-of');
require('./modules/es6.reflect.has');
require('./modules/es6.reflect.is-extensible');
require('./modules/es6.reflect.own-keys');
require('./modules/es6.reflect.prevent-extensions');
require('./modules/es6.reflect.set');
require('./modules/es6.reflect.set-prototype-of');
require('./modules/es7.array.includes');
require('./modules/es7.string.at');
require('./modules/es7.string.pad-start');
require('./modules/es7.string.pad-end');
require('./modules/es7.string.trim-left');
require('./modules/es7.string.trim-right');
require('./modules/es7.string.match-all');
require('./modules/es7.symbol.async-iterator');
require('./modules/es7.symbol.observable');
require('./modules/es7.object.get-own-property-descriptors');
require('./modules/es7.object.values');
require('./modules/es7.object.entries');
require('./modules/es7.object.define-getter');
require('./modules/es7.object.define-setter');
require('./modules/es7.object.lookup-getter');
require('./modules/es7.object.lookup-setter');
require('./modules/es7.map.to-json');
require('./modules/es7.set.to-json');
require('./modules/es7.system.global');
require('./modules/es7.error.is-error');
require('./modules/es7.math.iaddh');
require('./modules/es7.math.isubh');
require('./modules/es7.math.imulh');
require('./modules/es7.math.umulh');
require('./modules/es7.reflect.define-metadata');
require('./modules/es7.reflect.delete-metadata');
require('./modules/es7.reflect.get-metadata');
require('./modules/es7.reflect.get-metadata-keys');
require('./modules/es7.reflect.get-own-metadata');
require('./modules/es7.reflect.get-own-metadata-keys');
require('./modules/es7.reflect.has-metadata');
require('./modules/es7.reflect.has-own-metadata');
require('./modules/es7.reflect.metadata');
require('./modules/es7.asap');
require('./modules/es7.observable');
require('./modules/web.timers');
require('./modules/web.immediate');
require('./modules/web.dom.iterable');
module.exports = require('./modules/_core');
},{"./modules/_core":58,"./modules/es6.array.copy-within":155,"./modules/es6.array.every":156,"./modules/es6.array.fill":157,"./modules/es6.array.filter":158,"./modules/es6.array.find":160,"./modules/es6.array.find-index":159,"./modules/es6.array.for-each":161,"./modules/es6.array.from":162,"./modules/es6.array.index-of":163,"./modules/es6.array.is-array":164,"./modules/es6.array.iterator":165,"./modules/es6.array.join":166,"./modules/es6.array.last-index-of":167,"./modules/es6.array.map":168,"./modules/es6.array.of":169,"./modules/es6.array.reduce":171,"./modules/es6.array.reduce-right":170,"./modules/es6.array.slice":172,"./modules/es6.array.some":173,"./modules/es6.array.sort":174,"./modules/es6.array.species":175,"./modules/es6.date.now":176,"./modules/es6.date.to-iso-string":177,"./modules/es6.date.to-json":178,"./modules/es6.date.to-primitive":179,"./modules/es6.date.to-string":180,"./modules/es6.function.bind":181,"./modules/es6.function.has-instance":182,"./modules/es6.function.name":183,"./modules/es6.map":184,"./modules/es6.math.acosh":185,"./modules/es6.math.asinh":186,"./modules/es6.math.atanh":187,"./modules/es6.math.cbrt":188,"./modules/es6.math.clz32":189,"./modules/es6.math.cosh":190,"./modules/es6.math.expm1":191,"./modules/es6.math.fround":192,"./modules/es6.math.hypot":193,"./modules/es6.math.imul":194,"./modules/es6.math.log10":195,"./modules/es6.math.log1p":196,"./modules/es6.math.log2":197,"./modules/es6.math.sign":198,"./modules/es6.math.sinh":199,"./modules/es6.math.tanh":200,"./modules/es6.math.trunc":201,"./modules/es6.number.constructor":202,"./modules/es6.number.epsilon":203,"./modules/es6.number.is-finite":204,"./modules/es6.number.is-integer":205,"./modules/es6.number.is-nan":206,"./modules/es6.number.is-safe-integer":207,"./modules/es6.number.max-safe-integer":208,"./modules/es6.number.min-safe-integer":209,"./modules/es6.number.parse-float":210,"./modules/es6.number.parse-int":211,"./modules/es6.number.to-fixed":212,"./modules/es6.number.to-precision":213,"./modules/es6.object.assign":214,"./modules/es6.object.create":215,"./modules/es6.object.define-properties":216,"./modules/es6.object.define-property":217,"./modules/es6.object.freeze":218,"./modules/es6.object.get-own-property-descriptor":219,"./modules/es6.object.get-own-property-names":220,"./modules/es6.object.get-prototype-of":221,"./modules/es6.object.is":225,"./modules/es6.object.is-extensible":222,"./modules/es6.object.is-frozen":223,"./modules/es6.object.is-sealed":224,"./modules/es6.object.keys":226,"./modules/es6.object.prevent-extensions":227,"./modules/es6.object.seal":228,"./modules/es6.object.set-prototype-of":229,"./modules/es6.object.to-string":230,"./modules/es6.parse-float":231,"./modules/es6.parse-int":232,"./modules/es6.promise":233,"./modules/es6.reflect.apply":234,"./modules/es6.reflect.construct":235,"./modules/es6.reflect.define-property":236,"./modules/es6.reflect.delete-property":237,"./modules/es6.reflect.enumerate":238,"./modules/es6.reflect.get":241,"./modules/es6.reflect.get-own-property-descriptor":239,"./modules/es6.reflect.get-prototype-of":240,"./modules/es6.reflect.has":242,"./modules/es6.reflect.is-extensible":243,"./modules/es6.reflect.own-keys":244,"./modules/es6.reflect.prevent-extensions":245,"./modules/es6.reflect.set":247,"./modules/es6.reflect.set-prototype-of":246,"./modules/es6.regexp.constructor":248,"./modules/es6.regexp.flags":249,"./modules/es6.regexp.match":250,"./modules/es6.regexp.replace":251,"./modules/es6.regexp.search":252,"./modules/es6.regexp.split":253,"./modules/es6.regexp.to-string":254,"./modules/es6.set":255,"./modules/es6.string.anchor":256,"./modules/es6.string.big":257,"./modules/es6.string.blink":258,"./modules/es6.string.bold":259,"./modules/es6.string.code-point-at":260,"./modules/es6.string.ends-with":261,"./modules/es6.string.fixed":262,"./modules/es6.string.fontcolor":263,"./modules/es6.string.fontsize":264,"./modules/es6.string.from-code-point":265,"./modules/es6.string.includes":266,"./modules/es6.string.italics":267,"./modules/es6.string.iterator":268,"./modules/es6.string.link":269,"./modules/es6.string.raw":270,"./modules/es6.string.repeat":271,"./modules/es6.string.small":272,"./modules/es6.string.starts-with":273,"./modules/es6.string.strike":274,"./modules/es6.string.sub":275,"./modules/es6.string.sup":276,"./modules/es6.string.trim":277,"./modules/es6.symbol":278,"./modules/es6.typed.array-buffer":279,"./modules/es6.typed.data-view":280,"./modules/es6.typed.float32-array":281,"./modules/es6.typed.float64-array":282,"./modules/es6.typed.int16-array":283,"./modules/es6.typed.int32-array":284,"./modules/es6.typed.int8-array":285,"./modules/es6.typed.uint16-array":286,"./modules/es6.typed.uint32-array":287,"./modules/es6.typed.uint8-array":288,"./modules/es6.typed.uint8-clamped-array":289,"./modules/es6.weak-map":290,"./modules/es6.weak-set":291,"./modules/es7.array.includes":292,"./modules/es7.asap":293,"./modules/es7.error.is-error":294,"./modules/es7.map.to-json":295,"./modules/es7.math.iaddh":296,"./modules/es7.math.imulh":297,"./modules/es7.math.isubh":298,"./modules/es7.math.umulh":299,"./modules/es7.object.define-getter":300,"./modules/es7.object.define-setter":301,"./modules/es7.object.entries":302,"./modules/es7.object.get-own-property-descriptors":303,"./modules/es7.object.lookup-getter":304,"./modules/es7.object.lookup-setter":305,"./modules/es7.object.values":306,"./modules/es7.observable":307,"./modules/es7.reflect.define-metadata":308,"./modules/es7.reflect.delete-metadata":309,"./modules/es7.reflect.get-metadata":311,"./modules/es7.reflect.get-metadata-keys":310,"./modules/es7.reflect.get-own-metadata":313,"./modules/es7.reflect.get-own-metadata-keys":312,"./modules/es7.reflect.has-metadata":314,"./modules/es7.reflect.has-own-metadata":315,"./modules/es7.reflect.metadata":316,"./modules/es7.set.to-json":317,"./modules/es7.string.at":318,"./modules/es7.string.match-all":319,"./modules/es7.string.pad-end":320,"./modules/es7.string.pad-start":321,"./modules/es7.string.trim-left":322,"./modules/es7.string.trim-right":323,"./modules/es7.symbol.async-iterator":324,"./modules/es7.symbol.observable":325,"./modules/es7.system.global":326,"./modules/web.dom.iterable":327,"./modules/web.immediate":328,"./modules/web.timers":329}],331:[function(require,module,exports){

/**
 * This is the web browser implementation of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = require('./debug');
exports.log = log;
exports.formatArgs = formatArgs;
exports.save = save;
exports.load = load;
exports.useColors = useColors;
exports.storage = 'undefined' != typeof chrome
               && 'undefined' != typeof chrome.storage
                  ? chrome.storage.local
                  : localstorage();

/**
 * Colors.
 */

exports.colors = [
  'lightseagreen',
  'forestgreen',
  'goldenrod',
  'dodgerblue',
  'darkorchid',
  'crimson'
];

/**
 * Currently only WebKit-based Web Inspectors, Firefox >= v31,
 * and the Firebug extension (any Firefox version) are known
 * to support "%c" CSS customizations.
 *
 * TODO: add a `localStorage` variable to explicitly enable/disable colors
 */

function useColors() {
  // is webkit? http://stackoverflow.com/a/16459606/376773
  return ('WebkitAppearance' in document.documentElement.style) ||
    // is firebug? http://stackoverflow.com/a/398120/376773
    (window.console && (console.firebug || (console.exception && console.table))) ||
    // is firefox >= v31?
    // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
    (navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31);
}

/**
 * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
 */

exports.formatters.j = function(v) {
  return JSON.stringify(v);
};


/**
 * Colorize log arguments if enabled.
 *
 * @api public
 */

function formatArgs() {
  var args = arguments;
  var useColors = this.useColors;

  args[0] = (useColors ? '%c' : '')
    + this.namespace
    + (useColors ? ' %c' : ' ')
    + args[0]
    + (useColors ? '%c ' : ' ')
    + '+' + exports.humanize(this.diff);

  if (!useColors) return args;

  var c = 'color: ' + this.color;
  args = [args[0], c, 'color: inherit'].concat(Array.prototype.slice.call(args, 1));

  // the final "%c" is somewhat tricky, because there could be other
  // arguments passed either before or after the %c, so we need to
  // figure out the correct index to insert the CSS into
  var index = 0;
  var lastC = 0;
  args[0].replace(/%[a-z%]/g, function(match) {
    if ('%%' === match) return;
    index++;
    if ('%c' === match) {
      // we only are interested in the *last* %c
      // (the user may have provided their own)
      lastC = index;
    }
  });

  args.splice(lastC, 0, c);
  return args;
}

/**
 * Invokes `console.log()` when available.
 * No-op when `console.log` is not a "function".
 *
 * @api public
 */

function log() {
  // this hackery is required for IE8/9, where
  // the `console.log` function doesn't have 'apply'
  return 'object' === typeof console
    && console.log
    && Function.prototype.apply.call(console.log, console, arguments);
}

/**
 * Save `namespaces`.
 *
 * @param {String} namespaces
 * @api private
 */

function save(namespaces) {
  try {
    if (null == namespaces) {
      exports.storage.removeItem('debug');
    } else {
      exports.storage.debug = namespaces;
    }
  } catch(e) {}
}

/**
 * Load `namespaces`.
 *
 * @return {String} returns the previously persisted debug modes
 * @api private
 */

function load() {
  var r;
  try {
    r = exports.storage.debug;
  } catch(e) {}
  return r;
}

/**
 * Enable namespaces listed in `localStorage.debug` initially.
 */

exports.enable(load());

/**
 * Localstorage attempts to return the localstorage.
 *
 * This is necessary because safari throws
 * when a user disables cookies/localstorage
 * and you attempt to access it.
 *
 * @return {LocalStorage}
 * @api private
 */

function localstorage(){
  try {
    return window.localStorage;
  } catch (e) {}
}

},{"./debug":332}],332:[function(require,module,exports){

/**
 * This is the common logic for both the Node.js and web browser
 * implementations of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = debug;
exports.coerce = coerce;
exports.disable = disable;
exports.enable = enable;
exports.enabled = enabled;
exports.humanize = require('ms');

/**
 * The currently active debug mode names, and names to skip.
 */

exports.names = [];
exports.skips = [];

/**
 * Map of special "%n" handling functions, for the debug "format" argument.
 *
 * Valid key names are a single, lowercased letter, i.e. "n".
 */

exports.formatters = {};

/**
 * Previously assigned color.
 */

var prevColor = 0;

/**
 * Previous log timestamp.
 */

var prevTime;

/**
 * Select a color.
 *
 * @return {Number}
 * @api private
 */

function selectColor() {
  return exports.colors[prevColor++ % exports.colors.length];
}

/**
 * Create a debugger with the given `namespace`.
 *
 * @param {String} namespace
 * @return {Function}
 * @api public
 */

function debug(namespace) {

  // define the `disabled` version
  function disabled() {
  }
  disabled.enabled = false;

  // define the `enabled` version
  function enabled() {

    var self = enabled;

    // set `diff` timestamp
    var curr = +new Date();
    var ms = curr - (prevTime || curr);
    self.diff = ms;
    self.prev = prevTime;
    self.curr = curr;
    prevTime = curr;

    // add the `color` if not set
    if (null == self.useColors) self.useColors = exports.useColors();
    if (null == self.color && self.useColors) self.color = selectColor();

    var args = Array.prototype.slice.call(arguments);

    args[0] = exports.coerce(args[0]);

    if ('string' !== typeof args[0]) {
      // anything else let's inspect with %o
      args = ['%o'].concat(args);
    }

    // apply any `formatters` transformations
    var index = 0;
    args[0] = args[0].replace(/%([a-z%])/g, function(match, format) {
      // if we encounter an escaped % then don't increase the array index
      if (match === '%%') return match;
      index++;
      var formatter = exports.formatters[format];
      if ('function' === typeof formatter) {
        var val = args[index];
        match = formatter.call(self, val);

        // now we need to remove `args[index]` since it's inlined in the `format`
        args.splice(index, 1);
        index--;
      }
      return match;
    });

    if ('function' === typeof exports.formatArgs) {
      args = exports.formatArgs.apply(self, args);
    }
    var logFn = enabled.log || exports.log || console.log.bind(console);
    logFn.apply(self, args);
  }
  enabled.enabled = true;

  var fn = exports.enabled(namespace) ? enabled : disabled;

  fn.namespace = namespace;

  return fn;
}

/**
 * Enables a debug mode by namespaces. This can include modes
 * separated by a colon and wildcards.
 *
 * @param {String} namespaces
 * @api public
 */

function enable(namespaces) {
  exports.save(namespaces);

  var split = (namespaces || '').split(/[\s,]+/);
  var len = split.length;

  for (var i = 0; i < len; i++) {
    if (!split[i]) continue; // ignore empty strings
    namespaces = split[i].replace(/\*/g, '.*?');
    if (namespaces[0] === '-') {
      exports.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
    } else {
      exports.names.push(new RegExp('^' + namespaces + '$'));
    }
  }
}

/**
 * Disable debug output.
 *
 * @api public
 */

function disable() {
  exports.enable('');
}

/**
 * Returns true if the given mode name is enabled, false otherwise.
 *
 * @param {String} name
 * @return {Boolean}
 * @api public
 */

function enabled(name) {
  var i, len;
  for (i = 0, len = exports.skips.length; i < len; i++) {
    if (exports.skips[i].test(name)) {
      return false;
    }
  }
  for (i = 0, len = exports.names.length; i < len; i++) {
    if (exports.names[i].test(name)) {
      return true;
    }
  }
  return false;
}

/**
 * Coerce `val`.
 *
 * @param {Mixed} val
 * @return {Mixed}
 * @api private
 */

function coerce(val) {
  if (val instanceof Error) return val.stack || val.message;
  return val;
}

},{"ms":359}],333:[function(require,module,exports){
/* global HTMLElement */

'use strict'

module.exports = function emptyElement (element) {
  if (!(element instanceof HTMLElement)) {
    throw new TypeError('Expected an element')
  }

  var node
  while ((node = element.lastChild)) element.removeChild(node)
  return element
}

},{}],334:[function(require,module,exports){

module.exports = require('./lib/index');

},{"./lib/index":335}],335:[function(require,module,exports){

module.exports = require('./socket');

/**
 * Exports parser
 *
 * @api public
 *
 */
module.exports.parser = require('engine.io-parser');

},{"./socket":336,"engine.io-parser":347}],336:[function(require,module,exports){
(function (global){
/**
 * Module dependencies.
 */

var transports = require('./transports/index');
var Emitter = require('component-emitter');
var debug = require('debug')('engine.io-client:socket');
var index = require('indexof');
var parser = require('engine.io-parser');
var parseuri = require('parseuri');
var parsejson = require('parsejson');
var parseqs = require('parseqs');

/**
 * Module exports.
 */

module.exports = Socket;

/**
 * Socket constructor.
 *
 * @param {String|Object} uri or options
 * @param {Object} options
 * @api public
 */

function Socket (uri, opts) {
  if (!(this instanceof Socket)) return new Socket(uri, opts);

  opts = opts || {};

  if (uri && 'object' === typeof uri) {
    opts = uri;
    uri = null;
  }

  if (uri) {
    uri = parseuri(uri);
    opts.hostname = uri.host;
    opts.secure = uri.protocol === 'https' || uri.protocol === 'wss';
    opts.port = uri.port;
    if (uri.query) opts.query = uri.query;
  } else if (opts.host) {
    opts.hostname = parseuri(opts.host).host;
  }

  this.secure = null != opts.secure ? opts.secure
    : (global.location && 'https:' === location.protocol);

  if (opts.hostname && !opts.port) {
    // if no port is specified manually, use the protocol default
    opts.port = this.secure ? '443' : '80';
  }

  this.agent = opts.agent || false;
  this.hostname = opts.hostname ||
    (global.location ? location.hostname : 'localhost');
  this.port = opts.port || (global.location && location.port
      ? location.port
      : (this.secure ? 443 : 80));
  this.query = opts.query || {};
  if ('string' === typeof this.query) this.query = parseqs.decode(this.query);
  this.upgrade = false !== opts.upgrade;
  this.path = (opts.path || '/engine.io').replace(/\/$/, '') + '/';
  this.forceJSONP = !!opts.forceJSONP;
  this.jsonp = false !== opts.jsonp;
  this.forceBase64 = !!opts.forceBase64;
  this.enablesXDR = !!opts.enablesXDR;
  this.timestampParam = opts.timestampParam || 't';
  this.timestampRequests = opts.timestampRequests;
  this.transports = opts.transports || ['polling', 'websocket'];
  this.readyState = '';
  this.writeBuffer = [];
  this.prevBufferLen = 0;
  this.policyPort = opts.policyPort || 843;
  this.rememberUpgrade = opts.rememberUpgrade || false;
  this.binaryType = null;
  this.onlyBinaryUpgrades = opts.onlyBinaryUpgrades;
  this.perMessageDeflate = false !== opts.perMessageDeflate ? (opts.perMessageDeflate || {}) : false;

  if (true === this.perMessageDeflate) this.perMessageDeflate = {};
  if (this.perMessageDeflate && null == this.perMessageDeflate.threshold) {
    this.perMessageDeflate.threshold = 1024;
  }

  // SSL options for Node.js client
  this.pfx = opts.pfx || null;
  this.key = opts.key || null;
  this.passphrase = opts.passphrase || null;
  this.cert = opts.cert || null;
  this.ca = opts.ca || null;
  this.ciphers = opts.ciphers || null;
  this.rejectUnauthorized = opts.rejectUnauthorized === undefined ? null : opts.rejectUnauthorized;
  this.forceNode = !!opts.forceNode;

  // other options for Node.js client
  var freeGlobal = typeof global === 'object' && global;
  if (freeGlobal.global === freeGlobal) {
    if (opts.extraHeaders && Object.keys(opts.extraHeaders).length > 0) {
      this.extraHeaders = opts.extraHeaders;
    }

    if (opts.localAddress) {
      this.localAddress = opts.localAddress;
    }
  }

  // set on handshake
  this.id = null;
  this.upgrades = null;
  this.pingInterval = null;
  this.pingTimeout = null;

  // set on heartbeat
  this.pingIntervalTimer = null;
  this.pingTimeoutTimer = null;

  this.open();
}

Socket.priorWebsocketSuccess = false;

/**
 * Mix in `Emitter`.
 */

Emitter(Socket.prototype);

/**
 * Protocol version.
 *
 * @api public
 */

Socket.protocol = parser.protocol; // this is an int

/**
 * Expose deps for legacy compatibility
 * and standalone browser access.
 */

Socket.Socket = Socket;
Socket.Transport = require('./transport');
Socket.transports = require('./transports/index');
Socket.parser = require('engine.io-parser');

/**
 * Creates transport of the given type.
 *
 * @param {String} transport name
 * @return {Transport}
 * @api private
 */

Socket.prototype.createTransport = function (name) {
  debug('creating transport "%s"', name);
  var query = clone(this.query);

  // append engine.io protocol identifier
  query.EIO = parser.protocol;

  // transport name
  query.transport = name;

  // session id if we already have one
  if (this.id) query.sid = this.id;

  var transport = new transports[name]({
    agent: this.agent,
    hostname: this.hostname,
    port: this.port,
    secure: this.secure,
    path: this.path,
    query: query,
    forceJSONP: this.forceJSONP,
    jsonp: this.jsonp,
    forceBase64: this.forceBase64,
    enablesXDR: this.enablesXDR,
    timestampRequests: this.timestampRequests,
    timestampParam: this.timestampParam,
    policyPort: this.policyPort,
    socket: this,
    pfx: this.pfx,
    key: this.key,
    passphrase: this.passphrase,
    cert: this.cert,
    ca: this.ca,
    ciphers: this.ciphers,
    rejectUnauthorized: this.rejectUnauthorized,
    perMessageDeflate: this.perMessageDeflate,
    extraHeaders: this.extraHeaders,
    forceNode: this.forceNode,
    localAddress: this.localAddress
  });

  return transport;
};

function clone (obj) {
  var o = {};
  for (var i in obj) {
    if (obj.hasOwnProperty(i)) {
      o[i] = obj[i];
    }
  }
  return o;
}

/**
 * Initializes transport to use and starts probe.
 *
 * @api private
 */
Socket.prototype.open = function () {
  var transport;
  if (this.rememberUpgrade && Socket.priorWebsocketSuccess && this.transports.indexOf('websocket') !== -1) {
    transport = 'websocket';
  } else if (0 === this.transports.length) {
    // Emit error on next tick so it can be listened to
    var self = this;
    setTimeout(function () {
      self.emit('error', 'No transports available');
    }, 0);
    return;
  } else {
    transport = this.transports[0];
  }
  this.readyState = 'opening';

  // Retry with the next transport if the transport is disabled (jsonp: false)
  try {
    transport = this.createTransport(transport);
  } catch (e) {
    this.transports.shift();
    this.open();
    return;
  }

  transport.open();
  this.setTransport(transport);
};

/**
 * Sets the current transport. Disables the existing one (if any).
 *
 * @api private
 */

Socket.prototype.setTransport = function (transport) {
  debug('setting transport %s', transport.name);
  var self = this;

  if (this.transport) {
    debug('clearing existing transport %s', this.transport.name);
    this.transport.removeAllListeners();
  }

  // set up transport
  this.transport = transport;

  // set up transport listeners
  transport
  .on('drain', function () {
    self.onDrain();
  })
  .on('packet', function (packet) {
    self.onPacket(packet);
  })
  .on('error', function (e) {
    self.onError(e);
  })
  .on('close', function () {
    self.onClose('transport close');
  });
};

/**
 * Probes a transport.
 *
 * @param {String} transport name
 * @api private
 */

Socket.prototype.probe = function (name) {
  debug('probing transport "%s"', name);
  var transport = this.createTransport(name, { probe: 1 });
  var failed = false;
  var self = this;

  Socket.priorWebsocketSuccess = false;

  function onTransportOpen () {
    if (self.onlyBinaryUpgrades) {
      var upgradeLosesBinary = !this.supportsBinary && self.transport.supportsBinary;
      failed = failed || upgradeLosesBinary;
    }
    if (failed) return;

    debug('probe transport "%s" opened', name);
    transport.send([{ type: 'ping', data: 'probe' }]);
    transport.once('packet', function (msg) {
      if (failed) return;
      if ('pong' === msg.type && 'probe' === msg.data) {
        debug('probe transport "%s" pong', name);
        self.upgrading = true;
        self.emit('upgrading', transport);
        if (!transport) return;
        Socket.priorWebsocketSuccess = 'websocket' === transport.name;

        debug('pausing current transport "%s"', self.transport.name);
        self.transport.pause(function () {
          if (failed) return;
          if ('closed' === self.readyState) return;
          debug('changing transport and sending upgrade packet');

          cleanup();

          self.setTransport(transport);
          transport.send([{ type: 'upgrade' }]);
          self.emit('upgrade', transport);
          transport = null;
          self.upgrading = false;
          self.flush();
        });
      } else {
        debug('probe transport "%s" failed', name);
        var err = new Error('probe error');
        err.transport = transport.name;
        self.emit('upgradeError', err);
      }
    });
  }

  function freezeTransport () {
    if (failed) return;

    // Any callback called by transport should be ignored since now
    failed = true;

    cleanup();

    transport.close();
    transport = null;
  }

  // Handle any error that happens while probing
  function onerror (err) {
    var error = new Error('probe error: ' + err);
    error.transport = transport.name;

    freezeTransport();

    debug('probe transport "%s" failed because of error: %s', name, err);

    self.emit('upgradeError', error);
  }

  function onTransportClose () {
    onerror('transport closed');
  }

  // When the socket is closed while we're probing
  function onclose () {
    onerror('socket closed');
  }

  // When the socket is upgraded while we're probing
  function onupgrade (to) {
    if (transport && to.name !== transport.name) {
      debug('"%s" works - aborting "%s"', to.name, transport.name);
      freezeTransport();
    }
  }

  // Remove all listeners on the transport and on self
  function cleanup () {
    transport.removeListener('open', onTransportOpen);
    transport.removeListener('error', onerror);
    transport.removeListener('close', onTransportClose);
    self.removeListener('close', onclose);
    self.removeListener('upgrading', onupgrade);
  }

  transport.once('open', onTransportOpen);
  transport.once('error', onerror);
  transport.once('close', onTransportClose);

  this.once('close', onclose);
  this.once('upgrading', onupgrade);

  transport.open();
};

/**
 * Called when connection is deemed open.
 *
 * @api public
 */

Socket.prototype.onOpen = function () {
  debug('socket open');
  this.readyState = 'open';
  Socket.priorWebsocketSuccess = 'websocket' === this.transport.name;
  this.emit('open');
  this.flush();

  // we check for `readyState` in case an `open`
  // listener already closed the socket
  if ('open' === this.readyState && this.upgrade && this.transport.pause) {
    debug('starting upgrade probes');
    for (var i = 0, l = this.upgrades.length; i < l; i++) {
      this.probe(this.upgrades[i]);
    }
  }
};

/**
 * Handles a packet.
 *
 * @api private
 */

Socket.prototype.onPacket = function (packet) {
  if ('opening' === this.readyState || 'open' === this.readyState ||
      'closing' === this.readyState) {
    debug('socket receive: type "%s", data "%s"', packet.type, packet.data);

    this.emit('packet', packet);

    // Socket is live - any packet counts
    this.emit('heartbeat');

    switch (packet.type) {
      case 'open':
        this.onHandshake(parsejson(packet.data));
        break;

      case 'pong':
        this.setPing();
        this.emit('pong');
        break;

      case 'error':
        var err = new Error('server error');
        err.code = packet.data;
        this.onError(err);
        break;

      case 'message':
        this.emit('data', packet.data);
        this.emit('message', packet.data);
        break;
    }
  } else {
    debug('packet received with socket readyState "%s"', this.readyState);
  }
};

/**
 * Called upon handshake completion.
 *
 * @param {Object} handshake obj
 * @api private
 */

Socket.prototype.onHandshake = function (data) {
  this.emit('handshake', data);
  this.id = data.sid;
  this.transport.query.sid = data.sid;
  this.upgrades = this.filterUpgrades(data.upgrades);
  this.pingInterval = data.pingInterval;
  this.pingTimeout = data.pingTimeout;
  this.onOpen();
  // In case open handler closes socket
  if ('closed' === this.readyState) return;
  this.setPing();

  // Prolong liveness of socket on heartbeat
  this.removeListener('heartbeat', this.onHeartbeat);
  this.on('heartbeat', this.onHeartbeat);
};

/**
 * Resets ping timeout.
 *
 * @api private
 */

Socket.prototype.onHeartbeat = function (timeout) {
  clearTimeout(this.pingTimeoutTimer);
  var self = this;
  self.pingTimeoutTimer = setTimeout(function () {
    if ('closed' === self.readyState) return;
    self.onClose('ping timeout');
  }, timeout || (self.pingInterval + self.pingTimeout));
};

/**
 * Pings server every `this.pingInterval` and expects response
 * within `this.pingTimeout` or closes connection.
 *
 * @api private
 */

Socket.prototype.setPing = function () {
  var self = this;
  clearTimeout(self.pingIntervalTimer);
  self.pingIntervalTimer = setTimeout(function () {
    debug('writing ping packet - expecting pong within %sms', self.pingTimeout);
    self.ping();
    self.onHeartbeat(self.pingTimeout);
  }, self.pingInterval);
};

/**
* Sends a ping packet.
*
* @api private
*/

Socket.prototype.ping = function () {
  var self = this;
  this.sendPacket('ping', function () {
    self.emit('ping');
  });
};

/**
 * Called on `drain` event
 *
 * @api private
 */

Socket.prototype.onDrain = function () {
  this.writeBuffer.splice(0, this.prevBufferLen);

  // setting prevBufferLen = 0 is very important
  // for example, when upgrading, upgrade packet is sent over,
  // and a nonzero prevBufferLen could cause problems on `drain`
  this.prevBufferLen = 0;

  if (0 === this.writeBuffer.length) {
    this.emit('drain');
  } else {
    this.flush();
  }
};

/**
 * Flush write buffers.
 *
 * @api private
 */

Socket.prototype.flush = function () {
  if ('closed' !== this.readyState && this.transport.writable &&
    !this.upgrading && this.writeBuffer.length) {
    debug('flushing %d packets in socket', this.writeBuffer.length);
    this.transport.send(this.writeBuffer);
    // keep track of current length of writeBuffer
    // splice writeBuffer and callbackBuffer on `drain`
    this.prevBufferLen = this.writeBuffer.length;
    this.emit('flush');
  }
};

/**
 * Sends a message.
 *
 * @param {String} message.
 * @param {Function} callback function.
 * @param {Object} options.
 * @return {Socket} for chaining.
 * @api public
 */

Socket.prototype.write =
Socket.prototype.send = function (msg, options, fn) {
  this.sendPacket('message', msg, options, fn);
  return this;
};

/**
 * Sends a packet.
 *
 * @param {String} packet type.
 * @param {String} data.
 * @param {Object} options.
 * @param {Function} callback function.
 * @api private
 */

Socket.prototype.sendPacket = function (type, data, options, fn) {
  if ('function' === typeof data) {
    fn = data;
    data = undefined;
  }

  if ('function' === typeof options) {
    fn = options;
    options = null;
  }

  if ('closing' === this.readyState || 'closed' === this.readyState) {
    return;
  }

  options = options || {};
  options.compress = false !== options.compress;

  var packet = {
    type: type,
    data: data,
    options: options
  };
  this.emit('packetCreate', packet);
  this.writeBuffer.push(packet);
  if (fn) this.once('flush', fn);
  this.flush();
};

/**
 * Closes the connection.
 *
 * @api private
 */

Socket.prototype.close = function () {
  if ('opening' === this.readyState || 'open' === this.readyState) {
    this.readyState = 'closing';

    var self = this;

    if (this.writeBuffer.length) {
      this.once('drain', function () {
        if (this.upgrading) {
          waitForUpgrade();
        } else {
          close();
        }
      });
    } else if (this.upgrading) {
      waitForUpgrade();
    } else {
      close();
    }
  }

  function close () {
    self.onClose('forced close');
    debug('socket closing - telling transport to close');
    self.transport.close();
  }

  function cleanupAndClose () {
    self.removeListener('upgrade', cleanupAndClose);
    self.removeListener('upgradeError', cleanupAndClose);
    close();
  }

  function waitForUpgrade () {
    // wait for upgrade to finish since we can't send packets while pausing a transport
    self.once('upgrade', cleanupAndClose);
    self.once('upgradeError', cleanupAndClose);
  }

  return this;
};

/**
 * Called upon transport error
 *
 * @api private
 */

Socket.prototype.onError = function (err) {
  debug('socket error %j', err);
  Socket.priorWebsocketSuccess = false;
  this.emit('error', err);
  this.onClose('transport error', err);
};

/**
 * Called upon transport close.
 *
 * @api private
 */

Socket.prototype.onClose = function (reason, desc) {
  if ('opening' === this.readyState || 'open' === this.readyState || 'closing' === this.readyState) {
    debug('socket close with reason: "%s"', reason);
    var self = this;

    // clear timers
    clearTimeout(this.pingIntervalTimer);
    clearTimeout(this.pingTimeoutTimer);

    // stop event from firing again for transport
    this.transport.removeAllListeners('close');

    // ensure transport won't stay open
    this.transport.close();

    // ignore further transport communication
    this.transport.removeAllListeners();

    // set ready state
    this.readyState = 'closed';

    // clear session id
    this.id = null;

    // emit close event
    this.emit('close', reason, desc);

    // clean buffers after, so users can still
    // grab the buffers on `close` event
    self.writeBuffer = [];
    self.prevBufferLen = 0;
  }
};

/**
 * Filters upgrades, returning only those matching client transports.
 *
 * @param {Array} server upgrades
 * @api private
 *
 */

Socket.prototype.filterUpgrades = function (upgrades) {
  var filteredUpgrades = [];
  for (var i = 0, j = upgrades.length; i < j; i++) {
    if (~index(this.transports, upgrades[i])) filteredUpgrades.push(upgrades[i]);
  }
  return filteredUpgrades;
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./transport":337,"./transports/index":338,"component-emitter":35,"debug":344,"engine.io-parser":347,"indexof":355,"parsejson":363,"parseqs":364,"parseuri":365}],337:[function(require,module,exports){
/**
 * Module dependencies.
 */

var parser = require('engine.io-parser');
var Emitter = require('component-emitter');

/**
 * Module exports.
 */

module.exports = Transport;

/**
 * Transport abstract constructor.
 *
 * @param {Object} options.
 * @api private
 */

function Transport (opts) {
  this.path = opts.path;
  this.hostname = opts.hostname;
  this.port = opts.port;
  this.secure = opts.secure;
  this.query = opts.query;
  this.timestampParam = opts.timestampParam;
  this.timestampRequests = opts.timestampRequests;
  this.readyState = '';
  this.agent = opts.agent || false;
  this.socket = opts.socket;
  this.enablesXDR = opts.enablesXDR;

  // SSL options for Node.js client
  this.pfx = opts.pfx;
  this.key = opts.key;
  this.passphrase = opts.passphrase;
  this.cert = opts.cert;
  this.ca = opts.ca;
  this.ciphers = opts.ciphers;
  this.rejectUnauthorized = opts.rejectUnauthorized;
  this.forceNode = opts.forceNode;

  // other options for Node.js client
  this.extraHeaders = opts.extraHeaders;
  this.localAddress = opts.localAddress;
}

/**
 * Mix in `Emitter`.
 */

Emitter(Transport.prototype);

/**
 * Emits an error.
 *
 * @param {String} str
 * @return {Transport} for chaining
 * @api public
 */

Transport.prototype.onError = function (msg, desc) {
  var err = new Error(msg);
  err.type = 'TransportError';
  err.description = desc;
  this.emit('error', err);
  return this;
};

/**
 * Opens the transport.
 *
 * @api public
 */

Transport.prototype.open = function () {
  if ('closed' === this.readyState || '' === this.readyState) {
    this.readyState = 'opening';
    this.doOpen();
  }

  return this;
};

/**
 * Closes the transport.
 *
 * @api private
 */

Transport.prototype.close = function () {
  if ('opening' === this.readyState || 'open' === this.readyState) {
    this.doClose();
    this.onClose();
  }

  return this;
};

/**
 * Sends multiple packets.
 *
 * @param {Array} packets
 * @api private
 */

Transport.prototype.send = function (packets) {
  if ('open' === this.readyState) {
    this.write(packets);
  } else {
    throw new Error('Transport not open');
  }
};

/**
 * Called upon open
 *
 * @api private
 */

Transport.prototype.onOpen = function () {
  this.readyState = 'open';
  this.writable = true;
  this.emit('open');
};

/**
 * Called with data.
 *
 * @param {String} data
 * @api private
 */

Transport.prototype.onData = function (data) {
  var packet = parser.decodePacket(data, this.socket.binaryType);
  this.onPacket(packet);
};

/**
 * Called with a decoded packet.
 */

Transport.prototype.onPacket = function (packet) {
  this.emit('packet', packet);
};

/**
 * Called upon close.
 *
 * @api private
 */

Transport.prototype.onClose = function () {
  this.readyState = 'closed';
  this.emit('close');
};

},{"component-emitter":35,"engine.io-parser":347}],338:[function(require,module,exports){
(function (global){
/**
 * Module dependencies
 */

var XMLHttpRequest = require('xmlhttprequest-ssl');
var XHR = require('./polling-xhr');
var JSONP = require('./polling-jsonp');
var websocket = require('./websocket');

/**
 * Export transports.
 */

exports.polling = polling;
exports.websocket = websocket;

/**
 * Polling transport polymorphic constructor.
 * Decides on xhr vs jsonp based on feature detection.
 *
 * @api private
 */

function polling (opts) {
  var xhr;
  var xd = false;
  var xs = false;
  var jsonp = false !== opts.jsonp;

  if (global.location) {
    var isSSL = 'https:' === location.protocol;
    var port = location.port;

    // some user agents have empty `location.port`
    if (!port) {
      port = isSSL ? 443 : 80;
    }

    xd = opts.hostname !== location.hostname || port !== opts.port;
    xs = opts.secure !== isSSL;
  }

  opts.xdomain = xd;
  opts.xscheme = xs;
  xhr = new XMLHttpRequest(opts);

  if ('open' in xhr && !opts.forceJSONP) {
    return new XHR(opts);
  } else {
    if (!jsonp) throw new Error('JSONP disabled');
    return new JSONP(opts);
  }
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./polling-jsonp":339,"./polling-xhr":340,"./websocket":342,"xmlhttprequest-ssl":343}],339:[function(require,module,exports){
(function (global){

/**
 * Module requirements.
 */

var Polling = require('./polling');
var inherit = require('component-inherit');

/**
 * Module exports.
 */

module.exports = JSONPPolling;

/**
 * Cached regular expressions.
 */

var rNewline = /\n/g;
var rEscapedNewline = /\\n/g;

/**
 * Global JSONP callbacks.
 */

var callbacks;

/**
 * Noop.
 */

function empty () { }

/**
 * JSONP Polling constructor.
 *
 * @param {Object} opts.
 * @api public
 */

function JSONPPolling (opts) {
  Polling.call(this, opts);

  this.query = this.query || {};

  // define global callbacks array if not present
  // we do this here (lazily) to avoid unneeded global pollution
  if (!callbacks) {
    // we need to consider multiple engines in the same page
    if (!global.___eio) global.___eio = [];
    callbacks = global.___eio;
  }

  // callback identifier
  this.index = callbacks.length;

  // add callback to jsonp global
  var self = this;
  callbacks.push(function (msg) {
    self.onData(msg);
  });

  // append to query string
  this.query.j = this.index;

  // prevent spurious errors from being emitted when the window is unloaded
  if (global.document && global.addEventListener) {
    global.addEventListener('beforeunload', function () {
      if (self.script) self.script.onerror = empty;
    }, false);
  }
}

/**
 * Inherits from Polling.
 */

inherit(JSONPPolling, Polling);

/*
 * JSONP only supports binary as base64 encoded strings
 */

JSONPPolling.prototype.supportsBinary = false;

/**
 * Closes the socket.
 *
 * @api private
 */

JSONPPolling.prototype.doClose = function () {
  if (this.script) {
    this.script.parentNode.removeChild(this.script);
    this.script = null;
  }

  if (this.form) {
    this.form.parentNode.removeChild(this.form);
    this.form = null;
    this.iframe = null;
  }

  Polling.prototype.doClose.call(this);
};

/**
 * Starts a poll cycle.
 *
 * @api private
 */

JSONPPolling.prototype.doPoll = function () {
  var self = this;
  var script = document.createElement('script');

  if (this.script) {
    this.script.parentNode.removeChild(this.script);
    this.script = null;
  }

  script.async = true;
  script.src = this.uri();
  script.onerror = function (e) {
    self.onError('jsonp poll error', e);
  };

  var insertAt = document.getElementsByTagName('script')[0];
  if (insertAt) {
    insertAt.parentNode.insertBefore(script, insertAt);
  } else {
    (document.head || document.body).appendChild(script);
  }
  this.script = script;

  var isUAgecko = 'undefined' !== typeof navigator && /gecko/i.test(navigator.userAgent);

  if (isUAgecko) {
    setTimeout(function () {
      var iframe = document.createElement('iframe');
      document.body.appendChild(iframe);
      document.body.removeChild(iframe);
    }, 100);
  }
};

/**
 * Writes with a hidden iframe.
 *
 * @param {String} data to send
 * @param {Function} called upon flush.
 * @api private
 */

JSONPPolling.prototype.doWrite = function (data, fn) {
  var self = this;

  if (!this.form) {
    var form = document.createElement('form');
    var area = document.createElement('textarea');
    var id = this.iframeId = 'eio_iframe_' + this.index;
    var iframe;

    form.className = 'socketio';
    form.style.position = 'absolute';
    form.style.top = '-1000px';
    form.style.left = '-1000px';
    form.target = id;
    form.method = 'POST';
    form.setAttribute('accept-charset', 'utf-8');
    area.name = 'd';
    form.appendChild(area);
    document.body.appendChild(form);

    this.form = form;
    this.area = area;
  }

  this.form.action = this.uri();

  function complete () {
    initIframe();
    fn();
  }

  function initIframe () {
    if (self.iframe) {
      try {
        self.form.removeChild(self.iframe);
      } catch (e) {
        self.onError('jsonp polling iframe removal error', e);
      }
    }

    try {
      // ie6 dynamic iframes with target="" support (thanks Chris Lambacher)
      var html = '<iframe src="javascript:0" name="' + self.iframeId + '">';
      iframe = document.createElement(html);
    } catch (e) {
      iframe = document.createElement('iframe');
      iframe.name = self.iframeId;
      iframe.src = 'javascript:0';
    }

    iframe.id = self.iframeId;

    self.form.appendChild(iframe);
    self.iframe = iframe;
  }

  initIframe();

  // escape \n to prevent it from being converted into \r\n by some UAs
  // double escaping is required for escaped new lines because unescaping of new lines can be done safely on server-side
  data = data.replace(rEscapedNewline, '\\\n');
  this.area.value = data.replace(rNewline, '\\n');

  try {
    this.form.submit();
  } catch (e) {}

  if (this.iframe.attachEvent) {
    this.iframe.onreadystatechange = function () {
      if (self.iframe.readyState === 'complete') {
        complete();
      }
    };
  } else {
    this.iframe.onload = complete;
  }
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./polling":341,"component-inherit":36}],340:[function(require,module,exports){
(function (global){
/**
 * Module requirements.
 */

var XMLHttpRequest = require('xmlhttprequest-ssl');
var Polling = require('./polling');
var Emitter = require('component-emitter');
var inherit = require('component-inherit');
var debug = require('debug')('engine.io-client:polling-xhr');

/**
 * Module exports.
 */

module.exports = XHR;
module.exports.Request = Request;

/**
 * Empty function
 */

function empty () {}

/**
 * XHR Polling constructor.
 *
 * @param {Object} opts
 * @api public
 */

function XHR (opts) {
  Polling.call(this, opts);
  this.requestTimeout = opts.requestTimeout;

  if (global.location) {
    var isSSL = 'https:' === location.protocol;
    var port = location.port;

    // some user agents have empty `location.port`
    if (!port) {
      port = isSSL ? 443 : 80;
    }

    this.xd = opts.hostname !== global.location.hostname ||
      port !== opts.port;
    this.xs = opts.secure !== isSSL;
  } else {
    this.extraHeaders = opts.extraHeaders;
  }
}

/**
 * Inherits from Polling.
 */

inherit(XHR, Polling);

/**
 * XHR supports binary
 */

XHR.prototype.supportsBinary = true;

/**
 * Creates a request.
 *
 * @param {String} method
 * @api private
 */

XHR.prototype.request = function (opts) {
  opts = opts || {};
  opts.uri = this.uri();
  opts.xd = this.xd;
  opts.xs = this.xs;
  opts.agent = this.agent || false;
  opts.supportsBinary = this.supportsBinary;
  opts.enablesXDR = this.enablesXDR;

  // SSL options for Node.js client
  opts.pfx = this.pfx;
  opts.key = this.key;
  opts.passphrase = this.passphrase;
  opts.cert = this.cert;
  opts.ca = this.ca;
  opts.ciphers = this.ciphers;
  opts.rejectUnauthorized = this.rejectUnauthorized;
  opts.requestTimeout = this.requestTimeout;

  // other options for Node.js client
  opts.extraHeaders = this.extraHeaders;

  return new Request(opts);
};

/**
 * Sends data.
 *
 * @param {String} data to send.
 * @param {Function} called upon flush.
 * @api private
 */

XHR.prototype.doWrite = function (data, fn) {
  var isBinary = typeof data !== 'string' && data !== undefined;
  var req = this.request({ method: 'POST', data: data, isBinary: isBinary });
  var self = this;
  req.on('success', fn);
  req.on('error', function (err) {
    self.onError('xhr post error', err);
  });
  this.sendXhr = req;
};

/**
 * Starts a poll cycle.
 *
 * @api private
 */

XHR.prototype.doPoll = function () {
  debug('xhr poll');
  var req = this.request();
  var self = this;
  req.on('data', function (data) {
    self.onData(data);
  });
  req.on('error', function (err) {
    self.onError('xhr poll error', err);
  });
  this.pollXhr = req;
};

/**
 * Request constructor
 *
 * @param {Object} options
 * @api public
 */

function Request (opts) {
  this.method = opts.method || 'GET';
  this.uri = opts.uri;
  this.xd = !!opts.xd;
  this.xs = !!opts.xs;
  this.async = false !== opts.async;
  this.data = undefined !== opts.data ? opts.data : null;
  this.agent = opts.agent;
  this.isBinary = opts.isBinary;
  this.supportsBinary = opts.supportsBinary;
  this.enablesXDR = opts.enablesXDR;
  this.requestTimeout = opts.requestTimeout;

  // SSL options for Node.js client
  this.pfx = opts.pfx;
  this.key = opts.key;
  this.passphrase = opts.passphrase;
  this.cert = opts.cert;
  this.ca = opts.ca;
  this.ciphers = opts.ciphers;
  this.rejectUnauthorized = opts.rejectUnauthorized;

  // other options for Node.js client
  this.extraHeaders = opts.extraHeaders;

  this.create();
}

/**
 * Mix in `Emitter`.
 */

Emitter(Request.prototype);

/**
 * Creates the XHR object and sends the request.
 *
 * @api private
 */

Request.prototype.create = function () {
  var opts = { agent: this.agent, xdomain: this.xd, xscheme: this.xs, enablesXDR: this.enablesXDR };

  // SSL options for Node.js client
  opts.pfx = this.pfx;
  opts.key = this.key;
  opts.passphrase = this.passphrase;
  opts.cert = this.cert;
  opts.ca = this.ca;
  opts.ciphers = this.ciphers;
  opts.rejectUnauthorized = this.rejectUnauthorized;

  var xhr = this.xhr = new XMLHttpRequest(opts);
  var self = this;

  try {
    debug('xhr open %s: %s', this.method, this.uri);
    xhr.open(this.method, this.uri, this.async);
    try {
      if (this.extraHeaders) {
        xhr.setDisableHeaderCheck(true);
        for (var i in this.extraHeaders) {
          if (this.extraHeaders.hasOwnProperty(i)) {
            xhr.setRequestHeader(i, this.extraHeaders[i]);
          }
        }
      }
    } catch (e) {}
    if (this.supportsBinary) {
      // This has to be done after open because Firefox is stupid
      // http://stackoverflow.com/questions/13216903/get-binary-data-with-xmlhttprequest-in-a-firefox-extension
      xhr.responseType = 'arraybuffer';
    }

    if ('POST' === this.method) {
      try {
        if (this.isBinary) {
          xhr.setRequestHeader('Content-type', 'application/octet-stream');
        } else {
          xhr.setRequestHeader('Content-type', 'text/plain;charset=UTF-8');
        }
      } catch (e) {}
    }

    try {
      xhr.setRequestHeader('Accept', '*/*');
    } catch (e) {}

    // ie6 check
    if ('withCredentials' in xhr) {
      xhr.withCredentials = true;
    }

    if (this.requestTimeout) {
      xhr.timeout = this.requestTimeout;
    }

    if (this.hasXDR()) {
      xhr.onload = function () {
        self.onLoad();
      };
      xhr.onerror = function () {
        self.onError(xhr.responseText);
      };
    } else {
      xhr.onreadystatechange = function () {
        if (4 !== xhr.readyState) return;
        if (200 === xhr.status || 1223 === xhr.status) {
          self.onLoad();
        } else {
          // make sure the `error` event handler that's user-set
          // does not throw in the same tick and gets caught here
          setTimeout(function () {
            self.onError(xhr.status);
          }, 0);
        }
      };
    }

    debug('xhr data %s', this.data);
    xhr.send(this.data);
  } catch (e) {
    // Need to defer since .create() is called directly fhrom the constructor
    // and thus the 'error' event can only be only bound *after* this exception
    // occurs.  Therefore, also, we cannot throw here at all.
    setTimeout(function () {
      self.onError(e);
    }, 0);
    return;
  }

  if (global.document) {
    this.index = Request.requestsCount++;
    Request.requests[this.index] = this;
  }
};

/**
 * Called upon successful response.
 *
 * @api private
 */

Request.prototype.onSuccess = function () {
  this.emit('success');
  this.cleanup();
};

/**
 * Called if we have data.
 *
 * @api private
 */

Request.prototype.onData = function (data) {
  this.emit('data', data);
  this.onSuccess();
};

/**
 * Called upon error.
 *
 * @api private
 */

Request.prototype.onError = function (err) {
  this.emit('error', err);
  this.cleanup(true);
};

/**
 * Cleans up house.
 *
 * @api private
 */

Request.prototype.cleanup = function (fromError) {
  if ('undefined' === typeof this.xhr || null === this.xhr) {
    return;
  }
  // xmlhttprequest
  if (this.hasXDR()) {
    this.xhr.onload = this.xhr.onerror = empty;
  } else {
    this.xhr.onreadystatechange = empty;
  }

  if (fromError) {
    try {
      this.xhr.abort();
    } catch (e) {}
  }

  if (global.document) {
    delete Request.requests[this.index];
  }

  this.xhr = null;
};

/**
 * Called upon load.
 *
 * @api private
 */

Request.prototype.onLoad = function () {
  var data;
  try {
    var contentType;
    try {
      contentType = this.xhr.getResponseHeader('Content-Type').split(';')[0];
    } catch (e) {}
    if (contentType === 'application/octet-stream') {
      data = this.xhr.response || this.xhr.responseText;
    } else {
      if (!this.supportsBinary) {
        data = this.xhr.responseText;
      } else {
        try {
          data = String.fromCharCode.apply(null, new Uint8Array(this.xhr.response));
        } catch (e) {
          var ui8Arr = new Uint8Array(this.xhr.response);
          var dataArray = [];
          for (var idx = 0, length = ui8Arr.length; idx < length; idx++) {
            dataArray.push(ui8Arr[idx]);
          }

          data = String.fromCharCode.apply(null, dataArray);
        }
      }
    }
  } catch (e) {
    this.onError(e);
  }
  if (null != data) {
    this.onData(data);
  }
};

/**
 * Check if it has XDomainRequest.
 *
 * @api private
 */

Request.prototype.hasXDR = function () {
  return 'undefined' !== typeof global.XDomainRequest && !this.xs && this.enablesXDR;
};

/**
 * Aborts the request.
 *
 * @api public
 */

Request.prototype.abort = function () {
  this.cleanup();
};

/**
 * Aborts pending requests when unloading the window. This is needed to prevent
 * memory leaks (e.g. when using IE) and to ensure that no spurious error is
 * emitted.
 */

Request.requestsCount = 0;
Request.requests = {};

if (global.document) {
  if (global.attachEvent) {
    global.attachEvent('onunload', unloadHandler);
  } else if (global.addEventListener) {
    global.addEventListener('beforeunload', unloadHandler, false);
  }
}

function unloadHandler () {
  for (var i in Request.requests) {
    if (Request.requests.hasOwnProperty(i)) {
      Request.requests[i].abort();
    }
  }
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./polling":341,"component-emitter":35,"component-inherit":36,"debug":344,"xmlhttprequest-ssl":343}],341:[function(require,module,exports){
/**
 * Module dependencies.
 */

var Transport = require('../transport');
var parseqs = require('parseqs');
var parser = require('engine.io-parser');
var inherit = require('component-inherit');
var yeast = require('yeast');
var debug = require('debug')('engine.io-client:polling');

/**
 * Module exports.
 */

module.exports = Polling;

/**
 * Is XHR2 supported?
 */

var hasXHR2 = (function () {
  var XMLHttpRequest = require('xmlhttprequest-ssl');
  var xhr = new XMLHttpRequest({ xdomain: false });
  return null != xhr.responseType;
})();

/**
 * Polling interface.
 *
 * @param {Object} opts
 * @api private
 */

function Polling (opts) {
  var forceBase64 = (opts && opts.forceBase64);
  if (!hasXHR2 || forceBase64) {
    this.supportsBinary = false;
  }
  Transport.call(this, opts);
}

/**
 * Inherits from Transport.
 */

inherit(Polling, Transport);

/**
 * Transport name.
 */

Polling.prototype.name = 'polling';

/**
 * Opens the socket (triggers polling). We write a PING message to determine
 * when the transport is open.
 *
 * @api private
 */

Polling.prototype.doOpen = function () {
  this.poll();
};

/**
 * Pauses polling.
 *
 * @param {Function} callback upon buffers are flushed and transport is paused
 * @api private
 */

Polling.prototype.pause = function (onPause) {
  var self = this;

  this.readyState = 'pausing';

  function pause () {
    debug('paused');
    self.readyState = 'paused';
    onPause();
  }

  if (this.polling || !this.writable) {
    var total = 0;

    if (this.polling) {
      debug('we are currently polling - waiting to pause');
      total++;
      this.once('pollComplete', function () {
        debug('pre-pause polling complete');
        --total || pause();
      });
    }

    if (!this.writable) {
      debug('we are currently writing - waiting to pause');
      total++;
      this.once('drain', function () {
        debug('pre-pause writing complete');
        --total || pause();
      });
    }
  } else {
    pause();
  }
};

/**
 * Starts polling cycle.
 *
 * @api public
 */

Polling.prototype.poll = function () {
  debug('polling');
  this.polling = true;
  this.doPoll();
  this.emit('poll');
};

/**
 * Overloads onData to detect payloads.
 *
 * @api private
 */

Polling.prototype.onData = function (data) {
  var self = this;
  debug('polling got data %s', data);
  var callback = function (packet, index, total) {
    // if its the first message we consider the transport open
    if ('opening' === self.readyState) {
      self.onOpen();
    }

    // if its a close packet, we close the ongoing requests
    if ('close' === packet.type) {
      self.onClose();
      return false;
    }

    // otherwise bypass onData and handle the message
    self.onPacket(packet);
  };

  // decode payload
  parser.decodePayload(data, this.socket.binaryType, callback);

  // if an event did not trigger closing
  if ('closed' !== this.readyState) {
    // if we got data we're not polling
    this.polling = false;
    this.emit('pollComplete');

    if ('open' === this.readyState) {
      this.poll();
    } else {
      debug('ignoring poll - transport state "%s"', this.readyState);
    }
  }
};

/**
 * For polling, send a close packet.
 *
 * @api private
 */

Polling.prototype.doClose = function () {
  var self = this;

  function close () {
    debug('writing close packet');
    self.write([{ type: 'close' }]);
  }

  if ('open' === this.readyState) {
    debug('transport open - closing');
    close();
  } else {
    // in case we're trying to close while
    // handshaking is in progress (GH-164)
    debug('transport not open - deferring close');
    this.once('open', close);
  }
};

/**
 * Writes a packets payload.
 *
 * @param {Array} data packets
 * @param {Function} drain callback
 * @api private
 */

Polling.prototype.write = function (packets) {
  var self = this;
  this.writable = false;
  var callbackfn = function () {
    self.writable = true;
    self.emit('drain');
  };

  parser.encodePayload(packets, this.supportsBinary, function (data) {
    self.doWrite(data, callbackfn);
  });
};

/**
 * Generates uri for connection.
 *
 * @api private
 */

Polling.prototype.uri = function () {
  var query = this.query || {};
  var schema = this.secure ? 'https' : 'http';
  var port = '';

  // cache busting is forced
  if (false !== this.timestampRequests) {
    query[this.timestampParam] = yeast();
  }

  if (!this.supportsBinary && !query.sid) {
    query.b64 = 1;
  }

  query = parseqs.encode(query);

  // avoid port if default for schema
  if (this.port && (('https' === schema && Number(this.port) !== 443) ||
     ('http' === schema && Number(this.port) !== 80))) {
    port = ':' + this.port;
  }

  // prepend ? to query
  if (query.length) {
    query = '?' + query;
  }

  var ipv6 = this.hostname.indexOf(':') !== -1;
  return schema + '://' + (ipv6 ? '[' + this.hostname + ']' : this.hostname) + port + this.path + query;
};

},{"../transport":337,"component-inherit":36,"debug":344,"engine.io-parser":347,"parseqs":364,"xmlhttprequest-ssl":343,"yeast":387}],342:[function(require,module,exports){
(function (global){
/**
 * Module dependencies.
 */

var Transport = require('../transport');
var parser = require('engine.io-parser');
var parseqs = require('parseqs');
var inherit = require('component-inherit');
var yeast = require('yeast');
var debug = require('debug')('engine.io-client:websocket');
var BrowserWebSocket = global.WebSocket || global.MozWebSocket;
var NodeWebSocket;
if (typeof window === 'undefined') {
  try {
    NodeWebSocket = require('ws');
  } catch (e) { }
}

/**
 * Get either the `WebSocket` or `MozWebSocket` globals
 * in the browser or try to resolve WebSocket-compatible
 * interface exposed by `ws` for Node-like environment.
 */

var WebSocket = BrowserWebSocket;
if (!WebSocket && typeof window === 'undefined') {
  WebSocket = NodeWebSocket;
}

/**
 * Module exports.
 */

module.exports = WS;

/**
 * WebSocket transport constructor.
 *
 * @api {Object} connection options
 * @api public
 */

function WS (opts) {
  var forceBase64 = (opts && opts.forceBase64);
  if (forceBase64) {
    this.supportsBinary = false;
  }
  this.perMessageDeflate = opts.perMessageDeflate;
  this.usingBrowserWebSocket = BrowserWebSocket && !opts.forceNode;
  if (!this.usingBrowserWebSocket) {
    WebSocket = NodeWebSocket;
  }
  Transport.call(this, opts);
}

/**
 * Inherits from Transport.
 */

inherit(WS, Transport);

/**
 * Transport name.
 *
 * @api public
 */

WS.prototype.name = 'websocket';

/*
 * WebSockets support binary
 */

WS.prototype.supportsBinary = true;

/**
 * Opens socket.
 *
 * @api private
 */

WS.prototype.doOpen = function () {
  if (!this.check()) {
    // let probe timeout
    return;
  }

  var uri = this.uri();
  var protocols = void (0);
  var opts = {
    agent: this.agent,
    perMessageDeflate: this.perMessageDeflate
  };

  // SSL options for Node.js client
  opts.pfx = this.pfx;
  opts.key = this.key;
  opts.passphrase = this.passphrase;
  opts.cert = this.cert;
  opts.ca = this.ca;
  opts.ciphers = this.ciphers;
  opts.rejectUnauthorized = this.rejectUnauthorized;
  if (this.extraHeaders) {
    opts.headers = this.extraHeaders;
  }
  if (this.localAddress) {
    opts.localAddress = this.localAddress;
  }

  try {
    this.ws = this.usingBrowserWebSocket ? new WebSocket(uri) : new WebSocket(uri, protocols, opts);
  } catch (err) {
    return this.emit('error', err);
  }

  if (this.ws.binaryType === undefined) {
    this.supportsBinary = false;
  }

  if (this.ws.supports && this.ws.supports.binary) {
    this.supportsBinary = true;
    this.ws.binaryType = 'nodebuffer';
  } else {
    this.ws.binaryType = 'arraybuffer';
  }

  this.addEventListeners();
};

/**
 * Adds event listeners to the socket
 *
 * @api private
 */

WS.prototype.addEventListeners = function () {
  var self = this;

  this.ws.onopen = function () {
    self.onOpen();
  };
  this.ws.onclose = function () {
    self.onClose();
  };
  this.ws.onmessage = function (ev) {
    self.onData(ev.data);
  };
  this.ws.onerror = function (e) {
    self.onError('websocket error', e);
  };
};

/**
 * Writes data to socket.
 *
 * @param {Array} array of packets.
 * @api private
 */

WS.prototype.write = function (packets) {
  var self = this;
  this.writable = false;

  // encodePacket efficient as it uses WS framing
  // no need for encodePayload
  var total = packets.length;
  for (var i = 0, l = total; i < l; i++) {
    (function (packet) {
      parser.encodePacket(packet, self.supportsBinary, function (data) {
        if (!self.usingBrowserWebSocket) {
          // always create a new object (GH-437)
          var opts = {};
          if (packet.options) {
            opts.compress = packet.options.compress;
          }

          if (self.perMessageDeflate) {
            var len = 'string' === typeof data ? global.Buffer.byteLength(data) : data.length;
            if (len < self.perMessageDeflate.threshold) {
              opts.compress = false;
            }
          }
        }

        // Sometimes the websocket has already been closed but the browser didn't
        // have a chance of informing us about it yet, in that case send will
        // throw an error
        try {
          if (self.usingBrowserWebSocket) {
            // TypeError is thrown when passing the second argument on Safari
            self.ws.send(data);
          } else {
            self.ws.send(data, opts);
          }
        } catch (e) {
          debug('websocket closed before onclose event');
        }

        --total || done();
      });
    })(packets[i]);
  }

  function done () {
    self.emit('flush');

    // fake drain
    // defer to next tick to allow Socket to clear writeBuffer
    setTimeout(function () {
      self.writable = true;
      self.emit('drain');
    }, 0);
  }
};

/**
 * Called upon close
 *
 * @api private
 */

WS.prototype.onClose = function () {
  Transport.prototype.onClose.call(this);
};

/**
 * Closes socket.
 *
 * @api private
 */

WS.prototype.doClose = function () {
  if (typeof this.ws !== 'undefined') {
    this.ws.close();
  }
};

/**
 * Generates uri for connection.
 *
 * @api private
 */

WS.prototype.uri = function () {
  var query = this.query || {};
  var schema = this.secure ? 'wss' : 'ws';
  var port = '';

  // avoid port if default for schema
  if (this.port && (('wss' === schema && Number(this.port) !== 443) ||
    ('ws' === schema && Number(this.port) !== 80))) {
    port = ':' + this.port;
  }

  // append timestamp to URI
  if (this.timestampRequests) {
    query[this.timestampParam] = yeast();
  }

  // communicate binary support capabilities
  if (!this.supportsBinary) {
    query.b64 = 1;
  }

  query = parseqs.encode(query);

  // prepend ? to query
  if (query.length) {
    query = '?' + query;
  }

  var ipv6 = this.hostname.indexOf(':') !== -1;
  return schema + '://' + (ipv6 ? '[' + this.hostname + ']' : this.hostname) + port + this.path + query;
};

/**
 * Feature detection for WebSocket.
 *
 * @return {Boolean} whether this transport is available.
 * @api public
 */

WS.prototype.check = function () {
  return !!WebSocket && !('__initialize' in WebSocket && this.name === WS.prototype.name);
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../transport":337,"component-inherit":36,"debug":344,"engine.io-parser":347,"parseqs":364,"ws":33,"yeast":387}],343:[function(require,module,exports){
(function (global){
// browser shim for xmlhttprequest module

var hasCORS = require('has-cors');

module.exports = function (opts) {
  var xdomain = opts.xdomain;

  // scheme must be same when usign XDomainRequest
  // http://blogs.msdn.com/b/ieinternals/archive/2010/05/13/xdomainrequest-restrictions-limitations-and-workarounds.aspx
  var xscheme = opts.xscheme;

  // XDomainRequest has a flow of not sending cookie, therefore it should be disabled as a default.
  // https://github.com/Automattic/engine.io-client/pull/217
  var enablesXDR = opts.enablesXDR;

  // XMLHttpRequest can be disabled on IE
  try {
    if ('undefined' !== typeof XMLHttpRequest && (!xdomain || hasCORS)) {
      return new XMLHttpRequest();
    }
  } catch (e) { }

  // Use XDomainRequest for IE8 if enablesXDR is true
  // because loading bar keeps flashing when using jsonp-polling
  // https://github.com/yujiosaka/socke.io-ie8-loading-example
  try {
    if ('undefined' !== typeof XDomainRequest && !xscheme && enablesXDR) {
      return new XDomainRequest();
    }
  } catch (e) { }

  if (!xdomain) {
    try {
      return new global[['Active'].concat('Object').join('X')]('Microsoft.XMLHTTP');
    } catch (e) { }
  }
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"has-cors":352}],344:[function(require,module,exports){
(function (process){

/**
 * This is the web browser implementation of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = require('./debug');
exports.log = log;
exports.formatArgs = formatArgs;
exports.save = save;
exports.load = load;
exports.useColors = useColors;
exports.storage = 'undefined' != typeof chrome
               && 'undefined' != typeof chrome.storage
                  ? chrome.storage.local
                  : localstorage();

/**
 * Colors.
 */

exports.colors = [
  'lightseagreen',
  'forestgreen',
  'goldenrod',
  'dodgerblue',
  'darkorchid',
  'crimson'
];

/**
 * Currently only WebKit-based Web Inspectors, Firefox >= v31,
 * and the Firebug extension (any Firefox version) are known
 * to support "%c" CSS customizations.
 *
 * TODO: add a `localStorage` variable to explicitly enable/disable colors
 */

function useColors() {
  // is webkit? http://stackoverflow.com/a/16459606/376773
  // document is undefined in react-native: https://github.com/facebook/react-native/pull/1632
  return (typeof document !== 'undefined' && 'WebkitAppearance' in document.documentElement.style) ||
    // is firebug? http://stackoverflow.com/a/398120/376773
    (window.console && (console.firebug || (console.exception && console.table))) ||
    // is firefox >= v31?
    // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
    (navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31);
}

/**
 * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
 */

exports.formatters.j = function(v) {
  try {
    return JSON.stringify(v);
  } catch (err) {
    return '[UnexpectedJSONParseError]: ' + err.message;
  }
};


/**
 * Colorize log arguments if enabled.
 *
 * @api public
 */

function formatArgs() {
  var args = arguments;
  var useColors = this.useColors;

  args[0] = (useColors ? '%c' : '')
    + this.namespace
    + (useColors ? ' %c' : ' ')
    + args[0]
    + (useColors ? '%c ' : ' ')
    + '+' + exports.humanize(this.diff);

  if (!useColors) return args;

  var c = 'color: ' + this.color;
  args = [args[0], c, 'color: inherit'].concat(Array.prototype.slice.call(args, 1));

  // the final "%c" is somewhat tricky, because there could be other
  // arguments passed either before or after the %c, so we need to
  // figure out the correct index to insert the CSS into
  var index = 0;
  var lastC = 0;
  args[0].replace(/%[a-z%]/g, function(match) {
    if ('%%' === match) return;
    index++;
    if ('%c' === match) {
      // we only are interested in the *last* %c
      // (the user may have provided their own)
      lastC = index;
    }
  });

  args.splice(lastC, 0, c);
  return args;
}

/**
 * Invokes `console.log()` when available.
 * No-op when `console.log` is not a "function".
 *
 * @api public
 */

function log() {
  // this hackery is required for IE8/9, where
  // the `console.log` function doesn't have 'apply'
  return 'object' === typeof console
    && console.log
    && Function.prototype.apply.call(console.log, console, arguments);
}

/**
 * Save `namespaces`.
 *
 * @param {String} namespaces
 * @api private
 */

function save(namespaces) {
  try {
    if (null == namespaces) {
      exports.storage.removeItem('debug');
    } else {
      exports.storage.debug = namespaces;
    }
  } catch(e) {}
}

/**
 * Load `namespaces`.
 *
 * @return {String} returns the previously persisted debug modes
 * @api private
 */

function load() {
  var r;
  try {
    return exports.storage.debug;
  } catch(e) {}

  // If debug isn't set in LS, and we're in Electron, try to load $DEBUG
  if (typeof process !== 'undefined' && 'env' in process) {
    return process.env.DEBUG;
  }
}

/**
 * Enable namespaces listed in `localStorage.debug` initially.
 */

exports.enable(load());

/**
 * Localstorage attempts to return the localstorage.
 *
 * This is necessary because safari throws
 * when a user disables cookies/localstorage
 * and you attempt to access it.
 *
 * @return {LocalStorage}
 * @api private
 */

function localstorage(){
  try {
    return window.localStorage;
  } catch (e) {}
}

}).call(this,require('_process'))
},{"./debug":345,"_process":366}],345:[function(require,module,exports){

/**
 * This is the common logic for both the Node.js and web browser
 * implementations of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = debug.debug = debug;
exports.coerce = coerce;
exports.disable = disable;
exports.enable = enable;
exports.enabled = enabled;
exports.humanize = require('ms');

/**
 * The currently active debug mode names, and names to skip.
 */

exports.names = [];
exports.skips = [];

/**
 * Map of special "%n" handling functions, for the debug "format" argument.
 *
 * Valid key names are a single, lowercased letter, i.e. "n".
 */

exports.formatters = {};

/**
 * Previously assigned color.
 */

var prevColor = 0;

/**
 * Previous log timestamp.
 */

var prevTime;

/**
 * Select a color.
 *
 * @return {Number}
 * @api private
 */

function selectColor() {
  return exports.colors[prevColor++ % exports.colors.length];
}

/**
 * Create a debugger with the given `namespace`.
 *
 * @param {String} namespace
 * @return {Function}
 * @api public
 */

function debug(namespace) {

  // define the `disabled` version
  function disabled() {
  }
  disabled.enabled = false;

  // define the `enabled` version
  function enabled() {

    var self = enabled;

    // set `diff` timestamp
    var curr = +new Date();
    var ms = curr - (prevTime || curr);
    self.diff = ms;
    self.prev = prevTime;
    self.curr = curr;
    prevTime = curr;

    // add the `color` if not set
    if (null == self.useColors) self.useColors = exports.useColors();
    if (null == self.color && self.useColors) self.color = selectColor();

    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i];
    }

    args[0] = exports.coerce(args[0]);

    if ('string' !== typeof args[0]) {
      // anything else let's inspect with %o
      args = ['%o'].concat(args);
    }

    // apply any `formatters` transformations
    var index = 0;
    args[0] = args[0].replace(/%([a-z%])/g, function(match, format) {
      // if we encounter an escaped % then don't increase the array index
      if (match === '%%') return match;
      index++;
      var formatter = exports.formatters[format];
      if ('function' === typeof formatter) {
        var val = args[index];
        match = formatter.call(self, val);

        // now we need to remove `args[index]` since it's inlined in the `format`
        args.splice(index, 1);
        index--;
      }
      return match;
    });

    // apply env-specific formatting
    args = exports.formatArgs.apply(self, args);

    var logFn = enabled.log || exports.log || console.log.bind(console);
    logFn.apply(self, args);
  }
  enabled.enabled = true;

  var fn = exports.enabled(namespace) ? enabled : disabled;

  fn.namespace = namespace;

  return fn;
}

/**
 * Enables a debug mode by namespaces. This can include modes
 * separated by a colon and wildcards.
 *
 * @param {String} namespaces
 * @api public
 */

function enable(namespaces) {
  exports.save(namespaces);

  var split = (namespaces || '').split(/[\s,]+/);
  var len = split.length;

  for (var i = 0; i < len; i++) {
    if (!split[i]) continue; // ignore empty strings
    namespaces = split[i].replace(/[\\^$+?.()|[\]{}]/g, '\\$&').replace(/\*/g, '.*?');
    if (namespaces[0] === '-') {
      exports.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
    } else {
      exports.names.push(new RegExp('^' + namespaces + '$'));
    }
  }
}

/**
 * Disable debug output.
 *
 * @api public
 */

function disable() {
  exports.enable('');
}

/**
 * Returns true if the given mode name is enabled, false otherwise.
 *
 * @param {String} name
 * @return {Boolean}
 * @api public
 */

function enabled(name) {
  var i, len;
  for (i = 0, len = exports.skips.length; i < len; i++) {
    if (exports.skips[i].test(name)) {
      return false;
    }
  }
  for (i = 0, len = exports.names.length; i < len; i++) {
    if (exports.names[i].test(name)) {
      return true;
    }
  }
  return false;
}

/**
 * Coerce `val`.
 *
 * @param {Mixed} val
 * @return {Mixed}
 * @api private
 */

function coerce(val) {
  if (val instanceof Error) return val.stack || val.message;
  return val;
}

},{"ms":346}],346:[function(require,module,exports){
/**
 * Helpers.
 */

var s = 1000
var m = s * 60
var h = m * 60
var d = h * 24
var y = d * 365.25

/**
 * Parse or format the given `val`.
 *
 * Options:
 *
 *  - `long` verbose formatting [false]
 *
 * @param {String|Number} val
 * @param {Object} options
 * @throws {Error} throw an error if val is not a non-empty string or a number
 * @return {String|Number}
 * @api public
 */

module.exports = function (val, options) {
  options = options || {}
  var type = typeof val
  if (type === 'string' && val.length > 0) {
    return parse(val)
  } else if (type === 'number' && isNaN(val) === false) {
    return options.long ?
			fmtLong(val) :
			fmtShort(val)
  }
  throw new Error('val is not a non-empty string or a valid number. val=' + JSON.stringify(val))
}

/**
 * Parse the given `str` and return milliseconds.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function parse(str) {
  str = String(str)
  if (str.length > 10000) {
    return
  }
  var match = /^((?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|years?|yrs?|y)?$/i.exec(str)
  if (!match) {
    return
  }
  var n = parseFloat(match[1])
  var type = (match[2] || 'ms').toLowerCase()
  switch (type) {
    case 'years':
    case 'year':
    case 'yrs':
    case 'yr':
    case 'y':
      return n * y
    case 'days':
    case 'day':
    case 'd':
      return n * d
    case 'hours':
    case 'hour':
    case 'hrs':
    case 'hr':
    case 'h':
      return n * h
    case 'minutes':
    case 'minute':
    case 'mins':
    case 'min':
    case 'm':
      return n * m
    case 'seconds':
    case 'second':
    case 'secs':
    case 'sec':
    case 's':
      return n * s
    case 'milliseconds':
    case 'millisecond':
    case 'msecs':
    case 'msec':
    case 'ms':
      return n
    default:
      return undefined
  }
}

/**
 * Short format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function fmtShort(ms) {
  if (ms >= d) {
    return Math.round(ms / d) + 'd'
  }
  if (ms >= h) {
    return Math.round(ms / h) + 'h'
  }
  if (ms >= m) {
    return Math.round(ms / m) + 'm'
  }
  if (ms >= s) {
    return Math.round(ms / s) + 's'
  }
  return ms + 'ms'
}

/**
 * Long format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function fmtLong(ms) {
  return plural(ms, d, 'day') ||
    plural(ms, h, 'hour') ||
    plural(ms, m, 'minute') ||
    plural(ms, s, 'second') ||
    ms + ' ms'
}

/**
 * Pluralization helper.
 */

function plural(ms, n, name) {
  if (ms < n) {
    return
  }
  if (ms < n * 1.5) {
    return Math.floor(ms / n) + ' ' + name
  }
  return Math.ceil(ms / n) + ' ' + name + 's'
}

},{}],347:[function(require,module,exports){
(function (global){
/**
 * Module dependencies.
 */

var keys = require('./keys');
var hasBinary = require('has-binary');
var sliceBuffer = require('arraybuffer.slice');
var after = require('after');
var utf8 = require('wtf-8');

var base64encoder;
if (global && global.ArrayBuffer) {
  base64encoder = require('base64-arraybuffer');
}

/**
 * Check if we are running an android browser. That requires us to use
 * ArrayBuffer with polling transports...
 *
 * http://ghinda.net/jpeg-blob-ajax-android/
 */

var isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);

/**
 * Check if we are running in PhantomJS.
 * Uploading a Blob with PhantomJS does not work correctly, as reported here:
 * https://github.com/ariya/phantomjs/issues/11395
 * @type boolean
 */
var isPhantomJS = typeof navigator !== 'undefined' && /PhantomJS/i.test(navigator.userAgent);

/**
 * When true, avoids using Blobs to encode payloads.
 * @type boolean
 */
var dontSendBlobs = isAndroid || isPhantomJS;

/**
 * Current protocol version.
 */

exports.protocol = 3;

/**
 * Packet types.
 */

var packets = exports.packets = {
    open:     0    // non-ws
  , close:    1    // non-ws
  , ping:     2
  , pong:     3
  , message:  4
  , upgrade:  5
  , noop:     6
};

var packetslist = keys(packets);

/**
 * Premade error packet.
 */

var err = { type: 'error', data: 'parser error' };

/**
 * Create a blob api even for blob builder when vendor prefixes exist
 */

var Blob = require('blob');

/**
 * Encodes a packet.
 *
 *     <packet type id> [ <data> ]
 *
 * Example:
 *
 *     5hello world
 *     3
 *     4
 *
 * Binary is encoded in an identical principle
 *
 * @api private
 */

exports.encodePacket = function (packet, supportsBinary, utf8encode, callback) {
  if ('function' == typeof supportsBinary) {
    callback = supportsBinary;
    supportsBinary = false;
  }

  if ('function' == typeof utf8encode) {
    callback = utf8encode;
    utf8encode = null;
  }

  var data = (packet.data === undefined)
    ? undefined
    : packet.data.buffer || packet.data;

  if (global.ArrayBuffer && data instanceof ArrayBuffer) {
    return encodeArrayBuffer(packet, supportsBinary, callback);
  } else if (Blob && data instanceof global.Blob) {
    return encodeBlob(packet, supportsBinary, callback);
  }

  // might be an object with { base64: true, data: dataAsBase64String }
  if (data && data.base64) {
    return encodeBase64Object(packet, callback);
  }

  // Sending data as a utf-8 string
  var encoded = packets[packet.type];

  // data fragment is optional
  if (undefined !== packet.data) {
    encoded += utf8encode ? utf8.encode(String(packet.data)) : String(packet.data);
  }

  return callback('' + encoded);

};

function encodeBase64Object(packet, callback) {
  // packet data is an object { base64: true, data: dataAsBase64String }
  var message = 'b' + exports.packets[packet.type] + packet.data.data;
  return callback(message);
}

/**
 * Encode packet helpers for binary types
 */

function encodeArrayBuffer(packet, supportsBinary, callback) {
  if (!supportsBinary) {
    return exports.encodeBase64Packet(packet, callback);
  }

  var data = packet.data;
  var contentArray = new Uint8Array(data);
  var resultBuffer = new Uint8Array(1 + data.byteLength);

  resultBuffer[0] = packets[packet.type];
  for (var i = 0; i < contentArray.length; i++) {
    resultBuffer[i+1] = contentArray[i];
  }

  return callback(resultBuffer.buffer);
}

function encodeBlobAsArrayBuffer(packet, supportsBinary, callback) {
  if (!supportsBinary) {
    return exports.encodeBase64Packet(packet, callback);
  }

  var fr = new FileReader();
  fr.onload = function() {
    packet.data = fr.result;
    exports.encodePacket(packet, supportsBinary, true, callback);
  };
  return fr.readAsArrayBuffer(packet.data);
}

function encodeBlob(packet, supportsBinary, callback) {
  if (!supportsBinary) {
    return exports.encodeBase64Packet(packet, callback);
  }

  if (dontSendBlobs) {
    return encodeBlobAsArrayBuffer(packet, supportsBinary, callback);
  }

  var length = new Uint8Array(1);
  length[0] = packets[packet.type];
  var blob = new Blob([length.buffer, packet.data]);

  return callback(blob);
}

/**
 * Encodes a packet with binary data in a base64 string
 *
 * @param {Object} packet, has `type` and `data`
 * @return {String} base64 encoded message
 */

exports.encodeBase64Packet = function(packet, callback) {
  var message = 'b' + exports.packets[packet.type];
  if (Blob && packet.data instanceof global.Blob) {
    var fr = new FileReader();
    fr.onload = function() {
      var b64 = fr.result.split(',')[1];
      callback(message + b64);
    };
    return fr.readAsDataURL(packet.data);
  }

  var b64data;
  try {
    b64data = String.fromCharCode.apply(null, new Uint8Array(packet.data));
  } catch (e) {
    // iPhone Safari doesn't let you apply with typed arrays
    var typed = new Uint8Array(packet.data);
    var basic = new Array(typed.length);
    for (var i = 0; i < typed.length; i++) {
      basic[i] = typed[i];
    }
    b64data = String.fromCharCode.apply(null, basic);
  }
  message += global.btoa(b64data);
  return callback(message);
};

/**
 * Decodes a packet. Changes format to Blob if requested.
 *
 * @return {Object} with `type` and `data` (if any)
 * @api private
 */

exports.decodePacket = function (data, binaryType, utf8decode) {
  if (data === undefined) {
    return err;
  }
  // String data
  if (typeof data == 'string') {
    if (data.charAt(0) == 'b') {
      return exports.decodeBase64Packet(data.substr(1), binaryType);
    }

    if (utf8decode) {
      data = tryDecode(data);
      if (data === false) {
        return err;
      }
    }
    var type = data.charAt(0);

    if (Number(type) != type || !packetslist[type]) {
      return err;
    }

    if (data.length > 1) {
      return { type: packetslist[type], data: data.substring(1) };
    } else {
      return { type: packetslist[type] };
    }
  }

  var asArray = new Uint8Array(data);
  var type = asArray[0];
  var rest = sliceBuffer(data, 1);
  if (Blob && binaryType === 'blob') {
    rest = new Blob([rest]);
  }
  return { type: packetslist[type], data: rest };
};

function tryDecode(data) {
  try {
    data = utf8.decode(data);
  } catch (e) {
    return false;
  }
  return data;
}

/**
 * Decodes a packet encoded in a base64 string
 *
 * @param {String} base64 encoded message
 * @return {Object} with `type` and `data` (if any)
 */

exports.decodeBase64Packet = function(msg, binaryType) {
  var type = packetslist[msg.charAt(0)];
  if (!base64encoder) {
    return { type: type, data: { base64: true, data: msg.substr(1) } };
  }

  var data = base64encoder.decode(msg.substr(1));

  if (binaryType === 'blob' && Blob) {
    data = new Blob([data]);
  }

  return { type: type, data: data };
};

/**
 * Encodes multiple messages (payload).
 *
 *     <length>:data
 *
 * Example:
 *
 *     11:hello world2:hi
 *
 * If any contents are binary, they will be encoded as base64 strings. Base64
 * encoded strings are marked with a b before the length specifier
 *
 * @param {Array} packets
 * @api private
 */

exports.encodePayload = function (packets, supportsBinary, callback) {
  if (typeof supportsBinary == 'function') {
    callback = supportsBinary;
    supportsBinary = null;
  }

  var isBinary = hasBinary(packets);

  if (supportsBinary && isBinary) {
    if (Blob && !dontSendBlobs) {
      return exports.encodePayloadAsBlob(packets, callback);
    }

    return exports.encodePayloadAsArrayBuffer(packets, callback);
  }

  if (!packets.length) {
    return callback('0:');
  }

  function setLengthHeader(message) {
    return message.length + ':' + message;
  }

  function encodeOne(packet, doneCallback) {
    exports.encodePacket(packet, !isBinary ? false : supportsBinary, true, function(message) {
      doneCallback(null, setLengthHeader(message));
    });
  }

  map(packets, encodeOne, function(err, results) {
    return callback(results.join(''));
  });
};

/**
 * Async array map using after
 */

function map(ary, each, done) {
  var result = new Array(ary.length);
  var next = after(ary.length, done);

  var eachWithIndex = function(i, el, cb) {
    each(el, function(error, msg) {
      result[i] = msg;
      cb(error, result);
    });
  };

  for (var i = 0; i < ary.length; i++) {
    eachWithIndex(i, ary[i], next);
  }
}

/*
 * Decodes data when a payload is maybe expected. Possible binary contents are
 * decoded from their base64 representation
 *
 * @param {String} data, callback method
 * @api public
 */

exports.decodePayload = function (data, binaryType, callback) {
  if (typeof data != 'string') {
    return exports.decodePayloadAsBinary(data, binaryType, callback);
  }

  if (typeof binaryType === 'function') {
    callback = binaryType;
    binaryType = null;
  }

  var packet;
  if (data == '') {
    // parser error - ignoring payload
    return callback(err, 0, 1);
  }

  var length = ''
    , n, msg;

  for (var i = 0, l = data.length; i < l; i++) {
    var chr = data.charAt(i);

    if (':' != chr) {
      length += chr;
    } else {
      if ('' == length || (length != (n = Number(length)))) {
        // parser error - ignoring payload
        return callback(err, 0, 1);
      }

      msg = data.substr(i + 1, n);

      if (length != msg.length) {
        // parser error - ignoring payload
        return callback(err, 0, 1);
      }

      if (msg.length) {
        packet = exports.decodePacket(msg, binaryType, true);

        if (err.type == packet.type && err.data == packet.data) {
          // parser error in individual packet - ignoring payload
          return callback(err, 0, 1);
        }

        var ret = callback(packet, i + n, l);
        if (false === ret) return;
      }

      // advance cursor
      i += n;
      length = '';
    }
  }

  if (length != '') {
    // parser error - ignoring payload
    return callback(err, 0, 1);
  }

};

/**
 * Encodes multiple messages (payload) as binary.
 *
 * <1 = binary, 0 = string><number from 0-9><number from 0-9>[...]<number
 * 255><data>
 *
 * Example:
 * 1 3 255 1 2 3, if the binary contents are interpreted as 8 bit integers
 *
 * @param {Array} packets
 * @return {ArrayBuffer} encoded payload
 * @api private
 */

exports.encodePayloadAsArrayBuffer = function(packets, callback) {
  if (!packets.length) {
    return callback(new ArrayBuffer(0));
  }

  function encodeOne(packet, doneCallback) {
    exports.encodePacket(packet, true, true, function(data) {
      return doneCallback(null, data);
    });
  }

  map(packets, encodeOne, function(err, encodedPackets) {
    var totalLength = encodedPackets.reduce(function(acc, p) {
      var len;
      if (typeof p === 'string'){
        len = p.length;
      } else {
        len = p.byteLength;
      }
      return acc + len.toString().length + len + 2; // string/binary identifier + separator = 2
    }, 0);

    var resultArray = new Uint8Array(totalLength);

    var bufferIndex = 0;
    encodedPackets.forEach(function(p) {
      var isString = typeof p === 'string';
      var ab = p;
      if (isString) {
        var view = new Uint8Array(p.length);
        for (var i = 0; i < p.length; i++) {
          view[i] = p.charCodeAt(i);
        }
        ab = view.buffer;
      }

      if (isString) { // not true binary
        resultArray[bufferIndex++] = 0;
      } else { // true binary
        resultArray[bufferIndex++] = 1;
      }

      var lenStr = ab.byteLength.toString();
      for (var i = 0; i < lenStr.length; i++) {
        resultArray[bufferIndex++] = parseInt(lenStr[i]);
      }
      resultArray[bufferIndex++] = 255;

      var view = new Uint8Array(ab);
      for (var i = 0; i < view.length; i++) {
        resultArray[bufferIndex++] = view[i];
      }
    });

    return callback(resultArray.buffer);
  });
};

/**
 * Encode as Blob
 */

exports.encodePayloadAsBlob = function(packets, callback) {
  function encodeOne(packet, doneCallback) {
    exports.encodePacket(packet, true, true, function(encoded) {
      var binaryIdentifier = new Uint8Array(1);
      binaryIdentifier[0] = 1;
      if (typeof encoded === 'string') {
        var view = new Uint8Array(encoded.length);
        for (var i = 0; i < encoded.length; i++) {
          view[i] = encoded.charCodeAt(i);
        }
        encoded = view.buffer;
        binaryIdentifier[0] = 0;
      }

      var len = (encoded instanceof ArrayBuffer)
        ? encoded.byteLength
        : encoded.size;

      var lenStr = len.toString();
      var lengthAry = new Uint8Array(lenStr.length + 1);
      for (var i = 0; i < lenStr.length; i++) {
        lengthAry[i] = parseInt(lenStr[i]);
      }
      lengthAry[lenStr.length] = 255;

      if (Blob) {
        var blob = new Blob([binaryIdentifier.buffer, lengthAry.buffer, encoded]);
        doneCallback(null, blob);
      }
    });
  }

  map(packets, encodeOne, function(err, results) {
    return callback(new Blob(results));
  });
};

/*
 * Decodes data when a payload is maybe expected. Strings are decoded by
 * interpreting each byte as a key code for entries marked to start with 0. See
 * description of encodePayloadAsBinary
 *
 * @param {ArrayBuffer} data, callback method
 * @api public
 */

exports.decodePayloadAsBinary = function (data, binaryType, callback) {
  if (typeof binaryType === 'function') {
    callback = binaryType;
    binaryType = null;
  }

  var bufferTail = data;
  var buffers = [];

  var numberTooLong = false;
  while (bufferTail.byteLength > 0) {
    var tailArray = new Uint8Array(bufferTail);
    var isString = tailArray[0] === 0;
    var msgLength = '';

    for (var i = 1; ; i++) {
      if (tailArray[i] == 255) break;

      if (msgLength.length > 310) {
        numberTooLong = true;
        break;
      }

      msgLength += tailArray[i];
    }

    if(numberTooLong) return callback(err, 0, 1);

    bufferTail = sliceBuffer(bufferTail, 2 + msgLength.length);
    msgLength = parseInt(msgLength);

    var msg = sliceBuffer(bufferTail, 0, msgLength);
    if (isString) {
      try {
        msg = String.fromCharCode.apply(null, new Uint8Array(msg));
      } catch (e) {
        // iPhone Safari doesn't let you apply to typed arrays
        var typed = new Uint8Array(msg);
        msg = '';
        for (var i = 0; i < typed.length; i++) {
          msg += String.fromCharCode(typed[i]);
        }
      }
    }

    buffers.push(msg);
    bufferTail = sliceBuffer(bufferTail, msgLength);
  }

  var total = buffers.length;
  buffers.forEach(function(buffer, i) {
    callback(exports.decodePacket(buffer, binaryType, true), i, total);
  });
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./keys":348,"after":1,"arraybuffer.slice":2,"base64-arraybuffer":30,"blob":32,"has-binary":351,"wtf-8":386}],348:[function(require,module,exports){

/**
 * Gets the keys for an object.
 *
 * @return {Array} keys
 * @api private
 */

module.exports = Object.keys || function keys (obj){
  var arr = [];
  var has = Object.prototype.hasOwnProperty;

  for (var i in obj) {
    if (has.call(obj, i)) {
      arr.push(i);
    }
  }
  return arr;
};

},{}],349:[function(require,module,exports){
(function (global){
var topLevel = typeof global !== 'undefined' ? global :
    typeof window !== 'undefined' ? window : {}
var minDoc = require('min-document');

if (typeof document !== 'undefined') {
    module.exports = document;
} else {
    var doccy = topLevel['__GLOBAL_DOCUMENT_CACHE@4'];

    if (!doccy) {
        doccy = topLevel['__GLOBAL_DOCUMENT_CACHE@4'] = minDoc;
    }

    module.exports = doccy;
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"min-document":33}],350:[function(require,module,exports){
(function (global){
if (typeof window !== "undefined") {
    module.exports = window;
} else if (typeof global !== "undefined") {
    module.exports = global;
} else if (typeof self !== "undefined"){
    module.exports = self;
} else {
    module.exports = {};
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],351:[function(require,module,exports){
(function (global){

/*
 * Module requirements.
 */

var isArray = require('isarray');

/**
 * Module exports.
 */

module.exports = hasBinary;

/**
 * Checks for binary data.
 *
 * Right now only Buffer and ArrayBuffer are supported..
 *
 * @param {Object} anything
 * @api public
 */

function hasBinary(data) {

  function _hasBinary(obj) {
    if (!obj) return false;

    if ( (global.Buffer && global.Buffer.isBuffer && global.Buffer.isBuffer(obj)) ||
         (global.ArrayBuffer && obj instanceof ArrayBuffer) ||
         (global.Blob && obj instanceof Blob) ||
         (global.File && obj instanceof File)
        ) {
      return true;
    }

    if (isArray(obj)) {
      for (var i = 0; i < obj.length; i++) {
          if (_hasBinary(obj[i])) {
              return true;
          }
      }
    } else if (obj && 'object' == typeof obj) {
      // see: https://github.com/Automattic/has-binary/pull/4
      if (obj.toJSON && 'function' == typeof obj.toJSON) {
        obj = obj.toJSON();
      }

      for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key) && _hasBinary(obj[key])) {
          return true;
        }
      }
    }

    return false;
  }

  return _hasBinary(data);
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"isarray":356}],352:[function(require,module,exports){

/**
 * Module exports.
 *
 * Logic borrowed from Modernizr:
 *
 *   - https://github.com/Modernizr/Modernizr/blob/master/feature-detects/cors.js
 */

try {
  module.exports = typeof XMLHttpRequest !== 'undefined' &&
    'withCredentials' in new XMLHttpRequest();
} catch (err) {
  // if XMLHttp support is disabled in IE then it will throw
  // when trying to create
  module.exports = false;
}

},{}],353:[function(require,module,exports){
module.exports = attributeToProperty

var transform = {
  'class': 'className',
  'for': 'htmlFor',
  'http-equiv': 'httpEquiv'
}

function attributeToProperty (h) {
  return function (tagName, attrs, children) {
    for (var attr in attrs) {
      if (attr in transform) {
        attrs[transform[attr]] = attrs[attr]
        delete attrs[attr]
      }
    }
    return h(tagName, attrs, children)
  }
}

},{}],354:[function(require,module,exports){
var attrToProp = require('hyperscript-attribute-to-property')

var VAR = 0, TEXT = 1, OPEN = 2, CLOSE = 3, ATTR = 4
var ATTR_KEY = 5, ATTR_KEY_W = 6
var ATTR_VALUE_W = 7, ATTR_VALUE = 8
var ATTR_VALUE_SQ = 9, ATTR_VALUE_DQ = 10
var ATTR_EQ = 11, ATTR_BREAK = 12

module.exports = function (h, opts) {
  h = attrToProp(h)
  if (!opts) opts = {}
  var concat = opts.concat || function (a, b) {
    return String(a) + String(b)
  }

  return function (strings) {
    var state = TEXT, reg = ''
    var arglen = arguments.length
    var parts = []

    for (var i = 0; i < strings.length; i++) {
      if (i < arglen - 1) {
        var arg = arguments[i+1]
        var p = parse(strings[i])
        var xstate = state
        if (xstate === ATTR_VALUE_DQ) xstate = ATTR_VALUE
        if (xstate === ATTR_VALUE_SQ) xstate = ATTR_VALUE
        if (xstate === ATTR_VALUE_W) xstate = ATTR_VALUE
        if (xstate === ATTR) xstate = ATTR_KEY
        p.push([ VAR, xstate, arg ])
        parts.push.apply(parts, p)
      } else parts.push.apply(parts, parse(strings[i]))
    }

    var tree = [null,{},[]]
    var stack = [[tree,-1]]
    for (var i = 0; i < parts.length; i++) {
      var cur = stack[stack.length-1][0]
      var p = parts[i], s = p[0]
      if (s === OPEN && /^\//.test(p[1])) {
        var ix = stack[stack.length-1][1]
        if (stack.length > 1) {
          stack.pop()
          stack[stack.length-1][0][2][ix] = h(
            cur[0], cur[1], cur[2].length ? cur[2] : undefined
          )
        }
      } else if (s === OPEN) {
        var c = [p[1],{},[]]
        cur[2].push(c)
        stack.push([c,cur[2].length-1])
      } else if (s === ATTR_KEY || (s === VAR && p[1] === ATTR_KEY)) {
        var key = ''
        var copyKey
        for (; i < parts.length; i++) {
          if (parts[i][0] === ATTR_KEY) {
            key = concat(key, parts[i][1])
          } else if (parts[i][0] === VAR && parts[i][1] === ATTR_KEY) {
            if (typeof parts[i][2] === 'object' && !key) {
              for (copyKey in parts[i][2]) {
                if (parts[i][2].hasOwnProperty(copyKey) && !cur[1][copyKey]) {
                  cur[1][copyKey] = parts[i][2][copyKey]
                }
              }
            } else {
              key = concat(key, parts[i][2])
            }
          } else break
        }
        if (parts[i][0] === ATTR_EQ) i++
        var j = i
        for (; i < parts.length; i++) {
          if (parts[i][0] === ATTR_VALUE || parts[i][0] === ATTR_KEY) {
            if (!cur[1][key]) cur[1][key] = strfn(parts[i][1])
            else cur[1][key] = concat(cur[1][key], parts[i][1])
          } else if (parts[i][0] === VAR
          && (parts[i][1] === ATTR_VALUE || parts[i][1] === ATTR_KEY)) {
            if (!cur[1][key]) cur[1][key] = strfn(parts[i][2])
            else cur[1][key] = concat(cur[1][key], parts[i][2])
          } else {
            if (key.length && !cur[1][key] && i === j
            && (parts[i][0] === CLOSE || parts[i][0] === ATTR_BREAK)) {
              // https://html.spec.whatwg.org/multipage/infrastructure.html#boolean-attributes
              // empty string is falsy, not well behaved value in browser
              cur[1][key] = key.toLowerCase()
            }
            break
          }
        }
      } else if (s === ATTR_KEY) {
        cur[1][p[1]] = true
      } else if (s === VAR && p[1] === ATTR_KEY) {
        cur[1][p[2]] = true
      } else if (s === CLOSE) {
        if (selfClosing(cur[0]) && stack.length) {
          var ix = stack[stack.length-1][1]
          stack.pop()
          stack[stack.length-1][0][2][ix] = h(
            cur[0], cur[1], cur[2].length ? cur[2] : undefined
          )
        }
      } else if (s === VAR && p[1] === TEXT) {
        if (p[2] === undefined || p[2] === null) p[2] = ''
        else if (!p[2]) p[2] = concat('', p[2])
        if (Array.isArray(p[2][0])) {
          cur[2].push.apply(cur[2], p[2])
        } else {
          cur[2].push(p[2])
        }
      } else if (s === TEXT) {
        cur[2].push(p[1])
      } else if (s === ATTR_EQ || s === ATTR_BREAK) {
        // no-op
      } else {
        throw new Error('unhandled: ' + s)
      }
    }

    if (tree[2].length > 1 && /^\s*$/.test(tree[2][0])) {
      tree[2].shift()
    }

    if (tree[2].length > 2
    || (tree[2].length === 2 && /\S/.test(tree[2][1]))) {
      throw new Error(
        'multiple root elements must be wrapped in an enclosing tag'
      )
    }
    if (Array.isArray(tree[2][0]) && typeof tree[2][0][0] === 'string'
    && Array.isArray(tree[2][0][2])) {
      tree[2][0] = h(tree[2][0][0], tree[2][0][1], tree[2][0][2])
    }
    return tree[2][0]

    function parse (str) {
      var res = []
      if (state === ATTR_VALUE_W) state = ATTR
      for (var i = 0; i < str.length; i++) {
        var c = str.charAt(i)
        if (state === TEXT && c === '<') {
          if (reg.length) res.push([TEXT, reg])
          reg = ''
          state = OPEN
        } else if (c === '>' && !quot(state)) {
          if (state === OPEN) {
            res.push([OPEN,reg])
          } else if (state === ATTR_KEY) {
            res.push([ATTR_KEY,reg])
          } else if (state === ATTR_VALUE && reg.length) {
            res.push([ATTR_VALUE,reg])
          }
          res.push([CLOSE])
          reg = ''
          state = TEXT
        } else if (state === TEXT) {
          reg += c
        } else if (state === OPEN && /\s/.test(c)) {
          res.push([OPEN, reg])
          reg = ''
          state = ATTR
        } else if (state === OPEN) {
          reg += c
        } else if (state === ATTR && /[\w-]/.test(c)) {
          state = ATTR_KEY
          reg = c
        } else if (state === ATTR && /\s/.test(c)) {
          if (reg.length) res.push([ATTR_KEY,reg])
          res.push([ATTR_BREAK])
        } else if (state === ATTR_KEY && /\s/.test(c)) {
          res.push([ATTR_KEY,reg])
          reg = ''
          state = ATTR_KEY_W
        } else if (state === ATTR_KEY && c === '=') {
          res.push([ATTR_KEY,reg],[ATTR_EQ])
          reg = ''
          state = ATTR_VALUE_W
        } else if (state === ATTR_KEY) {
          reg += c
        } else if ((state === ATTR_KEY_W || state === ATTR) && c === '=') {
          res.push([ATTR_EQ])
          state = ATTR_VALUE_W
        } else if ((state === ATTR_KEY_W || state === ATTR) && !/\s/.test(c)) {
          res.push([ATTR_BREAK])
          if (/[\w-]/.test(c)) {
            reg += c
            state = ATTR_KEY
          } else state = ATTR
        } else if (state === ATTR_VALUE_W && c === '"') {
          state = ATTR_VALUE_DQ
        } else if (state === ATTR_VALUE_W && c === "'") {
          state = ATTR_VALUE_SQ
        } else if (state === ATTR_VALUE_DQ && c === '"') {
          res.push([ATTR_VALUE,reg],[ATTR_BREAK])
          reg = ''
          state = ATTR
        } else if (state === ATTR_VALUE_SQ && c === "'") {
          res.push([ATTR_VALUE,reg],[ATTR_BREAK])
          reg = ''
          state = ATTR
        } else if (state === ATTR_VALUE_W && !/\s/.test(c)) {
          state = ATTR_VALUE
          i--
        } else if (state === ATTR_VALUE && /\s/.test(c)) {
          res.push([ATTR_VALUE,reg],[ATTR_BREAK])
          reg = ''
          state = ATTR
        } else if (state === ATTR_VALUE || state === ATTR_VALUE_SQ
        || state === ATTR_VALUE_DQ) {
          reg += c
        }
      }
      if (state === TEXT && reg.length) {
        res.push([TEXT,reg])
        reg = ''
      } else if (state === ATTR_VALUE && reg.length) {
        res.push([ATTR_VALUE,reg])
        reg = ''
      } else if (state === ATTR_VALUE_DQ && reg.length) {
        res.push([ATTR_VALUE,reg])
        reg = ''
      } else if (state === ATTR_VALUE_SQ && reg.length) {
        res.push([ATTR_VALUE,reg])
        reg = ''
      } else if (state === ATTR_KEY) {
        res.push([ATTR_KEY,reg])
        reg = ''
      }
      return res
    }
  }

  function strfn (x) {
    if (typeof x === 'function') return x
    else if (typeof x === 'string') return x
    else if (x && typeof x === 'object') return x
    else return concat('', x)
  }
}

function quot (state) {
  return state === ATTR_VALUE_SQ || state === ATTR_VALUE_DQ
}

var hasOwn = Object.prototype.hasOwnProperty
function has (obj, key) { return hasOwn.call(obj, key) }

var closeRE = RegExp('^(' + [
  'area', 'base', 'basefont', 'bgsound', 'br', 'col', 'command', 'embed',
  'frame', 'hr', 'img', 'input', 'isindex', 'keygen', 'link', 'meta', 'param',
  'source', 'track', 'wbr',
  // SVG TAGS
  'animate', 'animateTransform', 'circle', 'cursor', 'desc', 'ellipse',
  'feBlend', 'feColorMatrix', 'feComposite',
  'feConvolveMatrix', 'feDiffuseLighting', 'feDisplacementMap',
  'feDistantLight', 'feFlood', 'feFuncA', 'feFuncB', 'feFuncG', 'feFuncR',
  'feGaussianBlur', 'feImage', 'feMergeNode', 'feMorphology',
  'feOffset', 'fePointLight', 'feSpecularLighting', 'feSpotLight', 'feTile',
  'feTurbulence', 'font-face-format', 'font-face-name', 'font-face-uri',
  'glyph', 'glyphRef', 'hkern', 'image', 'line', 'missing-glyph', 'mpath',
  'path', 'polygon', 'polyline', 'rect', 'set', 'stop', 'tref', 'use', 'view',
  'vkern'
].join('|') + ')(?:[\.#][a-zA-Z0-9\u007F-\uFFFF_:-]+)*$')
function selfClosing (tag) { return closeRE.test(tag) }

},{"hyperscript-attribute-to-property":353}],355:[function(require,module,exports){

var indexOf = [].indexOf;

module.exports = function(arr, obj){
  if (indexOf) return arr.indexOf(obj);
  for (var i = 0; i < arr.length; ++i) {
    if (arr[i] === obj) return i;
  }
  return -1;
};
},{}],356:[function(require,module,exports){
module.exports = Array.isArray || function (arr) {
  return Object.prototype.toString.call(arr) == '[object Array]';
};

},{}],357:[function(require,module,exports){
(function (global){
/*! JSON v3.3.2 | http://bestiejs.github.io/json3 | Copyright 2012-2014, Kit Cambridge | http://kit.mit-license.org */
;(function () {
  // Detect the `define` function exposed by asynchronous module loaders. The
  // strict `define` check is necessary for compatibility with `r.js`.
  var isLoader = typeof define === "function" && define.amd;

  // A set of types used to distinguish objects from primitives.
  var objectTypes = {
    "function": true,
    "object": true
  };

  // Detect the `exports` object exposed by CommonJS implementations.
  var freeExports = objectTypes[typeof exports] && exports && !exports.nodeType && exports;

  // Use the `global` object exposed by Node (including Browserify via
  // `insert-module-globals`), Narwhal, and Ringo as the default context,
  // and the `window` object in browsers. Rhino exports a `global` function
  // instead.
  var root = objectTypes[typeof window] && window || this,
      freeGlobal = freeExports && objectTypes[typeof module] && module && !module.nodeType && typeof global == "object" && global;

  if (freeGlobal && (freeGlobal["global"] === freeGlobal || freeGlobal["window"] === freeGlobal || freeGlobal["self"] === freeGlobal)) {
    root = freeGlobal;
  }

  // Public: Initializes JSON 3 using the given `context` object, attaching the
  // `stringify` and `parse` functions to the specified `exports` object.
  function runInContext(context, exports) {
    context || (context = root["Object"]());
    exports || (exports = root["Object"]());

    // Native constructor aliases.
    var Number = context["Number"] || root["Number"],
        String = context["String"] || root["String"],
        Object = context["Object"] || root["Object"],
        Date = context["Date"] || root["Date"],
        SyntaxError = context["SyntaxError"] || root["SyntaxError"],
        TypeError = context["TypeError"] || root["TypeError"],
        Math = context["Math"] || root["Math"],
        nativeJSON = context["JSON"] || root["JSON"];

    // Delegate to the native `stringify` and `parse` implementations.
    if (typeof nativeJSON == "object" && nativeJSON) {
      exports.stringify = nativeJSON.stringify;
      exports.parse = nativeJSON.parse;
    }

    // Convenience aliases.
    var objectProto = Object.prototype,
        getClass = objectProto.toString,
        isProperty, forEach, undef;

    // Test the `Date#getUTC*` methods. Based on work by @Yaffle.
    var isExtended = new Date(-3509827334573292);
    try {
      // The `getUTCFullYear`, `Month`, and `Date` methods return nonsensical
      // results for certain dates in Opera >= 10.53.
      isExtended = isExtended.getUTCFullYear() == -109252 && isExtended.getUTCMonth() === 0 && isExtended.getUTCDate() === 1 &&
        // Safari < 2.0.2 stores the internal millisecond time value correctly,
        // but clips the values returned by the date methods to the range of
        // signed 32-bit integers ([-2 ** 31, 2 ** 31 - 1]).
        isExtended.getUTCHours() == 10 && isExtended.getUTCMinutes() == 37 && isExtended.getUTCSeconds() == 6 && isExtended.getUTCMilliseconds() == 708;
    } catch (exception) {}

    // Internal: Determines whether the native `JSON.stringify` and `parse`
    // implementations are spec-compliant. Based on work by Ken Snyder.
    function has(name) {
      if (has[name] !== undef) {
        // Return cached feature test result.
        return has[name];
      }
      var isSupported;
      if (name == "bug-string-char-index") {
        // IE <= 7 doesn't support accessing string characters using square
        // bracket notation. IE 8 only supports this for primitives.
        isSupported = "a"[0] != "a";
      } else if (name == "json") {
        // Indicates whether both `JSON.stringify` and `JSON.parse` are
        // supported.
        isSupported = has("json-stringify") && has("json-parse");
      } else {
        var value, serialized = '{"a":[1,true,false,null,"\\u0000\\b\\n\\f\\r\\t"]}';
        // Test `JSON.stringify`.
        if (name == "json-stringify") {
          var stringify = exports.stringify, stringifySupported = typeof stringify == "function" && isExtended;
          if (stringifySupported) {
            // A test function object with a custom `toJSON` method.
            (value = function () {
              return 1;
            }).toJSON = value;
            try {
              stringifySupported =
                // Firefox 3.1b1 and b2 serialize string, number, and boolean
                // primitives as object literals.
                stringify(0) === "0" &&
                // FF 3.1b1, b2, and JSON 2 serialize wrapped primitives as object
                // literals.
                stringify(new Number()) === "0" &&
                stringify(new String()) == '""' &&
                // FF 3.1b1, 2 throw an error if the value is `null`, `undefined`, or
                // does not define a canonical JSON representation (this applies to
                // objects with `toJSON` properties as well, *unless* they are nested
                // within an object or array).
                stringify(getClass) === undef &&
                // IE 8 serializes `undefined` as `"undefined"`. Safari <= 5.1.7 and
                // FF 3.1b3 pass this test.
                stringify(undef) === undef &&
                // Safari <= 5.1.7 and FF 3.1b3 throw `Error`s and `TypeError`s,
                // respectively, if the value is omitted entirely.
                stringify() === undef &&
                // FF 3.1b1, 2 throw an error if the given value is not a number,
                // string, array, object, Boolean, or `null` literal. This applies to
                // objects with custom `toJSON` methods as well, unless they are nested
                // inside object or array literals. YUI 3.0.0b1 ignores custom `toJSON`
                // methods entirely.
                stringify(value) === "1" &&
                stringify([value]) == "[1]" &&
                // Prototype <= 1.6.1 serializes `[undefined]` as `"[]"` instead of
                // `"[null]"`.
                stringify([undef]) == "[null]" &&
                // YUI 3.0.0b1 fails to serialize `null` literals.
                stringify(null) == "null" &&
                // FF 3.1b1, 2 halts serialization if an array contains a function:
                // `[1, true, getClass, 1]` serializes as "[1,true,],". FF 3.1b3
                // elides non-JSON values from objects and arrays, unless they
                // define custom `toJSON` methods.
                stringify([undef, getClass, null]) == "[null,null,null]" &&
                // Simple serialization test. FF 3.1b1 uses Unicode escape sequences
                // where character escape codes are expected (e.g., `\b` => `\u0008`).
                stringify({ "a": [value, true, false, null, "\x00\b\n\f\r\t"] }) == serialized &&
                // FF 3.1b1 and b2 ignore the `filter` and `width` arguments.
                stringify(null, value) === "1" &&
                stringify([1, 2], null, 1) == "[\n 1,\n 2\n]" &&
                // JSON 2, Prototype <= 1.7, and older WebKit builds incorrectly
                // serialize extended years.
                stringify(new Date(-8.64e15)) == '"-271821-04-20T00:00:00.000Z"' &&
                // The milliseconds are optional in ES 5, but required in 5.1.
                stringify(new Date(8.64e15)) == '"+275760-09-13T00:00:00.000Z"' &&
                // Firefox <= 11.0 incorrectly serializes years prior to 0 as negative
                // four-digit years instead of six-digit years. Credits: @Yaffle.
                stringify(new Date(-621987552e5)) == '"-000001-01-01T00:00:00.000Z"' &&
                // Safari <= 5.1.5 and Opera >= 10.53 incorrectly serialize millisecond
                // values less than 1000. Credits: @Yaffle.
                stringify(new Date(-1)) == '"1969-12-31T23:59:59.999Z"';
            } catch (exception) {
              stringifySupported = false;
            }
          }
          isSupported = stringifySupported;
        }
        // Test `JSON.parse`.
        if (name == "json-parse") {
          var parse = exports.parse;
          if (typeof parse == "function") {
            try {
              // FF 3.1b1, b2 will throw an exception if a bare literal is provided.
              // Conforming implementations should also coerce the initial argument to
              // a string prior to parsing.
              if (parse("0") === 0 && !parse(false)) {
                // Simple parsing test.
                value = parse(serialized);
                var parseSupported = value["a"].length == 5 && value["a"][0] === 1;
                if (parseSupported) {
                  try {
                    // Safari <= 5.1.2 and FF 3.1b1 allow unescaped tabs in strings.
                    parseSupported = !parse('"\t"');
                  } catch (exception) {}
                  if (parseSupported) {
                    try {
                      // FF 4.0 and 4.0.1 allow leading `+` signs and leading
                      // decimal points. FF 4.0, 4.0.1, and IE 9-10 also allow
                      // certain octal literals.
                      parseSupported = parse("01") !== 1;
                    } catch (exception) {}
                  }
                  if (parseSupported) {
                    try {
                      // FF 4.0, 4.0.1, and Rhino 1.7R3-R4 allow trailing decimal
                      // points. These environments, along with FF 3.1b1 and 2,
                      // also allow trailing commas in JSON objects and arrays.
                      parseSupported = parse("1.") !== 1;
                    } catch (exception) {}
                  }
                }
              }
            } catch (exception) {
              parseSupported = false;
            }
          }
          isSupported = parseSupported;
        }
      }
      return has[name] = !!isSupported;
    }

    if (!has("json")) {
      // Common `[[Class]]` name aliases.
      var functionClass = "[object Function]",
          dateClass = "[object Date]",
          numberClass = "[object Number]",
          stringClass = "[object String]",
          arrayClass = "[object Array]",
          booleanClass = "[object Boolean]";

      // Detect incomplete support for accessing string characters by index.
      var charIndexBuggy = has("bug-string-char-index");

      // Define additional utility methods if the `Date` methods are buggy.
      if (!isExtended) {
        var floor = Math.floor;
        // A mapping between the months of the year and the number of days between
        // January 1st and the first of the respective month.
        var Months = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
        // Internal: Calculates the number of days between the Unix epoch and the
        // first day of the given month.
        var getDay = function (year, month) {
          return Months[month] + 365 * (year - 1970) + floor((year - 1969 + (month = +(month > 1))) / 4) - floor((year - 1901 + month) / 100) + floor((year - 1601 + month) / 400);
        };
      }

      // Internal: Determines if a property is a direct property of the given
      // object. Delegates to the native `Object#hasOwnProperty` method.
      if (!(isProperty = objectProto.hasOwnProperty)) {
        isProperty = function (property) {
          var members = {}, constructor;
          if ((members.__proto__ = null, members.__proto__ = {
            // The *proto* property cannot be set multiple times in recent
            // versions of Firefox and SeaMonkey.
            "toString": 1
          }, members).toString != getClass) {
            // Safari <= 2.0.3 doesn't implement `Object#hasOwnProperty`, but
            // supports the mutable *proto* property.
            isProperty = function (property) {
              // Capture and break the object's prototype chain (see section 8.6.2
              // of the ES 5.1 spec). The parenthesized expression prevents an
              // unsafe transformation by the Closure Compiler.
              var original = this.__proto__, result = property in (this.__proto__ = null, this);
              // Restore the original prototype chain.
              this.__proto__ = original;
              return result;
            };
          } else {
            // Capture a reference to the top-level `Object` constructor.
            constructor = members.constructor;
            // Use the `constructor` property to simulate `Object#hasOwnProperty` in
            // other environments.
            isProperty = function (property) {
              var parent = (this.constructor || constructor).prototype;
              return property in this && !(property in parent && this[property] === parent[property]);
            };
          }
          members = null;
          return isProperty.call(this, property);
        };
      }

      // Internal: Normalizes the `for...in` iteration algorithm across
      // environments. Each enumerated key is yielded to a `callback` function.
      forEach = function (object, callback) {
        var size = 0, Properties, members, property;

        // Tests for bugs in the current environment's `for...in` algorithm. The
        // `valueOf` property inherits the non-enumerable flag from
        // `Object.prototype` in older versions of IE, Netscape, and Mozilla.
        (Properties = function () {
          this.valueOf = 0;
        }).prototype.valueOf = 0;

        // Iterate over a new instance of the `Properties` class.
        members = new Properties();
        for (property in members) {
          // Ignore all properties inherited from `Object.prototype`.
          if (isProperty.call(members, property)) {
            size++;
          }
        }
        Properties = members = null;

        // Normalize the iteration algorithm.
        if (!size) {
          // A list of non-enumerable properties inherited from `Object.prototype`.
          members = ["valueOf", "toString", "toLocaleString", "propertyIsEnumerable", "isPrototypeOf", "hasOwnProperty", "constructor"];
          // IE <= 8, Mozilla 1.0, and Netscape 6.2 ignore shadowed non-enumerable
          // properties.
          forEach = function (object, callback) {
            var isFunction = getClass.call(object) == functionClass, property, length;
            var hasProperty = !isFunction && typeof object.constructor != "function" && objectTypes[typeof object.hasOwnProperty] && object.hasOwnProperty || isProperty;
            for (property in object) {
              // Gecko <= 1.0 enumerates the `prototype` property of functions under
              // certain conditions; IE does not.
              if (!(isFunction && property == "prototype") && hasProperty.call(object, property)) {
                callback(property);
              }
            }
            // Manually invoke the callback for each non-enumerable property.
            for (length = members.length; property = members[--length]; hasProperty.call(object, property) && callback(property));
          };
        } else if (size == 2) {
          // Safari <= 2.0.4 enumerates shadowed properties twice.
          forEach = function (object, callback) {
            // Create a set of iterated properties.
            var members = {}, isFunction = getClass.call(object) == functionClass, property;
            for (property in object) {
              // Store each property name to prevent double enumeration. The
              // `prototype` property of functions is not enumerated due to cross-
              // environment inconsistencies.
              if (!(isFunction && property == "prototype") && !isProperty.call(members, property) && (members[property] = 1) && isProperty.call(object, property)) {
                callback(property);
              }
            }
          };
        } else {
          // No bugs detected; use the standard `for...in` algorithm.
          forEach = function (object, callback) {
            var isFunction = getClass.call(object) == functionClass, property, isConstructor;
            for (property in object) {
              if (!(isFunction && property == "prototype") && isProperty.call(object, property) && !(isConstructor = property === "constructor")) {
                callback(property);
              }
            }
            // Manually invoke the callback for the `constructor` property due to
            // cross-environment inconsistencies.
            if (isConstructor || isProperty.call(object, (property = "constructor"))) {
              callback(property);
            }
          };
        }
        return forEach(object, callback);
      };

      // Public: Serializes a JavaScript `value` as a JSON string. The optional
      // `filter` argument may specify either a function that alters how object and
      // array members are serialized, or an array of strings and numbers that
      // indicates which properties should be serialized. The optional `width`
      // argument may be either a string or number that specifies the indentation
      // level of the output.
      if (!has("json-stringify")) {
        // Internal: A map of control characters and their escaped equivalents.
        var Escapes = {
          92: "\\\\",
          34: '\\"',
          8: "\\b",
          12: "\\f",
          10: "\\n",
          13: "\\r",
          9: "\\t"
        };

        // Internal: Converts `value` into a zero-padded string such that its
        // length is at least equal to `width`. The `width` must be <= 6.
        var leadingZeroes = "000000";
        var toPaddedString = function (width, value) {
          // The `|| 0` expression is necessary to work around a bug in
          // Opera <= 7.54u2 where `0 == -0`, but `String(-0) !== "0"`.
          return (leadingZeroes + (value || 0)).slice(-width);
        };

        // Internal: Double-quotes a string `value`, replacing all ASCII control
        // characters (characters with code unit values between 0 and 31) with
        // their escaped equivalents. This is an implementation of the
        // `Quote(value)` operation defined in ES 5.1 section 15.12.3.
        var unicodePrefix = "\\u00";
        var quote = function (value) {
          var result = '"', index = 0, length = value.length, useCharIndex = !charIndexBuggy || length > 10;
          var symbols = useCharIndex && (charIndexBuggy ? value.split("") : value);
          for (; index < length; index++) {
            var charCode = value.charCodeAt(index);
            // If the character is a control character, append its Unicode or
            // shorthand escape sequence; otherwise, append the character as-is.
            switch (charCode) {
              case 8: case 9: case 10: case 12: case 13: case 34: case 92:
                result += Escapes[charCode];
                break;
              default:
                if (charCode < 32) {
                  result += unicodePrefix + toPaddedString(2, charCode.toString(16));
                  break;
                }
                result += useCharIndex ? symbols[index] : value.charAt(index);
            }
          }
          return result + '"';
        };

        // Internal: Recursively serializes an object. Implements the
        // `Str(key, holder)`, `JO(value)`, and `JA(value)` operations.
        var serialize = function (property, object, callback, properties, whitespace, indentation, stack) {
          var value, className, year, month, date, time, hours, minutes, seconds, milliseconds, results, element, index, length, prefix, result;
          try {
            // Necessary for host object support.
            value = object[property];
          } catch (exception) {}
          if (typeof value == "object" && value) {
            className = getClass.call(value);
            if (className == dateClass && !isProperty.call(value, "toJSON")) {
              if (value > -1 / 0 && value < 1 / 0) {
                // Dates are serialized according to the `Date#toJSON` method
                // specified in ES 5.1 section 15.9.5.44. See section 15.9.1.15
                // for the ISO 8601 date time string format.
                if (getDay) {
                  // Manually compute the year, month, date, hours, minutes,
                  // seconds, and milliseconds if the `getUTC*` methods are
                  // buggy. Adapted from @Yaffle's `date-shim` project.
                  date = floor(value / 864e5);
                  for (year = floor(date / 365.2425) + 1970 - 1; getDay(year + 1, 0) <= date; year++);
                  for (month = floor((date - getDay(year, 0)) / 30.42); getDay(year, month + 1) <= date; month++);
                  date = 1 + date - getDay(year, month);
                  // The `time` value specifies the time within the day (see ES
                  // 5.1 section 15.9.1.2). The formula `(A % B + B) % B` is used
                  // to compute `A modulo B`, as the `%` operator does not
                  // correspond to the `modulo` operation for negative numbers.
                  time = (value % 864e5 + 864e5) % 864e5;
                  // The hours, minutes, seconds, and milliseconds are obtained by
                  // decomposing the time within the day. See section 15.9.1.10.
                  hours = floor(time / 36e5) % 24;
                  minutes = floor(time / 6e4) % 60;
                  seconds = floor(time / 1e3) % 60;
                  milliseconds = time % 1e3;
                } else {
                  year = value.getUTCFullYear();
                  month = value.getUTCMonth();
                  date = value.getUTCDate();
                  hours = value.getUTCHours();
                  minutes = value.getUTCMinutes();
                  seconds = value.getUTCSeconds();
                  milliseconds = value.getUTCMilliseconds();
                }
                // Serialize extended years correctly.
                value = (year <= 0 || year >= 1e4 ? (year < 0 ? "-" : "+") + toPaddedString(6, year < 0 ? -year : year) : toPaddedString(4, year)) +
                  "-" + toPaddedString(2, month + 1) + "-" + toPaddedString(2, date) +
                  // Months, dates, hours, minutes, and seconds should have two
                  // digits; milliseconds should have three.
                  "T" + toPaddedString(2, hours) + ":" + toPaddedString(2, minutes) + ":" + toPaddedString(2, seconds) +
                  // Milliseconds are optional in ES 5.0, but required in 5.1.
                  "." + toPaddedString(3, milliseconds) + "Z";
              } else {
                value = null;
              }
            } else if (typeof value.toJSON == "function" && ((className != numberClass && className != stringClass && className != arrayClass) || isProperty.call(value, "toJSON"))) {
              // Prototype <= 1.6.1 adds non-standard `toJSON` methods to the
              // `Number`, `String`, `Date`, and `Array` prototypes. JSON 3
              // ignores all `toJSON` methods on these objects unless they are
              // defined directly on an instance.
              value = value.toJSON(property);
            }
          }
          if (callback) {
            // If a replacement function was provided, call it to obtain the value
            // for serialization.
            value = callback.call(object, property, value);
          }
          if (value === null) {
            return "null";
          }
          className = getClass.call(value);
          if (className == booleanClass) {
            // Booleans are represented literally.
            return "" + value;
          } else if (className == numberClass) {
            // JSON numbers must be finite. `Infinity` and `NaN` are serialized as
            // `"null"`.
            return value > -1 / 0 && value < 1 / 0 ? "" + value : "null";
          } else if (className == stringClass) {
            // Strings are double-quoted and escaped.
            return quote("" + value);
          }
          // Recursively serialize objects and arrays.
          if (typeof value == "object") {
            // Check for cyclic structures. This is a linear search; performance
            // is inversely proportional to the number of unique nested objects.
            for (length = stack.length; length--;) {
              if (stack[length] === value) {
                // Cyclic structures cannot be serialized by `JSON.stringify`.
                throw TypeError();
              }
            }
            // Add the object to the stack of traversed objects.
            stack.push(value);
            results = [];
            // Save the current indentation level and indent one additional level.
            prefix = indentation;
            indentation += whitespace;
            if (className == arrayClass) {
              // Recursively serialize array elements.
              for (index = 0, length = value.length; index < length; index++) {
                element = serialize(index, value, callback, properties, whitespace, indentation, stack);
                results.push(element === undef ? "null" : element);
              }
              result = results.length ? (whitespace ? "[\n" + indentation + results.join(",\n" + indentation) + "\n" + prefix + "]" : ("[" + results.join(",") + "]")) : "[]";
            } else {
              // Recursively serialize object members. Members are selected from
              // either a user-specified list of property names, or the object
              // itself.
              forEach(properties || value, function (property) {
                var element = serialize(property, value, callback, properties, whitespace, indentation, stack);
                if (element !== undef) {
                  // According to ES 5.1 section 15.12.3: "If `gap` {whitespace}
                  // is not the empty string, let `member` {quote(property) + ":"}
                  // be the concatenation of `member` and the `space` character."
                  // The "`space` character" refers to the literal space
                  // character, not the `space` {width} argument provided to
                  // `JSON.stringify`.
                  results.push(quote(property) + ":" + (whitespace ? " " : "") + element);
                }
              });
              result = results.length ? (whitespace ? "{\n" + indentation + results.join(",\n" + indentation) + "\n" + prefix + "}" : ("{" + results.join(",") + "}")) : "{}";
            }
            // Remove the object from the traversed object stack.
            stack.pop();
            return result;
          }
        };

        // Public: `JSON.stringify`. See ES 5.1 section 15.12.3.
        exports.stringify = function (source, filter, width) {
          var whitespace, callback, properties, className;
          if (objectTypes[typeof filter] && filter) {
            if ((className = getClass.call(filter)) == functionClass) {
              callback = filter;
            } else if (className == arrayClass) {
              // Convert the property names array into a makeshift set.
              properties = {};
              for (var index = 0, length = filter.length, value; index < length; value = filter[index++], ((className = getClass.call(value)), className == stringClass || className == numberClass) && (properties[value] = 1));
            }
          }
          if (width) {
            if ((className = getClass.call(width)) == numberClass) {
              // Convert the `width` to an integer and create a string containing
              // `width` number of space characters.
              if ((width -= width % 1) > 0) {
                for (whitespace = "", width > 10 && (width = 10); whitespace.length < width; whitespace += " ");
              }
            } else if (className == stringClass) {
              whitespace = width.length <= 10 ? width : width.slice(0, 10);
            }
          }
          // Opera <= 7.54u2 discards the values associated with empty string keys
          // (`""`) only if they are used directly within an object member list
          // (e.g., `!("" in { "": 1})`).
          return serialize("", (value = {}, value[""] = source, value), callback, properties, whitespace, "", []);
        };
      }

      // Public: Parses a JSON source string.
      if (!has("json-parse")) {
        var fromCharCode = String.fromCharCode;

        // Internal: A map of escaped control characters and their unescaped
        // equivalents.
        var Unescapes = {
          92: "\\",
          34: '"',
          47: "/",
          98: "\b",
          116: "\t",
          110: "\n",
          102: "\f",
          114: "\r"
        };

        // Internal: Stores the parser state.
        var Index, Source;

        // Internal: Resets the parser state and throws a `SyntaxError`.
        var abort = function () {
          Index = Source = null;
          throw SyntaxError();
        };

        // Internal: Returns the next token, or `"$"` if the parser has reached
        // the end of the source string. A token may be a string, number, `null`
        // literal, or Boolean literal.
        var lex = function () {
          var source = Source, length = source.length, value, begin, position, isSigned, charCode;
          while (Index < length) {
            charCode = source.charCodeAt(Index);
            switch (charCode) {
              case 9: case 10: case 13: case 32:
                // Skip whitespace tokens, including tabs, carriage returns, line
                // feeds, and space characters.
                Index++;
                break;
              case 123: case 125: case 91: case 93: case 58: case 44:
                // Parse a punctuator token (`{`, `}`, `[`, `]`, `:`, or `,`) at
                // the current position.
                value = charIndexBuggy ? source.charAt(Index) : source[Index];
                Index++;
                return value;
              case 34:
                // `"` delimits a JSON string; advance to the next character and
                // begin parsing the string. String tokens are prefixed with the
                // sentinel `@` character to distinguish them from punctuators and
                // end-of-string tokens.
                for (value = "@", Index++; Index < length;) {
                  charCode = source.charCodeAt(Index);
                  if (charCode < 32) {
                    // Unescaped ASCII control characters (those with a code unit
                    // less than the space character) are not permitted.
                    abort();
                  } else if (charCode == 92) {
                    // A reverse solidus (`\`) marks the beginning of an escaped
                    // control character (including `"`, `\`, and `/`) or Unicode
                    // escape sequence.
                    charCode = source.charCodeAt(++Index);
                    switch (charCode) {
                      case 92: case 34: case 47: case 98: case 116: case 110: case 102: case 114:
                        // Revive escaped control characters.
                        value += Unescapes[charCode];
                        Index++;
                        break;
                      case 117:
                        // `\u` marks the beginning of a Unicode escape sequence.
                        // Advance to the first character and validate the
                        // four-digit code point.
                        begin = ++Index;
                        for (position = Index + 4; Index < position; Index++) {
                          charCode = source.charCodeAt(Index);
                          // A valid sequence comprises four hexdigits (case-
                          // insensitive) that form a single hexadecimal value.
                          if (!(charCode >= 48 && charCode <= 57 || charCode >= 97 && charCode <= 102 || charCode >= 65 && charCode <= 70)) {
                            // Invalid Unicode escape sequence.
                            abort();
                          }
                        }
                        // Revive the escaped character.
                        value += fromCharCode("0x" + source.slice(begin, Index));
                        break;
                      default:
                        // Invalid escape sequence.
                        abort();
                    }
                  } else {
                    if (charCode == 34) {
                      // An unescaped double-quote character marks the end of the
                      // string.
                      break;
                    }
                    charCode = source.charCodeAt(Index);
                    begin = Index;
                    // Optimize for the common case where a string is valid.
                    while (charCode >= 32 && charCode != 92 && charCode != 34) {
                      charCode = source.charCodeAt(++Index);
                    }
                    // Append the string as-is.
                    value += source.slice(begin, Index);
                  }
                }
                if (source.charCodeAt(Index) == 34) {
                  // Advance to the next character and return the revived string.
                  Index++;
                  return value;
                }
                // Unterminated string.
                abort();
              default:
                // Parse numbers and literals.
                begin = Index;
                // Advance past the negative sign, if one is specified.
                if (charCode == 45) {
                  isSigned = true;
                  charCode = source.charCodeAt(++Index);
                }
                // Parse an integer or floating-point value.
                if (charCode >= 48 && charCode <= 57) {
                  // Leading zeroes are interpreted as octal literals.
                  if (charCode == 48 && ((charCode = source.charCodeAt(Index + 1)), charCode >= 48 && charCode <= 57)) {
                    // Illegal octal literal.
                    abort();
                  }
                  isSigned = false;
                  // Parse the integer component.
                  for (; Index < length && ((charCode = source.charCodeAt(Index)), charCode >= 48 && charCode <= 57); Index++);
                  // Floats cannot contain a leading decimal point; however, this
                  // case is already accounted for by the parser.
                  if (source.charCodeAt(Index) == 46) {
                    position = ++Index;
                    // Parse the decimal component.
                    for (; position < length && ((charCode = source.charCodeAt(position)), charCode >= 48 && charCode <= 57); position++);
                    if (position == Index) {
                      // Illegal trailing decimal.
                      abort();
                    }
                    Index = position;
                  }
                  // Parse exponents. The `e` denoting the exponent is
                  // case-insensitive.
                  charCode = source.charCodeAt(Index);
                  if (charCode == 101 || charCode == 69) {
                    charCode = source.charCodeAt(++Index);
                    // Skip past the sign following the exponent, if one is
                    // specified.
                    if (charCode == 43 || charCode == 45) {
                      Index++;
                    }
                    // Parse the exponential component.
                    for (position = Index; position < length && ((charCode = source.charCodeAt(position)), charCode >= 48 && charCode <= 57); position++);
                    if (position == Index) {
                      // Illegal empty exponent.
                      abort();
                    }
                    Index = position;
                  }
                  // Coerce the parsed value to a JavaScript number.
                  return +source.slice(begin, Index);
                }
                // A negative sign may only precede numbers.
                if (isSigned) {
                  abort();
                }
                // `true`, `false`, and `null` literals.
                if (source.slice(Index, Index + 4) == "true") {
                  Index += 4;
                  return true;
                } else if (source.slice(Index, Index + 5) == "false") {
                  Index += 5;
                  return false;
                } else if (source.slice(Index, Index + 4) == "null") {
                  Index += 4;
                  return null;
                }
                // Unrecognized token.
                abort();
            }
          }
          // Return the sentinel `$` character if the parser has reached the end
          // of the source string.
          return "$";
        };

        // Internal: Parses a JSON `value` token.
        var get = function (value) {
          var results, hasMembers;
          if (value == "$") {
            // Unexpected end of input.
            abort();
          }
          if (typeof value == "string") {
            if ((charIndexBuggy ? value.charAt(0) : value[0]) == "@") {
              // Remove the sentinel `@` character.
              return value.slice(1);
            }
            // Parse object and array literals.
            if (value == "[") {
              // Parses a JSON array, returning a new JavaScript array.
              results = [];
              for (;; hasMembers || (hasMembers = true)) {
                value = lex();
                // A closing square bracket marks the end of the array literal.
                if (value == "]") {
                  break;
                }
                // If the array literal contains elements, the current token
                // should be a comma separating the previous element from the
                // next.
                if (hasMembers) {
                  if (value == ",") {
                    value = lex();
                    if (value == "]") {
                      // Unexpected trailing `,` in array literal.
                      abort();
                    }
                  } else {
                    // A `,` must separate each array element.
                    abort();
                  }
                }
                // Elisions and leading commas are not permitted.
                if (value == ",") {
                  abort();
                }
                results.push(get(value));
              }
              return results;
            } else if (value == "{") {
              // Parses a JSON object, returning a new JavaScript object.
              results = {};
              for (;; hasMembers || (hasMembers = true)) {
                value = lex();
                // A closing curly brace marks the end of the object literal.
                if (value == "}") {
                  break;
                }
                // If the object literal contains members, the current token
                // should be a comma separator.
                if (hasMembers) {
                  if (value == ",") {
                    value = lex();
                    if (value == "}") {
                      // Unexpected trailing `,` in object literal.
                      abort();
                    }
                  } else {
                    // A `,` must separate each object member.
                    abort();
                  }
                }
                // Leading commas are not permitted, object property names must be
                // double-quoted strings, and a `:` must separate each property
                // name and value.
                if (value == "," || typeof value != "string" || (charIndexBuggy ? value.charAt(0) : value[0]) != "@" || lex() != ":") {
                  abort();
                }
                results[value.slice(1)] = get(lex());
              }
              return results;
            }
            // Unexpected token encountered.
            abort();
          }
          return value;
        };

        // Internal: Updates a traversed object member.
        var update = function (source, property, callback) {
          var element = walk(source, property, callback);
          if (element === undef) {
            delete source[property];
          } else {
            source[property] = element;
          }
        };

        // Internal: Recursively traverses a parsed JSON object, invoking the
        // `callback` function for each value. This is an implementation of the
        // `Walk(holder, name)` operation defined in ES 5.1 section 15.12.2.
        var walk = function (source, property, callback) {
          var value = source[property], length;
          if (typeof value == "object" && value) {
            // `forEach` can't be used to traverse an array in Opera <= 8.54
            // because its `Object#hasOwnProperty` implementation returns `false`
            // for array indices (e.g., `![1, 2, 3].hasOwnProperty("0")`).
            if (getClass.call(value) == arrayClass) {
              for (length = value.length; length--;) {
                update(value, length, callback);
              }
            } else {
              forEach(value, function (property) {
                update(value, property, callback);
              });
            }
          }
          return callback.call(source, property, value);
        };

        // Public: `JSON.parse`. See ES 5.1 section 15.12.2.
        exports.parse = function (source, callback) {
          var result, value;
          Index = 0;
          Source = "" + source;
          result = get(lex());
          // If a JSON string contains multiple tokens, it is invalid.
          if (lex() != "$") {
            abort();
          }
          // Reset the parser state.
          Index = Source = null;
          return callback && getClass.call(callback) == functionClass ? walk((value = {}, value[""] = result, value), "", callback) : result;
        };
      }
    }

    exports["runInContext"] = runInContext;
    return exports;
  }

  if (freeExports && !isLoader) {
    // Export for CommonJS environments.
    runInContext(root, freeExports);
  } else {
    // Export for web browsers and JavaScript engines.
    var nativeJSON = root.JSON,
        previousJSON = root["JSON3"],
        isRestored = false;

    var JSON3 = runInContext(root, (root["JSON3"] = {
      // Public: Restores the original value of the global `JSON` object and
      // returns a reference to the `JSON3` object.
      "noConflict": function () {
        if (!isRestored) {
          isRestored = true;
          root.JSON = nativeJSON;
          root["JSON3"] = previousJSON;
          nativeJSON = previousJSON = null;
        }
        return JSON3;
      }
    }));

    root.JSON = {
      "parse": JSON3.parse,
      "stringify": JSON3.stringify
    };
  }

  // Export for asynchronous module loaders.
  if (isLoader) {
    define(function () {
      return JSON3;
    });
  }
}).call(this);

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],358:[function(require,module,exports){
'use strict';
// Create a range object for efficently rendering strings to elements.
var range;

var doc = typeof document !== 'undefined' && document;

var testEl = doc ?
    doc.body || doc.createElement('div') :
    {};

var NS_XHTML = 'http://www.w3.org/1999/xhtml';

var ELEMENT_NODE = 1;
var TEXT_NODE = 3;
var COMMENT_NODE = 8;

// Fixes <https://github.com/patrick-steele-idem/morphdom/issues/32>
// (IE7+ support) <=IE7 does not support el.hasAttribute(name)
var hasAttributeNS;

if (testEl.hasAttributeNS) {
    hasAttributeNS = function(el, namespaceURI, name) {
        return el.hasAttributeNS(namespaceURI, name);
    };
} else if (testEl.hasAttribute) {
    hasAttributeNS = function(el, namespaceURI, name) {
        return el.hasAttribute(name);
    };
} else {
    hasAttributeNS = function(el, namespaceURI, name) {
        return !!el.getAttributeNode(name);
    };
}

function toElement(str) {
    if (!range && doc.createRange) {
        range = doc.createRange();
        range.selectNode(doc.body);
    }

    var fragment;
    if (range && range.createContextualFragment) {
        fragment = range.createContextualFragment(str);
    } else {
        fragment = doc.createElement('body');
        fragment.innerHTML = str;
    }
    return fragment.childNodes[0];
}

function syncBooleanAttrProp(fromEl, toEl, name) {
    if (fromEl[name] !== toEl[name]) {
        fromEl[name] = toEl[name];
        if (fromEl[name]) {
            fromEl.setAttribute(name, '');
        } else {
            fromEl.removeAttribute(name, '');
        }
    }
}

var specialElHandlers = {
    /**
     * Needed for IE. Apparently IE doesn't think that "selected" is an
     * attribute when reading over the attributes using selectEl.attributes
     */
    OPTION: function(fromEl, toEl) {
        syncBooleanAttrProp(fromEl, toEl, 'selected');
    },
    /**
     * The "value" attribute is special for the <input> element since it sets
     * the initial value. Changing the "value" attribute without changing the
     * "value" property will have no effect since it is only used to the set the
     * initial value.  Similar for the "checked" attribute, and "disabled".
     */
    INPUT: function(fromEl, toEl) {
        syncBooleanAttrProp(fromEl, toEl, 'checked');
        syncBooleanAttrProp(fromEl, toEl, 'disabled');

        if (fromEl.value !== toEl.value) {
            fromEl.value = toEl.value;
        }

        if (!hasAttributeNS(toEl, null, 'value')) {
            fromEl.removeAttribute('value');
        }
    },

    TEXTAREA: function(fromEl, toEl) {
        var newValue = toEl.value;
        if (fromEl.value !== newValue) {
            fromEl.value = newValue;
        }

        if (fromEl.firstChild) {
            fromEl.firstChild.nodeValue = newValue;
        }
    }
};

function noop() {}

/**
 * Returns true if two node's names are the same.
 *
 * NOTE: We don't bother checking `namespaceURI` because you will never find two HTML elements with the same
 *       nodeName and different namespace URIs.
 *
 * @param {Element} a
 * @param {Element} b The target element
 * @return {boolean}
 */
function compareNodeNames(fromEl, toEl) {
    var fromNodeName = fromEl.nodeName;
    var toNodeName = toEl.nodeName;

    if (fromNodeName === toNodeName) {
        return true;
    }

    if (toEl.actualize &&
        fromNodeName.charCodeAt(0) < 91 && /* from tag name is upper case */
        toNodeName.charCodeAt(0) > 90 /* target tag name is lower case */) {
        // If the target element is a virtual DOM node then we may need to normalize the tag name
        // before comparing. Normal HTML elements that are in the "http://www.w3.org/1999/xhtml"
        // are converted to upper case
        return fromNodeName === toNodeName.toUpperCase();
    } else {
        return false;
    }
}

/**
 * Create an element, optionally with a known namespace URI.
 *
 * @param {string} name the element name, e.g. 'div' or 'svg'
 * @param {string} [namespaceURI] the element's namespace URI, i.e. the value of
 * its `xmlns` attribute or its inferred namespace.
 *
 * @return {Element}
 */
function createElementNS(name, namespaceURI) {
    return !namespaceURI || namespaceURI === NS_XHTML ?
        doc.createElement(name) :
        doc.createElementNS(namespaceURI, name);
}

/**
 * Loop over all of the attributes on the target node and make sure the original
 * DOM node has the same attributes. If an attribute found on the original node
 * is not on the new node then remove it from the original node.
 *
 * @param  {Element} fromNode
 * @param  {Element} toNode
 */
function morphAttrs(fromNode, toNode) {
    var attrs = toNode.attributes;
    var i;
    var attr;
    var attrName;
    var attrNamespaceURI;
    var attrValue;
    var fromValue;

    if (toNode.assignAttributes) {
        toNode.assignAttributes(fromNode);
    } else {
        for (i = attrs.length - 1; i >= 0; --i) {
            attr = attrs[i];
            attrName = attr.name;
            attrNamespaceURI = attr.namespaceURI;
            attrValue = attr.value;

            if (attrNamespaceURI) {
                attrName = attr.localName || attrName;
                fromValue = fromNode.getAttributeNS(attrNamespaceURI, attrName);

                if (fromValue !== attrValue) {
                    fromNode.setAttributeNS(attrNamespaceURI, attrName, attrValue);
                }
            } else {
                fromValue = fromNode.getAttribute(attrName);

                if (fromValue !== attrValue) {
                    fromNode.setAttribute(attrName, attrValue);
                }
            }
        }
    }

    // Remove any extra attributes found on the original DOM element that
    // weren't found on the target element.
    attrs = fromNode.attributes;

    for (i = attrs.length - 1; i >= 0; --i) {
        attr = attrs[i];
        if (attr.specified !== false) {
            attrName = attr.name;
            attrNamespaceURI = attr.namespaceURI;

            if (attrNamespaceURI) {
                attrName = attr.localName || attrName;

                if (!hasAttributeNS(toNode, attrNamespaceURI, attrName)) {
                    fromNode.removeAttributeNS(attrNamespaceURI, attrName);
                }
            } else {
                if (!hasAttributeNS(toNode, null, attrName)) {
                    fromNode.removeAttribute(attrName);
                }
            }
        }
    }
}

/**
 * Copies the children of one DOM element to another DOM element
 */
function moveChildren(fromEl, toEl) {
    var curChild = fromEl.firstChild;
    while (curChild) {
        var nextChild = curChild.nextSibling;
        toEl.appendChild(curChild);
        curChild = nextChild;
    }
    return toEl;
}

function defaultGetNodeKey(node) {
    return node.id;
}

function morphdom(fromNode, toNode, options) {
    if (!options) {
        options = {};
    }

    if (typeof toNode === 'string') {
        if (fromNode.nodeName === '#document' || fromNode.nodeName === 'HTML') {
            var toNodeHtml = toNode;
            toNode = doc.createElement('html');
            toNode.innerHTML = toNodeHtml;
        } else {
            toNode = toElement(toNode);
        }
    }

    var getNodeKey = options.getNodeKey || defaultGetNodeKey;
    var onBeforeNodeAdded = options.onBeforeNodeAdded || noop;
    var onNodeAdded = options.onNodeAdded || noop;
    var onBeforeElUpdated = options.onBeforeElUpdated || noop;
    var onElUpdated = options.onElUpdated || noop;
    var onBeforeNodeDiscarded = options.onBeforeNodeDiscarded || noop;
    var onNodeDiscarded = options.onNodeDiscarded || noop;
    var onBeforeElChildrenUpdated = options.onBeforeElChildrenUpdated || noop;
    var childrenOnly = options.childrenOnly === true;

    // This object is used as a lookup to quickly find all keyed elements in the original DOM tree.
    var fromNodesLookup = {};
    var keyedRemovalList;

    function addKeyedRemoval(key) {
        if (keyedRemovalList) {
            keyedRemovalList.push(key);
        } else {
            keyedRemovalList = [key];
        }
    }

    function walkDiscardedChildNodes(node, skipKeyedNodes) {
        if (node.nodeType === ELEMENT_NODE) {
            var curChild = node.firstChild;
            while (curChild) {

                var key = undefined;

                if (skipKeyedNodes && (key = getNodeKey(curChild))) {
                    // If we are skipping keyed nodes then we add the key
                    // to a list so that it can be handled at the very end.
                    addKeyedRemoval(key);
                } else {
                    // Only report the node as discarded if it is not keyed. We do this because
                    // at the end we loop through all keyed elements that were unmatched
                    // and then discard them in one final pass.
                    onNodeDiscarded(curChild);
                    if (curChild.firstChild) {
                        walkDiscardedChildNodes(curChild, skipKeyedNodes);
                    }
                }

                curChild = curChild.nextSibling;
            }
        }
    }

    /**
     * Removes a DOM node out of the original DOM
     *
     * @param  {Node} node The node to remove
     * @param  {Node} parentNode The nodes parent
     * @param  {Boolean} skipKeyedNodes If true then elements with keys will be skipped and not discarded.
     * @return {undefined}
     */
    function removeNode(node, parentNode, skipKeyedNodes) {
        if (onBeforeNodeDiscarded(node) === false) {
            return;
        }

        if (parentNode) {
            parentNode.removeChild(node);
        }

        onNodeDiscarded(node);
        walkDiscardedChildNodes(node, skipKeyedNodes);
    }

    // // TreeWalker implementation is no faster, but keeping this around in case this changes in the future
    // function indexTree(root) {
    //     var treeWalker = document.createTreeWalker(
    //         root,
    //         NodeFilter.SHOW_ELEMENT);
    //
    //     var el;
    //     while((el = treeWalker.nextNode())) {
    //         var key = getNodeKey(el);
    //         if (key) {
    //             fromNodesLookup[key] = el;
    //         }
    //     }
    // }

    // // NodeIterator implementation is no faster, but keeping this around in case this changes in the future
    //
    // function indexTree(node) {
    //     var nodeIterator = document.createNodeIterator(node, NodeFilter.SHOW_ELEMENT);
    //     var el;
    //     while((el = nodeIterator.nextNode())) {
    //         var key = getNodeKey(el);
    //         if (key) {
    //             fromNodesLookup[key] = el;
    //         }
    //     }
    // }

    function indexTree(node) {
        if (node.nodeType === ELEMENT_NODE) {
            var curChild = node.firstChild;
            while (curChild) {
                var key = getNodeKey(curChild);
                if (key) {
                    fromNodesLookup[key] = curChild;
                }

                // Walk recursively
                indexTree(curChild);

                curChild = curChild.nextSibling;
            }
        }
    }

    indexTree(fromNode);

    function handleNodeAdded(el) {
        onNodeAdded(el);

        var curChild = el.firstChild;
        while (curChild) {
            var nextSibling = curChild.nextSibling;

            var key = getNodeKey(curChild);
            if (key) {
                var unmatchedFromEl = fromNodesLookup[key];
                if (unmatchedFromEl && compareNodeNames(curChild, unmatchedFromEl)) {
                    curChild.parentNode.replaceChild(unmatchedFromEl, curChild);
                    morphEl(unmatchedFromEl, curChild);
                }
            }

            handleNodeAdded(curChild);
            curChild = nextSibling;
        }
    }

    function morphEl(fromEl, toEl, childrenOnly) {
        var toElKey = getNodeKey(toEl);
        var curFromNodeKey;

        if (toElKey) {
            // If an element with an ID is being morphed then it is will be in the final
            // DOM so clear it out of the saved elements collection
            delete fromNodesLookup[toElKey];
        }

        if (toNode.isSameNode && toNode.isSameNode(fromNode)) {
            return;
        }

        if (!childrenOnly) {
            if (onBeforeElUpdated(fromEl, toEl) === false) {
                return;
            }

            morphAttrs(fromEl, toEl);
            onElUpdated(fromEl);

            if (onBeforeElChildrenUpdated(fromEl, toEl) === false) {
                return;
            }
        }

        if (fromEl.nodeName !== 'TEXTAREA') {
            var curToNodeChild = toEl.firstChild;
            var curFromNodeChild = fromEl.firstChild;
            var curToNodeKey;

            var fromNextSibling;
            var toNextSibling;
            var matchingFromEl;

            outer: while (curToNodeChild) {
                toNextSibling = curToNodeChild.nextSibling;
                curToNodeKey = getNodeKey(curToNodeChild);

                while (curFromNodeChild) {
                    fromNextSibling = curFromNodeChild.nextSibling;

                    if (curToNodeChild.isSameNode && curToNodeChild.isSameNode(curFromNodeChild)) {
                        curToNodeChild = toNextSibling;
                        curFromNodeChild = fromNextSibling;
                        continue outer;
                    }

                    curFromNodeKey = getNodeKey(curFromNodeChild);

                    var curFromNodeType = curFromNodeChild.nodeType;

                    var isCompatible = undefined;

                    if (curFromNodeType === curToNodeChild.nodeType) {
                        if (curFromNodeType === ELEMENT_NODE) {
                            // Both nodes being compared are Element nodes

                            if (curToNodeKey) {
                                // The target node has a key so we want to match it up with the correct element
                                // in the original DOM tree
                                if (curToNodeKey !== curFromNodeKey) {
                                    // The current element in the original DOM tree does not have a matching key so
                                    // let's check our lookup to see if there is a matching element in the original
                                    // DOM tree
                                    if ((matchingFromEl = fromNodesLookup[curToNodeKey])) {
                                        if (curFromNodeChild.nextSibling === matchingFromEl) {
                                            // Special case for single element removals. To avoid removing the original
                                            // DOM node out of the tree (since that can break CSS transitions, etc.),
                                            // we will instead discard the current node and wait until the next
                                            // iteration to properly match up the keyed target element with its matching
                                            // element in the original tree
                                            isCompatible = false;
                                        } else {
                                            // We found a matching keyed element somewhere in the original DOM tree.
                                            // Let's moving the original DOM node into the current position and morph
                                            // it.

                                            // NOTE: We use insertBefore instead of replaceChild because we want to go through
                                            // the `removeNode()` function for the node that is being discarded so that
                                            // all lifecycle hooks are correctly invoked
                                            fromEl.insertBefore(matchingFromEl, curFromNodeChild);

                                            if (curFromNodeKey) {
                                                // Since the node is keyed it might be matched up later so we defer
                                                // the actual removal to later
                                                addKeyedRemoval(curFromNodeKey);
                                            } else {
                                                // NOTE: we skip nested keyed nodes from being removed since there is
                                                //       still a chance they will be matched up later
                                                removeNode(curFromNodeChild, fromEl, true /* skip keyed nodes */);

                                            }
                                            fromNextSibling = curFromNodeChild.nextSibling;
                                            curFromNodeChild = matchingFromEl;
                                        }
                                    } else {
                                        // The nodes are not compatible since the "to" node has a key and there
                                        // is no matching keyed node in the source tree
                                        isCompatible = false;
                                    }
                                }
                            } else if (curFromNodeKey) {
                                // The original has a key
                                isCompatible = false;
                            }

                            isCompatible = isCompatible !== false && compareNodeNames(curFromNodeChild, curToNodeChild);
                            if (isCompatible) {
                                // We found compatible DOM elements so transform
                                // the current "from" node to match the current
                                // target DOM node.
                                morphEl(curFromNodeChild, curToNodeChild);
                            }

                        } else if (curFromNodeType === TEXT_NODE || curFromNodeType == COMMENT_NODE) {
                            // Both nodes being compared are Text or Comment nodes
                            isCompatible = true;
                            // Simply update nodeValue on the original node to
                            // change the text value
                            curFromNodeChild.nodeValue = curToNodeChild.nodeValue;
                        }
                    }

                    if (isCompatible) {
                        // Advance both the "to" child and the "from" child since we found a match
                        curToNodeChild = toNextSibling;
                        curFromNodeChild = fromNextSibling;
                        continue outer;
                    }

                    // No compatible match so remove the old node from the DOM and continue trying to find a
                    // match in the original DOM. However, we only do this if the from node is not keyed
                    // since it is possible that a keyed node might match up with a node somewhere else in the
                    // target tree and we don't want to discard it just yet since it still might find a
                    // home in the final DOM tree. After everything is done we will remove any keyed nodes
                    // that didn't find a home
                    if (curFromNodeKey) {
                        // Since the node is keyed it might be matched up later so we defer
                        // the actual removal to later
                        addKeyedRemoval(curFromNodeKey);
                    } else {
                        // NOTE: we skip nested keyed nodes from being removed since there is
                        //       still a chance they will be matched up later
                        removeNode(curFromNodeChild, fromEl, true /* skip keyed nodes */);
                    }

                    curFromNodeChild = fromNextSibling;
                }

                // If we got this far then we did not find a candidate match for
                // our "to node" and we exhausted all of the children "from"
                // nodes. Therefore, we will just append the current "to" node
                // to the end
                if (curToNodeKey && (matchingFromEl = fromNodesLookup[curToNodeKey]) && compareNodeNames(matchingFromEl, curToNodeChild)) {
                    fromEl.appendChild(matchingFromEl);
                    morphEl(matchingFromEl, curToNodeChild);
                } else {
                    var onBeforeNodeAddedResult = onBeforeNodeAdded(curToNodeChild);
                    if (onBeforeNodeAddedResult !== false) {
                        if (onBeforeNodeAddedResult) {
                            curToNodeChild = onBeforeNodeAddedResult;
                        }

                        if (curToNodeChild.actualize) {
                            curToNodeChild = curToNodeChild.actualize(fromEl.ownerDocument || doc);
                        }
                        fromEl.appendChild(curToNodeChild);
                        handleNodeAdded(curToNodeChild);
                    }
                }

                curToNodeChild = toNextSibling;
                curFromNodeChild = fromNextSibling;
            }

            // We have processed all of the "to nodes". If curFromNodeChild is
            // non-null then we still have some from nodes left over that need
            // to be removed
            while (curFromNodeChild) {
                fromNextSibling = curFromNodeChild.nextSibling;
                if ((curFromNodeKey = getNodeKey(curFromNodeChild))) {
                    // Since the node is keyed it might be matched up later so we defer
                    // the actual removal to later
                    addKeyedRemoval(curFromNodeKey);
                } else {
                    // NOTE: we skip nested keyed nodes from being removed since there is
                    //       still a chance they will be matched up later
                    removeNode(curFromNodeChild, fromEl, true /* skip keyed nodes */);
                }
                curFromNodeChild = fromNextSibling;
            }
        }

        var specialElHandler = specialElHandlers[fromEl.nodeName];
        if (specialElHandler) {
            specialElHandler(fromEl, toEl);
        }
    } // END: morphEl(...)

    var morphedNode = fromNode;
    var morphedNodeType = morphedNode.nodeType;
    var toNodeType = toNode.nodeType;

    if (!childrenOnly) {
        // Handle the case where we are given two DOM nodes that are not
        // compatible (e.g. <div> --> <span> or <div> --> TEXT)
        if (morphedNodeType === ELEMENT_NODE) {
            if (toNodeType === ELEMENT_NODE) {
                if (!compareNodeNames(fromNode, toNode)) {
                    onNodeDiscarded(fromNode);
                    morphedNode = moveChildren(fromNode, createElementNS(toNode.nodeName, toNode.namespaceURI));
                }
            } else {
                // Going from an element node to a text node
                morphedNode = toNode;
            }
        } else if (morphedNodeType === TEXT_NODE || morphedNodeType === COMMENT_NODE) { // Text or comment node
            if (toNodeType === morphedNodeType) {
                morphedNode.nodeValue = toNode.nodeValue;
                return morphedNode;
            } else {
                // Text node to something else
                morphedNode = toNode;
            }
        }
    }

    if (morphedNode === toNode) {
        // The "to node" was not compatible with the "from node" so we had to
        // toss out the "from node" and use the "to node"
        onNodeDiscarded(fromNode);
    } else {
        morphEl(morphedNode, toNode, childrenOnly);

        // We now need to loop over any keyed nodes that might need to be
        // removed. We only do the removal if we know that the keyed node
        // never found a match. When a keyed node is matched up we remove
        // it out of fromNodesLookup and we use fromNodesLookup to determine
        // if a keyed node has been matched up or not
        if (keyedRemovalList) {
            for (var i=0, len=keyedRemovalList.length; i<len; i++) {
                var elToRemove = fromNodesLookup[keyedRemovalList[i]];
                if (elToRemove) {
                    removeNode(elToRemove, elToRemove.parentNode, false);
                }
            }
        }
    }

    if (!childrenOnly && morphedNode !== fromNode && fromNode.parentNode) {
        if (morphedNode.actualize) {
            morphedNode = morphedNode.actualize(fromNode.ownerDocument || doc);
        }
        // If we had to swap out the from node with a new node because the old
        // node was not compatible with the target node then we need to
        // replace the old DOM node in the original DOM tree. This is only
        // possible if the original DOM node was part of a DOM tree which
        // we know is the case if it has a parent node.
        fromNode.parentNode.replaceChild(morphedNode, fromNode);
    }

    return morphedNode;
}

module.exports = morphdom;

},{}],359:[function(require,module,exports){
/**
 * Helpers.
 */

var s = 1000;
var m = s * 60;
var h = m * 60;
var d = h * 24;
var y = d * 365.25;

/**
 * Parse or format the given `val`.
 *
 * Options:
 *
 *  - `long` verbose formatting [false]
 *
 * @param {String|Number} val
 * @param {Object} options
 * @return {String|Number}
 * @api public
 */

module.exports = function(val, options){
  options = options || {};
  if ('string' == typeof val) return parse(val);
  return options.long
    ? long(val)
    : short(val);
};

/**
 * Parse the given `str` and return milliseconds.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function parse(str) {
  str = '' + str;
  if (str.length > 10000) return;
  var match = /^((?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|years?|yrs?|y)?$/i.exec(str);
  if (!match) return;
  var n = parseFloat(match[1]);
  var type = (match[2] || 'ms').toLowerCase();
  switch (type) {
    case 'years':
    case 'year':
    case 'yrs':
    case 'yr':
    case 'y':
      return n * y;
    case 'days':
    case 'day':
    case 'd':
      return n * d;
    case 'hours':
    case 'hour':
    case 'hrs':
    case 'hr':
    case 'h':
      return n * h;
    case 'minutes':
    case 'minute':
    case 'mins':
    case 'min':
    case 'm':
      return n * m;
    case 'seconds':
    case 'second':
    case 'secs':
    case 'sec':
    case 's':
      return n * s;
    case 'milliseconds':
    case 'millisecond':
    case 'msecs':
    case 'msec':
    case 'ms':
      return n;
  }
}

/**
 * Short format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function short(ms) {
  if (ms >= d) return Math.round(ms / d) + 'd';
  if (ms >= h) return Math.round(ms / h) + 'h';
  if (ms >= m) return Math.round(ms / m) + 'm';
  if (ms >= s) return Math.round(ms / s) + 's';
  return ms + 'ms';
}

/**
 * Long format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function long(ms) {
  return plural(ms, d, 'day')
    || plural(ms, h, 'hour')
    || plural(ms, m, 'minute')
    || plural(ms, s, 'second')
    || ms + ' ms';
}

/**
 * Pluralization helper.
 */

function plural(ms, n, name) {
  if (ms < n) return;
  if (ms < n * 1.5) return Math.floor(ms / n) + ' ' + name;
  return Math.ceil(ms / n) + ' ' + name + 's';
}

},{}],360:[function(require,module,exports){
/* global MutationObserver */
var document = require('global/document')
var window = require('global/window')
var watch = Object.create(null)
var KEY_ID = 'onloadid' + (new Date() % 9e6).toString(36)
var KEY_ATTR = 'data-' + KEY_ID
var INDEX = 0

if (window && window.MutationObserver) {
  var observer = new MutationObserver(function (mutations) {
    if (Object.keys(watch).length < 1) return
    for (var i = 0; i < mutations.length; i++) {
      if (mutations[i].attributeName === KEY_ATTR) {
        eachAttr(mutations[i], turnon, turnoff)
        continue
      }
      eachMutation(mutations[i].removedNodes, turnoff)
      eachMutation(mutations[i].addedNodes, turnon)
    }
  })
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeOldValue: true,
    attributeFilter: [KEY_ATTR]
  })
}

module.exports = function onload (el, on, off, caller) {
  on = on || function () {}
  off = off || function () {}
  el.setAttribute(KEY_ATTR, 'o' + INDEX)
  watch['o' + INDEX] = [on, off, 0, caller || onload.caller]
  INDEX += 1
  return el
}

function turnon (index, el) {
  if (watch[index][0] && watch[index][2] === 0) {
    watch[index][0](el)
    watch[index][2] = 1
  }
}

function turnoff (index, el) {
  if (watch[index][1] && watch[index][2] === 1) {
    watch[index][1](el)
    watch[index][2] = 0
  }
}

function eachAttr (mutation, on, off) {
  var newValue = mutation.target.getAttribute(KEY_ATTR)
  if (sameOrigin(mutation.oldValue, newValue)) {
    watch[newValue] = watch[mutation.oldValue]
    return
  }
  if (watch[mutation.oldValue]) {
    off(mutation.oldValue, mutation.target)
  }
  if (watch[newValue]) {
    on(newValue, mutation.target)
  }
}

function sameOrigin (oldValue, newValue) {
  if (!oldValue || !newValue) return false
  return watch[oldValue][3] === watch[newValue][3]
}

function eachMutation (nodes, fn) {
  var keys = Object.keys(watch)
  for (var i = 0; i < nodes.length; i++) {
    if (nodes[i] && nodes[i].getAttribute && nodes[i].getAttribute(KEY_ATTR)) {
      var onloadid = nodes[i].getAttribute(KEY_ATTR)
      keys.forEach(function (k) {
        if (onloadid === k) {
          fn(k, nodes[i])
        }
      })
    }
    if (nodes[i].childNodes.length > 0) {
      eachMutation(nodes[i].childNodes, fn)
    }
  }
}

},{"global/document":349,"global/window":350}],361:[function(require,module,exports){
(function (process){
  /* globals require, module */

  'use strict';

  /**
   * Module dependencies.
   */

  var pathtoRegexp = require('path-to-regexp');

  /**
   * Module exports.
   */

  module.exports = page;

  /**
   * Detect click event
   */
  var clickEvent = ('undefined' !== typeof document) && document.ontouchstart ? 'touchstart' : 'click';

  /**
   * To work properly with the URL
   * history.location generated polyfill in https://github.com/devote/HTML5-History-API
   */

  var location = ('undefined' !== typeof window) && (window.history.location || window.location);

  /**
   * Perform initial dispatch.
   */

  var dispatch = true;


  /**
   * Decode URL components (query string, pathname, hash).
   * Accommodates both regular percent encoding and x-www-form-urlencoded format.
   */
  var decodeURLComponents = true;

  /**
   * Base path.
   */

  var base = '';

  /**
   * Running flag.
   */

  var running;

  /**
   * HashBang option
   */

  var hashbang = false;

  /**
   * Previous context, for capturing
   * page exit events.
   */

  var prevContext;

  /**
   * Register `path` with callback `fn()`,
   * or route `path`, or redirection,
   * or `page.start()`.
   *
   *   page(fn);
   *   page('*', fn);
   *   page('/user/:id', load, user);
   *   page('/user/' + user.id, { some: 'thing' });
   *   page('/user/' + user.id);
   *   page('/from', '/to')
   *   page();
   *
   * @param {string|!Function|!Object} path
   * @param {Function=} fn
   * @api public
   */

  function page(path, fn) {
    // <callback>
    if ('function' === typeof path) {
      return page('*', path);
    }

    // route <path> to <callback ...>
    if ('function' === typeof fn) {
      var route = new Route(/** @type {string} */ (path));
      for (var i = 1; i < arguments.length; ++i) {
        page.callbacks.push(route.middleware(arguments[i]));
      }
      // show <path> with [state]
    } else if ('string' === typeof path) {
      page['string' === typeof fn ? 'redirect' : 'show'](path, fn);
      // start [options]
    } else {
      page.start(path);
    }
  }

  /**
   * Callback functions.
   */

  page.callbacks = [];
  page.exits = [];

  /**
   * Current path being processed
   * @type {string}
   */
  page.current = '';

  /**
   * Number of pages navigated to.
   * @type {number}
   *
   *     page.len == 0;
   *     page('/login');
   *     page.len == 1;
   */

  page.len = 0;

  /**
   * Get or set basepath to `path`.
   *
   * @param {string} path
   * @api public
   */

  page.base = function(path) {
    if (0 === arguments.length) return base;
    base = path;
  };

  /**
   * Bind with the given `options`.
   *
   * Options:
   *
   *    - `click` bind to click events [true]
   *    - `popstate` bind to popstate [true]
   *    - `dispatch` perform initial dispatch [true]
   *
   * @param {Object} options
   * @api public
   */

  page.start = function(options) {
    options = options || {};
    if (running) return;
    running = true;
    if (false === options.dispatch) dispatch = false;
    if (false === options.decodeURLComponents) decodeURLComponents = false;
    if (false !== options.popstate) window.addEventListener('popstate', onpopstate, false);
    if (false !== options.click) {
      document.addEventListener(clickEvent, onclick, false);
    }
    if (true === options.hashbang) hashbang = true;
    if (!dispatch) return;
    var url = (hashbang && ~location.hash.indexOf('#!')) ? location.hash.substr(2) + location.search : location.pathname + location.search + location.hash;
    page.replace(url, null, true, dispatch);
  };

  /**
   * Unbind click and popstate event handlers.
   *
   * @api public
   */

  page.stop = function() {
    if (!running) return;
    page.current = '';
    page.len = 0;
    running = false;
    document.removeEventListener(clickEvent, onclick, false);
    window.removeEventListener('popstate', onpopstate, false);
  };

  /**
   * Show `path` with optional `state` object.
   *
   * @param {string} path
   * @param {Object=} state
   * @param {boolean=} dispatch
   * @param {boolean=} push
   * @return {!Context}
   * @api public
   */

  page.show = function(path, state, dispatch, push) {
    var ctx = new Context(path, state);
    page.current = ctx.path;
    if (false !== dispatch) page.dispatch(ctx);
    if (false !== ctx.handled && false !== push) ctx.pushState();
    return ctx;
  };

  /**
   * Goes back in the history
   * Back should always let the current route push state and then go back.
   *
   * @param {string} path - fallback path to go back if no more history exists, if undefined defaults to page.base
   * @param {Object=} state
   * @api public
   */

  page.back = function(path, state) {
    if (page.len > 0) {
      // this may need more testing to see if all browsers
      // wait for the next tick to go back in history
      history.back();
      page.len--;
    } else if (path) {
      setTimeout(function() {
        page.show(path, state);
      });
    }else{
      setTimeout(function() {
        page.show(base, state);
      });
    }
  };


  /**
   * Register route to redirect from one path to other
   * or just redirect to another route
   *
   * @param {string} from - if param 'to' is undefined redirects to 'from'
   * @param {string=} to
   * @api public
   */
  page.redirect = function(from, to) {
    // Define route from a path to another
    if ('string' === typeof from && 'string' === typeof to) {
      page(from, function(e) {
        setTimeout(function() {
          page.replace(/** @type {!string} */ (to));
        }, 0);
      });
    }

    // Wait for the push state and replace it with another
    if ('string' === typeof from && 'undefined' === typeof to) {
      setTimeout(function() {
        page.replace(from);
      }, 0);
    }
  };

  /**
   * Replace `path` with optional `state` object.
   *
   * @param {string} path
   * @param {Object=} state
   * @param {boolean=} init
   * @param {boolean=} dispatch
   * @return {!Context}
   * @api public
   */


  page.replace = function(path, state, init, dispatch) {
    var ctx = new Context(path, state);
    page.current = ctx.path;
    ctx.init = init;
    ctx.save(); // save before dispatching, which may redirect
    if (false !== dispatch) page.dispatch(ctx);
    return ctx;
  };

  /**
   * Dispatch the given `ctx`.
   *
   * @param {Context} ctx
   * @api private
   */
  page.dispatch = function(ctx) {
    var prev = prevContext,
      i = 0,
      j = 0;

    prevContext = ctx;

    function nextExit() {
      var fn = page.exits[j++];
      if (!fn) return nextEnter();
      fn(prev, nextExit);
    }

    function nextEnter() {
      var fn = page.callbacks[i++];

      if (ctx.path !== page.current) {
        ctx.handled = false;
        return;
      }
      if (!fn) return unhandled(ctx);
      fn(ctx, nextEnter);
    }

    if (prev) {
      nextExit();
    } else {
      nextEnter();
    }
  };

  /**
   * Unhandled `ctx`. When it's not the initial
   * popstate then redirect. If you wish to handle
   * 404s on your own use `page('*', callback)`.
   *
   * @param {Context} ctx
   * @api private
   */
  function unhandled(ctx) {
    if (ctx.handled) return;
    var current;

    if (hashbang) {
      current = base + location.hash.replace('#!', '');
    } else {
      current = location.pathname + location.search;
    }

    if (current === ctx.canonicalPath) return;
    page.stop();
    ctx.handled = false;
    location.href = ctx.canonicalPath;
  }

  /**
   * Register an exit route on `path` with
   * callback `fn()`, which will be called
   * on the previous context when a new
   * page is visited.
   */
  page.exit = function(path, fn) {
    if (typeof path === 'function') {
      return page.exit('*', path);
    }

    var route = new Route(path);
    for (var i = 1; i < arguments.length; ++i) {
      page.exits.push(route.middleware(arguments[i]));
    }
  };

  /**
   * Remove URL encoding from the given `str`.
   * Accommodates whitespace in both x-www-form-urlencoded
   * and regular percent-encoded form.
   *
   * @param {string} val - URL component to decode
   */
  function decodeURLEncodedURIComponent(val) {
    if (typeof val !== 'string') { return val; }
    return decodeURLComponents ? decodeURIComponent(val.replace(/\+/g, ' ')) : val;
  }

  /**
   * Initialize a new "request" `Context`
   * with the given `path` and optional initial `state`.
   *
   * @constructor
   * @param {string} path
   * @param {Object=} state
   * @api public
   */

  function Context(path, state) {
    if ('/' === path[0] && 0 !== path.indexOf(base)) path = base + (hashbang ? '#!' : '') + path;
    var i = path.indexOf('?');

    this.canonicalPath = path;
    this.path = path.replace(base, '') || '/';
    if (hashbang) this.path = this.path.replace('#!', '') || '/';

    this.title = document.title;
    this.state = state || {};
    this.state.path = path;
    this.querystring = ~i ? decodeURLEncodedURIComponent(path.slice(i + 1)) : '';
    this.pathname = decodeURLEncodedURIComponent(~i ? path.slice(0, i) : path);
    this.params = {};

    // fragment
    this.hash = '';
    if (!hashbang) {
      if (!~this.path.indexOf('#')) return;
      var parts = this.path.split('#');
      this.path = parts[0];
      this.hash = decodeURLEncodedURIComponent(parts[1]) || '';
      this.querystring = this.querystring.split('#')[0];
    }
  }

  /**
   * Expose `Context`.
   */

  page.Context = Context;

  /**
   * Push state.
   *
   * @api private
   */

  Context.prototype.pushState = function() {
    page.len++;
    history.pushState(this.state, this.title, hashbang && this.path !== '/' ? '#!' + this.path : this.canonicalPath);
  };

  /**
   * Save the context state.
   *
   * @api public
   */

  Context.prototype.save = function() {
    history.replaceState(this.state, this.title, hashbang && this.path !== '/' ? '#!' + this.path : this.canonicalPath);
  };

  /**
   * Initialize `Route` with the given HTTP `path`,
   * and an array of `callbacks` and `options`.
   *
   * Options:
   *
   *   - `sensitive`    enable case-sensitive routes
   *   - `strict`       enable strict matching for trailing slashes
   *
   * @constructor
   * @param {string} path
   * @param {Object=} options
   * @api private
   */

  function Route(path, options) {
    options = options || {};
    this.path = (path === '*') ? '(.*)' : path;
    this.method = 'GET';
    this.regexp = pathtoRegexp(this.path,
      this.keys = [],
      options);
  }

  /**
   * Expose `Route`.
   */

  page.Route = Route;

  /**
   * Return route middleware with
   * the given callback `fn()`.
   *
   * @param {Function} fn
   * @return {Function}
   * @api public
   */

  Route.prototype.middleware = function(fn) {
    var self = this;
    return function(ctx, next) {
      if (self.match(ctx.path, ctx.params)) return fn(ctx, next);
      next();
    };
  };

  /**
   * Check if this route matches `path`, if so
   * populate `params`.
   *
   * @param {string} path
   * @param {Object} params
   * @return {boolean}
   * @api private
   */

  Route.prototype.match = function(path, params) {
    var keys = this.keys,
      qsIndex = path.indexOf('?'),
      pathname = ~qsIndex ? path.slice(0, qsIndex) : path,
      m = this.regexp.exec(decodeURIComponent(pathname));

    if (!m) return false;

    for (var i = 1, len = m.length; i < len; ++i) {
      var key = keys[i - 1];
      var val = decodeURLEncodedURIComponent(m[i]);
      if (val !== undefined || !(hasOwnProperty.call(params, key.name))) {
        params[key.name] = val;
      }
    }

    return true;
  };


  /**
   * Handle "populate" events.
   */

  var onpopstate = (function () {
    var loaded = false;
    if ('undefined' === typeof window) {
      return;
    }
    if (document.readyState === 'complete') {
      loaded = true;
    } else {
      window.addEventListener('load', function() {
        setTimeout(function() {
          loaded = true;
        }, 0);
      });
    }
    return function onpopstate(e) {
      if (!loaded) return;
      if (e.state) {
        var path = e.state.path;
        page.replace(path, e.state);
      } else {
        page.show(location.pathname + location.hash, undefined, undefined, false);
      }
    };
  })();
  /**
   * Handle "click" events.
   */

  function onclick(e) {

    if (1 !== which(e)) return;

    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    if (e.defaultPrevented) return;



    // ensure link
    // use shadow dom when available
    var el = e.path ? e.path[0] : e.target;
    while (el && 'A' !== el.nodeName) el = el.parentNode;
    if (!el || 'A' !== el.nodeName) return;



    // Ignore if tag has
    // 1. "download" attribute
    // 2. rel="external" attribute
    if (el.hasAttribute('download') || el.getAttribute('rel') === 'external') return;

    // ensure non-hash for the same path
    var link = el.getAttribute('href');
    if (!hashbang && el.pathname === location.pathname && (el.hash || '#' === link)) return;



    // Check for mailto: in the href
    if (link && link.indexOf('mailto:') > -1) return;

    // check target
    if (el.target) return;

    // x-origin
    if (!sameOrigin(el.href)) return;



    // rebuild path
    var path = el.pathname + el.search + (el.hash || '');

    // strip leading "/[drive letter]:" on NW.js on Windows
    if (typeof process !== 'undefined' && path.match(/^\/[a-zA-Z]:\//)) {
      path = path.replace(/^\/[a-zA-Z]:\//, '/');
    }

    // same page
    var orig = path;

    if (path.indexOf(base) === 0) {
      path = path.substr(base.length);
    }

    if (hashbang) path = path.replace('#!', '');

    if (base && orig === path) return;

    e.preventDefault();
    page.show(orig);
  }

  /**
   * Event button.
   */

  function which(e) {
    e = e || window.event;
    return null === e.which ? e.button : e.which;
  }

  /**
   * Check if `href` is the same origin.
   */

  function sameOrigin(href) {
    var origin = location.protocol + '//' + location.hostname;
    if (location.port) origin += ':' + location.port;
    return (href && (0 === href.indexOf(origin)));
  }

  page.sameOrigin = sameOrigin;

}).call(this,require('_process'))
},{"_process":366,"path-to-regexp":362}],362:[function(require,module,exports){
var isarray = require('isarray')

/**
 * Expose `pathToRegexp`.
 */
module.exports = pathToRegexp
module.exports.parse = parse
module.exports.compile = compile
module.exports.tokensToFunction = tokensToFunction
module.exports.tokensToRegExp = tokensToRegExp

/**
 * The main path matching regexp utility.
 *
 * @type {RegExp}
 */
var PATH_REGEXP = new RegExp([
  // Match escaped characters that would otherwise appear in future matches.
  // This allows the user to escape special characters that won't transform.
  '(\\\\.)',
  // Match Express-style parameters and un-named parameters with a prefix
  // and optional suffixes. Matches appear as:
  //
  // "/:test(\\d+)?" => ["/", "test", "\d+", undefined, "?", undefined]
  // "/route(\\d+)"  => [undefined, undefined, undefined, "\d+", undefined, undefined]
  // "/*"            => ["/", undefined, undefined, undefined, undefined, "*"]
  '([\\/.])?(?:(?:\\:(\\w+)(?:\\(((?:\\\\.|[^()])+)\\))?|\\(((?:\\\\.|[^()])+)\\))([+*?])?|(\\*))'
].join('|'), 'g')

/**
 * Parse a string for the raw tokens.
 *
 * @param  {String} str
 * @return {Array}
 */
function parse (str) {
  var tokens = []
  var key = 0
  var index = 0
  var path = ''
  var res

  while ((res = PATH_REGEXP.exec(str)) != null) {
    var m = res[0]
    var escaped = res[1]
    var offset = res.index
    path += str.slice(index, offset)
    index = offset + m.length

    // Ignore already escaped sequences.
    if (escaped) {
      path += escaped[1]
      continue
    }

    // Push the current path onto the tokens.
    if (path) {
      tokens.push(path)
      path = ''
    }

    var prefix = res[2]
    var name = res[3]
    var capture = res[4]
    var group = res[5]
    var suffix = res[6]
    var asterisk = res[7]

    var repeat = suffix === '+' || suffix === '*'
    var optional = suffix === '?' || suffix === '*'
    var delimiter = prefix || '/'
    var pattern = capture || group || (asterisk ? '.*' : '[^' + delimiter + ']+?')

    tokens.push({
      name: name || key++,
      prefix: prefix || '',
      delimiter: delimiter,
      optional: optional,
      repeat: repeat,
      pattern: escapeGroup(pattern)
    })
  }

  // Match any characters still remaining.
  if (index < str.length) {
    path += str.substr(index)
  }

  // If the path exists, push it onto the end.
  if (path) {
    tokens.push(path)
  }

  return tokens
}

/**
 * Compile a string to a template function for the path.
 *
 * @param  {String}   str
 * @return {Function}
 */
function compile (str) {
  return tokensToFunction(parse(str))
}

/**
 * Expose a method for transforming tokens into the path function.
 */
function tokensToFunction (tokens) {
  // Compile all the tokens into regexps.
  var matches = new Array(tokens.length)

  // Compile all the patterns before compilation.
  for (var i = 0; i < tokens.length; i++) {
    if (typeof tokens[i] === 'object') {
      matches[i] = new RegExp('^' + tokens[i].pattern + '$')
    }
  }

  return function (obj) {
    var path = ''
    var data = obj || {}

    for (var i = 0; i < tokens.length; i++) {
      var token = tokens[i]

      if (typeof token === 'string') {
        path += token

        continue
      }

      var value = data[token.name]
      var segment

      if (value == null) {
        if (token.optional) {
          continue
        } else {
          throw new TypeError('Expected "' + token.name + '" to be defined')
        }
      }

      if (isarray(value)) {
        if (!token.repeat) {
          throw new TypeError('Expected "' + token.name + '" to not repeat, but received "' + value + '"')
        }

        if (value.length === 0) {
          if (token.optional) {
            continue
          } else {
            throw new TypeError('Expected "' + token.name + '" to not be empty')
          }
        }

        for (var j = 0; j < value.length; j++) {
          segment = encodeURIComponent(value[j])

          if (!matches[i].test(segment)) {
            throw new TypeError('Expected all "' + token.name + '" to match "' + token.pattern + '", but received "' + segment + '"')
          }

          path += (j === 0 ? token.prefix : token.delimiter) + segment
        }

        continue
      }

      segment = encodeURIComponent(value)

      if (!matches[i].test(segment)) {
        throw new TypeError('Expected "' + token.name + '" to match "' + token.pattern + '", but received "' + segment + '"')
      }

      path += token.prefix + segment
    }

    return path
  }
}

/**
 * Escape a regular expression string.
 *
 * @param  {String} str
 * @return {String}
 */
function escapeString (str) {
  return str.replace(/([.+*?=^!:${}()[\]|\/])/g, '\\$1')
}

/**
 * Escape the capturing group by escaping special characters and meaning.
 *
 * @param  {String} group
 * @return {String}
 */
function escapeGroup (group) {
  return group.replace(/([=!:$\/()])/g, '\\$1')
}

/**
 * Attach the keys as a property of the regexp.
 *
 * @param  {RegExp} re
 * @param  {Array}  keys
 * @return {RegExp}
 */
function attachKeys (re, keys) {
  re.keys = keys
  return re
}

/**
 * Get the flags for a regexp from the options.
 *
 * @param  {Object} options
 * @return {String}
 */
function flags (options) {
  return options.sensitive ? '' : 'i'
}

/**
 * Pull out keys from a regexp.
 *
 * @param  {RegExp} path
 * @param  {Array}  keys
 * @return {RegExp}
 */
function regexpToRegexp (path, keys) {
  // Use a negative lookahead to match only capturing groups.
  var groups = path.source.match(/\((?!\?)/g)

  if (groups) {
    for (var i = 0; i < groups.length; i++) {
      keys.push({
        name: i,
        prefix: null,
        delimiter: null,
        optional: false,
        repeat: false,
        pattern: null
      })
    }
  }

  return attachKeys(path, keys)
}

/**
 * Transform an array into a regexp.
 *
 * @param  {Array}  path
 * @param  {Array}  keys
 * @param  {Object} options
 * @return {RegExp}
 */
function arrayToRegexp (path, keys, options) {
  var parts = []

  for (var i = 0; i < path.length; i++) {
    parts.push(pathToRegexp(path[i], keys, options).source)
  }

  var regexp = new RegExp('(?:' + parts.join('|') + ')', flags(options))

  return attachKeys(regexp, keys)
}

/**
 * Create a path regexp from string input.
 *
 * @param  {String} path
 * @param  {Array}  keys
 * @param  {Object} options
 * @return {RegExp}
 */
function stringToRegexp (path, keys, options) {
  var tokens = parse(path)
  var re = tokensToRegExp(tokens, options)

  // Attach keys back to the regexp.
  for (var i = 0; i < tokens.length; i++) {
    if (typeof tokens[i] !== 'string') {
      keys.push(tokens[i])
    }
  }

  return attachKeys(re, keys)
}

/**
 * Expose a function for taking tokens and returning a RegExp.
 *
 * @param  {Array}  tokens
 * @param  {Array}  keys
 * @param  {Object} options
 * @return {RegExp}
 */
function tokensToRegExp (tokens, options) {
  options = options || {}

  var strict = options.strict
  var end = options.end !== false
  var route = ''
  var lastToken = tokens[tokens.length - 1]
  var endsWithSlash = typeof lastToken === 'string' && /\/$/.test(lastToken)

  // Iterate over the tokens and create our regexp string.
  for (var i = 0; i < tokens.length; i++) {
    var token = tokens[i]

    if (typeof token === 'string') {
      route += escapeString(token)
    } else {
      var prefix = escapeString(token.prefix)
      var capture = token.pattern

      if (token.repeat) {
        capture += '(?:' + prefix + capture + ')*'
      }

      if (token.optional) {
        if (prefix) {
          capture = '(?:' + prefix + '(' + capture + '))?'
        } else {
          capture = '(' + capture + ')?'
        }
      } else {
        capture = prefix + '(' + capture + ')'
      }

      route += capture
    }
  }

  // In non-strict mode we allow a slash at the end of match. If the path to
  // match already ends with a slash, we remove it for consistency. The slash
  // is valid at the end of a path match, not in the middle. This is important
  // in non-ending mode, where "/test/" shouldn't match "/test//route".
  if (!strict) {
    route = (endsWithSlash ? route.slice(0, -2) : route) + '(?:\\/(?=$))?'
  }

  if (end) {
    route += '$'
  } else {
    // In non-ending mode, we need the capturing groups to match as much as
    // possible by using a positive lookahead to the end or next path segment.
    route += strict && endsWithSlash ? '' : '(?=\\/|$)'
  }

  return new RegExp('^' + route, flags(options))
}

/**
 * Normalize the given path string, returning a regular expression.
 *
 * An empty array can be passed in for the keys, which will hold the
 * placeholder key descriptions. For example, using `/user/:id`, `keys` will
 * contain `[{ name: 'id', delimiter: '/', optional: false, repeat: false }]`.
 *
 * @param  {(String|RegExp|Array)} path
 * @param  {Array}                 [keys]
 * @param  {Object}                [options]
 * @return {RegExp}
 */
function pathToRegexp (path, keys, options) {
  keys = keys || []

  if (!isarray(keys)) {
    options = keys
    keys = []
  } else if (!options) {
    options = {}
  }

  if (path instanceof RegExp) {
    return regexpToRegexp(path, keys, options)
  }

  if (isarray(path)) {
    return arrayToRegexp(path, keys, options)
  }

  return stringToRegexp(path, keys, options)
}

},{"isarray":356}],363:[function(require,module,exports){
(function (global){
/**
 * JSON parse.
 *
 * @see Based on jQuery#parseJSON (MIT) and JSON2
 * @api private
 */

var rvalidchars = /^[\],:{}\s]*$/;
var rvalidescape = /\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g;
var rvalidtokens = /"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g;
var rvalidbraces = /(?:^|:|,)(?:\s*\[)+/g;
var rtrimLeft = /^\s+/;
var rtrimRight = /\s+$/;

module.exports = function parsejson(data) {
  if ('string' != typeof data || !data) {
    return null;
  }

  data = data.replace(rtrimLeft, '').replace(rtrimRight, '');

  // Attempt to parse using the native JSON parser first
  if (global.JSON && JSON.parse) {
    return JSON.parse(data);
  }

  if (rvalidchars.test(data.replace(rvalidescape, '@')
      .replace(rvalidtokens, ']')
      .replace(rvalidbraces, ''))) {
    return (new Function('return ' + data))();
  }
};
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],364:[function(require,module,exports){
/**
 * Compiles a querystring
 * Returns string representation of the object
 *
 * @param {Object}
 * @api private
 */

exports.encode = function (obj) {
  var str = '';

  for (var i in obj) {
    if (obj.hasOwnProperty(i)) {
      if (str.length) str += '&';
      str += encodeURIComponent(i) + '=' + encodeURIComponent(obj[i]);
    }
  }

  return str;
};

/**
 * Parses a simple querystring into an object
 *
 * @param {String} qs
 * @api private
 */

exports.decode = function(qs){
  var qry = {};
  var pairs = qs.split('&');
  for (var i = 0, l = pairs.length; i < l; i++) {
    var pair = pairs[i].split('=');
    qry[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
  }
  return qry;
};

},{}],365:[function(require,module,exports){
/**
 * Parses an URI
 *
 * @author Steven Levithan <stevenlevithan.com> (MIT license)
 * @api private
 */

var re = /^(?:(?![^:@]+:[^:@\/]*@)(http|https|ws|wss):\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?((?:[a-f0-9]{0,4}:){2,7}[a-f0-9]{0,4}|[^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/;

var parts = [
    'source', 'protocol', 'authority', 'userInfo', 'user', 'password', 'host', 'port', 'relative', 'path', 'directory', 'file', 'query', 'anchor'
];

module.exports = function parseuri(str) {
    var src = str,
        b = str.indexOf('['),
        e = str.indexOf(']');

    if (b != -1 && e != -1) {
        str = str.substring(0, b) + str.substring(b, e).replace(/:/g, ';') + str.substring(e, str.length);
    }

    var m = re.exec(str || ''),
        uri = {},
        i = 14;

    while (i--) {
        uri[parts[i]] = m[i] || '';
    }

    if (b != -1 && e != -1) {
        uri.source = src;
        uri.host = uri.host.substring(1, uri.host.length - 1).replace(/;/g, ':');
        uri.authority = uri.authority.replace('[', '').replace(']', '').replace(/;/g, ':');
        uri.ipv6uri = true;
    }

    return uri;
};

},{}],366:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],367:[function(require,module,exports){
(function (process,global){
/**
 * Copyright (c) 2014, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * https://raw.github.com/facebook/regenerator/master/LICENSE file. An
 * additional grant of patent rights can be found in the PATENTS file in
 * the same directory.
 */

!(function(global) {
  "use strict";

  var hasOwn = Object.prototype.hasOwnProperty;
  var undefined; // More compressible than void 0.
  var $Symbol = typeof Symbol === "function" ? Symbol : {};
  var iteratorSymbol = $Symbol.iterator || "@@iterator";
  var toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag";

  var inModule = typeof module === "object";
  var runtime = global.regeneratorRuntime;
  if (runtime) {
    if (inModule) {
      // If regeneratorRuntime is defined globally and we're in a module,
      // make the exports object identical to regeneratorRuntime.
      module.exports = runtime;
    }
    // Don't bother evaluating the rest of this file if the runtime was
    // already defined globally.
    return;
  }

  // Define the runtime globally (as expected by generated code) as either
  // module.exports (if we're in a module) or a new, empty object.
  runtime = global.regeneratorRuntime = inModule ? module.exports : {};

  function wrap(innerFn, outerFn, self, tryLocsList) {
    // If outerFn provided, then outerFn.prototype instanceof Generator.
    var generator = Object.create((outerFn || Generator).prototype);
    var context = new Context(tryLocsList || []);

    // The ._invoke method unifies the implementations of the .next,
    // .throw, and .return methods.
    generator._invoke = makeInvokeMethod(innerFn, self, context);

    return generator;
  }
  runtime.wrap = wrap;

  // Try/catch helper to minimize deoptimizations. Returns a completion
  // record like context.tryEntries[i].completion. This interface could
  // have been (and was previously) designed to take a closure to be
  // invoked without arguments, but in all the cases we care about we
  // already have an existing method we want to call, so there's no need
  // to create a new function object. We can even get away with assuming
  // the method takes exactly one argument, since that happens to be true
  // in every case, so we don't have to touch the arguments object. The
  // only additional allocation required is the completion record, which
  // has a stable shape and so hopefully should be cheap to allocate.
  function tryCatch(fn, obj, arg) {
    try {
      return { type: "normal", arg: fn.call(obj, arg) };
    } catch (err) {
      return { type: "throw", arg: err };
    }
  }

  var GenStateSuspendedStart = "suspendedStart";
  var GenStateSuspendedYield = "suspendedYield";
  var GenStateExecuting = "executing";
  var GenStateCompleted = "completed";

  // Returning this object from the innerFn has the same effect as
  // breaking out of the dispatch switch statement.
  var ContinueSentinel = {};

  // Dummy constructor functions that we use as the .constructor and
  // .constructor.prototype properties for functions that return Generator
  // objects. For full spec compliance, you may wish to configure your
  // minifier not to mangle the names of these two functions.
  function Generator() {}
  function GeneratorFunction() {}
  function GeneratorFunctionPrototype() {}

  var Gp = GeneratorFunctionPrototype.prototype = Generator.prototype;
  GeneratorFunction.prototype = Gp.constructor = GeneratorFunctionPrototype;
  GeneratorFunctionPrototype.constructor = GeneratorFunction;
  GeneratorFunctionPrototype[toStringTagSymbol] = GeneratorFunction.displayName = "GeneratorFunction";

  // Helper for defining the .next, .throw, and .return methods of the
  // Iterator interface in terms of a single ._invoke method.
  function defineIteratorMethods(prototype) {
    ["next", "throw", "return"].forEach(function(method) {
      prototype[method] = function(arg) {
        return this._invoke(method, arg);
      };
    });
  }

  runtime.isGeneratorFunction = function(genFun) {
    var ctor = typeof genFun === "function" && genFun.constructor;
    return ctor
      ? ctor === GeneratorFunction ||
        // For the native GeneratorFunction constructor, the best we can
        // do is to check its .name property.
        (ctor.displayName || ctor.name) === "GeneratorFunction"
      : false;
  };

  runtime.mark = function(genFun) {
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(genFun, GeneratorFunctionPrototype);
    } else {
      genFun.__proto__ = GeneratorFunctionPrototype;
      if (!(toStringTagSymbol in genFun)) {
        genFun[toStringTagSymbol] = "GeneratorFunction";
      }
    }
    genFun.prototype = Object.create(Gp);
    return genFun;
  };

  // Within the body of any async function, `await x` is transformed to
  // `yield regeneratorRuntime.awrap(x)`, so that the runtime can test
  // `value instanceof AwaitArgument` to determine if the yielded value is
  // meant to be awaited. Some may consider the name of this method too
  // cutesy, but they are curmudgeons.
  runtime.awrap = function(arg) {
    return new AwaitArgument(arg);
  };

  function AwaitArgument(arg) {
    this.arg = arg;
  }

  function AsyncIterator(generator) {
    function invoke(method, arg, resolve, reject) {
      var record = tryCatch(generator[method], generator, arg);
      if (record.type === "throw") {
        reject(record.arg);
      } else {
        var result = record.arg;
        var value = result.value;
        if (value instanceof AwaitArgument) {
          return Promise.resolve(value.arg).then(function(value) {
            invoke("next", value, resolve, reject);
          }, function(err) {
            invoke("throw", err, resolve, reject);
          });
        }

        return Promise.resolve(value).then(function(unwrapped) {
          // When a yielded Promise is resolved, its final value becomes
          // the .value of the Promise<{value,done}> result for the
          // current iteration. If the Promise is rejected, however, the
          // result for this iteration will be rejected with the same
          // reason. Note that rejections of yielded Promises are not
          // thrown back into the generator function, as is the case
          // when an awaited Promise is rejected. This difference in
          // behavior between yield and await is important, because it
          // allows the consumer to decide what to do with the yielded
          // rejection (swallow it and continue, manually .throw it back
          // into the generator, abandon iteration, whatever). With
          // await, by contrast, there is no opportunity to examine the
          // rejection reason outside the generator function, so the
          // only option is to throw it from the await expression, and
          // let the generator function handle the exception.
          result.value = unwrapped;
          resolve(result);
        }, reject);
      }
    }

    if (typeof process === "object" && process.domain) {
      invoke = process.domain.bind(invoke);
    }

    var previousPromise;

    function enqueue(method, arg) {
      function callInvokeWithMethodAndArg() {
        return new Promise(function(resolve, reject) {
          invoke(method, arg, resolve, reject);
        });
      }

      return previousPromise =
        // If enqueue has been called before, then we want to wait until
        // all previous Promises have been resolved before calling invoke,
        // so that results are always delivered in the correct order. If
        // enqueue has not been called before, then it is important to
        // call invoke immediately, without waiting on a callback to fire,
        // so that the async generator function has the opportunity to do
        // any necessary setup in a predictable way. This predictability
        // is why the Promise constructor synchronously invokes its
        // executor callback, and why async functions synchronously
        // execute code before the first await. Since we implement simple
        // async functions in terms of async generators, it is especially
        // important to get this right, even though it requires care.
        previousPromise ? previousPromise.then(
          callInvokeWithMethodAndArg,
          // Avoid propagating failures to Promises returned by later
          // invocations of the iterator.
          callInvokeWithMethodAndArg
        ) : callInvokeWithMethodAndArg();
    }

    // Define the unified helper method that is used to implement .next,
    // .throw, and .return (see defineIteratorMethods).
    this._invoke = enqueue;
  }

  defineIteratorMethods(AsyncIterator.prototype);

  // Note that simple async functions are implemented on top of
  // AsyncIterator objects; they just return a Promise for the value of
  // the final result produced by the iterator.
  runtime.async = function(innerFn, outerFn, self, tryLocsList) {
    var iter = new AsyncIterator(
      wrap(innerFn, outerFn, self, tryLocsList)
    );

    return runtime.isGeneratorFunction(outerFn)
      ? iter // If outerFn is a generator, return the full iterator.
      : iter.next().then(function(result) {
          return result.done ? result.value : iter.next();
        });
  };

  function makeInvokeMethod(innerFn, self, context) {
    var state = GenStateSuspendedStart;

    return function invoke(method, arg) {
      if (state === GenStateExecuting) {
        throw new Error("Generator is already running");
      }

      if (state === GenStateCompleted) {
        if (method === "throw") {
          throw arg;
        }

        // Be forgiving, per 25.3.3.3.3 of the spec:
        // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-generatorresume
        return doneResult();
      }

      while (true) {
        var delegate = context.delegate;
        if (delegate) {
          if (method === "return" ||
              (method === "throw" && delegate.iterator[method] === undefined)) {
            // A return or throw (when the delegate iterator has no throw
            // method) always terminates the yield* loop.
            context.delegate = null;

            // If the delegate iterator has a return method, give it a
            // chance to clean up.
            var returnMethod = delegate.iterator["return"];
            if (returnMethod) {
              var record = tryCatch(returnMethod, delegate.iterator, arg);
              if (record.type === "throw") {
                // If the return method threw an exception, let that
                // exception prevail over the original return or throw.
                method = "throw";
                arg = record.arg;
                continue;
              }
            }

            if (method === "return") {
              // Continue with the outer return, now that the delegate
              // iterator has been terminated.
              continue;
            }
          }

          var record = tryCatch(
            delegate.iterator[method],
            delegate.iterator,
            arg
          );

          if (record.type === "throw") {
            context.delegate = null;

            // Like returning generator.throw(uncaught), but without the
            // overhead of an extra function call.
            method = "throw";
            arg = record.arg;
            continue;
          }

          // Delegate generator ran and handled its own exceptions so
          // regardless of what the method was, we continue as if it is
          // "next" with an undefined arg.
          method = "next";
          arg = undefined;

          var info = record.arg;
          if (info.done) {
            context[delegate.resultName] = info.value;
            context.next = delegate.nextLoc;
          } else {
            state = GenStateSuspendedYield;
            return info;
          }

          context.delegate = null;
        }

        if (method === "next") {
          // Setting context._sent for legacy support of Babel's
          // function.sent implementation.
          context.sent = context._sent = arg;

        } else if (method === "throw") {
          if (state === GenStateSuspendedStart) {
            state = GenStateCompleted;
            throw arg;
          }

          if (context.dispatchException(arg)) {
            // If the dispatched exception was caught by a catch block,
            // then let that catch block handle the exception normally.
            method = "next";
            arg = undefined;
          }

        } else if (method === "return") {
          context.abrupt("return", arg);
        }

        state = GenStateExecuting;

        var record = tryCatch(innerFn, self, context);
        if (record.type === "normal") {
          // If an exception is thrown from innerFn, we leave state ===
          // GenStateExecuting and loop back for another invocation.
          state = context.done
            ? GenStateCompleted
            : GenStateSuspendedYield;

          var info = {
            value: record.arg,
            done: context.done
          };

          if (record.arg === ContinueSentinel) {
            if (context.delegate && method === "next") {
              // Deliberately forget the last sent value so that we don't
              // accidentally pass it on to the delegate.
              arg = undefined;
            }
          } else {
            return info;
          }

        } else if (record.type === "throw") {
          state = GenStateCompleted;
          // Dispatch the exception by looping back around to the
          // context.dispatchException(arg) call above.
          method = "throw";
          arg = record.arg;
        }
      }
    };
  }

  // Define Generator.prototype.{next,throw,return} in terms of the
  // unified ._invoke helper method.
  defineIteratorMethods(Gp);

  Gp[iteratorSymbol] = function() {
    return this;
  };

  Gp[toStringTagSymbol] = "Generator";

  Gp.toString = function() {
    return "[object Generator]";
  };

  function pushTryEntry(locs) {
    var entry = { tryLoc: locs[0] };

    if (1 in locs) {
      entry.catchLoc = locs[1];
    }

    if (2 in locs) {
      entry.finallyLoc = locs[2];
      entry.afterLoc = locs[3];
    }

    this.tryEntries.push(entry);
  }

  function resetTryEntry(entry) {
    var record = entry.completion || {};
    record.type = "normal";
    delete record.arg;
    entry.completion = record;
  }

  function Context(tryLocsList) {
    // The root entry object (effectively a try statement without a catch
    // or a finally block) gives us a place to store values thrown from
    // locations where there is no enclosing try statement.
    this.tryEntries = [{ tryLoc: "root" }];
    tryLocsList.forEach(pushTryEntry, this);
    this.reset(true);
  }

  runtime.keys = function(object) {
    var keys = [];
    for (var key in object) {
      keys.push(key);
    }
    keys.reverse();

    // Rather than returning an object with a next method, we keep
    // things simple and return the next function itself.
    return function next() {
      while (keys.length) {
        var key = keys.pop();
        if (key in object) {
          next.value = key;
          next.done = false;
          return next;
        }
      }

      // To avoid creating an additional object, we just hang the .value
      // and .done properties off the next function object itself. This
      // also ensures that the minifier will not anonymize the function.
      next.done = true;
      return next;
    };
  };

  function values(iterable) {
    if (iterable) {
      var iteratorMethod = iterable[iteratorSymbol];
      if (iteratorMethod) {
        return iteratorMethod.call(iterable);
      }

      if (typeof iterable.next === "function") {
        return iterable;
      }

      if (!isNaN(iterable.length)) {
        var i = -1, next = function next() {
          while (++i < iterable.length) {
            if (hasOwn.call(iterable, i)) {
              next.value = iterable[i];
              next.done = false;
              return next;
            }
          }

          next.value = undefined;
          next.done = true;

          return next;
        };

        return next.next = next;
      }
    }

    // Return an iterator with no values.
    return { next: doneResult };
  }
  runtime.values = values;

  function doneResult() {
    return { value: undefined, done: true };
  }

  Context.prototype = {
    constructor: Context,

    reset: function(skipTempReset) {
      this.prev = 0;
      this.next = 0;
      // Resetting context._sent for legacy support of Babel's
      // function.sent implementation.
      this.sent = this._sent = undefined;
      this.done = false;
      this.delegate = null;

      this.tryEntries.forEach(resetTryEntry);

      if (!skipTempReset) {
        for (var name in this) {
          // Not sure about the optimal order of these conditions:
          if (name.charAt(0) === "t" &&
              hasOwn.call(this, name) &&
              !isNaN(+name.slice(1))) {
            this[name] = undefined;
          }
        }
      }
    },

    stop: function() {
      this.done = true;

      var rootEntry = this.tryEntries[0];
      var rootRecord = rootEntry.completion;
      if (rootRecord.type === "throw") {
        throw rootRecord.arg;
      }

      return this.rval;
    },

    dispatchException: function(exception) {
      if (this.done) {
        throw exception;
      }

      var context = this;
      function handle(loc, caught) {
        record.type = "throw";
        record.arg = exception;
        context.next = loc;
        return !!caught;
      }

      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        var record = entry.completion;

        if (entry.tryLoc === "root") {
          // Exception thrown outside of any try block that could handle
          // it, so set the completion value of the entire function to
          // throw the exception.
          return handle("end");
        }

        if (entry.tryLoc <= this.prev) {
          var hasCatch = hasOwn.call(entry, "catchLoc");
          var hasFinally = hasOwn.call(entry, "finallyLoc");

          if (hasCatch && hasFinally) {
            if (this.prev < entry.catchLoc) {
              return handle(entry.catchLoc, true);
            } else if (this.prev < entry.finallyLoc) {
              return handle(entry.finallyLoc);
            }

          } else if (hasCatch) {
            if (this.prev < entry.catchLoc) {
              return handle(entry.catchLoc, true);
            }

          } else if (hasFinally) {
            if (this.prev < entry.finallyLoc) {
              return handle(entry.finallyLoc);
            }

          } else {
            throw new Error("try statement without catch or finally");
          }
        }
      }
    },

    abrupt: function(type, arg) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.tryLoc <= this.prev &&
            hasOwn.call(entry, "finallyLoc") &&
            this.prev < entry.finallyLoc) {
          var finallyEntry = entry;
          break;
        }
      }

      if (finallyEntry &&
          (type === "break" ||
           type === "continue") &&
          finallyEntry.tryLoc <= arg &&
          arg <= finallyEntry.finallyLoc) {
        // Ignore the finally entry if control is not jumping to a
        // location outside the try/catch block.
        finallyEntry = null;
      }

      var record = finallyEntry ? finallyEntry.completion : {};
      record.type = type;
      record.arg = arg;

      if (finallyEntry) {
        this.next = finallyEntry.finallyLoc;
      } else {
        this.complete(record);
      }

      return ContinueSentinel;
    },

    complete: function(record, afterLoc) {
      if (record.type === "throw") {
        throw record.arg;
      }

      if (record.type === "break" ||
          record.type === "continue") {
        this.next = record.arg;
      } else if (record.type === "return") {
        this.rval = record.arg;
        this.next = "end";
      } else if (record.type === "normal" && afterLoc) {
        this.next = afterLoc;
      }
    },

    finish: function(finallyLoc) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.finallyLoc === finallyLoc) {
          this.complete(entry.completion, entry.afterLoc);
          resetTryEntry(entry);
          return ContinueSentinel;
        }
      }
    },

    "catch": function(tryLoc) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.tryLoc === tryLoc) {
          var record = entry.completion;
          if (record.type === "throw") {
            var thrown = record.arg;
            resetTryEntry(entry);
          }
          return thrown;
        }
      }

      // The context.catch method must only be called with a location
      // argument that corresponds to a known catch block.
      throw new Error("illegal catch attempt");
    },

    delegateYield: function(iterable, resultName, nextLoc) {
      this.delegate = {
        iterator: values(iterable),
        resultName: resultName,
        nextLoc: nextLoc
      };

      return ContinueSentinel;
    }
  };
})(
  // Among the various tricks for obtaining a reference to the global
  // object, this seems to be the most reliable technique that does not
  // use indirect eval (which violates Content Security Policy).
  typeof global === "object" ? global :
  typeof window === "object" ? window :
  typeof self === "object" ? self : this
);

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"_process":366}],368:[function(require,module,exports){

/**
 * Module dependencies.
 */

var url = require('./url');
var parser = require('socket.io-parser');
var Manager = require('./manager');
var debug = require('debug')('socket.io-client');

/**
 * Module exports.
 */

module.exports = exports = lookup;

/**
 * Managers cache.
 */

var cache = exports.managers = {};

/**
 * Looks up an existing `Manager` for multiplexing.
 * If the user summons:
 *
 *   `io('http://localhost/a');`
 *   `io('http://localhost/b');`
 *
 * We reuse the existing instance based on same scheme/port/host,
 * and we initialize sockets for each namespace.
 *
 * @api public
 */

function lookup (uri, opts) {
  if (typeof uri === 'object') {
    opts = uri;
    uri = undefined;
  }

  opts = opts || {};

  var parsed = url(uri);
  var source = parsed.source;
  var id = parsed.id;
  var path = parsed.path;
  var sameNamespace = cache[id] && path in cache[id].nsps;
  var newConnection = opts.forceNew || opts['force new connection'] ||
                      false === opts.multiplex || sameNamespace;

  var io;

  if (newConnection) {
    debug('ignoring socket cache for %s', source);
    io = Manager(source, opts);
  } else {
    if (!cache[id]) {
      debug('new io instance for %s', source);
      cache[id] = Manager(source, opts);
    }
    io = cache[id];
  }
  if (parsed.query && !opts.query) {
    opts.query = parsed.query;
  } else if (opts && 'object' === typeof opts.query) {
    opts.query = encodeQueryString(opts.query);
  }
  return io.socket(parsed.path, opts);
}
/**
 *  Helper method to parse query objects to string.
 * @param {object} query
 * @returns {string}
 */
function encodeQueryString (obj) {
  var str = [];
  for (var p in obj) {
    if (obj.hasOwnProperty(p)) {
      str.push(encodeURIComponent(p) + '=' + encodeURIComponent(obj[p]));
    }
  }
  return str.join('&');
}
/**
 * Protocol version.
 *
 * @api public
 */

exports.protocol = parser.protocol;

/**
 * `connect`.
 *
 * @param {String} uri
 * @api public
 */

exports.connect = lookup;

/**
 * Expose constructors for standalone build.
 *
 * @api public
 */

exports.Manager = require('./manager');
exports.Socket = require('./socket');

},{"./manager":369,"./socket":371,"./url":372,"debug":373,"socket.io-parser":377}],369:[function(require,module,exports){

/**
 * Module dependencies.
 */

var eio = require('engine.io-client');
var Socket = require('./socket');
var Emitter = require('component-emitter');
var parser = require('socket.io-parser');
var on = require('./on');
var bind = require('component-bind');
var debug = require('debug')('socket.io-client:manager');
var indexOf = require('indexof');
var Backoff = require('backo2');

/**
 * IE6+ hasOwnProperty
 */

var has = Object.prototype.hasOwnProperty;

/**
 * Module exports
 */

module.exports = Manager;

/**
 * `Manager` constructor.
 *
 * @param {String} engine instance or engine uri/opts
 * @param {Object} options
 * @api public
 */

function Manager (uri, opts) {
  if (!(this instanceof Manager)) return new Manager(uri, opts);
  if (uri && ('object' === typeof uri)) {
    opts = uri;
    uri = undefined;
  }
  opts = opts || {};

  opts.path = opts.path || '/socket.io';
  this.nsps = {};
  this.subs = [];
  this.opts = opts;
  this.reconnection(opts.reconnection !== false);
  this.reconnectionAttempts(opts.reconnectionAttempts || Infinity);
  this.reconnectionDelay(opts.reconnectionDelay || 1000);
  this.reconnectionDelayMax(opts.reconnectionDelayMax || 5000);
  this.randomizationFactor(opts.randomizationFactor || 0.5);
  this.backoff = new Backoff({
    min: this.reconnectionDelay(),
    max: this.reconnectionDelayMax(),
    jitter: this.randomizationFactor()
  });
  this.timeout(null == opts.timeout ? 20000 : opts.timeout);
  this.readyState = 'closed';
  this.uri = uri;
  this.connecting = [];
  this.lastPing = null;
  this.encoding = false;
  this.packetBuffer = [];
  this.encoder = new parser.Encoder();
  this.decoder = new parser.Decoder();
  this.autoConnect = opts.autoConnect !== false;
  if (this.autoConnect) this.open();
}

/**
 * Propagate given event to sockets and emit on `this`
 *
 * @api private
 */

Manager.prototype.emitAll = function () {
  this.emit.apply(this, arguments);
  for (var nsp in this.nsps) {
    if (has.call(this.nsps, nsp)) {
      this.nsps[nsp].emit.apply(this.nsps[nsp], arguments);
    }
  }
};

/**
 * Update `socket.id` of all sockets
 *
 * @api private
 */

Manager.prototype.updateSocketIds = function () {
  for (var nsp in this.nsps) {
    if (has.call(this.nsps, nsp)) {
      this.nsps[nsp].id = this.engine.id;
    }
  }
};

/**
 * Mix in `Emitter`.
 */

Emitter(Manager.prototype);

/**
 * Sets the `reconnection` config.
 *
 * @param {Boolean} true/false if it should automatically reconnect
 * @return {Manager} self or value
 * @api public
 */

Manager.prototype.reconnection = function (v) {
  if (!arguments.length) return this._reconnection;
  this._reconnection = !!v;
  return this;
};

/**
 * Sets the reconnection attempts config.
 *
 * @param {Number} max reconnection attempts before giving up
 * @return {Manager} self or value
 * @api public
 */

Manager.prototype.reconnectionAttempts = function (v) {
  if (!arguments.length) return this._reconnectionAttempts;
  this._reconnectionAttempts = v;
  return this;
};

/**
 * Sets the delay between reconnections.
 *
 * @param {Number} delay
 * @return {Manager} self or value
 * @api public
 */

Manager.prototype.reconnectionDelay = function (v) {
  if (!arguments.length) return this._reconnectionDelay;
  this._reconnectionDelay = v;
  this.backoff && this.backoff.setMin(v);
  return this;
};

Manager.prototype.randomizationFactor = function (v) {
  if (!arguments.length) return this._randomizationFactor;
  this._randomizationFactor = v;
  this.backoff && this.backoff.setJitter(v);
  return this;
};

/**
 * Sets the maximum delay between reconnections.
 *
 * @param {Number} delay
 * @return {Manager} self or value
 * @api public
 */

Manager.prototype.reconnectionDelayMax = function (v) {
  if (!arguments.length) return this._reconnectionDelayMax;
  this._reconnectionDelayMax = v;
  this.backoff && this.backoff.setMax(v);
  return this;
};

/**
 * Sets the connection timeout. `false` to disable
 *
 * @return {Manager} self or value
 * @api public
 */

Manager.prototype.timeout = function (v) {
  if (!arguments.length) return this._timeout;
  this._timeout = v;
  return this;
};

/**
 * Starts trying to reconnect if reconnection is enabled and we have not
 * started reconnecting yet
 *
 * @api private
 */

Manager.prototype.maybeReconnectOnOpen = function () {
  // Only try to reconnect if it's the first time we're connecting
  if (!this.reconnecting && this._reconnection && this.backoff.attempts === 0) {
    // keeps reconnection from firing twice for the same reconnection loop
    this.reconnect();
  }
};

/**
 * Sets the current transport `socket`.
 *
 * @param {Function} optional, callback
 * @return {Manager} self
 * @api public
 */

Manager.prototype.open =
Manager.prototype.connect = function (fn, opts) {
  debug('readyState %s', this.readyState);
  if (~this.readyState.indexOf('open')) return this;

  debug('opening %s', this.uri);
  this.engine = eio(this.uri, this.opts);
  var socket = this.engine;
  var self = this;
  this.readyState = 'opening';
  this.skipReconnect = false;

  // emit `open`
  var openSub = on(socket, 'open', function () {
    self.onopen();
    fn && fn();
  });

  // emit `connect_error`
  var errorSub = on(socket, 'error', function (data) {
    debug('connect_error');
    self.cleanup();
    self.readyState = 'closed';
    self.emitAll('connect_error', data);
    if (fn) {
      var err = new Error('Connection error');
      err.data = data;
      fn(err);
    } else {
      // Only do this if there is no fn to handle the error
      self.maybeReconnectOnOpen();
    }
  });

  // emit `connect_timeout`
  if (false !== this._timeout) {
    var timeout = this._timeout;
    debug('connect attempt will timeout after %d', timeout);

    // set timer
    var timer = setTimeout(function () {
      debug('connect attempt timed out after %d', timeout);
      openSub.destroy();
      socket.close();
      socket.emit('error', 'timeout');
      self.emitAll('connect_timeout', timeout);
    }, timeout);

    this.subs.push({
      destroy: function () {
        clearTimeout(timer);
      }
    });
  }

  this.subs.push(openSub);
  this.subs.push(errorSub);

  return this;
};

/**
 * Called upon transport open.
 *
 * @api private
 */

Manager.prototype.onopen = function () {
  debug('open');

  // clear old subs
  this.cleanup();

  // mark as open
  this.readyState = 'open';
  this.emit('open');

  // add new subs
  var socket = this.engine;
  this.subs.push(on(socket, 'data', bind(this, 'ondata')));
  this.subs.push(on(socket, 'ping', bind(this, 'onping')));
  this.subs.push(on(socket, 'pong', bind(this, 'onpong')));
  this.subs.push(on(socket, 'error', bind(this, 'onerror')));
  this.subs.push(on(socket, 'close', bind(this, 'onclose')));
  this.subs.push(on(this.decoder, 'decoded', bind(this, 'ondecoded')));
};

/**
 * Called upon a ping.
 *
 * @api private
 */

Manager.prototype.onping = function () {
  this.lastPing = new Date();
  this.emitAll('ping');
};

/**
 * Called upon a packet.
 *
 * @api private
 */

Manager.prototype.onpong = function () {
  this.emitAll('pong', new Date() - this.lastPing);
};

/**
 * Called with data.
 *
 * @api private
 */

Manager.prototype.ondata = function (data) {
  this.decoder.add(data);
};

/**
 * Called when parser fully decodes a packet.
 *
 * @api private
 */

Manager.prototype.ondecoded = function (packet) {
  this.emit('packet', packet);
};

/**
 * Called upon socket error.
 *
 * @api private
 */

Manager.prototype.onerror = function (err) {
  debug('error', err);
  this.emitAll('error', err);
};

/**
 * Creates a new socket for the given `nsp`.
 *
 * @return {Socket}
 * @api public
 */

Manager.prototype.socket = function (nsp, opts) {
  var socket = this.nsps[nsp];
  if (!socket) {
    socket = new Socket(this, nsp, opts);
    this.nsps[nsp] = socket;
    var self = this;
    socket.on('connecting', onConnecting);
    socket.on('connect', function () {
      socket.id = self.engine.id;
    });

    if (this.autoConnect) {
      // manually call here since connecting evnet is fired before listening
      onConnecting();
    }
  }

  function onConnecting () {
    if (!~indexOf(self.connecting, socket)) {
      self.connecting.push(socket);
    }
  }

  return socket;
};

/**
 * Called upon a socket close.
 *
 * @param {Socket} socket
 */

Manager.prototype.destroy = function (socket) {
  var index = indexOf(this.connecting, socket);
  if (~index) this.connecting.splice(index, 1);
  if (this.connecting.length) return;

  this.close();
};

/**
 * Writes a packet.
 *
 * @param {Object} packet
 * @api private
 */

Manager.prototype.packet = function (packet) {
  debug('writing packet %j', packet);
  var self = this;
  if (packet.query && packet.type === 0) packet.nsp += '?' + packet.query;

  if (!self.encoding) {
    // encode, then write to engine with result
    self.encoding = true;
    this.encoder.encode(packet, function (encodedPackets) {
      for (var i = 0; i < encodedPackets.length; i++) {
        self.engine.write(encodedPackets[i], packet.options);
      }
      self.encoding = false;
      self.processPacketQueue();
    });
  } else { // add packet to the queue
    self.packetBuffer.push(packet);
  }
};

/**
 * If packet buffer is non-empty, begins encoding the
 * next packet in line.
 *
 * @api private
 */

Manager.prototype.processPacketQueue = function () {
  if (this.packetBuffer.length > 0 && !this.encoding) {
    var pack = this.packetBuffer.shift();
    this.packet(pack);
  }
};

/**
 * Clean up transport subscriptions and packet buffer.
 *
 * @api private
 */

Manager.prototype.cleanup = function () {
  debug('cleanup');

  var subsLength = this.subs.length;
  for (var i = 0; i < subsLength; i++) {
    var sub = this.subs.shift();
    sub.destroy();
  }

  this.packetBuffer = [];
  this.encoding = false;
  this.lastPing = null;

  this.decoder.destroy();
};

/**
 * Close the current socket.
 *
 * @api private
 */

Manager.prototype.close =
Manager.prototype.disconnect = function () {
  debug('disconnect');
  this.skipReconnect = true;
  this.reconnecting = false;
  if ('opening' === this.readyState) {
    // `onclose` will not fire because
    // an open event never happened
    this.cleanup();
  }
  this.backoff.reset();
  this.readyState = 'closed';
  if (this.engine) this.engine.close();
};

/**
 * Called upon engine close.
 *
 * @api private
 */

Manager.prototype.onclose = function (reason) {
  debug('onclose');

  this.cleanup();
  this.backoff.reset();
  this.readyState = 'closed';
  this.emit('close', reason);

  if (this._reconnection && !this.skipReconnect) {
    this.reconnect();
  }
};

/**
 * Attempt a reconnection.
 *
 * @api private
 */

Manager.prototype.reconnect = function () {
  if (this.reconnecting || this.skipReconnect) return this;

  var self = this;

  if (this.backoff.attempts >= this._reconnectionAttempts) {
    debug('reconnect failed');
    this.backoff.reset();
    this.emitAll('reconnect_failed');
    this.reconnecting = false;
  } else {
    var delay = this.backoff.duration();
    debug('will wait %dms before reconnect attempt', delay);

    this.reconnecting = true;
    var timer = setTimeout(function () {
      if (self.skipReconnect) return;

      debug('attempting reconnect');
      self.emitAll('reconnect_attempt', self.backoff.attempts);
      self.emitAll('reconnecting', self.backoff.attempts);

      // check again for the case socket closed in above events
      if (self.skipReconnect) return;

      self.open(function (err) {
        if (err) {
          debug('reconnect attempt error');
          self.reconnecting = false;
          self.reconnect();
          self.emitAll('reconnect_error', err.data);
        } else {
          debug('reconnect success');
          self.onreconnect();
        }
      });
    }, delay);

    this.subs.push({
      destroy: function () {
        clearTimeout(timer);
      }
    });
  }
};

/**
 * Called upon successful reconnect.
 *
 * @api private
 */

Manager.prototype.onreconnect = function () {
  var attempt = this.backoff.attempts;
  this.reconnecting = false;
  this.backoff.reset();
  this.updateSocketIds();
  this.emitAll('reconnect', attempt);
};

},{"./on":370,"./socket":371,"backo2":29,"component-bind":34,"component-emitter":35,"debug":373,"engine.io-client":334,"indexof":355,"socket.io-parser":377}],370:[function(require,module,exports){

/**
 * Module exports.
 */

module.exports = on;

/**
 * Helper for subscriptions.
 *
 * @param {Object|EventEmitter} obj with `Emitter` mixin or `EventEmitter`
 * @param {String} event name
 * @param {Function} callback
 * @api public
 */

function on (obj, ev, fn) {
  obj.on(ev, fn);
  return {
    destroy: function () {
      obj.removeListener(ev, fn);
    }
  };
}

},{}],371:[function(require,module,exports){

/**
 * Module dependencies.
 */

var parser = require('socket.io-parser');
var Emitter = require('component-emitter');
var toArray = require('to-array');
var on = require('./on');
var bind = require('component-bind');
var debug = require('debug')('socket.io-client:socket');
var hasBin = require('has-binary');

/**
 * Module exports.
 */

module.exports = exports = Socket;

/**
 * Internal events (blacklisted).
 * These events can't be emitted by the user.
 *
 * @api private
 */

var events = {
  connect: 1,
  connect_error: 1,
  connect_timeout: 1,
  connecting: 1,
  disconnect: 1,
  error: 1,
  reconnect: 1,
  reconnect_attempt: 1,
  reconnect_failed: 1,
  reconnect_error: 1,
  reconnecting: 1,
  ping: 1,
  pong: 1
};

/**
 * Shortcut to `Emitter#emit`.
 */

var emit = Emitter.prototype.emit;

/**
 * `Socket` constructor.
 *
 * @api public
 */

function Socket (io, nsp, opts) {
  this.io = io;
  this.nsp = nsp;
  this.json = this; // compat
  this.ids = 0;
  this.acks = {};
  this.receiveBuffer = [];
  this.sendBuffer = [];
  this.connected = false;
  this.disconnected = true;
  if (opts && opts.query) {
    this.query = opts.query;
  }
  if (this.io.autoConnect) this.open();
}

/**
 * Mix in `Emitter`.
 */

Emitter(Socket.prototype);

/**
 * Subscribe to open, close and packet events
 *
 * @api private
 */

Socket.prototype.subEvents = function () {
  if (this.subs) return;

  var io = this.io;
  this.subs = [
    on(io, 'open', bind(this, 'onopen')),
    on(io, 'packet', bind(this, 'onpacket')),
    on(io, 'close', bind(this, 'onclose'))
  ];
};

/**
 * "Opens" the socket.
 *
 * @api public
 */

Socket.prototype.open =
Socket.prototype.connect = function () {
  if (this.connected) return this;

  this.subEvents();
  this.io.open(); // ensure open
  if ('open' === this.io.readyState) this.onopen();
  this.emit('connecting');
  return this;
};

/**
 * Sends a `message` event.
 *
 * @return {Socket} self
 * @api public
 */

Socket.prototype.send = function () {
  var args = toArray(arguments);
  args.unshift('message');
  this.emit.apply(this, args);
  return this;
};

/**
 * Override `emit`.
 * If the event is in `events`, it's emitted normally.
 *
 * @param {String} event name
 * @return {Socket} self
 * @api public
 */

Socket.prototype.emit = function (ev) {
  if (events.hasOwnProperty(ev)) {
    emit.apply(this, arguments);
    return this;
  }

  var args = toArray(arguments);
  var parserType = parser.EVENT; // default
  if (hasBin(args)) { parserType = parser.BINARY_EVENT; } // binary
  var packet = { type: parserType, data: args };

  packet.options = {};
  packet.options.compress = !this.flags || false !== this.flags.compress;

  // event ack callback
  if ('function' === typeof args[args.length - 1]) {
    debug('emitting packet with ack id %d', this.ids);
    this.acks[this.ids] = args.pop();
    packet.id = this.ids++;
  }

  if (this.connected) {
    this.packet(packet);
  } else {
    this.sendBuffer.push(packet);
  }

  delete this.flags;

  return this;
};

/**
 * Sends a packet.
 *
 * @param {Object} packet
 * @api private
 */

Socket.prototype.packet = function (packet) {
  packet.nsp = this.nsp;
  this.io.packet(packet);
};

/**
 * Called upon engine `open`.
 *
 * @api private
 */

Socket.prototype.onopen = function () {
  debug('transport is open - connecting');

  // write connect packet if necessary
  if ('/' !== this.nsp) {
    if (this.query) {
      this.packet({type: parser.CONNECT, query: this.query});
    } else {
      this.packet({type: parser.CONNECT});
    }
  }
};

/**
 * Called upon engine `close`.
 *
 * @param {String} reason
 * @api private
 */

Socket.prototype.onclose = function (reason) {
  debug('close (%s)', reason);
  this.connected = false;
  this.disconnected = true;
  delete this.id;
  this.emit('disconnect', reason);
};

/**
 * Called with socket packet.
 *
 * @param {Object} packet
 * @api private
 */

Socket.prototype.onpacket = function (packet) {
  if (packet.nsp !== this.nsp) return;

  switch (packet.type) {
    case parser.CONNECT:
      this.onconnect();
      break;

    case parser.EVENT:
      this.onevent(packet);
      break;

    case parser.BINARY_EVENT:
      this.onevent(packet);
      break;

    case parser.ACK:
      this.onack(packet);
      break;

    case parser.BINARY_ACK:
      this.onack(packet);
      break;

    case parser.DISCONNECT:
      this.ondisconnect();
      break;

    case parser.ERROR:
      this.emit('error', packet.data);
      break;
  }
};

/**
 * Called upon a server event.
 *
 * @param {Object} packet
 * @api private
 */

Socket.prototype.onevent = function (packet) {
  var args = packet.data || [];
  debug('emitting event %j', args);

  if (null != packet.id) {
    debug('attaching ack callback to event');
    args.push(this.ack(packet.id));
  }

  if (this.connected) {
    emit.apply(this, args);
  } else {
    this.receiveBuffer.push(args);
  }
};

/**
 * Produces an ack callback to emit with an event.
 *
 * @api private
 */

Socket.prototype.ack = function (id) {
  var self = this;
  var sent = false;
  return function () {
    // prevent double callbacks
    if (sent) return;
    sent = true;
    var args = toArray(arguments);
    debug('sending ack %j', args);

    var type = hasBin(args) ? parser.BINARY_ACK : parser.ACK;
    self.packet({
      type: type,
      id: id,
      data: args
    });
  };
};

/**
 * Called upon a server acknowlegement.
 *
 * @param {Object} packet
 * @api private
 */

Socket.prototype.onack = function (packet) {
  var ack = this.acks[packet.id];
  if ('function' === typeof ack) {
    debug('calling ack %s with %j', packet.id, packet.data);
    ack.apply(this, packet.data);
    delete this.acks[packet.id];
  } else {
    debug('bad ack %s', packet.id);
  }
};

/**
 * Called upon server connect.
 *
 * @api private
 */

Socket.prototype.onconnect = function () {
  this.connected = true;
  this.disconnected = false;
  this.emit('connect');
  this.emitBuffered();
};

/**
 * Emit buffered events (received and emitted).
 *
 * @api private
 */

Socket.prototype.emitBuffered = function () {
  var i;
  for (i = 0; i < this.receiveBuffer.length; i++) {
    emit.apply(this, this.receiveBuffer[i]);
  }
  this.receiveBuffer = [];

  for (i = 0; i < this.sendBuffer.length; i++) {
    this.packet(this.sendBuffer[i]);
  }
  this.sendBuffer = [];
};

/**
 * Called upon server disconnect.
 *
 * @api private
 */

Socket.prototype.ondisconnect = function () {
  debug('server disconnect (%s)', this.nsp);
  this.destroy();
  this.onclose('io server disconnect');
};

/**
 * Called upon forced client/server side disconnections,
 * this method ensures the manager stops tracking us and
 * that reconnections don't get triggered for this.
 *
 * @api private.
 */

Socket.prototype.destroy = function () {
  if (this.subs) {
    // clean subscriptions to avoid reconnections
    for (var i = 0; i < this.subs.length; i++) {
      this.subs[i].destroy();
    }
    this.subs = null;
  }

  this.io.destroy(this);
};

/**
 * Disconnects the socket manually.
 *
 * @return {Socket} self
 * @api public
 */

Socket.prototype.close =
Socket.prototype.disconnect = function () {
  if (this.connected) {
    debug('performing disconnect (%s)', this.nsp);
    this.packet({ type: parser.DISCONNECT });
  }

  // remove socket from pool
  this.destroy();

  if (this.connected) {
    // fire events
    this.onclose('io client disconnect');
  }
  return this;
};

/**
 * Sets the compress flag.
 *
 * @param {Boolean} if `true`, compresses the sending data
 * @return {Socket} self
 * @api public
 */

Socket.prototype.compress = function (compress) {
  this.flags = this.flags || {};
  this.flags.compress = compress;
  return this;
};

},{"./on":370,"component-bind":34,"component-emitter":35,"debug":373,"has-binary":351,"socket.io-parser":377,"to-array":385}],372:[function(require,module,exports){
(function (global){

/**
 * Module dependencies.
 */

var parseuri = require('parseuri');
var debug = require('debug')('socket.io-client:url');

/**
 * Module exports.
 */

module.exports = url;

/**
 * URL parser.
 *
 * @param {String} url
 * @param {Object} An object meant to mimic window.location.
 *                 Defaults to window.location.
 * @api public
 */

function url (uri, loc) {
  var obj = uri;

  // default to window.location
  loc = loc || global.location;
  if (null == uri) uri = loc.protocol + '//' + loc.host;

  // relative path support
  if ('string' === typeof uri) {
    if ('/' === uri.charAt(0)) {
      if ('/' === uri.charAt(1)) {
        uri = loc.protocol + uri;
      } else {
        uri = loc.host + uri;
      }
    }

    if (!/^(https?|wss?):\/\//.test(uri)) {
      debug('protocol-less url %s', uri);
      if ('undefined' !== typeof loc) {
        uri = loc.protocol + '//' + uri;
      } else {
        uri = 'https://' + uri;
      }
    }

    // parse
    debug('parse %s', uri);
    obj = parseuri(uri);
  }

  // make sure we treat `localhost:80` and `localhost` equally
  if (!obj.port) {
    if (/^(http|ws)$/.test(obj.protocol)) {
      obj.port = '80';
    } else if (/^(http|ws)s$/.test(obj.protocol)) {
      obj.port = '443';
    }
  }

  obj.path = obj.path || '/';

  var ipv6 = obj.host.indexOf(':') !== -1;
  var host = ipv6 ? '[' + obj.host + ']' : obj.host;

  // define unique id
  obj.id = obj.protocol + '://' + host + ':' + obj.port;
  // define href
  obj.href = obj.protocol + '://' + host + (loc && loc.port === obj.port ? '' : (':' + obj.port));

  return obj;
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"debug":373,"parseuri":365}],373:[function(require,module,exports){
arguments[4][344][0].apply(exports,arguments)
},{"./debug":374,"_process":366,"dup":344}],374:[function(require,module,exports){
arguments[4][345][0].apply(exports,arguments)
},{"dup":345,"ms":375}],375:[function(require,module,exports){
arguments[4][346][0].apply(exports,arguments)
},{"dup":346}],376:[function(require,module,exports){
(function (global){
/*global Blob,File*/

/**
 * Module requirements
 */

var isArray = require('isarray');
var isBuf = require('./is-buffer');

/**
 * Replaces every Buffer | ArrayBuffer in packet with a numbered placeholder.
 * Anything with blobs or files should be fed through removeBlobs before coming
 * here.
 *
 * @param {Object} packet - socket.io event packet
 * @return {Object} with deconstructed packet and list of buffers
 * @api public
 */

exports.deconstructPacket = function(packet){
  var buffers = [];
  var packetData = packet.data;

  function _deconstructPacket(data) {
    if (!data) return data;

    if (isBuf(data)) {
      var placeholder = { _placeholder: true, num: buffers.length };
      buffers.push(data);
      return placeholder;
    } else if (isArray(data)) {
      var newData = new Array(data.length);
      for (var i = 0; i < data.length; i++) {
        newData[i] = _deconstructPacket(data[i]);
      }
      return newData;
    } else if ('object' == typeof data && !(data instanceof Date)) {
      var newData = {};
      for (var key in data) {
        newData[key] = _deconstructPacket(data[key]);
      }
      return newData;
    }
    return data;
  }

  var pack = packet;
  pack.data = _deconstructPacket(packetData);
  pack.attachments = buffers.length; // number of binary 'attachments'
  return {packet: pack, buffers: buffers};
};

/**
 * Reconstructs a binary packet from its placeholder packet and buffers
 *
 * @param {Object} packet - event packet with placeholders
 * @param {Array} buffers - binary buffers to put in placeholder positions
 * @return {Object} reconstructed packet
 * @api public
 */

exports.reconstructPacket = function(packet, buffers) {
  var curPlaceHolder = 0;

  function _reconstructPacket(data) {
    if (data && data._placeholder) {
      var buf = buffers[data.num]; // appropriate buffer (should be natural order anyway)
      return buf;
    } else if (isArray(data)) {
      for (var i = 0; i < data.length; i++) {
        data[i] = _reconstructPacket(data[i]);
      }
      return data;
    } else if (data && 'object' == typeof data) {
      for (var key in data) {
        data[key] = _reconstructPacket(data[key]);
      }
      return data;
    }
    return data;
  }

  packet.data = _reconstructPacket(packet.data);
  packet.attachments = undefined; // no longer useful
  return packet;
};

/**
 * Asynchronously removes Blobs or Files from data via
 * FileReader's readAsArrayBuffer method. Used before encoding
 * data as msgpack. Calls callback with the blobless data.
 *
 * @param {Object} data
 * @param {Function} callback
 * @api private
 */

exports.removeBlobs = function(data, callback) {
  function _removeBlobs(obj, curKey, containingObject) {
    if (!obj) return obj;

    // convert any blob
    if ((global.Blob && obj instanceof Blob) ||
        (global.File && obj instanceof File)) {
      pendingBlobs++;

      // async filereader
      var fileReader = new FileReader();
      fileReader.onload = function() { // this.result == arraybuffer
        if (containingObject) {
          containingObject[curKey] = this.result;
        }
        else {
          bloblessData = this.result;
        }

        // if nothing pending its callback time
        if(! --pendingBlobs) {
          callback(bloblessData);
        }
      };

      fileReader.readAsArrayBuffer(obj); // blob -> arraybuffer
    } else if (isArray(obj)) { // handle array
      for (var i = 0; i < obj.length; i++) {
        _removeBlobs(obj[i], i, obj);
      }
    } else if (obj && 'object' == typeof obj && !isBuf(obj)) { // and object
      for (var key in obj) {
        _removeBlobs(obj[key], key, obj);
      }
    }
  }

  var pendingBlobs = 0;
  var bloblessData = data;
  _removeBlobs(bloblessData);
  if (!pendingBlobs) {
    callback(bloblessData);
  }
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./is-buffer":378,"isarray":356}],377:[function(require,module,exports){

/**
 * Module dependencies.
 */

var debug = require('debug')('socket.io-parser');
var json = require('json3');
var Emitter = require('component-emitter');
var binary = require('./binary');
var isBuf = require('./is-buffer');

/**
 * Protocol version.
 *
 * @api public
 */

exports.protocol = 4;

/**
 * Packet types.
 *
 * @api public
 */

exports.types = [
  'CONNECT',
  'DISCONNECT',
  'EVENT',
  'ACK',
  'ERROR',
  'BINARY_EVENT',
  'BINARY_ACK'
];

/**
 * Packet type `connect`.
 *
 * @api public
 */

exports.CONNECT = 0;

/**
 * Packet type `disconnect`.
 *
 * @api public
 */

exports.DISCONNECT = 1;

/**
 * Packet type `event`.
 *
 * @api public
 */

exports.EVENT = 2;

/**
 * Packet type `ack`.
 *
 * @api public
 */

exports.ACK = 3;

/**
 * Packet type `error`.
 *
 * @api public
 */

exports.ERROR = 4;

/**
 * Packet type 'binary event'
 *
 * @api public
 */

exports.BINARY_EVENT = 5;

/**
 * Packet type `binary ack`. For acks with binary arguments.
 *
 * @api public
 */

exports.BINARY_ACK = 6;

/**
 * Encoder constructor.
 *
 * @api public
 */

exports.Encoder = Encoder;

/**
 * Decoder constructor.
 *
 * @api public
 */

exports.Decoder = Decoder;

/**
 * A socket.io Encoder instance
 *
 * @api public
 */

function Encoder() {}

/**
 * Encode a packet as a single string if non-binary, or as a
 * buffer sequence, depending on packet type.
 *
 * @param {Object} obj - packet object
 * @param {Function} callback - function to handle encodings (likely engine.write)
 * @return Calls callback with Array of encodings
 * @api public
 */

Encoder.prototype.encode = function(obj, callback){
  debug('encoding packet %j', obj);

  if (exports.BINARY_EVENT == obj.type || exports.BINARY_ACK == obj.type) {
    encodeAsBinary(obj, callback);
  }
  else {
    var encoding = encodeAsString(obj);
    callback([encoding]);
  }
};

/**
 * Encode packet as string.
 *
 * @param {Object} packet
 * @return {String} encoded
 * @api private
 */

function encodeAsString(obj) {
  var str = '';
  var nsp = false;

  // first is type
  str += obj.type;

  // attachments if we have them
  if (exports.BINARY_EVENT == obj.type || exports.BINARY_ACK == obj.type) {
    str += obj.attachments;
    str += '-';
  }

  // if we have a namespace other than `/`
  // we append it followed by a comma `,`
  if (obj.nsp && '/' != obj.nsp) {
    nsp = true;
    str += obj.nsp;
  }

  // immediately followed by the id
  if (null != obj.id) {
    if (nsp) {
      str += ',';
      nsp = false;
    }
    str += obj.id;
  }

  // json data
  if (null != obj.data) {
    if (nsp) str += ',';
    str += json.stringify(obj.data);
  }

  debug('encoded %j as %s', obj, str);
  return str;
}

/**
 * Encode packet as 'buffer sequence' by removing blobs, and
 * deconstructing packet into object with placeholders and
 * a list of buffers.
 *
 * @param {Object} packet
 * @return {Buffer} encoded
 * @api private
 */

function encodeAsBinary(obj, callback) {

  function writeEncoding(bloblessData) {
    var deconstruction = binary.deconstructPacket(bloblessData);
    var pack = encodeAsString(deconstruction.packet);
    var buffers = deconstruction.buffers;

    buffers.unshift(pack); // add packet info to beginning of data list
    callback(buffers); // write all the buffers
  }

  binary.removeBlobs(obj, writeEncoding);
}

/**
 * A socket.io Decoder instance
 *
 * @return {Object} decoder
 * @api public
 */

function Decoder() {
  this.reconstructor = null;
}

/**
 * Mix in `Emitter` with Decoder.
 */

Emitter(Decoder.prototype);

/**
 * Decodes an ecoded packet string into packet JSON.
 *
 * @param {String} obj - encoded packet
 * @return {Object} packet
 * @api public
 */

Decoder.prototype.add = function(obj) {
  var packet;
  if ('string' == typeof obj) {
    packet = decodeString(obj);
    if (exports.BINARY_EVENT == packet.type || exports.BINARY_ACK == packet.type) { // binary packet's json
      this.reconstructor = new BinaryReconstructor(packet);

      // no attachments, labeled binary but no binary data to follow
      if (this.reconstructor.reconPack.attachments === 0) {
        this.emit('decoded', packet);
      }
    } else { // non-binary full packet
      this.emit('decoded', packet);
    }
  }
  else if (isBuf(obj) || obj.base64) { // raw binary data
    if (!this.reconstructor) {
      throw new Error('got binary data when not reconstructing a packet');
    } else {
      packet = this.reconstructor.takeBinaryData(obj);
      if (packet) { // received final buffer
        this.reconstructor = null;
        this.emit('decoded', packet);
      }
    }
  }
  else {
    throw new Error('Unknown type: ' + obj);
  }
};

/**
 * Decode a packet String (JSON data)
 *
 * @param {String} str
 * @return {Object} packet
 * @api private
 */

function decodeString(str) {
  var p = {};
  var i = 0;

  // look up type
  p.type = Number(str.charAt(0));
  if (null == exports.types[p.type]) return error();

  // look up attachments if type binary
  if (exports.BINARY_EVENT == p.type || exports.BINARY_ACK == p.type) {
    var buf = '';
    while (str.charAt(++i) != '-') {
      buf += str.charAt(i);
      if (i == str.length) break;
    }
    if (buf != Number(buf) || str.charAt(i) != '-') {
      throw new Error('Illegal attachments');
    }
    p.attachments = Number(buf);
  }

  // look up namespace (if any)
  if ('/' == str.charAt(i + 1)) {
    p.nsp = '';
    while (++i) {
      var c = str.charAt(i);
      if (',' == c) break;
      p.nsp += c;
      if (i == str.length) break;
    }
  } else {
    p.nsp = '/';
  }

  // look up id
  var next = str.charAt(i + 1);
  if ('' !== next && Number(next) == next) {
    p.id = '';
    while (++i) {
      var c = str.charAt(i);
      if (null == c || Number(c) != c) {
        --i;
        break;
      }
      p.id += str.charAt(i);
      if (i == str.length) break;
    }
    p.id = Number(p.id);
  }

  // look up json data
  if (str.charAt(++i)) {
    p = tryParse(p, str.substr(i));
  }

  debug('decoded %s as %j', str, p);
  return p;
}

function tryParse(p, str) {
  try {
    p.data = json.parse(str);
  } catch(e){
    return error();
  }
  return p; 
};

/**
 * Deallocates a parser's resources
 *
 * @api public
 */

Decoder.prototype.destroy = function() {
  if (this.reconstructor) {
    this.reconstructor.finishedReconstruction();
  }
};

/**
 * A manager of a binary event's 'buffer sequence'. Should
 * be constructed whenever a packet of type BINARY_EVENT is
 * decoded.
 *
 * @param {Object} packet
 * @return {BinaryReconstructor} initialized reconstructor
 * @api private
 */

function BinaryReconstructor(packet) {
  this.reconPack = packet;
  this.buffers = [];
}

/**
 * Method to be called when binary data received from connection
 * after a BINARY_EVENT packet.
 *
 * @param {Buffer | ArrayBuffer} binData - the raw binary data received
 * @return {null | Object} returns null if more binary data is expected or
 *   a reconstructed packet object if all buffers have been received.
 * @api private
 */

BinaryReconstructor.prototype.takeBinaryData = function(binData) {
  this.buffers.push(binData);
  if (this.buffers.length == this.reconPack.attachments) { // done with buffer list
    var packet = binary.reconstructPacket(this.reconPack, this.buffers);
    this.finishedReconstruction();
    return packet;
  }
  return null;
};

/**
 * Cleans up binary packet reconstruction variables.
 *
 * @api private
 */

BinaryReconstructor.prototype.finishedReconstruction = function() {
  this.reconPack = null;
  this.buffers = [];
};

function error(data){
  return {
    type: exports.ERROR,
    data: 'parser error'
  };
}

},{"./binary":376,"./is-buffer":378,"component-emitter":379,"debug":331,"json3":357}],378:[function(require,module,exports){
(function (global){

module.exports = isBuf;

/**
 * Returns true if obj is a buffer or an arraybuffer.
 *
 * @api private
 */

function isBuf(obj) {
  return (global.Buffer && global.Buffer.isBuffer(obj)) ||
         (global.ArrayBuffer && obj instanceof ArrayBuffer);
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],379:[function(require,module,exports){

/**
 * Expose `Emitter`.
 */

module.exports = Emitter;

/**
 * Initialize a new `Emitter`.
 *
 * @api public
 */

function Emitter(obj) {
  if (obj) return mixin(obj);
};

/**
 * Mixin the emitter properties.
 *
 * @param {Object} obj
 * @return {Object}
 * @api private
 */

function mixin(obj) {
  for (var key in Emitter.prototype) {
    obj[key] = Emitter.prototype[key];
  }
  return obj;
}

/**
 * Listen on the given `event` with `fn`.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.on =
Emitter.prototype.addEventListener = function(event, fn){
  this._callbacks = this._callbacks || {};
  (this._callbacks[event] = this._callbacks[event] || [])
    .push(fn);
  return this;
};

/**
 * Adds an `event` listener that will be invoked a single
 * time then automatically removed.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.once = function(event, fn){
  var self = this;
  this._callbacks = this._callbacks || {};

  function on() {
    self.off(event, on);
    fn.apply(this, arguments);
  }

  on.fn = fn;
  this.on(event, on);
  return this;
};

/**
 * Remove the given callback for `event` or all
 * registered callbacks.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.off =
Emitter.prototype.removeListener =
Emitter.prototype.removeAllListeners =
Emitter.prototype.removeEventListener = function(event, fn){
  this._callbacks = this._callbacks || {};

  // all
  if (0 == arguments.length) {
    this._callbacks = {};
    return this;
  }

  // specific event
  var callbacks = this._callbacks[event];
  if (!callbacks) return this;

  // remove all handlers
  if (1 == arguments.length) {
    delete this._callbacks[event];
    return this;
  }

  // remove specific handler
  var cb;
  for (var i = 0; i < callbacks.length; i++) {
    cb = callbacks[i];
    if (cb === fn || cb.fn === fn) {
      callbacks.splice(i, 1);
      break;
    }
  }
  return this;
};

/**
 * Emit `event` with the given args.
 *
 * @param {String} event
 * @param {Mixed} ...
 * @return {Emitter}
 */

Emitter.prototype.emit = function(event){
  this._callbacks = this._callbacks || {};
  var args = [].slice.call(arguments, 1)
    , callbacks = this._callbacks[event];

  if (callbacks) {
    callbacks = callbacks.slice(0);
    for (var i = 0, len = callbacks.length; i < len; ++i) {
      callbacks[i].apply(this, args);
    }
  }

  return this;
};

/**
 * Return array of callbacks for `event`.
 *
 * @param {String} event
 * @return {Array}
 * @api public
 */

Emitter.prototype.listeners = function(event){
  this._callbacks = this._callbacks || {};
  return this._callbacks[event] || [];
};

/**
 * Check if this emitter has `event` handlers.
 *
 * @param {String} event
 * @return {Boolean}
 * @api public
 */

Emitter.prototype.hasListeners = function(event){
  return !! this.listeners(event).length;
};

},{}],380:[function(require,module,exports){
/**
 * Root reference for iframes.
 */

var root;
if (typeof window !== 'undefined') { // Browser window
  root = window;
} else if (typeof self !== 'undefined') { // Web Worker
  root = self;
} else { // Other environments
  console.warn("Using browser-only version of superagent in non-browser environment");
  root = this;
}

var Emitter = require('emitter');
var RequestBase = require('./request-base');
var isObject = require('./is-object');
var isFunction = require('./is-function');

/**
 * Noop.
 */

function noop(){};

/**
 * Expose `request`.
 */

var request = exports = module.exports = function(method, url) {
  // callback
  if ('function' == typeof url) {
    return new exports.Request('GET', method).end(url);
  }

  // url first
  if (1 == arguments.length) {
    return new exports.Request('GET', method);
  }

  return new exports.Request(method, url);
}

exports.Request = Request;

/**
 * Determine XHR.
 */

request.getXHR = function () {
  if (root.XMLHttpRequest
      && (!root.location || 'file:' != root.location.protocol
          || !root.ActiveXObject)) {
    return new XMLHttpRequest;
  } else {
    try { return new ActiveXObject('Microsoft.XMLHTTP'); } catch(e) {}
    try { return new ActiveXObject('Msxml2.XMLHTTP.6.0'); } catch(e) {}
    try { return new ActiveXObject('Msxml2.XMLHTTP.3.0'); } catch(e) {}
    try { return new ActiveXObject('Msxml2.XMLHTTP'); } catch(e) {}
  }
  throw Error("Browser-only verison of superagent could not find XHR");
};

/**
 * Removes leading and trailing whitespace, added to support IE.
 *
 * @param {String} s
 * @return {String}
 * @api private
 */

var trim = ''.trim
  ? function(s) { return s.trim(); }
  : function(s) { return s.replace(/(^\s*|\s*$)/g, ''); };

/**
 * Serialize the given `obj`.
 *
 * @param {Object} obj
 * @return {String}
 * @api private
 */

function serialize(obj) {
  if (!isObject(obj)) return obj;
  var pairs = [];
  for (var key in obj) {
    pushEncodedKeyValuePair(pairs, key, obj[key]);
  }
  return pairs.join('&');
}

/**
 * Helps 'serialize' with serializing arrays.
 * Mutates the pairs array.
 *
 * @param {Array} pairs
 * @param {String} key
 * @param {Mixed} val
 */

function pushEncodedKeyValuePair(pairs, key, val) {
  if (val != null) {
    if (Array.isArray(val)) {
      val.forEach(function(v) {
        pushEncodedKeyValuePair(pairs, key, v);
      });
    } else if (isObject(val)) {
      for(var subkey in val) {
        pushEncodedKeyValuePair(pairs, key + '[' + subkey + ']', val[subkey]);
      }
    } else {
      pairs.push(encodeURIComponent(key)
        + '=' + encodeURIComponent(val));
    }
  } else if (val === null) {
    pairs.push(encodeURIComponent(key));
  }
}

/**
 * Expose serialization method.
 */

 request.serializeObject = serialize;

 /**
  * Parse the given x-www-form-urlencoded `str`.
  *
  * @param {String} str
  * @return {Object}
  * @api private
  */

function parseString(str) {
  var obj = {};
  var pairs = str.split('&');
  var pair;
  var pos;

  for (var i = 0, len = pairs.length; i < len; ++i) {
    pair = pairs[i];
    pos = pair.indexOf('=');
    if (pos == -1) {
      obj[decodeURIComponent(pair)] = '';
    } else {
      obj[decodeURIComponent(pair.slice(0, pos))] =
        decodeURIComponent(pair.slice(pos + 1));
    }
  }

  return obj;
}

/**
 * Expose parser.
 */

request.parseString = parseString;

/**
 * Default MIME type map.
 *
 *     superagent.types.xml = 'application/xml';
 *
 */

request.types = {
  html: 'text/html',
  json: 'application/json',
  xml: 'application/xml',
  urlencoded: 'application/x-www-form-urlencoded',
  'form': 'application/x-www-form-urlencoded',
  'form-data': 'application/x-www-form-urlencoded'
};

/**
 * Default serialization map.
 *
 *     superagent.serialize['application/xml'] = function(obj){
 *       return 'generated xml here';
 *     };
 *
 */

 request.serialize = {
   'application/x-www-form-urlencoded': serialize,
   'application/json': JSON.stringify
 };

 /**
  * Default parsers.
  *
  *     superagent.parse['application/xml'] = function(str){
  *       return { object parsed from str };
  *     };
  *
  */

request.parse = {
  'application/x-www-form-urlencoded': parseString,
  'application/json': JSON.parse
};

/**
 * Parse the given header `str` into
 * an object containing the mapped fields.
 *
 * @param {String} str
 * @return {Object}
 * @api private
 */

function parseHeader(str) {
  var lines = str.split(/\r?\n/);
  var fields = {};
  var index;
  var line;
  var field;
  var val;

  lines.pop(); // trailing CRLF

  for (var i = 0, len = lines.length; i < len; ++i) {
    line = lines[i];
    index = line.indexOf(':');
    field = line.slice(0, index).toLowerCase();
    val = trim(line.slice(index + 1));
    fields[field] = val;
  }

  return fields;
}

/**
 * Check if `mime` is json or has +json structured syntax suffix.
 *
 * @param {String} mime
 * @return {Boolean}
 * @api private
 */

function isJSON(mime) {
  return /[\/+]json\b/.test(mime);
}

/**
 * Return the mime type for the given `str`.
 *
 * @param {String} str
 * @return {String}
 * @api private
 */

function type(str){
  return str.split(/ *; */).shift();
};

/**
 * Return header field parameters.
 *
 * @param {String} str
 * @return {Object}
 * @api private
 */

function params(str){
  return str.split(/ *; */).reduce(function(obj, str){
    var parts = str.split(/ *= */),
        key = parts.shift(),
        val = parts.shift();

    if (key && val) obj[key] = val;
    return obj;
  }, {});
};

/**
 * Initialize a new `Response` with the given `xhr`.
 *
 *  - set flags (.ok, .error, etc)
 *  - parse header
 *
 * Examples:
 *
 *  Aliasing `superagent` as `request` is nice:
 *
 *      request = superagent;
 *
 *  We can use the promise-like API, or pass callbacks:
 *
 *      request.get('/').end(function(res){});
 *      request.get('/', function(res){});
 *
 *  Sending data can be chained:
 *
 *      request
 *        .post('/user')
 *        .send({ name: 'tj' })
 *        .end(function(res){});
 *
 *  Or passed to `.send()`:
 *
 *      request
 *        .post('/user')
 *        .send({ name: 'tj' }, function(res){});
 *
 *  Or passed to `.post()`:
 *
 *      request
 *        .post('/user', { name: 'tj' })
 *        .end(function(res){});
 *
 * Or further reduced to a single call for simple cases:
 *
 *      request
 *        .post('/user', { name: 'tj' }, function(res){});
 *
 * @param {XMLHTTPRequest} xhr
 * @param {Object} options
 * @api private
 */

function Response(req, options) {
  options = options || {};
  this.req = req;
  this.xhr = this.req.xhr;
  // responseText is accessible only if responseType is '' or 'text' and on older browsers
  this.text = ((this.req.method !='HEAD' && (this.xhr.responseType === '' || this.xhr.responseType === 'text')) || typeof this.xhr.responseType === 'undefined')
     ? this.xhr.responseText
     : null;
  this.statusText = this.req.xhr.statusText;
  this._setStatusProperties(this.xhr.status);
  this.header = this.headers = parseHeader(this.xhr.getAllResponseHeaders());
  // getAllResponseHeaders sometimes falsely returns "" for CORS requests, but
  // getResponseHeader still works. so we get content-type even if getting
  // other headers fails.
  this.header['content-type'] = this.xhr.getResponseHeader('content-type');
  this._setHeaderProperties(this.header);
  this.body = this.req.method != 'HEAD'
    ? this._parseBody(this.text ? this.text : this.xhr.response)
    : null;
}

/**
 * Get case-insensitive `field` value.
 *
 * @param {String} field
 * @return {String}
 * @api public
 */

Response.prototype.get = function(field){
  return this.header[field.toLowerCase()];
};

/**
 * Set header related properties:
 *
 *   - `.type` the content type without params
 *
 * A response of "Content-Type: text/plain; charset=utf-8"
 * will provide you with a `.type` of "text/plain".
 *
 * @param {Object} header
 * @api private
 */

Response.prototype._setHeaderProperties = function(header){
  // content-type
  var ct = this.header['content-type'] || '';
  this.type = type(ct);

  // params
  var obj = params(ct);
  for (var key in obj) this[key] = obj[key];
};

/**
 * Parse the given body `str`.
 *
 * Used for auto-parsing of bodies. Parsers
 * are defined on the `superagent.parse` object.
 *
 * @param {String} str
 * @return {Mixed}
 * @api private
 */

Response.prototype._parseBody = function(str){
  var parse = request.parse[this.type];
  if (!parse && isJSON(this.type)) {
    parse = request.parse['application/json'];
  }
  return parse && str && (str.length || str instanceof Object)
    ? parse(str)
    : null;
};

/**
 * Set flags such as `.ok` based on `status`.
 *
 * For example a 2xx response will give you a `.ok` of __true__
 * whereas 5xx will be __false__ and `.error` will be __true__. The
 * `.clientError` and `.serverError` are also available to be more
 * specific, and `.statusType` is the class of error ranging from 1..5
 * sometimes useful for mapping respond colors etc.
 *
 * "sugar" properties are also defined for common cases. Currently providing:
 *
 *   - .noContent
 *   - .badRequest
 *   - .unauthorized
 *   - .notAcceptable
 *   - .notFound
 *
 * @param {Number} status
 * @api private
 */

Response.prototype._setStatusProperties = function(status){
  // handle IE9 bug: http://stackoverflow.com/questions/10046972/msie-returns-status-code-of-1223-for-ajax-request
  if (status === 1223) {
    status = 204;
  }

  var type = status / 100 | 0;

  // status / class
  this.status = this.statusCode = status;
  this.statusType = type;

  // basics
  this.info = 1 == type;
  this.ok = 2 == type;
  this.clientError = 4 == type;
  this.serverError = 5 == type;
  this.error = (4 == type || 5 == type)
    ? this.toError()
    : false;

  // sugar
  this.accepted = 202 == status;
  this.noContent = 204 == status;
  this.badRequest = 400 == status;
  this.unauthorized = 401 == status;
  this.notAcceptable = 406 == status;
  this.notFound = 404 == status;
  this.forbidden = 403 == status;
};

/**
 * Return an `Error` representative of this response.
 *
 * @return {Error}
 * @api public
 */

Response.prototype.toError = function(){
  var req = this.req;
  var method = req.method;
  var url = req.url;

  var msg = 'cannot ' + method + ' ' + url + ' (' + this.status + ')';
  var err = new Error(msg);
  err.status = this.status;
  err.method = method;
  err.url = url;

  return err;
};

/**
 * Expose `Response`.
 */

request.Response = Response;

/**
 * Initialize a new `Request` with the given `method` and `url`.
 *
 * @param {String} method
 * @param {String} url
 * @api public
 */

function Request(method, url) {
  var self = this;
  this._query = this._query || [];
  this.method = method;
  this.url = url;
  this.header = {}; // preserves header name case
  this._header = {}; // coerces header names to lowercase
  this.on('end', function(){
    var err = null;
    var res = null;

    try {
      res = new Response(self);
    } catch(e) {
      err = new Error('Parser is unable to parse the response');
      err.parse = true;
      err.original = e;
      // issue #675: return the raw response if the response parsing fails
      if (self.xhr) {
        // ie9 doesn't have 'response' property
        err.rawResponse = typeof self.xhr.responseType == 'undefined' ? self.xhr.responseText : self.xhr.response;
        // issue #876: return the http status code if the response parsing fails
        err.statusCode = self.xhr.status ? self.xhr.status : null;
      } else {
        err.rawResponse = null;
        err.statusCode = null;
      }

      return self.callback(err);
    }

    self.emit('response', res);

    var new_err;
    try {
      if (res.status < 200 || res.status >= 300) {
        new_err = new Error(res.statusText || 'Unsuccessful HTTP response');
        new_err.original = err;
        new_err.response = res;
        new_err.status = res.status;
      }
    } catch(e) {
      new_err = e; // #985 touching res may cause INVALID_STATE_ERR on old Android
    }

    // #1000 don't catch errors from the callback to avoid double calling it
    if (new_err) {
      self.callback(new_err, res);
    } else {
      self.callback(null, res);
    }
  });
}

/**
 * Mixin `Emitter` and `RequestBase`.
 */

Emitter(Request.prototype);
RequestBase(Request.prototype);

/**
 * Set Content-Type to `type`, mapping values from `request.types`.
 *
 * Examples:
 *
 *      superagent.types.xml = 'application/xml';
 *
 *      request.post('/')
 *        .type('xml')
 *        .send(xmlstring)
 *        .end(callback);
 *
 *      request.post('/')
 *        .type('application/xml')
 *        .send(xmlstring)
 *        .end(callback);
 *
 * @param {String} type
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.type = function(type){
  this.set('Content-Type', request.types[type] || type);
  return this;
};

/**
 * Set responseType to `val`. Presently valid responseTypes are 'blob' and
 * 'arraybuffer'.
 *
 * Examples:
 *
 *      req.get('/')
 *        .responseType('blob')
 *        .end(callback);
 *
 * @param {String} val
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.responseType = function(val){
  this._responseType = val;
  return this;
};

/**
 * Set Accept to `type`, mapping values from `request.types`.
 *
 * Examples:
 *
 *      superagent.types.json = 'application/json';
 *
 *      request.get('/agent')
 *        .accept('json')
 *        .end(callback);
 *
 *      request.get('/agent')
 *        .accept('application/json')
 *        .end(callback);
 *
 * @param {String} accept
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.accept = function(type){
  this.set('Accept', request.types[type] || type);
  return this;
};

/**
 * Set Authorization field value with `user` and `pass`.
 *
 * @param {String} user
 * @param {String} pass
 * @param {Object} options with 'type' property 'auto' or 'basic' (default 'basic')
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.auth = function(user, pass, options){
  if (!options) {
    options = {
      type: 'basic'
    }
  }

  switch (options.type) {
    case 'basic':
      var str = btoa(user + ':' + pass);
      this.set('Authorization', 'Basic ' + str);
    break;

    case 'auto':
      this.username = user;
      this.password = pass;
    break;
  }
  return this;
};

/**
* Add query-string `val`.
*
* Examples:
*
*   request.get('/shoes')
*     .query('size=10')
*     .query({ color: 'blue' })
*
* @param {Object|String} val
* @return {Request} for chaining
* @api public
*/

Request.prototype.query = function(val){
  if ('string' != typeof val) val = serialize(val);
  if (val) this._query.push(val);
  return this;
};

/**
 * Queue the given `file` as an attachment to the specified `field`,
 * with optional `options` (or filename).
 *
 * ``` js
 * request.post('/upload')
 *   .attach('content', new Blob(['<a id="a"><b id="b">hey!</b></a>'], { type: "text/html"}))
 *   .end(callback);
 * ```
 *
 * @param {String} field
 * @param {Blob|File} file
 * @param {String|Object} options
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.attach = function(field, file, options){
  if (this._data) {
    throw Error("superagent can't mix .send() and .attach()");
  }

  this._getFormData().append(field, file, options || file.name);
  return this;
};

Request.prototype._getFormData = function(){
  if (!this._formData) {
    this._formData = new root.FormData();
  }
  return this._formData;
};

/**
 * Invoke the callback with `err` and `res`
 * and handle arity check.
 *
 * @param {Error} err
 * @param {Response} res
 * @api private
 */

Request.prototype.callback = function(err, res){
  var fn = this._callback;
  this.clearTimeout();

  if (err) {
    this.emit('error', err);
  }

  fn(err, res);
};

/**
 * Invoke callback with x-domain error.
 *
 * @api private
 */

Request.prototype.crossDomainError = function(){
  var err = new Error('Request has been terminated\nPossible causes: the network is offline, Origin is not allowed by Access-Control-Allow-Origin, the page is being unloaded, etc.');
  err.crossDomain = true;

  err.status = this.status;
  err.method = this.method;
  err.url = this.url;

  this.callback(err);
};

// This only warns, because the request is still likely to work
Request.prototype.buffer = Request.prototype.ca = Request.prototype.agent = function(){
  console.warn("This is not supported in browser version of superagent");
  return this;
};

// This throws, because it can't send/receive data as expected
Request.prototype.pipe = Request.prototype.write = function(){
  throw Error("Streaming is not supported in browser version of superagent");
};

/**
 * Invoke callback with timeout error.
 *
 * @api private
 */

Request.prototype._timeoutError = function(){
  var timeout = this._timeout;
  var err = new Error('timeout of ' + timeout + 'ms exceeded');
  err.timeout = timeout;
  this.callback(err);
};

/**
 * Compose querystring to append to req.url
 *
 * @api private
 */

Request.prototype._appendQueryString = function(){
  var query = this._query.join('&');
  if (query) {
    this.url += ~this.url.indexOf('?')
      ? '&' + query
      : '?' + query;
  }
};

/**
 * Check if `obj` is a host object,
 * we don't want to serialize these :)
 *
 * @param {Object} obj
 * @return {Boolean}
 * @api private
 */
Request.prototype._isHost = function _isHost(obj) {
  // Native objects stringify to [object File], [object Blob], [object FormData], etc.
  return obj && 'object' === typeof obj && !Array.isArray(obj) && Object.prototype.toString.call(obj) !== '[object Object]';
}

/**
 * Initiate request, invoking callback `fn(res)`
 * with an instanceof `Response`.
 *
 * @param {Function} fn
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.end = function(fn){
  var self = this;
  var xhr = this.xhr = request.getXHR();
  var timeout = this._timeout;
  var data = this._formData || this._data;

  // store callback
  this._callback = fn || noop;

  // state change
  xhr.onreadystatechange = function(){
    if (4 != xhr.readyState) return;

    // In IE9, reads to any property (e.g. status) off of an aborted XHR will
    // result in the error "Could not complete the operation due to error c00c023f"
    var status;
    try { status = xhr.status } catch(e) { status = 0; }

    if (0 == status) {
      if (self.timedout) return self._timeoutError();
      if (self._aborted) return;
      return self.crossDomainError();
    }
    self.emit('end');
  };

  // progress
  var handleProgress = function(direction, e) {
    if (e.total > 0) {
      e.percent = e.loaded / e.total * 100;
    }
    e.direction = direction;
    self.emit('progress', e);
  }
  if (this.hasListeners('progress')) {
    try {
      xhr.onprogress = handleProgress.bind(null, 'download');
      if (xhr.upload) {
        xhr.upload.onprogress = handleProgress.bind(null, 'upload');
      }
    } catch(e) {
      // Accessing xhr.upload fails in IE from a web worker, so just pretend it doesn't exist.
      // Reported here:
      // https://connect.microsoft.com/IE/feedback/details/837245/xmlhttprequest-upload-throws-invalid-argument-when-used-from-web-worker-context
    }
  }

  // timeout
  if (timeout && !this._timer) {
    this._timer = setTimeout(function(){
      self.timedout = true;
      self.abort();
    }, timeout);
  }

  // querystring
  this._appendQueryString();

  if (this._sort) {
    var index = this.url.indexOf('?');
    if (~index) {
      var queryArr = this.url.substring(index + 1).split('&');
      isFunction(this._sort) ? queryArr.sort(this._sort) : queryArr.sort();
    }
    this.url = this.url.substring(0, index) + '?' + queryArr.join('&');
  }

  // initiate request
  if (this.username && this.password) {
    xhr.open(this.method, this.url, true, this.username, this.password);
  } else {
    xhr.open(this.method, this.url, true);
  }

  // CORS
  if (this._withCredentials) xhr.withCredentials = true;

  // body
  if (!this._formData && 'GET' != this.method && 'HEAD' != this.method && 'string' != typeof data && !this._isHost(data)) {
    // serialize stuff
    var contentType = this._header['content-type'];
    var serialize = this._serializer || request.serialize[contentType ? contentType.split(';')[0] : ''];
    if (!serialize && isJSON(contentType)) serialize = request.serialize['application/json'];
    if (serialize) data = serialize(data);
  }

  // set header fields
  for (var field in this.header) {
    if (null == this.header[field]) continue;
    xhr.setRequestHeader(field, this.header[field]);
  }

  if (this._responseType) {
    xhr.responseType = this._responseType;
  }

  // send stuff
  this.emit('request', this);

  // IE11 xhr.send(undefined) sends 'undefined' string as POST payload (instead of nothing)
  // We need null here if data is undefined
  xhr.send(typeof data !== 'undefined' ? data : null);
  return this;
};

/**
 * GET `url` with optional callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed|Function} [data] or fn
 * @param {Function} [fn]
 * @return {Request}
 * @api public
 */

request.get = function(url, data, fn){
  var req = request('GET', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.query(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * HEAD `url` with optional callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed|Function} [data] or fn
 * @param {Function} [fn]
 * @return {Request}
 * @api public
 */

request.head = function(url, data, fn){
  var req = request('HEAD', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * OPTIONS query to `url` with optional callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed|Function} [data] or fn
 * @param {Function} [fn]
 * @return {Request}
 * @api public
 */

request.options = function(url, data, fn){
  var req = request('OPTIONS', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * DELETE `url` with optional callback `fn(res)`.
 *
 * @param {String} url
 * @param {Function} [fn]
 * @return {Request}
 * @api public
 */

function del(url, fn){
  var req = request('DELETE', url);
  if (fn) req.end(fn);
  return req;
};

request['del'] = del;
request['delete'] = del;

/**
 * PATCH `url` with optional `data` and callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed} [data]
 * @param {Function} [fn]
 * @return {Request}
 * @api public
 */

request.patch = function(url, data, fn){
  var req = request('PATCH', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * POST `url` with optional `data` and callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed} [data]
 * @param {Function} [fn]
 * @return {Request}
 * @api public
 */

request.post = function(url, data, fn){
  var req = request('POST', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * PUT `url` with optional `data` and callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed|Function} [data] or fn
 * @param {Function} [fn]
 * @return {Request}
 * @api public
 */

request.put = function(url, data, fn){
  var req = request('PUT', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};

},{"./is-function":381,"./is-object":382,"./request-base":383,"emitter":35}],381:[function(require,module,exports){
/**
 * Check if `fn` is a function.
 *
 * @param {Function} fn
 * @return {Boolean}
 * @api private
 */
var isObject = require('./is-object');

function isFunction(fn) {
  var tag = isObject(fn) ? Object.prototype.toString.call(fn) : '';
  return tag === '[object Function]';
}

module.exports = isFunction;

},{"./is-object":382}],382:[function(require,module,exports){
/**
 * Check if `obj` is an object.
 *
 * @param {Object} obj
 * @return {Boolean}
 * @api private
 */

function isObject(obj) {
  return null !== obj && 'object' === typeof obj;
}

module.exports = isObject;

},{}],383:[function(require,module,exports){
/**
 * Module of mixed-in functions shared between node and client code
 */
var isObject = require('./is-object');

/**
 * Expose `RequestBase`.
 */

module.exports = RequestBase;

/**
 * Initialize a new `RequestBase`.
 *
 * @api public
 */

function RequestBase(obj) {
  if (obj) return mixin(obj);
}

/**
 * Mixin the prototype properties.
 *
 * @param {Object} obj
 * @return {Object}
 * @api private
 */

function mixin(obj) {
  for (var key in RequestBase.prototype) {
    obj[key] = RequestBase.prototype[key];
  }
  return obj;
}

/**
 * Clear previous timeout.
 *
 * @return {Request} for chaining
 * @api public
 */

RequestBase.prototype.clearTimeout = function _clearTimeout(){
  this._timeout = 0;
  clearTimeout(this._timer);
  return this;
};

/**
 * Override default response body parser
 *
 * This function will be called to convert incoming data into request.body
 *
 * @param {Function}
 * @api public
 */

RequestBase.prototype.parse = function parse(fn){
  this._parser = fn;
  return this;
};

/**
 * Override default request body serializer
 *
 * This function will be called to convert data set via .send or .attach into payload to send
 *
 * @param {Function}
 * @api public
 */

RequestBase.prototype.serialize = function serialize(fn){
  this._serializer = fn;
  return this;
};

/**
 * Set timeout to `ms`.
 *
 * @param {Number} ms
 * @return {Request} for chaining
 * @api public
 */

RequestBase.prototype.timeout = function timeout(ms){
  this._timeout = ms;
  return this;
};

/**
 * Promise support
 *
 * @param {Function} resolve
 * @param {Function} reject
 * @return {Request}
 */

RequestBase.prototype.then = function then(resolve, reject) {
  if (!this._fullfilledPromise) {
    var self = this;
    this._fullfilledPromise = new Promise(function(innerResolve, innerReject){
      self.end(function(err, res){
        if (err) innerReject(err); else innerResolve(res);
      });
    });
  }
  return this._fullfilledPromise.then(resolve, reject);
}

RequestBase.prototype.catch = function(cb) {
  return this.then(undefined, cb);
};

/**
 * Allow for extension
 */

RequestBase.prototype.use = function use(fn) {
  fn(this);
  return this;
}


/**
 * Get request header `field`.
 * Case-insensitive.
 *
 * @param {String} field
 * @return {String}
 * @api public
 */

RequestBase.prototype.get = function(field){
  return this._header[field.toLowerCase()];
};

/**
 * Get case-insensitive header `field` value.
 * This is a deprecated internal API. Use `.get(field)` instead.
 *
 * (getHeader is no longer used internally by the superagent code base)
 *
 * @param {String} field
 * @return {String}
 * @api private
 * @deprecated
 */

RequestBase.prototype.getHeader = RequestBase.prototype.get;

/**
 * Set header `field` to `val`, or multiple fields with one object.
 * Case-insensitive.
 *
 * Examples:
 *
 *      req.get('/')
 *        .set('Accept', 'application/json')
 *        .set('X-API-Key', 'foobar')
 *        .end(callback);
 *
 *      req.get('/')
 *        .set({ Accept: 'application/json', 'X-API-Key': 'foobar' })
 *        .end(callback);
 *
 * @param {String|Object} field
 * @param {String} val
 * @return {Request} for chaining
 * @api public
 */

RequestBase.prototype.set = function(field, val){
  if (isObject(field)) {
    for (var key in field) {
      this.set(key, field[key]);
    }
    return this;
  }
  this._header[field.toLowerCase()] = val;
  this.header[field] = val;
  return this;
};

/**
 * Remove header `field`.
 * Case-insensitive.
 *
 * Example:
 *
 *      req.get('/')
 *        .unset('User-Agent')
 *        .end(callback);
 *
 * @param {String} field
 */
RequestBase.prototype.unset = function(field){
  delete this._header[field.toLowerCase()];
  delete this.header[field];
  return this;
};

/**
 * Write the field `name` and `val`, or multiple fields with one object
 * for "multipart/form-data" request bodies.
 *
 * ``` js
 * request.post('/upload')
 *   .field('foo', 'bar')
 *   .end(callback);
 *
 * request.post('/upload')
 *   .field({ foo: 'bar', baz: 'qux' })
 *   .end(callback);
 * ```
 *
 * @param {String|Object} name
 * @param {String|Blob|File|Buffer|fs.ReadStream} val
 * @return {Request} for chaining
 * @api public
 */
RequestBase.prototype.field = function(name, val) {

  // name should be either a string or an object.
  if (null === name ||  undefined === name) {
    throw new Error('.field(name, val) name can not be empty');
  }

  if (isObject(name)) {
    for (var key in name) {
      this.field(key, name[key]);
    }
    return this;
  }

  if (Array.isArray(val)) {
    for (var i in val) {
      this.field(name, val[i]);
    }
    return this;
  }

  // val should be defined now
  if (null === val || undefined === val) {
    throw new Error('.field(name, val) val can not be empty');
  }
  if ('boolean' === typeof val) {
    val = '' + val;
  }
  this._getFormData().append(name, val);
  return this;
};

/**
 * Abort the request, and clear potential timeout.
 *
 * @return {Request}
 * @api public
 */
RequestBase.prototype.abort = function(){
  if (this._aborted) {
    return this;
  }
  this._aborted = true;
  this.xhr && this.xhr.abort(); // browser
  this.req && this.req.abort(); // node
  this.clearTimeout();
  this.emit('abort');
  return this;
};

/**
 * Enable transmission of cookies with x-domain requests.
 *
 * Note that for this to work the origin must not be
 * using "Access-Control-Allow-Origin" with a wildcard,
 * and also must set "Access-Control-Allow-Credentials"
 * to "true".
 *
 * @api public
 */

RequestBase.prototype.withCredentials = function(){
  // This is browser-only functionality. Node side is no-op.
  this._withCredentials = true;
  return this;
};

/**
 * Set the max redirects to `n`. Does noting in browser XHR implementation.
 *
 * @param {Number} n
 * @return {Request} for chaining
 * @api public
 */

RequestBase.prototype.redirects = function(n){
  this._maxRedirects = n;
  return this;
};

/**
 * Convert to a plain javascript object (not JSON string) of scalar properties.
 * Note as this method is designed to return a useful non-this value,
 * it cannot be chained.
 *
 * @return {Object} describing method, url, and data of this request
 * @api public
 */

RequestBase.prototype.toJSON = function(){
  return {
    method: this.method,
    url: this.url,
    data: this._data,
    headers: this._header
  };
};


/**
 * Send `data` as the request body, defaulting the `.type()` to "json" when
 * an object is given.
 *
 * Examples:
 *
 *       // manual json
 *       request.post('/user')
 *         .type('json')
 *         .send('{"name":"tj"}')
 *         .end(callback)
 *
 *       // auto json
 *       request.post('/user')
 *         .send({ name: 'tj' })
 *         .end(callback)
 *
 *       // manual x-www-form-urlencoded
 *       request.post('/user')
 *         .type('form')
 *         .send('name=tj')
 *         .end(callback)
 *
 *       // auto x-www-form-urlencoded
 *       request.post('/user')
 *         .type('form')
 *         .send({ name: 'tj' })
 *         .end(callback)
 *
 *       // defaults to x-www-form-urlencoded
 *      request.post('/user')
 *        .send('name=tobi')
 *        .send('species=ferret')
 *        .end(callback)
 *
 * @param {String|Object} data
 * @return {Request} for chaining
 * @api public
 */

RequestBase.prototype.send = function(data){
  var isObj = isObject(data);
  var type = this._header['content-type'];

  if (isObj && !this._data) {
    if (Array.isArray(data)) {
      this._data = [];
    } else if (!this._isHost(data)) {
      this._data = {};
    }
  } else if (data && this._data && this._isHost(this._data)) {
    throw Error("Can't merge these send calls");
  }

  // merge
  if (isObj && isObject(this._data)) {
    for (var key in data) {
      this._data[key] = data[key];
    }
  } else if ('string' == typeof data) {
    // default to x-www-form-urlencoded
    if (!type) this.type('form');
    type = this._header['content-type'];
    if ('application/x-www-form-urlencoded' == type) {
      this._data = this._data
        ? this._data + '&' + data
        : data;
    } else {
      this._data = (this._data || '') + data;
    }
  } else {
    this._data = data;
  }

  if (!isObj || this._isHost(data)) return this;

  // default to json
  if (!type) this.type('json');
  return this;
};


/**
 * Sort `querystring` by the sort function
 *
 *
 * Examples:
 *
 *       // default order
 *       request.get('/user')
 *         .query('name=Nick')
 *         .query('search=Manny')
 *         .sortQuery()
 *         .end(callback)
 *
 *       // customized sort function
 *       request.get('/user')
 *         .query('name=Nick')
 *         .query('search=Manny')
 *         .sortQuery(function(a, b){
 *           return a.length - b.length;
 *         })
 *         .end(callback)
 *
 *
 * @param {Function} sort
 * @return {Request} for chaining
 * @api public
 */

RequestBase.prototype.sortQuery = function(sort) {
  // _sort default to true but otherwise can be a function or boolean
  this._sort = typeof sort === 'undefined' ? true : sort;
  return this;
};

},{"./is-object":382}],384:[function(require,module,exports){

var orig = document.title;

exports = module.exports = set;

function set(str) {
  var i = 1;
  var args = arguments;
  document.title = str.replace(/%[os]/g, function(_){
    switch (_) {
      case '%o':
        return orig;
      case '%s':
        return args[i++];
    }
  });
}

exports.reset = function(){
  set(orig);
};

},{}],385:[function(require,module,exports){
module.exports = toArray

function toArray(list, index) {
    var array = []

    index = index || 0

    for (var i = index || 0; i < list.length; i++) {
        array[i - index] = list[i]
    }

    return array
}

},{}],386:[function(require,module,exports){
(function (global){
/*! https://mths.be/wtf8 v1.0.0 by @mathias */
;(function(root) {

	// Detect free variables `exports`
	var freeExports = typeof exports == 'object' && exports;

	// Detect free variable `module`
	var freeModule = typeof module == 'object' && module &&
		module.exports == freeExports && module;

	// Detect free variable `global`, from Node.js or Browserified code,
	// and use it as `root`
	var freeGlobal = typeof global == 'object' && global;
	if (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal) {
		root = freeGlobal;
	}

	/*--------------------------------------------------------------------------*/

	var stringFromCharCode = String.fromCharCode;

	// Taken from https://mths.be/punycode
	function ucs2decode(string) {
		var output = [];
		var counter = 0;
		var length = string.length;
		var value;
		var extra;
		while (counter < length) {
			value = string.charCodeAt(counter++);
			if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
				// high surrogate, and there is a next character
				extra = string.charCodeAt(counter++);
				if ((extra & 0xFC00) == 0xDC00) { // low surrogate
					output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
				} else {
					// unmatched surrogate; only append this code unit, in case the next
					// code unit is the high surrogate of a surrogate pair
					output.push(value);
					counter--;
				}
			} else {
				output.push(value);
			}
		}
		return output;
	}

	// Taken from https://mths.be/punycode
	function ucs2encode(array) {
		var length = array.length;
		var index = -1;
		var value;
		var output = '';
		while (++index < length) {
			value = array[index];
			if (value > 0xFFFF) {
				value -= 0x10000;
				output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
				value = 0xDC00 | value & 0x3FF;
			}
			output += stringFromCharCode(value);
		}
		return output;
	}

	/*--------------------------------------------------------------------------*/

	function createByte(codePoint, shift) {
		return stringFromCharCode(((codePoint >> shift) & 0x3F) | 0x80);
	}

	function encodeCodePoint(codePoint) {
		if ((codePoint & 0xFFFFFF80) == 0) { // 1-byte sequence
			return stringFromCharCode(codePoint);
		}
		var symbol = '';
		if ((codePoint & 0xFFFFF800) == 0) { // 2-byte sequence
			symbol = stringFromCharCode(((codePoint >> 6) & 0x1F) | 0xC0);
		}
		else if ((codePoint & 0xFFFF0000) == 0) { // 3-byte sequence
			symbol = stringFromCharCode(((codePoint >> 12) & 0x0F) | 0xE0);
			symbol += createByte(codePoint, 6);
		}
		else if ((codePoint & 0xFFE00000) == 0) { // 4-byte sequence
			symbol = stringFromCharCode(((codePoint >> 18) & 0x07) | 0xF0);
			symbol += createByte(codePoint, 12);
			symbol += createByte(codePoint, 6);
		}
		symbol += stringFromCharCode((codePoint & 0x3F) | 0x80);
		return symbol;
	}

	function wtf8encode(string) {
		var codePoints = ucs2decode(string);
		var length = codePoints.length;
		var index = -1;
		var codePoint;
		var byteString = '';
		while (++index < length) {
			codePoint = codePoints[index];
			byteString += encodeCodePoint(codePoint);
		}
		return byteString;
	}

	/*--------------------------------------------------------------------------*/

	function readContinuationByte() {
		if (byteIndex >= byteCount) {
			throw Error('Invalid byte index');
		}

		var continuationByte = byteArray[byteIndex] & 0xFF;
		byteIndex++;

		if ((continuationByte & 0xC0) == 0x80) {
			return continuationByte & 0x3F;
		}

		// If we end up here, it’s not a continuation byte.
		throw Error('Invalid continuation byte');
	}

	function decodeSymbol() {
		var byte1;
		var byte2;
		var byte3;
		var byte4;
		var codePoint;

		if (byteIndex > byteCount) {
			throw Error('Invalid byte index');
		}

		if (byteIndex == byteCount) {
			return false;
		}

		// Read the first byte.
		byte1 = byteArray[byteIndex] & 0xFF;
		byteIndex++;

		// 1-byte sequence (no continuation bytes)
		if ((byte1 & 0x80) == 0) {
			return byte1;
		}

		// 2-byte sequence
		if ((byte1 & 0xE0) == 0xC0) {
			var byte2 = readContinuationByte();
			codePoint = ((byte1 & 0x1F) << 6) | byte2;
			if (codePoint >= 0x80) {
				return codePoint;
			} else {
				throw Error('Invalid continuation byte');
			}
		}

		// 3-byte sequence (may include unpaired surrogates)
		if ((byte1 & 0xF0) == 0xE0) {
			byte2 = readContinuationByte();
			byte3 = readContinuationByte();
			codePoint = ((byte1 & 0x0F) << 12) | (byte2 << 6) | byte3;
			if (codePoint >= 0x0800) {
				return codePoint;
			} else {
				throw Error('Invalid continuation byte');
			}
		}

		// 4-byte sequence
		if ((byte1 & 0xF8) == 0xF0) {
			byte2 = readContinuationByte();
			byte3 = readContinuationByte();
			byte4 = readContinuationByte();
			codePoint = ((byte1 & 0x0F) << 0x12) | (byte2 << 0x0C) |
				(byte3 << 0x06) | byte4;
			if (codePoint >= 0x010000 && codePoint <= 0x10FFFF) {
				return codePoint;
			}
		}

		throw Error('Invalid WTF-8 detected');
	}

	var byteArray;
	var byteCount;
	var byteIndex;
	function wtf8decode(byteString) {
		byteArray = ucs2decode(byteString);
		byteCount = byteArray.length;
		byteIndex = 0;
		var codePoints = [];
		var tmp;
		while ((tmp = decodeSymbol()) !== false) {
			codePoints.push(tmp);
		}
		return ucs2encode(codePoints);
	}

	/*--------------------------------------------------------------------------*/

	var wtf8 = {
		'version': '1.0.0',
		'encode': wtf8encode,
		'decode': wtf8decode
	};

	// Some AMD build optimizers, like r.js, check for specific condition patterns
	// like the following:
	if (
		typeof define == 'function' &&
		typeof define.amd == 'object' &&
		define.amd
	) {
		define(function() {
			return wtf8;
		});
	}	else if (freeExports && !freeExports.nodeType) {
		if (freeModule) { // in Node.js or RingoJS v0.8.0+
			freeModule.exports = wtf8;
		} else { // in Narwhal or RingoJS v0.7.0-
			var object = {};
			var hasOwnProperty = object.hasOwnProperty;
			for (var key in wtf8) {
				hasOwnProperty.call(wtf8, key) && (freeExports[key] = wtf8[key]);
			}
		}
	} else { // in Rhino or a web browser
		root.wtf8 = wtf8;
	}

}(this));

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],387:[function(require,module,exports){
'use strict';

var alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_'.split('')
  , length = 64
  , map = {}
  , seed = 0
  , i = 0
  , prev;

/**
 * Return a string representing the specified number.
 *
 * @param {Number} num The number to convert.
 * @returns {String} The string representation of the number.
 * @api public
 */
function encode(num) {
  var encoded = '';

  do {
    encoded = alphabet[num % length] + encoded;
    num = Math.floor(num / length);
  } while (num > 0);

  return encoded;
}

/**
 * Return the integer value specified by the given string.
 *
 * @param {String} str The string to convert.
 * @returns {Number} The integer value represented by the string.
 * @api public
 */
function decode(str) {
  var decoded = 0;

  for (i = 0; i < str.length; i++) {
    decoded = decoded * length + map[str.charAt(i)];
  }

  return decoded;
}

/**
 * Yeast: A tiny growing id generator.
 *
 * @returns {String} A unique id.
 * @api public
 */
function yeast() {
  var now = encode(+new Date());

  if (now !== prev) return seed = 0, prev = now;
  return now +'.'+ encode(seed++);
}

//
// Map each character to its index.
//
for (; i < length; i++) map[alphabet[i]] = i;

//
// Expose the `yeast`, `encode` and `decode` functions.
//
yeast.encode = encode;
yeast.decode = decode;
module.exports = yeast;

},{}],388:[function(require,module,exports){
var bel = require('bel') // turns template tag into DOM elements
var morphdom = require('morphdom') // efficiently diffs + morphs two DOM elements
var defaultEvents = require('./update-events.js') // default events to be copied when dom elements update

module.exports = bel

// TODO move this + defaultEvents to a new module once we receive more feedback
module.exports.update = function (fromNode, toNode, opts) {
  if (!opts) opts = {}
  if (opts.events !== false) {
    if (!opts.onBeforeElUpdated) opts.onBeforeElUpdated = copier
  }

  return morphdom(fromNode, toNode, opts)

  // morphdom only copies attributes. we decided we also wanted to copy events
  // that can be set via attributes
  function copier (f, t) {
    // copy events:
    var events = opts.events || defaultEvents
    for (var i = 0; i < events.length; i++) {
      var ev = events[i]
      if (t[ev]) { // if new element has a whitelisted attribute
        f[ev] = t[ev] // update existing element
      } else if (f[ev]) { // if existing element has it and new one doesnt
        f[ev] = undefined // remove it from existing element
      }
    }
    // copy values for form elements
    if ((f.nodeName === 'INPUT' && f.type !== 'file') || f.nodeName === 'SELECT') {
      if (t.getAttribute('value') === null) t.value = f.value
    } else if (f.nodeName === 'TEXTAREA') {
      if (t.getAttribute('value') === null) f.value = t.value
    }
  }
}

},{"./update-events.js":389,"bel":31,"morphdom":358}],389:[function(require,module,exports){
module.exports = [
  // attribute events (can be set with attributes)
  'onclick',
  'ondblclick',
  'onmousedown',
  'onmouseup',
  'onmouseover',
  'onmousemove',
  'onmouseout',
  'ondragstart',
  'ondrag',
  'ondragenter',
  'ondragleave',
  'ondragover',
  'ondrop',
  'ondragend',
  'onkeydown',
  'onkeypress',
  'onkeyup',
  'onunload',
  'onabort',
  'onerror',
  'onresize',
  'onscroll',
  'onselect',
  'onchange',
  'onsubmit',
  'onreset',
  'onfocus',
  'onblur',
  'oninput',
  // other common events
  'oncontextmenu',
  'onfocusin',
  'onfocusout'
]

},{}],390:[function(require,module,exports){
'use strict';

var _templateObject = _taggedTemplateLiteral(['<div class="ano">\n  <div id="fb', '" class="col m12 comparativo-ano tab-content-datos fb', '">\n    <h4 style="padding:20px;text-align:center;">A\xF1o ', '</h4>\n      <div class="cont-datos-anos">\n        <div class="row" style="margin-bottom: 30px !important;">\n          <div class="col m8 cont-ano-border" >\n            <div class="cont-info-ano cont-total-fans-ano">\n              <div class="cont-titulo">\n                <i class="fa fa-users" aria-hidden="true"></i>\n                <div class="con-der-titulo">\n                  <h5 style="margin-bottom: 0;">Fans Totales</h5>\n                  <p id="count-number" class="timer count-title" data-to="', '" data-speed="1500" style="color: rgb(59, 178, 115);"></p>\n                </div>\n              </div>\n              ', '\n            </div>\n          </div>\n          <div class="col m4">\n            <div class="col m12 cont-ano-border">\n              <div class="cont-info-ano">\n                <div style="padding: 0 40px;">\n                  <h5 style="margin-bottom: 0;"><i class="fa fa-thumbs-o-up" aria-hidden="true"></i>Fans Nuevos</h5>\n                  <small>(Promedio por mes)</small>\n                  <p id="count-number" class="timer count-title" data-to="', '" data-speed="1500" style="color: rgb(59, 178, 115);"></p>\n                </div>\n                ', '\n              </div>\n            </div>\n\n          </div>\n        </div>\n        <div class="row" style="margin-bottom: 30px !important;">\n          <div class="col m4 cont-ano-border">\n            <div class="cont-info-ano">\n              <div style="padding: 0 40px;">\n                <h5 style="margin-bottom: 0;"><i class="fa fa-thumbs-o-down" aria-hidden="true"></i>No me Gusta</h5>\n                <small>(Promedio por mes)</small>\n                <p id="count-number" class="timer count-title" data-to="', '" data-speed="1500" style="color: #f39237;"></p>\n              </div>\n              ', '\n            </div>\n          </div>\n          <div class="col m4 cont-ano-border">\n            <div class="cont-info-ano">\n              <div style="padding: 0 40px;">\n                <h5 style="margin-bottom: 0;"><i class="fa fa-exchange" aria-hidden="true"></i>Impresi\xF3n</h5>\n                <small>(Promedio por mes)</small>\n                <p id="count-number" class="timer count-title" data-to="', '" data-speed="1500" style="color: #e1bc29;"></p>\n              </div>\n              ', '\n            </div>\n          </div>\n          <div class="col m4 cont-ano-border">\n            <div class="cont-info-ano">\n              <div style="padding: 0 40px;">\n                <h5 style="margin-bottom: 0;"><i class="fa fa-user" aria-hidden="true"></i>Usuarios Activos</h5>\n                <small>(Promedio por mes)</small>\n                <p id="count-number" class="timer count-title" data-to="', '" data-speed="1500" style="color: rgb(83, 168, 195);">1913</p>\n              </div>\n              ', '\n            </div>\n          </div>\n        </div>\n        <div class="row" style="display:flex;margin-bottom: 30px !important;">\n          <div class="cont-ano-border">\n            <div class="cont-info-ano cont-tortas">\n              <div class="datos-tortas">\n                <div class="contTitleTorta">\n                  <h5><i class="fa fa-venus-mars" aria-hidden="true"></i>G\xE9nero</h5>\n                </div>\n                <div class="contLabelsTortas">\n                  <div class="cont-labels-torta">\n                    <h6 class="color-mujer"><i class="fa fa-venus" aria-hidden="true"></i> Mujeres</h6>\n                    <p class="color-mujer"><i class="fa fa-square" ></i> ', '%</p>\n                  </div>\n                  <div class="cont-labels-torta">\n                    <h6 class="color-hombre"><i class="fa fa-mars" aria-hidden="true"></i> Hombres</h6>\n                    <p class="color-hombre"><i class="fa fa-square" ></i> ', '% </p>\n                  </div>\n                </div>\n              </div>\n              ', '\n            </div>\n          </div>\n          <div class="cont-ano-border">\n            <div class="cont-info-ano cont-tortas">\n              <div class="datos-tortas">\n                <div class="contTitleTorta">\n                  <h5><i class="fa fa-calendar" aria-hidden="true"></i>Edades Principales</h5>\n                </div>\n                <div class="contLabelsTortas">\n                  <p class="color-edadp"><i class="fa fa-square" ></i> 25 - 34 A\xF1os: ', '%</p>\n                  <p class="color-edads"><i class="fa fa-square" ></i> Otros: ', '% </p>\n                </div>\n               </div>\n               ', '\n            </div>\n          </div>\n          <div class="cont-ano-border">\n            <div class="cont-info-ano cont-tortas">\n              <div class="datos-tortas">\n                <div class="contTitleTorta">\n                  <h5><i class="fa fa-language" aria-hidden="true"></i>Principales idiomas</h5>\n                </div>\n                <div class="contLabelsTortas">\n                 <p class="color-idiomap"><i class="fa fa-square" ></i> Espa\xF1ol: ', '%</p>\n                 <p class="color-idiomas"><i class="fa fa-square" ></i> Otros: ', '%</p>\n                </div>\n               </div>\n               ', '\n            </div>\n          </div>\n          <div class="cont-ano-border">\n            <div class="cont-info-ano cont-tortas">\n             <div class="datos-tortas">\n              <div class="contTitleTorta">\n                <h5><i class="fa fa-globe" aria-hidden="true"></i>Principales Pa\xEDses</h5>\n              </div>\n              <div class="contLabelsTortas">\n               <p class="color-paisp"><i class="fa fa-square" ></i> Colombia: ', '%</p>\n               <p class="color-paiss"><i class="fa fa-square" ></i> USA: ', '%</p>\n               <p class="color-paiso"><i class="fa fa-square" ></i> Otros: ', '%</p>\n              </div>\n             </div>\n             <div class="cont-canvas">\n               ', '\n             </div>\n            </div>\n          </div>\n          <div class="cont-ano-border">\n            <div class="cont-info-ano cont-tortas">\n              <div class="datos-tortas">\n                <div class="contTitleTorta">\n                  <h5><i class="fa fa-map-marker" aria-hidden="true"></i>Principales Ciudades</h5>\n                </div>\n                <div class="contLabelsTortas">\n                  <p class="color-ciudadp"><i class="fa fa-square" ></i> Medell\xEDn: ', '%</p>\n                  <p class="color-ciudads"><i class="fa fa-square" ></i> Bogot\xE1: ', '%</p>\n                  <p class="color-ciudado"><i class="fa fa-square" ></i> Otros: ', '%</p>\n                </div>\n              </div>\n               <div class="cont-canvas">\n                 ', '\n               </div>\n            </div>\n          </div>\n        </div>\n\n      </div>\n  </div>\n  </div>'], ['<div class="ano">\n  <div id="fb', '" class="col m12 comparativo-ano tab-content-datos fb', '">\n    <h4 style="padding:20px;text-align:center;">A\xF1o ', '</h4>\n      <div class="cont-datos-anos">\n        <div class="row" style="margin-bottom: 30px !important;">\n          <div class="col m8 cont-ano-border" >\n            <div class="cont-info-ano cont-total-fans-ano">\n              <div class="cont-titulo">\n                <i class="fa fa-users" aria-hidden="true"></i>\n                <div class="con-der-titulo">\n                  <h5 style="margin-bottom: 0;">Fans Totales</h5>\n                  <p id="count-number" class="timer count-title" data-to="', '" data-speed="1500" style="color: rgb(59, 178, 115);"></p>\n                </div>\n              </div>\n              ', '\n            </div>\n          </div>\n          <div class="col m4">\n            <div class="col m12 cont-ano-border">\n              <div class="cont-info-ano">\n                <div style="padding: 0 40px;">\n                  <h5 style="margin-bottom: 0;"><i class="fa fa-thumbs-o-up" aria-hidden="true"></i>Fans Nuevos</h5>\n                  <small>(Promedio por mes)</small>\n                  <p id="count-number" class="timer count-title" data-to="', '" data-speed="1500" style="color: rgb(59, 178, 115);"></p>\n                </div>\n                ', '\n              </div>\n            </div>\n\n          </div>\n        </div>\n        <div class="row" style="margin-bottom: 30px !important;">\n          <div class="col m4 cont-ano-border">\n            <div class="cont-info-ano">\n              <div style="padding: 0 40px;">\n                <h5 style="margin-bottom: 0;"><i class="fa fa-thumbs-o-down" aria-hidden="true"></i>No me Gusta</h5>\n                <small>(Promedio por mes)</small>\n                <p id="count-number" class="timer count-title" data-to="', '" data-speed="1500" style="color: #f39237;"></p>\n              </div>\n              ', '\n            </div>\n          </div>\n          <div class="col m4 cont-ano-border">\n            <div class="cont-info-ano">\n              <div style="padding: 0 40px;">\n                <h5 style="margin-bottom: 0;"><i class="fa fa-exchange" aria-hidden="true"></i>Impresi\xF3n</h5>\n                <small>(Promedio por mes)</small>\n                <p id="count-number" class="timer count-title" data-to="', '" data-speed="1500" style="color: #e1bc29;"></p>\n              </div>\n              ', '\n            </div>\n          </div>\n          <div class="col m4 cont-ano-border">\n            <div class="cont-info-ano">\n              <div style="padding: 0 40px;">\n                <h5 style="margin-bottom: 0;"><i class="fa fa-user" aria-hidden="true"></i>Usuarios Activos</h5>\n                <small>(Promedio por mes)</small>\n                <p id="count-number" class="timer count-title" data-to="', '" data-speed="1500" style="color: rgb(83, 168, 195);">1913</p>\n              </div>\n              ', '\n            </div>\n          </div>\n        </div>\n        <div class="row" style="display:flex;margin-bottom: 30px !important;">\n          <div class="cont-ano-border">\n            <div class="cont-info-ano cont-tortas">\n              <div class="datos-tortas">\n                <div class="contTitleTorta">\n                  <h5><i class="fa fa-venus-mars" aria-hidden="true"></i>G\xE9nero</h5>\n                </div>\n                <div class="contLabelsTortas">\n                  <div class="cont-labels-torta">\n                    <h6 class="color-mujer"><i class="fa fa-venus" aria-hidden="true"></i> Mujeres</h6>\n                    <p class="color-mujer"><i class="fa fa-square" ></i> ', '%</p>\n                  </div>\n                  <div class="cont-labels-torta">\n                    <h6 class="color-hombre"><i class="fa fa-mars" aria-hidden="true"></i> Hombres</h6>\n                    <p class="color-hombre"><i class="fa fa-square" ></i> ', '% </p>\n                  </div>\n                </div>\n              </div>\n              ', '\n            </div>\n          </div>\n          <div class="cont-ano-border">\n            <div class="cont-info-ano cont-tortas">\n              <div class="datos-tortas">\n                <div class="contTitleTorta">\n                  <h5><i class="fa fa-calendar" aria-hidden="true"></i>Edades Principales</h5>\n                </div>\n                <div class="contLabelsTortas">\n                  <p class="color-edadp"><i class="fa fa-square" ></i> 25 - 34 A\xF1os: ', '%</p>\n                  <p class="color-edads"><i class="fa fa-square" ></i> Otros: ', '% </p>\n                </div>\n               </div>\n               ', '\n            </div>\n          </div>\n          <div class="cont-ano-border">\n            <div class="cont-info-ano cont-tortas">\n              <div class="datos-tortas">\n                <div class="contTitleTorta">\n                  <h5><i class="fa fa-language" aria-hidden="true"></i>Principales idiomas</h5>\n                </div>\n                <div class="contLabelsTortas">\n                 <p class="color-idiomap"><i class="fa fa-square" ></i> Espa\xF1ol: ', '%</p>\n                 <p class="color-idiomas"><i class="fa fa-square" ></i> Otros: ', '%</p>\n                </div>\n               </div>\n               ', '\n            </div>\n          </div>\n          <div class="cont-ano-border">\n            <div class="cont-info-ano cont-tortas">\n             <div class="datos-tortas">\n              <div class="contTitleTorta">\n                <h5><i class="fa fa-globe" aria-hidden="true"></i>Principales Pa\xEDses</h5>\n              </div>\n              <div class="contLabelsTortas">\n               <p class="color-paisp"><i class="fa fa-square" ></i> Colombia: ', '%</p>\n               <p class="color-paiss"><i class="fa fa-square" ></i> USA: ', '%</p>\n               <p class="color-paiso"><i class="fa fa-square" ></i> Otros: ', '%</p>\n              </div>\n             </div>\n             <div class="cont-canvas">\n               ', '\n             </div>\n            </div>\n          </div>\n          <div class="cont-ano-border">\n            <div class="cont-info-ano cont-tortas">\n              <div class="datos-tortas">\n                <div class="contTitleTorta">\n                  <h5><i class="fa fa-map-marker" aria-hidden="true"></i>Principales Ciudades</h5>\n                </div>\n                <div class="contLabelsTortas">\n                  <p class="color-ciudadp"><i class="fa fa-square" ></i> Medell\xEDn: ', '%</p>\n                  <p class="color-ciudads"><i class="fa fa-square" ></i> Bogot\xE1: ', '%</p>\n                  <p class="color-ciudado"><i class="fa fa-square" ></i> Otros: ', '%</p>\n                </div>\n              </div>\n               <div class="cont-canvas">\n                 ', '\n               </div>\n            </div>\n          </div>\n        </div>\n\n      </div>\n  </div>\n  </div>']),
    _templateObject2 = _taggedTemplateLiteral(['<div>\n    <canvas id="datos', 'ano" width="720" height="300"></canvas>\n    <script>\n      if(\'', '\' == \'year\'){\n        function chartfantotal(){\n\n            var LineChart = {\n              labels: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],\n              datasets: [{\n                fillColor: "rgba(83, 168, 195, 0.52)",\n                strokeColor: "rgb(83, 168, 195)",\n                pointColor: "rgba(220,220,220,1)",\n                pointStrokeColor: "#fff",\n                data: [', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ']\n              }]\n            }\n          var ctx = document.getElementById("datos', 'ano").getContext("2d");\n          var myLineChart = new Chart(ctx).Line(LineChart, {scaleFontSize : 13, scaleFontColor : "#000000"});\n        }\n      }\n      chartfantotal();\n    </script>\n  </div>'], ['<div>\n    <canvas id="datos', 'ano" width="720" height="300"></canvas>\n    <script>\n      if(\'', '\' == \'year\'){\n        function chartfantotal(){\n\n            var LineChart = {\n              labels: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],\n              datasets: [{\n                fillColor: "rgba(83, 168, 195, 0.52)",\n                strokeColor: "rgb(83, 168, 195)",\n                pointColor: "rgba(220,220,220,1)",\n                pointStrokeColor: "#fff",\n                data: [', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ']\n              }]\n            }\n          var ctx = document.getElementById("datos', 'ano").getContext("2d");\n          var myLineChart = new Chart(ctx).Line(LineChart, {scaleFontSize : 13, scaleFontColor : "#000000"});\n        }\n      }\n      chartfantotal();\n    </script>\n  </div>']),
    _templateObject3 = _taggedTemplateLiteral(['<div>\n    <canvas id="newfans', 'ano" width="380" height="300"></canvas>\n    <script>\n      if(\'', '\' == \'year\'){\n        function chartfannew(){\n\n            var BarChart = {\n             labels: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],\n             datasets: [{\n             fillColor: "rgba(59, 178, 115, 0.52)",\n             strokeColor: "rgb(59, 178, 115)",\n             data: [', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ']\n             }]\n            }\n          var ctx = document.getElementById("newfans', 'ano").getContext("2d");\n          var myBarChart = new Chart(ctx).Bar(BarChart, {scaleFontSize : 13, scaleFontColor : "#000000"});\n        }\n      }\n      chartfannew();\n    </script>\n  </div>'], ['<div>\n    <canvas id="newfans', 'ano" width="380" height="300"></canvas>\n    <script>\n      if(\'', '\' == \'year\'){\n        function chartfannew(){\n\n            var BarChart = {\n             labels: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],\n             datasets: [{\n             fillColor: "rgba(59, 178, 115, 0.52)",\n             strokeColor: "rgb(59, 178, 115)",\n             data: [', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ']\n             }]\n            }\n          var ctx = document.getElementById("newfans', 'ano").getContext("2d");\n          var myBarChart = new Chart(ctx).Bar(BarChart, {scaleFontSize : 13, scaleFontColor : "#000000"});\n        }\n      }\n      chartfannew();\n    </script>\n  </div>']),
    _templateObject4 = _taggedTemplateLiteral(['<div>\n    <canvas id="nolikes', 'ano" width="380" height="300"></canvas>\n    <script>\n      if(\'', '\' == \'year\'){\n        function chartnolikes(){\n\n            var BarChart = {\n             labels: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],\n             datasets: [{\n             fillColor: "rgba(243, 146, 55, 0.52)",\n             strokeColor: "rgb(243, 146, 55)",\n             data: [', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ']\n             }]\n            }\n          var ctx = document.getElementById("nolikes', 'ano").getContext("2d");\n          var myBarChart = new Chart(ctx).Bar(BarChart, {scaleFontSize : 13, scaleFontColor : "#000000"});\n        }\n      }\n      chartnolikes();\n    </script>\n  </div>'], ['<div>\n    <canvas id="nolikes', 'ano" width="380" height="300"></canvas>\n    <script>\n      if(\'', '\' == \'year\'){\n        function chartnolikes(){\n\n            var BarChart = {\n             labels: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],\n             datasets: [{\n             fillColor: "rgba(243, 146, 55, 0.52)",\n             strokeColor: "rgb(243, 146, 55)",\n             data: [', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ']\n             }]\n            }\n          var ctx = document.getElementById("nolikes', 'ano").getContext("2d");\n          var myBarChart = new Chart(ctx).Bar(BarChart, {scaleFontSize : 13, scaleFontColor : "#000000"});\n        }\n      }\n      chartnolikes();\n    </script>\n  </div>']),
    _templateObject5 = _taggedTemplateLiteral(['<div>\n    <canvas id="impresion', 'ano" width="380" height="300"></canvas>\n    <script>\n      if(\'', '\' == \'year\'){\n        function chartprints(){\n          var LineChart = {\n           labels: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],\n           datasets: [{\n           fillColor: "rgba(225, 188, 41, 0.52)",\n           strokeColor: "rgb(225, 188, 41)",\n           pointColor: "rgba(220,220,220,1)",\n           pointStrokeColor: "#fff",\n           data: [', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ']\n           }]\n          }\n\n          var ctx = document.getElementById("impresion', 'ano").getContext("2d");\n          var myLineChart = new Chart(ctx).Line(LineChart, {scaleFontSize : 13, scaleFontColor : "#000000"});\n        }\n      }\n      chartprints();\n    </script>\n  </div>'], ['<div>\n    <canvas id="impresion', 'ano" width="380" height="300"></canvas>\n    <script>\n      if(\'', '\' == \'year\'){\n        function chartprints(){\n          var LineChart = {\n           labels: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],\n           datasets: [{\n           fillColor: "rgba(225, 188, 41, 0.52)",\n           strokeColor: "rgb(225, 188, 41)",\n           pointColor: "rgba(220,220,220,1)",\n           pointStrokeColor: "#fff",\n           data: [', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ']\n           }]\n          }\n\n          var ctx = document.getElementById("impresion', 'ano").getContext("2d");\n          var myLineChart = new Chart(ctx).Line(LineChart, {scaleFontSize : 13, scaleFontColor : "#000000"});\n        }\n      }\n      chartprints();\n    </script>\n  </div>']),
    _templateObject6 = _taggedTemplateLiteral(['<div>\n    <canvas id="usuariosact', 'ano" width="380" height="300"></canvas>\n    <script>\n      if(\'', '\' == \'year\'){\n        function chartactiveusers(){\n\n          var LineChart = {\n           labels: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],\n           datasets: [{\n           fillColor: "rgba(83, 168, 195, 0.52)",\n           strokeColor: "rgb(83, 168, 195)",\n           pointColor: "rgba(220,220,220,1)",\n           pointStrokeColor: "#fff",\n           data: [', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ']\n           }]\n          }\n\n          var ctx = document.getElementById("usuariosact', 'ano").getContext("2d");\n          var myLineChart = new Chart(ctx).Line(LineChart, {scaleFontSize : 13, scaleFontColor : "#000000"});\n        }\n      }\n      chartactiveusers();\n    </script>\n  </div>'], ['<div>\n    <canvas id="usuariosact', 'ano" width="380" height="300"></canvas>\n    <script>\n      if(\'', '\' == \'year\'){\n        function chartactiveusers(){\n\n          var LineChart = {\n           labels: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],\n           datasets: [{\n           fillColor: "rgba(83, 168, 195, 0.52)",\n           strokeColor: "rgb(83, 168, 195)",\n           pointColor: "rgba(220,220,220,1)",\n           pointStrokeColor: "#fff",\n           data: [', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ']\n           }]\n          }\n\n          var ctx = document.getElementById("usuariosact', 'ano").getContext("2d");\n          var myLineChart = new Chart(ctx).Line(LineChart, {scaleFontSize : 13, scaleFontColor : "#000000"});\n        }\n      }\n      chartactiveusers();\n    </script>\n  </div>']),
    _templateObject7 = _taggedTemplateLiteral(['<div>\n    <canvas id="genero', '" width="150" height="150"></canvas>\n    <script>\n      if(\'', '\' == \'year\'){\n        function chartgenre(){\n          var generoData = [\n          \t\t\t\t{\n          \t\t\t\t\tvalue: ', ',\n          \t\t\t\t\tcolor: "#F39237",\n          \t\t\t\t\thighlight: "rgba(243,146,55,0.8)",\n          \t\t\t\t\tlabel: "Mujeres"},\n          \t\t\t\t{\n          \t\t\t\t\tvalue: ', ',\n          \t\t\t\t\tcolor: "#53A8C3",\n          \t\t\t\t\thighlight: "rgba(83,168,195,0.80)",\n          \t\t\t\t\tlabel: "Hombres"\n          \t\t\t\t}\n          \t\t\t];\n\n          var ctx = document.getElementById("genero', '").getContext("2d");\n          window.myPie = new Chart(ctx).Pie(generoData);\n        }\n      }\n      chartgenre();\n    </script>\n  </div>'], ['<div>\n    <canvas id="genero', '" width="150" height="150"></canvas>\n    <script>\n      if(\'', '\' == \'year\'){\n        function chartgenre(){\n          var generoData = [\n          \t\t\t\t{\n          \t\t\t\t\tvalue: ', ',\n          \t\t\t\t\tcolor: "#F39237",\n          \t\t\t\t\thighlight: "rgba(243,146,55,0.8)",\n          \t\t\t\t\tlabel: "Mujeres"},\n          \t\t\t\t{\n          \t\t\t\t\tvalue: ', ',\n          \t\t\t\t\tcolor: "#53A8C3",\n          \t\t\t\t\thighlight: "rgba(83,168,195,0.80)",\n          \t\t\t\t\tlabel: "Hombres"\n          \t\t\t\t}\n          \t\t\t];\n\n          var ctx = document.getElementById("genero', '").getContext("2d");\n          window.myPie = new Chart(ctx).Pie(generoData);\n        }\n      }\n      chartgenre();\n    </script>\n  </div>']),
    _templateObject8 = _taggedTemplateLiteral(['<div>\n    <canvas id="edad', '" width="150" height="150"></canvas>\n    <script>\n      if(\'', '\' == \'year\'){\n        function chartage(){\n          var edadData = [\n          \t\t\t\t{\n          \t\t\t\t\tvalue: ', ',\n          \t\t\t\t\tcolor:"#53A8C3",\n          \t\t\t\t\thighlight: "rgba(83,168,195,0.80)",\n          \t\t\t\t\tlabel: "25 - 34 A\xF1os"},\n          \t\t\t\t{\n          \t\t\t\t\tvalue: ', ',\n          \t\t\t\t\tcolor: "#3BB273",\n          \t\t\t\t\thighlight: "rgba(59,178,115,0.8)",\n          \t\t\t\t\tlabel: "Otros"\n          \t\t\t\t}\n          \t\t\t];\n\n          var ctx = document.getElementById("edad', '").getContext("2d");\n          window.myPie = new Chart(ctx).Pie(edadData);\n        }\n      }\n      chartage();\n    </script>\n  </div>'], ['<div>\n    <canvas id="edad', '" width="150" height="150"></canvas>\n    <script>\n      if(\'', '\' == \'year\'){\n        function chartage(){\n          var edadData = [\n          \t\t\t\t{\n          \t\t\t\t\tvalue: ', ',\n          \t\t\t\t\tcolor:"#53A8C3",\n          \t\t\t\t\thighlight: "rgba(83,168,195,0.80)",\n          \t\t\t\t\tlabel: "25 - 34 A\xF1os"},\n          \t\t\t\t{\n          \t\t\t\t\tvalue: ', ',\n          \t\t\t\t\tcolor: "#3BB273",\n          \t\t\t\t\thighlight: "rgba(59,178,115,0.8)",\n          \t\t\t\t\tlabel: "Otros"\n          \t\t\t\t}\n          \t\t\t];\n\n          var ctx = document.getElementById("edad', '").getContext("2d");\n          window.myPie = new Chart(ctx).Pie(edadData);\n        }\n      }\n      chartage();\n    </script>\n  </div>']),
    _templateObject9 = _taggedTemplateLiteral(['<div>\n    <canvas id="idioma', '" width="150" height="150"></canvas>\n    <script>\n      if(\'', '\' == \'year\'){\n        function chartlanguage(){\n          var idiomaData = [\n         \t\t\t\t{\n         \t\t\t\t\tvalue: ', ',\n         \t\t\t\t\tcolor:"#F39237",\n         \t\t\t\t\thighlight: "rgba(243,146,55,0.8)",\n         \t\t\t\t\tlabel: "Espa\xF1ol"},\n         \t\t\t\t{\n         \t\t\t\t\tvalue: ', ',\n         \t\t\t\t\tcolor: "#3BB273",\n         \t\t\t\t\thighlight: "rgba(59,178,115,0.8)",\n         \t\t\t\t\tlabel: "Otros"\n         \t\t\t\t}\n         \t\t\t];\n\n          var ctx = document.getElementById("idioma', '").getContext("2d");\n          window.myPie = new Chart(ctx).Pie(idiomaData);\n        }\n      }\n      chartlanguage();\n    </script>\n  </div>'], ['<div>\n    <canvas id="idioma', '" width="150" height="150"></canvas>\n    <script>\n      if(\'', '\' == \'year\'){\n        function chartlanguage(){\n          var idiomaData = [\n         \t\t\t\t{\n         \t\t\t\t\tvalue: ', ',\n         \t\t\t\t\tcolor:"#F39237",\n         \t\t\t\t\thighlight: "rgba(243,146,55,0.8)",\n         \t\t\t\t\tlabel: "Espa\xF1ol"},\n         \t\t\t\t{\n         \t\t\t\t\tvalue: ', ',\n         \t\t\t\t\tcolor: "#3BB273",\n         \t\t\t\t\thighlight: "rgba(59,178,115,0.8)",\n         \t\t\t\t\tlabel: "Otros"\n         \t\t\t\t}\n         \t\t\t];\n\n          var ctx = document.getElementById("idioma', '").getContext("2d");\n          window.myPie = new Chart(ctx).Pie(idiomaData);\n        }\n      }\n      chartlanguage();\n    </script>\n  </div>']),
    _templateObject10 = _taggedTemplateLiteral(['<div>\n    <canvas id="pais', '" width="150" height="150"></canvas>\n    <script>\n      if(\'', '\' == \'year\'){\n        function chartcountry(){\n          var paisData = [\n         \t\t\t\t{\n         \t\t\t\t\tvalue: ', ',\n         \t\t\t\t\tcolor:"#E1BC29",\n         \t\t\t\t\thighlight: "rgba(225,188,41,0.80)",\n         \t\t\t\t\tlabel: "Colombia"},\n         \t\t\t\t{\n         \t\t\t\t\tvalue: ', ',\n         \t\t\t\t\tcolor: "#53A8C3",\n         \t\t\t\t\thighlight: "rgba(83,168,195,0.80)",\n         \t\t\t\t\tlabel: "USA"},\n         \t\t\t\t{\n         \t\t\t\t\tvalue: ', ',\n         \t\t\t\t\tcolor: "#3bb273",\n         \t\t\t\t\thighlight: "rgba(59,178,115,0.8)",\n         \t\t\t\t\tlabel: "Otros"\n         \t\t\t\t}\n         \t\t\t];\n\n          var ctx = document.getElementById("pais', '").getContext("2d");\n          window.myPie = new Chart(ctx).Pie(paisData);\n        }\n      }\n      chartcountry();\n    </script>\n  </div>'], ['<div>\n    <canvas id="pais', '" width="150" height="150"></canvas>\n    <script>\n      if(\'', '\' == \'year\'){\n        function chartcountry(){\n          var paisData = [\n         \t\t\t\t{\n         \t\t\t\t\tvalue: ', ',\n         \t\t\t\t\tcolor:"#E1BC29",\n         \t\t\t\t\thighlight: "rgba(225,188,41,0.80)",\n         \t\t\t\t\tlabel: "Colombia"},\n         \t\t\t\t{\n         \t\t\t\t\tvalue: ', ',\n         \t\t\t\t\tcolor: "#53A8C3",\n         \t\t\t\t\thighlight: "rgba(83,168,195,0.80)",\n         \t\t\t\t\tlabel: "USA"},\n         \t\t\t\t{\n         \t\t\t\t\tvalue: ', ',\n         \t\t\t\t\tcolor: "#3bb273",\n         \t\t\t\t\thighlight: "rgba(59,178,115,0.8)",\n         \t\t\t\t\tlabel: "Otros"\n         \t\t\t\t}\n         \t\t\t];\n\n          var ctx = document.getElementById("pais', '").getContext("2d");\n          window.myPie = new Chart(ctx).Pie(paisData);\n        }\n      }\n      chartcountry();\n    </script>\n  </div>']),
    _templateObject11 = _taggedTemplateLiteral(['<div>\n    <canvas id="ciudades', '" width="150" height="150"></canvas>\n    <script>\n      if(\'', '\' == \'year\'){\n        function chartcity(){\n          var ciudadesData = [\n        \t\t\t\t{\n        \t\t\t\t\tvalue: ', ',\n        \t\t\t\t\tcolor:"#3BB273",\n        \t\t\t\t\thighlight: "rgba(59,178,115,0.8)",\n        \t\t\t\t\tlabel: "Medell\xEDn"},\n        \t\t\t\t{\n        \t\t\t\t\tvalue: ', ',\n        \t\t\t\t\tcolor:"#E1BC29",\n        \t\t\t\t\thighlight: "rgba(225,188,41,0.80)",\n        \t\t\t\t\tlabel: "Bogot\xE1"},\n        \t\t\t\t{\n        \t\t\t\t\tvalue: ', ',\n        \t\t\t\t\tcolor: "#53A8C3",\n        \t\t\t\t\thighlight: "rgba(83,168,195,0.80)",\n        \t\t\t\t\tlabel: "Otros"\n        \t\t\t\t}\n        \t\t\t];\n\n          var ctx = document.getElementById("ciudades', '").getContext("2d");\n          window.myPie = new Chart(ctx).Pie(ciudadesData);\n        }\n      }\n      chartcity();\n    </script>\n  </div>'], ['<div>\n    <canvas id="ciudades', '" width="150" height="150"></canvas>\n    <script>\n      if(\'', '\' == \'year\'){\n        function chartcity(){\n          var ciudadesData = [\n        \t\t\t\t{\n        \t\t\t\t\tvalue: ', ',\n        \t\t\t\t\tcolor:"#3BB273",\n        \t\t\t\t\thighlight: "rgba(59,178,115,0.8)",\n        \t\t\t\t\tlabel: "Medell\xEDn"},\n        \t\t\t\t{\n        \t\t\t\t\tvalue: ', ',\n        \t\t\t\t\tcolor:"#E1BC29",\n        \t\t\t\t\thighlight: "rgba(225,188,41,0.80)",\n        \t\t\t\t\tlabel: "Bogot\xE1"},\n        \t\t\t\t{\n        \t\t\t\t\tvalue: ', ',\n        \t\t\t\t\tcolor: "#53A8C3",\n        \t\t\t\t\thighlight: "rgba(83,168,195,0.80)",\n        \t\t\t\t\tlabel: "Otros"\n        \t\t\t\t}\n        \t\t\t];\n\n          var ctx = document.getElementById("ciudades', '").getContext("2d");\n          window.myPie = new Chart(ctx).Pie(ciudadesData);\n        }\n      }\n      chartcity();\n    </script>\n  </div>']);

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var yo = require('yo-yo');

module.exports = function (dato) {
  return yo(_templateObject, dato.year, dato.year, dato.year, dato.allfansy.total, genechartfantotal(dato), dato.newfansy.total, genechartfannew(dato), dato.nolikesy.total, genechartnolikes(dato), dato.printsy.total, genechartprints(dato), dato.activeusersy.total, genechartactiveusers(dato), dato.genre.women, dato.genre.men, genechartgenre(dato), dato.age.ppal, dato.age.others, genechartage(dato), dato.language.ppal, dato.language.others, genechartlanguage(dato), dato.country.ppal, dato.country.sec, dato.country.others, genechartcountry(dato), dato.city.ppal, dato.city.sec, dato.city.others, genechartcity(dato));

  function genechartfantotal(dato) {
    return yo(_templateObject2, dato.year, dato.type, dato.allfansy.months.enero, dato.allfansy.months.febrero, dato.allfansy.months.marzo, dato.allfansy.months.abril, dato.allfansy.months.mayo, dato.allfansy.months.junio, dato.allfansy.months.julio, dato.allfansy.months.agosto, dato.allfansy.months.septiembre, dato.allfansy.months.octubre, dato.allfansy.months.noviembre, dato.allfansy.months.diciembre, dato.year);
  }

  function genechartfannew(dato) {
    return yo(_templateObject3, dato.year, dato.type, dato.allfansy.months.enero, dato.allfansy.months.febrero, dato.allfansy.months.marzo, dato.allfansy.months.abril, dato.allfansy.months.mayo, dato.allfansy.months.junio, dato.allfansy.months.julio, dato.allfansy.months.agosto, dato.newfansy.months.septiembre, dato.newfansy.months.octubre, dato.newfansy.months.noviembre, dato.newfansy.months.diciembre, dato.year);
  }

  function genechartnolikes(dato) {
    return yo(_templateObject4, dato.year, dato.type, dato.allfansy.months.enero, dato.allfansy.months.febrero, dato.allfansy.months.marzo, dato.allfansy.months.abril, dato.allfansy.months.mayo, dato.allfansy.months.junio, dato.allfansy.months.julio, dato.allfansy.months.agosto, dato.nolikesy.months.septiembre, dato.nolikesy.months.octubre, dato.nolikesy.months.noviembre, dato.nolikesy.months.diciembre, dato.year);
  }

  function genechartprints(dato) {
    return yo(_templateObject5, dato.year, dato.type, dato.allfansy.months.enero, dato.allfansy.months.febrero, dato.allfansy.months.marzo, dato.allfansy.months.abril, dato.allfansy.months.mayo, dato.allfansy.months.junio, dato.allfansy.months.julio, dato.allfansy.months.agosto, dato.printsy.months.septiembre, dato.printsy.months.octubre, dato.printsy.months.noviembre, dato.printsy.months.diciembre, dato.year);
  }

  function genechartactiveusers(dato) {
    return yo(_templateObject6, dato.year, dato.type, dato.allfansy.months.enero, dato.allfansy.months.febrero, dato.allfansy.months.marzo, dato.allfansy.months.abril, dato.allfansy.months.mayo, dato.allfansy.months.junio, dato.allfansy.months.julio, dato.allfansy.months.agosto, dato.activeusersy.months.septiembre, dato.activeusersy.months.octubre, dato.activeusersy.months.noviembre, dato.activeusersy.months.diciembre, dato.year);
  }

  function genechartgenre(dato) {
    return yo(_templateObject7, dato.year, dato.type, dato.genre.women, dato.genre.men, dato.year);
  }

  function genechartage(dato) {
    return yo(_templateObject8, dato.year, dato.type, dato.age.ppal, dato.age.others, dato.year);
  }

  function genechartlanguage(dato) {
    return yo(_templateObject9, dato.year, dato.type, dato.language.ppal, dato.language.others, dato.year);
  }

  function genechartcountry(dato) {
    return yo(_templateObject10, dato.year, dato.type, dato.country.ppal, dato.country.sec, dato.country.others, dato.year);
  }

  function genechartcity(dato) {
    return yo(_templateObject11, dato.year, dato.type, dato.city.ppal, dato.city.sec, dato.city.others, dato.year);
  }
};

},{"yo-yo":388}],391:[function(require,module,exports){
'use strict';

var _templateObject = _taggedTemplateLiteral(['<div class="estadisticas">\n  <div id="wb', '" class="col m12 cont-datos tab-content-datos contAnalytics wb', '">\n    <h4 style="padding:20px;text-align:center;border-bottom: 1px solid whitesmoke;">A\xF1o ', '</h4>\n    <h4>Audiencia</h4>\n    <div class="row">\n      <div class="col m4 cont-variables">\n        <h5>Sesiones</h5>\n        <a class="linkgraph" href="#wssesion', '">\n          <p class="current">\n          <i class="fa fa-sign-in" aria-hidden="true"></i>', '</p>\n        </a>\n      </div>\n      <div class="col m4 cont-variables">\n        <h5>Usuarios</h5>\n        <a class="linkgraph" href="#wsusuario', '">\n          <p class="current">\n          <i class="fa fa-user" aria-hidden="true"></i>', '</p>\n        </a>\n      </div>\n      <div class="col m4 cont-variables">\n        <h5>N\xFAmero de visitas a p\xE1ginas</h5>\n        <a class="linkgraph" href="#wsvisitas', '">\n          <p class="current" >\n          <i class="fa fa-line-chart" aria-hidden="true"></i>', '</p>\n        </a>\n      </div>\n    </div>\n    <div class="row">\n      <div class="col m6 cont-variables">\n        <h5>Duraci\xF3n Promedio de una sesi\xF3n</h5>\n        <a class="linkgraph" href="#wstiempo', '">\n          <p class="current">\n          <i class="fa fa-clock-o" aria-hidden="true"></i>', '</p>\n        </a>\n      </div>\n      <div class="col m6 cont-variables">\n        <h5>Porcentaje de Rebote</h5>\n        <a class="linkgraph" href="#wsrebote', '">\n          <p class="current">\n          <i class="fa fa-user-times" aria-hidden="true"></i>', ' %</p>\n        </a>\n      </div>\n    </div>\n    <div class="row">\n        <div class="col m7 cont-variables " style="border-right-color: white;">\n            <h5>P\xE1ginas m\xE1s vistas</h5>\n            <p><a href="', '" target="_blank" style="color: #53a8c3;">1. ', '</a></p>\n            <p><a href="', '" target="_blank" style="color: #53a8c3;">2. ', '</a></p>\n            <p><a href="', '" target="_blank" style="color: #53a8c3;">3. ', '</a></p>\n        </div>\n        <div class="col m5 cont-variables" style="border-left-color: white;">\n            <h5>N\xFAmero de veces vistas </h5>\n            <p> ', ' vistos <br> ', ' vistos<br> ', ' vistos</p>\n        </div>\n    </div>\n    <div id="wssesion', '" class="tab-content-grafica" style="display:block">\n        <div class="row">\n          <div class="col m12 cont-ano-border">\n            <div class="cont-info-ano cont-total-fans-ano">\n              <div class="cont-titulo">\n                <i class="fa fa-sign-in" aria-hidden="true" style="color:black"></i>\n                <div class="con-der-titulo">\n                  <h5 style="margin-bottom: 0;">Sesiones</h5>\n                </div>\n              </div>\n               ', '\n            </div>\n          </div>\n        </div>\n    </div>\n    <div id="wsusuario', '" class="tab-content-grafica">\n        <div class="row">\n          <div class="col m12 cont-ano-border">\n            <div class="cont-info-ano cont-total-fans-ano">\n              <div class="cont-titulo">\n                <i class="fa fa-user" aria-hidden="true" style="color:black"></i>\n                <div class="con-der-titulo">\n                  <h5 style="margin-bottom: 0;">Usuarios</h5>\n                </div>\n              </div>\n               ', '\n            </div>\n          </div>\n        </div>\n    </div>\n    <div id="wsvisitas', '" class="tab-content-grafica">\n      <div class="row">\n        <div class="col m12 cont-ano-border">\n          <div class="cont-info-ano cont-total-fans-ano">\n            <div class="cont-titulo">\n              <i class="fa fa-line-chart" aria-hidden="true" style="color:black"></i>\n              <div class="con-der-titulo">\n                <h5 style="margin-bottom: 0;">Numero de visitas a p\xE1ginas</h5>\n              </div>\n            </div>\n            ', '\n          </div>\n        </div>\n      </div>\n    </div>\n    <div id="wstiempo', '" class="tab-content-grafica">\n      <div class="row">\n        <div class="col m12 cont-ano-border">\n          <div class="cont-info-ano cont-total-fans-ano">\n            <div class="cont-titulo">\n              <i class="fa fa-clock-o" aria-hidden="true" style="color:black"></i>\n              <div class="con-der-titulo">\n                <h5 style="margin-bottom: 0;">Duraci\xF3n Promedio de la sesi\xF3n</h5>\n              </div>\n            </div>\n            ', '\n          </div>\n        </div>\n      </div>\n    </div>\n    <div id="wsrebote', '" class="tab-content-grafica">\n      <div class="row">\n        <div class="col m12 cont-ano-border">\n          <div class="cont-info-ano cont-total-fans-ano">\n            <div class="cont-titulo">\n              <i class="fa fa-user-times" aria-hidden="true" style="color:black"></i>\n              <div class="con-der-titulo">\n                <h5 style="margin-bottom: 0;">Porcentaje de Rebote</h5>\n              </div>\n            </div>\n            ', '\n          </div>\n        </div>\n      </div>\n    </div>\n    <div class="row">\n      <div class="col m5">\n        <div class="col m12 cont-variables current" style="border-left: none !important;">\n          <h5>Demograf\xEDa</h5>\n            <a class="linktorta" href="#wstortaidiomas', '">\n              <p class="current">\n              <i class="fa fa-language" aria-hidden="true" style="color:black"></i> Idioma</p>\n            </a>\n        </div>\n        <div class="col m12 cont-variables current">\n          <a class="linktorta" href="#wstortapais', '">\n            <p class="current">\n            <i class="fa fa-globe" aria-hidden="true" style="color:black"></i> Pa\xEDs</p>\n          </a>\n        </div>\n        <div class="col m12 cont-variables current">\n          <a class="linktorta" href="#wstortaciudad', '">\n            <p class="current">\n            <i class="fa fa-building" aria-hidden="true" style="color:black"></i> Ciudad</p>\n          </a>\n        </div>\n        <div class="col m12 cont-variables">\n          <a class="linktorta" href="#wstortavisit', '">\n            <p class="current">\n            <i class="fa fa-users" aria-hidden="true" style="color:black"></i> Visitantes</p>\n          </a>\n        </div>\n      </div>\n      <div class="col m7 contDerTabsTortas">\n        <div id="wstortaidiomas', '" class="col m12 tab-content-torta cont-ano-border">\n          <div class="cont-info-ano cont-tortas contTortas">\n            <div class="datos-tortas">\n              <div class="cont-labels wlabel">\n                <h5 class="color-edadp" style="color:#53a8c3"><i class="fa fa-square" aria-hidden="true"></i>Espa\xF1ol: </h5>\n                <p class="color-edadp"> ', '%</p>\n              </div>\n              <div class="cont-labels wlabel">\n                <h5 class="color-mujer"><i class="fa fa-square" aria-hidden="true"></i>Otros: </h5>\n                <p class="color-mujer"> ', '%</p>\n              </div>\n            </div>\n            ', '\n          </div>\n        </div>\n        <div id="wstortapais', '" class="col m12 tab-content-torta cont-ano-border" >\n          <div class="cont-info-ano cont-tortas contTortas">\n            <div class="datos-tortas">\n              <div class="cont-labels wlabel">\n                <h5 class="color-hombre" style="color:#e1bc29 !important"><i class="fa fa-square" aria-hidden="true"></i>Colombia:</h5>\n                <p class="color-hombre" style="color:#e1bc29 !important"> ', '%</p>\n              </div>\n              <div class="cont-labels wlabel">\n                <h5 class="color-mujer" style="color:#53A8C3 !important"><i class="fa fa-square" aria-hidden="true"></i>USA:</h5>\n                <p class="color-mujer" style="color:#53A8C3 !important"> ', '%</p>\n              </div>\n              <div class="cont-labels wlabel">\n                <h5 class="color-paiso" style="color:#3bb273"><i class="fa fa-square" aria-hidden="true"></i>Otros:</h5>\n                <p class="color-paiso"> ', '%</p>\n              </div>\n            </div>\n            ', '\n          </div>\n        </div>\n        <div id="wstortaciudad', '" class="col m12 tab-content-torta cont-ano-border" >\n          <div class="cont-info-ano cont-tortas contTortas">\n            <div class="datos-tortas" style="margin-bottom:9px;">\n              <div class="cont-labels wlabel">\n                <h5 class="color-paisp" style="color:#e1bc29;"><i class="fa fa-square" aria-hidden="true"></i>Medell\xEDn: </h5>\n                <p class="color-paisp">', '%</p>\n              </div>\n              <div class="cont-labels wlabel">\n                <h5 class="color-paiss" style="color:#53a8c3;"><i class="fa fa-square" aria-hidden="true"></i>New York:</h5>\n                <p class="color-paiss"> ', '% </p>\n              </div>\n              <div class="cont-labels wlabel">\n                <h5 class="color-paiso" style="color:#3bb273;"><i class="fa fa-square" aria-hidden="true"></i>Otros:</h5>\n                <p class="color-paiso"> ', '% </p>\n              </div>\n            </div>\n            ', '\n          </div>\n        </div>\n        <div id="wstortavisit', '" class="col m12 tab-content-torta cont-ano-border">\n          <div class="cont-info-ano cont-tortas contTortas">\n            <div class="datos-tortas">\n              <div class="cont-labels wlabel">\n                <h5 class="color-mujer"><i class="fa fa-square" aria-hidden="true"></i> Nuevos: </h5>\n                <p class="color-mujer"> ', '%</p>\n              </div>\n              <div class="cont-labels wlabel">\n                <h5 class="color-hombre"><i class="fa fa-square" aria-hidden="true"></i> Recurrentes:</h5>\n                <p class="color-hombre">', '%</p>\n              </div>\n            </div>\n            ', '\n          </div>\n        </div>\n      </div>\n    </div>\n  </div>\n  </div>'], ['<div class="estadisticas">\n  <div id="wb', '" class="col m12 cont-datos tab-content-datos contAnalytics wb', '">\n    <h4 style="padding:20px;text-align:center;border-bottom: 1px solid whitesmoke;">A\xF1o ', '</h4>\n    <h4>Audiencia</h4>\n    <div class="row">\n      <div class="col m4 cont-variables">\n        <h5>Sesiones</h5>\n        <a class="linkgraph" href="#wssesion', '">\n          <p class="current">\n          <i class="fa fa-sign-in" aria-hidden="true"></i>', '</p>\n        </a>\n      </div>\n      <div class="col m4 cont-variables">\n        <h5>Usuarios</h5>\n        <a class="linkgraph" href="#wsusuario', '">\n          <p class="current">\n          <i class="fa fa-user" aria-hidden="true"></i>', '</p>\n        </a>\n      </div>\n      <div class="col m4 cont-variables">\n        <h5>N\xFAmero de visitas a p\xE1ginas</h5>\n        <a class="linkgraph" href="#wsvisitas', '">\n          <p class="current" >\n          <i class="fa fa-line-chart" aria-hidden="true"></i>', '</p>\n        </a>\n      </div>\n    </div>\n    <div class="row">\n      <div class="col m6 cont-variables">\n        <h5>Duraci\xF3n Promedio de una sesi\xF3n</h5>\n        <a class="linkgraph" href="#wstiempo', '">\n          <p class="current">\n          <i class="fa fa-clock-o" aria-hidden="true"></i>', '</p>\n        </a>\n      </div>\n      <div class="col m6 cont-variables">\n        <h5>Porcentaje de Rebote</h5>\n        <a class="linkgraph" href="#wsrebote', '">\n          <p class="current">\n          <i class="fa fa-user-times" aria-hidden="true"></i>', ' %</p>\n        </a>\n      </div>\n    </div>\n    <div class="row">\n        <div class="col m7 cont-variables " style="border-right-color: white;">\n            <h5>P\xE1ginas m\xE1s vistas</h5>\n            <p><a href="', '" target="_blank" style="color: #53a8c3;">1. ', '</a></p>\n            <p><a href="', '" target="_blank" style="color: #53a8c3;">2. ', '</a></p>\n            <p><a href="', '" target="_blank" style="color: #53a8c3;">3. ', '</a></p>\n        </div>\n        <div class="col m5 cont-variables" style="border-left-color: white;">\n            <h5>N\xFAmero de veces vistas </h5>\n            <p> ', ' vistos <br> ', ' vistos<br> ', ' vistos</p>\n        </div>\n    </div>\n    <div id="wssesion', '" class="tab-content-grafica" style="display:block">\n        <div class="row">\n          <div class="col m12 cont-ano-border">\n            <div class="cont-info-ano cont-total-fans-ano">\n              <div class="cont-titulo">\n                <i class="fa fa-sign-in" aria-hidden="true" style="color:black"></i>\n                <div class="con-der-titulo">\n                  <h5 style="margin-bottom: 0;">Sesiones</h5>\n                </div>\n              </div>\n               ', '\n            </div>\n          </div>\n        </div>\n    </div>\n    <div id="wsusuario', '" class="tab-content-grafica">\n        <div class="row">\n          <div class="col m12 cont-ano-border">\n            <div class="cont-info-ano cont-total-fans-ano">\n              <div class="cont-titulo">\n                <i class="fa fa-user" aria-hidden="true" style="color:black"></i>\n                <div class="con-der-titulo">\n                  <h5 style="margin-bottom: 0;">Usuarios</h5>\n                </div>\n              </div>\n               ', '\n            </div>\n          </div>\n        </div>\n    </div>\n    <div id="wsvisitas', '" class="tab-content-grafica">\n      <div class="row">\n        <div class="col m12 cont-ano-border">\n          <div class="cont-info-ano cont-total-fans-ano">\n            <div class="cont-titulo">\n              <i class="fa fa-line-chart" aria-hidden="true" style="color:black"></i>\n              <div class="con-der-titulo">\n                <h5 style="margin-bottom: 0;">Numero de visitas a p\xE1ginas</h5>\n              </div>\n            </div>\n            ', '\n          </div>\n        </div>\n      </div>\n    </div>\n    <div id="wstiempo', '" class="tab-content-grafica">\n      <div class="row">\n        <div class="col m12 cont-ano-border">\n          <div class="cont-info-ano cont-total-fans-ano">\n            <div class="cont-titulo">\n              <i class="fa fa-clock-o" aria-hidden="true" style="color:black"></i>\n              <div class="con-der-titulo">\n                <h5 style="margin-bottom: 0;">Duraci\xF3n Promedio de la sesi\xF3n</h5>\n              </div>\n            </div>\n            ', '\n          </div>\n        </div>\n      </div>\n    </div>\n    <div id="wsrebote', '" class="tab-content-grafica">\n      <div class="row">\n        <div class="col m12 cont-ano-border">\n          <div class="cont-info-ano cont-total-fans-ano">\n            <div class="cont-titulo">\n              <i class="fa fa-user-times" aria-hidden="true" style="color:black"></i>\n              <div class="con-der-titulo">\n                <h5 style="margin-bottom: 0;">Porcentaje de Rebote</h5>\n              </div>\n            </div>\n            ', '\n          </div>\n        </div>\n      </div>\n    </div>\n    <div class="row">\n      <div class="col m5">\n        <div class="col m12 cont-variables current" style="border-left: none !important;">\n          <h5>Demograf\xEDa</h5>\n            <a class="linktorta" href="#wstortaidiomas', '">\n              <p class="current">\n              <i class="fa fa-language" aria-hidden="true" style="color:black"></i> Idioma</p>\n            </a>\n        </div>\n        <div class="col m12 cont-variables current">\n          <a class="linktorta" href="#wstortapais', '">\n            <p class="current">\n            <i class="fa fa-globe" aria-hidden="true" style="color:black"></i> Pa\xEDs</p>\n          </a>\n        </div>\n        <div class="col m12 cont-variables current">\n          <a class="linktorta" href="#wstortaciudad', '">\n            <p class="current">\n            <i class="fa fa-building" aria-hidden="true" style="color:black"></i> Ciudad</p>\n          </a>\n        </div>\n        <div class="col m12 cont-variables">\n          <a class="linktorta" href="#wstortavisit', '">\n            <p class="current">\n            <i class="fa fa-users" aria-hidden="true" style="color:black"></i> Visitantes</p>\n          </a>\n        </div>\n      </div>\n      <div class="col m7 contDerTabsTortas">\n        <div id="wstortaidiomas', '" class="col m12 tab-content-torta cont-ano-border">\n          <div class="cont-info-ano cont-tortas contTortas">\n            <div class="datos-tortas">\n              <div class="cont-labels wlabel">\n                <h5 class="color-edadp" style="color:#53a8c3"><i class="fa fa-square" aria-hidden="true"></i>Espa\xF1ol: </h5>\n                <p class="color-edadp"> ', '%</p>\n              </div>\n              <div class="cont-labels wlabel">\n                <h5 class="color-mujer"><i class="fa fa-square" aria-hidden="true"></i>Otros: </h5>\n                <p class="color-mujer"> ', '%</p>\n              </div>\n            </div>\n            ', '\n          </div>\n        </div>\n        <div id="wstortapais', '" class="col m12 tab-content-torta cont-ano-border" >\n          <div class="cont-info-ano cont-tortas contTortas">\n            <div class="datos-tortas">\n              <div class="cont-labels wlabel">\n                <h5 class="color-hombre" style="color:#e1bc29 !important"><i class="fa fa-square" aria-hidden="true"></i>Colombia:</h5>\n                <p class="color-hombre" style="color:#e1bc29 !important"> ', '%</p>\n              </div>\n              <div class="cont-labels wlabel">\n                <h5 class="color-mujer" style="color:#53A8C3 !important"><i class="fa fa-square" aria-hidden="true"></i>USA:</h5>\n                <p class="color-mujer" style="color:#53A8C3 !important"> ', '%</p>\n              </div>\n              <div class="cont-labels wlabel">\n                <h5 class="color-paiso" style="color:#3bb273"><i class="fa fa-square" aria-hidden="true"></i>Otros:</h5>\n                <p class="color-paiso"> ', '%</p>\n              </div>\n            </div>\n            ', '\n          </div>\n        </div>\n        <div id="wstortaciudad', '" class="col m12 tab-content-torta cont-ano-border" >\n          <div class="cont-info-ano cont-tortas contTortas">\n            <div class="datos-tortas" style="margin-bottom:9px;">\n              <div class="cont-labels wlabel">\n                <h5 class="color-paisp" style="color:#e1bc29;"><i class="fa fa-square" aria-hidden="true"></i>Medell\xEDn: </h5>\n                <p class="color-paisp">', '%</p>\n              </div>\n              <div class="cont-labels wlabel">\n                <h5 class="color-paiss" style="color:#53a8c3;"><i class="fa fa-square" aria-hidden="true"></i>New York:</h5>\n                <p class="color-paiss"> ', '% </p>\n              </div>\n              <div class="cont-labels wlabel">\n                <h5 class="color-paiso" style="color:#3bb273;"><i class="fa fa-square" aria-hidden="true"></i>Otros:</h5>\n                <p class="color-paiso"> ', '% </p>\n              </div>\n            </div>\n            ', '\n          </div>\n        </div>\n        <div id="wstortavisit', '" class="col m12 tab-content-torta cont-ano-border">\n          <div class="cont-info-ano cont-tortas contTortas">\n            <div class="datos-tortas">\n              <div class="cont-labels wlabel">\n                <h5 class="color-mujer"><i class="fa fa-square" aria-hidden="true"></i> Nuevos: </h5>\n                <p class="color-mujer"> ', '%</p>\n              </div>\n              <div class="cont-labels wlabel">\n                <h5 class="color-hombre"><i class="fa fa-square" aria-hidden="true"></i> Recurrentes:</h5>\n                <p class="color-hombre">', '%</p>\n              </div>\n            </div>\n            ', '\n          </div>\n        </div>\n      </div>\n    </div>\n  </div>\n  </div>']),
    _templateObject2 = _taggedTemplateLiteral(['<div>\n  <canvas id="wssesiondatos', '" width="1100" height="400"></canvas>\n  <script>\n    if(\'', '\' == \'year\'){\n      function chartSessions(){\n\n          var LineChart = {\n            labels: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],\n            datasets: [{\n              fillColor: "rgba(83, 168, 195, 0.52)",\n              strokeColor: "rgb(83, 168, 195)",\n              pointColor: "rgba(220,220,220,1)",\n              pointStrokeColor: "#fff",\n              data: [', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ']\n            }]\n          }\n        var ctx = document.getElementById("wssesiondatos', '").getContext("2d");\n        var myLineChart = new Chart(ctx).Line(LineChart, {scaleFontSize : 13, scaleFontColor : "#000000"});\n      }\n    }\n    chartSessions();\n  </script>\n  </div>'], ['<div>\n  <canvas id="wssesiondatos', '" width="1100" height="400"></canvas>\n  <script>\n    if(\'', '\' == \'year\'){\n      function chartSessions(){\n\n          var LineChart = {\n            labels: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],\n            datasets: [{\n              fillColor: "rgba(83, 168, 195, 0.52)",\n              strokeColor: "rgb(83, 168, 195)",\n              pointColor: "rgba(220,220,220,1)",\n              pointStrokeColor: "#fff",\n              data: [', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ']\n            }]\n          }\n        var ctx = document.getElementById("wssesiondatos', '").getContext("2d");\n        var myLineChart = new Chart(ctx).Line(LineChart, {scaleFontSize : 13, scaleFontColor : "#000000"});\n      }\n    }\n    chartSessions();\n  </script>\n  </div>']),
    _templateObject3 = _taggedTemplateLiteral(['<div>\n  <canvas id="wsusuariodatos', '" width="1100" height="400"></canvas>\n  <script>\n    if(\'', '\' == \'year\'){\n      function chartUsers(){\n\n          var LineChart = {\n            labels: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],\n            datasets: [{\n              fillColor: "rgba(59, 178, 115, 0.52)",\n              strokeColor: "rgb(59, 178, 115)",\n              pointColor: "rgba(220,220,220,1)",\n              pointStrokeColor: "#fff",\n              data: [', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ']\n            }]\n          }\n        var ctx = document.getElementById("wsusuariodatos', '").getContext("2d");\n        var myLineChart = new Chart(ctx).Line(LineChart, {scaleFontSize : 13, scaleFontColor : "#000000"});\n      }\n    }\n    chartUsers();\n  </script>\n  </div>'], ['<div>\n  <canvas id="wsusuariodatos', '" width="1100" height="400"></canvas>\n  <script>\n    if(\'', '\' == \'year\'){\n      function chartUsers(){\n\n          var LineChart = {\n            labels: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],\n            datasets: [{\n              fillColor: "rgba(59, 178, 115, 0.52)",\n              strokeColor: "rgb(59, 178, 115)",\n              pointColor: "rgba(220,220,220,1)",\n              pointStrokeColor: "#fff",\n              data: [', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ']\n            }]\n          }\n        var ctx = document.getElementById("wsusuariodatos', '").getContext("2d");\n        var myLineChart = new Chart(ctx).Line(LineChart, {scaleFontSize : 13, scaleFontColor : "#000000"});\n      }\n    }\n    chartUsers();\n  </script>\n  </div>']),
    _templateObject4 = _taggedTemplateLiteral(['<div>\n  <canvas id="wsvisitasdatos', '" width="1100" height="400"></canvas>\n  <script>\n    if(\'', '\' == \'year\'){\n      function chartPageViews(){\n\n          var LineChart = {\n            labels: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],\n            datasets: [{\n              fillColor: "rgba(225, 188, 41, 0.52)",\n              strokeColor: "rgb(225, 188, 41)",\n              pointColor: "rgba(220,220,220,1)",\n              pointStrokeColor: "#fff",\n              data: [', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ']\n            }]\n          }\n        var ctx = document.getElementById("wsvisitasdatos', '").getContext("2d");\n        var myLineChart = new Chart(ctx).Line(LineChart, {scaleFontSize : 13, scaleFontColor : "#000000"});\n      }\n    }\n    chartPageViews();\n  </script>\n  </div>'], ['<div>\n  <canvas id="wsvisitasdatos', '" width="1100" height="400"></canvas>\n  <script>\n    if(\'', '\' == \'year\'){\n      function chartPageViews(){\n\n          var LineChart = {\n            labels: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],\n            datasets: [{\n              fillColor: "rgba(225, 188, 41, 0.52)",\n              strokeColor: "rgb(225, 188, 41)",\n              pointColor: "rgba(220,220,220,1)",\n              pointStrokeColor: "#fff",\n              data: [', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ']\n            }]\n          }\n        var ctx = document.getElementById("wsvisitasdatos', '").getContext("2d");\n        var myLineChart = new Chart(ctx).Line(LineChart, {scaleFontSize : 13, scaleFontColor : "#000000"});\n      }\n    }\n    chartPageViews();\n  </script>\n  </div>']),
    _templateObject5 = _taggedTemplateLiteral(['<div>\n  <canvas id="wstiempodatos', '" width="1100" height="400"></canvas>\n  <script>\n    if(\'', '\' == \'year\'){\n      function chartDurationProm(){\n\n          var LineChart = {\n            labels: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],\n            datasets: [{\n              fillColor: "rgba(243, 146, 55, 0.52)",\n              strokeColor: "rgb(243, 146, 55)",\n              pointColor: "rgba(220,220,220,1)",\n              pointStrokeColor: "#fff",\n              data: [', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ']\n            }]\n          }\n        var ctx = document.getElementById("wstiempodatos', '").getContext("2d");\n        var myLineChart = new Chart(ctx).Line(LineChart, {scaleFontSize : 13, scaleFontColor : "#000000"});\n      }\n    }\n    chartDurationProm();\n  </script>\n  </div>'], ['<div>\n  <canvas id="wstiempodatos', '" width="1100" height="400"></canvas>\n  <script>\n    if(\'', '\' == \'year\'){\n      function chartDurationProm(){\n\n          var LineChart = {\n            labels: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],\n            datasets: [{\n              fillColor: "rgba(243, 146, 55, 0.52)",\n              strokeColor: "rgb(243, 146, 55)",\n              pointColor: "rgba(220,220,220,1)",\n              pointStrokeColor: "#fff",\n              data: [', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ']\n            }]\n          }\n        var ctx = document.getElementById("wstiempodatos', '").getContext("2d");\n        var myLineChart = new Chart(ctx).Line(LineChart, {scaleFontSize : 13, scaleFontColor : "#000000"});\n      }\n    }\n    chartDurationProm();\n  </script>\n  </div>']),
    _templateObject6 = _taggedTemplateLiteral(['<div>\n  <canvas id="wsrebotedatos', '" width="1100" height="400"></canvas>\n  <script>\n    if(\'', '\' == \'year\'){\n      function chartRebotePor(){\n\n          var LineChart = {\n            labels: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],\n            datasets: [{\n              fillColor: "rgba(250, 172, 237, 0.52)",\n              strokeColor: "rgb(250, 172, 237)",\n              pointColor: "rgba(220,220,220,1)",\n              pointStrokeColor: "#fff",\n              data: [', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ']\n            }]\n          }\n        var ctx = document.getElementById("wsrebotedatos', '").getContext("2d");\n        var myLineChart = new Chart(ctx).Line(LineChart, {scaleFontSize : 13, scaleFontColor : "#000000"});\n      }\n    }\n    chartRebotePor();\n  </script>\n  </div>'], ['<div>\n  <canvas id="wsrebotedatos', '" width="1100" height="400"></canvas>\n  <script>\n    if(\'', '\' == \'year\'){\n      function chartRebotePor(){\n\n          var LineChart = {\n            labels: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],\n            datasets: [{\n              fillColor: "rgba(250, 172, 237, 0.52)",\n              strokeColor: "rgb(250, 172, 237)",\n              pointColor: "rgba(220,220,220,1)",\n              pointStrokeColor: "#fff",\n              data: [', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ']\n            }]\n          }\n        var ctx = document.getElementById("wsrebotedatos', '").getContext("2d");\n        var myLineChart = new Chart(ctx).Line(LineChart, {scaleFontSize : 13, scaleFontColor : "#000000"});\n      }\n    }\n    chartRebotePor();\n  </script>\n  </div>']),
    _templateObject7 = _taggedTemplateLiteral(['<div>\n    <canvas id="idiomas', '" width="150" height="150"></canvas>\n    <script>\n      if(\'', '\' == \'year\'){\n        function chartLanguage(){\n          var idiomaData = [\n         \t\t\t\t{\n         \t\t\t\t\tvalue: ', ',\n         \t\t\t\t\tcolor:"#53a8c3",\n         \t\t\t\t\thighlight: "rgba(83, 168, 195, 0.8)",\n         \t\t\t\t\tlabel: "Espa\xF1ol"},\n         \t\t\t\t{\n         \t\t\t\t\tvalue: ', ',\n         \t\t\t\t\tcolor: "#F39237",\n         \t\t\t\t\thighlight: "rgba(243,146,55,0.8)",\n         \t\t\t\t\tlabel: "Otros"\n         \t\t\t\t}\n         \t\t\t];\n\n          var ctx = document.getElementById("idiomas', '").getContext("2d");\n          window.myPie = new Chart(ctx).Pie(idiomaData);\n        }\n      }\n      chartLanguage();\n    </script>\n  </div>'], ['<div>\n    <canvas id="idiomas', '" width="150" height="150"></canvas>\n    <script>\n      if(\'', '\' == \'year\'){\n        function chartLanguage(){\n          var idiomaData = [\n         \t\t\t\t{\n         \t\t\t\t\tvalue: ', ',\n         \t\t\t\t\tcolor:"#53a8c3",\n         \t\t\t\t\thighlight: "rgba(83, 168, 195, 0.8)",\n         \t\t\t\t\tlabel: "Espa\xF1ol"},\n         \t\t\t\t{\n         \t\t\t\t\tvalue: ', ',\n         \t\t\t\t\tcolor: "#F39237",\n         \t\t\t\t\thighlight: "rgba(243,146,55,0.8)",\n         \t\t\t\t\tlabel: "Otros"\n         \t\t\t\t}\n         \t\t\t];\n\n          var ctx = document.getElementById("idiomas', '").getContext("2d");\n          window.myPie = new Chart(ctx).Pie(idiomaData);\n        }\n      }\n      chartLanguage();\n    </script>\n  </div>']),
    _templateObject8 = _taggedTemplateLiteral(['<div>\n      <canvas id="paises', '" width="150" height="150"></canvas>\n      <script>\n        if(\'', '\' == \'year\'){\n          function chartCountry(){\n            var paisData = [\n         \t\t\t\t{\n         \t\t\t\t\tvalue: ', ',\n         \t\t\t\t\tcolor:"#E1BC29",\n         \t\t\t\t\thighlight: "rgba(225,188,41,0.80)",\n         \t\t\t\t\tlabel: "Colombia"},\n         \t\t\t\t{\n         \t\t\t\t\tvalue: ', ',\n         \t\t\t\t\tcolor: "#53A8C3",\n         \t\t\t\t\thighlight: "rgba(83,168,195,0.80)",\n         \t\t\t\t\tlabel: "USA"},\n         \t\t\t\t{\n         \t\t\t\t\tvalue: ', ',\n         \t\t\t\t\tcolor: "#3bb273",\n         \t\t\t\t\thighlight: "rgba(59,178,115,0.8)",\n         \t\t\t\t\tlabel: "Otros"\n         \t\t\t\t}\n         \t\t\t];\n            var ctx = document.getElementById("paises', '").getContext("2d");\n            window.myPie = new Chart(ctx).Pie(paisData);\n          }\n        }\n        chartCountry();\n      </script>\n    </div>'], ['<div>\n      <canvas id="paises', '" width="150" height="150"></canvas>\n      <script>\n        if(\'', '\' == \'year\'){\n          function chartCountry(){\n            var paisData = [\n         \t\t\t\t{\n         \t\t\t\t\tvalue: ', ',\n         \t\t\t\t\tcolor:"#E1BC29",\n         \t\t\t\t\thighlight: "rgba(225,188,41,0.80)",\n         \t\t\t\t\tlabel: "Colombia"},\n         \t\t\t\t{\n         \t\t\t\t\tvalue: ', ',\n         \t\t\t\t\tcolor: "#53A8C3",\n         \t\t\t\t\thighlight: "rgba(83,168,195,0.80)",\n         \t\t\t\t\tlabel: "USA"},\n         \t\t\t\t{\n         \t\t\t\t\tvalue: ', ',\n         \t\t\t\t\tcolor: "#3bb273",\n         \t\t\t\t\thighlight: "rgba(59,178,115,0.8)",\n         \t\t\t\t\tlabel: "Otros"\n         \t\t\t\t}\n         \t\t\t];\n            var ctx = document.getElementById("paises', '").getContext("2d");\n            window.myPie = new Chart(ctx).Pie(paisData);\n          }\n        }\n        chartCountry();\n      </script>\n    </div>']),
    _templateObject9 = _taggedTemplateLiteral(['<div>\n        <canvas id="ciudad', '" width="150" height="150"></canvas>\n        <script>\n          if(\'', '\' == \'year\'){\n            function chartCity(){\n              var ciudadesData = [\n                  {\n                    value: ', ',\n                    color:"#E1BC29",\n                    highlight: "rgba(225,188,41,0.80)",\n                    label: "Medell\xEDn"},\n                  {\n                    value: ', ',\n                    color: "#53A8C3",\n                    highlight: "rgba(83,168,195,0.80)",\n                    label: "New York"},\n                  {\n                    value: ', ',\n                    color: "#3bb273",\n                    highlight: "rgba(59,178,115,0.8)",\n                    label: "Otros"\n                  }\n                ];\n              var ctx = document.getElementById("ciudad', '").getContext("2d");\n              window.myPie = new Chart(ctx).Pie(ciudadesData);\n            }\n          }\n          chartCity();\n        </script>\n      </div>'], ['<div>\n        <canvas id="ciudad', '" width="150" height="150"></canvas>\n        <script>\n          if(\'', '\' == \'year\'){\n            function chartCity(){\n              var ciudadesData = [\n                  {\n                    value: ', ',\n                    color:"#E1BC29",\n                    highlight: "rgba(225,188,41,0.80)",\n                    label: "Medell\xEDn"},\n                  {\n                    value: ', ',\n                    color: "#53A8C3",\n                    highlight: "rgba(83,168,195,0.80)",\n                    label: "New York"},\n                  {\n                    value: ', ',\n                    color: "#3bb273",\n                    highlight: "rgba(59,178,115,0.8)",\n                    label: "Otros"\n                  }\n                ];\n              var ctx = document.getElementById("ciudad', '").getContext("2d");\n              window.myPie = new Chart(ctx).Pie(ciudadesData);\n            }\n          }\n          chartCity();\n        </script>\n      </div>']),
    _templateObject10 = _taggedTemplateLiteral(['<div>\n    <canvas id="visit', '" width="150" height="150"></canvas>\n    <script>\n      if(\'', '\' == \'year\'){\n        function chartVisit(){\n          var visitData = [\n         \t\t\t\t{\n         \t\t\t\t\tvalue: ', ',\n         \t\t\t\t\tcolor:"#F39237",\n         \t\t\t\t\thighlight: "rgba(243,146,55,0.8)",\n         \t\t\t\t\tlabel: "Nuevos"},\n         \t\t\t\t{\n         \t\t\t\t\tvalue: ', ',\n         \t\t\t\t\tcolor: "#53a8c3",\n         \t\t\t\t\thighlight: "rgba(83, 168, 195, 0.8)",\n         \t\t\t\t\tlabel: "Recurrentes"\n         \t\t\t\t}\n         \t\t\t];\n\n          var ctx = document.getElementById("visit', '").getContext("2d");\n          window.myPie = new Chart(ctx).Pie(visitData);\n        }\n      }\n      chartVisit();\n    </script>\n  </div>'], ['<div>\n    <canvas id="visit', '" width="150" height="150"></canvas>\n    <script>\n      if(\'', '\' == \'year\'){\n        function chartVisit(){\n          var visitData = [\n         \t\t\t\t{\n         \t\t\t\t\tvalue: ', ',\n         \t\t\t\t\tcolor:"#F39237",\n         \t\t\t\t\thighlight: "rgba(243,146,55,0.8)",\n         \t\t\t\t\tlabel: "Nuevos"},\n         \t\t\t\t{\n         \t\t\t\t\tvalue: ', ',\n         \t\t\t\t\tcolor: "#53a8c3",\n         \t\t\t\t\thighlight: "rgba(83, 168, 195, 0.8)",\n         \t\t\t\t\tlabel: "Recurrentes"\n         \t\t\t\t}\n         \t\t\t];\n\n          var ctx = document.getElementById("visit', '").getContext("2d");\n          window.myPie = new Chart(ctx).Pie(visitData);\n        }\n      }\n      chartVisit();\n    </script>\n  </div>']);

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var yo = require('yo-yo');

module.exports = function (dato) {
  return yo(_templateObject, dato.year, dato.year, dato.year, dato.year, dato.sessionst || 0, dato.year, dato.usuariosactit || 0, dato.year, dato.numpageviewst || 0, dato.year, dato.timepromt || 0, dato.year, dato.reboteport || 0, dato.urlpagmoreview1 || 0, dato.pagmoreview1 || 0, dato.urlpagmoreview2 || 0, dato.pagmoreview2 || 0, dato.urlpagmoreview3 || 0, dato.pagmoreview3 || 0, dato.numpagmoreview1 || 0, dato.numpagmoreview2 || 0, dato.numpagmoreview3 || 0, dato.year, generarChartSessions(dato), dato.year, generarChartUsuarios(dato), dato.year, generarChartNumPageViews(dato), dato.year, generarChartDuracionProm(dato), dato.year, generarChartRebotePor(dato), dato.year, dato.year, dato.year, dato.year, dato.year, dato.language.ppal || 0, dato.language.others || 0, generarChartLanguage(dato), dato.year, dato.country.ppal || 0, dato.country.sec || 0, dato.country.others || 0, generarChartCountry(dato), dato.year, dato.city.ppal || 0, dato.city.sec || 0, dato.city.others || 0, generarChartCity(dato), dato.year, dato.visit.visitnews || 0, dato.visit.visitrecurrent || 0, generarChartVisit(dato));

  function generarChartSessions(dato) {
    return yo(_templateObject2, dato.year, dato.type, dato.sessions.months.enero, dato.sessions.months.febrero, dato.sessions.months.marzo, dato.sessions.months.abril, dato.sessions.months.mayo, dato.sessions.months.junio, dato.sessions.months.julio, dato.sessions.months.agosto, dato.sessions.months.septiembre, dato.sessions.months.octubre, dato.sessions.months.noviembre, dato.sessions.months.diciembre, dato.year);
  }

  function generarChartUsuarios(dato) {
    return yo(_templateObject3, dato.year, dato.type, dato.usuariosacti.months.enero, dato.usuariosacti.months.febrero, dato.usuariosacti.months.marzo, dato.usuariosacti.months.abril, dato.usuariosacti.months.mayo, dato.usuariosacti.months.junio, dato.usuariosacti.months.julio, dato.usuariosacti.months.agosto, dato.usuariosacti.months.septiembre, dato.usuariosacti.months.octubre, dato.usuariosacti.months.noviembre, dato.usuariosacti.months.diciembre, dato.year);
  }

  function generarChartNumPageViews(dato) {
    return yo(_templateObject4, dato.year, dato.type, dato.numpageviews.months.enero, dato.numpageviews.months.febrero, dato.numpageviews.months.marzo, dato.numpageviews.months.abril, dato.numpageviews.months.mayo, dato.numpageviews.months.junio, dato.numpageviews.months.julio, dato.numpageviews.months.agosto, dato.numpageviews.months.septiembre, dato.numpageviews.months.octubre, dato.numpageviews.months.noviembre, dato.numpageviews.months.diciembre, dato.year);
  }

  function generarChartDuracionProm(dato) {
    return yo(_templateObject5, dato.year, dato.type, dato.timeprom.months.enero, dato.timeprom.months.febrero, dato.timeprom.months.marzo, dato.timeprom.months.abril, dato.timeprom.months.mayo, dato.timeprom.months.junio, dato.timeprom.months.julio, dato.timeprom.months.agosto, dato.timeprom.months.septiembre, dato.timeprom.months.octubre, dato.timeprom.months.noviembre, dato.timeprom.months.diciembre, dato.year);
  }

  function generarChartRebotePor(dato) {
    return yo(_templateObject6, dato.year, dato.type, dato.rebotepor.months.enero, dato.rebotepor.months.febrero, dato.rebotepor.months.marzo, dato.rebotepor.months.abril, dato.rebotepor.months.mayo, dato.rebotepor.months.junio, dato.rebotepor.months.julio, dato.rebotepor.months.agosto, dato.rebotepor.months.septiembre, dato.rebotepor.months.octubre, dato.rebotepor.months.noviembre, dato.rebotepor.months.diciembre, dato.year);
  }

  function generarChartLanguage(dato) {
    return yo(_templateObject7, dato.year, dato.type, dato.language.ppal, dato.language.others, dato.year);
  }

  function generarChartCountry(dato) {
    return yo(_templateObject8, dato.year, dato.type, dato.country.ppal, dato.country.sec, dato.country.others, dato.year);
  }

  function generarChartCity(dato) {
    return yo(_templateObject9, dato.year, dato.type, dato.city.ppal, dato.city.sec, dato.city.others, dato.year);
  }

  function generarChartVisit(dato) {
    return yo(_templateObject10, dato.year, dato.type, dato.visit.visitnews, dato.visit.visitrecurrent, dato.year);
  }
};

},{"yo-yo":388}],392:[function(require,module,exports){
'use strict';

var _templateObject = _taggedTemplateLiteral(['<div class="estadisticas cont-instagram">\n              <div id="it', '', '" class="col m12 cont-datos tab-content-datos it', '', '">\n                <div class="contHeaderVisual">\n                  <div class="contTitleVisual">\n                    <h4 class="title-mes">', ' - ', '</h4>\n                  </div>\n                  <div class="logo-cliente">\n                    <img src="', '"  />\n                  </div>\n                </div>\n                <h4>Crecimiento</h4>\n                    <div class="row">\n                      <div class="col m4 cont-variables">\n                        <h5>Total seguidores</h5>\n                        <p>', '</p>\n                      </div>\n                      <div class="col m4 cont-variables">\n                        <h5>Total seguidos</h5>\n                        <p>', '</p>\n                      </div>\n                      <div class="col m4 cont-variables">\n                        <h5>Total post</h5>\n                        <p>', '</p>\n                      </div>\n                    </div>\n                    <div class="row">\n                      <div class="col m4 cont-variables">\n                        <h5>Post mes</h5>\n                        <p>', '</p>\n                      </div>\n                      <div class="col m4 cont-variables">\n                        <h5>Likes mes</h5>\n                        <p>', '</p>\n                      </div>\n                      <div class="col m4 cont-variables">\n                        <h5>Comentarios</h5>\n                        <p>', '</p>\n                      </div>\n                    </div>\n                 <h4>Interacci\xF3n</h4>\n                        <div class="row">\n                            <div class="col m8 cont-variables">\n                              <img src="', '"  />\n                            </div>\n                            <div class="col m4 cont-variables">\n                              <h5>Post con mayor likes</h5>\n                              <p>  1. ', ' likes<br>2. ', ' likes<br>3. ', ' likes</p>\n                            </div>\n                        </div>\n              </div>\n  </div>'], ['<div class="estadisticas cont-instagram">\n              <div id="it', '', '" class="col m12 cont-datos tab-content-datos it', '', '">\n                <div class="contHeaderVisual">\n                  <div class="contTitleVisual">\n                    <h4 class="title-mes">', ' - ', '</h4>\n                  </div>\n                  <div class="logo-cliente">\n                    <img src="', '"  />\n                  </div>\n                </div>\n                <h4>Crecimiento</h4>\n                    <div class="row">\n                      <div class="col m4 cont-variables">\n                        <h5>Total seguidores</h5>\n                        <p>', '</p>\n                      </div>\n                      <div class="col m4 cont-variables">\n                        <h5>Total seguidos</h5>\n                        <p>', '</p>\n                      </div>\n                      <div class="col m4 cont-variables">\n                        <h5>Total post</h5>\n                        <p>', '</p>\n                      </div>\n                    </div>\n                    <div class="row">\n                      <div class="col m4 cont-variables">\n                        <h5>Post mes</h5>\n                        <p>', '</p>\n                      </div>\n                      <div class="col m4 cont-variables">\n                        <h5>Likes mes</h5>\n                        <p>', '</p>\n                      </div>\n                      <div class="col m4 cont-variables">\n                        <h5>Comentarios</h5>\n                        <p>', '</p>\n                      </div>\n                    </div>\n                 <h4>Interacci\xF3n</h4>\n                        <div class="row">\n                            <div class="col m8 cont-variables">\n                              <img src="', '"  />\n                            </div>\n                            <div class="col m4 cont-variables">\n                              <h5>Post con mayor likes</h5>\n                              <p>  1. ', ' likes<br>2. ', ' likes<br>3. ', ' likes</p>\n                            </div>\n                        </div>\n              </div>\n  </div>']);

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var yo = require('yo-yo');

module.exports = function (ctx, dato) {
  return yo(_templateObject, dato.year, dato.month, dato.year, dato.month, dato.month, dato.year, ctx.auth.src, dato.allfans || 0, dato.follows || 0, dato.allpost || 0, dato.postbymonth || 0, dato.likebymonth || 0, dato.comments || 0, dato.topposts.src, dato.topposts.likesone, dato.topposts.likestwo, dato.topposts.likesthree);
};

},{"yo-yo":388}],393:[function(require,module,exports){
'use strict';

var _templateObject = _taggedTemplateLiteral(['<div class="estadisticas">\n  <div id="wb', '', '" class="col m12 cont-datos tab-content-datos contAnalytics wb', '', '">\n    <div class="contHeaderVisual">\n      <div class="contTitleVisual">\n        <h4 class="title-mes">', ' - ', '</h4>\n      </div>\n      <div class="logo-cliente">\n        <img src="', '"  />\n      </div>\n    </div>\n    <h4>Audiencia</h4>\n    <div class="row">\n      <div class="col m4 cont-variables">\n        <h5>Sesiones</h5>\n        <a class="linkgraph" href="#wssesion', '', '">\n          <p class="current">\n          <i class="fa fa-sign-in" aria-hidden="true"></i>', '</p>\n        </a>\n      </div>\n      <div class="col m4 cont-variables">\n        <h5>Usuarios</h5>\n        <a class="linkgraph" href="#wsusuario', '', '">\n          <p class="current">\n          <i class="fa fa-user" aria-hidden="true"></i>', '</p>\n        </a>\n      </div>\n      <div class="col m4 cont-variables">\n        <h5>N\xFAmero de visitas a p\xE1ginas</h5>\n        <a class="linkgraph" href="#wsvisitas', '', '">\n          <p class="current">\n          <i class="fa fa-line-chart" aria-hidden="true"></i>', '</p>\n        </a>\n      </div>\n    </div>\n    <div class="row">\n      <div class="col m6 cont-variables">\n        <h5>Duraci\xF3n Promedio de una sesi\xF3n</h5>\n        <a class="linkgraph" href="#wstiempo', '', '">\n          <p class="current"><i class="fa fa-clock-o" aria-hidden="true"></i>', '</p>\n        </a>\n      </div>\n      <div class="col m6 cont-variables">\n        <h5>Porcentaje de Rebote</h5>\n        <a class="linkgraph" href="#wsrebote', '', '">\n          <p class="current">\n          <i class="fa fa-user-times" aria-hidden="true"></i>', '%</p>\n        </a>\n      </div>\n    </div>\n    <div class="row">\n        <div class="col m7 cont-variables " style="border-right-color: white;">\n            <h5>P\xE1ginas m\xE1s vistas</h5>\n            <p><a href="', '" target="_blank" style="color: #53a8c3;">1. ', '</a></p>\n            <p><a href="', '" target="_blank" style="color: #53a8c3;">2. ', '</a></p>\n            <p><a href="', '" target="_blank" style="color: #53a8c3;">3. ', '</a></p>\n        </div>\n        <div class="col m5 cont-variables" style="border-left-color: white;">\n            <h5>N\xFAmero de veces vistas </h5>\n            <p> ', ' vistos <br> ', ' vistos<br> ', ' vistos</p>\n        </div>\n    </div>\n    <div id="wssesion', '', '" class="tab-content-grafica" style="display:block">\n        <div class="row">\n          <div class="col m12 cont-ano-border">\n            <div class="cont-info-ano cont-total-fans-ano">\n              <div class="cont-titulo">\n                <i class="fa fa-sign-in" aria-hidden="true" style="color:black"></i>\n                <div class="con-der-titulo">\n                  <h5 style="margin-bottom: 0;">Sesiones</h5>\n                </div>\n              </div>\n               ', '\n            </div>\n          </div>\n        </div>\n    </div>\n    <div id="wsusuario', '', '" class="tab-content-grafica">\n        <div class="row">\n          <div class="col m12 cont-ano-border">\n            <div class="cont-info-ano cont-total-fans-ano">\n              <div class="cont-titulo">\n                <i class="fa fa-user" aria-hidden="true" style="color:black"></i>\n                <div class="con-der-titulo">\n                  <h5 style="margin-bottom: 0;">Usuarios</h5>\n                </div>\n              </div>\n               ', '\n            </div>\n          </div>\n        </div>\n    </div>\n    <div id="wsvisitas', '', '" class="tab-content-grafica">\n      <div class="row">\n        <div class="col m12 cont-ano-border">\n          <div class="cont-info-ano cont-total-fans-ano">\n            <div class="cont-titulo">\n              <i class="fa fa-line-chart" aria-hidden="true" style="color:black"></i>\n              <div class="con-der-titulo">\n                <h5 style="margin-bottom: 0;">Numero de visitas a p\xE1ginas</h5>\n              </div>\n            </div>\n            ', '\n          </div>\n        </div>\n      </div>\n    </div>\n    <div id="wstiempo', '', '" class="tab-content-grafica">\n      <div class="row">\n        <div class="col m12 cont-ano-border">\n          <div class="cont-info-ano cont-total-fans-ano">\n            <div class="cont-titulo">\n              <i class="fa fa-clock-o" aria-hidden="true" style="color:black"></i>\n              <div class="con-der-titulo">\n                <h5 style="margin-bottom: 0;">Duraci\xF3n Promedio de la sesi\xF3n</h5>\n              </div>\n            </div>\n            ', '\n          </div>\n        </div>\n      </div>\n    </div>\n    <div id="wsrebote', '', '" class="tab-content-grafica">\n      <div class="row">\n        <div class="col m12 cont-ano-border">\n          <div class="cont-info-ano cont-total-fans-ano">\n            <div class="cont-titulo">\n              <i class="fa fa-user-times" aria-hidden="true" style="color:black"></i>\n              <div class="con-der-titulo">\n                <h5 style="margin-bottom: 0;">Porcentaje de Rebote</h5>\n              </div>\n            </div>\n            ', '\n          </div>\n        </div>\n      </div>\n    </div>\n    <div class="row">\n      <div class="col m5">\n        <div class="col m12 cont-variables current" style="border-left: none !important;">\n          <h5>Demograf\xEDa</h5>\n            <a class="linktorta" href="#wstortaidiomas', '', '">\n              <p class="current">\n              <i class="fa fa-language" aria-hidden="true" style="color:black"></i> Idioma</p>\n            </a>\n        </div>\n        <div class="col m12 cont-variables current">\n          <a class="linktorta" href="#wstortapais', '', '">\n            <p class="current">\n            <i class="fa fa-globe" aria-hidden="true" style="color:black"></i> Pa\xEDs</p>\n          </a>\n        </div>\n        <div class="col m12 cont-variables current">\n          <a class="linktorta" href="#wstortaciudad', '', '">\n            <p class="current">\n            <i class="fa fa-building" aria-hidden="true" style="color:black"></i> Ciudad</p>\n          </a>\n        </div>\n        <div class="col m12 cont-variables">\n          <a class="linktorta" href="#wstortavisit', '', '">\n            <p class="current">\n            <i class="fa fa-users" aria-hidden="true" style="color:black"></i> Visitantes</p>\n          </a>\n        </div>\n      </div>\n      <div class="col m7 contDerTabsTortas">\n        <div id="wstortaidiomas', '', '" class="col m12 tab-content-torta cont-ano-border" >\n          <div class="cont-info-ano cont-tortas contTortas">\n            <div class="datos-tortas">\n              <div class="cont-labels wlabel">\n                <h5 class="color-edadp" style="color:#53a8c3"><i class="fa fa-square" aria-hidden="true"></i>Espa\xF1ol: </h5>\n                <p class="color-edadp"> ', '%</p>\n              </div>\n              <div class="cont-labels wlabel">\n                <h5 class="color-mujer"><i class="fa fa-square" aria-hidden="true"></i>Otros: </h5>\n                <p class="color-mujer"> ', '%</p>\n              </div>\n            </div>\n            ', '\n          </div>\n        </div>\n        <div id="wstortapais', '', '" class="col m12 tab-content-torta cont-ano-border">\n          <div class="cont-info-ano cont-tortas contTortas" >\n            <div class="datos-tortas">\n              <div class="cont-labels wlabel">\n                <h5 class="color-hombre" style="color:#e1bc29 !important"><i class="fa fa-square" aria-hidden="true"></i>Colombia:</h5>\n                <p class="color-hombre" style="color:#e1bc29 !important"> ', '%</p>\n              </div>\n              <div class="cont-labels wlabel">\n                <h5 class="color-mujer" style="color:#53A8C3 !important"><i class="fa fa-square" aria-hidden="true"></i>USA:</h5>\n                <p class="color-mujer" style="color:#53A8C3 !important"> ', '%</p>\n              </div>\n              <div class="cont-labels wlabel">\n                <h5 class="color-paiso" style="color:#3bb273"><i class="fa fa-square" aria-hidden="true"></i>Otros:</h5>\n                <p class="color-paiso"> ', '%</p>\n              </div>\n            </div>\n            ', '\n          </div>\n        </div>\n        <div id="wstortaciudad', '', '" class="col m12 tab-content-torta cont-ano-border" >\n          <div class="cont-info-ano cont-tortas contTortas" >\n            <div class="datos-tortas">\n              <div class="cont-labels wlabel">\n                <h5 class="color-paisp" style="color:#e1bc29;"><i class="fa fa-square" aria-hidden="true"></i>Medell\xEDn: </h5>\n                <p class="color-paisp">', '%</p>\n              </div>\n              <div class="cont-labels wlabel">\n                <h5 class="color-paiss" style="color:#53a8c3;"><i class="fa fa-square" aria-hidden="true"></i>New York:</h5>\n                <p class="color-paiss"> ', '% </p>\n              </div>\n              <div class="cont-labels wlabel">\n                <h5 class="color-paiso" style="color:#3bb273;"><i class="fa fa-square" aria-hidden="true"></i>Otros:</h5>\n                <p class="color-paiso"> ', '% </p>\n              </div>\n            </div>\n            ', '\n          </div>\n        </div>\n        <div id="wstortavisit', '', '" class="col m12 tab-content-torta cont-ano-border">\n          <div class="cont-info-ano cont-tortas contTortas">\n            <div class="datos-tortas" >\n              <div class="cont-labels wlabel">\n                <h5 class="color-mujer"><i class="fa fa-square" aria-hidden="true"></i> Nuevos: </h5>\n                <p class="color-mujer"> ', '%</p>\n              </div>\n              <div class="cont-labels wlabel">\n                <h5 class="color-hombre"><i class="fa fa-square" aria-hidden="true"></i> Recurrentes:</h5>\n                <p class="color-hombre">', '%</p>\n              </div>\n            </div>\n            ', '\n          </div>\n        </div>\n      </div>\n    </div>\n  </div>\n  </div>'], ['<div class="estadisticas">\n  <div id="wb', '', '" class="col m12 cont-datos tab-content-datos contAnalytics wb', '', '">\n    <div class="contHeaderVisual">\n      <div class="contTitleVisual">\n        <h4 class="title-mes">', ' - ', '</h4>\n      </div>\n      <div class="logo-cliente">\n        <img src="', '"  />\n      </div>\n    </div>\n    <h4>Audiencia</h4>\n    <div class="row">\n      <div class="col m4 cont-variables">\n        <h5>Sesiones</h5>\n        <a class="linkgraph" href="#wssesion', '', '">\n          <p class="current">\n          <i class="fa fa-sign-in" aria-hidden="true"></i>', '</p>\n        </a>\n      </div>\n      <div class="col m4 cont-variables">\n        <h5>Usuarios</h5>\n        <a class="linkgraph" href="#wsusuario', '', '">\n          <p class="current">\n          <i class="fa fa-user" aria-hidden="true"></i>', '</p>\n        </a>\n      </div>\n      <div class="col m4 cont-variables">\n        <h5>N\xFAmero de visitas a p\xE1ginas</h5>\n        <a class="linkgraph" href="#wsvisitas', '', '">\n          <p class="current">\n          <i class="fa fa-line-chart" aria-hidden="true"></i>', '</p>\n        </a>\n      </div>\n    </div>\n    <div class="row">\n      <div class="col m6 cont-variables">\n        <h5>Duraci\xF3n Promedio de una sesi\xF3n</h5>\n        <a class="linkgraph" href="#wstiempo', '', '">\n          <p class="current"><i class="fa fa-clock-o" aria-hidden="true"></i>', '</p>\n        </a>\n      </div>\n      <div class="col m6 cont-variables">\n        <h5>Porcentaje de Rebote</h5>\n        <a class="linkgraph" href="#wsrebote', '', '">\n          <p class="current">\n          <i class="fa fa-user-times" aria-hidden="true"></i>', '%</p>\n        </a>\n      </div>\n    </div>\n    <div class="row">\n        <div class="col m7 cont-variables " style="border-right-color: white;">\n            <h5>P\xE1ginas m\xE1s vistas</h5>\n            <p><a href="', '" target="_blank" style="color: #53a8c3;">1. ', '</a></p>\n            <p><a href="', '" target="_blank" style="color: #53a8c3;">2. ', '</a></p>\n            <p><a href="', '" target="_blank" style="color: #53a8c3;">3. ', '</a></p>\n        </div>\n        <div class="col m5 cont-variables" style="border-left-color: white;">\n            <h5>N\xFAmero de veces vistas </h5>\n            <p> ', ' vistos <br> ', ' vistos<br> ', ' vistos</p>\n        </div>\n    </div>\n    <div id="wssesion', '', '" class="tab-content-grafica" style="display:block">\n        <div class="row">\n          <div class="col m12 cont-ano-border">\n            <div class="cont-info-ano cont-total-fans-ano">\n              <div class="cont-titulo">\n                <i class="fa fa-sign-in" aria-hidden="true" style="color:black"></i>\n                <div class="con-der-titulo">\n                  <h5 style="margin-bottom: 0;">Sesiones</h5>\n                </div>\n              </div>\n               ', '\n            </div>\n          </div>\n        </div>\n    </div>\n    <div id="wsusuario', '', '" class="tab-content-grafica">\n        <div class="row">\n          <div class="col m12 cont-ano-border">\n            <div class="cont-info-ano cont-total-fans-ano">\n              <div class="cont-titulo">\n                <i class="fa fa-user" aria-hidden="true" style="color:black"></i>\n                <div class="con-der-titulo">\n                  <h5 style="margin-bottom: 0;">Usuarios</h5>\n                </div>\n              </div>\n               ', '\n            </div>\n          </div>\n        </div>\n    </div>\n    <div id="wsvisitas', '', '" class="tab-content-grafica">\n      <div class="row">\n        <div class="col m12 cont-ano-border">\n          <div class="cont-info-ano cont-total-fans-ano">\n            <div class="cont-titulo">\n              <i class="fa fa-line-chart" aria-hidden="true" style="color:black"></i>\n              <div class="con-der-titulo">\n                <h5 style="margin-bottom: 0;">Numero de visitas a p\xE1ginas</h5>\n              </div>\n            </div>\n            ', '\n          </div>\n        </div>\n      </div>\n    </div>\n    <div id="wstiempo', '', '" class="tab-content-grafica">\n      <div class="row">\n        <div class="col m12 cont-ano-border">\n          <div class="cont-info-ano cont-total-fans-ano">\n            <div class="cont-titulo">\n              <i class="fa fa-clock-o" aria-hidden="true" style="color:black"></i>\n              <div class="con-der-titulo">\n                <h5 style="margin-bottom: 0;">Duraci\xF3n Promedio de la sesi\xF3n</h5>\n              </div>\n            </div>\n            ', '\n          </div>\n        </div>\n      </div>\n    </div>\n    <div id="wsrebote', '', '" class="tab-content-grafica">\n      <div class="row">\n        <div class="col m12 cont-ano-border">\n          <div class="cont-info-ano cont-total-fans-ano">\n            <div class="cont-titulo">\n              <i class="fa fa-user-times" aria-hidden="true" style="color:black"></i>\n              <div class="con-der-titulo">\n                <h5 style="margin-bottom: 0;">Porcentaje de Rebote</h5>\n              </div>\n            </div>\n            ', '\n          </div>\n        </div>\n      </div>\n    </div>\n    <div class="row">\n      <div class="col m5">\n        <div class="col m12 cont-variables current" style="border-left: none !important;">\n          <h5>Demograf\xEDa</h5>\n            <a class="linktorta" href="#wstortaidiomas', '', '">\n              <p class="current">\n              <i class="fa fa-language" aria-hidden="true" style="color:black"></i> Idioma</p>\n            </a>\n        </div>\n        <div class="col m12 cont-variables current">\n          <a class="linktorta" href="#wstortapais', '', '">\n            <p class="current">\n            <i class="fa fa-globe" aria-hidden="true" style="color:black"></i> Pa\xEDs</p>\n          </a>\n        </div>\n        <div class="col m12 cont-variables current">\n          <a class="linktorta" href="#wstortaciudad', '', '">\n            <p class="current">\n            <i class="fa fa-building" aria-hidden="true" style="color:black"></i> Ciudad</p>\n          </a>\n        </div>\n        <div class="col m12 cont-variables">\n          <a class="linktorta" href="#wstortavisit', '', '">\n            <p class="current">\n            <i class="fa fa-users" aria-hidden="true" style="color:black"></i> Visitantes</p>\n          </a>\n        </div>\n      </div>\n      <div class="col m7 contDerTabsTortas">\n        <div id="wstortaidiomas', '', '" class="col m12 tab-content-torta cont-ano-border" >\n          <div class="cont-info-ano cont-tortas contTortas">\n            <div class="datos-tortas">\n              <div class="cont-labels wlabel">\n                <h5 class="color-edadp" style="color:#53a8c3"><i class="fa fa-square" aria-hidden="true"></i>Espa\xF1ol: </h5>\n                <p class="color-edadp"> ', '%</p>\n              </div>\n              <div class="cont-labels wlabel">\n                <h5 class="color-mujer"><i class="fa fa-square" aria-hidden="true"></i>Otros: </h5>\n                <p class="color-mujer"> ', '%</p>\n              </div>\n            </div>\n            ', '\n          </div>\n        </div>\n        <div id="wstortapais', '', '" class="col m12 tab-content-torta cont-ano-border">\n          <div class="cont-info-ano cont-tortas contTortas" >\n            <div class="datos-tortas">\n              <div class="cont-labels wlabel">\n                <h5 class="color-hombre" style="color:#e1bc29 !important"><i class="fa fa-square" aria-hidden="true"></i>Colombia:</h5>\n                <p class="color-hombre" style="color:#e1bc29 !important"> ', '%</p>\n              </div>\n              <div class="cont-labels wlabel">\n                <h5 class="color-mujer" style="color:#53A8C3 !important"><i class="fa fa-square" aria-hidden="true"></i>USA:</h5>\n                <p class="color-mujer" style="color:#53A8C3 !important"> ', '%</p>\n              </div>\n              <div class="cont-labels wlabel">\n                <h5 class="color-paiso" style="color:#3bb273"><i class="fa fa-square" aria-hidden="true"></i>Otros:</h5>\n                <p class="color-paiso"> ', '%</p>\n              </div>\n            </div>\n            ', '\n          </div>\n        </div>\n        <div id="wstortaciudad', '', '" class="col m12 tab-content-torta cont-ano-border" >\n          <div class="cont-info-ano cont-tortas contTortas" >\n            <div class="datos-tortas">\n              <div class="cont-labels wlabel">\n                <h5 class="color-paisp" style="color:#e1bc29;"><i class="fa fa-square" aria-hidden="true"></i>Medell\xEDn: </h5>\n                <p class="color-paisp">', '%</p>\n              </div>\n              <div class="cont-labels wlabel">\n                <h5 class="color-paiss" style="color:#53a8c3;"><i class="fa fa-square" aria-hidden="true"></i>New York:</h5>\n                <p class="color-paiss"> ', '% </p>\n              </div>\n              <div class="cont-labels wlabel">\n                <h5 class="color-paiso" style="color:#3bb273;"><i class="fa fa-square" aria-hidden="true"></i>Otros:</h5>\n                <p class="color-paiso"> ', '% </p>\n              </div>\n            </div>\n            ', '\n          </div>\n        </div>\n        <div id="wstortavisit', '', '" class="col m12 tab-content-torta cont-ano-border">\n          <div class="cont-info-ano cont-tortas contTortas">\n            <div class="datos-tortas" >\n              <div class="cont-labels wlabel">\n                <h5 class="color-mujer"><i class="fa fa-square" aria-hidden="true"></i> Nuevos: </h5>\n                <p class="color-mujer"> ', '%</p>\n              </div>\n              <div class="cont-labels wlabel">\n                <h5 class="color-hombre"><i class="fa fa-square" aria-hidden="true"></i> Recurrentes:</h5>\n                <p class="color-hombre">', '%</p>\n              </div>\n            </div>\n            ', '\n          </div>\n        </div>\n      </div>\n    </div>\n  </div>\n  </div>']),
    _templateObject2 = _taggedTemplateLiteral(['<div>\n    <canvas id="wssesiondatos', '', '" width="1100" height="400"></canvas>\n    <script>\n      if(\'', '\' == \'month\'){\n        function chartSessions(){\n\n            var LineChart = {\n              labels: ["D\xEDa 1", "D\xEDa 2","D\xEDa 3","D\xEDa 4","D\xEDa 5","D\xEDa 6","D\xEDa 7","D\xEDa 8","D\xEDa 9","D\xEDa 10","D\xEDa 11","D\xEDa 12","D\xEDa 13","D\xEDa 14","D\xEDa 15","D\xEDa 16","D\xEDa 17","D\xEDa 18","D\xEDa 19","D\xEDa 20","D\xEDa 21","D\xEDa 22","D\xEDa 23","D\xEDa 24","D\xEDa 25","D\xEDa 26","D\xEDa 27","D\xEDa 28","D\xEDa 29","D\xEDa 30","D\xEDa 31"],\n              datasets: [{\n                fillColor: "rgba(83, 168, 195, 0.52)",\n                strokeColor: "rgb(83, 168, 195)",\n                pointColor: "rgba(220,220,220,1)",\n                pointStrokeColor: "#fff",\n                data: [', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ']\n              }]\n            }\n          var ctx = document.getElementById("wssesiondatos', '', '").getContext("2d");\n          var myLineChart = new Chart(ctx).Line(LineChart, {scaleFontSize : 13, scaleFontColor : "#000000"});\n        }\n      }\n      chartSessions();\n    </script>\n    </div>'], ['<div>\n    <canvas id="wssesiondatos', '', '" width="1100" height="400"></canvas>\n    <script>\n      if(\'', '\' == \'month\'){\n        function chartSessions(){\n\n            var LineChart = {\n              labels: ["D\xEDa 1", "D\xEDa 2","D\xEDa 3","D\xEDa 4","D\xEDa 5","D\xEDa 6","D\xEDa 7","D\xEDa 8","D\xEDa 9","D\xEDa 10","D\xEDa 11","D\xEDa 12","D\xEDa 13","D\xEDa 14","D\xEDa 15","D\xEDa 16","D\xEDa 17","D\xEDa 18","D\xEDa 19","D\xEDa 20","D\xEDa 21","D\xEDa 22","D\xEDa 23","D\xEDa 24","D\xEDa 25","D\xEDa 26","D\xEDa 27","D\xEDa 28","D\xEDa 29","D\xEDa 30","D\xEDa 31"],\n              datasets: [{\n                fillColor: "rgba(83, 168, 195, 0.52)",\n                strokeColor: "rgb(83, 168, 195)",\n                pointColor: "rgba(220,220,220,1)",\n                pointStrokeColor: "#fff",\n                data: [', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ']\n              }]\n            }\n          var ctx = document.getElementById("wssesiondatos', '', '").getContext("2d");\n          var myLineChart = new Chart(ctx).Line(LineChart, {scaleFontSize : 13, scaleFontColor : "#000000"});\n        }\n      }\n      chartSessions();\n    </script>\n    </div>']),
    _templateObject3 = _taggedTemplateLiteral(['<div>\n    <canvas id="wsusuariodatos', '', '" width="1100" height="400"></canvas>\n    <script>\n      if(\'', '\' == \'month\'){\n        function chartUsers(){\n\n            var LineChart = {\n              labels: ["D\xEDa 1", "D\xEDa 2","D\xEDa 3","D\xEDa 4","D\xEDa 5","D\xEDa 6","D\xEDa 7","D\xEDa 8","D\xEDa 9","D\xEDa 10","D\xEDa 11","D\xEDa 12","D\xEDa 13","D\xEDa 14","D\xEDa 15","D\xEDa 16","D\xEDa 17","D\xEDa 18","D\xEDa 19","D\xEDa 20","D\xEDa 21","D\xEDa 22","D\xEDa 23","D\xEDa 24","D\xEDa 25","D\xEDa 26","D\xEDa 27","D\xEDa 28","D\xEDa 29","D\xEDa 30","D\xEDa 31"],\n              datasets: [{\n                fillColor: "rgba(59, 178, 115, 0.52)",\n                strokeColor: "rgb(59, 178, 115)",\n                pointColor: "rgba(220,220,220,1)",\n                pointStrokeColor: "#fff",\n                data: [', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ']\n              }]\n            }\n          var ctx = document.getElementById("wsusuariodatos', '', '").getContext("2d");\n          var myLineChart = new Chart(ctx).Line(LineChart, {scaleFontSize : 13, scaleFontColor : "#000000"});\n        }\n      }\n      chartUsers();\n    </script>\n    </div>'], ['<div>\n    <canvas id="wsusuariodatos', '', '" width="1100" height="400"></canvas>\n    <script>\n      if(\'', '\' == \'month\'){\n        function chartUsers(){\n\n            var LineChart = {\n              labels: ["D\xEDa 1", "D\xEDa 2","D\xEDa 3","D\xEDa 4","D\xEDa 5","D\xEDa 6","D\xEDa 7","D\xEDa 8","D\xEDa 9","D\xEDa 10","D\xEDa 11","D\xEDa 12","D\xEDa 13","D\xEDa 14","D\xEDa 15","D\xEDa 16","D\xEDa 17","D\xEDa 18","D\xEDa 19","D\xEDa 20","D\xEDa 21","D\xEDa 22","D\xEDa 23","D\xEDa 24","D\xEDa 25","D\xEDa 26","D\xEDa 27","D\xEDa 28","D\xEDa 29","D\xEDa 30","D\xEDa 31"],\n              datasets: [{\n                fillColor: "rgba(59, 178, 115, 0.52)",\n                strokeColor: "rgb(59, 178, 115)",\n                pointColor: "rgba(220,220,220,1)",\n                pointStrokeColor: "#fff",\n                data: [', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ']\n              }]\n            }\n          var ctx = document.getElementById("wsusuariodatos', '', '").getContext("2d");\n          var myLineChart = new Chart(ctx).Line(LineChart, {scaleFontSize : 13, scaleFontColor : "#000000"});\n        }\n      }\n      chartUsers();\n    </script>\n    </div>']),
    _templateObject4 = _taggedTemplateLiteral(['<div>\n    <canvas id="wsvisitasdatos', '', '" width="1100" height="400"></canvas>\n    <script>\n      if(\'', '\' == \'month\'){\n        function chartPageViews(){\n\n            var LineChart = {\n              labels: ["D\xEDa 1", "D\xEDa 2","D\xEDa 3","D\xEDa 4","D\xEDa 5","D\xEDa 6","D\xEDa 7","D\xEDa 8","D\xEDa 9","D\xEDa 10","D\xEDa 11","D\xEDa 12","D\xEDa 13","D\xEDa 14","D\xEDa 15","D\xEDa 16","D\xEDa 17","D\xEDa 18","D\xEDa 19","D\xEDa 20","D\xEDa 21","D\xEDa 22","D\xEDa 23","D\xEDa 24","D\xEDa 25","D\xEDa 26","D\xEDa 27","D\xEDa 28","D\xEDa 29","D\xEDa 30","D\xEDa 31"],\n              datasets: [{\n                fillColor: "rgba(225, 188, 41, 0.52)",\n                strokeColor: "rgb(225, 188, 41)",\n                pointColor: "rgba(220,220,220,1)",\n                pointStrokeColor: "#fff",\n                data: [', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ']\n              }]\n            }\n          var ctx = document.getElementById("wsvisitasdatos', '', '").getContext("2d");\n          var myLineChart = new Chart(ctx).Line(LineChart, {scaleFontSize : 13, scaleFontColor : "#000000"});\n        }\n      }\n      chartPageViews();\n    </script>\n    </div>'], ['<div>\n    <canvas id="wsvisitasdatos', '', '" width="1100" height="400"></canvas>\n    <script>\n      if(\'', '\' == \'month\'){\n        function chartPageViews(){\n\n            var LineChart = {\n              labels: ["D\xEDa 1", "D\xEDa 2","D\xEDa 3","D\xEDa 4","D\xEDa 5","D\xEDa 6","D\xEDa 7","D\xEDa 8","D\xEDa 9","D\xEDa 10","D\xEDa 11","D\xEDa 12","D\xEDa 13","D\xEDa 14","D\xEDa 15","D\xEDa 16","D\xEDa 17","D\xEDa 18","D\xEDa 19","D\xEDa 20","D\xEDa 21","D\xEDa 22","D\xEDa 23","D\xEDa 24","D\xEDa 25","D\xEDa 26","D\xEDa 27","D\xEDa 28","D\xEDa 29","D\xEDa 30","D\xEDa 31"],\n              datasets: [{\n                fillColor: "rgba(225, 188, 41, 0.52)",\n                strokeColor: "rgb(225, 188, 41)",\n                pointColor: "rgba(220,220,220,1)",\n                pointStrokeColor: "#fff",\n                data: [', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ']\n              }]\n            }\n          var ctx = document.getElementById("wsvisitasdatos', '', '").getContext("2d");\n          var myLineChart = new Chart(ctx).Line(LineChart, {scaleFontSize : 13, scaleFontColor : "#000000"});\n        }\n      }\n      chartPageViews();\n    </script>\n    </div>']),
    _templateObject5 = _taggedTemplateLiteral(['<div>\n    <canvas id="wstiempodatos', '', '" width="1100" height="400"></canvas>\n    <script>\n      if(\'', '\' == \'month\'){\n        function chartDurationProm(){\n\n            var LineChart = {\n              labels: ["D\xEDa 1", "D\xEDa 2","D\xEDa 3","D\xEDa 4","D\xEDa 5","D\xEDa 6","D\xEDa 7","D\xEDa 8","D\xEDa 9","D\xEDa 10","D\xEDa 11","D\xEDa 12","D\xEDa 13","D\xEDa 14","D\xEDa 15","D\xEDa 16","D\xEDa 17","D\xEDa 18","D\xEDa 19","D\xEDa 20","D\xEDa 21","D\xEDa 22","D\xEDa 23","D\xEDa 24","D\xEDa 25","D\xEDa 26","D\xEDa 27","D\xEDa 28","D\xEDa 29","D\xEDa 30","D\xEDa 31"],\n              datasets: [{\n                fillColor: "rgba(243, 146, 55, 0.52)",\n                strokeColor: "rgb(243, 146, 55)",\n                pointColor: "rgba(220,220,220,1)",\n                pointStrokeColor: "#fff",\n                data: [', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ']\n              }]\n            }\n          var ctx = document.getElementById("wstiempodatos', '', '").getContext("2d");\n          var myLineChart = new Chart(ctx).Line(LineChart, {scaleFontSize : 13, scaleFontColor : "#000000"});\n        }\n      }\n      chartDurationProm();\n    </script>\n    </div>'], ['<div>\n    <canvas id="wstiempodatos', '', '" width="1100" height="400"></canvas>\n    <script>\n      if(\'', '\' == \'month\'){\n        function chartDurationProm(){\n\n            var LineChart = {\n              labels: ["D\xEDa 1", "D\xEDa 2","D\xEDa 3","D\xEDa 4","D\xEDa 5","D\xEDa 6","D\xEDa 7","D\xEDa 8","D\xEDa 9","D\xEDa 10","D\xEDa 11","D\xEDa 12","D\xEDa 13","D\xEDa 14","D\xEDa 15","D\xEDa 16","D\xEDa 17","D\xEDa 18","D\xEDa 19","D\xEDa 20","D\xEDa 21","D\xEDa 22","D\xEDa 23","D\xEDa 24","D\xEDa 25","D\xEDa 26","D\xEDa 27","D\xEDa 28","D\xEDa 29","D\xEDa 30","D\xEDa 31"],\n              datasets: [{\n                fillColor: "rgba(243, 146, 55, 0.52)",\n                strokeColor: "rgb(243, 146, 55)",\n                pointColor: "rgba(220,220,220,1)",\n                pointStrokeColor: "#fff",\n                data: [', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ']\n              }]\n            }\n          var ctx = document.getElementById("wstiempodatos', '', '").getContext("2d");\n          var myLineChart = new Chart(ctx).Line(LineChart, {scaleFontSize : 13, scaleFontColor : "#000000"});\n        }\n      }\n      chartDurationProm();\n    </script>\n    </div>']),
    _templateObject6 = _taggedTemplateLiteral(['<div>\n    <canvas id="wsrebotedatos', '', '" width="1100" height="400"></canvas>\n    <script>\n      if(\'', '\' == \'month\'){\n        function chartRebotePor(){\n\n            var LineChart = {\n              labels: ["D\xEDa 1", "D\xEDa 2","D\xEDa 3","D\xEDa 4","D\xEDa 5","D\xEDa 6","D\xEDa 7","D\xEDa 8","D\xEDa 9","D\xEDa 10","D\xEDa 11","D\xEDa 12","D\xEDa 13","D\xEDa 14","D\xEDa 15","D\xEDa 16","D\xEDa 17","D\xEDa 18","D\xEDa 19","D\xEDa 20","D\xEDa 21","D\xEDa 22","D\xEDa 23","D\xEDa 24","D\xEDa 25","D\xEDa 26","D\xEDa 27","D\xEDa 28","D\xEDa 29","D\xEDa 30","D\xEDa 31"],\n              datasets: [{\n                fillColor: "rgba(250, 172, 237, 0.52)",\n                strokeColor: "rgb(250, 172, 237)",\n                pointColor: "rgba(220,220,220,1)",\n                pointStrokeColor: "#fff",\n                data: [', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ']\n              }]\n            }\n          var ctx = document.getElementById("wsrebotedatos', '', '").getContext("2d");\n          var myLineChart = new Chart(ctx).Line(LineChart, {scaleFontSize : 13, scaleFontColor : "#000000"});\n        }\n      }\n      chartRebotePor();\n    </script>\n    </div>'], ['<div>\n    <canvas id="wsrebotedatos', '', '" width="1100" height="400"></canvas>\n    <script>\n      if(\'', '\' == \'month\'){\n        function chartRebotePor(){\n\n            var LineChart = {\n              labels: ["D\xEDa 1", "D\xEDa 2","D\xEDa 3","D\xEDa 4","D\xEDa 5","D\xEDa 6","D\xEDa 7","D\xEDa 8","D\xEDa 9","D\xEDa 10","D\xEDa 11","D\xEDa 12","D\xEDa 13","D\xEDa 14","D\xEDa 15","D\xEDa 16","D\xEDa 17","D\xEDa 18","D\xEDa 19","D\xEDa 20","D\xEDa 21","D\xEDa 22","D\xEDa 23","D\xEDa 24","D\xEDa 25","D\xEDa 26","D\xEDa 27","D\xEDa 28","D\xEDa 29","D\xEDa 30","D\xEDa 31"],\n              datasets: [{\n                fillColor: "rgba(250, 172, 237, 0.52)",\n                strokeColor: "rgb(250, 172, 237)",\n                pointColor: "rgba(220,220,220,1)",\n                pointStrokeColor: "#fff",\n                data: [', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ', ']\n              }]\n            }\n          var ctx = document.getElementById("wsrebotedatos', '', '").getContext("2d");\n          var myLineChart = new Chart(ctx).Line(LineChart, {scaleFontSize : 13, scaleFontColor : "#000000"});\n        }\n      }\n      chartRebotePor();\n    </script>\n    </div>']),
    _templateObject7 = _taggedTemplateLiteral(['<div>\n      <canvas id="idiomas', '', '" width="150" height="150"></canvas>\n      <script>\n        if(\'', '\' == \'month\'){\n          function chartLanguage(){\n            var idiomaData = [\n           \t\t\t\t{\n           \t\t\t\t\tvalue: ', ',\n           \t\t\t\t\tcolor:"#53a8c3",\n           \t\t\t\t\thighlight: "rgba(83, 168, 195, 0.8)",\n           \t\t\t\t\tlabel: "Espa\xF1ol"},\n           \t\t\t\t{\n           \t\t\t\t\tvalue: ', ',\n           \t\t\t\t\tcolor: "#F39237",\n           \t\t\t\t\thighlight: "rgba(243,146,55,0.8)",\n           \t\t\t\t\tlabel: "Otros"\n           \t\t\t\t}\n           \t\t\t];\n\n            var ctx = document.getElementById("idiomas', '', '").getContext("2d");\n            window.myPie = new Chart(ctx).Pie(idiomaData);\n          }\n        }\n        chartLanguage();\n      </script>\n    </div>'], ['<div>\n      <canvas id="idiomas', '', '" width="150" height="150"></canvas>\n      <script>\n        if(\'', '\' == \'month\'){\n          function chartLanguage(){\n            var idiomaData = [\n           \t\t\t\t{\n           \t\t\t\t\tvalue: ', ',\n           \t\t\t\t\tcolor:"#53a8c3",\n           \t\t\t\t\thighlight: "rgba(83, 168, 195, 0.8)",\n           \t\t\t\t\tlabel: "Espa\xF1ol"},\n           \t\t\t\t{\n           \t\t\t\t\tvalue: ', ',\n           \t\t\t\t\tcolor: "#F39237",\n           \t\t\t\t\thighlight: "rgba(243,146,55,0.8)",\n           \t\t\t\t\tlabel: "Otros"\n           \t\t\t\t}\n           \t\t\t];\n\n            var ctx = document.getElementById("idiomas', '', '").getContext("2d");\n            window.myPie = new Chart(ctx).Pie(idiomaData);\n          }\n        }\n        chartLanguage();\n      </script>\n    </div>']),
    _templateObject8 = _taggedTemplateLiteral(['<div>\n        <canvas id="paises', '', '" width="150" height="150"></canvas>\n        <script>\n          if(\'', '\' == \'month\'){\n            function chartCountry(){\n              var paisData = [\n           \t\t\t\t{\n           \t\t\t\t\tvalue: ', ',\n           \t\t\t\t\tcolor:"#E1BC29",\n           \t\t\t\t\thighlight: "rgba(225,188,41,0.80)",\n           \t\t\t\t\tlabel: "Colombia"},\n           \t\t\t\t{\n           \t\t\t\t\tvalue: ', ',\n           \t\t\t\t\tcolor: "#53A8C3",\n           \t\t\t\t\thighlight: "rgba(83,168,195,0.80)",\n           \t\t\t\t\tlabel: "USA"},\n           \t\t\t\t{\n           \t\t\t\t\tvalue: ', ',\n           \t\t\t\t\tcolor: "#3bb273",\n           \t\t\t\t\thighlight: "rgba(59,178,115,0.8)",\n           \t\t\t\t\tlabel: "Otros"\n           \t\t\t\t}\n           \t\t\t];\n              var ctx = document.getElementById("paises', '', '").getContext("2d");\n              window.myPie = new Chart(ctx).Pie(paisData);\n            }\n          }\n          chartCountry();\n        </script>\n      </div>'], ['<div>\n        <canvas id="paises', '', '" width="150" height="150"></canvas>\n        <script>\n          if(\'', '\' == \'month\'){\n            function chartCountry(){\n              var paisData = [\n           \t\t\t\t{\n           \t\t\t\t\tvalue: ', ',\n           \t\t\t\t\tcolor:"#E1BC29",\n           \t\t\t\t\thighlight: "rgba(225,188,41,0.80)",\n           \t\t\t\t\tlabel: "Colombia"},\n           \t\t\t\t{\n           \t\t\t\t\tvalue: ', ',\n           \t\t\t\t\tcolor: "#53A8C3",\n           \t\t\t\t\thighlight: "rgba(83,168,195,0.80)",\n           \t\t\t\t\tlabel: "USA"},\n           \t\t\t\t{\n           \t\t\t\t\tvalue: ', ',\n           \t\t\t\t\tcolor: "#3bb273",\n           \t\t\t\t\thighlight: "rgba(59,178,115,0.8)",\n           \t\t\t\t\tlabel: "Otros"\n           \t\t\t\t}\n           \t\t\t];\n              var ctx = document.getElementById("paises', '', '").getContext("2d");\n              window.myPie = new Chart(ctx).Pie(paisData);\n            }\n          }\n          chartCountry();\n        </script>\n      </div>']),
    _templateObject9 = _taggedTemplateLiteral(['<div>\n          <canvas id="ciudad', '', '" width="150" height="150"></canvas>\n          <script>\n            if(\'', '\' == \'month\'){\n              function chartCity(){\n                var ciudadesData = [\n                    {\n                      value: ', ',\n                      color:"#E1BC29",\n                      highlight: "rgba(225,188,41,0.80)",\n                      label: "Medell\xEDn"},\n                    {\n                      value: ', ',\n                      color: "#53A8C3",\n                      highlight: "rgba(83,168,195,0.80)",\n                      label: "New York"},\n                    {\n                      value: ', ',\n                      color: "#3bb273",\n                      highlight: "rgba(59,178,115,0.8)",\n                      label: "Otros"\n                    }\n                  ];\n                var ctx = document.getElementById("ciudad', '', '").getContext("2d");\n                window.myPie = new Chart(ctx).Pie(ciudadesData);\n              }\n            }\n            chartCity();\n          </script>\n        </div>'], ['<div>\n          <canvas id="ciudad', '', '" width="150" height="150"></canvas>\n          <script>\n            if(\'', '\' == \'month\'){\n              function chartCity(){\n                var ciudadesData = [\n                    {\n                      value: ', ',\n                      color:"#E1BC29",\n                      highlight: "rgba(225,188,41,0.80)",\n                      label: "Medell\xEDn"},\n                    {\n                      value: ', ',\n                      color: "#53A8C3",\n                      highlight: "rgba(83,168,195,0.80)",\n                      label: "New York"},\n                    {\n                      value: ', ',\n                      color: "#3bb273",\n                      highlight: "rgba(59,178,115,0.8)",\n                      label: "Otros"\n                    }\n                  ];\n                var ctx = document.getElementById("ciudad', '', '").getContext("2d");\n                window.myPie = new Chart(ctx).Pie(ciudadesData);\n              }\n            }\n            chartCity();\n          </script>\n        </div>']),
    _templateObject10 = _taggedTemplateLiteral(['<div>\n      <canvas id="visit', '', '" width="150" height="150"></canvas>\n      <script>\n        if(\'', '\' == \'month\'){\n          function chartVisit(){\n            var visitData = [\n           \t\t\t\t{\n           \t\t\t\t\tvalue: ', ',\n           \t\t\t\t\tcolor:"#F39237",\n           \t\t\t\t\thighlight: "rgba(243,146,55,0.8)",\n           \t\t\t\t\tlabel: "Nuevos"},\n           \t\t\t\t{\n           \t\t\t\t\tvalue: ', ',\n           \t\t\t\t\tcolor: "#53a8c3",\n           \t\t\t\t\thighlight: "rgba(83, 168, 195, 0.8)",\n           \t\t\t\t\tlabel: "Recurrentes"\n           \t\t\t\t}\n           \t\t\t];\n\n            var ctx = document.getElementById("visit', '', '").getContext("2d");\n            window.myPie = new Chart(ctx).Pie(visitData);\n          }\n        }\n        chartVisit();\n      </script>\n    </div>'], ['<div>\n      <canvas id="visit', '', '" width="150" height="150"></canvas>\n      <script>\n        if(\'', '\' == \'month\'){\n          function chartVisit(){\n            var visitData = [\n           \t\t\t\t{\n           \t\t\t\t\tvalue: ', ',\n           \t\t\t\t\tcolor:"#F39237",\n           \t\t\t\t\thighlight: "rgba(243,146,55,0.8)",\n           \t\t\t\t\tlabel: "Nuevos"},\n           \t\t\t\t{\n           \t\t\t\t\tvalue: ', ',\n           \t\t\t\t\tcolor: "#53a8c3",\n           \t\t\t\t\thighlight: "rgba(83, 168, 195, 0.8)",\n           \t\t\t\t\tlabel: "Recurrentes"\n           \t\t\t\t}\n           \t\t\t];\n\n            var ctx = document.getElementById("visit', '', '").getContext("2d");\n            window.myPie = new Chart(ctx).Pie(visitData);\n          }\n        }\n        chartVisit();\n      </script>\n    </div>']);

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var yo = require('yo-yo');

module.exports = function (ctx, dato) {
  return yo(_templateObject, dato.year, dato.month, dato.year, dato.month, dato.month, dato.year, ctx.auth.src, dato.year, dato.month, dato.sessionst || 0, dato.year, dato.month, dato.usuariosactit || 0, dato.year, dato.month, dato.numpageviewst || 0, dato.year, dato.month, dato.timepromt || 0, dato.year, dato.month, dato.reboteport || 0, dato.urlpagmoreview1 || 0, dato.pagmoreview1 || 0, dato.urlpagmoreview2 || 0, dato.pagmoreview2 || 0, dato.urlpagmoreview3 || 0, dato.pagmoreview3 || 0, dato.numpagmoreview1 || 0, dato.numpagmoreview2 || 0, dato.numpagmoreview3 || 0, dato.year, dato.month, generarChartSessions(dato), dato.year, dato.month, generarChartUsuarios(dato), dato.year, dato.month, generarChartNumPageViews(dato), dato.year, dato.month, generarChartDuracionProm(dato), dato.year, dato.month, generarChartRebotePor(dato), dato.year, dato.month, dato.year, dato.month, dato.year, dato.month, dato.year, dato.month, dato.year, dato.month, dato.language.ppal || 0, dato.language.others || 0, generarChartLanguage(dato), dato.year, dato.month, dato.country.ppal || 0, dato.country.sec || 0, dato.country.others || 0, generarChartCountry(dato), dato.year, dato.month, dato.city.ppal || 0, dato.city.sec || 0, dato.city.others || 0, generarChartCity(dato), dato.year, dato.month, dato.visit.visitnews || 0, dato.visit.visitrecurrent || 0, generarChartVisitMonth(dato));

  function generarChartSessions(dato) {
    return yo(_templateObject2, dato.month, dato.year, dato.type, dato.sessionsmonth.month.day1, dato.sessionsmonth.month.day2, dato.sessionsmonth.month.day3, dato.sessionsmonth.month.day4, dato.sessionsmonth.month.day5, dato.sessionsmonth.month.day6, dato.sessionsmonth.month.day7, dato.sessionsmonth.month.day8, dato.sessionsmonth.month.day9, dato.sessionsmonth.month.day10, dato.sessionsmonth.month.day11, dato.sessionsmonth.month.day12, dato.sessionsmonth.month.day13, dato.sessionsmonth.month.day14, dato.sessionsmonth.month.day15, dato.sessionsmonth.month.day16, dato.sessionsmonth.month.day17, dato.sessionsmonth.month.day18, dato.sessionsmonth.month.day19, dato.sessionsmonth.month.day20, dato.sessionsmonth.month.day21, dato.sessionsmonth.month.day22, dato.sessionsmonth.month.day23, dato.sessionsmonth.month.day24, dato.sessionsmonth.month.day25, dato.sessionsmonth.month.day26, dato.sessionsmonth.month.day27, dato.sessionsmonth.month.day28, dato.sessionsmonth.month.day29, dato.sessionsmonth.month.day30, dato.sessionsmonth.month.day31, dato.month, dato.year);
  }

  function generarChartUsuarios(dato) {
    return yo(_templateObject3, dato.month, dato.year, dato.type, dato.usuariosactimonth.month.day1, dato.usuariosactimonth.month.day2, dato.usuariosactimonth.month.day3, dato.usuariosactimonth.month.day4, dato.usuariosactimonth.month.day5, dato.usuariosactimonth.month.day6, dato.usuariosactimonth.month.day7, dato.usuariosactimonth.month.day8, dato.usuariosactimonth.month.day9, dato.usuariosactimonth.month.day10, dato.usuariosactimonth.month.day11, dato.usuariosactimonth.month.day12, dato.usuariosactimonth.month.day13, dato.usuariosactimonth.month.day14, dato.usuariosactimonth.month.day15, dato.usuariosactimonth.month.day16, dato.usuariosactimonth.month.day17, dato.usuariosactimonth.month.day18, dato.usuariosactimonth.month.day19, dato.usuariosactimonth.month.day20, dato.usuariosactimonth.month.day21, dato.usuariosactimonth.month.day22, dato.usuariosactimonth.month.day23, dato.usuariosactimonth.month.day24, dato.usuariosactimonth.month.day25, dato.usuariosactimonth.month.day26, dato.usuariosactimonth.month.day27, dato.usuariosactimonth.month.day28, dato.usuariosactimonth.month.day29, dato.usuariosactimonth.month.day30, dato.usuariosactimonth.month.day31, dato.month, dato.year);
  }

  function generarChartNumPageViews(dato) {
    return yo(_templateObject4, dato.month, dato.year, dato.type, dato.numpageviewsmonth.month.day1, dato.numpageviewsmonth.month.day2, dato.numpageviewsmonth.month.day3, dato.numpageviewsmonth.month.day4, dato.numpageviewsmonth.month.day5, dato.numpageviewsmonth.month.day6, dato.numpageviewsmonth.month.day7, dato.numpageviewsmonth.month.day8, dato.numpageviewsmonth.month.day9, dato.numpageviewsmonth.month.day10, dato.numpageviewsmonth.month.day11, dato.numpageviewsmonth.month.day12, dato.numpageviewsmonth.month.day13, dato.numpageviewsmonth.month.day14, dato.numpageviewsmonth.month.day15, dato.numpageviewsmonth.month.day16, dato.numpageviewsmonth.month.day17, dato.numpageviewsmonth.month.day18, dato.numpageviewsmonth.month.day19, dato.numpageviewsmonth.month.day20, dato.numpageviewsmonth.month.day21, dato.numpageviewsmonth.month.day22, dato.numpageviewsmonth.month.day23, dato.numpageviewsmonth.month.day24, dato.numpageviewsmonth.month.day25, dato.numpageviewsmonth.month.day26, dato.numpageviewsmonth.month.day27, dato.numpageviewsmonth.month.day28, dato.numpageviewsmonth.month.day29, dato.numpageviewsmonth.month.day30, dato.numpageviewsmonth.month.day31, dato.month, dato.year);
  }

  function generarChartDuracionProm(dato) {
    return yo(_templateObject5, dato.month, dato.year, dato.type, dato.timeprommonth.month.day1, dato.timeprommonth.month.day2, dato.timeprommonth.month.day3, dato.timeprommonth.month.day4, dato.timeprommonth.month.day5, dato.timeprommonth.month.day6, dato.timeprommonth.month.day7, dato.timeprommonth.month.day8, dato.timeprommonth.month.day9, dato.timeprommonth.month.day10, dato.timeprommonth.month.day11, dato.timeprommonth.month.day12, dato.timeprommonth.month.day13, dato.timeprommonth.month.day14, dato.timeprommonth.month.day15, dato.timeprommonth.month.day16, dato.timeprommonth.month.day17, dato.timeprommonth.month.day18, dato.timeprommonth.month.day19, dato.timeprommonth.month.day20, dato.timeprommonth.month.day21, dato.timeprommonth.month.day22, dato.timeprommonth.month.day23, dato.timeprommonth.month.day24, dato.timeprommonth.month.day25, dato.timeprommonth.month.day26, dato.timeprommonth.month.day27, dato.timeprommonth.month.day28, dato.timeprommonth.month.day29, dato.timeprommonth.month.day30, dato.timeprommonth.month.day31, dato.month, dato.year);
  }

  function generarChartRebotePor(dato) {
    return yo(_templateObject6, dato.month, dato.year, dato.type, dato.rebotepormonth.month.day1, dato.rebotepormonth.month.day2, dato.rebotepormonth.month.day3, dato.rebotepormonth.month.day4, dato.rebotepormonth.month.day5, dato.rebotepormonth.month.day6, dato.rebotepormonth.month.day7, dato.rebotepormonth.month.day8, dato.rebotepormonth.month.day9, dato.rebotepormonth.month.day10, dato.rebotepormonth.month.day11, dato.rebotepormonth.month.day12, dato.rebotepormonth.month.day13, dato.rebotepormonth.month.day14, dato.rebotepormonth.month.day15, dato.rebotepormonth.month.day16, dato.rebotepormonth.month.day17, dato.rebotepormonth.month.day18, dato.rebotepormonth.month.day19, dato.rebotepormonth.month.day20, dato.rebotepormonth.month.day21, dato.rebotepormonth.month.day22, dato.rebotepormonth.month.day23, dato.rebotepormonth.month.day24, dato.rebotepormonth.month.day25, dato.rebotepormonth.month.day26, dato.rebotepormonth.month.day27, dato.rebotepormonth.month.day28, dato.rebotepormonth.month.day29, dato.rebotepormonth.month.day30, dato.rebotepormonth.month.day31, dato.month, dato.year);
  }

  function generarChartLanguage(dato) {
    return yo(_templateObject7, dato.month, dato.year, dato.type, dato.language.ppal, dato.language.others, dato.month, dato.year);
  }

  function generarChartCountry(dato) {
    return yo(_templateObject8, dato.month, dato.year, dato.type, dato.country.ppal, dato.country.sec, dato.country.others, dato.month, dato.year);
  }

  function generarChartCity(dato) {
    return yo(_templateObject9, dato.month, dato.year, dato.type, dato.city.ppal, dato.city.sec, dato.city.others, dato.month, dato.year);
  }

  function generarChartVisitMonth(dato) {
    return yo(_templateObject10, dato.month, dato.year, dato.type, dato.visit.visitnews, dato.visit.visitrecurrent, dato.month, dato.year);
  }
};

},{"yo-yo":388}],394:[function(require,module,exports){
'use strict';

var _templateObject = _taggedTemplateLiteral(['<div class="estadisticas cont-twitter">\n          <div id="tw', '', '" class="col m12 cont-datos tab-content-datos">\n              <div class="contHeaderVisual">\n                <div class="contTitleVisual">\n                  <h4 class="title-mes">', ' - ', '</h4>\n                </div>\n                <div class="logo-cliente">\n                  <img src="', '"  />\n                </div>\n              </div>\n              <h4>Crecimiento</h4>\n                  <div class="row">\n                    <div class="col m6 cont-variables">\n                      <h5>Total seguidores</h5>\n                      <p id="count-number" class="timer count-title" data-to="', '" data-speed="1500"></p>\n                    </div>\n                    <div class="col m6 cont-variables">\n                      <h5>Total seguidos</h5>\n                      <p id="count-number" class="timer count-title" data-to="', '" data-speed="1500"></p>\n                    </div>\n                  </div>\n                  <div class="row">\n                    <div class="col m6 cont-variables">\n                      <h5>Nuevos Seguidores</h5>\n                      <p id="count-number" class="timer count-title" data-to="', '" data-speed="1500"></p>\n                    </div>\n                    <div class="col m6 cont-variables">\n                      <h5>Fotos / Videos Globales</h5>\n                      <p id="count-number" class="timer count-title" data-to="', '" data-speed="1500"></p>\n                    </div>\n                  </div>\n                  <div class="row">\n                    <div class="col m12 cont-variables">\n                      <h5>Favoritos Globales</h5>\n                      <p id="count-number" class="timer count-title" data-to="', '" data-speed="1500"></p>\n                    </div>\n                  </div>\n              <h4>Interacci\xF3n</h4>\n                      <div class="row">\n                          <div class="col m4 cont-variables">\n                            <h5>Total Tweets</h5>\n                            <p id="count-number" class="timer count-title" data-to="', '" data-speed="1500"></p>\n                          </div>\n                          <div class="col m4 cont-variables">\n                            <h5>Tweets</h5>\n                            <p id="count-number" class="timer count-title" data-to="', '" data-speed="1500"></p>\n\n                          </div>\n                          <div class="col m4 cont-variables">\n                            <h5>Retweets</h5>\n                            <p>', '</p>\n                          </div>\n                      </div>\n                      <div class="row">\n                          <div class="col m4 cont-variables">\n                            <h5>Menciones</h5>\n                            <p>', '</p>\n                          </div>\n                          <div class="col m4 cont-variables">\n                            <h5>Favoritos</h5>\n                            <p>', '</p>\n                          </div>\n                          <div class="col m4 cont-variables">\n                            <h5>Mensajes Directos</h5>\n                            <p>', '</p>\n                          </div>\n                      </div>\n               <h4>Otros datos</h4>\n                 <div class="row">\n                     <div class="col m3 cont-variables">\n                       <h5>', '</h5>\n                       <p>', '</p>\n                     </div>\n                     <div class="col m3 cont-variables">\n                       <h5>', '</h5>\n                       <p>', '</p>\n                     </div>\n                     <div class="col m3 cont-variables">\n                       <h5>', '</h5>\n                       <p>', '</p>\n                     </div>\n                     <div class="col m3 cont-variables">\n                       <h5>', '</h5>\n                       <p>', '</p>\n                     </div>\n                 </div>\n                 <div class="row">\n                     <div class="col m3 cont-variables">\n                       <h5>', '</h5>\n                       <p>', '</p>\n                     </div>\n                     <div class="col m3 cont-variables">\n                       <h5>', '</h5>\n                       <p>', '</p>\n                     </div>\n                     <div class="col m3 cont-variables">\n                       <h5>', '</h5>\n                       <p>', '</p>\n                     </div>\n                     <div class="col m3 cont-variables">\n                       <h5>', '</h5>\n                       <p>', '</p>\n                     </div>\n                 </div>\n            </div>\n  </div>'], ['<div class="estadisticas cont-twitter">\n          <div id="tw', '', '" class="col m12 cont-datos tab-content-datos">\n              <div class="contHeaderVisual">\n                <div class="contTitleVisual">\n                  <h4 class="title-mes">', ' - ', '</h4>\n                </div>\n                <div class="logo-cliente">\n                  <img src="', '"  />\n                </div>\n              </div>\n              <h4>Crecimiento</h4>\n                  <div class="row">\n                    <div class="col m6 cont-variables">\n                      <h5>Total seguidores</h5>\n                      <p id="count-number" class="timer count-title" data-to="', '" data-speed="1500"></p>\n                    </div>\n                    <div class="col m6 cont-variables">\n                      <h5>Total seguidos</h5>\n                      <p id="count-number" class="timer count-title" data-to="', '" data-speed="1500"></p>\n                    </div>\n                  </div>\n                  <div class="row">\n                    <div class="col m6 cont-variables">\n                      <h5>Nuevos Seguidores</h5>\n                      <p id="count-number" class="timer count-title" data-to="', '" data-speed="1500"></p>\n                    </div>\n                    <div class="col m6 cont-variables">\n                      <h5>Fotos / Videos Globales</h5>\n                      <p id="count-number" class="timer count-title" data-to="', '" data-speed="1500"></p>\n                    </div>\n                  </div>\n                  <div class="row">\n                    <div class="col m12 cont-variables">\n                      <h5>Favoritos Globales</h5>\n                      <p id="count-number" class="timer count-title" data-to="', '" data-speed="1500"></p>\n                    </div>\n                  </div>\n              <h4>Interacci\xF3n</h4>\n                      <div class="row">\n                          <div class="col m4 cont-variables">\n                            <h5>Total Tweets</h5>\n                            <p id="count-number" class="timer count-title" data-to="', '" data-speed="1500"></p>\n                          </div>\n                          <div class="col m4 cont-variables">\n                            <h5>Tweets</h5>\n                            <p id="count-number" class="timer count-title" data-to="', '" data-speed="1500"></p>\n\n                          </div>\n                          <div class="col m4 cont-variables">\n                            <h5>Retweets</h5>\n                            <p>', '</p>\n                          </div>\n                      </div>\n                      <div class="row">\n                          <div class="col m4 cont-variables">\n                            <h5>Menciones</h5>\n                            <p>', '</p>\n                          </div>\n                          <div class="col m4 cont-variables">\n                            <h5>Favoritos</h5>\n                            <p>', '</p>\n                          </div>\n                          <div class="col m4 cont-variables">\n                            <h5>Mensajes Directos</h5>\n                            <p>', '</p>\n                          </div>\n                      </div>\n               <h4>Otros datos</h4>\n                 <div class="row">\n                     <div class="col m3 cont-variables">\n                       <h5>', '</h5>\n                       <p>', '</p>\n                     </div>\n                     <div class="col m3 cont-variables">\n                       <h5>', '</h5>\n                       <p>', '</p>\n                     </div>\n                     <div class="col m3 cont-variables">\n                       <h5>', '</h5>\n                       <p>', '</p>\n                     </div>\n                     <div class="col m3 cont-variables">\n                       <h5>', '</h5>\n                       <p>', '</p>\n                     </div>\n                 </div>\n                 <div class="row">\n                     <div class="col m3 cont-variables">\n                       <h5>', '</h5>\n                       <p>', '</p>\n                     </div>\n                     <div class="col m3 cont-variables">\n                       <h5>', '</h5>\n                       <p>', '</p>\n                     </div>\n                     <div class="col m3 cont-variables">\n                       <h5>', '</h5>\n                       <p>', '</p>\n                     </div>\n                     <div class="col m3 cont-variables">\n                       <h5>', '</h5>\n                       <p>', '</p>\n                     </div>\n                 </div>\n            </div>\n  </div>']);

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var yo = require('yo-yo');

module.exports = function (ctx, dato) {
  return yo(_templateObject, dato.year, dato.month, dato.month, dato.year, ctx.auth.src, dato.allfans, dato.allfollows, dato.newfans, dato.globalmedia, dato.globalfavorites, dato.alltweets, dato.tweets, dato.retweets, dato.mentions, dato.favorites, dato.messagedirects, dato.hashtags.label1, dato.hashtags.cant1, dato.hashtags.label2, dato.hashtags.cant2, dato.hashtags.label3, dato.hashtags.cant3, dato.hashtags.label4, dato.hashtags.cant4, dato.hashtags.label5, dato.hashtags.cant5, dato.hashtags.label6, dato.hashtags.cant6, dato.hashtags.label7, dato.hashtags.cant7, dato.hashtags.label8, dato.hashtags.cant8);
};

},{"yo-yo":388}],395:[function(require,module,exports){
'use strict';

var _templateObject = _taggedTemplateLiteral(['<div class="col m9 cont-header">\n    <div class="col m5 push-m7 cont-user authmenu">\n      <p>\xA1Hola! @', '</p> <a href="/logout" rel="external"><i class="fa fa-sign-out" aria-hidden="true"></i>Salir</a>\n\n    </div>\n    </div>'], ['<div class="col m9 cont-header">\n    <div class="col m5 push-m7 cont-user authmenu">\n      <p>\xA1Hola! @', '</p> <a href="/logout" rel="external"><i class="fa fa-sign-out" aria-hidden="true"></i>Salir</a>\n\n    </div>\n    </div>']),
    _templateObject2 = _taggedTemplateLiteral(['  <div class="col m9 cont-header">\n      <div class="col m3 push-m9 cont-user">\n        <a href="#" data-activates="drop-users" class="dropdown-button" style="line-height: 29px">\n        <i class="fa fa-bars small icon-st" aria-hidden="true"></i></a>\n        <ul id="drop-users" class="dropdown-content">\n             <li><a class=\'dropdown-button\' href=\'/signin\' data-activates=\'dropdown1\'><h5>Inicia sesi\xF3n</h5></a></li>\n        </ul>\n      </div>\n    </div>'], ['  <div class="col m9 cont-header">\n      <div class="col m3 push-m9 cont-user">\n        <a href="#" data-activates="drop-users" class="dropdown-button" style="line-height: 29px">\n        <i class="fa fa-bars small icon-st" aria-hidden="true"></i></a>\n        <ul id="drop-users" class="dropdown-content">\n             <li><a class=\'dropdown-button\' href=\'/signin\' data-activates=\'dropdown1\'><h5>Inicia sesi\xF3n</h5></a></li>\n        </ul>\n      </div>\n    </div>']),
    _templateObject3 = _taggedTemplateLiteral(['<div class="container">\n        <div class="row row-header">\n          <div class="col m3 cont-logo">\n            <a class="logo" href="/"><img src="logo-evermetrics-blanco.png"/></a>\n          </div>\n          ', '\n        </div>\n      </div>'], ['<div class="container">\n        <div class="row row-header">\n          <div class="col m3 cont-logo">\n            <a class="logo" href="/"><img src="logo-evermetrics-blanco.png"/></a>\n          </div>\n          ', '\n        </div>\n      </div>']);

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var yo = require('yo-yo');
var empty = require('empty-element');

var authCard = function authCard(ctx) {

  var authenticated = yo(_templateObject, ctx.auth.name);

  var signin = yo(_templateObject2);

  if (ctx.auth) {
    return authenticated;
  } else {
    return signin;
  }
};

var renderHeader = function renderHeader(ctx) {
  return yo(_templateObject3, authCard(ctx));
};

module.exports = function (ctx, next) {
  var container = document.getElementById('header-container');
  empty(container).appendChild(renderHeader(ctx));
  next();
};

},{"empty-element":333,"yo-yo":388}],396:[function(require,module,exports){
'use strict';

var page = require('page');
var empty = require('empty-element');
var template = require('./template');
var title = require('title');
var request = require('superagent');
var header = require('../header');
var utils = require('../utils');
var axios = require('axios');
var vistadato = require('../picture-card');
var io = require('socket.io-client');

var socket = io.connect('http://ws.evermetric.co');

page('/', utils.loadAuth, header, loadestadisticas, function (ctx, next) {
  title('Evermetrics');
  var main = document.getElementById('main-container');

  empty(main).appendChild(template(ctx, ctx.dates));
  next();
}, function (next) {
  (function ($) {
    $.fn.countTo = function (options) {
      options = options || {};

      return $(this).each(function () {
        // set options for current element
        var settings = $.extend({}, $.fn.countTo.defaults, {
          from: $(this).data('from'),
          to: $(this).data('to'),
          speed: $(this).data('speed'),
          refreshInterval: $(this).data('refresh-interval'),
          decimals: $(this).data('decimals')
        }, options);

        // how many times to update the value, and how much to increment the value on each update
        var loops = Math.ceil(settings.speed / settings.refreshInterval),
            increment = (settings.to - settings.from) / loops;

        // references & variables that will change with each update
        var self = this,
            $self = $(this),
            loopCount = 0,
            value = settings.from,
            data = $self.data('countTo') || {};

        $self.data('countTo', data);

        // if an existing interval can be found, clear it first
        if (data.interval) {
          clearInterval(data.interval);
        }
        data.interval = setInterval(updateTimer, settings.refreshInterval);

        // initialize the element with the starting value
        render(value);

        function updateTimer() {
          value += increment;
          loopCount++;

          render(value);

          if (typeof settings.onUpdate == 'function') {
            settings.onUpdate.call(self, value);
          }

          if (loopCount >= loops) {
            // remove the interval
            $self.removeData('countTo');
            clearInterval(data.interval);
            value = settings.to;

            if (typeof settings.onComplete == 'function') {
              settings.onComplete.call(self, value);
            }
          }
        }

        function render(value) {
          var formattedValue = settings.formatter.call(self, value, settings);
          $self.html(formattedValue);
        }
      });
    };

    $.fn.countTo.defaults = {
      from: 0, // the number the element should start at
      to: 0, // the number the element should end at
      speed: 1000, // how long it should take to count between the target numbers
      refreshInterval: 100, // how often the element should be updated
      decimals: 0, // the number of decimal places to show
      formatter: formatter, // handler for formatting the value before rendering
      onUpdate: null, // callback method for every time the element is updated
      onComplete: null // callback method for when the element finishes updating
    };

    function formatter(value, settings) {
      return value.toFixed(settings.decimals);
    }

    $(document).ready(function () {

      //tabs de las redes
      $(".tabs-menu-redes a").click(function (event) {
        event.preventDefault();
        $(this).parent().addClass("current");
        $(this).parent().siblings().removeClass("current");
        var tab = $(this).attr("href");
        $(".tab-content-redes").not(tab).css("display", "none");
        $(".tab-content-redesm").not(tab).css("display", "none");
        $(tab).fadeIn();
        $(".tab-content-datos").not(tab).css("display", "none");
        $('.estadisticas:first-child .tab-content-datos').fadeIn();
        $('.ano:first-child .tab-content-datos').fadeIn();
        $('.btnano').text(" ");
      });
      // tabs meses
      $(".liMes a").click(function (event) {
        event.preventDefault();
        $(".liYear .liMes").removeClass("current");
        //$(".liYear.active").removeClass("active");
        $(this).parent().siblings().removeClass("current");
        $(this).parent().addClass("current");
        var tab = $(this).attr("href");
        $(".tab-content-datos").not(tab).css("display", "none");
        $(tab).fadeIn();
      });
      // tabs tortas
      $(".linktorta").click(function (event) {
        event.preventDefault();
        //$(".liYear.active").removeClass("active");
        $(this).parent().siblings().removeClass("current");
        $(this).parent().addClass("current");
        var tab = $(this).attr("href");
        $(".tab-content-torta").not(tab).css("display", "none");
        $(tab).fadeIn();
      });
      // tabs grafica analytics
      $(".linkgraph").click(function (event) {
        event.preventDefault();
        //$(".liYear.active").removeClass("active");
        $(this).parent().siblings().removeClass("current");
        $(this).parent().addClass("current");
        var tab = $(this).attr("href");
        $(".tab-content-grafica").not(tab).css("display", "none");
        $(tab).fadeIn();
      });
      //tabs años
      $(".liYear a").click(function (event) {
        event.preventDefault();
        $(this).parent().addClass("current");
        $(this).parent().siblings().removeClass("current");
        //var tab = $(this).find('a').attr("href");
        var tab = $(this).attr("href");
        console.log(tab);
        $(".tab-content-datos").not(tab).css("display", "none");
        $(".tab-content-datosm").not(tab).css("display", "none");
        if ($('#stadistitics-container ' + tab).length > 0) {
          $(tab).fadeIn();
          var sus = tab.substring(3, 20);
          $('.btnano').text(sus + "  -");
        } else {
          $(tab).fadeIn();
          $('.default').fadeIn();
          var sus = tab.substring(3, 20);
          $('.anoposi').text(sus);
          $('.btnano').text(sus + "  -");
        }
      });
    });

    $(document).ready(function () {
      $('ul.tabs').tabs();
      $('.tabs-menu-redes .mnli:first-child').addClass('current');
      $('#stadistitics-container .tab-content-redes:first-child').css('display', 'block');
      $('.contMenuNav .tab-content-redesm:first-child').css('display', 'block');
      if (!$('#stadistitics-container .tab-content-redes').length > 0) {
        $('.contNewUser').fadeIn();
      }
    });

    $(document).ready(function () {
      $('.collapsible').collapsible();
    });

    $('#hideshow').on('click', function (event) {
      $('#year').toggle();
    });

    $(".rotate").click(function () {
      $(this).toggleClass("down");
    });

    $('.dropdown-button').dropdown({
      inDuration: 300,
      outDuration: 225,
      constrainWidth: false, // Does not change width of dropdown to that of the activator
      hover: false, // Activate on hover
      gutter: 0, // Spacing from edge
      belowOrigin: false, // Displays dropdown below the button
      alignment: 'left', // Displays dropdown with edge aligned to the left of button
      stopPropagation: false // Stops event propagation
    });
  })(jQuery);

  jQuery(function ($) {
    // custom formatting example
    $('#count-number').data('countToOptions', {
      formatter: function formatter(value, options) {
        return value.toFixed(options.decimals).replace(/\B(?=(?:\d{3})+(?!\d))/g, ',');
      }
    });

    // start all the timers
    $('.timer').each(count);

    function count(options) {
      var $this = $(this);
      options = $.extend({}, options || {}, $this.data('countToOptions') || {});
      $this.countTo(options);
    }
  });
});
/*
  function loadestadisticas(ctx, next){
   request
    .get('/api/estadisticas')
    .end(function(err,res){
      if(err) return console.log(err);
      ctx.datos = res.body;
      next();
    })
  }*/
/*
  socket.on('dates', function(dates){
    var stadistiticsEl = document.getElementById('stadistitics-container');
    var first = stadistiticsEl.firstChild;
    var date = vistadato(dates);
    stadistiticsEl.insertBefore(date, first);
  })*/

function loadestadisticas(ctx, next) {
  axios.get('/api/estadisticas').then(function (res) {
    ctx.dates = res.data;
    next();
  }).catch(function (err) {
    console.log(err);
  });
}

function asyncload(ctx, next) {
  return regeneratorRuntime.async(function asyncload$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          _context.prev = 0;
          _context.next = 3;
          return regeneratorRuntime.awrap(fetch('/api/estadisticas').then(function (res) {
            return res.json();
          }));

        case 3:
          ctx.estadisticas = _context.sent;

          next();
          _context.next = 10;
          break;

        case 7:
          _context.prev = 7;
          _context.t0 = _context['catch'](0);
          return _context.abrupt('return', console.log(_context.t0));

        case 10:
        case 'end':
          return _context.stop();
      }
    }
  }, null, this, [[0, 7]]);
}

},{"../header":395,"../picture-card":407,"../utils":426,"./template":397,"axios":3,"empty-element":333,"page":361,"socket.io-client":368,"superagent":380,"title":384}],397:[function(require,module,exports){
'use strict';

var _templateObject = _taggedTemplateLiteral(['<div class="container timeline cont-estadisticas">\n  <div id="top-menu" class="container">\n      <div class="row">\n        <div class="col m7 contNavRedes">\n          <ul class="tabs-menu-redes">\n            ', '\n            ', '\n            ', '\n            ', '\n          </ul>\n        </div>\n        <div class="col m5 contMenuNav">\n          ', '\n          ', '\n          ', '\n          ', '\n        </div>\n      </div>\n  </div>\n  <div id="stadistitics-container" class="cont-redes tab-content">\n    ', '\n    ', '\n    ', '\n    ', '\n    <div class="col m12 contNewUser">\n      <div class="title-error contMessageWelcome">\n        <div class="contWelcome">\n          <img src="', '" />\n        </div>\n        <p>Bienvenido a Evermetric, a\xFAn no tienes estadisticas en la plataforma</p>\n      </div>\n    </div>\n  </div>\n  </div>'], ['<div class="container timeline cont-estadisticas">\n  <div id="top-menu" class="container">\n      <div class="row">\n        <div class="col m7 contNavRedes">\n          <ul class="tabs-menu-redes">\n            ', '\n            ', '\n            ', '\n            ', '\n          </ul>\n        </div>\n        <div class="col m5 contMenuNav">\n          ', '\n          ', '\n          ', '\n          ', '\n        </div>\n      </div>\n  </div>\n  <div id="stadistitics-container" class="cont-redes tab-content">\n    ', '\n    ', '\n    ', '\n    ', '\n    <div class="col m12 contNewUser">\n      <div class="title-error contMessageWelcome">\n        <div class="contWelcome">\n          <img src="', '" />\n        </div>\n        <p>Bienvenido a Evermetric, a\xFAn no tienes estadisticas en la plataforma</p>\n      </div>\n    </div>\n  </div>\n  </div>']),
    _templateObject2 = _taggedTemplateLiteral(['<div class="container container-login">\n      <div class="row">\n        <div class="col l12">\n          <div class="row contLogoLanding">\n            <img src="logo-evermetrics.png"/>\n          </div>\n        </div>\n        <div class="col l12">\n              <div class="row">\n                <div class="signup-box">\n                  <form class="signup-form" action="/login" method="POST">\n                    <div class="section cont-form-login" style="text-align:center;">\n                      <input type="text" name="username" placeholder="Nombre de usuario">\n                      <input type="password" name="password" placeholder="Contrase\xF1a">\n                      <button class="btn waves-effect waves-light btn-login" type="submit">Iniciar sesi\xF3n</button>\n                    </div>\n                  </form>\n                </div>\n                <div class="row hide">\n                  <a href="/signup">No tienes una cuenta</a>\n                </div>\n              </div>\n          </div>\n      </div>\n    </div>'], ['<div class="container container-login">\n      <div class="row">\n        <div class="col l12">\n          <div class="row contLogoLanding">\n            <img src="logo-evermetrics.png"/>\n          </div>\n        </div>\n        <div class="col l12">\n              <div class="row">\n                <div class="signup-box">\n                  <form class="signup-form" action="/login" method="POST">\n                    <div class="section cont-form-login" style="text-align:center;">\n                      <input type="text" name="username" placeholder="Nombre de usuario">\n                      <input type="password" name="password" placeholder="Contrase\xF1a">\n                      <button class="btn waves-effect waves-light btn-login" type="submit">Iniciar sesi\xF3n</button>\n                    </div>\n                  </form>\n                </div>\n                <div class="row hide">\n                  <a href="/signup">No tienes una cuenta</a>\n                </div>\n              </div>\n          </div>\n      </div>\n    </div>']),
    _templateObject3 = _taggedTemplateLiteral(['<li class="facebook mnli"><a href=".facebook"><i class="fa fa-facebook" aria-hidden="true"></i>Facebook</a></li>'], ['<li class="facebook mnli"><a href=".facebook"><i class="fa fa-facebook" aria-hidden="true"></i>Facebook</a></li>']),
    _templateObject4 = _taggedTemplateLiteral(['<li class="instagram mnli"><a href=".instagram"><i class="fa fa-instagram" aria-hidden="true"></i>Instagram</a></li>'], ['<li class="instagram mnli"><a href=".instagram"><i class="fa fa-instagram" aria-hidden="true"></i>Instagram</a></li>']),
    _templateObject5 = _taggedTemplateLiteral(['<li class="twitter mnli"><a href=".twitter"><i class="fa fa-twitter" aria-hidden="true"></i>Twitter</a></li>'], ['<li class="twitter mnli"><a href=".twitter"><i class="fa fa-twitter" aria-hidden="true"></i>Twitter</a></li>']),
    _templateObject6 = _taggedTemplateLiteral(['<li class="web mnli"><a href=".web"><i class="fa fa-globe" aria-hidden="true"></i>Website</a></li>'], ['<li class="web mnli"><a href=".web"><i class="fa fa-globe" aria-hidden="true"></i>Website</a></li>']),
    _templateObject7 = _taggedTemplateLiteral(['<div id="instagram" class="instagram row tab-content-redes">\n         ', '\n         <div class="col m12 cont-datos tab-content-datos default">\n           <div class="title-error"><i class="fa fa-exclamation-triangle" aria-hidden="true"></i><p>Selecciona un mes para <span class="anoposi"></span></p></div>\n         </div>\n     </div>'], ['<div id="instagram" class="instagram row tab-content-redes">\n         ', '\n         <div class="col m12 cont-datos tab-content-datos default">\n           <div class="title-error"><i class="fa fa-exclamation-triangle" aria-hidden="true"></i><p>Selecciona un mes para <span class="anoposi"></span></p></div>\n         </div>\n     </div>']),
    _templateObject8 = _taggedTemplateLiteral(['<div class="cont-meses">\n              ', '\n           </div>'], ['<div class="cont-meses">\n              ', '\n           </div>']),
    _templateObject9 = _taggedTemplateLiteral(['<h1 class="title-error"><i class="fa fa-exclamation-triangle" aria-hidden="true"></i>No existen datos</h1>'], ['<h1 class="title-error"><i class="fa fa-exclamation-triangle" aria-hidden="true"></i>No existen datos</h1>']),
    _templateObject10 = _taggedTemplateLiteral(['<div class="instagram tab-content-redesm">\n          <div class="contNavTabs">\n            <div class="col m4 offset-m4 itemNavTabs">\n              <input type="button" data-activates="drop-anoinst" class="dropdown-button" value="A\xF1o" /><span class="btnano"></span>\n              <ul id="drop-anoinst" class="dropdown-content">\n                ', '\n              </ul>\n            </div>\n            <div class="col m4 itemNavTabs">\n              <input type="button" data-activates="drop-mesinst" class="dropdown-button" value="Mes" />\n              <ul id="drop-mesinst" class="dropdown-content">\n                ', '\n              </ul>\n            </div>\n          </div></div>'], ['<div class="instagram tab-content-redesm">\n          <div class="contNavTabs">\n            <div class="col m4 offset-m4 itemNavTabs">\n              <input type="button" data-activates="drop-anoinst" class="dropdown-button" value="A\xF1o" /><span class="btnano"></span>\n              <ul id="drop-anoinst" class="dropdown-content">\n                ', '\n              </ul>\n            </div>\n            <div class="col m4 itemNavTabs">\n              <input type="button" data-activates="drop-mesinst" class="dropdown-button" value="Mes" />\n              <ul id="drop-mesinst" class="dropdown-content">\n                ', '\n              </ul>\n            </div>\n          </div></div>']),
    _templateObject11 = _taggedTemplateLiteral(['<div id="facebook" class="facebook row tab-content-redes">\n         ', '\n         <div class="col m12 cont-datos tab-content-datos default">\n           <div class="title-error"><i class="fa fa-exclamation-triangle" aria-hidden="true"></i><p>Selecciona un mes para <span class="anoposi"></span></p></div>\n         </div>\n     </div>'], ['<div id="facebook" class="facebook row tab-content-redes">\n         ', '\n         <div class="col m12 cont-datos tab-content-datos default">\n           <div class="title-error"><i class="fa fa-exclamation-triangle" aria-hidden="true"></i><p>Selecciona un mes para <span class="anoposi"></span></p></div>\n         </div>\n     </div>']),
    _templateObject12 = _taggedTemplateLiteral(['<div class="facebook tab-content-redesm" >\n          <div class="contNavTabs">\n            <div class="col m4 offset-m4 itemNavTabs">\n              <input type="button" data-activates="drop-ano" class="dropdown-button" value="A\xF1o" /><span class="btnano"></span>\n              <ul id="drop-ano" class="dropdown-content">\n                ', '\n              </ul>\n            </div>\n            <div class="col m4 itemNavTabs">\n              <input type="button" data-activates="drop-mes" class="dropdown-button" value="Mes" />\n              <ul id="drop-mes" class="dropdown-content">\n                ', '\n              </ul>\n            </div>\n          </div></div>'], ['<div class="facebook tab-content-redesm" >\n          <div class="contNavTabs">\n            <div class="col m4 offset-m4 itemNavTabs">\n              <input type="button" data-activates="drop-ano" class="dropdown-button" value="A\xF1o" /><span class="btnano"></span>\n              <ul id="drop-ano" class="dropdown-content">\n                ', '\n              </ul>\n            </div>\n            <div class="col m4 itemNavTabs">\n              <input type="button" data-activates="drop-mes" class="dropdown-button" value="Mes" />\n              <ul id="drop-mes" class="dropdown-content">\n                ', '\n              </ul>\n            </div>\n          </div></div>']),
    _templateObject13 = _taggedTemplateLiteral(['<div class="web tab-content-redesm">\n          <div class="contNavTabs">\n            <div class="col m4 offset-m4 itemNavTabs">\n              <input type="button" data-activates="drop-anoweb" class="dropdown-button" value="A\xF1o" /><span class="btnano"></span>\n              <ul id="drop-anoweb" class="dropdown-content">\n                ', '\n              </ul>\n            </div>\n            <div class="col m4 itemNavTabs">\n              <input type="button" data-activates="drop-mesweb" class="dropdown-button" value="Mes" />\n              <ul id="drop-mesweb" class="dropdown-content">\n                ', '\n              </ul>\n            </div>\n          </div></div>'], ['<div class="web tab-content-redesm">\n          <div class="contNavTabs">\n            <div class="col m4 offset-m4 itemNavTabs">\n              <input type="button" data-activates="drop-anoweb" class="dropdown-button" value="A\xF1o" /><span class="btnano"></span>\n              <ul id="drop-anoweb" class="dropdown-content">\n                ', '\n              </ul>\n            </div>\n            <div class="col m4 itemNavTabs">\n              <input type="button" data-activates="drop-mesweb" class="dropdown-button" value="Mes" />\n              <ul id="drop-mesweb" class="dropdown-content">\n                ', '\n              </ul>\n            </div>\n          </div></div>']),
    _templateObject14 = _taggedTemplateLiteral(['<div id="twitter" class="twitter row tab-content-redes">\n         ', '\n         <div class="col m12 cont-datos tab-content-datos default">\n           <div class="title-error"><i class="fa fa-exclamation-triangle" aria-hidden="true"></i><p>Selecciona un mes para <span class="anoposi"></span></p></div>\n         </div>\n     </div>'], ['<div id="twitter" class="twitter row tab-content-redes">\n         ', '\n         <div class="col m12 cont-datos tab-content-datos default">\n           <div class="title-error"><i class="fa fa-exclamation-triangle" aria-hidden="true"></i><p>Selecciona un mes para <span class="anoposi"></span></p></div>\n         </div>\n     </div>']),
    _templateObject15 = _taggedTemplateLiteral(['<div class="twitter tab-content-redesm">\n          <div class="contNavTabs">\n            <div class="col m4 offset-m4 itemNavTabs">\n              <input type="button" data-activates="drop-anotw" class="dropdown-button" value="A\xF1o" /><span class="btnano"></span>\n              <ul id="drop-anotw" class="dropdown-content">\n                ', '\n              </ul>\n            </div>\n            <div class="col m4 itemNavTabs">\n              <input type="button" data-activates="drop-mestw" class="dropdown-button" value="Mes" />\n              <ul id="drop-mestw" class="dropdown-content">\n                ', '\n              </ul>\n            </div>\n          </div></div>'], ['<div class="twitter tab-content-redesm">\n          <div class="contNavTabs">\n            <div class="col m4 offset-m4 itemNavTabs">\n              <input type="button" data-activates="drop-anotw" class="dropdown-button" value="A\xF1o" /><span class="btnano"></span>\n              <ul id="drop-anotw" class="dropdown-content">\n                ', '\n              </ul>\n            </div>\n            <div class="col m4 itemNavTabs">\n              <input type="button" data-activates="drop-mestw" class="dropdown-button" value="Mes" />\n              <ul id="drop-mestw" class="dropdown-content">\n                ', '\n              </ul>\n            </div>\n          </div></div>']),
    _templateObject16 = _taggedTemplateLiteral(['<div id="web" class="web row tab-content-redes">\n         ', '\n         <div class="col m12 cont-datos tab-content-datos default">\n           <div class="title-error"><i class="fa fa-exclamation-triangle" aria-hidden="true"></i><p>Selecciona un mes para <span class="anoposi"></span></p></div>\n         </div>\n     </div>'], ['<div id="web" class="web row tab-content-redes">\n         ', '\n         <div class="col m12 cont-datos tab-content-datos default">\n           <div class="title-error"><i class="fa fa-exclamation-triangle" aria-hidden="true"></i><p>Selecciona un mes para <span class="anoposi"></span></p></div>\n         </div>\n     </div>']),
    _templateObject17 = _taggedTemplateLiteral(['<li class="liYear"><a class="ayear" href=".', '', '">', '</a></li>'], ['<li class="liYear"><a class="ayear" href=".', '', '">', '</a></li>']);

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var yo = require('yo-yo');
var layout = require('../layout');
var vistadato = require('../picture-card');
var vistaano = require('../datosano');
var menumonth = require('../menu-lateral-mes');
var menuano = require('../menu-lateral-ano');
var vistainst = require('../datosinst');
var vistawebano = require('../datosanoweb');
var vistamonthweb = require('../datosmonthweb');
var vistatw = require('../datostwit');
var anoatc = [];
var anoatcinst = [];
var anoatcweb = [];
var anoatctw = [];
var anomes;
var anomesins;
var anomesweb;
var anomestw;
var useract;
var contfb = 0;
var conttw = 0;
var contweb = 0;
var contins = 0;
var mostrardatostw = 0;
var mostrardatosweb = 0;
var mostrardatosfb = 0;
var mostrardatosinst = 0;
var redesv = [];
var hay = 0;
var noDatesUser = 1;

module.exports = function (ctx, dates) {

  /*  if (!Array.isArray(dates)) { dates = [];}
  
    console.log(dates)
    for(var i in dates){
      console.log(dates.dato);
    }*/

  var authenticated = yo(_templateObject, loadTabFacebook(ctx, dates), loadTabInstagram(ctx, dates), loadTabTwitter(ctx, dates), loadTabWeb(ctx, dates), loadMenuFb(ctx, dates), loadMenuInst(ctx, dates), loadMenuTwit(ctx, dates), loadMenuWeb(ctx, dates), loadDatesFb(ctx, dates), loadDatesInst(ctx, dates), loadDatesTw(ctx, dates), loadDatesWeb(ctx, dates), ctx.auth.src);

  var signin = yo(_templateObject2);

  if (ctx.auth) {
    return layout(authenticated);
  } else {
    return layout(signin);
  }
};

function loadTabFacebook(ctx, dates) {
  var red = "fb";
  for (var i in dates) {
    if (dates[i].userId === ctx.auth.username) {
      hay = buscardatos(ctx, dates, red);
      if (hay === 1) {
        hay = 0;
        return yo(_templateObject3);
      }
    }
  }
}

function loadTabInstagram(ctx, dates) {
  var red = "inst";
  for (var i in dates) {
    if (dates[i].userId === ctx.auth.username) {
      hay = buscardatos(ctx, dates, red);
      if (hay === 1) {
        hay = 0;
        return yo(_templateObject4);
      }
    }
  }
}

function loadTabTwitter(ctx, dates) {
  var red = "tw";
  for (var i in dates) {
    if (dates[i].userId === ctx.auth.username) {
      hay = buscardatos(ctx, dates, red);
      if (hay === 1) {
        hay = 0;
        return yo(_templateObject5);
      }
    }
  }
}

function loadTabWeb(ctx, dates) {
  var red = "web";
  for (var i in dates) {
    if (dates[i].userId === ctx.auth.username) {
      hay = buscardatos(ctx, dates, red);
      if (hay === 1) {
        hay = 0;
        return yo(_templateObject6);
      }
    }
  }
}

function loadDatesInst(ctx, dates) {
  var red = "inst";
  hay = buscardatos(ctx, dates, red);
  if (hay === 1) {
    hay = 0;
    return yo(_templateObject7, load(ctx, dates));
  }

  function load(ctx, dates) {
    var red = "inst";
    for (var i in dates) {
      if (dates[i].userId === ctx.auth.username) {
        hay = buscardatos(ctx, dates, red);
        if (hay === 1) {
          hay = 0;
          ++mostrardatosinst;
          if (mostrardatosinst === 1) {
            return yo(_templateObject8, loadViewTabs(ctx, dates, red));
          }
        } else if (hay === 2) {
          hay = 0;
          ++contins;
          if (contins === 1) {
            return yo(_templateObject9);
          }
        }
        noDatesUser = 0;
      } else {
        noDatesUser = 1;
      }
    }
    if (noDatesUser === 1) {
      return yo(_templateObject9);
    }
  }
}

function loadMenuInst(ctx, dates) {
  var red = "inst";
  for (var i in dates) {
    if (dates[i].userId === ctx.auth.username) {
      hay = buscardatos(ctx, dates, red);
      if (hay === 1) {
        hay = 0;
        var mostrarItemsInst = 0;
        ++mostrarItemsInst;
        if (mostrarItemsInst === 1) {
          return yo(_templateObject10, loadMenuYear(ctx, dates, 'it'), loadMenuMonths(ctx, dates, 'it'));
        }
      }
    }
  }
}

function loadDatesFb(ctx, dates) {
  var red = "fb";
  hay = buscardatos(ctx, dates, red);
  if (hay === 1) {
    hay = 0;
    return yo(_templateObject11, load(ctx, dates));
  }

  function load(ctx, dates) {
    var red = "fb";
    for (var i in dates) {
      if (dates[i].userId === ctx.auth.username) {
        hay = buscardatos(ctx, dates, red);
        if (hay === 1) {
          hay = 0;
          ++mostrardatosfb;
          if (mostrardatosfb === 1) {
            return yo(_templateObject8, loadViewTabs(ctx, dates, red));
          }
        } else if (hay === 2) {
          hay = 0;
          ++contfb;
          if (contfb === 1) {
            return yo(_templateObject9);
          }
        }
        noDatesUser = 0;
      } else {
        noDatesUser = 1;
      }
    }
    if (noDatesUser === 1) {
      return yo(_templateObject9);
    }
  }
}

function loadMenuFb(ctx, dates) {
  var red = "fb";
  for (var i in dates) {
    if (dates[i].userId === ctx.auth.username) {
      hay = buscardatos(ctx, dates, red);
      if (hay === 1) {
        hay = 0;
        var mostrarItemsfb = 0;
        ++mostrarItemsfb;
        if (mostrarItemsfb === 1) {
          return yo(_templateObject12, loadMenuYear(ctx, dates, red), loadMenuMonths(ctx, dates, red));
        }
      }
    }
  }
}

function loadMenuWeb(ctx, dates) {
  var red = "web";
  for (var i in dates) {
    if (dates[i].userId === ctx.auth.username) {
      hay = buscardatos(ctx, dates, red);
      if (hay === 1) {
        hay = 0;
        var mostrarItemsweb = 0;
        ++mostrarItemsweb;
        if (mostrarItemsweb === 1) {
          return yo(_templateObject13, loadMenuYear(ctx, dates, 'wb'), loadMenuMonths(ctx, dates, 'wb'));
        }
      }
    }
  }
}

function loadDatesTw(ctx, dates) {

  var red = "tw";
  hay = buscardatos(ctx, dates, red);
  if (hay === 1) {
    hay = 0;
    return yo(_templateObject14, load(ctx, dates));
  }

  function load(ctx, dates) {
    var red = "tw";
    for (var i in dates) {
      if (dates[i].userId === ctx.auth.username) {
        hay = buscardatos(ctx, dates, red);
        if (hay === 1) {
          hay = 0;
          ++mostrardatostw;
          if (mostrardatostw === 1) {
            return yo(_templateObject8, loadViewTabs(ctx, dates, red));
          }
        } else if (hay === 2) {
          hay = 0;
          ++conttw;
          if (conttw === 1) {
            return yo(_templateObject9);
          }
        }
        noDatesUser = 0;
      } else {
        noDatesUser = 1;
      }
    }
    if (noDatesUser === 1) {
      return yo(_templateObject9);
    }
  }
}

function loadMenuTwit(ctx, dates) {
  var red = "tw";
  for (var i in dates) {
    if (dates[i].userId === ctx.auth.username) {
      hay = buscardatos(ctx, dates, red);
      if (hay === 1) {
        hay = 0;
        var mostrarItemstw = 0;
        ++mostrarItemstw;
        if (mostrarItemstw === 1) {
          return yo(_templateObject15, loadMenuYear(ctx, dates, red), loadMenuMonths(ctx, dates, red));
        }
      }
    }
  }
}

function loadDatesWeb(ctx, dates) {
  var red = "web";
  hay = buscardatos(ctx, dates, red);
  if (hay === 1) {
    hay = 0;
    return yo(_templateObject16, load(ctx, dates));
  }

  function load(ctx, dates) {
    var red = "web";
    for (var i in dates) {
      if (dates[i].userId === ctx.auth.username) {
        hay = buscardatos(ctx, dates, red);
        if (hay === 1) {
          hay = 0;
          ++mostrardatosweb;
          if (mostrardatosweb === 1) {
            return yo(_templateObject8, loadViewTabs(ctx, dates, red));
          }
        } else if (hay === 2) {
          hay = 0;
          ++contweb;
          if (contweb === 1) {
            return yo(_templateObject9);
          }
        }
        noDatesUser = 0;
      } else {
        noDatesUser = 1;
      }
    }
    if (noDatesUser === 1) {
      return yo(_templateObject9);
    }
  }
}

function loadMenuYear(ctx, dates, red) {
  var ul = document.createElement('ul');
  ul.className = "tabs-menu-datos";
  ul.setAttribute('data-collapsible', 'accordion');
  if (red === "fb") {
    for (var i in dates) {
      var index = anoatc.indexOf(dates[i].year);
      if (index === -1 & dates[i].userId === ctx.auth.username & dates[i].red === red) {
        anoatc.push(dates[i].year);
        ul.appendChild(liMenuYear(ctx, dates, dates[i], red));
      }
    }
  } else if (red === "it") {
    for (var i in dates) {
      var index = anoatcinst.indexOf(dates[i].year);
      if (index === -1 & dates[i].userId === ctx.auth.username & dates[i].red === 'inst') {
        anoatcinst.push(dates[i].year);
        ul.appendChild(liMenuYear(ctx, dates, dates[i], red));
      }
    }
  } else if (red === "wb") {
    for (var i in dates) {
      var index = anoatcweb.indexOf(dates[i].year);
      if (index === -1 & dates[i].userId === ctx.auth.username & dates[i].red === 'web') {
        anoatcweb.push(dates[i].year);
        ul.appendChild(liMenuYear(ctx, dates, dates[i], red));
      }
    }
  } else {
    for (var i in dates) {
      var index = anoatctw.indexOf(dates[i].year);
      if (index === -1 & dates[i].userId === ctx.auth.username & dates[i].red === red) {
        anoatctw.push(dates[i].year);
        ul.appendChild(liMenuYear(ctx, dates, dates[i], red));
      }
    }
  }
  return ul;
}

function liMenuYear(ctx, dates, dato, red) {
  return yo(_templateObject17, red, dato.year, dato.year);
}

function loadMenuMonths(ctx, dates, red) {
  var ulM = document.createElement('ul');
  ulM.className = "menumonths menu-lateral";
  var items = document.createElement('div');
  if (red === "fb") {
    for (var i in dates) {
      if (dates[i].type === 'month' & dates[i].red === red & dates[i].userId === ctx.auth.username) {
        anomes = dates[i].year;
        var t = menumonth(ctx, dates, dates[i], dates[i].userId, anomes, red);
        if (t !== "" & t !== undefined & t !== null) {
          items.appendChild(t);
        }
      }
    }
  } else if (red === "it") {
    for (var i in dates) {
      if (dates[i].type === 'month' & dates[i].red === 'inst' & dates[i].userId === ctx.auth.username) {
        anomesins = dates[i].year;
        var tins = menumonth(ctx, dates, dates[i], dates[i].userId, anomesins, red);
        if (tins !== "" & tins !== undefined & tins !== null) {
          items.appendChild(tins);
        }
      }
    }
  } else if (red === "wb") {
    for (var i in dates) {
      if (dates[i].type === 'month' & dates[i].red === 'web' & dates[i].userId === ctx.auth.username) {
        anomesweb = dates[i].year;
        var tweb = menumonth(ctx, dates, dates[i], dates[i].userId, anomesweb, red);
        if (tweb !== "" & tweb !== undefined & tweb !== null) {
          items.appendChild(tweb);
        }
      }
    }
  } else {
    for (var i in dates) {
      if (dates[i].type === 'month' & dates[i].red === red & dates[i].userId === ctx.auth.username) {
        anomestw = dates[i].year;
        var ttw = menumonth(ctx, dates, dates[i], dates[i].userId, anomestw, red);
        if (ttw !== "" & ttw !== undefined & ttw !== null) {
          items.appendChild(ttw);
        }
      }
    }
  }
  return items;
}

function loadViewTabs(ctx, dates, red) {
  var resultado = document.createElement('div');
  if (red === "fb") {
    for (var i in dates) {
      if (dates[i].userId === ctx.auth.username & dates[i].red === 'fb') {
        if (dates[i].type === 'year') {
          //console.log('d yeart');
          resultado.appendChild(vistaano(dates[i]));
        } else {
          //console.log('d month');
          resultado.appendChild(vistadato(ctx, dates[i]));
        }
      }
    }
  } else if (red === "inst") {
    for (var i in dates) {
      if (dates[i].userId === ctx.auth.username & dates[i].red === 'inst') {
        resultado.appendChild(vistainst(ctx, dates[i]));
      }
    }
  } else if (red === "web") {
    for (var i in dates) {
      if (dates[i].userId === ctx.auth.username & dates[i].red === 'web') {
        if (dates[i].type === 'year') {
          resultado.appendChild(vistawebano(dates[i]));
        } else {
          resultado.appendChild(vistamonthweb(ctx, dates[i]));
        }
      }
    }
  } else {
    for (var i in dates) {
      if (dates[i].userId === ctx.auth.username & dates[i].red === 'tw') {
        resultado.appendChild(vistatw(ctx, dates[i]));
      }
    }
  }

  return resultado;
}

function buscardatos(ctx, dates, red) {
  for (var i in dates) {
    if (dates[i].userId === ctx.auth.username) {
      redesv.push(dates[i].red);
    }
  }
  var index1 = redesv.indexOf(red);
  //console.log (redesv);
  //console.log (index1);
  redesv.length = 0;
  if (index1 === -1) {
    return 2;
  } else {
    return 1;
  }
}
/*
function datesfb(ctx){

    window.fbAsyncInit = function() {
      FB.init({
        appId      : '1899944563552590',
        secret     : 'be9d9f282bec3e8cd1886ab7556fa127',
        xfbml      : true,
        version    : 'v2.9'
      })
      FB.api(
        '/'+ctx.auth.username,
        'GET',
        {"fields":"id,name,about,likes,fan_count,posts,new_like_count,impressum,can_post,best_page,were_here_count", access_token: 'EAAIAb2OuyU8BACUUDpxKPyaZA2ur72UMZCbFBbZCUBgCp0DxHbyVkouwtkU04ebakvM1IfquvKrDek36fZAKfBFr2BWPhVZBPOvQwgy64VKyBKjaIZBUpKpTuVNlhiOANGZAa5uDOL25ZCVe4ZCEA4JlDf0ZAkL9MJsfgZD'},
        function (response) {
          if (response && !response.error) {
            alert(response.name + ' /n ' + response.fan_count);
            console.log(response);
          }
          else {
            console.log(response.error);
          }
        }
      );
      FB.AppEvents.logPageView();
    };

    (function(d, s, id){
       var js, fjs = d.getElementsByTagName(s)[0];
       if (d.getElementById(id)) {return;}
       js = d.createElement(s); js.id = id;
       js.src = "https://connect.facebook.net/en_US/sdk.js";
       fjs.parentNode.insertBefore(js, fjs);
     }(document, 'script', 'facebook-jssdk'));
}*/

},{"../datosano":390,"../datosanoweb":391,"../datosinst":392,"../datosmonthweb":393,"../datostwit":394,"../layout":402,"../menu-lateral-ano":403,"../menu-lateral-mes":404,"../picture-card":407,"yo-yo":388}],398:[function(require,module,exports){
'use strict';

require('babel-polyfill');
var page = require('page');
var home = require('./homepage');
var signup = require('./signup');
var signin = require('./signin');
var nologged = require('./nologged');
var uploadfb = require('./upload-dates');
var uploadinst = require('./upload-dates-inst');
var uploadtw = require('./upload-dates-tw');
var uploadtw = require('./upload-dates-web');
var invaliduser = require('./userinvalid');
var uploadp = require('./uploadp');
var updatefb = require('./update-datesfb');
var instagram = require('./instagram');
page();

},{"./homepage":396,"./instagram":399,"./nologged":405,"./signin":408,"./signup":410,"./update-datesfb":412,"./upload-dates":420,"./upload-dates-inst":414,"./upload-dates-tw":416,"./upload-dates-web":418,"./uploadp":422,"./userinvalid":424,"babel-polyfill":28,"page":361}],399:[function(require,module,exports){
'use strict';

var page = require('page');
var empty = require('empty-element');
var template = require('./template');
var title = require('title');

page('/instagram', function (ctx, next) {
  title('Evermetrics - Get Data from Instagram');
  var main = document.getElementById('main-container');
  empty(main).appendChild(template);
});

},{"./template":400,"empty-element":333,"page":361,"title":384}],400:[function(require,module,exports){
'use strict';

var _templateObject = _taggedTemplateLiteral(['<div class="col l12">\n      <div class="row">\n        <div id="caja" class="contBtnUpdate" style="text-align: center;margin: 40px 0 10px;">\n          <button  class="btn"  onclick=', '>\n              Instagram\n              <i class="fa fa-instagram" aria-hidden="true"></i>\n          </button>\n        </div>\n      </div>\n    </div>'], ['<div class="col l12">\n      <div class="row">\n        <div id="caja" class="contBtnUpdate" style="text-align: center;margin: 40px 0 10px;">\n          <button  class="btn"  onclick=', '>\n              Instagram\n              <i class="fa fa-instagram" aria-hidden="true"></i>\n          </button>\n        </div>\n      </div>\n    </div>']);

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var yo = require('yo-yo');
var landing = require('../landing');
var superagent = require('superagent');

var instagram_btn = yo(_templateObject, instagramData);

function instagramData() {
  var TOKEN = '328393463.ce4bd1a.68cb1506b4574674a13040c1ba207668';

  var counts = {};
  var likes = {};
  $.ajax({
    url: 'https://api.instagram.com/v1/users/self/',
    dataType: 'jsonp',
    type: 'GET',
    data: { access_token: TOKEN },
    success: function success(res) {
      return counts = res.data.counts;
    },
    error: function error(data) {
      return console.log(data);
    }
  });

  $.ajax({
    url: 'https://api.instagram.com/v1/users/self/media/recent/',
    dataType: 'jsonp',
    type: 'GET',
    data: { access_token: TOKEN },
    success: function success(res) {
      var media = res.data;

      // sort by likes
      media.sort(function (a, b) {
        return b.likes.count - a.likes.count;
      });
      likes = media.slice(0, 3);

      console.log(counts);
      console.log(likes);
    },
    error: function error(data) {
      return console.log(data);
    }
  });

  superagent.post('/api/instagram').send(counts).end(function (err, res) {
    if (err || !res.ok) {
      console.log('Instagram Post Method Error');
    } else {
      console.log(res);
    }
  });
}

module.exports = landing(instagram_btn);

},{"../landing":401,"superagent":380,"yo-yo":388}],401:[function(require,module,exports){
'use strict';

var _templateObject = _taggedTemplateLiteral(['<div class="container container-login">\n      <div class="row">\n        <div class="col l12">\n          <div class="row contLogoLanding">\n            <img src="logo-evermetrics.png"/>\n          </div>\n        </div>\n        ', '\n      </div>\n    </div>'], ['<div class="container container-login">\n      <div class="row">\n        <div class="col l12">\n          <div class="row contLogoLanding">\n            <img src="logo-evermetrics.png"/>\n          </div>\n        </div>\n        ', '\n      </div>\n    </div>']);

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var yo = require('yo-yo');

module.exports = function landing(box) {
  return yo(_templateObject, box);
};

},{"yo-yo":388}],402:[function(require,module,exports){
'use strict';

var _templateObject = _taggedTemplateLiteral(['<div class="content">\n     ', '\n    </div>'], ['<div class="content">\n     ', '\n    </div>']);

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var yo = require('yo-yo');

module.exports = function layout(content) {
  return yo(_templateObject, content);
};

},{"yo-yo":388}],403:[function(require,module,exports){
'use strict';

var _templateObject = _taggedTemplateLiteral(['<li class="current">\n      <a class="menu-lateral btn-datos-ano" id=\'hideshow\' href="#fb', '">', '</a>\n      <div class="collapsible-header">\n        <i class="fa fa-chevron-down rotate"  style="transition: all 2s linear;transform: rotate(0deg);float: right;font-size:12px;"></i>\n      </div>\n      <div class="collapsible-body">\n        <ul class=" menu-lateral">\n\n        </ul>\n      </div>\n    </li>'], ['<li class="current">\n      <a class="menu-lateral btn-datos-ano" id=\'hideshow\' href="#fb', '">', '</a>\n      <div class="collapsible-header">\n        <i class="fa fa-chevron-down rotate"  style="transition: all 2s linear;transform: rotate(0deg);float: right;font-size:12px;"></i>\n      </div>\n      <div class="collapsible-body">\n        <ul class=" menu-lateral">\n\n        </ul>\n      </div>\n    </li>']);

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var yo = require('yo-yo');

module.exports = function (dato) {
  return yo(_templateObject, dato.year, dato.year);
};

},{"yo-yo":388}],404:[function(require,module,exports){
'use strict';

var _templateObject = _taggedTemplateLiteral(['', ''], ['', '']),
    _templateObject2 = _taggedTemplateLiteral(['<li class="liMes"><a href="#fb', '', '">', '</a></li>'], ['<li class="liMes"><a href="#fb', '', '">', '</a></li>']),
    _templateObject3 = _taggedTemplateLiteral(['<li class="liMes"><a href="#it', '', '">', '</a></li>'], ['<li class="liMes"><a href="#it', '', '">', '</a></li>']),
    _templateObject4 = _taggedTemplateLiteral(['<li class="liMes"><a href="#wb', '', '">', '</a></li>'], ['<li class="liMes"><a href="#wb', '', '">', '</a></li>']),
    _templateObject5 = _taggedTemplateLiteral(['<li class="liMes"><a href="#tw', '', '">', '</a></li>'], ['<li class="liMes"><a href="#tw', '', '">', '</a></li>']);

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var yo = require('yo-yo');
var anoatcm = [];
var anoatcins = [];
var anoatctw = [];
var anoatcweb = [];

module.exports = function (ctx, dates, dato, user, anomes, red) {

  var facebook = yo(_templateObject, ulfb(ctx, dates, user, anomes, red));

  var instagram = yo(_templateObject, ulins(ctx, dates, user, anomes, red));

  var twitter = yo(_templateObject, ultwi(ctx, dates, user, anomes, red));

  var web = yo(_templateObject, ulweb(ctx, dates, user, anomes, red));

  if (dato.red === 'fb') {
    return facebook;
  } else if (dato.red === 'web') {
    return web;
  } else if (dato.red === 'inst') {
    return instagram;
  } else {
    return twitter;
  }
};

function ulfb(ctx, dates, user, anomes, red) {
  var ulM = document.createElement('ul');
  ulM.className = "tab-content-datosm fb" + anomes;
  var index = anoatcm.indexOf(anomes);
  if (index === -1 & user === ctx.auth.username & red === 'fb') {
    anoatcm.push(anomes);
    for (var i in dates) {
      if (anomes === dates[i].year & dates[i].userId === ctx.auth.username & dates[i].type === 'month' & dates[i].red === 'fb') {
        ulM.appendChild(yo(_templateObject2, dates[i].year, dates[i].month, dates[i].month));
        //return yo`<ul id="#fb${dates[i].year}" class="tab-content-datos"><li class="liMes"><a href="#fb${dates[i].year}${dates[i].month}">${dates[i].month}</a></li></ul>`;
      }
    }
  }

  var hayli = ulM.getElementsByTagName("li").length;
  if (hayli !== 0) {
    return ulM;
  }
}

function ulins(ctx, dates, user, anomes, red) {
  var ulMins = document.createElement('ul');
  ulMins.className = "tab-content-datosm it" + anomes;
  var index = anoatcins.indexOf(anomes);
  if (index === -1 & user === ctx.auth.username & red === 'it') {
    anoatcins.push(anomes);
    for (var i in dates) {
      if (anomes === dates[i].year & dates[i].userId === ctx.auth.username & dates[i].type === 'month' & dates[i].red === 'inst') {
        ulMins.appendChild(yo(_templateObject3, dates[i].year, dates[i].month, dates[i].month));
        //return yo`<ul id="#fb${dates[i].year}" class="tab-content-datos"><li class="liMes"><a href="#fb${dates[i].year}${dates[i].month}">${dates[i].month}</a></li></ul>`;
      }
    }
  }

  var hayli = ulMins.getElementsByTagName("li").length;
  if (hayli !== 0) {
    return ulMins;
  }
}

function ulweb(ctx, dates, user, anomes, red) {
  var ulMweb = document.createElement('ul');
  ulMweb.className = "tab-content-datosm wb" + anomes;
  var index = anoatcweb.indexOf(anomes);
  if (index === -1 & user === ctx.auth.username & red === 'wb') {
    anoatcweb.push(anomes);
    for (var i in dates) {
      if (anomes === dates[i].year & dates[i].userId === ctx.auth.username & dates[i].type === 'month' & dates[i].red === 'web') {
        ulMweb.appendChild(yo(_templateObject4, dates[i].year, dates[i].month, dates[i].month));
        //return yo`<ul id="#fb${dates[i].year}" class="tab-content-datos"><li class="liMes"><a href="#fb${dates[i].year}${dates[i].month}">${dates[i].month}</a></li></ul>`;
      }
    }
  }

  var hayli = ulMweb.getElementsByTagName("li").length;
  if (hayli !== 0) {
    return ulMweb;
  }
}

function ultwi(ctx, dates, user, anomes, red) {
  var ulMtw = document.createElement('ul');
  ulMtw.className = "tab-content-datosm tw" + anomes;
  var index = anoatctw.indexOf(anomes);
  if (index === -1 & user === ctx.auth.username & red === 'tw') {
    anoatctw.push(anomes);
    for (var i in dates) {
      if (anomes === dates[i].year & dates[i].userId === ctx.auth.username & dates[i].type === 'month' & dates[i].red === 'tw') {
        ulMtw.appendChild(yo(_templateObject5, dates[i].year, dates[i].month, dates[i].month));
        //return yo`<ul id="#fb${dates[i].year}" class="tab-content-datos"><li class="liMes"><a href="#fb${dates[i].year}${dates[i].month}">${dates[i].month}</a></li></ul>`;
      }
    }
  }

  var hayli = ulMtw.getElementsByTagName("li").length;
  if (hayli !== 0) {
    return ulMtw;
  }
}

},{"yo-yo":388}],405:[function(require,module,exports){
'use strict';

var page = require('page');
var empty = require('empty-element');
var template = require('./template');
var title = require('title');

page('/nologged', function (ctx, next) {
  title('Evermetrics - No logged in');
  var main = document.getElementById('main-container');
  empty(main).appendChild(template);
});

},{"./template":406,"empty-element":333,"page":361,"title":384}],406:[function(require,module,exports){
'use strict';

var _templateObject = _taggedTemplateLiteral(['<div class="container container-login">\n    <div class="row">\n      <div class="col l12">\n        <div class="row">\n          <h1 class="titleNologged"><i class="fa fa-exclamation-triangle" aria-hidden="true"></i>Necesitas iniciar sesi\xF3n para ver este contenido</h1>\n          <div class="contBtnLoggin">\n            <a href="/signin" class="btnLoggin">Iniciar sesi\xF3n</a>\n          </div>\n        </div>\n      </div>\n    </div>\n  </div>'], ['<div class="container container-login">\n    <div class="row">\n      <div class="col l12">\n        <div class="row">\n          <h1 class="titleNologged"><i class="fa fa-exclamation-triangle" aria-hidden="true"></i>Necesitas iniciar sesi\xF3n para ver este contenido</h1>\n          <div class="contBtnLoggin">\n            <a href="/signin" class="btnLoggin">Iniciar sesi\xF3n</a>\n          </div>\n        </div>\n      </div>\n    </div>\n  </div>']);

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var yo = require('yo-yo');

var nologged = yo(_templateObject);

module.exports = nologged;

},{"yo-yo":388}],407:[function(require,module,exports){
'use strict';

var _templateObject = _taggedTemplateLiteral(['<div class="estadisticas">\n       <div id="fb', '', '" class="col m12 cont-datos tab-content-datos">\n         <div class="contHeaderVisual">\n           <div class="contTitleVisual">\n             <h4 class="title-mes">', ' - ', '</h4>\n           </div>\n           <div class="logo-cliente">\n             <img src="', '"  />\n           </div>\n         </div>\n         <h4>Crecimiento</h4>\n             <div class="row">\n               <div class="col m4 cont-variables">\n                 <h5><i class="fa fa-users" aria-hidden="true"></i> Fans Totales</h5>\n                 <p id="count-number" class="timer count-title" data-to="', '" data-speed="1500"></p>\n               </div>\n               <div class="col m4 cont-variables">\n                 <h5><i class="fa fa-thumbs-o-up" aria-hidden="true"></i> Fans Nuevos</h5>\n                 <p id="count-number" class="timer count-title" data-to="', '" data-speed="1500"></p>\n               </div>\n               <div class="col m4 cont-variables">\n                 <h5><i class="fa fa-thumbs-o-down" aria-hidden="true"></i> No me Gusta</h5>\n                 <p id="count-number" class="timer count-title" data-to="', '" data-speed="1500"></p>\n               </div>\n             </div>\n             <div class="row">\n               <div class="col m4 cont-variables">\n                 <h5><i class="fa fa-exchange" aria-hidden="true"></i> Impresi\xF3n</h5>\n                 <p id="count-number" class="timer count-title" data-to="', '" data-speed="1500"></p>\n               </div>\n               <div class="col m4 cont-variables">\n                 <h5><i class="fa fa-user" aria-hidden="true"></i> Usuarios Activos</h5>\n                 <p id="count-number" class="timer count-title" data-to="', '" data-speed="1500"></p>\n               </div>\n               <div class="col m4 cont-variables">\n                 <h5><i class="fa fa-thumbs-o-up" aria-hidden="true"></i> Me Gusta (promedio x d\xEDa)</h5>\n                 <p id="count-number" class="timer count-title" data-to="', '" data-speed="1500"></p>\n               </div>\n             </div>\n             <div class="row">\n               <div class="col m6 cont-variables">\n                 <h5><i class="fa fa-newspaper-o" aria-hidden="true"></i> Post en el mes</h5>\n                 <p id="count-number" class="timer count-title" data-to="', '" data-speed="1500"></p>\n               </div>\n               <div class="col m6 cont-variables">\n                 <h5><i class="fa fa-line-chart" aria-hidden="true"></i> Alcance (promedio por d\xEDa)</h5>\n                 <p id="count-number" class="timer count-title" data-to="', '" data-speed="1500"></p>\n               </div>\n             </div>\n\n         <h4>Interacci\xF3n</h4>\n           <div class="row">\n             <div class="col m6 cont-variables">\n               <h5><i class="fa fa-external-link" aria-hidden="true"></i> Referencias Externas</h5>\n               <p id="count-number" class="timer count-title" data-to="', '" data-speed="1500"></p>\n             </div>\n             <div class="col m6 cont-variables">\n               <h5><i class="fa fa-window-restore" aria-hidden="true"></i> Vistas Pesta\xF1as</h5>\n               <p id="count-number" class="timer count-title" data-to="', '" data-speed="1500"></p>\n             </div>\n           </div>\n           <div class="row">\n             <div class="col m6 cont-variables">\n               <h5><i class="fa fa-window-maximize" aria-hidden="true"></i> Principales Pesta\xF1as</h5>\n               <p>', '</p>\n             </div>\n             <div class="col m6 cont-variables">\n               <h5><i class="fa fa-link" aria-hidden="true"></i> Principales Referencias</h5>\n               <p>', '</p>\n             </div>\n           </div>\n         <h4>Contenido</h4>\n           <div class="row">\n               <div class="col m6 cont-variables">\n                 <h5><i class="fa fa-picture-o" aria-hidden="true"></i> Post m\xE1s efectivo</h5>\n                 <img src="', '" style="width:100%" />\n               </div>\n               <div class="col m6 cont-variables">\n                 <h5><i class="fa fa-file-text-o" aria-hidden="true"></i> Datos del post</h5>\n                 <p>', '</p>\n               </div>\n           </div>\n       </div>\n  </div>'], ['<div class="estadisticas">\n       <div id="fb', '', '" class="col m12 cont-datos tab-content-datos">\n         <div class="contHeaderVisual">\n           <div class="contTitleVisual">\n             <h4 class="title-mes">', ' - ', '</h4>\n           </div>\n           <div class="logo-cliente">\n             <img src="', '"  />\n           </div>\n         </div>\n         <h4>Crecimiento</h4>\n             <div class="row">\n               <div class="col m4 cont-variables">\n                 <h5><i class="fa fa-users" aria-hidden="true"></i> Fans Totales</h5>\n                 <p id="count-number" class="timer count-title" data-to="', '" data-speed="1500"></p>\n               </div>\n               <div class="col m4 cont-variables">\n                 <h5><i class="fa fa-thumbs-o-up" aria-hidden="true"></i> Fans Nuevos</h5>\n                 <p id="count-number" class="timer count-title" data-to="', '" data-speed="1500"></p>\n               </div>\n               <div class="col m4 cont-variables">\n                 <h5><i class="fa fa-thumbs-o-down" aria-hidden="true"></i> No me Gusta</h5>\n                 <p id="count-number" class="timer count-title" data-to="', '" data-speed="1500"></p>\n               </div>\n             </div>\n             <div class="row">\n               <div class="col m4 cont-variables">\n                 <h5><i class="fa fa-exchange" aria-hidden="true"></i> Impresi\xF3n</h5>\n                 <p id="count-number" class="timer count-title" data-to="', '" data-speed="1500"></p>\n               </div>\n               <div class="col m4 cont-variables">\n                 <h5><i class="fa fa-user" aria-hidden="true"></i> Usuarios Activos</h5>\n                 <p id="count-number" class="timer count-title" data-to="', '" data-speed="1500"></p>\n               </div>\n               <div class="col m4 cont-variables">\n                 <h5><i class="fa fa-thumbs-o-up" aria-hidden="true"></i> Me Gusta (promedio x d\xEDa)</h5>\n                 <p id="count-number" class="timer count-title" data-to="', '" data-speed="1500"></p>\n               </div>\n             </div>\n             <div class="row">\n               <div class="col m6 cont-variables">\n                 <h5><i class="fa fa-newspaper-o" aria-hidden="true"></i> Post en el mes</h5>\n                 <p id="count-number" class="timer count-title" data-to="', '" data-speed="1500"></p>\n               </div>\n               <div class="col m6 cont-variables">\n                 <h5><i class="fa fa-line-chart" aria-hidden="true"></i> Alcance (promedio por d\xEDa)</h5>\n                 <p id="count-number" class="timer count-title" data-to="', '" data-speed="1500"></p>\n               </div>\n             </div>\n\n         <h4>Interacci\xF3n</h4>\n           <div class="row">\n             <div class="col m6 cont-variables">\n               <h5><i class="fa fa-external-link" aria-hidden="true"></i> Referencias Externas</h5>\n               <p id="count-number" class="timer count-title" data-to="', '" data-speed="1500"></p>\n             </div>\n             <div class="col m6 cont-variables">\n               <h5><i class="fa fa-window-restore" aria-hidden="true"></i> Vistas Pesta\xF1as</h5>\n               <p id="count-number" class="timer count-title" data-to="', '" data-speed="1500"></p>\n             </div>\n           </div>\n           <div class="row">\n             <div class="col m6 cont-variables">\n               <h5><i class="fa fa-window-maximize" aria-hidden="true"></i> Principales Pesta\xF1as</h5>\n               <p>', '</p>\n             </div>\n             <div class="col m6 cont-variables">\n               <h5><i class="fa fa-link" aria-hidden="true"></i> Principales Referencias</h5>\n               <p>', '</p>\n             </div>\n           </div>\n         <h4>Contenido</h4>\n           <div class="row">\n               <div class="col m6 cont-variables">\n                 <h5><i class="fa fa-picture-o" aria-hidden="true"></i> Post m\xE1s efectivo</h5>\n                 <img src="', '" style="width:100%" />\n               </div>\n               <div class="col m6 cont-variables">\n                 <h5><i class="fa fa-file-text-o" aria-hidden="true"></i> Datos del post</h5>\n                 <p>', '</p>\n               </div>\n           </div>\n       </div>\n  </div>']);

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var yo = require('yo-yo');

module.exports = function (ctx, dato) {
  return yo(_templateObject, dato.year, dato.month, dato.month, dato.year, ctx.auth.src, dato.allfans || 0, dato.newfans || 0, dato.nolikes || 0, dato.prints || 0, dato.activeusers || 0, dato.likebyday || 0, dato.postbymonth || 0, dato.scopebyday || 0, dato.externalreference || 0, dato.viewswindows || 0, dato.topwindows || 0, dato.topreference || 0, dato.postsrc, dato.datespost);
};

},{"yo-yo":388}],408:[function(require,module,exports){
'use strict';

var page = require('page');
var empty = require('empty-element');
var template = require('./template');
var title = require('title');

page('/signin', function (ctx, next) {
  title('Evermetrics - Signin');
  var main = document.getElementById('main-container');
  empty(main).appendChild(template);
});

},{"./template":409,"empty-element":333,"page":361,"title":384}],409:[function(require,module,exports){
'use strict';

var _templateObject = _taggedTemplateLiteral(['<div class="col l12">\n      <div class="row">\n        <div class="signup-box">\n          <form class="signup-form" action="/login" method="POST">\n            <div class="section cont-form-login" style="text-align:center;">\n              <input type="text" name="username" placeholder="Nombre de usuario">\n              <input type="password" name="password" placeholder="Contrase\xF1a">\n              <button class="btn waves-effect waves-light btn-login" type="submit">Iniciar sesi\xF3n</button>\n            </div>\n          </form>\n        </div>\n        <div class="row hide">\n          <a href="/signup">No tienes una cuenta</a>\n        </div>\n      </div>\n    </div>'], ['<div class="col l12">\n      <div class="row">\n        <div class="signup-box">\n          <form class="signup-form" action="/login" method="POST">\n            <div class="section cont-form-login" style="text-align:center;">\n              <input type="text" name="username" placeholder="Nombre de usuario">\n              <input type="password" name="password" placeholder="Contrase\xF1a">\n              <button class="btn waves-effect waves-light btn-login" type="submit">Iniciar sesi\xF3n</button>\n            </div>\n          </form>\n        </div>\n        <div class="row hide">\n          <a href="/signup">No tienes una cuenta</a>\n        </div>\n      </div>\n    </div>']);

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var yo = require('yo-yo');
var landing = require('../landing');

var loginform = yo(_templateObject);

module.exports = landing(loginform);

},{"../landing":401,"yo-yo":388}],410:[function(require,module,exports){
'use strict';

var page = require('page');
var empty = require('empty-element');
var template = require('./template');
var title = require('title');

page('/signup', function (ctx, next) {
  title('Evermetrics - Signup');
  var main = document.getElementById('main-container');
  empty(main).appendChild(template);
});

},{"./template":411,"empty-element":333,"page":361,"title":384}],411:[function(require,module,exports){
'use strict';

var _templateObject = _taggedTemplateLiteral(['<div class="col l12">\n      <div class="row">\n        <div class="signup-box">\n          <form id="formUpload" enctype="multipart/form-data" class="signup-form form-upload" method="POST" onsubmit=', '>\n            <div class="divider"></div>\n            <div class="section" style="text-align:center;">\n              <input type="text" name="name" placeholder="Nombre">\n              <input type="email" name="email" placeholder="Email">\n              <input type="text" name="username" placeholder="Nombre de usuario">\n              <input type="password" name="password" placeholder="Contrase\xF1a">\n              <div class="contBtnLogo">\n                <div id="fileName" class="fileUpload btn cyan">\n                  <span><i class="fa fa-file-excel-o" aria-hidden="true" style="padding-right:10px;"></i>Subir logo</span>\n                  <input required name="logo" id="file" type="file" class="upload" onchange=', ' />\n                </div>\n                <button id="btnCancel" type="button" class="btn red hide" onclick=', '><i class="fa fa-times" aria-hidden="true"></i></button>\n              </div>\n              <button class="btn waves-effect waves-light btn-login" type="submit">Registrate</button>\n            </div>\n          </form>\n        </div>\n        <div class="row">\n          <a href="/signin">Tienes una cuenta</a>\n        </div>\n      </div>\n    </div>'], ['<div class="col l12">\n      <div class="row">\n        <div class="signup-box">\n          <form id="formUpload" enctype="multipart/form-data" class="signup-form form-upload" method="POST" onsubmit=', '>\n            <div class="divider"></div>\n            <div class="section" style="text-align:center;">\n              <input type="text" name="name" placeholder="Nombre">\n              <input type="email" name="email" placeholder="Email">\n              <input type="text" name="username" placeholder="Nombre de usuario">\n              <input type="password" name="password" placeholder="Contrase\xF1a">\n              <div class="contBtnLogo">\n                <div id="fileName" class="fileUpload btn cyan">\n                  <span><i class="fa fa-file-excel-o" aria-hidden="true" style="padding-right:10px;"></i>Subir logo</span>\n                  <input required name="logo" id="file" type="file" class="upload" onchange=', ' />\n                </div>\n                <button id="btnCancel" type="button" class="btn red hide" onclick=', '><i class="fa fa-times" aria-hidden="true"></i></button>\n              </div>\n              <button class="btn waves-effect waves-light btn-login" type="submit">Registrate</button>\n            </div>\n          </form>\n        </div>\n        <div class="row">\n          <a href="/signin">Tienes una cuenta</a>\n        </div>\n      </div>\n    </div>']);

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var yo = require('yo-yo');
var landing = require('../landing');
var request = require('superagent');

var signupForm = yo(_templateObject, onsubmit, onchange, cancel);
//action="/signup"
function toggleButtons() {
  document.getElementById('fileName').classList.toggle('hide');
  document.getElementById('btnCancel').classList.toggle('hide');
}
function cancel() {
  toggleButtons();
  document.getElementById('fileName').reset();
}

function onchange() {
  toggleButtons();
}

function onsubmit(ev) {
  ev.preventDefault();
  var data = new FormData(this);
  request.post('/signup').send(data).end(function (err, res) {
    toggleButtons();
    document.getElementById('formUpload').reset();
  });
}

module.exports = landing(signupForm);

},{"../landing":401,"superagent":380,"yo-yo":388}],412:[function(require,module,exports){
'use strict';

var page = require('page');
var empty = require('empty-element');
var template = require('./template');
var title = require('title');

page('/update-datesfb', function (ctx, next) {
  title('Evermetrics - Update Dates from Facebook');
  var main = document.getElementById('main-container');
  empty(main).appendChild(template);
});

},{"./template":413,"empty-element":333,"page":361,"title":384}],413:[function(require,module,exports){
'use strict';

var _templateObject = _taggedTemplateLiteral(['<div class="col l12">\n      <div class="row">\n        <div id="caja" class="contBtnUpdate" style="text-align: center;margin: 40px 0 10px;">\n          <input type="button"  class="btn" value="Actualizar" onclick=', '>\n        </div>\n      </div>\n    </div>'], ['<div class="col l12">\n      <div class="row">\n        <div id="caja" class="contBtnUpdate" style="text-align: center;margin: 40px 0 10px;">\n          <input type="button"  class="btn" value="Actualizar" onclick=', '>\n        </div>\n      </div>\n    </div>']);

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var yo = require('yo-yo');
var landing = require('../landing');

var updatebtn = yo(_templateObject, datesfb);

function datesfb() {
  window.fbAsyncInit = function () {
    FB.init({
      appId: '563428367190351',
      secret: '0657823647bd8087717cc22e29c1e1be',
      xfbml: true,
      version: 'v2.9'
    });
    /*FB.api(
      '/me',
      'GET',
      {"fields":"id,name,about,likes,posts", access_token: 'EAAaZCZCVDNsU4BAM8OgVJqnc6JLDSSg189AnZAf0O3iuxf53lPMXvRIQyVuvz6TvHmZAZCXrbq8dp7Y0tdVeOHZCJShEMUWQOgvvYBnT2atdjM3ZC3kZAPAZCgIOwAF4mlmAATYJhdieEHpIIt3C4hSzEiMwu1kOe6Q8ZD'},
      function(response) {
        console.log(response);
        mostrardates(response.name);
        console.log(response.name);
      }
    );*/
    //{"fields":"id,name,about,link,talking_about_count,fan_count,engagement,posts{likes,comments,link,message,reactions}", access_token: 'EAAIAb2OuyU8BACUUDpxKPyaZA2ur72UMZCbFBbZCUBgCp0DxHbyVkouwtkU04ebakvM1IfquvKrDek36fZAKfBFr2BWPhVZBPOvQwgy64VKyBKjaIZBUpKpTuVNlhiOANGZAa5uDOL25ZCVe4ZCEA4JlDf0ZAkL9MJsfgZD'},

    /*      FB.api(
            '/eversocial',
            'GET',
            {"fields":"id,name,about,likes,fan_count,posts,new_like_count,impressum,can_post,best_page,were_here_count", access_token: 'EAAIAb2OuyU8BACUUDpxKPyaZA2ur72UMZCbFBbZCUBgCp0DxHbyVkouwtkU04ebakvM1IfquvKrDek36fZAKfBFr2BWPhVZBPOvQwgy64VKyBKjaIZBUpKpTuVNlhiOANGZAa5uDOL25ZCVe4ZCEA4JlDf0ZAkL9MJsfgZD'},
            function (response) {
              if (response && !response.error) {
                alert(response.name + ' /n ' + response.fan_count);
                console.log(response);
              }
              else {
                console.log(response.error);
              }
            }
          );*/
    /*FB.api(
        '/eversocial/insights/page_impressions,page_fan_adds,page_fan_removes,page_views_login,page_admin_num_posts,post_fan_reach,page_views_external_referrals,page_tab_views_login_top_unique',
        {"since":"1493614800", "until":"1494133200", access_token: 'EAACEdEose0cBAGKxoYE8cPkuKKFqKwqmhxIwWyANPKCG4dqS8qTcud1cLkyUVSnWia1ePrfFK3CM7DyvHI9NLaUA8ujmaRKQHZC7r76RkHHXc2Hd7HbTsnnv5yxjNbNq9uJOSAn05ZBDrUwUZAxqi5z30RVbR7voNr0zROlBcExdam2F4YSkt4hHSNpX24ZD'},
        function (response) {
          if (response && !response.error) {
            console.log(response);
          }
          else {
            console.log(response.error);
          }
        }
    );*/
    //token app evermetric EAAIAb2OuyU8BAKGwCoOE2wexkpx4ZCcBLiwkDtX6Ybf1FdCokv4Fc8pGnOWzWtH4znQyNylLA759ZBa5sGFa3oqUKiiMPEX67OzCjbkAzB6WVPi7eewYHewpYZCZBOkaOKglDHOp6RaIZCb5QV6Ilgpz3C4xCVT4ZD
    //token de app prueba EAAaZCZCVDNsU4BAM8OgVJqnc6JLDSSg189AnZAf0O3iuxf53lPMXvRIQyVuvz6TvHmZAZCXrbq8dp7Y0tdVeOHZCJShEMUWQOgvvYBnT2atdjM3ZC3kZAPAZCgIOwAF4mlmAATYJhdieEHpIIt3C4hSzEiMwu1kOe6Q8ZD
    var token = 'EAACEdEose0cBABn06EZCHpafEIvb129xMbFgGg1ZCkX7unFZBv0d1Yo3DZAufNFgB27CGcqmnVfduy6aZA4xa4YYEOMBO6wbLZA517aZBmnwyLCYPfsm9wNZAYn7h2keS1gncz6YSp8LsgGWtZBy3Scb7uOmi7PHp2ZAtSdLX9XkUoriCeUF9qkIcfqkDVamKz52MZD';
    FB.api('/maratondelasfloresmedellin', 'GET', { "fields": "id,name,posts.until(1498885199).since(1496206800){likes,comments,message,created_time,full_picture,link,insights.metric(post_impressions_unique)}", access_token: token }, function (response) {
      console.log(response);
      if (response && !response.error) {
        var numLikes = 0;
        var numComments = 0;
        var bestPostId;
        var posicionBest;
        var mayorCantLikes = 0;
        var alcancepost = 0;
        response.posts.data.map(function (datos, indexE) {

          if (datos.likes !== undefined) {
            datos.likes.data.map(function (valor) {
              numLikes = datos.likes.data.length;
            });
          } else {
            numLikes = 0;
          }
          if (numLikes > mayorCantLikes) {
            mayorCantLikes = numLikes;
            bestPostId = datos.id;
            posicionBest = indexE;
          }
        });

        console.log('El post de mayor likes es ' + bestPostId + ' con ' + mayorCantLikes);

        console.log(response.posts.data[posicionBest].id);
        var datetime = new Date(response.posts.data[posicionBest].created_time).toUTCString().split(" ").slice(1, 4).join(" "); //new Date(datos.created_time).toDateString();
        var messagePost = response.posts.data[posicionBest].message;
        var link = response.posts.data[posicionBest].link;
        var rutaImg = response.posts.data[posicionBest].full_picture;
        if (response.posts.data[posicionBest] !== undefined) {
          response.posts.data[posicionBest].likes.data.map(function (valor) {
            numLikes = response.posts.data[posicionBest].likes.data.length;
          });
        } else {
          numLikes = 0;
        }

        if (response.posts.data[posicionBest].comments !== undefined) {
          response.posts.data[posicionBest].comments.data.map(function (valor) {
            numComments = response.posts.data[posicionBest].comments.data.length;
          });
        } else {
          numComments = 0;
        }

        if (response.posts.data[posicionBest].insights !== undefined) {
          response.posts.data[posicionBest].insights.data.map(function (valor) {
            valor.values.map(function (dato) {
              alcancepost = dato.value;
            });
          });
        } else {
          alcancepost = 0;
        }

        var arrayBestPost = [datetime, link, rutaImg, numLikes, numComments, alcancepost];
        var key = "bestPost";
        console.log(arrayBestPost);
      } else {
        console.log(response.error);
      }
    });

    /*FB.api(
        '/maratondelasfloresmedellin/insights/page_tab_views_login_top_unique',
        {"period":"day","since":"1496206800", "until":"1498885199", access_token: token},
        function (response) {
          console.log(response);
          if (response && !response.error) {
            var numviewtabs=0;
            var numviewmayor=0;
            var numviewmedio=0;
            var numviewmenor=0;
            var objectmayor=[];
            var objectmedio=[];
            var objecter=[];
            var yaestam= [];
            var acummayor=0;
            var acummedio=0;
            var acummenor=0;
            response.data.map(function(datos){
              datos.values.map(function(valor){
                 for(var i in valor.value){
                    var key = i;
                    numviewtabs = valor.value[i];
                    var index = yaestam.indexOf(key);
                    if(numviewtabs > numviewmayor && index === -1){
                      numviewmayor = numviewtabs;
                      objectmayor = [key, numviewmayor];
                      yaestam.push(key);
                    }else if(numviewtabs > numviewmayor && objectmayor[0] === key){
                      numviewmayor = numviewtabs;
                      objectmayor = [key, numviewmayor];
                    }
                    else if(numviewmedio < numviewmayor && numviewmedio < numviewtabs && index === -1){
                      numviewmedio = numviewtabs;
                      objectmedio = [key, numviewmedio];
                      yaestam.push(key);
                    }else if(numviewmedio < numviewmayor && numviewmedio < numviewtabs && objectmedio[0] === key){
                      numviewmedio = numviewtabs;
                      objectmedio = [key, numviewmedio];
                    }
                    else if(numviewmenor<numviewtabs && numviewmenor < numviewmedio && index === -1){
                      numviewmenor = numviewtabs;
                      objecter = [key, numviewmenor]
                      yaestam.push(key);
                    }else if(numviewmenor<numviewtabs && numviewmenor < numviewmedio && objecter[0] === key){
                      numviewmenor = numviewtabs;
                      objecter = [key, numviewmenor]
                    }
                }
               })
            })
            response.data.map(function(datos){
              datos.values.map(function(valor){
                 for(var i in valor.value){
                  console.log(i);
                    if(objectmayor[0] === i){
                      acummayor = acummayor + valor.value[i];
                    }
                    if(objectmedio[0] === i){
                      acummedio = acummedio + valor.value[i];
                    }
                    if(objecter[0] === i){
                      acummenor = acummenor + valor.value[i];
                    }
                }
                })
            })
             var key = "princTabs";
               var cadenaPrinTabs = objectmayor[0] + ': ' + acummayor + ' '+ objectmedio[0]  + ': ' + acummedio + ' ' + objecter[0] + ': ' + acummenor;
               console.log(cadenaPrinTabs);
          }
          else {
            console.log(response.error);
          }
        }
    );*/

    /*FB.api(
      '/maratondelasfloresmedellin/insights/page_views_external_referrals',
      {"since":"1496206800", "until":"1498885199", access_token: token},
      function (response) {
        console.log(response);
        if (response && !response.error) {
          var numrefexternal = 0;
          var nummayor =0;
          var nummedio =0;
          var numter =0;
          var objectmayor=[];
          var objectmedio=[];
          var objecter=[];
          var yaestam= [];
          response.data.map(function(datos){
            datos.values.map(function(valor){
               for(var i in valor.value){
                  var key = i;
                  console.log(key);
                  numrefexternal = valor.value[i];
                  var index = yaestam.indexOf(key);
                  if(numrefexternal > nummayor && index === -1){
                    nummayor = numrefexternal;
                    objectmayor = [key, nummayor];
                    yaestam.push(key);
                  }else if(numrefexternal > nummayor && objectmayor[0] === key){
                    nummayor = numrefexternal;
                    objectmayor = [key, nummayor];
                  }
                  else if(nummedio < nummayor && nummedio < numrefexternal && index === -1){
                    nummedio = numrefexternal;
                    objectmedio = [key, nummedio];
                    yaestam.push(key);
                  }else if(nummedio < nummayor && nummedio < numrefexternal && objectmedio[0] === key){
                    nummedio = numrefexternal;
                    objectmedio = [key, nummedio];
                  }
                  else if(numter<numrefexternal && numter < nummedio && index === -1){
                    numter = numrefexternal;
                    objecter = [key, numter]
                    yaestam.push(key);
                  }else if(numter<numrefexternal && numter < nummedio && objecter[0] === key){
                    numter = numrefexternal;
                    objecter = [key, numter]
                  }
              }
            })
          })
            var arrayPrinRef = [objectmayor,objectmedio,objecter];
          console.log(arrayPrinRef);
         /* var cadenaPrinRef = objectmayor[0] + ': ' + objectmayor[1] + '\n'
            + objectmedio[0] + ': ' + objectmedio[1] + '\n'
            + objecter[0] + ': ' + objecter[1];cierro comentario
         var cadenaPrinRef = objectmayor[0] + ': ' + objectmayor[1] + ' ' + objectmedio[0] + ': ' + objectmedio[1] + ' ' + objecter[0] + ': ' + objecter[1];
        }
        else {
          console.log(response.error);
        }
      }
    );*/
    /*FB.api(
        '/maratondelasfloresmedellin/insights/page_tab_views_login_top_unique',
        {"period":"day","since":"1493614800", "until":"1494478800", access_token: token},
        function (response) {
          if (response && !response.error) {
            var numviewtabs=0;
            var numviewmayor=0;
            var numviewmedio=0;
            var numviewmenor=0;
            var objectmayor=[];
            var objectmedio=[];
            var objecter=[];
            var yaestam= [];
            var acummayor=0;
            var acummedio=0;
            var acummenor=0;
            response.data.map(function(datos){
              datos.values.map(function(valor){
                 for(var i in valor.value){
                    var key = i;
                    numviewtabs = valor.value[i];
                    var index = yaestam.indexOf(key);
                    if(numviewtabs > numviewmayor && index === -1){
                      numviewmayor = numviewtabs;
                      objectmayor = [key, numviewmayor];
                      yaestam.push(key);
                    }else if(numviewtabs > numviewmayor && objectmayor[0] === key){
                      numviewmayor = numviewtabs;
                      objectmayor = [key, numviewmayor];
                    }
                    else if(numviewmedio < numviewmayor && numviewmedio < numviewtabs && index === -1){
                      numviewmedio = numviewtabs;
                      objectmedio = [key, numviewmedio];
                      yaestam.push(key);
                    }else if(numviewmedio < numviewmayor && numviewmedio < numviewtabs && objectmedio[0] === key){
                      numviewmedio = numviewtabs;
                      objectmedio = [key, numviewmedio];
                    }
                    else if(numviewmenor<numviewtabs && numviewmenor < numviewmedio && index === -1){
                      numviewmenor = numviewtabs;
                      objecter = [key, numviewmenor]
                      yaestam.push(key);
                    }else if(numviewmenor<numviewtabs && numviewmenor < numviewmedio && objecter[0] === key){
                      numviewmenor = numviewtabs;
                      objecter = [key, numviewmenor]
                    }
                }
               })
            })
            response.data.map(function(datos){
              datos.values.map(function(valor){
                 for(var i in valor.value){
                    if(objectmayor[0] === i){
                      acummayor = acummayor + valor.value[i];
                    }
                }
                for(var i in valor.value){
                    if(objectmedio[0] === i){
                      acummedio = acummedio + valor.value[i];
                    }
                }
                for(var i in valor.value){
                    if(objecter[0] === i){
                      acummenor = acummenor + valor.value[i];
                    }
                }
               })
            })
             var arrayMayor =[objectmayor[0], acummayor];
            var arrayMedio =[objectmedio[0], acummedio];
            var arrayMenor =[objecter[0], acummenor];
            var arrayPrinTabs = [arrayMayor,arrayMedio,arrayMenor]
            var key = "princTabs";
            console.log(objectmayor[0] + ': ' + acummayor + '\n'
            + objectmedio[0] + ': ' + acummedio + '\n'
            + objecter[0] + ': ' + acummenor);
            console.log(arrayPrinTabs);
          }
          else {
            console.log(response.error);
          }
        }
    );*/
    FB.AppEvents.logPageView();
  };

  (function (d, s, id) {
    var js,
        fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) {
      return;
    }
    js = d.createElement(s);js.id = id;
    js.src = "https://connect.facebook.net/en_US/sdk.js";
    fjs.parentNode.insertBefore(js, fjs);
  })(document, 'script', 'facebook-jssdk');

  /*var infoPage = datePage();
  var infoStadisticas = stadisticsPage();
   alert('Datos de la página  \n Fans totales: ' + infoPage.fan_count + ' \n' +
  'Fans nuevos: ' + )*/
}

function sumarTotalViewsMayores(response) {
  response.data.map(function (datos) {
    datos.values.map(function (valor) {

      for (var i in valor.value) {
        var index2 = acum.indexOf(key);
        if (index2 === -1) {
          acum.push(key);
          console.log(acum);
        }
      }
    });
  });
}

function mostrardates(response) {
  alert(response);
}

function inicializarApi() {
  window.fbAsyncInit = function () {
    FB.init({
      appId: '563428367190351',
      secret: '0657823647bd8087717cc22e29c1e1be',
      xfbml: true,
      version: 'v2.9'
    });
    FB.AppEvents.logPageView();
  };
  (function (d, s, id) {
    var js,
        fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) {
      return;
    }
    js = d.createElement(s);js.id = id;
    js.src = "https://connect.facebook.net/en_US/sdk.js";
    fjs.parentNode.insertBefore(js, fjs);
  })(document, 'script', 'facebook-jssdk');
}

function datePage() {
  FB.api('/eversocial', 'GET', { "fields": "id,name,about,likes,fan_count,posts,new_like_count,impressum,can_post,best_page,were_here_count", access_token: token }, function (response) {
    if (response && !response.error) {
      console.log(response);
      return response;
    } else {
      console.log(response.error);
    }
  });
}

function stadisticsPage() {
  FB.api('/eversocial/insights/page_impressions,page_fan_adds,page_fan_removes,page_engaged_users,page_views_login,page_admin_num_posts,page_views_total,post_fan_reach,page_views_external_referrals,page_tab_views_login_top_unique', { "since": "1493614800", "until": "1494133200", access_token: token }, function (response) {
    if (response && !response.error) {
      console.log(response);
      return response;
    } else {
      console.log(response.error);
    }
  });
}

function fansNuevos() {
  FB.api('/eversocial/insights/page_fan_adds', { "since": "1493614800", "until": "1494478800", access_token: token }, function (response) {
    if (response && !response.error) {
      console.log(response);
      var fansNews = 0;
      response.data.map(function (datos) {
        datos.values.map(function (valor) {
          fansNews = fansNews + valor.value;
        });
      });
      console.log(fansNews + 'total fans');
      return fansNews;
    } else {
      console.log(response.error);
    }
  });
}

function fansRemove() {
  FB.api('/eversocial/insights/page_fan_removes', { "since": "1493614800", "until": "1494133200", access_token: token }, function (response) {
    if (response && !response.error) {
      console.log(response);
      var fansRemove = 0;
      response.data.map(function (datos) {
        datos.values.map(function (valor) {
          fansRemove = fansRemove + valor.value;
        });
      });
      console.log(fansRemove + ' total no me gustas');
      return fansRemove;
    } else {
      console.log(response.error);
    }
  });
}

function totalImpresions() {
  FB.api('/eversocial/insights/page_impressions', { "period": "day", "since": "1493614800", "until": "1494133200", access_token: token }, function (response) {
    if (response && !response.error) {
      console.log(response);
      var impresions = 0;
      response.data.map(function (datos) {
        datos.values.map(function (valor) {
          impresions = impresions + valor.value;
        });
      });
      console.log(impresions + ' total impresiones');
      return impresions;
    } else {
      console.log(response.error);
    }
  });
}

function totalUserActives() {
  FB.api('/eversocial/insights/page_engaged_users', { "period": "day", "since": "1493614800", "until": "1494133200", access_token: token }, function (response) {
    if (response && !response.error) {
      console.log(response);
      var activeusers = 0;
      response.data.map(function (datos) {
        datos.values.map(function (valor) {
          activeusers = activeusers + valor.value;
        });
      });
      console.log(activeusers + ' total usuarios activos');
      return activeusers;
    } else {
      console.log(response.error);
    }
  });
}

function promLikesByDay() {
  FB.api('/eversocial/insights/page_actions_post_reactions_like_total', { "since": "1493614800", "until": "1494133200", access_token: token }, function (response) {
    if (response && !response.error) {
      console.log(response);
      var megustapro = 0;
      var numDias = 0;
      response.data.map(function (datos) {
        datos.values.map(function (valor) {
          megustapro = megustapro + valor.value;
        });
        numDias = datos.values.length;
      });
      var promedioDia = megustapro / numDias;
      promedioDia = parseInt(promedioDia, 10);
      console.log(promedioDia + ' Promedio por día');
      return promedioDia;
    } else {
      console.log(response.error);
    }
  });
}

function postInMonth() {
  FB.api('/eversocial/insights/page_admin_num_posts', { "period": "day", "since": "1493614800", "until": "1494133200", access_token: token }, function (response) {
    if (response && !response.error) {
      console.log(response);
      var postinmonth = 0;
      response.data.map(function (datos) {
        datos.values.map(function (valor) {
          postinmonth = postinmonth + valor.value;
        });
      });
      console.log(postinmonth + ' Post en el mes');
      return postinmonth;
    } else {
      console.log(response.error);
    }
  });
}

function cantReferencesExternal() {
  FB.api('/maratondelasfloresmedellin/insights/page_views_external_referrals', { "since": "1493614800", "until": "1494478800", access_token: token }, function (response) {
    if (response && !response.error) {
      console.log(response);
      var numrefexternal = 0;
      response.data.map(function (datos) {
        datos.values.map(function (valor) {
          for (var i in valor.value) {
            numrefexternal = numrefexternal + valor.value[i];
          }
        });
      });
      console.log(numrefexternal + ' total referencias externas');
      return numrefexternal;
    } else {
      console.log(response.error);
    }
  });
}

function principalsReferencesExternal() {
  FB.api('/maratondelasfloresmedellin/insights/page_views_external_referrals', { "since": "1493614800", "until": "1494478800", access_token: token }, function (response) {
    if (response && !response.error) {
      console.log(response);
      var numrefexternal = 0;
      var nummayor = 0;
      var nummedio = 0;
      var numter = 0;
      var objectmayor = [];
      var objectmedio = [];
      var objecter = [];
      var yaestam = [];
      response.data.map(function (datos) {
        datos.values.map(function (valor) {

          for (var i in valor.value) {
            console.log(i);
            var key = i;
            numrefexternal = valor.value[i];
            console.log(numrefexternal);
            var index = yaestam.indexOf(key);
            if (numrefexternal > nummayor && index === -1) {
              nummayor = numrefexternal;
              objectmayor = [key, nummayor];
              yaestam.push(key);
            } else if (numrefexternal > nummayor && objectmayor[0] === key) {
              nummayor = numrefexternal;
              objectmayor = [key, nummayor];
            } else if (nummedio < nummayor && nummedio < numrefexternal && index === -1) {
              nummedio = numrefexternal;
              objectmedio = [key, nummedio];
              yaestam.push(key);
            } else if (nummedio < nummayor && nummedio < numrefexternal && objectmedio[0] === key) {
              nummedio = numrefexternal;
              objectmedio = [key, nummedio];
            } else if (numter < numrefexternal && numter < nummedio && index === -1) {
              numter = numrefexternal;
              objecter = [key, numter];
              yaestam.push(key);
            } else if (numter < numrefexternal && numter < nummedio && objecter[0] === key) {
              numter = numrefexternal;
              objecter = [key, numter];
            }
          }
        });
      });
      console.log('mayor');
      console.log(objectmayor);
      console.log('medio');
      console.log(objectmedio);
      console.log('menor');
      console.log(objecter);
    } else {
      console.log(response.error);
    }
  });
}

function totalViewsTabs() {
  FB.api('/maratondelasfloresmedellin/insights/page_tab_views_login_top_unique', { "period": "day", "since": "1493614800", "until": "1494478800", access_token: token }, function (response) {
    if (response && !response.error) {
      console.log(response);
      var numviewtabs = 0;
      response.data.map(function (datos) {
        datos.values.map(function (valor) {
          for (var i in valor.value) {
            numviewtabs = numviewtabs + valor.value[i];
          }
        });
      });
      console.log(numviewtabs + ' total vistas pestañas');
      return numviewtabs;
    } else {
      console.log(response.error);
    }
  });
}

function principalsViewsTabs() {
  FB.api('/maratondelasfloresmedellin/insights/page_tab_views_login_top_unique', { "period": "day", "since": "1493614800", "until": "1494478800", access_token: token }, function (response) {
    if (response && !response.error) {
      console.log(response);
      var numviewtabs = 0;
      var numviewmayor = 0;
      var numviewmedio = 0;
      var numviewmenor = 0;
      var objectmayor = [];
      var objectmedio = [];
      var objecter = [];
      var yaestam = [];
      var acummayor = 0;
      var acummedio = 0;
      var acummenor = 0;
      response.data.map(function (datos) {
        datos.values.map(function (valor) {

          for (var i in valor.value) {
            var key = i;
            numviewtabs = valor.value[i];
            var index = yaestam.indexOf(key);
            if (numviewtabs > numviewmayor && index === -1) {
              numviewmayor = numviewtabs;
              objectmayor = [key, numviewmayor];
              yaestam.push(key);
            } else if (numviewtabs > numviewmayor && objectmayor[0] === key) {
              numviewmayor = numviewtabs;
              objectmayor = [key, numviewmayor];
            } else if (numviewmedio < numviewmayor && numviewmedio < numviewtabs && index === -1) {
              numviewmedio = numviewtabs;
              objectmedio = [key, numviewmedio];
              yaestam.push(key);
            } else if (numviewmedio < numviewmayor && numviewmedio < numviewtabs && objectmedio[0] === key) {
              numviewmedio = numviewtabs;
              objectmedio = [key, numviewmedio];
            } else if (numviewmenor < numviewtabs && numviewmenor < numviewmedio && index === -1) {
              numviewmenor = numviewtabs;
              objecter = [key, numviewmenor];
              yaestam.push(key);
            } else if (numviewmenor < numviewtabs && numviewmenor < numviewmedio && objecter[0] === key) {
              numviewmenor = numviewtabs;
              objecter = [key, numviewmenor];
            }
          }
        });
      });
      response.data.map(function (datos) {
        datos.values.map(function (valor) {

          for (var i in valor.value) {
            if (objectmayor[0] === i) {
              acummayor = acummayor + valor.value[i];
            }
          }
          for (var i in valor.value) {
            if (objectmedio[0] === i) {
              acummedio = acummedio + valor.value[i];
            }
          }
          for (var i in valor.value) {
            if (objecter[0] === i) {
              acummenor = acummenor + valor.value[i];
            }
          }
        });
      });

      console.log('mayor');
      console.log(objectmayor);
      console.log(objectmayor[0] + ' ' + acummayor);
      console.log('medio');
      console.log(objectmedio);
      console.log(objectmedio[0] + ' ' + acummedio);
      console.log('menor');
      console.log(objecter);
      console.log(objecter[0] + ' ' + acummenor);
    } else {
      console.log(response.error);
    }
  });
}

function postMoreEffective() {
  FB.api('/maratondelasfloresmedellin', 'GET', { "fields": "id,name,posts.until(1494478800).since(1493614800){likes,comments,message,created_time,full_picture,insights.metric(post_impressions_unique)}", access_token: token }, function (response) {
    if (response && !response.error) {
      console.log(response);
      var numLikes = 0;
      var numComments = 0;
      var bestPostId;
      var posicionBest;
      var mayorCantLikes = 0;
      var alcancepost = 0;
      response.posts.data.map(function (datos, indexE) {
        //console.log(datos.id);
        var datetime = new Date(datos.created_time).toUTCString().split(" ").slice(1, 4).join(" "); //new Date(datos.created_time).toDateString();
        //console.log('Este post fué publicado el ' + datetime);
        //console.log('Mensaje del post: ' + datos.message);
        //console.log('Ruta img: ' + datos.full_picture);

        if (datos.likes !== undefined) {
          datos.likes.data.map(function (valor) {
            numLikes = datos.likes.data.length;
          });
        } else {
          numLikes = 0;
        }
        if (numLikes > mayorCantLikes) {
          mayorCantLikes = numLikes;
          bestPostId = datos.id;
          posicionBest = indexE;
          //  console.log('entro al if  \n' + bestPostId + ' \n' + mayorCantLikes);
        }

        //console.log('este post tiene ' + numLikes + ' me gustas.');

        if (datos.comments !== undefined) {
          datos.comments.data.map(function (valor) {
            numComments = datos.comments.data.length;
          });
        } else {
          numComments = 0;
        }

        //console.log('Este post tiene ' + numComments + ' comentarios.' );

        datos.insights.data.map(function (valor) {
          valor.values.map(function (dato) {
            alcancepost = dato.value;
          });
        });

        //console.log('Este post tiene ' + alcancepost + ' de alcance');
      });

      console.log('El post de mayor likes es ' + bestPostId + ' con ' + mayorCantLikes);
      console.log('El post de mayor likes es ' + posicionBest);

      console.log(response.posts.data[posicionBest].id);
      var datetime = new Date(response.posts.data[posicionBest].created_time).toUTCString().split(" ").slice(1, 4).join(" "); //new Date(datos.created_time).toDateString();
      console.log('Este post fué publicado el ' + datetime);
      console.log('Mensaje del post: ' + response.posts.data[posicionBest].message);
      console.log('Ruta img: ' + response.posts.data[posicionBest].full_picture);
      if (response.posts.data[posicionBest] !== undefined) {
        response.posts.data[posicionBest].likes.data.map(function (valor) {
          numLikes = response.posts.data[posicionBest].likes.data.length;
        });
      } else {
        numLikes = 0;
      }

      console.log('Este post tiene ' + numLikes + ' me gustas.');

      if (response.posts.data[posicionBest].comments !== undefined) {
        response.posts.data[posicionBest].comments.data.map(function (valor) {
          numComments = response.posts.data[posicionBest].comments.data.length;
        });
      } else {
        numComments = 0;
      }

      console.log('Este post tiene ' + numComments + ' comentarios.');

      if (response.posts.data[posicionBest].insights !== undefined) {
        response.posts.data[posicionBest].insights.data.map(function (valor) {
          valor.values.map(function (dato) {
            alcancepost = dato.value;
          });
        });
      } else {
        alcancepost = 0;
      }

      console.log('Este post tiene ' + alcancepost + ' de alcance');
    } else {
      console.log(response.error);
    }
  });
}

function reachPage() {
  FB.api('/maratondelasfloresmedellin/insights/page_views_total', { "period": "day", "since": "1493614800", "until": "1494478800", access_token: token }, function (response) {
    if (response && !response.error) {
      console.log(response);
      var totalViewPage = 0;
      var numDias = 0;
      response.data.map(function (datos) {
        datos.values.map(function (valor) {
          totalViewPage = totalViewPage + valor.value;
        });
        numDias = datos.values.length;
      });
      var promDiaAlcance = totalViewPage / numDias;
      promDiaAlcance = parseInt(promDiaAlcance, 10);
      console.log(promDiaAlcance + ' Promedio día de alcance ');
      return promDiaAlcance;
    } else {
      console.log(response.error);
    }
  });
}

module.exports = landing(updatebtn);

},{"../landing":401,"yo-yo":388}],414:[function(require,module,exports){
'use strict';

var page = require('page');
var empty = require('empty-element');
var template = require('./template');
var title = require('title');

page('/upload-dates-inst', function (ctx, next) {
  title('Evermetrics - Upload Stadistitics Instagram');
  var main = document.getElementById('main-container');
  empty(main).appendChild(template);
});

},{"./template":415,"empty-element":333,"page":361,"title":384}],415:[function(require,module,exports){
'use strict';

var _templateObject = _taggedTemplateLiteral(['<div class="col l12">\n      <div class="row">\n        <div class="col sm12 m10 offset-m1 l8 offset-l2 center-align">\n        <h3 class="titleUploadred"><i class="fa fa-instagram" aria-hidden="true"></i>Instagram</h3>\n          <form enctype="multipart/form-data" class="form-upload" id="formUpload" onsubmit=', '>\n            <div id="fileName" class="fileUpload btn">\n              <span><i class="fa fa-file-excel-o" aria-hidden="true" style="padding-right:10px;"></i>Subir archivo</span>\n              <input name="fileexcel" id="file" type="file" class="upload" onchange=', ' />\n            </div>\n            <button id="btnUpload" type="submit" class="btn hide">Subir</button>\n            <button id="btnCancel" type="button" style="background-color:#f39237;" class="btn hide" onclick=', '><i class="fa fa-times" aria-hidden="true"></i></button>\n          </form>\n           <span id="fotoUpExito" class="hide">El archivo se ha subido con \xE9xito.</span>\n        </div>\n      </div>\n      <div class="row" style="display:none;">\n        <div class="signup-box">\n          <form class="signup-form" action="/api/estadisticas-inst" method="POST">\n            <div class="divider"></div>\n            <div class="section" style="text-align:center;">\n              <input type="text" name="red" value="inst" style="display:none;">\n              <input type="text" name="type" value="month" style="display:none;">\n              <input type="text" name="year" placeholder="A\xF1o">\n              <input type="text" name="month" placeholder="Mes">\n              <input type="text" name="allfans" placeholder="Total seguidores">\n              <input type="text" name="follows" placeholder="Total seguidos">\n              <input type="text" name="allpost" placeholder="Total post">\n              <input type="text" name="postbymonth" placeholder="Post en el mes">\n              <input type="text" name="likebymonth" placeholder="Like en el mes">\n              <input type="text" name="comments" placeholder="Comentarios">\n              <label>Usuarios activos</label>\n              <input type="text" name="nick1" placeholder="Usuario 1">\n              <input type="text" name="likes1" placeholder="Me gustas">\n              <input type="text" name="nick2" placeholder="Usuario 2">\n              <input type="text" name="likes2" placeholder="Me gustas">\n              <input type="text" name="nick3" placeholder="Usuario 3">\n              <input type="text" name="likes3" placeholder="Me gustas">\n              <input type="text" name="src" placeholder="Imagen">\n              <input type="text" name="likesone" placeholder="Me gustas post 1">\n              <input type="text" name="likestwo" placeholder="Me gustas post 1">\n              <input type="text" name="likesthree" placeholder="Me gustas post 1">\n              <button class="btn waves-effect waves-light btn-login" type="submit">Registrar</button>\n            </div>\n          </form>\n        </div>\n      </div>\n      <div class="row">\n        <a href="/">Volver a la cuenta</a>\n      </div>\n    </div>'], ['<div class="col l12">\n      <div class="row">\n        <div class="col sm12 m10 offset-m1 l8 offset-l2 center-align">\n        <h3 class="titleUploadred"><i class="fa fa-instagram" aria-hidden="true"></i>Instagram</h3>\n          <form enctype="multipart/form-data" class="form-upload" id="formUpload" onsubmit=', '>\n            <div id="fileName" class="fileUpload btn">\n              <span><i class="fa fa-file-excel-o" aria-hidden="true" style="padding-right:10px;"></i>Subir archivo</span>\n              <input name="fileexcel" id="file" type="file" class="upload" onchange=', ' />\n            </div>\n            <button id="btnUpload" type="submit" class="btn hide">Subir</button>\n            <button id="btnCancel" type="button" style="background-color:#f39237;" class="btn hide" onclick=', '><i class="fa fa-times" aria-hidden="true"></i></button>\n          </form>\n           <span id="fotoUpExito" class="hide">El archivo se ha subido con \xE9xito.</span>\n        </div>\n      </div>\n      <div class="row" style="display:none;">\n        <div class="signup-box">\n          <form class="signup-form" action="/api/estadisticas-inst" method="POST">\n            <div class="divider"></div>\n            <div class="section" style="text-align:center;">\n              <input type="text" name="red" value="inst" style="display:none;">\n              <input type="text" name="type" value="month" style="display:none;">\n              <input type="text" name="year" placeholder="A\xF1o">\n              <input type="text" name="month" placeholder="Mes">\n              <input type="text" name="allfans" placeholder="Total seguidores">\n              <input type="text" name="follows" placeholder="Total seguidos">\n              <input type="text" name="allpost" placeholder="Total post">\n              <input type="text" name="postbymonth" placeholder="Post en el mes">\n              <input type="text" name="likebymonth" placeholder="Like en el mes">\n              <input type="text" name="comments" placeholder="Comentarios">\n              <label>Usuarios activos</label>\n              <input type="text" name="nick1" placeholder="Usuario 1">\n              <input type="text" name="likes1" placeholder="Me gustas">\n              <input type="text" name="nick2" placeholder="Usuario 2">\n              <input type="text" name="likes2" placeholder="Me gustas">\n              <input type="text" name="nick3" placeholder="Usuario 3">\n              <input type="text" name="likes3" placeholder="Me gustas">\n              <input type="text" name="src" placeholder="Imagen">\n              <input type="text" name="likesone" placeholder="Me gustas post 1">\n              <input type="text" name="likestwo" placeholder="Me gustas post 1">\n              <input type="text" name="likesthree" placeholder="Me gustas post 1">\n              <button class="btn waves-effect waves-light btn-login" type="submit">Registrar</button>\n            </div>\n          </form>\n        </div>\n      </div>\n      <div class="row">\n        <a href="/">Volver a la cuenta</a>\n      </div>\n    </div>']);

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var yo = require('yo-yo');
var landing = require('../landing');
var request = require('superagent');

var upforminst = yo(_templateObject, onsubmit, onchange, cancel);

function toggleButtons() {
  document.getElementById('fileName').classList.toggle('hide');
  document.getElementById('btnUpload').classList.toggle('hide');
  document.getElementById('btnCancel').classList.toggle('hide');
}
function cancel() {
  toggleButtons();
  document.getElementById('formUpload').reset();
}

function onchange() {
  toggleButtons();
}

function onsubmit(ev) {
  ev.preventDefault();
  var data = new FormData(this);
  console.log(data);
  request.post('/api/estadisticas-inst').send(data).end(function (err, res) {
    console.log('estos son los datos');
    console.log(arguments); //arguments es una array de todos lo parametros que recibe una función
    toggleButtons();
    document.getElementById('formUpload').reset();
    document.getElementById("fotoUpExito").classList.toggle("hide");
    //  Hacemos aparecer el rotulito que le avisa al usuario que la foto seha Subido.
    //Esto se encuentra enla etiqueta "span" debajo de la etiqueta “form”.
    setTimeout(function () {
      document.getElementById("fotoUpExito").classList.toggle("hide");
    }, 2000);
    // Con esta función RETRASADA, quitamos el rotulito que previamente mostramos al usuario,
    // ya que no hay necesidad de que permanezca ahí visible.
  });
}

module.exports = landing(upforminst);

},{"../landing":401,"superagent":380,"yo-yo":388}],416:[function(require,module,exports){
'use strict';

var page = require('page');
var empty = require('empty-element');
var template = require('./template');
var title = require('title');

page('/upload-dates-tw', function (ctx, next) {
  title('Evermetrics - Upload Stadistitics Twitter');
  var main = document.getElementById('main-container');
  empty(main).appendChild(template);
});

},{"./template":417,"empty-element":333,"page":361,"title":384}],417:[function(require,module,exports){
'use strict';

var _templateObject = _taggedTemplateLiteral(['<div class="col l12">\n      <div class="row">\n        <div class="col sm12 m10 offset-m1 l8 offset-l2 center-align">\n        <h3 class="titleUploadred"><i class="fa fa-twitter" aria-hidden="true"></i>Twitter</h3>\n          <form enctype="multipart/form-data" class="form-upload" id="formUpload" onsubmit=', '>\n            <div id="fileName" class="fileUpload btn">\n              <span><i class="fa fa-file-excel-o" aria-hidden="true" style="padding-right:10px;"></i>Subir archivo</span>\n              <input name="fileexcel" id="file" type="file" class="upload" onchange=', ' />\n            </div>\n            <button id="btnUpload" type="submit" class="btn hide">Subir</button>\n            <button id="btnCancel" type="button" style="background-color:#f39237;" class="btn hide" onclick=', '><i class="fa fa-times" aria-hidden="true"></i></button>\n          </form>\n           <span id="fotoUpExito"class="hide">El archivo se ha subido con \xE9xito.</span>\n        </div>\n      </div>\n      <div class="row" style="display:none;">\n        <div class="signup-box">\n          <form class="signup-form" action="/api/estadisticas-tw" method="POST">\n            <div class="divider"></div>\n            <div class="section" style="text-align:center;">\n              <input type="text" name="red" value="tw" style="display:none;">\n              <input type="text" name="type" value="month" style="display:none;">\n              <input type="text" name="year" placeholder="A\xF1o">\n              <input type="text" name="month" placeholder="Mes">\n              <input type="text" name="allfans" placeholder="Total seguidores">\n              <input type="text" name="allfollows" placeholder="Total seguidos">\n              <input type="text" name="newfans" placeholder="Nuevos seguidores">\n              <input type="text" name="globalmedia" placeholder="Fotos / Videos Globales">\n              <input type="text" name="globalfavorites" placeholder="Favoritos Globales">\n              <input type="text" name="alltweets" placeholder="Total tweets">\n              <input type="text" name="tweets" placeholder="Tweets">\n              <input type="text" name="retweets" placeholder="Retweets">\n              <input type="text" name="mentions" placeholder="Menciones">\n              <input type="text" name="favorites" placeholder="Favoritos">\n              <input type="text" name="messagedirects" placeholder="Mensajes directos">\n              <label>Hashtags</label>\n              <input type="text" name="label1" placeholder="Hashtag 1">\n              <input type="text" name="cant1" placeholder="Veces usadas">\n              <input type="text" name="label2" placeholder="Hashtag 2">\n              <input type="text" name="cant2" placeholder="Veces usadas">\n              <input type="text" name="label3" placeholder="Hashtag 3">\n              <input type="text" name="cant3" placeholder="Veces usadas">\n              <input type="text" name="label4" placeholder="Hashtag 4">\n              <input type="text" name="cant4" placeholder="Veces usadas">\n              <input type="text" name="label5" placeholder="Hashtag 5">\n              <input type="text" name="cant5" placeholder="Veces usadas">\n              <input type="text" name="label6" placeholder="Hashtag 6">\n              <input type="text" name="cant6" placeholder="Veces usadas">\n              <input type="text" name="label7" placeholder="Hashtag 7">\n              <input type="text" name="cant7" placeholder="Veces usadas">\n              <input type="text" name="label8" placeholder="Hashtag 8">\n              <input type="text" name="cant8" placeholder="Veces usadas">\n              <button class="btn waves-effect waves-light btn-login" type="submit">Registrar</button>\n            </div>\n          </form>\n        </div>\n      </div>\n      <div class="row">\n        <a href="/">Volver a la cuenta</a>\n      </div>\n    </div>'], ['<div class="col l12">\n      <div class="row">\n        <div class="col sm12 m10 offset-m1 l8 offset-l2 center-align">\n        <h3 class="titleUploadred"><i class="fa fa-twitter" aria-hidden="true"></i>Twitter</h3>\n          <form enctype="multipart/form-data" class="form-upload" id="formUpload" onsubmit=', '>\n            <div id="fileName" class="fileUpload btn">\n              <span><i class="fa fa-file-excel-o" aria-hidden="true" style="padding-right:10px;"></i>Subir archivo</span>\n              <input name="fileexcel" id="file" type="file" class="upload" onchange=', ' />\n            </div>\n            <button id="btnUpload" type="submit" class="btn hide">Subir</button>\n            <button id="btnCancel" type="button" style="background-color:#f39237;" class="btn hide" onclick=', '><i class="fa fa-times" aria-hidden="true"></i></button>\n          </form>\n           <span id="fotoUpExito"class="hide">El archivo se ha subido con \xE9xito.</span>\n        </div>\n      </div>\n      <div class="row" style="display:none;">\n        <div class="signup-box">\n          <form class="signup-form" action="/api/estadisticas-tw" method="POST">\n            <div class="divider"></div>\n            <div class="section" style="text-align:center;">\n              <input type="text" name="red" value="tw" style="display:none;">\n              <input type="text" name="type" value="month" style="display:none;">\n              <input type="text" name="year" placeholder="A\xF1o">\n              <input type="text" name="month" placeholder="Mes">\n              <input type="text" name="allfans" placeholder="Total seguidores">\n              <input type="text" name="allfollows" placeholder="Total seguidos">\n              <input type="text" name="newfans" placeholder="Nuevos seguidores">\n              <input type="text" name="globalmedia" placeholder="Fotos / Videos Globales">\n              <input type="text" name="globalfavorites" placeholder="Favoritos Globales">\n              <input type="text" name="alltweets" placeholder="Total tweets">\n              <input type="text" name="tweets" placeholder="Tweets">\n              <input type="text" name="retweets" placeholder="Retweets">\n              <input type="text" name="mentions" placeholder="Menciones">\n              <input type="text" name="favorites" placeholder="Favoritos">\n              <input type="text" name="messagedirects" placeholder="Mensajes directos">\n              <label>Hashtags</label>\n              <input type="text" name="label1" placeholder="Hashtag 1">\n              <input type="text" name="cant1" placeholder="Veces usadas">\n              <input type="text" name="label2" placeholder="Hashtag 2">\n              <input type="text" name="cant2" placeholder="Veces usadas">\n              <input type="text" name="label3" placeholder="Hashtag 3">\n              <input type="text" name="cant3" placeholder="Veces usadas">\n              <input type="text" name="label4" placeholder="Hashtag 4">\n              <input type="text" name="cant4" placeholder="Veces usadas">\n              <input type="text" name="label5" placeholder="Hashtag 5">\n              <input type="text" name="cant5" placeholder="Veces usadas">\n              <input type="text" name="label6" placeholder="Hashtag 6">\n              <input type="text" name="cant6" placeholder="Veces usadas">\n              <input type="text" name="label7" placeholder="Hashtag 7">\n              <input type="text" name="cant7" placeholder="Veces usadas">\n              <input type="text" name="label8" placeholder="Hashtag 8">\n              <input type="text" name="cant8" placeholder="Veces usadas">\n              <button class="btn waves-effect waves-light btn-login" type="submit">Registrar</button>\n            </div>\n          </form>\n        </div>\n      </div>\n      <div class="row">\n        <a href="/">Volver a la cuenta</a>\n      </div>\n    </div>']);

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var yo = require('yo-yo');
var landing = require('../landing');
var request = require('superagent');

var upformtw = yo(_templateObject, onsubmit, onchange, cancel);

function toggleButtons() {
  document.getElementById('fileName').classList.toggle('hide');
  document.getElementById('btnUpload').classList.toggle('hide');
  document.getElementById('btnCancel').classList.toggle('hide');
}
function cancel() {
  toggleButtons();
  document.getElementById('formUpload').reset();
}

function onchange() {
  toggleButtons();
}

function onsubmit(ev) {
  ev.preventDefault();
  var data = new FormData(this);
  request.post('/api/estadisticas-tw').send(data).end(function (err, res) {
    console.log(arguments); //arguments es una array de todos lo parametros que recibe una función
    toggleButtons();
    document.getElementById('formUpload').reset();
    document.getElementById("fotoUpExito").classList.toggle("hide");
    //  Hacemos aparecer el rotulito que le avisa al usuario que la foto seha Subido.
    //Esto se encuentra enla etiqueta "span" debajo de la etiqueta “form”.
    setTimeout(function () {
      document.getElementById("fotoUpExito").classList.toggle("hide");
    }, 2000);
    // Con esta función RETRASADA, quitamos el rotulito que previamente mostramos al usuario,
    // ya que no hay necesidad de que permanezca ahí visible.
  });
}

module.exports = landing(upformtw);

},{"../landing":401,"superagent":380,"yo-yo":388}],418:[function(require,module,exports){
'use strict';

var page = require('page');
var empty = require('empty-element');
var template = require('./template');
var title = require('title');

page('/upload-dates-web', function (ctx, next) {
  title('Evermetrics - Upload Stadistitics Web Analytics');
  var main = document.getElementById('main-container');
  empty(main).appendChild(template);
});

},{"./template":419,"empty-element":333,"page":361,"title":384}],419:[function(require,module,exports){
'use strict';

var _templateObject = _taggedTemplateLiteral(['<div class="col l12">\n      <div class="row">\n        <div class="col sm12 m10 offset-m1 l8 offset-l2 center-align">\n        <h3 class="titleUploadred"><i class="fa fa-globe" aria-hidden="true"></i>Web Analytics</h3>\n          <form enctype="multipart/form-data" class="form-upload" id="formUpload" onsubmit=', '>\n            <div id="fileName" class="fileUpload btn">\n              <span><i class="fa fa-file-excel-o" aria-hidden="true" style="padding-right:10px;"></i>Subir archivo</span>\n              <input name="fileexcel" id="file" type="file" class="upload" onchange=', ' />\n            </div>\n            <button id="btnUpload" type="submit" class="btn hide">Subir</button>\n            <button id="btnCancel" type="button" style="background-color:#f39237;" class="btn hide" onclick=', '><i class="fa fa-times" aria-hidden="true"></i></button>\n          </form>\n           <span id="fotoUpExito"class="hide">El archivo se ha subido con \xE9xito.</span>\n        </div>\n      </div>\n      <div class="row">\n        <a href="/">Volver a la cuenta</a>\n      </div>\n    </div>'], ['<div class="col l12">\n      <div class="row">\n        <div class="col sm12 m10 offset-m1 l8 offset-l2 center-align">\n        <h3 class="titleUploadred"><i class="fa fa-globe" aria-hidden="true"></i>Web Analytics</h3>\n          <form enctype="multipart/form-data" class="form-upload" id="formUpload" onsubmit=', '>\n            <div id="fileName" class="fileUpload btn">\n              <span><i class="fa fa-file-excel-o" aria-hidden="true" style="padding-right:10px;"></i>Subir archivo</span>\n              <input name="fileexcel" id="file" type="file" class="upload" onchange=', ' />\n            </div>\n            <button id="btnUpload" type="submit" class="btn hide">Subir</button>\n            <button id="btnCancel" type="button" style="background-color:#f39237;" class="btn hide" onclick=', '><i class="fa fa-times" aria-hidden="true"></i></button>\n          </form>\n           <span id="fotoUpExito"class="hide">El archivo se ha subido con \xE9xito.</span>\n        </div>\n      </div>\n      <div class="row">\n        <a href="/">Volver a la cuenta</a>\n      </div>\n    </div>']);

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var yo = require('yo-yo');
var landing = require('../landing');
var request = require('superagent');

var upformweb = yo(_templateObject, onsubmit, onchange, cancel);

function toggleButtons() {
  document.getElementById('fileName').classList.toggle('hide');
  document.getElementById('btnUpload').classList.toggle('hide');
  document.getElementById('btnCancel').classList.toggle('hide');
}
function cancel() {
  toggleButtons();
  document.getElementById('formUpload').reset();
}

function onchange() {
  toggleButtons();
}

function onsubmit(ev) {
  ev.preventDefault();
  var data = new FormData(this);
  request.post('/api/estadisticas-web').send(data).end(function (err, res) {
    console.log(arguments); //arguments es una array de todos lo parametros que recibe una función
    toggleButtons();
    document.getElementById('formUpload').reset();
    document.getElementById("fotoUpExito").classList.toggle("hide");
    //  Hacemos aparecer el rotulito que le avisa al usuario que la foto seha Subido.
    //Esto se encuentra enla etiqueta "span" debajo de la etiqueta “form”.
    setTimeout(function () {
      document.getElementById("fotoUpExito").classList.toggle("hide");
    }, 2000);
    // Con esta función RETRASADA, quitamos el rotulito que previamente mostramos al usuario,
    // ya que no hay necesidad de que permanezca ahí visible.
  });
}

module.exports = landing(upformweb);

},{"../landing":401,"superagent":380,"yo-yo":388}],420:[function(require,module,exports){
'use strict';

var page = require('page');
var empty = require('empty-element');
var template = require('./template');
var title = require('title');

page('/upload-dates', function (ctx, next) {
  title('Evermetrics - Upload Stadistitics');
  var main = document.getElementById('main-container');
  empty(main).appendChild(template);
});

},{"./template":421,"empty-element":333,"page":361,"title":384}],421:[function(require,module,exports){
'use strict';

var _templateObject = _taggedTemplateLiteral(['<div class="col l12">\n      <div class="row" >\n        <div class="col sm12 m10 offset-m1 l8 offset-l2 center-align">\n        <h3 class="titleUploadred"><i class="fa fa-facebook" aria-hidden="true"></i>Facebook</h3>\n          <form enctype="multipart/form-data" class="form-upload" id="formUpload" onsubmit=', '>\n            <div id="fileName" class="fileUpload btn">\n              <span><i class="fa fa-file-excel-o" aria-hidden="true" style="padding-right:10px;"></i>Subir archivo</span>\n              <input name="fileexcel" id="file" type="file" class="upload" onchange=', ' />\n            </div>\n            <button id="btnUpload" type="submit" class="btn hide">Subir</button>\n            <button id="btnCancel" type="button" style="background-color:#f39237;" class="btn hide" onclick=', '><i class="fa fa-times" aria-hidden="true"></i></button>\n          </form>\n           <span id="fotoUpExito" class="hide">El archivo se ha subido con \xE9xito.</span>\n        </div>\n      </div>\n      <div class="row" style="display:none;">\n        <div class="signup-box">\n          <form class="signup-form" action="/api/estadisticas" method="POST">\n            <div class="divider"></div>\n            <div class="section" style="text-align:center;">\n              <input type="text" name="red" value="fb" style="display:none;">\n              <input type="text" name="type" value="month" style="display:none;">\n              <input type="text" name="year" value="2017" placeholder="A\xF1o">\n              <input type="text" name="month" placeholder="Mes">\n              <input type="text" name="allfans" placeholder="Fans totales">\n              <input type="text" name="newfans" placeholder="Fans nuevos">\n              <input type="text" name="prints" placeholder="Impresiones">\n              <input type="text" name="nolikes" placeholder="No me gustas">\n              <input type="text" name="activeusers" placeholder="Usuarios activos">\n              <input type="text" name="likebyday" placeholder="Me Gusta (promedio por d\xEDa)">\n              <input type="text" name="postbymonth" placeholder="Post en el mes">\n              <input type="text" name="scopebyday" placeholder="Alcance (promedio por d\xEDa)">\n              <input type="text" name="externalreference" placeholder="Referencias Externas">\n              <input type="text" name="viewswindows" placeholder="Vistas Pesta\xF1as">\n              <input type="text" name="topwindows" placeholder="Principales Pesta\xF1as">\n              <input type="text" name="topreference" placeholder="Principales Referencias">\n              <input type="text" name="postsrc" placeholder="Post m\xE1s efectivo">\n              <input type="text" name="datespost" placeholder="Datos del post">\n              <button class="btn waves-effect waves-light btn-login" type="submit">Registrar</button>\n            </div>\n          </form>\n        </div>\n      </div>\n      <div class="row"  style="display:none;">\n        <div id="caja" class="contBtnUpdate" style="text-align: center;margin: 40px 0 10px;">\n          <div class="contFecha" style="display:flex;">\n             <div style="flex:1;text-align: right;padding: 0 10px;"><input type="date" id="since" style="width:50%;border: 1px solid #7ae7c7;color: #7ae7c7;border-radius: 4px;padding: 0 15px;"></div>\n             <div style="flex:1;text-align: left;"><input type="date" id="until" style="width:50%;border: 1px solid #7ae7c7;color: #7ae7c7;border-radius: 4px;padding: 0 15px;"></div>\n          </div>\n          <input type="button"  class="btn" value="Cargar fecha" onclick=', '></input>\n          <input type="button" id="actualizarfb" class="btn hide" value="Actualizar" onclick=', '></input>\n        </div>\n      </div>\n      <div class="row">\n        <a href="/">Volver a la cuenta</a>\n      </div>\n    </div>'], ['<div class="col l12">\n      <div class="row" >\n        <div class="col sm12 m10 offset-m1 l8 offset-l2 center-align">\n        <h3 class="titleUploadred"><i class="fa fa-facebook" aria-hidden="true"></i>Facebook</h3>\n          <form enctype="multipart/form-data" class="form-upload" id="formUpload" onsubmit=', '>\n            <div id="fileName" class="fileUpload btn">\n              <span><i class="fa fa-file-excel-o" aria-hidden="true" style="padding-right:10px;"></i>Subir archivo</span>\n              <input name="fileexcel" id="file" type="file" class="upload" onchange=', ' />\n            </div>\n            <button id="btnUpload" type="submit" class="btn hide">Subir</button>\n            <button id="btnCancel" type="button" style="background-color:#f39237;" class="btn hide" onclick=', '><i class="fa fa-times" aria-hidden="true"></i></button>\n          </form>\n           <span id="fotoUpExito" class="hide">El archivo se ha subido con \xE9xito.</span>\n        </div>\n      </div>\n      <div class="row" style="display:none;">\n        <div class="signup-box">\n          <form class="signup-form" action="/api/estadisticas" method="POST">\n            <div class="divider"></div>\n            <div class="section" style="text-align:center;">\n              <input type="text" name="red" value="fb" style="display:none;">\n              <input type="text" name="type" value="month" style="display:none;">\n              <input type="text" name="year" value="2017" placeholder="A\xF1o">\n              <input type="text" name="month" placeholder="Mes">\n              <input type="text" name="allfans" placeholder="Fans totales">\n              <input type="text" name="newfans" placeholder="Fans nuevos">\n              <input type="text" name="prints" placeholder="Impresiones">\n              <input type="text" name="nolikes" placeholder="No me gustas">\n              <input type="text" name="activeusers" placeholder="Usuarios activos">\n              <input type="text" name="likebyday" placeholder="Me Gusta (promedio por d\xEDa)">\n              <input type="text" name="postbymonth" placeholder="Post en el mes">\n              <input type="text" name="scopebyday" placeholder="Alcance (promedio por d\xEDa)">\n              <input type="text" name="externalreference" placeholder="Referencias Externas">\n              <input type="text" name="viewswindows" placeholder="Vistas Pesta\xF1as">\n              <input type="text" name="topwindows" placeholder="Principales Pesta\xF1as">\n              <input type="text" name="topreference" placeholder="Principales Referencias">\n              <input type="text" name="postsrc" placeholder="Post m\xE1s efectivo">\n              <input type="text" name="datespost" placeholder="Datos del post">\n              <button class="btn waves-effect waves-light btn-login" type="submit">Registrar</button>\n            </div>\n          </form>\n        </div>\n      </div>\n      <div class="row"  style="display:none;">\n        <div id="caja" class="contBtnUpdate" style="text-align: center;margin: 40px 0 10px;">\n          <div class="contFecha" style="display:flex;">\n             <div style="flex:1;text-align: right;padding: 0 10px;"><input type="date" id="since" style="width:50%;border: 1px solid #7ae7c7;color: #7ae7c7;border-radius: 4px;padding: 0 15px;"></div>\n             <div style="flex:1;text-align: left;"><input type="date" id="until" style="width:50%;border: 1px solid #7ae7c7;color: #7ae7c7;border-radius: 4px;padding: 0 15px;"></div>\n          </div>\n          <input type="button"  class="btn" value="Cargar fecha" onclick=', '></input>\n          <input type="button" id="actualizarfb" class="btn hide" value="Actualizar" onclick=', '></input>\n        </div>\n      </div>\n      <div class="row">\n        <a href="/">Volver a la cuenta</a>\n      </div>\n    </div>']);

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var yo = require('yo-yo');
var landing = require('../landing');
var request = require('superagent');
var datafb = [];
var datajson = "";

var upform = yo(_templateObject, onsubmit, onchange, cancel, inicializarApi, controlBtn);

function toggleButtons() {
  document.getElementById('fileName').classList.toggle('hide');
  document.getElementById('btnUpload').classList.toggle('hide');
  document.getElementById('btnCancel').classList.toggle('hide');
}
function cancel() {
  toggleButtons();
  document.getElementById('formUpload').reset();
}

function onchange() {
  toggleButtons();
}

function onsubmit(ev) {
  ev.preventDefault();
  var data = new FormData(this);
  request.post('/api/estadisticas').send(data).end(function (err, res) {
    toggleButtons();
    document.getElementById('formUpload').reset();
    document.getElementById("fotoUpExito").classList.toggle("hide");
    //  Hacemos aparecer el rotulito que le avisa al usuario que la foto seha Subido.
    //Esto se encuentra enla etiqueta "span" debajo de la etiqueta “form”.
    setTimeout(function () {
      document.getElementById("fotoUpExito").classList.toggle("hide");
    }, 2000);
    // Con esta función RETRASADA, quitamos el rotulito que previamente mostramos al usuario,
    // ya que no hay necesidad de que permanezca ahí visible.
  });
}

function inicializarApi() {
  var token = 'EAACEdEose0cBAEhcYmrtuZAUE8jbStJsHYx9l9nohnPAdoHAJtwMf1lBwdcInzVtZAA5LRQxFD7mx5cagQiu1ygZArv8VsyUkgwlV5lmZCbDwjl7Oit5VwZCQqZCllBY8sqmbKib8ClkbHn8CKecMIDuFymG4GV66eARfJvSnpxhO9Djf1BDNEE8dG3dVOKZBcZD';
  var dateSince = document.getElementById('since').value;
  var dateUntil = document.getElementById('until').value;

  console.log(dateSince);
  console.log(dateUntil);
  function splitDate(date) {
    var result = date.split('-');
    console.log(result);
    return result;
  }

  var nowkdate = splitDate(dateSince);
  console.log(nowkdate);
  var yearspl = nowkdate[0];
  var monthspl = parseInt(nowkdate[1]);
  console.log(yearspl);
  console.log(monthspl);

  switch (monthspl) {
    case 1:
      console.log('enero');
      break;
    case 2:
      console.log('febrero');
      break;
    case 3:
      console.log('marzo');
      break;
    case 4:
      console.log('abril');
      break;
    case 5:
      console.log('mayo');
      break;
    case 6:
      console.log('junio');
      break;
    case 7:
      console.log('julio');
      break;
    case 8:
      console.log('agosto');
      break;
    case 9:
      console.log('septiembre');
      break;
    case 10:
      console.log('octubre');
      break;
    case 11:
      console.log('noviembre');
      break;
    case 12:
      console.log('diciembre');
      break;
    default:
      console.log('otro');
  }

  /*var parts = '2017-05-03'.split('-');
  //please put attention to the month (parts[0]), Javascript counts months from 0:
  // January - 0, February - 1, etc
  var myDate = new Date(parts[2],parts[0]-1,parts[1]);
  console.log(myDate);
  var yearp = myDate.getFullYear();
  var monthp = ("0" + myDate.getMonth()).slice(-2);
  var dayp = ("0" + myDate.getDate()).slice(-2);*/

  dateSince += " 00:00:00";
  dateUntil += " 23:59:59";

  var sinceR = Date.parse(dateSince + "-0500") / 1000;
  var untilR = Date.parse(dateUntil + "-0500") / 1000;

  createObject(token, sinceR, untilR, function (key, dato) {
    /*datafb.push(dato);*/
    datajson += '"' + key + '":"' + dato + '", ';
    /*if(dato.length>1){
        console.log(dato);
        console.log('tres veces');
    }else{
      console.log('muchas veces');
    }*/
  });
  toggleButtonAct();
}

function toggleButtonAct() {
  document.getElementById('actualizarfb').classList.toggle('hide');
}

function controlBtn() {
  /*
        function splitDate(date){
            return  result = date.split('-');
        }
        var dateSince = document.getElementById('since').value;
  
        var nowkdate = splitDate(dateSince);
        var yearspl = nowkdate[0];
        var monthspl = nowkdate[1];
        console.log(yearspl);
        console.log(monthspl);*/
  subir('fb', 'month', 'mayo', '2017');
}

function subir(red, type, month, year) {
  console.log(datajson);
  var objeto = '{';
  objeto += datajson;
  objeto += '"red":"' + red + '",';
  objeto += '"type":"' + type + '",';
  objeto += '"year":"' + year + '",';
  objeto += '"month":"' + month + '"}';

  console.log(objeto);
  //console.log(objeto);
  var o = JSON.parse(objeto);
  //console.log(datafb);
  console.log(o);

  request.post('/api/estadisticas').send(o).end(function (err, res) {
    if (err) console.log(err);
    console.log(res); //arguments es una array de todos lo parametros que recibe una función
  });
}

function datePage(token) {
  FB.api('/maratondelasfloresmedellin', 'GET', { "fields": "id,name,about,likes,fan_count,posts,new_like_count,impressum,can_post,best_page,were_here_count", access_token: token }, function (response) {
    if (response && !response.error) {
      //console.log(response);
      return response;
    } else {
      console.log(response.error);
    }
  });
}

function createObject(token, sinceR, untilR, callback) {
  window.fbAsyncInit = function () {
    FB.init({
      appId: '563428367190351',
      secret: '0657823647bd8087717cc22e29c1e1be',
      xfbml: true,
      version: 'v2.9'
    });
    FB.api('/maratondelasfloresmedellin', 'GET', { "fields": "id,name,about,likes,fan_count,posts,new_like_count,impressum,can_post,best_page,were_here_count", access_token: token }, function (response) {
      if (response && !response.error) {
        console.log(response.fan_count + ' total fans');
        var key = "totalFans";
        callback(key, response.fan_count);
      } else {
        console.log(response.error);
      }
    });
    FB.api('/maratondelasfloresmedellin/insights/page_fan_adds', { "since": sinceR, "until": untilR, access_token: token }, function (response) {
      if (response && !response.error) {
        var fansNews = 0;
        response.data.map(function (datos) {
          datos.values.map(function (valor) {
            fansNews = fansNews + valor.value;
          });
        });
        parseInt(fansNews);
        console.log(fansNews + ' total new fans');
        var key = "fansNews";
        callback(key, fansNews);
      } else {
        console.log(response.error);
      }
    });
    FB.api('/maratondelasfloresmedellin/insights/page_fan_removes', { "since": sinceR, "until": untilR, access_token: token }, function (response) {
      if (response && !response.error) {
        var fansRemove = 0;
        response.data.map(function (datos) {
          datos.values.map(function (valor) {
            fansRemove = fansRemove + valor.value;
          });
        });
        console.log(fansRemove + ' total no me gustas');
        var key = "fansRemove";
        callback(key, fansRemove);
      } else {
        console.log(response.error);
      }
    });
    FB.api('/maratondelasfloresmedellin/insights/page_impressions', { "period": "day", "since": sinceR, "until": untilR, access_token: token }, function (response) {
      if (response && !response.error) {
        var impresions = 0;
        response.data.map(function (datos) {
          datos.values.map(function (valor) {
            impresions = impresions + valor.value;
          });
        });
        console.log(impresions + ' total impresiones');
        var key = "impresions";
        callback(key, impresions);
      } else {
        console.log(response.error);
      }
    });
    FB.api('/maratondelasfloresmedellin/insights/page_engaged_users', { "period": "day", "since": sinceR, "until": untilR, access_token: token }, function (response) {
      if (response && !response.error) {
        var activeusers = 0;
        response.data.map(function (datos) {
          datos.values.map(function (valor) {
            activeusers = activeusers + valor.value;
          });
        });
        console.log(activeusers + ' total usuarios activos');
        var key = "activeUsers";
        callback(key, activeusers);
      } else {
        console.log(response.error);
      }
    });
    FB.api('/maratondelasfloresmedellin/insights/page_actions_post_reactions_like_total', { "since": sinceR, "until": untilR, access_token: token }, function (response) {
      if (response && !response.error) {
        var megustapro = 0;
        var numDias = 0;
        response.data.map(function (datos) {
          datos.values.map(function (valor) {
            megustapro = megustapro + valor.value;
          });
          numDias = datos.values.length;
        });
        var promedioDia = megustapro / numDias;
        promedioDia = parseInt(promedioDia, 10); //pasar el nùmero a entero
        console.log(promedioDia + ' Promedio por día');
        var key = "promLikesByDay";
        callback(key, promedioDia);
      } else {
        console.log(response.error);
      }
    });
    FB.api('/maratondelasfloresmedellin/insights/page_admin_num_posts', { "period": "day", "since": sinceR, "until": untilR, access_token: token }, function (response) {
      if (response && !response.error) {
        var postinmonth = 0;
        response.data.map(function (datos) {
          datos.values.map(function (valor) {
            postinmonth = postinmonth + valor.value;
          });
        });
        console.log(postinmonth + ' Post en el mes');
        var key = "postInMonth";
        callback(key, postinmonth);
      } else {
        console.log(response.error);
      }
    });
    FB.api('/maratondelasfloresmedellin/insights/page_views_external_referrals', { "since": sinceR, "until": untilR, access_token: token }, function (response) {
      if (response && !response.error) {
        var numrefexternal = 0;
        response.data.map(function (datos) {
          datos.values.map(function (valor) {
            for (var i in valor.value) {
              numrefexternal = numrefexternal + valor.value[i];
            }
          });
        });
        console.log(numrefexternal + ' total referencias externas');
        var key = "numRefExternal";
        callback(key, numrefexternal);
      } else {
        console.log(response.error);
      }
    });
    FB.api('/maratondelasfloresmedellin/insights/page_views_external_referrals', { "since": sinceR, "until": untilR, access_token: token }, function (response) {
      if (response && !response.error) {
        var numrefexternal = 0;
        var nummayor = 0;
        var nummedio = 0;
        var numter = 0;
        var objectmayor = [];
        var objectmedio = [];
        var objecter = [];
        var yaestam = [];
        response.data.map(function (datos) {
          datos.values.map(function (valor) {

            for (var i in valor.value) {
              var key = i;
              numrefexternal = valor.value[i];
              var index = yaestam.indexOf(key);
              if (numrefexternal > nummayor && index === -1) {
                nummayor = numrefexternal;
                objectmayor = [key, nummayor];
                yaestam.push(key);
              } else if (numrefexternal > nummayor && objectmayor[0] === key) {
                nummayor = numrefexternal;
                objectmayor = [key, nummayor];
              } else if (nummedio < nummayor && nummedio < numrefexternal && index === -1) {
                nummedio = numrefexternal;
                objectmedio = [key, nummedio];
                yaestam.push(key);
              } else if (nummedio < nummayor && nummedio < numrefexternal && objectmedio[0] === key) {
                nummedio = numrefexternal;
                objectmedio = [key, nummedio];
              } else if (numter < numrefexternal && numter < nummedio && index === -1) {
                numter = numrefexternal;
                objecter = [key, numter];
                yaestam.push(key);
              } else if (numter < numrefexternal && numter < nummedio && objecter[0] === key) {
                numter = numrefexternal;
                objecter = [key, numter];
              }
            }
          });
        });

        var cadenaPrinRef = objectmayor[0] + ': ' + objectmayor[1] + ' ' + objectmedio[0] + ': ' + objectmedio[1] + ' ' + objecter[0] + ': ' + objecter[1];
        var key = "princRef";
        callback(key, cadenaPrinRef);
      } else {
        console.log(response.error);
      }
    });
    FB.api('/maratondelasfloresmedellin/insights/page_tab_views_login_top_unique', { "period": "day", "since": sinceR, "until": untilR, access_token: token }, function (response) {
      if (response && !response.error) {
        var numviewtabs = 0;
        response.data.map(function (datos) {
          datos.values.map(function (valor) {
            for (var i in valor.value) {
              numviewtabs = numviewtabs + valor.value[i];
            }
          });
        });
        console.log(numviewtabs + ' total vistas pestañas');
        var key = "numViewsTabs";
        callback(key, numviewtabs);
      } else {
        console.log(response.error);
      }
    });
    FB.api('/maratondelasfloresmedellin/insights/page_tab_views_login_top_unique', { "period": "day", "since": sinceR, "until": untilR, access_token: token }, function (response) {
      if (response && !response.error) {
        var numviewtabs = 0;
        var numviewmayor = 0;
        var numviewmedio = 0;
        var numviewmenor = 0;
        var objectmayor = [];
        var objectmedio = [];
        var objecter = [];
        var yaestam = [];
        var acummayor = 0;
        var acummedio = 0;
        var acummenor = 0;
        response.data.map(function (datos) {
          datos.values.map(function (valor) {

            for (var i in valor.value) {
              var key = i;
              numviewtabs = valor.value[i];
              var index = yaestam.indexOf(key);
              if (numviewtabs > numviewmayor && index === -1) {
                numviewmayor = numviewtabs;
                objectmayor = [key, numviewmayor];
                yaestam.push(key);
              } else if (numviewtabs > numviewmayor && objectmayor[0] === key) {
                numviewmayor = numviewtabs;
                objectmayor = [key, numviewmayor];
              } else if (numviewmedio < numviewmayor && numviewmedio < numviewtabs && index === -1) {
                numviewmedio = numviewtabs;
                objectmedio = [key, numviewmedio];
                yaestam.push(key);
              } else if (numviewmedio < numviewmayor && numviewmedio < numviewtabs && objectmedio[0] === key) {
                numviewmedio = numviewtabs;
                objectmedio = [key, numviewmedio];
              } else if (numviewmenor < numviewtabs && numviewmenor < numviewmedio && index === -1) {
                numviewmenor = numviewtabs;
                objecter = [key, numviewmenor];
                yaestam.push(key);
              } else if (numviewmenor < numviewtabs && numviewmenor < numviewmedio && objecter[0] === key) {
                numviewmenor = numviewtabs;
                objecter = [key, numviewmenor];
              }
            }
          });
        });
        response.data.map(function (datos) {
          datos.values.map(function (valor) {

            for (var i in valor.value) {
              if (objectmayor[0] === i) {
                acummayor = acummayor + valor.value[i];
              }
            }
            for (var i in valor.value) {
              if (objectmedio[0] === i) {
                acummedio = acummedio + valor.value[i];
              }
            }
            for (var i in valor.value) {
              if (objecter[0] === i) {
                acummenor = acummenor + valor.value[i];
              }
            }
          });
        });
        /*console.log(objectmayor[0] + ' ' + acummayor + ' mayor');
        var arrayMayor =[objectmayor[0], acummayor];
        console.log(objectmedio[0] + ' ' + acummedio + ' medio');
        var arrayMedio =[objectmedio[0], acummedio];
        console.log(objecter[0] + ' ' + acummenor + ' menor');
        var arrayMenor =[objecter[0], acummenor];
        var arrayPrinTabs = [arrayMayor,arrayMedio,arrayMenor]*/
        var key = "princTabs";
        /*var cadenaPrinTabs = objectmayor[0] + ': ' + acummayor + '\n'
          + objectmedio[0]  + ': ' + acummedio + '\n'
          + objecter[0] + ': ' + acummenor;*/
        var cadenaPrinTabs = objectmayor[0] + ': ' + acummayor + ' ' + objectmedio[0] + ': ' + acummedio + ' ' + objecter[0] + ': ' + acummenor;
        console.log(cadenaPrinTabs);
        callback(key, cadenaPrinTabs);
      } else {
        console.log(response.error);
      }
    });
    FB.api('/maratondelasfloresmedellin/insights/page_views_total', { "period": "day", "since": sinceR, "until": untilR, access_token: token }, function (response) {
      if (response && !response.error) {
        var totalViewPage = 0;
        var numDias = 0;
        response.data.map(function (datos) {
          datos.values.map(function (valor) {
            totalViewPage = totalViewPage + valor.value;
          });
          numDias = datos.values.length;
        });
        var promDiaAlcance = totalViewPage / numDias;
        promDiaAlcance = parseInt(promDiaAlcance, 10);
        console.log(promDiaAlcance + ' Promedio día de alcance ');
        var key = "promAlcByDay";
        callback(key, promDiaAlcance);
      } else {
        console.log(response.error);
      }
    });
    FB.api('/maratondelasfloresmedellin', 'GET', { "fields": "id,name,posts.until(" + untilR + ").since(" + sinceR + "){likes,comments,message,created_time,full_picture,link,insights.metric(post_impressions_unique)}", access_token: token }, function (response) {
      if (response && !response.error) {
        var numLikes = 0;
        var numComments = 0;
        var bestPostId;
        var posicionBest;
        var mayorCantLikes = 0;
        var alcancepost = 0;
        response.posts.data.map(function (datos, indexE) {

          if (datos.likes !== undefined) {
            datos.likes.data.map(function (valor) {
              numLikes = datos.likes.data.length;
            });
          } else {
            numLikes = 0;
          }
          if (numLikes > mayorCantLikes) {
            mayorCantLikes = numLikes;
            bestPostId = datos.id;
            posicionBest = indexE;
          }
        });

        console.log('El post de mayor likes es ' + bestPostId + ' con ' + mayorCantLikes);

        console.log(response.posts.data[posicionBest].id);
        var datetime = new Date(response.posts.data[posicionBest].created_time).toUTCString().split(" ").slice(1, 4).join(" "); //new Date(datos.created_time).toDateString();
        var messagePost = response.posts.data[posicionBest].message;
        var link = response.posts.data[posicionBest].link;
        var rutaImg = response.posts.data[posicionBest].full_picture;
        /*if(response.posts.data[posicionBest] !== undefined ){
          response.posts.data[posicionBest].likes.data.map(function(valor){
            numLikes = response.posts.data[posicionBest].likes.data.length;
          })
        }else{
            numLikes = 0;
        }*/

        if (response.posts.data[posicionBest].comments !== undefined) {
          response.posts.data[posicionBest].comments.data.map(function (valor) {
            numComments = response.posts.data[posicionBest].comments.data.length;
          });
        } else {
          numComments = 0;
        }

        if (response.posts.data[posicionBest].insights !== undefined) {
          response.posts.data[posicionBest].insights.data.map(function (valor) {
            valor.values.map(function (dato) {
              alcancepost = dato.value;
            });
          });
        } else {
          alcancepost = 0;
        }

        var arrayBestPost = [datetime, link, rutaImg, numLikes, numComments, alcancepost];
        var key = "bestPost";
        console.log(arrayBestPost);
        callback(key, arrayBestPost);
      } else {
        console.log(response.error);
      }
    });
    FB.AppEvents.logPageView();
  };
  (function (d, s, id) {
    var js,
        fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) {
      return;
    }
    js = d.createElement(s);js.id = id;
    js.src = "https://connect.facebook.net/en_US/sdk.js";
    fjs.parentNode.insertBefore(js, fjs);
  })(document, 'script', 'facebook-jssdk');
}

module.exports = landing(upform);

},{"../landing":401,"superagent":380,"yo-yo":388}],422:[function(require,module,exports){
'use strict';

var page = require('page');
var empty = require('empty-element');
var template = require('./template');
var title = require('title');

page('/uploadp', function (ctx, next) {
  title('Evermetrics - Upload p');
  var main = document.getElementById('main-container');
  empty(main).appendChild(template);
});

},{"./template":423,"empty-element":333,"page":361,"title":384}],423:[function(require,module,exports){
'use strict';

var _templateObject = _taggedTemplateLiteral(['<div class="col l12">\n      <div class="row">\n        <div class="signup-box">\n        <form class="signup-form formUploadPost" action="/api/prueba" method="POST" enctype="multipart/form-data">\n        <input type="file" name="filep" style="border:0;" />\n        <input class="btn" type="submit" value="Upload Image" name="submit" style="color:white;padding:0 20px;margin-top:30px;">\n        </form>\n\n        </div>\n      </div>\n      <div class="row">\n        <a href="/">Volver a la cuenta</a>\n      </div>\n    </div>'], ['<div class="col l12">\n      <div class="row">\n        <div class="signup-box">\n        <form class="signup-form formUploadPost" action="/api/prueba" method="POST" enctype="multipart/form-data">\n        <input type="file" name="filep" style="border:0;" />\n        <input class="btn" type="submit" value="Upload Image" name="submit" style="color:white;padding:0 20px;margin-top:30px;">\n        </form>\n\n        </div>\n      </div>\n      <div class="row">\n        <a href="/">Volver a la cuenta</a>\n      </div>\n    </div>']);

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var yo = require('yo-yo');
var landing = require('../landing');
var request = require('superagent');

var upform = yo(_templateObject);

module.exports = landing(upform);

},{"../landing":401,"superagent":380,"yo-yo":388}],424:[function(require,module,exports){
'use strict';

var page = require('page');
var empty = require('empty-element');
var template = require('./template');
var title = require('title');

page('/userinvalid', function (ctx, next) {
  title('Evermetrics - Invalid user');
  var main = document.getElementById('main-container');
  empty(main).appendChild(template);
});

},{"./template":425,"empty-element":333,"page":361,"title":384}],425:[function(require,module,exports){
'use strict';

var _templateObject = _taggedTemplateLiteral(['<div class="container container-login">\n    <div class="row">\n    <div class="col l12">\n          <div class="row">\n            <h1 class="titleNologged titleError"><i class="fa fa-exclamation-triangle" aria-hidden="true"></i>Usuario y/o contrase\xF1a no es v\xE1lido</h1>\n          </div>\n          <div class="contBtnLoggin" style="margin-top:20px !important;">\n            <a href="/signin" class="btnLoggin">Volver a intentarlo</a>\n          </div>\n        </div>\n    </div>\n  </div>'], ['<div class="container container-login">\n    <div class="row">\n    <div class="col l12">\n          <div class="row">\n            <h1 class="titleNologged titleError"><i class="fa fa-exclamation-triangle" aria-hidden="true"></i>Usuario y/o contrase\xF1a no es v\xE1lido</h1>\n          </div>\n          <div class="contBtnLoggin" style="margin-top:20px !important;">\n            <a href="/signin" class="btnLoggin">Volver a intentarlo</a>\n          </div>\n        </div>\n    </div>\n  </div>']);

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

var yo = require('yo-yo');

var invalid = yo(_templateObject);

module.exports = invalid;

},{"yo-yo":388}],426:[function(require,module,exports){
'use strict';

var axios = require('axios');

function loadAuth(ctx, next) {
  var whoami;
  return regeneratorRuntime.async(function loadAuth$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          _context.prev = 0;
          _context.next = 3;
          return regeneratorRuntime.awrap(axios.get('/whoami').then(function (res) {
            return res.data;
          }));

        case 3:
          whoami = _context.sent;

          if (whoami.username) {
            ctx.auth = whoami;
          } else {
            ctx.auth = false;
          }
          next();
          _context.next = 11;
          break;

        case 8:
          _context.prev = 8;
          _context.t0 = _context['catch'](0);

          console.log(_context.t0);

        case 11:
        case 'end':
          return _context.stop();
      }
    }
  }, null, this, [[0, 8]]);
}

exports.loadAuth = loadAuth;

},{"axios":3}]},{},[398]);
