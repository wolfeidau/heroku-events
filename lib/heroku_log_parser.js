var stream = require('stream')
var util = require('util')
var log = require('debug')('heroku-events:parser')

var logRe = /([a-zA-z]+\s+[0-9]+\s[0-9]+:[0-9]+:[0-9]+)\s([0-9abcdef\.\-]+)\s([a-z]+)\[([\w\.]+)\]\s(.*)/

exports.LogParser = LogParser = function (model) {
  stream.Transform.call(this, {objectMode: true})
  this._counter = 0
  this._counterMatched = 0
  this._logstats = false
  this._model = model
  if(!this._model.apps) this._model.apps = []

  this._listeners = []
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
//      this._listeners.forEach(function(listener){
      for(var i = 0; i < this._listeners.length; i++ ){
        var listener = this._listeners[i]
        log('notify', 'listener', listener.name)
        if (listener(data)) break
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
    log('stats count', this._counter, 'matched', this._counterMatched)
  }
}

LogParser.prototype.register = function(selector){
  var listener = selector(this)
  log('register', listener.name)
  this._listeners.push(listener)
}

exports.selectors = {
  statChange : require('./selectors/state_change.js')
}
