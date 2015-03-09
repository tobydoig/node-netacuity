# node-netacuity
NodeJS client for Digital Element's NetAcuity GeoIP Service, specifically for the Edge database queries.

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

### Testing

    npm test

