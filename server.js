#!/usr/bin/env node
require('http')
  .createServer(
    require('./handler')(
      process.env.DOMAIN,
      process.env.MAILGUN_API_KEY,
      ( '/' + process.env.POST_PATH ),
      ( process.env.DISTRIBUTION_LIST ||
        require('path').join(process.cwd(), 'distribution_list') )) )
  .listen(( process.env.PORT || 8080 ), function() {
    process.stdout.write(
      ( 'Listening on port ' +
        this.address().port +
        '\n' )) })
