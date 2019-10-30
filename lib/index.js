'use strict'

const assert = require('assert')
const EntryBuffer = require('./buffer')
const util = require('util')
const Transport = require('winston-transport')
const { format } = require('winston')
const stringifySafe = require('json-stringify-safe')
const debug = util.debuglog('winston:tcp')
const hostname = require('os').hostname()
const tls = require('tls')

module.exports = class DatadogTcpTransport extends Transport {
  constructor (options) {
    options = Object.assign({
      level: 'info',
      reconnectInterval: 1000,
      reconnectAttempts: 100,
      bufferLength: 10000,
      format: format.json()
    }, options)

    super(options)

    // store config
    this.options = options

    assert(this.options.host, 'Must define a host')
    assert(this.options.port, 'Must supply a port')
    assert(this.options.apiKey, 'Must supply a datadog api key')

    if (this.options.tags) {
      this.ddtags = Object.keys(this.options.tags).map(t => `${t}:${this.options.tags[t]}`).join(',')
    }

    // generic transport requirements
    this.name = '@jermeo/winston-datadog'

    // initiate entry buffer
    this.entryBuffer = new EntryBuffer(this.options.bufferLength)

    // internal flags
    this.connected = false
    this.connectionAttempts = 0 // cleared after each connection
    this.connectionCount = 0
    this.reconnect = false

    this.connect()
  }

  createConnection () {
    let socket
    if (this.options.cert) {
      socket = tls.connect(
        this.options.port,
        this.options.host,
        this.options
      )
    } else {
      socket = tls.connect({
        host: this.options.host,
        port: this.options.port
      })
    }
    socket.setEncoding('utf8')
    socket.setKeepAlive(true)
    return socket
  }

  connect () {
    if (!this.connected) {
      if (this.connectionAttempts >= this.options.reconnectAttempts) {
        throw Error('maximum reconnection attempts')
      }

      debug('connection attempt #%s', ++this.connectionAttempts)

      this.reconnect = true
      this.socket = this.createConnection()

      this.socket.on('error', err => debug('socket error %j', err))

      this.socket.on('connect', () => {
        this.connected = true
        this.connectionAttempts = 0

        debug('connection established #%s', ++this.connectionCount)

        // attempt to resend messages

        let bufferLength = this.entryBuffer.length()

        if (bufferLength) {
          debug('draining buffer of %s entries', bufferLength)

          this.entryBuffer.drain(this.write.bind(this))
        }
      })

      this.socket.on('close', () => {
        debug('connection closed')

        this.socket.destroy()
        this.connected = false

        if (this.reconnect) {
          debug('attempt to reconnect in %s', this.options.reconnectInterval)

          setTimeout(this.connect.bind(this), this.options.reconnectInterval)
        }
      })
    }
  }

  disconnect (callback) {
    this.connected = false
    this.reconnect = false
    this.socket.end(callback)
  }

  write (entry, callback) {
    entry.hostname = hostname
    entry.ddsource = this.name
    if (this.ddtags) {
      entry.ddtags = this.ddtags
    }

    if (this.connected) {
      debug('writing to socket %j', entry)

      this.socket.ref()
      this.socket.write(`${this.options.apiKey} ${this.safeToString(entry)}\n`, 'utf8', () => {
        this.socket.unref()
        if (typeof callback === 'function') {
          callback(null, true)
        }
      })
    } else {
      debug('writing to buffer %j', entry)

      this.entryBuffer.add(entry)

      if (typeof callback === 'function') {
        callback(null, true)
      }
    }
  }

  safeToString (json) {
    try {
      return JSON.stringify(json)
    } catch (ex) {
      return stringifySafe(json, null, null, () => {})
    }
  }

  log (info, callback) {
    setImmediate(() => {
      this.emit('logged', info)
    })

    this.write(info, callback)
  }
}
