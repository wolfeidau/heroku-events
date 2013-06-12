var fs = require('fs')
var split = require('split')
var fixtures = require('./fixtures.js')
var heroku_events = require('../index.js')
var LogParser = heroku_events.LogParser
var log = require('debug')('test')

var expect = require('chai').expect

describe('LogParser', function () {

  describe('Parse a log file', function () {

    it('should produce a model from sample log file.', function (done) {
      // model for heroku dynos
      var model = {}
      var logParser = new LogParser(model)
      logParser.register(heroku_events.selectors.statChange)
      fs.createReadStream('./test/state.log')
        .on('end',function () {
          log('model', model.apps[0].dynos)
          expect(model.sinkId).equal(fixtures.stateLogModel.sinkId)
          expect(model.updated).equal(fixtures.stateLogModel.updated)
          expect(model.dynos).equal(fixtures.stateLogModel.dynos)
          done()
        }).pipe(split()).pipe(logParser)

    })

    it('should fire up events when dynos start', function (done) {

      // model for heroku dynos
      var model = {}
      var logParser = new LogParser(model)
      logParser.register(heroku_events.selectors.statChange)
      var starts = [], stops = [];

      logParser.on('dyno-up', function (app) {
        log('app', 'start', app)
        starts.push(app)
      })

      logParser.on('dyno-down', function (app) {
        log('app', 'stop', app)
        stops.push(app)
      })

      fs.createReadStream('./test/state.log')
        .on('end',function () {
          expect(starts).to.exist
          expect(starts.length).to.equal(2)
          expect(stops.length).to.equal(2)
          done()
        }).pipe(split()).pipe(logParser)


    })
  })

  describe('plugins', function () {

    it('should only check plugins till the first one matches', function (done) {

      var model = {}
      var logParser = new LogParser(model)
      logParser.register(heroku_events.selectors.statChange)

      var counter = 0

      function logware(logParser) {
        return function logwareEvent(data) {
          counter++
        }
      }

      logParser.register(logware)

      fs.createReadStream('./test/state.log')
        .on('end',function () {
          expect(counter).to.equal(4)
          done()
        }).pipe(split()).pipe(logParser)


    })

    it('should enable plugins for raising discovery events.', function (done) {

      var model = {}
      var logParser = new LogParser(model)

      var counter = 0

      function logware(logParser) {
        return function logwareEvent(data) {
          counter++
        }
      }

      logParser.register(logware)

      fs.createReadStream('./test/state.log')
        .on('end',function () {
          expect(counter).to.equal(11)
          done()
        }).pipe(split()).pipe(logParser)

    })

  })
})
