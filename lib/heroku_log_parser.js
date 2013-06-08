var stream = require('stream')
var util = require('util')
var log = require('debug')('heroku-events:parser')

var logRe = /([a-zA-z]+\s[0-9]+\s[0-9]+:[0-9]+:[0-9]+)\s([0-9abcdef\.\-]+)\s([a-z]+)\[([\w\.]+)\]\s(.*)/
var stateRe = /State changed from (\w+) to (\w+)/

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

  var appSearch = model.apps.filter(function(appEntry){return appEntry.sinkId === data.service})

  if (!appSearch.length) {
    log('state', 'add', data.service)
    // add service
    var app = {
      sinkId: data.service,
      dynos: [
        {name: data.dyno, state: data.currentState, updated: data.date}
      ],
      updated: data.date
    }
    model.apps.push(app)
    log('state', 'app-discovered', app.sinkId)
    this.emit('app-discovered', app)
  } else {

    log('state', 'update', data.service)

    var app = appSearch[0]
    app.updated = data.date

    // update service
    var dynoSearch = app.dynos.filter(function (dynoEntry) {
      log('dyno', dynoEntry.name, data.dyno)
      return dynoEntry.name === data.dyno
    })

    log('dyno', dynoSearch)

    if (!dynoSearch.length) {
      if (!app.dynos) app.dynos = []
      app.dynos.push({name: data.dyno, state: data.currentState, updated: data.date})
    } else {
      // update the dyno
      dynoSearch[0].state =  data.currentState
      dynoSearch[0].updated = data.date
    }
    log('state', 'app-change', app.dynos)
    this.emit('app-change', app)
  }
  if(data.currentState) {
    log('state', 'dyno-' + data.currentState, data.service, data.dyno)
    this.emit('dyno-' + data.currentState, app)
  }
}

var LogParser = function (model) {
  stream.Transform.call(this, {objectMode: true})
  this._counter = 0
  this._counterMatched = 0
  this._logstats = false
  this._model = model
  if(!this._model.apps) this._model.apps = []

  this.on('_state-change', processStateChange.bind(this, this._model))
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
      this._stateChangeMatcher(data)
    }
  }
  return callback()
}


LogParser.prototype._stats = function (matches) {
  this._counter++

  if (matches)
    this._counterMatched++

  if (this._logstats && this._counter % 10000 === 0) {
    log('stats count', this._counter, 'matched', this._counterMatched)
  }
}

LogParser.prototype._stateChangeMatcher = function (data) {
    var matches = stateRe.exec(data.message)
    if (matches) {
      data.previousState = matches[1]
      data.currentState = matches[2]
      this.emit('_state-change', data)
    }
}

module.exports = LogParser