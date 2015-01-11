(function(global) {
  'use strict';

  var Promise = global.Promise || require('es6-promise').Promise;

  var chai, promisePool;
  if (typeof module !== 'undefined') {
    chai = require('chai');
    chai.use(require('chai-as-promised'));
    promisePool = require('../');
  } else {
    chai = global.chai;
    promisePool = global.promisePool;
  }

  var expect = chai.expect;

  var supportsGenerators = (function() {
    try {
      eval('(function*(){})()');
      return true;
    } catch (e) {
      return false;
    }
  })();

  describe('promisePool', function() {
    it('should take a non-function', function() {
      var poolPromise = promisePool('test', 1);
      return expect(poolPromise).to.be.fulfilled;
    });

    it('should take a single promise', function() {
      var poolPromise = promisePool(Promise.resolve(), 1);
      return expect(poolPromise).to.be.fulfilled;
    });

    if (supportsGenerators) {
      var gen = eval('(function* g() {' +
        'yield new Promise(function(resolve, reject) {' +
        'resolve();' +
        '});' +
        '})');
      it('should take a generator', function() {
        var poolPromise = promisePool(gen, 1);
        return expect(poolPromise).to.be.fulfilled;
      });
    }

    it('should resolve an empty pool', function() {
      var poolPromise = promisePool(function() {
        return null;
      }, 1);
      return expect(poolPromise).to.be.fulfilled;
    });

    it('should forward a rejection', function() {
      var poolPromise = promisePool(function() {
        return new Promise(function(resolve, reject) {
          reject(new Error('test'));
        });
      }, 1);
      return expect(poolPromise).to.be.rejectedWith(Error, 'test');    
    });

    it('should not resolve after a rejection', function() {
      var reached = false;
      var cnt = 0;
      var poolPromise = promisePool(function() {
        switch (cnt++) {
          case 0:
            return new Promise(function(resolve, reject) {
              reject(new Error('test'));
            });
          case 1:
            return new Promise(function(resolve, reject) {
              setTimeout(function() {
                resolve();
              }, 10);
            });
          default:
            return null;
        }
      }, 3, {
        onresolve: function() {
          reached = true;
        }
      });
      var valuePromise = poolPromise['catch'](function() {
        return reached;
      });
      return expect(valuePromise).to.eventually.equal(false);
    });

    it('should not reject again after a rejection', function() {
      var rejections = 0;
      var cnt = 0;
      var poolPromise = promisePool(function() {
        switch (cnt++) {
          case 0:
            return new Promise(function(resolve, reject) {
              reject(new Error('test'));
            });
          case 1:
            return new Promise(function(resolve, reject) {
              setTimeout(function() {
                reject();
              }, 10);
            });
          default:
            return null;
        }
      }, 3, {
        onreject: function() {
          rejections++;
        }
      });
      var valuePromise = poolPromise['catch'](function() {
        return rejections;
      });
      return expect(valuePromise).to.eventually.equal(1);
    });

    it('should handle delayed promises', function() {
      var called = false;
      var poolPromise = promisePool(function() {
        if (called) {
          return null;
        }
        called = true;
        return new Promise(function(resolve, reject) {
          setTimeout(resolve, 10);
        });
      }, 1);
      return expect(poolPromise).to.be.fulfilled;    
    });

    it('should have a pool property', function() {
      var poolPromise = promisePool(function() {
        return null;
      }, 1);
      return expect(poolPromise.pool).to.be.an('object');
    });

    it('should report the pool size', function() {
      var cnt = 0;
      var poolPromise = promisePool(function() {
        if (cnt++ < 5) {
          return new Promise(function(resolve, reject) {
            setTimeout(resolve, 100);
          });
        } else {
          return null;
        }
      }, 3);
      var sizePromise = new Promise(function(resolve, reject) {
        resolve(poolPromise.pool.size());
      });
      return expect(sizePromise).to.eventually.equal(3);
    });

    it('should report the concurrency', function() {
      var poolPromise = promisePool(function() {
        return null;
      }, 5);
      return expect(poolPromise.pool.concurrency()).to.equal(5);
    });

    it('should update the concurrency', function() {
      var poolPromise = promisePool(function() {
        return null;
      }, 1);
      poolPromise.pool.concurrency(5);
      return expect(poolPromise.pool.concurrency()).to.equal(5);
    });

    it('should throttle', function() {
      var maxPoolSize = 0;
      var cnt = 0;
      var poolPromise = promisePool(function() {
        if (cnt++ < 10) {
          return new Promise(function(resolve, reject) {
            setTimeout(function() {
              maxPoolSize = Math.max(maxPoolSize, poolPromise.pool.size());
              resolve();
            }, 0);
          });
        } else {
          return null;
        }
      }, 3);
      var sizePromise = poolPromise.then(function() {
        return maxPoolSize;
      });
      return expect(sizePromise).to.eventually.be.at.most(3);
    });

    it('should not call the producer after terminating it', function() {
      var maxCnt = 0;
      var cnt = 0;
      var poolPromise = promisePool(function() {
        if (cnt++ === 3) {
          return null;
        } else {
          maxCnt = Math.max(maxCnt, cnt);
          return new Promise(function(resolve, reject) {
            setTimeout(resolve, 10);
          });
        }
      }, 1);
      var cntPromise = poolPromise.then(function() {
        return maxCnt;
      });
      return expect(cntPromise).to.eventually.equal(3);
    });

    it('should call onresolve', function() {
      var arg = null;
      var res = 'test';
      var prom = new Promise(function(resolve, reject) {
        setTimeout(function() {
          resolve(res);
        }, 0);
      });
      var called = false;
      var poolPromise = promisePool(function() {
        if (called) {
          return null;
        }
        called = true;
        return prom;
      }, 1, {
        onresolve: function() {
          arg = Array.prototype.slice.call(arguments);
        }
      });
      var argPromise = poolPromise.then(function() {
        return arg;
      });
      return expect(argPromise).to.eventually.deep.equal([poolPromise, prom, res]);    
    });

    it('should call onreject', function() {
      var arg = null;
      var err = new Error('test');
      var prom = new Promise(function(resolve, reject) {
        setTimeout(function() {
          reject(err);
        }, 0);
      });
      var called = false;
      var poolPromise = promisePool(function() {
        if (called) {
          return null;
        }
        called = true;
        return prom;
      }, 1, {
        onreject: function() {
          arg = Array.prototype.slice.call(arguments);
        }
      });
      var argPromise = poolPromise.then(function() {
        throw new Error('Should not happen');
      }, function() {
        return arg;
      });
      return expect(argPromise).to.eventually.deep.equal([poolPromise, prom, err]);    
    });
  });
})(this);
