module.exports = handler

var bole = require('bole')
var path = require('path')
var Busboy = require('busboy')
var fs = require('fs')
var https = require('https')
var querystring = require('querystring')
var uuid = require('uuid')

bole.output(
  [ { level: 'debug', stream: process.stdout },
    { level: 'info', stream: process.stdout },
    { level: 'warn', stream: process.stdout },
    { level: 'error', stream: process.stdout } ])

var NAME = require('./package.json').name
var VERSION = require('./package.json').version

var log = bole(NAME)

var DOMAIN = process.env.DOMAIN

var API_KEY = process.env.MAILGUN_API_KEY

var DISTRIBUTION_LIST =
  ( process.env.DISTRIBUTION_LIST ||
    path.join(process.cwd(), 'distribution_list') )

function handler(request, response) {
  request.log = log(uuid.v4())
  request.log.info(request)
  request.once('end', function() {
    request.log.info(
      { event: 'end',
        status: response.statusCode }) })
  var method = request.method
  if (method === 'POST') {
    readPostBody(request, function(error, fields) {
      if (error) {
        request.log.error(error)
        response.statusCode = 500
        response.end() }
      else {
        request.log.info(
          { event: 'parsed fields',
            fields: fields })
        var subject = fields.subject
        var body = fields['stripped-text']
        distribute(subject, body, function(error) {
          if (error) {
            request.log.error(error)
            response.statusCode = 500
            response.end() }
          else {
            request.log.info({ event: 'sent' })
            response.statusCode = 200
            response.end() } }) } }) }
  else if (method === 'GET') {
    response.end(( 'conspiracy ' + VERSION + '\n' )) }
  else {
    response.statusCode = 405
    response.end() } }

function readPostBody(request, callback) {
  var fields = { }
  var busboy
  try {
    busboy = new Busboy({ headers: request.headers }) }
  catch (error) {
    callback(error)
    return }
  busboy.on('field', function(field, value) {
    fields[field] = value })
  busboy.once('finish', function() {
    callback(null, fields) })
  request.pipe(busboy) }

function readDistributionList(callback) {
  fs.readFile(DISTRIBUTION_LIST, 'utf8', function(error, data) {
    if (error) {
      callback(error) }
    else {
      callback(null, data.toString().split('\n')) } }) }

function distribute(subject, body, callback) {
  readDistributionList(function(error, recipients) {
    if (error) {
      callback(error) }
    else {
      var body = querystring.stringify(
        { from: ( 'remailer@' + DOMAIN ),
          to: recipients.join(',') })
      var request =
        { method: 'POST',
          host: 'api.mailgun.net',
          path: ( '/v3/' + DOMAIN + '/messages' ),
          auth: ( 'api:' + API_KEY ),
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(body) } }
      https.request(request, function(response) {
        var status = response.statusCode
        if (status == 200) {
          callback() }
        else {
          callback(status) } })
        .end(body) } }) }
