/*
  The MIT License (MIT)

  Copyright (c) 2015 Vibrant Media Ltd
*/
'use strict';

var netacuity = require('./src/netacuity');
var NetAcuityCache = require('./src/netacuity-cache');

module.exports = {
    NetAcuity: netacuity.NetAcuity,
    NetAcuityCache: NetAcuityCache
};
