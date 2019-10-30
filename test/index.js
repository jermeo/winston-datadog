'use strict'

const tls = require('tls')
const DatadogTcpTransport = require('../lib/index')
const winston = require('winston')
const util = require('util')
const tap = require('tap')
const debug = util.debuglog('winston:tcp:test')
const fs = require('fs')

// generate certificates https://gist.github.com/pcan/e384fcad2a83e3ce20f9a4c33f4a13ae

const options = {
  key: fs.readFileSync('certs/server-key.pem'),
  cert: fs.readFileSync('certs/server-crt.pem'),
  ca: fs.readFileSync('certs/ca-crt.pem'),
  requestCert: true,
  rejectUnauthorized: true
}

const clientOptions = {
  ca: fs.readFileSync('certs/ca-crt.pem'),
  key: fs.readFileSync('certs/client1-key.pem'),
  cert: fs.readFileSync('certs/client1-crt.pem'),
  host: 'localhost',
  port: 1337,
  rejectUnauthorized: true,
  requestCert: true,
  apiKey: 'dd',
  reconnectInterval: 50,
  reconnectAttempts: 2
}

const server = tls.createServer(options, (socket) => {
  socket.on('error', err => debug('[error]: %s %j', err))
  socket.write('welcome!\n')
  socket.setEncoding('utf8')
  socket.pipe(socket)
})

// const localServer = server.listen(1337)

tap.test('setup', test => server.listen(1337, '127.0.0.1', 10, test.end))

tap.test('no host & port provided', assert => {
  assert.throws(_ => {
    let transport = new DatadogTcpTransport()
    assert.equal(transport, undefined)
  }, 'should fail')
  assert.end()
})

tap.test('connection management', assert => {
  assert.plan(2)

  let transport = new DatadogTcpTransport(
    clientOptions
  )

  setTimeout(_ => assert.ok(transport.connected, 'connected'), transport.options.reconnectInterval)

  setTimeout(_ => {
    transport.disconnect()

    assert.notOk(transport.connected, 'disconnected')
  }, transport.options.reconnectInterval * transport.options.reconnectAttempts)
})

tap.test('reconnect on failure', assert => {
  const clientOptionsBad = Object.assign({}, clientOptions)
  clientOptionsBad.port = 1330 // bad port first
  let transport = new DatadogTcpTransport(clientOptionsBad)

  setTimeout(_ => {
    // fix the port (to avoid thrown error)
    transport.options.port = 1337

    // test
    assert.equal(transport.connectionAttempts, transport.options.reconnectAttempts - 1, 'attempted to reconnect 4 times')
  }, transport.options.reconnectInterval * (transport.options.reconnectAttempts - 1))

  // disconnect after the last attempt
  setTimeout(_ => transport.disconnect(assert.end), transport.options.reconnectInterval * transport.options.reconnectAttempts)
})

tap.test('write entries', assert => {
  let transport = new DatadogTcpTransport(clientOptions)

  let logger = winston.createLogger({
    transports: [transport]
  })

  // dummy data
  let data = Array.apply(null, { length: 20 }).map(Math.random)
  data.forEach(msg => logger.log('info', msg, { yolo: 'foo' }))

  // delay a bit to allow socket connection
  setTimeout(_ => {
    assert.equal(transport.entryBuffer.length(), 0, 'buffer drained')
    transport.disconnect(assert.end)
  }, 50)
})

tap.test('buffer entries', assert => {
  const clientOptionsBad = Object.assign({}, clientOptions)
  clientOptionsBad.port = 1330 // bad port first
  let transport = new DatadogTcpTransport(clientOptionsBad)

  let logger = winston.createLogger({
    transports: [transport]
  })

  // dummy data
  let data = Array.apply(null, { length: 20 }).map(Math.random)
  data.forEach(msg => logger.log('info', msg))

  // test
  assert.equal(transport.entryBuffer.length(), 20, '20 entries in buffer')

  // fix the port before continue
  transport.options.port = 1337

  // delay a bit to allow socket connection
  setTimeout(_ => {
    assert.equal(transport.entryBuffer.length(), 0, 'buffer drained')
    transport.disconnect(assert.end)
  }, transport.options.reconnectInterval * transport.options.reconnectAttempts)
})

tap.test('buffer => drain', assert => {
  // setup transport
  const clientOptionsBad = Object.assign({}, clientOptions)
  clientOptionsBad.port = 1330 // bad port first
  let transport = new DatadogTcpTransport(clientOptions)

  // setup winston
  let logger = winston.createLogger({
    transports: [transport]
  })

  // dummy data
  let data = Array.apply(null, { length: 20 }).map(Math.random)
  data.forEach(msg => logger.log('info', msg))

  // set the correct port
  transport.options.port = 1337

  setTimeout(_ => {
    assert.equal(transport.entryBuffer.length(), 0, 'buffer drained')
    transport.disconnect(assert.end)
  }, transport.options.reconnectInterval * (transport.options.reconnectAttempts - 1))
})

// teardown
tap.test('teardown', assert => server.close(assert.end))
