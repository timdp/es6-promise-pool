(function (global) {
  'use strict'

  var producer = function (getPromise) {
    var i = 0
    return function () {
      return (i++ < 10) ? getPromise() : null
    }
  }

  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = producer
  } else {
    global._producers = global._producers || {}
    global._producers['function'] = producer
  }
})(this)
