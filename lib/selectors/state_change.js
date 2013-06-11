
var log = require('debug')('heroku-events:parser:state-change')

module.exports = function(logParser){

  var stateRe = /State changed from (\w+) to (\w+)/

  function processLogEntry(model, data) {
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
      logParser.emit('app-discovered', app)
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
      logParser.emit('app-change', app)
    }
    if(data.currentState) {
      log('state', 'dyno-' + data.currentState, data.service, data.dyno)
      logParser.emit('dyno-' + data.currentState, app)
    }
  }

  return function stateChange(data) {
    var matches = stateRe.exec(data.message)
    if (matches) {
      data.previousState = matches[1]
      data.currentState = matches[2]
      processLogEntry(logParser._model, data)
    }
  }
}