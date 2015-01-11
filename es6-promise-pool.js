(function(global) {
  'use strict';

  var Promise = global.Promise || require('es6-promise').Promise;

  var generatorFunctionToProducer = function(gen) {
    gen = gen();
    return function() {
      var res = gen.next();
      return res.done ? null : res.value;
    };
  };

  var toProducer = function(obj) {
    var type = typeof obj;
    if (type === 'function') {
      if (obj.constructor && obj.constructor.name === 'GeneratorFunction') {
        return generatorFunctionToProducer(obj);
      } else {
        return obj;
      }
    }
    if (type !== 'object' || typeof obj.then !== 'function') {
      obj = Promise.resolve(obj);
    }
    var called = false;
    return function() {
      if (called) {
        return null;
      }
      called = true;
      return obj;
    };
  };

  var PromisePoolEvent = function(target, type, data) {
    this.target = target;
    this.type = type;
    this.data = data;
  };

  var PromisePool = function(source, concurrency, options) {
    if (typeof concurrency !== 'number' ||
        Math.floor(concurrency) !== concurrency ||
        concurrency < 1) {
      throw new Error('Invalid concurrency');
    }
    this._producer = toProducer(source);
    this._concurrency = concurrency;
    this._options = options || {};
    this._listeners = {};
    this._producerDone = false;
    this._size = 0;
    this._resolve = null;
    this._reject = null;
  };

  PromisePool.prototype.concurrency = function(value) {
    if (typeof value !== 'undefined') {
      this._concurrency = value;
    }
    return this._concurrency;
  };

  PromisePool.prototype.size = function() {
    return this._size;
  };

  PromisePool.prototype.start = function() {
    var that = this;
    return new Promise(function(resolve, reject) {
      that._resolve = resolve;
      that._reject = reject;
      that._proceed();
    });
  };

  PromisePool.prototype.addEventListener = function(type, listener) {
    this._listeners[type] = this._listeners[type] || [];
    if (this._listeners[type].indexOf(listener) < 0) {
      this._listeners[type].push(listener);
    }
  };

  PromisePool.prototype.removeEventListener = function(type, listener) {
    if (this._listeners[type]) {
      var p = this._listeners[type].indexOf(listener);
      if (p >= 0) {
        this._listeners[type].splice(p, 1);
      }
    }
  };

  PromisePool.prototype._fireEvent = function(type, data) {
    if (this._listeners[type] && this._listeners[type].length) {
      var evt = new PromisePoolEvent(this, type, data);
      var listeners = this._listeners[type].slice();
      for (var i = 0, l = listeners.length; i < l; ++i) {
        listeners[i].call(this, evt);
      }
    }
  };

  PromisePool.prototype._settle = function(error) {
    if (error) {
      this._reject(error);
    } else {
      this._resolve();
    }
    this._resolve = this._reject = null;
  };

  PromisePool.prototype._onPooledPromiseFulfilled = function(promise, result) {
    this._size--;
    if (this._resolve) {
      this._fireEvent('fulfilled', {
        promise: promise,
        result: result
      });
      this._proceed();
    }
  };

  PromisePool.prototype._onPooledPromiseRejected = function(promise, error) {
    this._size--;
    if (this._reject) {
      this._fireEvent('rejected', {
        promise: promise,
        error: error
      });
      this._settle(error || new Error('Unknown error'));
    }
  };

  PromisePool.prototype._trackPromise = function(promise) {
    var that = this;
    promise.then(function(result) {
      that._onPooledPromiseFulfilled(promise, result);
    }, function(error) {
      that._onPooledPromiseRejected(promise, error);
    })
    ['catch'](function(err) {
      that._settle(new Error('Promise processing failed: ' + err));
    });
  };

  PromisePool.prototype._proceed = function() {
    if (!this._producerDone) {
      var promise;
      while (this._size < this._concurrency &&
          !!(promise = this._producer.call(this))) {
        this._size++;
        this._trackPromise(promise);
      }
      if (!promise) {
        this._producerDone = true;
      }
    }
    if (this._producerDone && this._size === 0) {
      this._settle();
    }
  };

  var modernizeOption = function(options, listeners, optKey, eventType, eventKey) {
    if (options[optKey]) {
      var cb = options[optKey];
      listeners[eventType] = function(evt) {
        cb(evt.target, evt.data.promise, evt.data[eventKey]);
      };
      delete options[optKey];
    }
  };

  var modernizeOptions = function(options) {
    var listeners = {};
    modernizeOption(options, listeners, 'onresolve', 'fulfilled', 'result');
    modernizeOption(options, listeners, 'onreject', 'rejected', 'error');
    return listeners;
  };

  var createPool = function(source, concurrency, options) {
    // Legacy API: options.onresolve and options.onreject
    var listeners;
    if (options) {
      listeners = modernizeOptions(options);
    }
    var pool = new PromisePool(source, concurrency, options);
    if (listeners) {
      for (var type in listeners) {
        if (listeners.hasOwnProperty(type)) {
          pool.addEventListener(type, listeners[type]);
        }
      }
    }
    return pool.start();
  };

  createPool.PromisePool = PromisePool;

  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = createPool;
  } else {
    global.promisePool = createPool;
  }
})(this);
