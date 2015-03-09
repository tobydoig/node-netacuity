'use strict'

var dgram = require('dgram');
var assert = require('assert');
var netacuity = require('../src/netacuity');
var MockNetAcuityServer = require('./MockNetAcuityServer');

describe('NetAcuity.MockNetAcuityServer', function() {
  it('should send a message to our mock server and receive the response', function(done) {
    var EXPECTED_COUNTRY = 'nicecarpet';
    var EXPECTED_IP = '1.2.3.4';
    var TIMEOUT = 50;
    var failed = true;
    
    //  make our server async
    var server = new MockNetAcuityServer(20000, function listenCallback(err) {
      assert(!err);
      
      //  now the socket is listening we can create our client
      var na = new netacuity.NetAcuity({
        servers: [{host: 'localhost', port: server.address().port}],
        timeout: TIMEOUT
      });
      
      //  and issue a request. our mock server has a udp socket open and listening
      //  for requests, and our client also has one open listening for responses.
      na.get(EXPECTED_IP, function(err, edge) {
        assert(!err);
        assert(edge.ip === EXPECTED_IP);
        assert(edge.country === EXPECTED_COUNTRY);
        
        //  this test worked. the timeout below will harvest the result.
        failed = false;
      });
      
      //  use a timeout to give the above query a chance to complete.
      setTimeout(function() {
        //  and now cleanup
        na.close(function() {
          this.close();
          done(failed ? 'expected response not received' : undefined);
        }.bind(this));
      }.bind(this), TIMEOUT * 2);
    }, function onmessage(query, rinfo) {
      //  query = EdgeQuery object
      //  we will respond with an EdgeRecord
      var edge = new netacuity.EdgeRecord();
      
      edge.ip = query.ip;
      edge.transactionId = query.transactionId;
      
      if (query.ip !== EXPECTED_IP) {
        edge.error = 'unexpected ip';
      } else {
        edge.country = EXPECTED_COUNTRY;
      }
      
      this.send(edge, rinfo.address, rinfo.port, function(err) {
        assert(!err);
      }.bind(this));
    });
  });
  
  it('should simulate a failover using 2 servers', function(done) {
    var TIMEOUT = 50;
    var message = '';
    
    //  setup 2 mock servers, pass these into the client
    //  then perform some lookups after killing one of the servers
    //  after which we should see the second server handling requests.
    var server1 = new MockNetAcuityServer(20000, function listenCallback1(err) {
      var server2 = new MockNetAcuityServer(20001, function listenCallback2(err) {
        //  both mock servers now listening
        //  create client pointing to both servers
        var na = new netacuity.NetAcuity({
          servers: [{host: 'localhost', port: server1.address().port}, {host: 'localhost', port: server2.address().port}],
          timeout: TIMEOUT,
          failoverWindow: 200,
          failoverThreshold: 2
        });
        
        //  do a lookup - server1 should be queried
        na.get('1.2.3.4', function(err, edge) {
          assert(!err);
          assert(edge.ip === '1.2.3.4');
          
          //  close server1 and do another lookup
          server1.close(function() {
            //  so this lookup should fail because server1 won't respond
            na.get('2.3.4.5', function(err, edge) {
              assert(err);
              //  this lookup should also fail because we want 2 errors to happen before failover
              na.get('3.4.5.6', function(err, edge) {
                assert(err);
                //  and now we do the lookup again, this should go to server2
                na.get('4.5.6.7', function(err, edge) {
                  assert(!err);
                  assert(edge.ip === '4.5.6.7');
                  // test is done
                  setTimeout(function() {
                    na.close(function() {
                      server2.close();
                      /* NOTE - in the above we sent 3 messages in sequence whereas in production
                       * under load you would actually get several requests all coming in at the
                       * same time, so when a server fails you would actually see several failed
                       * lookups because though the first 2 (or whatever) triggers it there are
                       * still several in flight that started before the trigger.
                       */
                      done(message === ':server1:1.2.3.4:server2:4.5.6.7' ? undefined : 'responses not right');
                    });
                  }, TIMEOUT * 2);
                });
              });
            });
          });
        });
      }, function onmessage2(query, rinfo) {
        //  server 2 received a request
        var edge = new netacuity.EdgeRecord();
        
        edge.ip = query.ip;
        edge.transactionId = query.transactionId;
        message += ':server2:' + query.ip;
        
        server2.send(edge, rinfo.address, rinfo.port);
      });
    }, function onmessage1(query, rinfo) {
      //  server 1 received a request
      var edge = new netacuity.EdgeRecord();
      
      edge.ip = query.ip;
      edge.transactionId = query.transactionId;
      message += ':server1:' + query.ip;
      
      server1.send(edge, rinfo.address, rinfo.port);
    });
  });
});
