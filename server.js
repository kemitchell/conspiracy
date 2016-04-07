#!/usr/bin/env node
// Start an HTTP server that responds using the request handler function
// exported by handler.js.
require('http')
  .createServer(
    require('./handler')(
      process.env.DOMAIN,
      process.env.MAILGUN_API_KEY,
      ( '/' + process.env.POST_PATH ),
      // The default plain-text list of recipient people strings is
      // ./distribution_list.
      ( process.env.DISTRIBUTION_LIST ||
        require('path').join(process.cwd(), 'distribution_list') )) )
  .listen(( process.env.PORT || 8080 ), function() {
    process.stdout.write(
      ( 'Listening on port ' +
        this.address().port +
        '\n' )) })
