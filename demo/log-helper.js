(function (global) {
  var pad = function (num, len) {
    num = '' + num
    while (num.length < len) {
      num = '0' + num
    }
    return num
  }

  var time = function () {
    var date = new Date()
    var h = pad(date.getHours(), 2)
    var m = pad(date.getMinutes(), 2)
    var s = pad(date.getSeconds(), 2)
    var ms = pad(date.getMilliseconds(), 3)
    return h + ':' + m + ':' + s + '.' + ms
  }

  var addLine = function (str) {
    var div = document.createElement('div')
    div.appendChild(document.createTextNode(str))
    document.body.appendChild(div)
  }

  global.log = function (type, fmt) {
    var args = Array.prototype.slice.call(arguments, 2)
    var msg = fmt.replace(/%./g, function () {
      return args.shift()
    })
    var str = '[' + time() + '] [' + type.toUpperCase() + '] ' + msg
    addLine(str)
    window.scrollTo(0, document.body.scrollHeight)
  }
})(this)
