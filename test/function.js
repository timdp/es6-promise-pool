module.exports = function(getPromise) {
  var i = 0;
  return function() {
    return (i++ < 10) ? getPromise() : null;
  };
};
