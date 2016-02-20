'use strict';

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
  console.log('Usage: node lookup -h host [OPTIONS] address');
  console.log('Perform a Netacuity geo-lookup (over UDP) of the specified address or IP.');
  console.log();
  console.log('-h  The netacuity server host to query');
  console.log('-p  The netacuity server port (default ' + DEFAULT_NETACUITY_PORT + ')');
  console.log('-l  Listen for response on this port (default ' + DEFAULT_LISTEN_PORT + ')');
  console.log('-t  Request timeout in milliseconds (default ' + DEFAULT_TIMEOUT + ')');
}

function query(config, address) {
  var dnscache = new DNSCache({
    max: 1,
    maxAge: 1000,
    useLookup: true
  });
  
  dnscache.get(address, function(err, address) {
    if (err) {
      console.log('FAIL: %s', err);
    } else {
      var na = new netacuity.NetAcuity(config);
      var start = +new Date();
      na.get(address, function(err, edge) {
        if (err) {
          console.log('FAIL: %s', err);
        } else {
          var t = +new Date() - start;
          edge.timeTaken = t;
          console.log('Result: ', JSON.stringify(edge));
        }
        
        na.close(function(err) {
          err && console.log('Close error: %s', err);
        });
      });
    }
  });
}

function processParams(params) {
  var config = {
    port: DEFAULT_LISTEN_PORT,
    appId: 3,
    timeout: DEFAULT_TIMEOUT,
    servers: [{
      host: '',
      port: DEFAULT_NETACUITY_PORT
    }]
  };
  
  var k, v;
  
  while (true) {
    k = params.shift();
    if (k === undefined) { return exitWithBadArgumentsMessage(); }
    
    switch (k) {
      case '--help':
        return exitWithHelpText();
      case '-h':
        v = params.shift();
        if (v === undefined) { return exitWithBadArgumentsMessage('Missing host'); }
        config.servers[0].host = v;
        break;
      case '-p':
        v = params.shift();
        if (v === undefined) { return exitWithBadArgumentsMessage('Missing port'); }
        v = +v;
        if (isNaN(v)) { return exitWithBadArgumentsMessage('Invalid port'); }
        config.servers[0].port = v;
        break;
      case '-l':
        v = params.shift();
        if (v === undefined) { return exitWithBadArgumentsMessage('Missing port'); }
        v = +v;
        if (isNaN(v)) { return exitWithBadArgumentsMessage('Invalid port'); }
        config.port = v;
        break;
      case '-t':
        v = params.shift();
        if (v === undefined) { return exitWithBadArgumentsMessage('Missing timeout'); }
        v = +v;
        if (isNaN(v)) { return exitWithBadArgumentsMessage('Invalid timeout'); }
        config.timeout = v;
        break;
      default:
        if (k[0] === '-') { return exitWithBadArgumentsMessage('Unrecognised parameter: ' + k); }
        if (params.length > 0) { return exitWithBadArgumentsMessage('Address expected to be last parameter'); }
        query(config, k);
        return;
    }
  }
}

processParams(process.argv.slice(2)); //first 2 params are node binary and our script
