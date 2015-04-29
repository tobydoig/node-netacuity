'use strict';

var dgram = require('dgram');
var dns = require('dns');
var util = require('util');
var uuid = require('./uuid');
var DNSCache = require('node-dnscache');

var REGEX_RESPONSE_SPLITTER = /;/g;   //  response is a semi-colon delimited string
var FEATURE_EDGE_DB = 4;              //  each database has an id, this is the one we use - http://www.digitalelement.com/solutions/netacuity-edge-premium/
var API_ID = 2;                       //  some value we decide 1..127. intellitxt is using 1 so let's use 2
var API_VERSION = 5;                  //  found it in the c implementation of netacuity's provided module
var API_TYPE = 1;                     //  no idea, also ripped from the c module
var NA_API_5_INDICATOR = 32767;       //  magic number to tell us a response is API v5 format
var MAX_TRANSACTION_ID_LENGTH  = 64;  //  transaction id's are strings
var DEFAULT_RESPONSE_TIMEOUT = 100;   //  when requesing an ip lookup, if the response takes longer than this then fail
var DEFAULT_NETACUITY_PORT = 5400;    //  default port of target netacuity server
var DEFAULT_OUR_PORT = 10000;         //  the port we send messages from and listen for responses
var DEFAULT_FAILOVER_WINDOW = 1000;   //  if DEFAULT_FAILOVER_THRESHOLD send response timeouts happen within DEFAULT_FAILOVER_WINDOW then cycle to next server
var DEFAULT_FAILOVER_THRESHOLD = 5;   //  see DEFAULT_FAILOVER_WINDOW
var DEFAULT_EDGE_RECORD = [API_VERSION, '', '', '', '', '', '', '', 0, 0.0, 0.0, '', 0, 0, 0, 0, '', 0, '', 0, 0, 0, 0, 0, 'n'];
var DEFAULT_DNS_MAXAGE = 1000 * 60 * 2;  //  cache dns lookups for this time (milliseconds)
var DEFAULT_DNS_USE_LOOKUP = true;    //  see https://github.com/Vibrant-Media/node-dnscache

/**
 * Represents an Edge response from a NetAcuity server. To define
 * the response properties you can pass in an array with those
 * properties defined, otherwise default (0's and empty strings) will
 * be used.
 *
 * The list of fields are (in order):
 * apiVersion - API version used for formatting this Edge record (int - default 5)
 * ip - IP address from query (string)
 * transactionId - Transaction id passed in query (string)
 * error - Error string if any (string)
 * country - Country code for specified IP (string)
 * region - Region name for specified IP (string)
 * city - City name for specified IP (string)
 * connectionSpeed - Connection speed description for specified IP (string)
 * metroCode - US metro code for specified IP (int)
 * latitude - Latitude for specified IP (float)
 * longitude- Longitude for specified IP (float)
 * postCode - Post code for specified IP (string)
 * country - Country code for specified IP (int)
 * regionCode - Region code for specified IP (int)
 * cityCode - City code for specified IP (int)
 * continentCode - Continent code for specified IP (int)
 * isoCountryCode - ISO 3166 Country code for specified IP (2 characters)
 * internalCode - Internal code (int)
 * areaCodes - Area codes (string)
 * countryConfidence - Confidence value (int 0-5)
 * regionConfidence - Confidence value (int 0-5)
 * cityConfidence - Confidence value (int 0-5)
 * postCodeConfidence - Confidence value (int 0-5)
 * gmtOffset - GMT offset for local timezone in hours (int)
 * inDst - Whether local timezone is in Daylight Savings Time or not (y / n)
 *
 * @param {[]} fields An optional array of fields defining values for the 25 properties.
 */
