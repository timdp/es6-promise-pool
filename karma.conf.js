module.exports = function (config) {
  config.set({
    frameworks: [
      'mocha',
      'chai'
    ],
    files: [
      'vendor/chai-as-promised.browser.js',
      'node_modules/dirty-chai/lib/dirty-chai.js',
      'node_modules/bluebird/js/browser/bluebird.core.js',
      'node_modules/es6-promise/dist/es6-promise.js',
      'es6-promise-pool.js',
      'test.js'
    ],
    reporters: [
      'spec',
      'coverage'
    ],
    preprocessors: {
      'es6-promise-pool.js': ['coverage']
    },
    coverageReporter: {
      type: 'text'
    },
    browsers: [
      'PhantomJS'
    ],
    singleRun: true
  })
}
