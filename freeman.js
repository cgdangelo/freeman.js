// Generated by CoffeeScript 1.7.1
(function() {
  'use strict';
  var PACKETS, Parser, buildPacket, createUDP, dgram, info, sendPacket, udp;

  dgram = require('dgram');

  Parser = require('binary-parser').Parser;

  udp = null;

  PACKETS = {
    PREFIX: '\xFF\xFF\xFF\xFF',
    REQUESTS: {
      A2S_INFO: {
        HEADER: '\x54',
        PAYLOAD: 'Source Engine Query'
      }
    }
  };

  Parser.prototype.ztstring = function(name, options) {
    if (options == null) {
      options = {};
    }
    options.zeroTerminated = true;
    return this.string(name, options);
  };

  createUDP = (function(_this) {
    return function(cb) {
      udp = dgram.createSocket('udp4');
      udp.on('error', function(err) {
        udp.close();
        throw err;
      });
      udp.on('message', cb);
      return udp;
    };
  })(this);

  buildPacket = function(requestType) {
    return Buffer.concat([new Buffer(PACKETS.PREFIX, 'binary'), new Buffer(PACKETS.REQUESTS[requestType].HEADER, 'binary'), new Buffer(PACKETS.REQUESTS[requestType].PAYLOAD, 'binary'), new Buffer('\x00', 'binary')]);
  };

  sendPacket = function(host, port, packet, cb) {
    if (udp == null) {
      udp = createUDP(cb);
    }
    return udp.send(packet, 0, packet.length, port, host, function(err, data) {
      if (err != null) {
        throw err;
      }
    });
  };

  info = function(host, port) {
    var parser;
    parser = new Parser().endianess('little').array('prefix', {
      type: 'uint8',
      length: 4
    }).uint8('header').uint8('protocol_version').ztstring('name').ztstring('map').ztstring('folder').ztstring('game').int16('game_id').uint8('players').uint8('max_players').uint8('bots').uint8('server_type').uint8('environment').uint8('visibility').uint8('vac');
    return sendPacket(host, port, buildPacket('A2S_INFO'), function(msg, rinfo) {
      return console.dir(parser.parse(msg));
    });
  };

}).call(this);