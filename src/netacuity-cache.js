/*
  The MIT License (MIT)

  MIT License, Copyright (c) 2015 Vibrant Media Ltd
*/
'use strict';

var AsyncCache = require('async-cache');
var netacuity = require('./netacuity');

var DEFAULT_MAX_ITEMS = 10000;
var DEFAULT_MAX_AGE = 1000 * 60 * 10;

function NetAcuityCache(config) {
  this.statsGets = 0;
  this.statsLoads = 0;
  this.na = new netacuity.NetAcuity(config);
  //  TODO subclass config.cache, add config.cache.load() method below and pass this to the cache constructor
  //       so that any other config params being passed to the cache (and underlying lru-cache) actually get passed
  this.cache = new AsyncCache({
    max: config.cache.max || DEFAULT_MAX_ITEMS,
    maxAge: config.cache.maxAge || DEFAULT_MAX_AGE,
    load: function(ip, callback) {
      ++this.statsLoads;
      this.na.get(ip, callback /*(err, edge)*/);
    }.bind(this)
  });
}

NetAcuityCache.prototype.get = function(ip, callback) {
  ++this.statsGets;
  this.cache.get(ip, callback);
};

NetAcuityCache.prototype.reset = function() {
  this.cache.reset();
};

NetAcuityCache.prototype.close = function(callback) {
  this.na.close(callback);
};

NetAcuityCache.prototype.stats = function() {
  var s = this.na.stats();
  
  s.gets = this.statsGets;
  s.loads = this.statsLoads;
  
  this.statsGets = 0;
  this.statsLoads = 0;
  
  return s;
};

module.exports = NetAcuityCache;
