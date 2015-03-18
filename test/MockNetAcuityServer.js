'use strict';

var dgram = require('dgram');
var netacuity = require('../src/netacuity');

/**
 * Mock a NetAcuity server.
 *
 * @param {number} port The port to listen on (suggest 5400)
 * @param {function} callback The callback to call once the server is up, listening and ready for messages
 * @param {function} onmessage The callback to call when this server receives a message, format is onmessage(err, EdgeQuery, rinfo)
 */
function MockNetAcuityServer(port, callback, onmessage) {
  this.socket = dgram.createSocket('udp4');
  
  this.socket.bind(port, function(err) {
    err && callback.call(this, err);
  }.bind(this));
  
  this.socket.on("listening", function onlistening() {
    callback.call(this);
  }.bind(this));
  
  this.socket.on("message", function (msg, rinfo) {
    var s = msg.toString('ascii');
    var query = netacuity.EdgeQuery.parse(s);
    
    onmessage.call(this, query, rinfo);
  }.bind(this));
}

/**
 * Return the address info for this server so you can retrieve the port number
 * @return {object} An address object containing host and port properties
 */
MockNetAcuityServer.prototype.address = function() {
  return this.socket.address();
};

/**
 * Send an EdgeRecord response.
 * @param {EdgeRecord} edgerecord The EdgeRecord response to send (typically in response to an EdgeQuery)
 * @param {string} host The host to send the response to
 * @param {number} port The port to send the response to
 * @param [callback] callback Optional callback to call once the response has been sent, format callback(err)
 */
MockNetAcuityServer.prototype.send = function(edgerecord, host, port, callback) {
  var resp = edgerecord.toString();
  var buff = new Buffer(resp.length + 4);
  
  buff.writeUInt16BE(0, 0);      //  size
  buff.writeUInt16BE(netacuity.NA_API_5_INDICATOR, 2);
  buff.write(resp, 4, resp.length, 'ascii');
  
  this.socket.send(buff, 0, buff.length, port, host, function onsend(err) {
    callback && callback.call(this, err);
  }.bind(this));
};

/**
 * Asynchronously close this mock server and release any resources.
 * @param [function] callback Optional callback to call once the resources are released
 */
MockNetAcuityServer.prototype.close = function(callback) {
  callback && this.socket.on("close", function() {
    callback.call(this);
  }.bind(this));  
  this.socket.close();
}

module.exports = MockNetAcuityServer;
