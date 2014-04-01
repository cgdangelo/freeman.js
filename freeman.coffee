'use strict'

dgram    = require 'dgram'
Parser   = require('binary-parser').Parser
udp      = null

PACKETS =
  PREFIX: '\xFF\xFF\xFF\xFF'
  REQUESTS:
    A2S_INFO:
      HEADER: '\x54'
      PAYLOAD: 'Source Engine Query'

Parser::ztstring = (name, options = {}) ->
  options.zeroTerminated = true
  @.string name, options

createUDP = (cb) =>
  udp = dgram.createSocket 'udp4'

  udp.on 'error', (err) ->
    udp.close()
    throw err

  udp.on 'message', cb

  udp

buildPacket = (requestType) ->
  Buffer.concat [
    new Buffer(PACKETS.PREFIX, 'binary'),
    new Buffer(PACKETS.REQUESTS[requestType].HEADER, 'binary'),
    new Buffer(PACKETS.REQUESTS[requestType].PAYLOAD, 'binary'),
    new Buffer('\x00', 'binary')
  ]

sendPacket = (host, port, packet, cb) ->
  udp ?= createUDP cb
  udp.send packet, 0, packet.length, port, host, (err, data) ->
    throw err if err?

info = (host, port) ->
  parser = new Parser().
    endianess('little').
    array('prefix', type: 'uint8', length: 4).
    uint8('header').
    uint8('protocol_version').
    ztstring('name').
    ztstring('map').
    ztstring('folder').
    ztstring('game').
    int16('game_id').
    uint8('players').
    uint8('max_players').
    uint8('bots').
    uint8('server_type').
    uint8('environment').
    uint8('visibility').
    uint8('vac')

  sendPacket host, port, buildPacket('A2S_INFO'), (msg, rinfo) ->
    console.dir parser.parse msg
