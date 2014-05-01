(function() {
  'use strict';
  var challenge, dgram, info, parseChallenge, parseInfo, ref, send, udp, ztstring;

  dgram = require('dgram');

  ref = require('ref');

  udp = dgram.createSocket('udp4');

  ztstring = function(packet, offset) {
    var char, str;
    str = '';
    while (true) {
      char = packet.readUInt8(offset);
      offset += 1;
      if (char === 0) {
        break;
      }
      str += String.fromCharCode(char);
    }
    return str;
  };

  parseInfo = function(packet) {
    var edf, keywords, offset, parsed;
    parsed = {};
    offset = 4;
    parsed.header = String.fromCharCode(packet.readUInt8(offset));
    offset += 1;
    if (parsed.header === 'I') {
      parsed.protocol = packet.readUInt8(offset);
      offset += 1;
      parsed.name = ztstring(packet, offset);
      offset += parsed.name.length + 1;
      parsed.map = ztstring(packet, offset);
      offset += parsed.map.length + 1;
      parsed.folder = ztstring(packet, offset);
      offset += parsed.folder.length + 1;
      parsed.game = ztstring(packet, offset);
      offset += parsed.game.length + 1;
      parsed.app_id = packet.readInt16LE(offset);
      offset += 2;
      parsed.players = packet.readUInt8(offset);
      offset += 1;
      parsed.max_players = packet.readUInt8(offset);
      offset += 1;
      parsed.bots = packet.readUInt8(offset);
      offset += 1;
      parsed.server_type = String.fromCharCode(packet.readUInt8(offset));
      parsed.server_type = (function() {
        switch (String.fromCharCode(packet.readUInt8(offset))) {
          case 'd':
            return 'dedicated';
          case 'l':
            return 'listen';
          case 'p':
            return 'hltv';
        }
      })();
      offset += 1;
      parsed.environment = (function() {
        switch (String.fromCharCode(packet.readUInt8(offset))) {
          case 'l':
            return 'linux';
          case 'w':
            return 'windows';
          case 'm':
          case 'o':
            return 'mac';
        }
      })();
      offset += 1;
      parsed.visibility = packet.readUInt8(offset) === 0 ? 'public' : 'private';
      offset += 1;
      parsed.vac = (function() {
        switch (packet.readUInt8(offset)) {
          case 0:
            return 'unsecured';
          case 1:
            return 'secured';
        }
      })();
      offset += 1;
      if ([2400, 2401, 2402, 2412].indexOf(parsed.app_id) !== -1) {
        parsed.mode = (function() {
          switch (packet.readUInt8(offset)) {
            case 0:
              return 'Hunt';
            case 1:
              return 'Elimination';
            case 2:
              return 'Duel';
            case 3:
              return 'Deathmatch';
            case 4:
              return 'VIP Team';
            case 5:
              return 'Team Elimination';
          }
        })();
        offset += 1;
        parsed.witnesses = packet.readUInt8(offset);
        offset += 1;
        parsed.duration = packet.readUInt8(offset);
        offset += 1;
      }
      parsed.version = ztstring(packet, offset);
      offset += parsed.version.length + 1;
      edf = packet.readUInt8(offset, true);
      if (edf != null) {
        parsed.edf = edf;
        offset += 1;
        if (!!(parsed.edf & 0x80)) {
          parsed.port = packet.readInt16LE(offset);
          offset += 2;
        }
        if (!!(parsed.edf & 0x10)) {
          parsed.steam_id = packet.readUInt64LE(offset);
          offset += 8;
        }
        if (!!(parsed.edf & 0x40)) {
          parsed.source_tv = {};
          parsed.source_tv.port = packet.readInt16LE(offset);
          offset += 2;
          parsed.source_tv.name = ztstring(packet, offset);
          offset += parsed.source_tv.name.length + 1;
        }
        if (!!(parsed.edf & 0x20)) {
          keywords = ztstring(packet, offset);
          parsed.keywords = keywords.split(',');
          offset += keywords.length + 1;
        }
        if (!!(parsed.edf & 0x01)) {
          parsed.app_id64 = packet.readUInt64LE(offset);
          offset += 8;
        }
      }
    } else if (parsed.header === 'm') {
      parsed.address = ztstring(packet, offset);
      offset += parsed.address.length + 1;
      parsed.name = ztstring(packet, offset);
      offset += parsed.name.length + 1;
      parsed.map = ztstring(packet, offset);
      offset += parsed.map.length + 1;
      parsed.folder = ztstring(packet, offset);
      offset += parsed.folder.length + 1;
      parsed.game = ztstring(packet, offset);
      offset += parsed.game.length + 1;
      parsed.players = packet.readUInt8(offset);
      offset += 1;
      parsed.server_type = (function() {
        switch (String.fromCharCode(packet.readUInt8(offset))) {
          case 'd':
            return 'dedicated';
          case 'l':
            return 'listen';
          case 'p':
            return 'hltv';
        }
      })();
      offset += 1;
      parsed.environment = (function() {
        switch (String.fromCharCode(packet.readUInt8(offset))) {
          case 'l':
            return 'linux';
          case 'w':
            return 'windows';
          case 'm':
          case 'o':
            return 'mac';
        }
      })();
      offset += 1;
      parsed.visibility = (function() {
        switch (packet.readUInt8(offset)) {
          case 0:
            return 'public';
          case 1:
            return 'private';
        }
      })();
      offset += 1;
      parsed.mod = (function() {
        switch (packet.readUInt8(offset)) {
          case 0:
            return 'hl';
          case 1:
            return 'mod';
        }
      })();
      offset += 1;
      if (parsed.mod === 'mod') {
        parsed.mod_info = {};
        parsed.mod_info.link = ztstring(packet, offset);
        offset += parsed.mod_info.link.length;
        parsed.mod_info.download_link = ztstring(packet, offset);
        offset += parsed.mod_info.download_link.length;
        offset += 1;
        parsed.mod_info.version = packet.readInt32LE(offset);
        offset += 2;
        parsed.mod_info.size = packet.readInt32LE(offset);
        offset += 2;
        parsed.mod_info.type = (function() {
          switch (packet.readUInt8(offset)) {
            case 0:
              return 'sp';
            case 1:
              return 'mp';
          }
        })();
        offset += 1;
        parsed.mod_info.dll = (function() {
          switch (packet.readUInt8(offset)) {
            case 0:
              return 'hl';
            case 1:
              return 'custom';
          }
        })();
        offset += 1;
      }
      parsed.vac = (function() {
        switch (packet.readUInt8(offset)) {
          case 0:
            return 'unsecured';
          case 1:
            return 'secured';
        }
      })();
      offset += 1;
      parsed.bots = packet.readUInt8(offset);
      offset += 1;
    }
    return parsed;
  };

  info = function(host, port, callback) {
    return send(host, port, new Buffer('\x54Source Engine Query', 'binary'), parseInfo, callback);
  };

  parseChallenge = function(packet) {
    var offset, parsed;
    parsed = {};
    offset = 4;
    parsed.header = String.fromCharCode(packet.readUInt8(offset));
    offset += 1;
    parsed.challenge = packet.readInt32LE(offset);
    return parsed;
  };

  challenge = function(host, port, callback) {
    return send(host, port, new Buffer('\x55\xFF\xFF\xFF\xFF', 'binary'), parseChallenge, callback);
  };

  send = function(host, port, data, parser, callback) {
    var packet;
    udp.on('error', function(err) {
      if (err != null) {
        throw err;
      }
    });
    udp.on('message', function(response) {
      return callback(parser(response));
    });
    packet = Buffer.concat([new Buffer('\xFF\xFF\xFF\xFF', 'binary'), data, new Buffer('\x00', 'binary')]);
    return udp.send(packet, 0, packet.length, port, host);
  };

  module.exports = {
    info: info,
    challenge: challenge
  };

}).call(this);
