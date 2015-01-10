(function(global) {
  'use strict';

  var Promise = global.Promise || require('es6-promise').Promise;

  var promisePool, loadProducer;
  if (typeof module !== 'undefined') {
    require('console-stamp')(console, '[HH:mm:ss.l]');
    promisePool = require('./');
    loadProducer = function(id) {
      var filename = './demos/' + id + '.js';
      return Promise.resolve(require(filename));
    };
  } else {
    promisePool = global.promisePool;
    loadProducer = function(id) {
      return Promise.resolve(global._producers[id]);
    };
  }

  var id = 0;
  var cnt = 0;

  var getPromise = function() {
    return new Promise(function(resolve, reject) {
      ++cnt;
      var delay = 500 + Math.floor(Math.random() * 500);
      console.info('Resolving %s#%d in %d ms', id, cnt, delay);
      setTimeout(function() {
        console.info('Resolving: %s#%d', id, cnt);
        resolve('result-' + id + '#' + cnt);
      }, delay);
    });
  };

  var onSuccess = function() {
    console.info('Succeeded: %s', id);
  };

  var onFailure = function(err) {
    console.error('Failed: %s: %s', id, err.message);
  };

  var onResolve = function(poolPromise, promise, result) {
    console.info('Got result: %s', result);
    console.info('New pool size is %d', poolPromise.pool.size());
  };

  var onReject = function(poolPromise, promise, error) {
    console.error('Got error: %s', error.message);
    console.info('New pool size is %d', poolPromise.pool.size());
  };

  var startDemo = function(newID) {
    id = newID;
    cnt = 0;
    console.info('Starting: %s', id);
    return id;
  };

  var opt = {
    onresolve: onResolve,
    onReject: onReject
  };

  var runDemo = function(id) {
    return loadProducer(id)
    .then(function(func) {
      return func(getPromise);
    })
    .then(function(gen) {
      return promisePool(gen, 3, opt);
    });
  };

  var supportsGenerators = function() {
    try {
      eval('function* g(){}');
      return true;
    } catch (e) {
      return false;
    }
  };

  var demos = ['function'];
  if (supportsGenerators()) {
    demos.push('generator');
  } else {
    console.warn('Not running generators demo due to lack of platform support');
  }

  demos.reduce(function(prev, curr) {
    return prev
    .then(function() { return curr; })
    .then(startDemo)
    .then(runDemo)
    .then(onSuccess, onFailure);
  }, Promise.resolve())
  .then(function() {
    console.info('Completed');
  }, function(err) {
    console.error('Unexpected error: %s', err.message);
  });
})(this);
