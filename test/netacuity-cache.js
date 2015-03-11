'use strict'

var assert = require('assert');
var netacuity = require('../src/netacuity');
var NetAcuityCache = require('../src/netacuity-cache');
var MockNetAcuityServer = require('./MockNetAcuityServer');

describe('NetAcuity-Cache', function() {
  it('should perform lookups via the cache', function(done) {
    var EXPECTED_IP = '1.2.3.4';
    var TIMEOUT = 50;
    var failed = true;
    
    //  make our server async
    var server = new MockNetAcuityServer(20000, function listenCallback(err) {
      assert(!err);
      
      //  now create our cache (which will internally create a netacuity module)
      var cache = new NetAcuityCache({
        servers: [{host: 'localhost', port: server.address().port}],
        timeout: TIMEOUT,
        cache: {
          max: 10,
          maxAge: 1000 * 5
        }
      });
      
      //  perform first lookup
      cache.get(EXPECTED_IP, function(err, edge) {
        assert(!err);
        assert(edge.ip === EXPECTED_IP);
        
        //  now shutdown the mock server and do the same lookup again
        //  as the result should come from cache
        server.close(function() {
          server = undefined;
          cache.get(EXPECTED_IP, function(err, edge) {
            assert(!err);
            assert(edge.ip === EXPECTED_IP);
            
            //  now shutdown the cache
            cache.close(function() {
              //  this test worked. the timeout below will harvest the result.
              cache = undefined;
              failed = false;
            });
          });
        });
      });
      
      //  use a timeout to give the above a chance to complete.
      setTimeout(function() {
        server && server.close();
        cache && cache.close();
        process.nextTick(function() {
          done(failed ? 'expected response not received' : undefined);
        });
      }, TIMEOUT * 10);
    }, function onmessage(query, rinfo) {
      //  query = EdgeQuery object
      //  we will respond with an EdgeRecord
      var edge = new netacuity.EdgeRecord();
      
      edge.ip = query.ip;
      edge.transactionId = query.transactionId;
      
      this.send(edge, rinfo.address, rinfo.port, function(err) {
        assert(!err);
      }.bind(this));
    });
  });
});
