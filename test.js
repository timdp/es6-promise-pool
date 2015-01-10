require('console-stamp')(console, '[HH:mm:ss.l]');

var promisePool = require('./');

var id = 0;
var cnt = 0;

var getPromise = function() {
  return new Promise(function(resolve, reject) {
    ++cnt;
    var delay = 500 + Math.floor(Math.random() * 500);
    console.info('resolving %s#%d in %d ms', id, cnt, delay);
    setTimeout(function() {
      console.info('resolving: %s#%d', id, cnt);
      resolve('result ' + id + '#' + cnt);
    }, delay);
  });
};

var onSuccess = function() {
  console.info('succeeded: %s', id);
};

var onFailure = function(err) {
  console.error('failed: %s: %s', id, err.message);
};

var onProgress = function(poolPromise, promise, result) {
  console.info('got result: %s', result);
  console.info('new pool size is %d', poolPromise.pool.size());
};

var onError = function(poolPromise, promise, error) {
  console.error('got error: %s', error.message);
  console.info('new pool size is %d', poolPromise.pool.size());
};

var startTest = function(newID) {
  id = newID;
  cnt = 0;
  console.info('starting: %s', id);
  return id;
};

var opt = {
  onprogress: onProgress,
  onerror: onError
};

var runTest = function(id) {
  var gen = require('./test/' + id + '.js')(getPromise);
  return promisePool(gen, 3, opt);
};

['generator', 'function'].reduce(function(prev, curr) {
  return prev
  .then(function() { return curr; })
  .then(startTest)
  .then(runTest)
  .then(onSuccess, onFailure);
}, Promise.resolve())
.then(function() {
  console.info('completed');
}, function(err) {
  console.error('unexpected error: %s', err.message);
});
