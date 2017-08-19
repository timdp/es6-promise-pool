(function (global) {
  'use strict'

  var PromisePool, ES6Promise, Bluebird, chai, expect
  if (typeof exports === 'object') {
    PromisePool = require('./')
    chai = require('chai')
    chai.use(require('chai-as-promised'))
    chai.use(require('dirty-chai'))
    ES6Promise = require('es6-promise')
    Bluebird = require('bluebird')
  } else {
    PromisePool = global.PromisePool
    chai = global.chai
    ES6Promise = global.ES6Promise
    Bluebird = Promise.noConflict()
  }
  expect = chai.expect

  ES6Promise.polyfill()

  var supportsGenerators = (function () {
    try {
      eval('(function*(){})()') // eslint-disable-line no-eval
      return true
    } catch (e) {
      return false
    }
  })()

  describe('es6-promise-pool', function () {
    it('exports PromisePool', function () {
      expect(PromisePool.PromisePool).to.equal(PromisePool)
    })

    it('exports PromisePoolEvent', function () {
      expect(PromisePool.PromisePoolEvent).to.be.a('function')
    })
  })

  describe('EventTarget', function () {
    describe('#addEventListener()', function () {
      it('adds an event listener', function () {
        var pool = new PromisePool(Promise.resolve(), 1)
        var listener = function () {}
        pool.addEventListener('fulfilled', listener)
        expect(pool._listeners.fulfilled.indexOf(listener)).to.be.at.least(0)
      })

      it('does not add the same event listener twice', function () {
        var pool = new PromisePool(Promise.resolve(), 1)
        var listener = function () {}
        pool.addEventListener('fulfilled', listener)
        pool.addEventListener('fulfilled', listener)
        expect(pool._listeners.fulfilled.length).to.equal(1)
      })
    })

    describe('#removeEventListener()', function () {
      it('removes an event listener', function () {
        var pool = new PromisePool(Promise.resolve(), 1)
        var listener = function () {}
        pool.addEventListener('fulfilled', listener)
        pool.removeEventListener('fulfilled', listener)
        expect(pool._listeners.fulfilled.indexOf(listener)).to.be.below(0)
      })

      it('removes a listener for a nonexistent event', function () {
        var pool = new PromisePool(Promise.resolve(), 1)
        var listener = function () {}
        expect(function () {
          pool.removeEventListener('foo', listener)
        }).not.to.throw(Error)
      })

      it('supports removing a nonexistent event listener', function () {
        var pool = new PromisePool(Promise.resolve(), 1)
        var listener = function () {}
        pool.addEventListener('fulfilled', listener)
        pool.removeEventListener('fulfilled', listener)
        expect(function () {
          pool.removeEventListener('fulfilled', listener)
        }).not.to.throw(Error)
      })
    })
  })

  describe('PromisePool', function () {
    describe('constructor', function () {
      it('accepts a non-function as the producer', function () {
        var poolPromise = new PromisePool('test', 1).start()
        return expect(poolPromise).to.be.fulfilled
      })

      it('accepts a single promise as the producer', function () {
        var poolPromise = new PromisePool(Promise.resolve(), 1).start()
        return expect(poolPromise).to.be.fulfilled
      })

      it('accepts an iterator as the producer', function () {
        var called = false
        var iterator = {
          next: function () {
            if (called) {
              return {done: true}
            }
            called = true
            return {value: Promise.resolve()}
          }
        }
        var poolPromise = new PromisePool(iterator, 1).start()
        return expect(poolPromise).to.be.fulfilled
      })

      if (supportsGenerators) {
        var gen = eval('' + // eslint-disable-line no-eval
          '(function * g () {' +
          '  yield Promise.resolve()' +
          '})')
        it('accepts a generator as the producer', function () {
          var poolPromise = new PromisePool(gen, 1).start()
          return expect(poolPromise).to.be.fulfilled
        })
      } else {
        it('accepts a generator as the producer')
      }

      it('throws if concurrency is a string', function () {
        expect(function () {
          new PromisePool(function () {}, '10') // eslint-disable-line no-new
        }).to.throw(Error)
      })

      it('throws if concurrency is too low', function () {
        expect(function () {
          new PromisePool(function () {}, 0) // eslint-disable-line no-new
        }).to.throw(Error)
      })

      it('does not require options', function () {
        var pool = new PromisePool('test', 1)
        return expect(pool).to.be.an('object')
      })
    })

    describe('#start()', function () {
      it('returns a promise', function () {
        var poolPromise = new PromisePool('test', 1).start()
        return expect(poolPromise).to.be.an.instanceof(Promise)
      })

      it('returns a custom promise', function () {
        var options = {promise: Bluebird}
        var poolPromise = new PromisePool('test', 1, options).start()
        return expect(poolPromise).to.be.an.instanceof(Bluebird)
      })

      it('throttles', function () {
        var maxPoolSize = 0
        var cnt = 0
        var pool = new PromisePool(function () {
          if (cnt++ < 10) {
            return new Promise(function (resolve, reject) {
              maxPoolSize = Math.max(maxPoolSize, pool.size())
              resolve()
            })
          } else {
            return null
          }
        }, 3)
        var poolPromise = pool.start()
        var sizePromise = poolPromise.then(function () {
          return maxPoolSize
        })
        return expect(sizePromise).to.eventually.be.at.most(3)
      })

      it('calls the producer after settling', function () {
        var maxCnt = 0
        var cnt = 0
        var poolPromise = new PromisePool(function () {
          if (cnt++ === 3) {
            return null
          } else {
            maxCnt = Math.max(maxCnt, cnt)
            return new Promise(function (resolve, reject) {
              setTimeout(resolve, 10)
            })
          }
        }, 1).start()
        var cntPromise = poolPromise.then(function () {
          return maxCnt
        })
        return expect(cntPromise).to.eventually.equal(3)
      })
    })

    describe('#size()', function () {
      it('reports the pool size', function () {
        var cnt = 0
        var pool = new PromisePool(function () {
          if (cnt++ < 5) {
            return new Promise(function (resolve, reject) {
              setTimeout(resolve, 100)
            })
          } else {
            return null
          }
        }, 3)
        pool.start()
        var sizePromise = new Promise(function (resolve, reject) {
          resolve(pool.size())
        })
        return expect(sizePromise).to.eventually.equal(3)
      })
    })

    describe('#concurrency()', function () {
      it('reports the concurrency', function () {
        var pool = new PromisePool(function () {
          return null
        }, 5)
        pool.start()
        return expect(pool.concurrency()).to.equal(5)
      })

      it('updates the concurrency', function () {
        var pool = new PromisePool(function () {
          return null
        }, 1)
        pool.concurrency(5)
        pool.start()
        return expect(pool.concurrency()).to.equal(5)
      })

      it('increases the pool size', function () {
        var size
        var cnt = 0
        var pool = new PromisePool(function () {
          if (cnt++ < 10) {
            return new Promise(function (resolve, reject) {
              if (cnt === 2) {
                pool.concurrency(5)
                size = pool.size()
              }
              resolve()
            })
          } else {
            return null
          }
        }, 1)
        var poolPromise = pool.start()
        var sizePromise = poolPromise.then(function () {
          return size
        })
        return expect(sizePromise).to.eventually.equal(5)
      })

      it('calls the producer again when decreasing concurrency', function () {
        var cnt = 0
        var iterations = 10
        var concurrency = 3
        var concurrencyChanged = false
        var pool
        var producer = function () {
          if (cnt++ < iterations) {
            return new Promise(function (resolve, reject) {
              setTimeout(function () {
                if (!concurrencyChanged) {
                  pool.concurrency(concurrency + 1)
                  concurrencyChanged = true
                }
                resolve()
              }, 0)
            })
          } else {
            return null
          }
        }
        pool = new PromisePool(producer, concurrency)
        var poolPromise = pool.start()
        var cntPromise = poolPromise.then(function () {
          return cnt
        })
        return expect(cntPromise).to.eventually.equal(iterations + 1)
      })

      it('calls the producer again when increasing concurrency', function () {
        var cnt = 0
        var iterations = 10
        var concurrency = 3
        var concurrencyChanged = false
        var pool
        var producer = function () {
          if (cnt++ < iterations) {
            return new Promise(function (resolve, reject) {
              setTimeout(function () {
                if (!concurrencyChanged) {
                  pool.concurrency(concurrency + 1)
                  concurrencyChanged = true
                }
                resolve()
              }, 0)
            })
          } else {
            return null
          }
        }
        pool = new PromisePool(producer, concurrency)
        var poolPromise = pool.start()
        var cntPromise = poolPromise.then(function () {
          return cnt
        })
        return expect(cntPromise).to.eventually.equal(iterations + 1)
      })

      it('does not change the pool size after fulfilment', function () {
        var pool = new PromisePool(Promise.resolve(), 3)
        var poolPromise = pool.start()
        var sizePromise = poolPromise.then(function () {
          pool.concurrency(10)
          return pool.size()
        })
        return expect(sizePromise).to.eventually.equal(0)
      })
    })

    describe('#active()', function () {
      it('reports inactivity by default', function () {
        var pool = new PromisePool(Promise.resolve(), 3)
        expect(pool.active()).to.equal(false)
      })

      it('reports activity while working', function () {
        var called = false
        var pool = new PromisePool(function () {
          if (called) {
            return null
          }
          called = true
          return new Promise(function (resolve, reject) {
            setTimeout(resolve, 10)
          })
        }, 3)
        pool.start()
        expect(pool.active()).to.equal(true)
      })

      it('reports inactivity after fulfilment', function () {
        var pool = new PromisePool(Promise.resolve(), 3)
        var poolPromise = pool.start()
        var activePromise = poolPromise.then(function () {
          return pool.active()
        })
        return expect(activePromise).to.eventually.equal(false)
      })
    })

    describe('#promise()', function () {
      it('does not return a promise by default', function () {
        var pool = new PromisePool(Promise.resolve(), 3)
        expect(pool.promise()).to.not.exist()
      })

      it('returns a promise while working', function () {
        var called = false
        var pool = new PromisePool(function () {
          if (called) {
            return null
          }
          called = true
          return new Promise(function (resolve, reject) {
            setTimeout(resolve, 10)
          })
        }, 3)
        var poolPromise = pool.start()
        expect(pool.promise()).to.equal(poolPromise)
      })

      it('does not return a promise after fulfilment', function () {
        var pool = new PromisePool(Promise.resolve(), 3)
        var poolPromise = pool.start()
        var promisePromise = poolPromise.then(function () {
          return pool.promise()
        })
        return expect(promisePromise).to.eventually.not.exist
      })
    })

    describe('fulfilment', function () {
      it('happens on an empty pool', function () {
        var poolPromise = new PromisePool(function () {
          return null
        }, 1).start()
        return expect(poolPromise).to.eventually.be.fulfilled
      })

      it('happens on a delayed promise', function () {
        var called = false
        var poolPromise = new PromisePool(function () {
          if (called) {
            return null
          }
          called = true
          return new Promise(function (resolve, reject) {
            setTimeout(resolve, 10)
          })
        }, 1).start()
        return expect(poolPromise).to.be.fulfilled
      })
    })

    describe('rejection', function () {
      it('gets forwarded', function () {
        var poolPromise = new PromisePool(function () {
          return new Promise(function (resolve, reject) {
            reject(new Error('test'))
          })
        }, 1).start()
        return expect(poolPromise).to.eventually.be.rejectedWith(Error, 'test')
      })

      it('provides an Error', function () {
        var poolPromise = new PromisePool(function () {
          return new Promise(function (resolve, reject) {
            reject(new Error())
          })
        }, 1).start()
        return expect(poolPromise).to.eventually.be.rejectedWith(Error)
      })

      it('does not cause fulfilment', function () {
        var reached = false
        var cnt = 0
        var pool = new PromisePool(function () {
          switch (cnt++) {
            case 0:
              return new Promise(function (resolve, reject) {
                reject(new Error('test'))
              })
            case 1:
              return new Promise(function (resolve, reject) {
                resolve()
              })
            default:
              return null
          }
        }, 3)
        pool.addEventListener('fulfilled', function () {
          reached = true
        })
        var poolPromise = pool.start()
        var valuePromise = poolPromise['catch'](function () {
          return reached
        })
        return expect(valuePromise).to.eventually.equal(false)
      })

      it('does not happen multiple times', function () {
        var rejections = 0
        var cnt = 0
        var pool = new PromisePool(function () {
          switch (cnt++) {
            case 0:
              return new Promise(function (resolve, reject) {
                reject(new Error('test 1'))
              })
            case 1:
              return new Promise(function (resolve, reject) {
                reject(new Error('test 2'))
              })
            default:
              return null
          }
        }, 3)
        pool.addEventListener('rejected', function () {
          rejections++
        })
        var poolPromise = pool.start()
        var valuePromise = poolPromise['catch'](function () {
          return rejections
        })
        return expect(valuePromise).to.eventually.equal(1)
      })
    })

    describe('events', function () {
      it('fires fulfilled upon fulfillment', function () {
        var arg = null
        var res = 'test'
        var prom = new Promise(function (resolve, reject) {
          resolve(res)
        })
        var called = false
        var pool = new PromisePool(function () {
          if (called) {
            return null
          }
          called = true
          return prom
        }, 1)
        pool.addEventListener('fulfilled', function (evt) {
          arg = evt
        })
        var poolPromise = pool.start()
        var argPromise = poolPromise.then(function () {
          return arg
        })
        var expEvent = {
          type: 'fulfilled',
          target: pool,
          data: {
            promise: prom,
            result: res
          }
        }
        return expect(argPromise).to.eventually.deep.equal(expEvent)
      })

      it('fires rejected upon rejection', function () {
        var arg = null
        var err = new Error('test')
        var prom = new Promise(function (resolve, reject) {
          reject(err)
        })
        var called = false
        var pool = new PromisePool(function () {
          if (called) {
            return null
          }
          called = true
          return prom
        }, 1)
        pool.addEventListener('rejected', function (evt) {
          arg = evt
        })
        var poolPromise = pool.start()
        var argPromise = poolPromise.then(function () {
          throw new Error('Should not happen')
        }, function () {
          return arg
        })
        var expEvent = {
          type: 'rejected',
          target: pool,
          data: {
            promise: prom,
            error: err
          }
        }
        return expect(argPromise).to.eventually.deep.equal(expEvent)
      })

      it('catches event listener errors', function () {
        var pool = new PromisePool(Promise.resolve(), 1)
        pool.addEventListener('fulfilled', function () {
          throw new Error('test')
        })
        var poolPromise = pool.start()
        return expect(poolPromise).to.eventually.be.rejected
      })
    })
  })

  describe('PromisePoolEvent', function () {
    describe('constructor', function () {
      var PromisePoolEvent = PromisePool.PromisePoolEvent

      it('stores the event target', function () {
        var target = {}
        var type = 'test'
        var data = {}
        var evt = new PromisePoolEvent(target, type, data)
        expect(evt.target).to.equal(target)
      })

      it('stores the event type', function () {
        var target = {}
        var type = 'test'
        var data = {}
        var evt = new PromisePoolEvent(target, type, data)
        expect(evt.type).to.equal(type)
      })

      it('stores the event data', function () {
        var target = {}
        var type = 'test'
        var data = {}
        var evt = new PromisePoolEvent(target, type, data)
        expect(evt.data).to.equal(data)
      })
    })
  })
})(this)
