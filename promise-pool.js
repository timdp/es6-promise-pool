(function() {
  'use strict';

  var toFunction = function(gen) {
    if (!gen.constructor || gen.constructor.name !== 'GeneratorFunction') {
      return gen;
    }
    gen = gen();
    return function() {
      var res = gen.next();
      return res.done ? null : res.value;
    };
  };

  var pool = function(generator, concurrency, options) {
    options = options || {};
    var onProgress = options.onprogress || function() {};
    var onError = options.onerror || function() {};
    generator = toFunction(generator);
    var size = 0;
    var poolPromise = new Promise(function(resolve, reject) {
      var failed = false;
      var proceed = function() {
        var promise;
        while (size < concurrency && (promise = generator()) !== null) {
          promise.then(function(result) {
            size--;
            if (!failed) {
              onProgress(poolPromise, promise, result);
              proceed();
            }
          }, function(err) {
            if (!failed) {
              failed = true;
              onError(poolPromise, promise, err);
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
      }
    };
    return poolPromise;
  };

  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = pool;
  } else {
    window.promisePool = pool;
  }
})();
