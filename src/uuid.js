/*
  uuid.js

  Copyright (c) 2010-2012 Robert Kieffer
  MIT License - http://opensource.org/licenses/mit-license.php
  
  https://github.com/broofa/node-uuid
  
  We use broofa's module but we also wanted to generate UUIDs without the delimiters (dashes) so
  rather than calling the module then doing a search/replace we lifted the minimal code.
*/
'use strict';

var uuid = require('node-uuid');

var _byteToHex = [];
for (var i = 0; i < 256; i++) {
  _byteToHex[i] = (i + 0x100).toString(16).substr(1);
}
  
/**
 * Return the provided Buffer object as just a string of
 * capitalised hexadecimal characters, no delimiters.
 *
 * @param {Buffer} buffer The buffer to convert (expected to be 32 bytes)
 * @return {String} The buffer as a capitalised hex string with no delimiters
 */
function unparse(buffer) {
  /**
   * @link https://github.com/broofa/node-uuid/blob/master/uuid.js#L82
   */
  var i = 0;
  return  _byteToHex[buffer[i++]] + _byteToHex[buffer[i++]] +
          _byteToHex[buffer[i++]] + _byteToHex[buffer[i++]] +
          _byteToHex[buffer[i++]] + _byteToHex[buffer[i++]] +
          _byteToHex[buffer[i++]] + _byteToHex[buffer[i++]] +
          _byteToHex[buffer[i++]] + _byteToHex[buffer[i++]] +
          _byteToHex[buffer[i++]] + _byteToHex[buffer[i++]] +
          _byteToHex[buffer[i++]] + _byteToHex[buffer[i++]] +
          _byteToHex[buffer[i++]] + _byteToHex[buffer[i++]];
}

/**
 * Return a randomly generated UUID string without delimiters using
 * the v4 method from the node-uuid module.
 *
 * @return {String} A 32 character randomly generated uuid string
 */
function generateUUID() {
  var txidBuffer = new Buffer(32);
  
  uuid.v4(null, txidBuffer, 0);
  return unparse(txidBuffer);
}

module.exports = {
  generateUUID : generateUUID
};
