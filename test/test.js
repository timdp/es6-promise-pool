(function(global) {
  'use strict';

  var promisePool, Promise, PromisePool, chai, expect;

  if (typeof module !== 'undefined') {
    promisePool = require('../');
    chai = require('chai');
    chai.use(require('chai-as-promised'));
  } else {
    promisePool = global.promisePool;
    chai = global.chai;
  }
  Promise = promisePool.Promise;
  PromisePool = promisePool.PromisePool;
  expect = chai.expect;

  var supportsGenerators = (function() {
    try {
      eval('(function*(){})()');
      return true;
    } catch (e) {
      return false;
    }
  })();

  describe('PromisePool', function() {
    it('should throw if concurrency is a string', function() {
      expect(function() {
        new PromisePool(function() {}, '10');
      }).to.throw(Error);
    });

    it('should throw if concurrency is too low', function() {
      expect(function() {
        new PromisePool(function() {}, 0);
      }).to.throw(Error);
    });

    it('should support not providing options', function() {
      var pool = new PromisePool('test', 1);
      return expect(pool).to.be.an('object');
    });

    it('should return a promise', function() {
      it('should take a non-function as its producer', function() {
        var poolPromise = new PromisePool('test', 1).start();
        return expect(poolPromise).to.be.a(Promise);
      });
    });

    it('should take a non-function as its producer', function() {
      var poolPromise = new PromisePool('test', 1).start();
      return expect(poolPromise).to.be.fulfilled;
    });

    it('should take a single promise as its producer', function() {
      var poolPromise = new PromisePool(Promise.resolve(), 1).start();
      return expect(poolPromise).to.be.fulfilled;
    });

    if (supportsGenerators) {
      var gen = eval('(function* g() {' +
        'yield new Promise(function(resolve, reject) {' +
        'resolve();' +
        '});' +
        '})');
      it('should take a generator as its producer', function() {
        var poolPromise = new PromisePool(gen, 1).start();
        return expect(poolPromise).to.be.fulfilled;
      });
    }

    it('should add an event listener', function() {
      var pool = new PromisePool(Promise.resolve(), 1);
      var listener = function() {};
      pool.addEventListener('fulfilled', listener);
      expect(pool._listeners.fulfilled.indexOf(listener)).to.be.at.least(0);
    });

    it('should not add the same event listener twice', function() {
      var pool = new PromisePool(Promise.resolve(), 1);
      var listener = function() {};
      pool.addEventListener('fulfilled', listener);
      pool.addEventListener('fulfilled', listener);
      expect(pool._listeners.fulfilled.length).to.equal(1);
    });

    it('should remove an event listener', function() {
      var pool = new PromisePool(Promise.resolve(), 1);
      var listener = function() {};
      pool.addEventListener('fulfilled', listener);
      pool.removeEventListener('fulfilled', listener);
      expect(pool._listeners.fulfilled.indexOf(listener)).to.be.below(0);
    });

    it('should remove a listener for a nonexistent event', function() {
      var pool = new PromisePool(Promise.resolve(), 1);
      var listener = function() {};
      expect(function() {
        pool.removeEventListener('foo', listener);
      }).not.to.throw(Error);
    });

    it('should support removing a nonexistent event listener', function() {
      var pool = new PromisePool(Promise.resolve(), 1);
      var listener = function() {};
      pool.addEventListener('fulfilled', listener);
      pool.removeEventListener('fulfilled', listener);
      expect(function() {
        pool.removeEventListener('fulfilled', listener);
      }).not.to.throw(Error);
    });

    it('should resolve an empty pool', function() {
      var poolPromise = new PromisePool(function() {
        return null;
      }, 1).start();
      return expect(poolPromise).to.eventually.be.fulfilled;
    });

    it('should forward a rejection', function() {
      var poolPromise = new PromisePool(function() {
        return new Promise(function(resolve, reject) {
          reject(new Error('test'));
        });
      }, 1).start();
      return expect(poolPromise).to.eventually.be.rejectedWith(Error, 'test');    
    });

    it('should always provide an error upon rejection', function() {
      var poolPromise = new PromisePool(function() {
        return new Promise(function(resolve, reject) {
          reject();
        });
      }, 1).start();
      return expect(poolPromise).to.eventually.be.rejectedWith(Error);  
    });

    it('should not resolve after a rejection', function() {
      var reached = false;
      var cnt = 0;
      var pool = new PromisePool(function() {
        switch (cnt++) {
          case 0:
            return new Promise(function(resolve, reject) {
              reject(new Error('test'));
            });
          case 1:
            return new Promise(function(resolve, reject) {
              setTimeout(function() {
                resolve();
              }, 0);
            });
          default:
            return null;
        }
      }, 3);
      pool.addEventListener('fulfilled', function() {
        reached = true;
      });
      var poolPromise = pool.start();
      var valuePromise = poolPromise['catch'](function() {
        return reached;
      });
      return expect(valuePromise).to.eventually.equal(false);
    });

    it('should not reject again after a rejection', function() {
      var rejections = 0;
      var cnt = 0;
      var pool = new PromisePool(function() {
        switch (cnt++) {
          case 0:
            return new Promise(function(resolve, reject) {
              reject(new Error('test 1'));
            });
          case 1:
            return new Promise(function(resolve, reject) {
              setTimeout(function() {
                reject(new Error('test 2'));
              }, 0);
            });
          default:
            return null;
        }
      }, 3);
      pool.addEventListener('rejected', function() {
        rejections++;
      });
      var poolPromise = pool.start();
      var valuePromise = poolPromise['catch'](function() {
        return rejections;
      });
      return expect(valuePromise).to.eventually.equal(1);
    });

    it('should handle delayed promises', function() {
      var called = false;
      var poolPromise = new PromisePool(function() {
        if (called) {
          return null;
        }
        called = true;
        return new Promise(function(resolve, reject) {
          setTimeout(resolve, 10);
        });
      }, 1).start();
      return expect(poolPromise).to.be.fulfilled;    
    });

    it('should report the pool size', function() {
      var cnt = 0;
      var pool = new PromisePool(function() {
        if (cnt++ < 5) {
          return new Promise(function(resolve, reject) {
            setTimeout(resolve, 100);
          });
        } else {
          return null;
        }
      }, 3);
      pool.start();
      var sizePromise = new Promise(function(resolve, reject) {
        resolve(pool.size());
      });
      return expect(sizePromise).to.eventually.equal(3);
    });

    it('should report the concurrency', function() {
      var pool = new PromisePool(function() {
        return null;
      }, 5);
      pool.start();
      return expect(pool.concurrency()).to.equal(5);
    });

    it('should update the concurrency', function() {
      var pool = new PromisePool(function() {
        return null;
      }, 1);
      pool.concurrency(5);
      pool.start();
      return expect(pool.concurrency()).to.equal(5);
    });

    it('should increase the pool size upon a concurrency increase', function() {
      var size;
      var cnt = 0;
      var pool = new PromisePool(function() {
        if (cnt++ < 10) {
          return new Promise(function(resolve, reject) {
            pool.concurrency(10);
            size = pool.size();
            setTimeout(resolve, 0);
          });
        } else {
          return null;
        }
      }, 3);
      var poolPromise = pool.start();
      var sizePromise = poolPromise.then(function() {
        return size;
      });
      return expect(sizePromise).to.eventually.equal(9);
    });

    it('should not change the pool size of a finished pool', function() {
      var pool = new PromisePool(Promise.resolve(), 3);
      var poolPromise = pool.start();
      var sizePromise = poolPromise.then(function() {
        pool.concurrency(10);
        return pool.size();
      });
      expect(sizePromise).to.eventually.equal(0);
    });

    it('should throttle', function() {
      var maxPoolSize = 0;
      var cnt = 0;
      var pool = new PromisePool(function() {
        if (cnt++ < 10) {
          return new Promise(function(resolve, reject) {
            setTimeout(function() {
              maxPoolSize = Math.max(maxPoolSize, pool.size());
              resolve();
            }, 0);
          });
        } else {
          return null;
        }
      }, 3);
      var poolPromise = pool.start();
      var sizePromise = poolPromise.then(function() {
        return maxPoolSize;
      });
      return expect(sizePromise).to.eventually.be.at.most(3);
    });

    it('should not call the producer after terminating it', function() {
      var maxCnt = 0;
      var cnt = 0;
      var poolPromise = new PromisePool(function() {
        if (cnt++ === 3) {
          return null;
        } else {
          maxCnt = Math.max(maxCnt, cnt);
          return new Promise(function(resolve, reject) {
            setTimeout(resolve, 10);
          });
        }
      }, 1).start();
      var cntPromise = poolPromise.then(function() {
        return maxCnt;
      });
      return expect(cntPromise).to.eventually.equal(3);
    });

    it('should fire a fulfilled event', function() {
      var arg = null;
      var res = 'test';
      var prom = new Promise(function(resolve, reject) {
        setTimeout(function() {
          resolve(res);
        }, 0);
      });
      var called = false;
      var pool = new PromisePool(function() {
        if (called) {
          return null;
        }
        called = true;
        return prom;
      }, 1);
      pool.addEventListener('fulfilled', function(evt) {
        arg = evt;
      });
      var poolPromise = pool.start();
      var argPromise = poolPromise.then(function() {
        return arg;
      });
      var expEvent = {
        type: 'fulfilled',
        target: pool,
        data: {
          promise: prom,
          result: res
        }
      };
      return expect(argPromise).to.eventually.deep.equal(expEvent);
    });

    it('should fire a rejected event', function() {
      var arg = null;
      var err = new Error('test');
      var prom = new Promise(function(resolve, reject) {
        setTimeout(function() {
          reject(err);
        }, 0);
      });
      var called = false;
      var pool = new PromisePool(function() {
        if (called) {
          return null;
        }
        called = true;
        return prom;
      }, 1);
      pool.addEventListener('rejected', function(evt) {
        arg = evt;
      });
      var poolPromise = pool.start();
      var argPromise = poolPromise.then(function() {
        throw new Error('Should not happen');
      }, function() {
        return arg;
      });
      var expEvent = {
        type: 'rejected',
        target: pool,
        data: {
          promise: prom,
          error: err
        }
      };
      return expect(argPromise).to.eventually.deep.equal(expEvent);
    });

    it('should catch event listener errors', function() {
      var called = false;
      var pool = new PromisePool(Promise.resolve(), 1);
      pool.addEventListener('fulfilled', function() {
        throw new Error('test');
      });
      var poolPromise = pool.start();
      return expect(poolPromise).to.eventually.be.rejected;
    });
  });

  describe('promisePool', function() {
    it('should support not providing options', function() {
      var poolPromise = promisePool('test', 1);
      return expect(poolPromise).to.be.an('object');
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
          arg = Array.prototype.slice.call(arguments, 1);
        }
      });
      var argPromise = poolPromise.then(function() {
        return arg;
      });
      return expect(argPromise).to.eventually.deep.equal([prom, res]);    
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
          arg = Array.prototype.slice.call(arguments, 1);
        }
      });
      var argPromise = poolPromise.then(function() {
        throw new Error('Should not happen');
      }, function() {
        return arg;
      });
      return expect(argPromise).to.eventually.deep.equal([prom, err]);    
    });
  });
})(this);
