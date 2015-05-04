(function (global) {
  'use strict'

  var producer = function (getPromise) {
    return function * () {
      for (var i = 0; i < 10; ++i) {
        yield getPromise()
      }
    }
  }

  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = producer
  } else {
    global._producers = global._producers || {}
    global._producers['generator'] = producer
  }
})(this)
