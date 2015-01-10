/* jshint esnext:true */

module.exports = function(getPromise) {
  return function*() {
    for (var i = 0; i < 10; ++i) {
      yield getPromise();
    }
  };
};
