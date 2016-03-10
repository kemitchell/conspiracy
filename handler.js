module.exports = handler

var path = require('path')
var Busboy = require('Busboy')
var fs = require('fs')
var https = require('https')
var querystring = require('querystring')

var DOMAIN = process.env.DOMAIN

function handler(request, response) {
  if (request.method === 'POST') {
    readPostBody(request, function(error, fields) {
      var subject = fields.subject
      var body = fields['plain-body']
      distribute(subject, body, function(error) {
        if (error) {
          response.statusCode = 500
          response.end() }
        else {
          response.statusCode = 200
          response.end() } }) }) }
  else {
    response.statusCode = 415
    response.end() } }

function readPostBody(request, callback) {
  var fields = { }
  new Busboy({ headers: request.headers })
  .on('field', function(field, value) {
    fields[field] = value })
  .on('finish', function() {
    callback(null, fields) })}

var DISTRIBUTION_LIST =
  ( process.env.DISTRIBUTION_LIST ||
    path.join(process.cwd(), 'distribution_list') )

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
          host: 'api.mailgun.com',
          path: ( '/' + DOMAIN + '/messages' ),
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(body) } }
      https
        .request(request)
        .on('response', function(response) {
          var status = response.statusCode
          if (status == 201) {
            callback() }
          else {
            callback(status) } })
        .end(body) } }) }
