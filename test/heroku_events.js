var fs = require('fs')
var split = require('split')
var LogParser = require('../index.js')
var log = require('debug')('test')

var expect = require('chai').expect

describe('Parse a log file', function () {

  // model for heroku dynos
  var model = {}

  it('should produce a model from sample log file.', function (done) {
    var logParser = new LogParser(model)

    fs.createReadStream('./test/state.log')
      .on('end',function () {
        log('model', model)
        expect(model['d.ae122222-1b12-1a1a-1111-12a23452311']).to.have.property('dyno')
        expect(model['d.ae122222-1b12-1a1a-1111-12a23452311'].updated).to.equal('May 25 13:02:58')
        done()
      }).pipe(split()).pipe(logParser)

  })

  it('should fire up events when dynos start', function (done) {

    var logParser = new LogParser(model)
    var starts = [], stops  = [];

    logParser.on('dyno-up', function(data){
      starts.push(data)
    })

    logParser.on('dyno-down', function(data){
      stops.push(data)
    })

    fs.createReadStream('./test/state.log')
      .on('end',function () {
        expect(starts).to.exist
        expect(starts[1].dyno['web.1']).to.exist
        expect(starts.length).to.equal(2)
        expect(stops[1].dyno['web.1']).to.exist
        expect(stops.length).to.equal(2)
        done()
      }).pipe(split()).pipe(logParser)


  })

})