function EdgeRecord(fields) {
  fields = fields || DEFAULT_EDGE_RECORD;
  
  this.apiVersion         = +fields[ 0] || DEFAULT_EDGE_RECORD[ 0];
  this.ip                 =  fields[ 1] || DEFAULT_EDGE_RECORD[ 1];
  this.transactionId      =  fields[ 2] || DEFAULT_EDGE_RECORD[ 2];
  this.error              =  fields[ 3] || DEFAULT_EDGE_RECORD[ 3];
  this.country            =  fields[ 4] || DEFAULT_EDGE_RECORD[ 4];
  this.region             =  fields[ 5] || DEFAULT_EDGE_RECORD[ 5];
  this.city               =  fields[ 6] || DEFAULT_EDGE_RECORD[ 6];
  this.connectionSpeed    =  fields[ 7] || DEFAULT_EDGE_RECORD[ 7];
  this.metroCode          = +fields[ 8] || DEFAULT_EDGE_RECORD[ 8];
  this.latitude           = +fields[ 9] || DEFAULT_EDGE_RECORD[ 9];
  this.longitude          = +fields[10] || DEFAULT_EDGE_RECORD[10];
  this.postCode           =  fields[11] || DEFAULT_EDGE_RECORD[11];
  this.countryCode        = +fields[12] || DEFAULT_EDGE_RECORD[12];
  this.regionCode         = +fields[13] || DEFAULT_EDGE_RECORD[13];
  this.cityCode           = +fields[14] || DEFAULT_EDGE_RECORD[14];
  this.continentCode      = +fields[15] || DEFAULT_EDGE_RECORD[15];
  this.isoCountryCode     =  fields[16] || DEFAULT_EDGE_RECORD[16];
  this.internalCode       = +fields[17] || DEFAULT_EDGE_RECORD[17];
  this.areaCodes          =  fields[18] || DEFAULT_EDGE_RECORD[18];
  this.countryConfidence  = +fields[19] || DEFAULT_EDGE_RECORD[19];
  this.regionConfidence   = +fields[20] || DEFAULT_EDGE_RECORD[20];
  this.cityConfidence     = +fields[21] || DEFAULT_EDGE_RECORD[21];
  this.postCodeConfidence = +fields[22] || DEFAULT_EDGE_RECORD[22];
  this.gmtOffset          = +fields[23] || DEFAULT_EDGE_RECORD[23];
  this.inDst              =  fields[24] || DEFAULT_EDGE_RECORD[24];
}

/**
 * Compare this EdgeRecord with another by comparing the number
 * of properties, their names and values.
 *
 * @param {EdgeRecord} other The other record to compare against
 * @return {boolean} True if they're the same, false if not
 */
EdgeRecord.prototype.sameAs = function(other) {
  var keys = Object.keys(this);
  var keys2 = Object.keys(other);
  
  if (keys.length === keys2.length) {
    return keys.every(function(currentValue, index) {
      //  company the key names and also their values
      return currentValue === keys2[index] && this[currentValue] === other[currentValue];
    }.bind(this));
  }
  
  return false;
};

/**
 * Returns a String for this EdgeRecord formatted as a semi-colon separated list of properties
 * in the order expected to be returned by a NetAcuity server in response to a query.
 *
 * @return {string} The string representation of this EdgeRecord
 */
EdgeRecord.prototype.toString = function() {
  return this.apiVersion    + ';' + 
    this.ip                 + ';' + 
    this.transactionId      + ';' + 
    this.error              + ';' + 
    this.country            + ';' + 
    this.region             + ';' + 
    this.city               + ';' + 
    this.connectionSpeed    + ';' + 
    this.metroCode          + ';' + 
    this.latitude           + ';' + 
    this.longitude          + ';' + 
    this.postCode           + ';' + 
    this.countryCode        + ';' + 
    this.regionCode         + ';' + 
    this.cityCode           + ';' + 
    this.continentCode      + ';' + 
    this.isoCountryCode     + ';' + 
    this.internalCode       + ';' + 
    this.areaCodes          + ';' + 
    this.countryConfidence  + ';' + 
    this.regionConfidence   + ';' + 
    this.cityConfidence     + ';' + 
    this.postCodeConfidence + ';' + 
    this.gmtOffset          + ';' + 
    this.inDst              + ';';
};

/**
 * Represents an Edge database query to a NetAcuity server.
 *
 * @param {number} appId An ID used for reporting purposes so you can split out requests from different systems using this module
 * @param {string} ip The ip address to do a lookup for
 * @param {string} transactionId A transaction id so you can match your request to a response
 */
function EdgeQuery(appId, ip, transactionId) {
  this.appId = appId;
  this.ip = ip;
  this.transactionId = transactionId;
};

/**
 * Return a string represetation of this query in a format expected by
 * a NetAcuity server.
 * @return {string} A string
 */
EdgeQuery.prototype.toString = function() {
  return FEATURE_EDGE_DB + ';' + this.appId + ';' + this.ip + ';' + API_VERSION + ';' + API_TYPE + ';' + this.transactionId + ';';
};

/**
 * Parse a query string and return an EdgeQuery object
 * @param {string} s The string to parse
 * @return {EdgeQuery} An EdgeQuery object whose properties reflect those from the string
 */
