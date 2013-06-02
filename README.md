# heroku-events

This module will mined heroku dyno related events out of a syslog file.

# Get Started

To get started with this module you need to enable log sink on your heroku instance, this will send all the logs from your
application to a syslog server, which will write this to a file.


To read the a syslog file and create a model representing the state of your application, while also consuming service related events.

```javascript
var fs = require('fs')
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
st.pipe(logParser)

```

# Future Work

Need to:

* rewrite the two core parts to simplify and clean up how the parsing and events work.
* come up with better names and structure for the change events.

