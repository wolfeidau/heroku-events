var fs = require('fs')
var LogParser = require('../lib/heroku_log_parser.js')
var log = require('debug')('test')

var expect = require('chai').expect

describe('Parse a log file', function () {

  // model for heroku dynos
  var model = {}

  var logParser = new LogParser(model)

  it('should produce a model from sample log file.', function (done) {

    fs.createReadStream('./test/state.log')
      .on('end',function () {
        log('model', model)
        expect(model['d.ae122222-1b12-1a1a-1111-12a23452311']).to.have.property('dyno')
        expect(model['d.ae122222-1b12-1a1a-1111-12a23452311'].updated).to.equal('May 25 05:02:28')
        done()
      }).pipe(logParser)

  })

})