EdgeQuery.parse = function(s) {
  var fields = s.split(REGEX_RESPONSE_SPLITTER);
  
  return new EdgeQuery(fields[1], fields[2], fields[5]);
};

/**
 * Represents a NetAcuity server against which you will want to perform lookups.
 * @param {string} host The host name or IP of the server
 * @param {int} port The port number the server is listening on
 */
function NetAcuityServer(host, port, resolverInterval) {
  this.host = host;
  this.port = port;
  this.lastTimeout = +new Date();
  this.errorCount = 0;
}

/**
 * The main entry point for making queries again NetAcuity servers. This creates an instance
 * of the module which contains a UDP socket that sends the queries and listens for responses.
 * Since it's UDP we automatically generate a unique UUID-based id for each query, this is
 * stored as the transactionId and we maintain a lookup table of in-flight requests based on
 * these id's. When responses come in we can then find the original request and pass the results
 * back accordingly.
 *
 * We also implement a timeout mechanism whereby if we don't get a response to a request within
 * a certain timeout (config.timeout, default is 100 ms) then we consider this a failed request
 * and if multiple servers were passed in a failover may then occur. Failover simple iterates to
 * the next server in the config, cycling round to the first one if the end of the list is reached.
 * Since there are no connections in UDP we treat a timeout as hint (not a definite indication) of a
 * dead server.
 * 
 * Config options are:
 *   port - Port number on which we should listen for query responses (default 10000)
 *   timeout - Default query timeout in milliseconds (default 100)
 *   servers - An array of servers to direct queries to. Each entry in the array is an object with port (integer, default 5400) and host (string) properties
 *   appId - An id (int, 0-127) so you can separate out different instances usage in NetAcuity reporting (default 1)
 *   failoverWindow - If 2 queries to the same server fail within this window then a persistent issue is indicated (default 1000 milliseconds)
 *   failoverThreshold - If this many timeouts are seen within failoverWindow then a failover is triggered (default 5)
 *   dns {
 *     maxAge - how long to cache dns lookups for in milliseconds (default 2 minutes)
 *     useLookup - see https://github.com/Vibrant-Media/node-dnscache (default is true)
 *   }
 *
 * @param {object} config A configuration object (see local config.json for an example)
 */
function NetAcuity(config) {
  if (!config) {
    throw new Error('missing config');
  }
  
  var dnsConfig = config.dns || {};
  
  this.port = config.port || DEFAULT_OUR_PORT;
  this.timeout = config.timeout || DEFAULT_RESPONSE_TIMEOUT;
  this.servers = [];
  this.currentServer = 0;
  this.transactionsInFlight = {};
  this.socket = dgram.createSocket('udp4');
  this.appId = config.appId || API_ID;
  this.failoverWindow = config.failoverWindow || DEFAULT_FAILOVER_WINDOW;
  this.failoverThreshold = config.failoverThreshold || DEFAULT_FAILOVER_THRESHOLD;
  this.dnscache = undefined; // we define it after validating we were passed config.servers
  
  if (!Array.isArray(config.servers)) {
    throw new Error('config.servers should be an array');
  }
  
  config.servers.forEach(function(server, index) {
    if (!server.host) {
      throw new Error('invalid host in config.servers entry ' + index);
    }
    
    this.servers.push(new NetAcuityServer(server.host, server.port || DEFAULT_NETACUITY_PORT));
  }.bind(this));
  
  this.dnscache = new DNSCache({
    max: this.servers.length + 1, /* adding 1 should be unnecessary but i want to be sure to avoid size evictions */
    maxAge: dnsConfig.maxAge === undefined ? DEFAULT_DNS_MAXAGE : dnsConfig.maxAge || DEFAULT_DNS_MAXAGE,
    useLookup: dnsConfig.useLookup === undefined ? DEFAULT_DNS_USE_LOOKUP : !!dnsConfig.useLookup,
  });
  
  this.socket.on("error", function onerror(err) {
    //this.socket.close();
  }.bind(this));

  this.socket.on("listening", function onlistening() {
  }.bind(this));
  
  this.socket.on("close", function onclose() {
    this.socket = undefined;
  }.bind(this));
  
  this.socket.on("message", function onmessage(msg, rinfo) {
    var size = msg.readUInt16BE(0);
    var numFields = msg.readUInt16BE(2);
    var fields, callback, edge;
    
    if (numFields !== NA_API_5_INDICATOR) {
      return; // this will trigger a timeout
    }
    
    fields = msg.toString('ascii', 4).split(REGEX_RESPONSE_SPLITTER);
    edge = new EdgeRecord(fields);
    callback = this.transactionsInFlight[edge.transactionId];
    
    if (callback) {
      //  callback is a transactionCallback() below
      callback(edge.error.length ? edge.error : undefined, edge);
    } else {
      //console.log('No transaction found for %s', edge.transactionId);
    }
  }.bind(this));
}

