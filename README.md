# node-netacuity
NodeJS client for Digital Element's NetAcuity GeoIP Service, specifically for the Edge database queries.
There is also a cache client using the "async-cache" module so simultaneous requests for the same ip only
make one physical request. We also include a command-line tool for perfoming lookups.

### Installation
Install the packages:

    cd /path/to/node-netacuity
    npm install

### Commandline Tool
A simple command-line tool that lets you both do lookups and test the module.
To get the help text showing the options run:

    node lookup --help

The result is a JSON-formatted netacuity.EdgeRecord but we add a timeTaken property with the lookup time in milliseconds.

    $ node lookup -h acuity01 www.vibrantmedia.com
    Result:  {"apiVersion":5,"ip":"216.137.63.231","transactionId":"8d9e5a50bdaf45439bd91434c1a564ef","error":"","country":"gbr","region":"lnd","city":"london","connectionSpeed":"broadband","metroCode":826044,"latitude":51.5171,"longitude":-0.089804,"postCode":"ec2n 3","countryCode":826,"regionCode":25447,"cityCode":4782,"continentCode":5,"isoCountryCode":"uk","internalCode":1,"areaCodes":"?","countryConfidence":99,"regionConfidence":85,"cityConfidence":80,"postCodeConfidence":30,"gmtOffset":0,"inDst":"n","timeTaken":125}

### Usage
When instantiating the main NetAcuity object you pass in a config object. This must contain a servers section which tells
us which servers you want to pass queries to. If you specify multiple entries then failover will be available in a rather
simple round-robin fashion (ie. when several timeouts happen in close proximity).

    var netacuity = require('node-netacuity');
    var na = new netacuity.NetAcuity({
      port: 10000,
      appId: 3,
      servers: [ { host: "acuity01", port: 5400 }, { host: "acuity02", port: 5400 }  ],
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
      failoverThreshold: 3, //  this many requests each within a failoverWindow of each other triggers a failover
      dns: {
        maxAge: 120000, //  cache servers.host DNS lookups (milliseconds)
        useLookup: true //  see https://github.com/Vibrant-Media/node-dnscache
      },
      cache: {
        max: 10000,     //  for caching, maximum number of entries the cache can hold before less-recently-used items are evicted
        maxAge: 600000  //  for caching, how long something can remain in cache before being expired (in milliseconds)
      }
    };

### Testing

    gulp test

