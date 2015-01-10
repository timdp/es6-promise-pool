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
    return function() {
      return obj;
    };
  };

  var pool = function(source, concurrency, options) {
    options = options || {};
    var onResolve = options.onresolve || function() {};
    var onReject = options.onreject || function() {};
    var producer = toProducer(source);
    var size = 0;
    var poolPromise = new Promise(function(resolve, reject) {
      var failed = false;
      var proceed = function() {
        var promise;
        while (size < concurrency && (promise = producer()) !== null) {
          promise.then(function(result) {
            size--;
            if (!failed) {
              onResolve(poolPromise, promise, result);
              proceed();
            }
          }, function(err) {
            if (!failed) {
              failed = true;
              onReject(poolPromise, promise, err);
              reject(err);
            }
          });
          size++;
        }
        if (size === 0) {
          resolve();
        }
      };
      proceed();
    });
    poolPromise.pool = {
      size: function() {
        return size;
      },
      concurrency: function(value) {
        if (typeof value !== 'undefined') {
          concurrency = value;
        }
        return concurrency;
      }
    };
    return poolPromise;
  };

  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = pool;
  } else {
    global.promisePool = pool;
  }
})(this);
