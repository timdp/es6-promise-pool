(function (global) {
  'use strict'

  var producer = function (getPromise) {
    var i = 0
    return {
      next: function () {
        return (++i < 10) ? {value: getPromise()} : {done: true}
      }
    }
  }

  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = producer
  } else {
    global._producers = global._producers || {}
    global._producers['iterator'] = producer
  }
})(this)
