# heroku-events

This module will mined heroku dyno related events out of a syslog file.

# Get Started

To get started with this module you need to enable log sink on your heroku instance, this will send all the logs from your
application to a syslog server, which will write this to a file.


To read the a syslog file and create a model representing the state of your application, while also consuming service related events.

```javascript
var fs = require('fs')
var split = require('split')
var LogParser = require('heroku-events')

// model for dynos hosts
var model = {}

var logParser = new LogParser(model)

logParser
    .on('newservice', function(service){
        console.log('newservice', service)
    })
    .on('statechangeservice', function(service){
        console.log('statechangeservice', service)
    })

var st = fs.createReadStream('/var/log/heroku.log')
st.pipe(split()).pipe(logParser)

```

The events which are currently fired are:

* newservice - Fired when a new log sink identifier is detected indicating a new app was discovered.
* statechangeservice - Fired when a heroku dyno state change is read.
* up - Fired when an up heroku dyno state change is read.
* down - Fired when a down heroku dyno state change is read.
* starting - Fired when a starting heroku dyno state change is read.
* crashed - Fired when a crashed heroku dyno state change is read.

# Future Work

Need to:

* rewrite the two core parts to simplify and clean up how the parsing and events work.
* come up with better names and structure for the change events.

