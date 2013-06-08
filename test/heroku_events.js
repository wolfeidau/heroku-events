var fs = require('fs')
var split = require('split')
var fixtures = require('./fixtures.js')
var LogParser = require('../index.js')
var log = require('debug')('test')

var expect = require('chai').expect

describe('Parse a log file', function () {


  it('should produce a model from sample log file.', function (done) {
    // model for heroku dynos
    var model = {}
    var logParser = new LogParser(model)
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
    var starts = [], stops  = [];

    logParser.on('dyno-up', function(app){
      log('app', 'start', app)
      starts.push(app)
    })

    logParser.on('dyno-down', function(app){
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
