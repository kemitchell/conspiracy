#!/usr/bin/env node
require('http')
  .createServer(require('./handler'))
  .listen(( process.env.PORT || 8080 ), function() {
    process.stdout.write(
      ( 'Listening on port ' +
        this.address().port +
        '\n' )) })
