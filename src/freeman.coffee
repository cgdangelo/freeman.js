'use strict'

dgram    = require 'dgram'
Parser   = require('binary-parser').Parser
ref      = require 'ref'
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

info = (host, port, cb) ->
  the_ship = new Parser().
    endianess('little').
    uint8('mode').
    uint8('witnesses').
    uint8('duration')

  source_tv = new Parser().
    int16le('port').
    ztstring('name')

  parser = new Parser().
    endianess('little').
    uint32('prefix').
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
    uint8('vac').
    choice('the_ship',
      tag: ->
        1 if [2400, 2401, 2402, 2412].indexOf(@.game_id) isnt -1
      choices: 1: the_ship
      defaultChoice: ->
    ).
    ztstring('game_version').
    uint8('edf').
    choice('port',
      tag: -> 1 if !!(@.edf & 0x80)
      choices: 1: 'int16le'
      defaultChoice: ->
    ).
    choice('steam_id',
      tag: -> 1 if !!(@.edf & 0x10)
      choices: 1: new Parser().buffer null, length: 8
      defaultChoice: ->
    ).
    choice('source_tv',
      tag: -> 1 if !!(@.edf & 0x40)
      choices: 1: source_tv
      defaultChoice: ->
    ).
    choice('keywords',
      tag: -> 1 if !!(@.edf & 0x20)
      choices: 1: new Parser().ztstring()
      defaultChoice: ->
    ).
    choice('game_id64',
      tag: -> 1 if !! @.edf & 0x01
      choices: 1: new Parser().buffer null, length: 8
      defaultChoice: ->
    )

  sendPacket host, port, buildPacket('A2S_INFO'), (msg, rinfo) ->
    unpacked = parser.parse msg

    if unpacked.steam_id? and Buffer.isBuffer unpacked.steam_id
      unpacked.steam_id = unpacked.steam_id.readUInt64LE()

    if unpacked.game_id64? and Buffer.isBuffer unpacked.game_id64
      unpacked.game_id64 = unpacked.game_id64.readUInt64LE()

    cb unpacked

module.exports = info: info
