# Promise Pool [![Build Status](https://travis-ci.org/timdp/es6-promise-pool.svg?branch=master)](https://travis-ci.org/timdp/es6-promise-pool)

Runs `Promise`s in a pool that limits their maximum concurrency.

## Motivation

An ES6 `Promise` is a great way of handling asynchronous operations. The
`Promise.all` function provides an easy interface to let a bunch of promises
settle concurrently.

However, it's an all-or-nothing approach: all your promises get created
simultaneously. If you have a ton of operations that you want to run with _some_
concurrency, `Promise.all` is no good.

Instead, you probably want to limit the maximum number of simultaneous
operations. That's where this module comes in. It provides an easy way of
waiting for any number of promises to settle, while imposing an upper bound on
the number of simultaneously executing promises.

The promises can be created in a just-in-time fashion. You essentially pass a
function that produces a new promise every time it is called. On modern
platforms, you can also use ES6 generator functions for this.

## Demo

### Node.js

```bash
npm install
node demo.js
```

Add `--harmony` for generator support if you have Node.js version 0.11.

### Web

See `demo.html`.

## Basic Usage

```js
// On the Web, just leave out this line.
var promisePool = require('es6-promise-pool');

// Can also be a generator. See below.
var promiseProducer = function() {
  // There's a 10% chance that we return null, indicating that there are no
  // more promises left to process.
  if (Math.floor(Math.random() * 10) === 0) {
    return null;
  }
  // If we didn't return null, we pass a new promise to the pool.
  return new Promise(function(resolve, reject) {
    setTimeout(resolve, 1000);
  });
};

// The number of promises to process simultaneously.
var concurrency = 3;

// See below.
var options = {};

// Create a pool promise and wait for it to settle.
promisePool(promiseProducer, concurrency, options)
.then(function() {
  console.log('All promises resolved');
}, function(error) {
  console.log('Some promise rejected: ' + error.message);
});
```

## Producers

The `promisePool` function takes a variety of `Promise`-producing objects. Let's
first assume we have this helper function that returns a promise for the given
`value` after `time` milliseconds:

```js
var delayValue = function(value, time) {
  return new Promise(function(resolve, reject) {
    console.log('Resolving ' + value + ' in ' + time + ' ms');
    setTimeout(function() {
      console.log('Resolving: ' + value);
      resolve(value);
    }, time);
  });
};
```

### Function

Now, let's use the helper function above to create five such promises, which
each resolve after a second. Because of the `concurrency` of `3`, the first
three promises will resolve after a second. Then, the remaining two will be
processed and resolve after another second.

```js
var count = 0;
var promiseProducer = function() {
  if (count < 5) {
    count++;
    return delayValue(count, 1000);
  } else {
    return null;
  }
};

promisePool(promiseProducer, 3)
.then(function() {
  console.log('Complete');
});
```

### Generator

We can achieve the same result with ECMAScript 6 generator functions.

```js
var promiseProducer = function*() {
  for (var count = 1; count <= 5; count++) {
    yield delayValue(count, 1000);
  }
};

promisePool(promiseProducer, 3)
.then(function() {
  console.log('Complete');
});
```

## Options

The `options` object lets us provide additional callback functions to listen for
promise progress.

When a promise settles, either `options.onresolve` or `options.onreject` will be
called. Both functions receive the pool promise (as returned by `promisePool`),
the promise that settled, and either the resolved value or the `Error` that
caused the rejection.

```js
var options = {};

options.onresolve = function(poolPromise, promise, result) {
  console.log('Resolved: ' + result);
};

options.onreject = function(poolPromise, promise, error) {
  console.log('Rejected: ' + error.message);
};

promisePool(promiseProducer, concurrency, options);
```

## Alternatives

- [Async.js](https://github.com/caolan/async)
- [Promise Pool](https://github.com/vilic/promise-pool)
- [qlimit](https://www.npmjs.com/package/qlimit)

## Author

[Tim De Pauw](https://tmdpw.eu/)

## License

Copyright &copy; 2015 Tim De Pauw

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
