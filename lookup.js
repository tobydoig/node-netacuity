/*
  The MIT License (MIT)

  Copyright (c) 2016 Vibrant Media Ltd
*/
'use strict';

var fs = require('fs');
var async = require('async');
var netacuity = require('./src/netacuity.js');
var DNSCache = require('node-dnscache');

var DEFAULT_NETACUITY_PORT = 5400;
var DEFAULT_LISTEN_PORT = 10000;
var DEFAULT_TIMEOUT = 500;

function exitWithBadArgumentsMessage(m) {
  if (m) {
    console.log('lookup: ' + m);
  }
  console.log('try \'node lookup --help\'');
}

function exitWithHelpText() {
  console.log('Usage: node lookup -h host [OPTIONS] [address]');
  console.log('Perform a Netacuity geo-lookup (over UDP) of the specified address(es) or IP(s).');
  console.log('The address(es) must be the last parameter and may be a comma-seperated list.');
  console.log();
  console.log('-h  The netacuity server host to query');
  console.log('-p  The netacuity server port (default ' + DEFAULT_NETACUITY_PORT + ')');
  console.log('-l  Listen for response on this port (default ' + DEFAULT_LISTEN_PORT + ')');
  console.log('-t  Request timeout in milliseconds (default ' + DEFAULT_TIMEOUT + ')');
  console.log('-f  File containing addresses to lookup, one per line');
  console.log('-s  Simple output with the address and basic country details separated by spaces');
  console.log('-i  Ignore errors, show the error message but continue processing remaining addresses');
  console.log('-q  Quiet mode, swallow all errors (overrides -i)');
}

function rpad(str, len) {
  var s = '';
  len -= str.length;
  while (len-- > 0) {
    s = s + ' ';
  }
  return s + str;
}

function query(config, addresses) {
  var dnscache = new DNSCache({
    max: 1,
    maxAge: 1000,
    useLookup: true
  });
  var na = new netacuity.NetAcuity(config.netacuity);
  
  async.eachSeries(addresses, function dolookup(address, callback) {
    dnscache.get(address, function(err, address) {
      if (err) {
        if (config.quiet) {
          callback();
        } else {
          console.log('ERR - DNS for ' + address + ': ' + err);
          if (config.ignore) {
            callback();
          } else {
            async.nextTick(function() {
              callback(err);
            });
          }
        }
      } else {
        var start = +new Date();
        na.get(address, function(err, edge) {
          if (err) {
            if (config.quiet) {
              callback();
            } else {
              console.log('ERR - NETACUITY for ' + address + ': ' + err);
              if (config.ignore) {
                callback();
              } else {
                async.nextTick(function() {
                  callback(err);
                });
              }
            }
          } else {
            var t = +new Date() - start;
            edge.timeTaken = t;
            if (config.simple) {
              console.log('%s %s', rpad(address, 16), edge.isoCountryCode);
            } else {
              console.log('Result: ', JSON.stringify(edge));
            }
            callback();
          }
        });
      }
    });
  }, function done(err) {
    na.close(function(err) {
      if (err && !config.quiet) {
        console.log('Close error: %s', err);
      }
    });
  });
}

function processParams(params) {
  var config = {
    simple: false,
    ignore: false,
    quiet: false,
    netacuity: {
      port: DEFAULT_LISTEN_PORT,
      appId: 3,
      timeout: DEFAULT_TIMEOUT,
      servers: [{
        host: '',
        port: DEFAULT_NETACUITY_PORT
      }]
    }
  };
  
  var k, v, stat, addresses;
  
  while (true) {
    if (!params.length) {
      if (!addresses) {
        if (config.quiet) {
          return;
        }
        return exitWithBadArgumentsMessage("No address specified");
      }
      
      async.nextTick(function() {
        query(config, addresses);
      });
      return;
    }
    
    k = params.shift();
    
    switch (k) {
      case '--help':
        return exitWithHelpText();
      case '-h':
        v = params.shift();
        if (v === undefined) { return exitWithBadArgumentsMessage('Missing host'); }
        config.netacuity.servers[0].host = v;
        break;
      case '-p':
        v = params.shift();
        if (v === undefined) { return exitWithBadArgumentsMessage('Missing port'); }
        v = +v;
        if (isNaN(v)) { return exitWithBadArgumentsMessage('Invalid port'); }
        config.netacuity.servers[0].port = v;
        break;
      case '-l':
        v = params.shift();
        if (v === undefined) { return exitWithBadArgumentsMessage('Missing port'); }
        v = +v;
        if (isNaN(v)) { return exitWithBadArgumentsMessage('Invalid port'); }
        config.netacuity.port = v;
        break;
      case '-t':
        v = params.shift();
        if (v === undefined) { return exitWithBadArgumentsMessage('Missing timeout'); }
        v = +v;
        if (isNaN(v)) { return exitWithBadArgumentsMessage('Invalid timeout'); }
        config.netacuity.timeout = v;
        break;
      case '-f':
        v = params.shift();
        if (v === undefined) { return exitWithBadArgumentsMessage('Missing filename'); }
        stat = fs.statSync(v);
        if (!stat) { return exitWithBadArgumentsMessage('Failed to stat file'); }
        if (!stat.isFile()) { return exitWithBadArgumentsMessage('Not a file'); }
        v = fs.readFileSync(v);
        if (!v || !v.length) { return exitWithBadArgumentsMessage('Empty file'); }
        addresses = v.toString().split(/\s+/g).filter(function(s) { return !!s.length; });
        break;
      case '-s':
        config.simple = true;
        break;
      case '-i':
        config.ignore = true;
        break;
      case '-q':
        config.quiet = true;
        break;
      default:
        if (k[0] === '-') { return exitWithBadArgumentsMessage('Unrecognised parameter: ' + k); }
        if (params.length > 0) { return exitWithBadArgumentsMessage('Address expected to be last parameter'); }
        if (addresses) { return exitWithBadArgumentsMessage('Addresses already specified by -f'); }
        addresses = k.split(/,/).filter(function(s) { return !!s.length; });
        break;
    }
  }
}

processParams(process.argv.slice(2)); //first 2 params are node binary and our script
