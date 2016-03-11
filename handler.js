module.exports = handler

var bole = require('bole')
var path = require('path')
var Busboy = require('busboy')
var fs = require('fs')
var https = require('https')
var uuid = require('uuid')
var FormData = require('form-data')
var peoplestring = require('peoplestring-parse')

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
        var from = peoplestring(fields.from)
        readDistributionList(function(error, members) {
          if (error) {
            request.log.error(error)
            request.statusCode = 500
            request.end() }
          else {
            if (members.indexOf(from.email) < 0) {
              request.log.info(
                { event: 'reject',
                  from: from.email })
              response.statusCode = 406
              response.end() }
            else {
              distribute(members, subject, body, function(error) {
                if (error) {
                  request.log.error(error)
                  response.statusCode = 500
                  response.end() }
                else {
                  request.log.info({ event: 'sent' })
                  response.statusCode = 200
                  response.end() } }) } } }) } }) }
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

function distribute(members, subject, text, callback) {
  var form = new FormData()
  form.append('from', ( 'list@' + DOMAIN ))
  form.append('bcc', members.join(','))
  form.append('subject', subject)
  form.append('text', text)
  form.append('o:dkim', 'yes')
  form.append('o:tracking', 'no')
  form.append('o:tracking-clicks', 'no')
  form.append('o:tracking-opens', 'no')
  var options =
    { method: 'POST',
      host: 'api.mailgun.net',
      path: ( '/v3/' + DOMAIN + '/messages' ),
      auth: ( 'api:' + API_KEY ),
      headers: form.getHeaders() }
  var request = https.request(options)
  request.once('response', function(response) {
    var status = response.statusCode
    if (status == 200) {
      callback() }
    else {
      callback(status) } })
  form.pipe(request) }
