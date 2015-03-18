# node-netacuity
NodeJS client for Digital Element's NetAcuity GeoIP Service, specifically for the Edge database queries.
There is also a cache client using the "async-cache" module so simultaneous requests for the same ip only
make one physical request.

### Installation
Install the packages:

    cd /path/to/node-netacuity
    npm install

### Usage
When instantiating the main NetAcuity object you pass in a config object. This must contain a servers section which tells
us which servers you want to pass queries to. If you specify multiple entries then failover will be available in a rather
simple round-robin fashion (ie. when several timeouts happen in close proximity).

    var netacuity = require('node-netacuity');
    var na = new netacuity.NetAcuity({
      port: 10000,
      appId: 3,
      servers: [ { host: "acuity01", port: 5400 }, { host: "acuity02", port: 5400 }  ]
    });
    
    na.get('31.24.80.156', function(err, edge) {
      if (err) {
        console.log('Lookup error: %s', err);
      else {
        console.dir('Result: ', edge); // edge is netacuity.EdgeRecord
      }
    });
    
    na.close(function(err) {
      if (err) {
        console.log('Close error: %s', err);
      }
    });

Alternatively you can use the cache implementation.

    var NetAcuityCache = require('netacuity-cache');

    var cache = new NetAcuityCache({
      port: 10000,
      appId: 3,
      servers: [ { host: "acuity01", port: 5400 }, { host: "acuity02", port: 5400 }  ],
      cache: {
        stale: true,
        max: 1000,
        maxAge: 60000
      }
    });
  
    cache.get('31.24.80.156', function(err, edge) {
      if (err) {
        console.log('Lookup error: %s', err);
      else {
        console.dir('Result: ', edge); // edge is netacuity.EdgeRecord
      }
    });
    
    cache.close(function(err) {
      if (err) {
        console.log('Close error: %s', err);
      }
    });
    
### Configuration
Configuration is performed by passing a configuration object to the NetAcuity() constructor. The following
describes the various options:

    var config = {
      port: 20000,  //  which port we should listen to responses from NetAcuity on
      timeout: 50,  //  number of milliseconds we should wait to get a response to a geo query
      servers: [    //  an array of netacuity servers we can direct requests to
        { host: "acuity01", port: 5400 }, //  each entry must have a host and optionally a port
        { host: "acuity02", port: 5400 }  //  if no port is specified then 5400 is used
      ],
      appId: 3,     //  a numeric value 0..127 to group NetAcuity usage reports against
      failoverWindow: 100,  //  a value in milliseconds in which consecutive request timeouts suggest a failover event
      failoverThreshold: 3,  //  this many requests each within a failoverWindow of each other triggers a failover
      max: 10000,     //  for caching, maximum number of entries the cache can hold before less-recently-used items are evicted
      maxAge: 600000  //  for caching, how long something can remain in cache before being expired (in milliseconds)
    };

### Testing

    npm test

