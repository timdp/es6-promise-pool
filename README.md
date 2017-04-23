# ES6 Promise Pool

[![npm](https://img.shields.io/npm/v/es6-promise-pool.svg)](https://www.npmjs.com/package/es6-promise-pool) ![Bower](https://img.shields.io/bower/v/es6-promise-pool.svg) [![CircleCI Build](https://img.shields.io/circleci/project/github/timdp/es6-promise-pool/master.svg?label=circleci+build)](https://circleci.com/gh/timdp/es6-promise-pool) [![AppVeyor Build](https://img.shields.io/appveyor/ci/timdp/es6-promise-pool/master.svg?label=appveyor+build)](https://ci.appveyor.com/project/timdp/es6-promise-pool) [![Coverage Status](https://img.shields.io/coveralls/timdp/es6-promise-pool/master.svg)](https://coveralls.io/r/timdp/es6-promise-pool) [![JavaScript Standard Style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/)

Runs `Promise`s in a pool that limits their concurrency.

## Motivation

An ECMAScript 2015 `Promise` is a great way to handle asynchronous operations.
The `Promise.all` function provides an easy interface to let a bunch of promises
settle concurrently.

However, it's an all-or-nothing approach: all your promises get created
simultaneously. If you have a ton of operations that you want to run with _some_
concurrency, `Promise.all` is no good.

Instead, you probably want to limit the maximum number of simultaneous
operations. That's where this module comes in. It provides an easy way of
waiting for any number of promises to settle, while imposing an upper bound on
the number of simultaneously executing promises.

The promises can be created in a just-in-time fashion. You essentially pass a
function that produces a new promise every time it is called. Alternatively, you
can pass an ES2015 iterator, meaning you can also use generator functions.

## Compatibility

This module can be used both under **Node.js** and on the **Web**. If your
platform does not have a native `Promise` implementation, you can use a polyfill
such as [ES6-Promise](https://github.com/jakearchibald/es6-promise).

## Installation

```bash
npm install --save es6-promise-pool
```

```bash
bower install --save es6-promise-pool
```

```html
<script src="es6-promise-pool.js"></script>
```

## Usage

```js
// On the Web, leave out this line and use the script tag above instead.
var PromisePool = require('es6-promise-pool')

var promiseProducer = function () {
  // Your code goes here.
  // If there is work left to be done, return the next work item as a promise.
  // Otherwise, return null to indicate that all promises have been created.
  // Scroll down for an example.
}

// The number of promises to process simultaneously.
var concurrency = 3

// Create a pool.
var pool = new PromisePool(promiseProducer, concurrency)

// Start the pool.
var poolPromise = pool.start()

// Wait for the pool to settle.
poolPromise.then(function () {
  console.log('All promises fulfilled')
}, function (error) {
  console.log('Some promise rejected: ' + error.message)
})
```

## Producers

The `PromisePool` constructor takes a `Promise`-producing function as its first
argument. Let's first assume that we have this helper function that returns a
promise for the given `value` after `time` milliseconds:

```js
var delayValue = function (value, time) {
  return new Promise(function (resolve, reject) {
    console.log('Resolving ' + value + ' in ' + time + ' ms')
    setTimeout(function () {
      console.log('Resolving: ' + value)
      resolve(value)
    }, time)
  })
}
```

### Function

Now, let's use the helper function above to create five such promises, which
are each fulfilled after a second. Because of the `concurrency` of `3`, the
first three promises will be fulfilled after one second. Then, the remaining two
will be processed and fulfilled after another second.

```js
var count = 0
var promiseProducer = function () {
  if (count < 5) {
    count++
    return delayValue(count, 1000)
  } else {
    return null
  }
}

var pool = new PromisePool(promiseProducer, 3)

pool.start()
  .then(function () {
    console.log('Complete')
  })
```

### Iterator

We can achieve the same result with ECMAScript 2015 iterators. Since ES2015
generator functions return such an iterator, we can make the example above a lot
prettier:

```js
const generatePromises = function * () {
  for (let count = 1; count <= 5; count++) {
    yield delayValue(count, 1000)
  }
}

const promiseIterator = generatePromises()
const pool = new PromisePool(promiseIterator, 3)

pool.start()
  .then(() => console.log('Complete'))
```

It's also possible to pass a generator function directly. In that case, it will
be invoked with no arguments and the resulting iterator will be used. This
feature will however be removed in version 3.

## Events

We can also ask the promise pool to notify us when an individual promise is
fulfilled or rejected. The pool fires `fulfilled` and `rejected` events exactly
for this purpose.

```js
var pool = new PromisePool(promiseProducer, concurrency)

pool.addEventListener('fulfilled', function (event) {
  // The event contains:
  // - target:    the PromisePool itself
  // - data:
  //   - promise: the Promise that got fulfilled
  //   - result:  the result of that Promise
  console.log('Fulfilled: ' + event.data.result)
})

pool.addEventListener('rejected', function (event) {
  // The event contains:
  // - target:    the PromisePool itself
  // - data:
  //   - promise: the Promise that got rejected
  //   - error:   the Error for the rejection
  console.log('Rejected: ' + event.data.error.message)
})

pool.start()
  .then(function () {
    console.log('Complete')
  })
```

## Upgrading

Since version 2.0.0, this module does not depend on
[ES6-Promise](https://github.com/jakearchibald/es6-promise) anymore. If you
want to support platforms without a native `Promise` implementation, please
load a polyfill first.

If you prefer not to polyfill the global `Promise` for whatever reason, you can
also pass your `Promise` class as an option instead:

```js
var ES6Promise = require('es6-promise').Promise // or another implementation
var pool = new PromisePool(promiseProducer, concurrency, {promise: ES6Promise})
```

## Alternatives

- Vilic Vane's [Promise Pool](https://github.com/vilic/promise-pool) offers a
  similar API.
- [Bluebird](https://github.com/petkaantonov/bluebird) includes
  [`Promise.map()`](http://bluebirdjs.com/docs/api/promise.map.html),
  which takes a `concurrency` option.
- Similarly, [λ (a.k.a. contra)](https://github.com/bevacqua/contra) has
  [`λ.concurrent()`](https://github.com/bevacqua/contra#λconcurrenttasks-cap-done)
  with the optional `cap` parameter.
- With [Q](https://github.com/kriskowal/q), you can use
  [qlimit](https://github.com/suprememoocow/qlimit).
- [Async](https://github.com/caolan/async) does not use promises, but offers a
  [`queue()`](https://github.com/caolan/async#queueworker-concurrency) function.

## Author

[Tim De Pauw](https://tmdpw.eu/)

## License

MIT
