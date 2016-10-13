module.exports = handlerGenerator

var Busboy = require('busboy')
var FormData = require('form-data')
var fs = require('fs')
var https = require('https')
var peoplestring = require('peoplestring-parse')
var pino = require('pino-http')
var url = require('url')

// Read this package's name and version from package.json.
var NAME = require('./package.json').name
var VERSION = require('./package.json').version

// Create a logger with the name of this package.
var log = pino()

function handlerGenerator (
  DOMAIN, API_KEY, POST_PATH, DISTRIBUTION_LIST
) {
  return function handler (request, response) {
    // Create a logger specific to this request, using a UUID.
    log(request, response)
    // Log the request itself.
    request.log.info(request)
    // Log the response to this request.
    request.once('end', function () {
      request.log.info({
        event: 'end',
        status: response.statusCode
      })
    })
    var method = request.method
    var parsedURL = url.parse(request.url)
    // If a POST to the hard-to-guess pathname for this server, treat it
    // as an incoming e-mail routed by Mailgun.
    if (parsedURL.pathname === POST_PATH) {
      if (method === 'POST') {
        readPostBody(request, function (error, fields) {
          if (error) {
            request.log.error(error)
            response.statusCode = 500
            response.end()
          } else {
            request.log.info({
              event: 'parsed fields',
              fields: fields
            })
            var from = peoplestring(fields.from)
            // Read the plain-text distribution list.
            readDistributionList(function (error, members) {
              if (error) {
                request.log.error(error)
                request.statusCode = 500
                request.end()
              } else {
                // If the sender is not on the distribution list, reject
                // the e-mail.
                if (members.indexOf(from.email) < 0) {
                  request.log.info({
                    event: 'reject',
                    from: from.email
                  })
                  response.statusCode = 406
                  response.end()
                } else {
                  var subject = fields.subject
                  // stripped-text is the plain-text body of the e-mail,
                  // less any signature that Mailgun's algorithm strips
                  // out.
                  var text = fields['stripped-text']
                  // Turn array of headers into a key-value map. If we
                  // ever need to use mail headers that can repeat, this
                  // will need to change.
                  var headers = JSON.parse(fields['message-headers'])
                    .reduce(function (headers, headerArray) {
                      headers[headerArray[0]] = headerArray[1]
                      return headers
                    }, {})
                  request.log.info({event: 'distribute'})
                  // Send the anonymized message to the distribution
                  // list.
                  distribute(
                  members, subject, text, headers,
                    function (error) {
                      if (error) {
                        request.log.error(error)
                        response.statusCode = 500
                        response.end()
                      } else {
                        request.log.info({event: 'sent'})
                        response.statusCode = 200
                        response.end()
                      }
                    }
                  )
                }
              }
            })
          }
        })
      } else {
        request.statusCode = 405
        request.end()
      }
    } else if (parsedURL.pathname === '/') {
      if (method === 'GET') {
        response.end(NAME + ' ' + VERSION + '\n')
      } else {
        response.statusCode = 405
        response.end()
      }
    } else {
      response.statusCode = 404
      response.end()
    }
  }

  function readPostBody (request, callback) {
    var fields = {}
    var busboy
    try {
      busboy = new Busboy({headers: request.headers})
    } catch (error) {
      callback(error)
      return
    }
    busboy.on('field', function (field, value) {
      fields[field] = value
    })
    busboy.once('finish', function () {
      callback(null, fields)
    })
    request.pipe(busboy)
  }

  function readDistributionList (callback) {
    fs.readFile(DISTRIBUTION_LIST, 'utf8', function (error, data) {
      if (error) {
        callback(error)
      } else {
        callback(null, data.toString().split('\n'))
      }
    })
  }

  function distribute (members, subject, text, headers, callback) {
    // POST data for the anonymized e-mail to Mailgun.
    var form = new FormData()
    var address = 'list@' + DOMAIN
    form.append('from', address)
    form.append('to', address)
    form.append('bcc', members.join(','))
    form.append('subject', subject)
    ;['In-Reply-To', 'References'].forEach(function (headerName) {
      if (headerName in headers) {
        form.append('h:' + headerName, headers[headerName])
      }
    })
    form.append('h:Reply-To', address)
    form.append('text', text)
    form.append('o:dkim', 'yes')
    form.append('o:tracking', 'no')
    form.append('o:tracking-clicks', 'no')
    form.append('o:tracking-opens', 'no')
    var options = {
      method: 'POST',
      host: 'api.mailgun.net',
      path: '/v3/' + DOMAIN + '/messages',
      auth: 'api:' + API_KEY,
      headers: form.getHeaders()
    }
    var request = https.request(options)
    request.once('response', function (response) {
      var status = response.statusCode
      if (status === 200) {
        callback()
      } else {
        var buffers = []
        response
          .on('data', function (buffer) {
            buffers.push(buffer)
          })
          .once('end', function () {
            var body = Buffer.concat(buffers).toString()
            var error = new Error(body)
            error.statusCode = status
            callback(error)
          })
      }
    })
    form.pipe(request)
  }
}
