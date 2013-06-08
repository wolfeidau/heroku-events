var stream = require('stream')
var util = require('util')
var log = require('debug')('heroku-events:parser')

var logRe = /([a-zA-z]+\s[0-9]+\s[0-9]+:[0-9]+:[0-9]+)\s([0-9abcdef\.\-]+)\s([a-z]+)\[([\w\.]+)\]\s(.*)/
var stateRe = /State changed from (\w+) to (\w+)/
var sourceRe = /source=([\w\.\-]+)/
var hostRe = /at=\w+\smethod=\w+\spath=[\w\/._\-]+\shost=([\w.\-]+)\sfwd=([\d\\."]+)\sdyno=([\w\.\d]+).*/

function processStateChange(model, data) {
  /*
   statechange { date: 'May 25 05:02:32',
   service: 'd.ae122222-1b12-1a1a-1111-12a23452311',
   component: 'heroku',
   dyno: 'web.2',
   message: 'State changed from starting to up',
   previousState: 'starting',
   currentState: 'up' }
   */

  if (!model.hasOwnProperty(data.service)) {
    log('state', 'add', data.service)
    // add service
    model[data.service] = {}
    model[data.service].dyno = {}
    model[data.service].dyno[data.dyno] = {state: data.currentState}
    model[data.service].updated = data.date
    this.emit('app-discovered', model[data.service])
  } else {
    log('state', 'update', data.service)
    // update service
    model[data.service].dyno[data.dyno] = {state: data.currentState}
    model[data.service].updated = data.date
    this.emit('app-change', model[data.service])
  }
  if(data.currentState) {
    log('state', 'dyno-' + data.currentState)
    this.emit('dyno-' + data.currentState, model[data.service])
  }
}

function processSourceEvent(model, data) {
  /*
   { date: 'May 25 07:16:51',
   service: 'd.ae122222-1b12-1a1a-1111-12a23452311',
   component: 'heroku',
   dyno: 'worker.2',
   message: 'source=heroku.1111111.worker.2.11111111-1111-1111-1111-c9c7056b0867 measure=load_avg_1m val=0.66',
   source: 'heroku.1111111.worker.2.11111111-1111-1111-1111-c9c7056b0867' }
   */
  if (!model.hasOwnProperty(data.service)) {
    // add service
    model[data.service] = {}
    model[data.service].dyno = {}
    model[data.service].dyno[data.dyno] = {source: data.source}
    model[data.service].updated = data.date
    this.emit('newservice', model[data.service])
  } else {
    // update service
    if (model[data.service].dyno[data.dyno]) {
      model[data.service].dyno[data.dyno].source = data.source
      this.emit('newsource', model[data.service])
    } else {
      model[data.service].dyno[data.dyno] = {source: data.source}
      this.emit('updatesource', model[data.service])
    }
    model[data.service].updated = data.date
    this.emit('app-change', model[data.service])
  }

  //console.log('source', model[data.service])
}

function processHostEvent(model, data) {

  /*
   { date: 'May 25 13:02:58',
   service: 'd.ae122222-1b12-1a1a-1111-12a23452311',
   component: 'heroku',
   dyno: 'router',
   message: 'at=info method=POST path=/rest/XXX/camera/XXX/snapshot host=host.example.com fwd=1.1.1.1 dyno=web.1 connect=4ms service=1498ms status=200 bytes=5',
   host: 'host.example.com',
   fwd: '1.1.1.1' }
   */
  if (!model.hasOwnProperty(data.service)) {
    // add service
    model[data.service] = {}
    model[data.service].dyno = {}
    model[data.service].dyno[data.dyno] = {host: data.host, fwd: data.fwd}
    model[data.service].updated = data.date
    this.emit('newservice', model[data.service])
  } else {
    // update service
    if (model[data.service].dyno[data.dyno]) {
      model[data.service].dyno[data.dyno].source = data.host
      model[data.service].dyno[data.dyno].fwd = data.fwd
    } else {
      model[data.service].dyno[data.dyno] = {host: data.host, fwd: data.fwd}
    }
    model[data.service].updated = data.date
    this.emit('app-change', model[data.service])
  }
}

var LogParser = function (model) {
  stream.Transform.call(this, {objectMode: true})
  this._counter = 0
  this._counterMatched = 0
  this._logstats = false

  this.on('_state-change', processStateChange.bind(this, model))
  this.on('_source', processSourceEvent.bind(this, model))
  this.on('_host', processHostEvent.bind(this, model))
}

util.inherits(LogParser, stream.Transform)

// Just matches the main log statements at the moment
LogParser.prototype._transform = function (chunk, encoding, callback) {

  if (chunk) {
    var matches = logRe.exec(chunk)

    this._stats(matches)

    // is this a log entry
    if (matches) {

      var data = {date: matches[1], service: matches[2], component: matches[3], dyno: matches[4], message: matches[5]}

      // build a list of match functions to run against the log message
      var flist = Object.keys(this._matchers)

      // run through these functions till one returns true or we finish
      for (var i = 0; i < flist.length; i++) {
        if (this._matchers[flist[i]].apply(this, [data])) {
          // push the log entry down the line
          //this.push(data)
          break
        }
      }
    }
  }
  return callback()
}


LogParser.prototype._stats = function (matches) {
  this._counter++

  if (matches)
    this._counterMatched++

  if (this._logstats && this._counter % 10000 === 0) {
    console.log('stats count:', this._counter, 'matched:', this._counterMatched)
  }
}

LogParser.prototype._matchers = {
  statechange: function (data) {
    var matches = stateRe.exec(data.message)

    if (matches) {
      data.previousState = matches[1]
      data.currentState = matches[2]
      this.emit('_state-change', data)
      return true
    }
  },
  source: function (data) {
    var matches = sourceRe.exec(data.message)

    if (matches) {
      data.source = matches[1]
      this.emit('_source', data)
      return true
    }
  },
  host: function (data) {
    var matches = hostRe.exec(data.message)
    if (matches) {
      data.host = matches[1]
      data.fwd = matches[2]
      data.dyno = matches[3] // clober the dyno previously set
      this.emit('_host', data)
      return true
    }

  }
}

module.exports = LogParser