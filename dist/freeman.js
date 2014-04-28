(function() {
  'use strict';
  var Parser, buildPacket, createUDP, dgram, info, ref, sendPacket;

  dgram = require('dgram');

  Parser = require('binary-parser').Parser;

  ref = require('ref');

  Parser.prototype.ztstring = function(name, options) {
    if (options == null) {
      options = {};
    }
    options.zeroTerminated = true;
    return this.string(name, options);
  };

  createUDP = function(cb) {
    var udp;
    udp = dgram.createSocket('udp4');
    udp.on('error', function(err) {
      udp.close();
      throw err;
    });
    udp.on('message', function(response) {
      return cb(response);
    });
    return udp;
  };

  buildPacket = function(payload) {
    return Buffer.concat([new Buffer('\xFF\xFF\xFF\xFF', 'binary'), payload, new Buffer('\x00', 'binary')]);
  };

  sendPacket = function(host, port, packet, cb) {
    var udp;
    udp = createUDP(cb);
    return udp.send(packet, 0, packet.length, port, host, function(err, data) {
      if (err != null) {
        throw err;
      }
    });
  };

  info = function(host, port, cb) {
    var parser, payload, source_tv, the_ship;
    the_ship = new Parser().endianess('little').uint8('mode').uint8('witnesses').uint8('duration');
    source_tv = new Parser().int16le('port').ztstring('name');
    parser = new Parser().endianess('little').uint32('prefix').uint8('header').uint8('protocol_version').ztstring('name').ztstring('map').ztstring('folder').ztstring('game').int16('game_id').uint8('players').uint8('max_players').uint8('bots').uint8('server_type').uint8('environment').uint8('visibility').uint8('vac').choice('the_ship', {
      tag: function() {
        if ([2400, 2401, 2402, 2412].indexOf(this.game_id) !== -1) {
          return 1;
        }
      },
      choices: {
        1: the_ship
      },
      defaultChoice: function() {}
    }).ztstring('game_version').uint8('edf').choice('port', {
      tag: function() {
        if (!!(this.edf & 0x80)) {
          return 1;
        }
      },
      choices: {
        1: 'int16le'
      },
      defaultChoice: function() {}
    }).choice('steam_id', {
      tag: function() {
        if (!!(this.edf & 0x10)) {
          return 1;
        }
      },
      choices: {
        1: new Parser().buffer(null, {
          length: 8
        })
      },
      defaultChoice: function() {}
    }).choice('source_tv', {
      tag: function() {
        if (!!(this.edf & 0x40)) {
          return 1;
        }
      },
      choices: {
        1: source_tv
      },
      defaultChoice: function() {}
    }).choice('keywords', {
      tag: function() {
        if (!!(this.edf & 0x20)) {
          return 1;
        }
      },
      choices: {
        1: new Parser().ztstring()
      },
      defaultChoice: function() {}
    }).choice('game_id64', {
      tag: function() {
        if (!!(this.edf & 0x01)) {
          return 1;
        }
      },
      choices: {
        1: new Parser().buffer(null, {
          length: 8
        })
      },
      defaultChoice: function() {}
    });
    payload = new Buffer('\x54Source Engine Query', 'binary');
    return sendPacket(host, port, buildPacket(payload), function(msg, rinfo) {
      var unpacked;
      unpacked = parser.parse(msg);
      if ((unpacked.steam_id != null) && Buffer.isBuffer(unpacked.steam_id)) {
        unpacked.steam_id = unpacked.steam_id.readUInt64LE();
      }
      if ((unpacked.game_id64 != null) && Buffer.isBuffer(unpacked.game_id64)) {
        unpacked.game_id64 = unpacked.game_id64.readUInt64LE();
      }
      return cb(unpacked);
    });
  };

  module.exports = {
    info: info
  };

}).call(this);
