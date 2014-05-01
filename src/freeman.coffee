'use strict'

dgram = require 'dgram'
ref = require 'ref'

ztstring = (packet, offset) ->
  str = ''
  while true
    char = packet.readUInt8 offset
    offset += 1

    break if char is 0

    str += String.fromCharCode char

  str

parseInfo = (packet) ->
  parsed = {}

  # Skip the prefix
  offset = 4

  parsed.header = String.fromCharCode packet.readUInt8 offset
  offset += 1

  if parsed.header is 'I'
    parsed.protocol = packet.readUInt8 offset
    offset += 1

    parsed.name = ztstring packet, offset
    offset += parsed.name.length + 1

    parsed.map = ztstring packet, offset
    offset += parsed.map.length + 1

    parsed.folder = ztstring packet, offset
    offset += parsed.folder.length + 1

    parsed.game = ztstring packet, offset
    offset += parsed.game.length + 1

    parsed.app_id = packet.readInt16LE offset
    offset += 2

    parsed.players = packet.readUInt8 offset
    offset += 1

    parsed.max_players = packet.readUInt8 offset
    offset += 1

    parsed.bots = packet.readUInt8 offset
    offset += 1

    parsed.server_type = String.fromCharCode packet.readUInt8 offset
    parsed.server_type = switch String.fromCharCode packet.readUInt8 offset
      when 'd' then 'dedicated'
      when 'l' then 'listen'
      when 'p' then 'hltv'
    offset += 1

    parsed.environment = switch String.fromCharCode packet.readUInt8 offset
      when 'l' then 'linux'
      when 'w' then 'windows'
      when 'm', 'o' then 'mac'
    offset += 1

    parsed.visibility = if packet.readUInt8(offset) is 0 then 'public' else 'private'
    offset += 1

    parsed.vac = switch packet.readUInt8(offset)
      when 0 then 'unsecured'
      when 1 then 'secured'
    offset += 1

    # Check if game is "The Ship"
    if [2400, 2401, 2402, 2412].indexOf(parsed.app_id) isnt -1
      parsed.mode = switch packet.readUInt8 offset
        when 0 then 'Hunt'
        when 1 then 'Elimination'
        when 2 then 'Duel'
        when 3 then 'Deathmatch'
        when 4 then 'VIP Team'
        when 5 then 'Team Elimination'
      offset += 1

      parsed.witnesses = packet.readUInt8 offset
      offset += 1

      parsed.duration = packet.readUInt8 offset
      offset += 1

    parsed.version = ztstring packet, offset
    offset += parsed.version.length + 1

    edf = packet.readUInt8 offset, true
    if edf?
      parsed.edf = edf
      offset += 1

      if !!(parsed.edf & 0x80)
        parsed.port = packet.readInt16LE offset
        offset += 2

      if !!(parsed.edf & 0x10)
        parsed.steam_id = packet.readUInt64LE offset
        offset += 8

      # This conditional passes for HLTVs?
      if !!(parsed.edf & 0x40)
        parsed.source_tv = {}

        parsed.source_tv.port = packet.readInt16LE offset
        offset += 2

        parsed.source_tv.name = ztstring packet, offset
        offset += parsed.source_tv.name.length + 1

      if !!(parsed.edf & 0x20)
        keywords = ztstring packet, offset
        parsed.keywords = keywords.split ','
        offset += keywords.length + 1

      if !!(parsed.edf & 0x01)
        parsed.app_id64 = packet.readUInt64LE offset
        offset += 8

  else if parsed.header is 'm'

    # This is the obsolete GoldSrc response. It's also one of the
    # two response packets from HLTV servers?
    parsed.address = ztstring packet, offset
    offset += parsed.address.length + 1

    parsed.name = ztstring packet, offset
    offset += parsed.name.length + 1

    parsed.map = ztstring packet, offset
    offset += parsed.map.length + 1

    parsed.folder = ztstring packet, offset
    offset += parsed.folder.length + 1

    parsed.game = ztstring packet, offset
    offset += parsed.game.length + 1

    parsed.players = packet.readUInt8 offset
    offset += 1

    parsed.server_type = switch String.fromCharCode packet.readUInt8 offset
      when 'd' then 'dedicated'
      when 'l' then 'listen'
      when 'p' then 'hltv'
    offset += 1

    parsed.environment = switch String.fromCharCode packet.readUInt8 offset
      when 'l' then 'linux'
      when 'w' then 'windows'
      when 'm', 'o' then 'mac'
    offset += 1

    parsed.visibility = switch packet.readUInt8(offset)
      when 0 then 'public'
      when 1 then 'private'
    offset += 1

    parsed.mod = switch packet.readUInt8 offset
      when 0 then 'hl'
      when 1 then 'mod'
    offset += 1

    if parsed.mod is 'mod'
      parsed.mod_info = {}

      parsed.mod_info.link = ztstring packet, offset
      offset += parsed.mod_info.link.length + 1

      parsed.mod_info.download_link = ztstring packet, offset
      offset += parsed.mod_info.download_link.length + 1

      # Skip null byte
      offset += 1

      parsed.mod_info.version = packet.readInt32LE offset
      offset += 2

      parsed.mod_info.size = packet.readInt32LE offset
      offset += 2

      parsed.mod_info.type = switch packet.readUInt8 offset
        when 0 then 'sp'
        when 1 then 'mp'
      offset += 1

      parsed.mod_info.dll = switch packet.readUInt8 offset
        when 0 then 'hl'
        when 1 then 'custom'
      offset += 1

    parsed.vac = switch packet.readUInt8(offset)
      when 0 then 'unsecured'
      when 1 then 'secured'
    offset += 1

    parsed.bots = packet.readUInt8 offset
    offset += 1

  parsed

info = (host, port, callback) ->
  send host, port,
    new Buffer('\x54Source Engine Query', 'binary'),
    parseInfo, callback

parseChallenge = (packet) ->
  parsed = {}

  # Skip the prefix
  offset = 4

  parsed.header = String.fromCharCode packet.readUInt8 offset
  offset += 1

  parsed.challenge = packet.readInt32LE offset

  parsed

challenge = (host, port, callback) ->
  send host, port,
    new Buffer('\x55\xFF\xFF\xFF\xFF', 'binary'),
    parseChallenge, callback

parsePlayer = (packet) ->
  parsed = {}

  # Skip the prefix
  offset = 4

  parsed.header = String.fromCharCode packet.readUInt8 offset
  offset += 1

  parsed.num_players = packet.readUInt8 offset
  offset += 1

  parsed.players = (for i in [0..parsed.num_players-1]
    player = {}

    player.index = packet.readUInt8 offset
    offset += 1

    player.name = ztstring packet, offset
    offset += player.name.length + 1

    player.score = packet.readInt32LE offset
    offset += 4

    player.duration = packet.readInt32LE offset
    offset += 4

    player
  )

  parsed

player = (host, port, challenge, callback) ->
  buffer = new Buffer 5
  buffer.writeUInt8 0x55, 0
  buffer.writeInt32LE challenge, 1

  send host, port, buffer, parsePlayer, callback

send = (host, port, data, parser, callback) ->
  udp = dgram.createSocket 'udp4'

  udp.on 'error', (err) ->
    throw err if err?

  udp.on 'message', (response) ->
    udp.close()
    callback parser response

  packet = Buffer.concat [
    new Buffer('\xFF\xFF\xFF\xFF', 'binary'),
    data,
    new Buffer('\x00', 'binary')
  ]

  udp.send packet, 0, packet.length, port, host

module.exports = info: info, challenge: challenge, player: player