/**
 * Generates a Buffer object that contains an EdgeQuery for the specified ip
 * and transactionId values.
 * @param {string} ip The ip address to lookup
 * @param {string} transactionId The transaction id
 * @return {Buffer} A buffer containing the correctly formatted EdgeQuery
 */
NetAcuity.prototype.generateEdgeMessage = function(ip, transactionId) {
  var query = new EdgeQuery(this.appId, ip, transactionId);
  return new Buffer(query.toString());
};

/**
 * Asynchronously lookup the specified ip address and pass the result to the callback
 * in the format callback(err, EdgeRecord).
 *
 * @param {string} ip The ip to lookup
 * @param {function} callback The callback to pass the result to in the format function(err, EdgeRecord)
 */
NetAcuity.prototype.get = function(ip, callback) {
  if (!this.socket) {
    callback(new Error('netacuity: socket closed'));
    return;
  }
  
  if (this.currentServer < 0) {
    callback(new Error('netacuity: offline'));
    return;
  }

  var transactionId = uuid.generateUUID();
  var msg = this.generateEdgeMessage(ip, transactionId);
  var server = this.servers[this.currentServer];
  var requestTime = +new Date();
  //  cleanup function to call regardless of what happens after this request
  var cleanup = function getCleanup() {
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }
    delete this.transactionsInFlight[transactionId];
  }.bind(this);
  //  timeout function in case we don't get a response from the server (it being a UDP request)
  var timer = setTimeout(function ontimeout() {
    var now = +new Date();
    cleanup();
    
    //  failover handling.
    //  if the current server is the same one this request was sent to
    if (server === this.servers[this.currentServer]) {
      //  and the time since this server's last timeout is within our window of failover
      if (now - server.lastTimeout < this.failoverWindow) {
        //  if the number of errors for this server exceeds our threshold
        if (++server.errorCount >= this.failoverThreshold) {
          //  do a failover - select the next server
          if (++this.currentServer >= this.servers.length) {
            this.currentServer = 0;
          }
        }
      } else {
        //  this timeout happened outside of our failover window so reset our error count
        server.errorCount = 1;
      }

      //  update this server's last timeout
      server.lastTimeout = now;
    }
    
    callback(new Error('netacuity: request timeout'));
  }.bind(this), this.timeout);
  //  add a callback into the "inflight" queue that wraps the passed-in callback in one with
  //  a cleanup call
  this.transactionsInFlight[transactionId] = function transactionCallback(err, edge) {
    callback(err, edge);
    cleanup();
  }.bind(this);
  
  //  send the message itself.
  //  if we get a socket error our handler below will be called.
  //  if we don't get a response then our ontimeout handler will be called.
  //  if we do get a response our onmessage handler above will be called.
  this.dnscache.get(server.host, function(err, addresses) {
    if (err) {
      cleanup();
      callback(err);
    } else {
      //  if DNSCache.config.useLookup = true  -> addresses is a string
      //  if DNSCache.config.useLookup = false -> addresses is an array of strings
      var host = util.isArray(addresses) ? addresses[0] : addresses;
      this.socket.send(msg, 0, msg.length, server.port, host, function onsend(err) {
        if (err) {
          cleanup();
          callback(err);
        }
      });
    }
  }.bind(this));
};

/**
 * Asynchronously close the internal resources used by this instance and give any in-flight
 * requests enough time to complete (or time out).
 *
 * @param {function} callback The callback to call once we're closed and requests have had a chance to drain
 */
NetAcuity.prototype.close = function(callback) {
  if (!this.socket) {
    callback(new Error('netacuity: socket already closed'));
  } else {
    this.socket.close();
    setTimeout(function closeTimeout() {
      callback();
    }.bind(this), this.timeout * 2 + 50); // 50 just for some extra time
  }
};

module.exports = {
  NetAcuity: NetAcuity,
  EdgeRecord: EdgeRecord,
  EdgeQuery: EdgeQuery,
  NA_API_5_INDICATOR: NA_API_5_INDICATOR
};
