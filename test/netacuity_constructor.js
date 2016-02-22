/*
  The MIT License (MIT)

  Copyright (c) 2015 Vibrant Media Ltd
*/
'use strict';

var expect = require('chai').expect;
var assert = require('assert');
var netacuity = require('../src/netacuity');
var NetAcuity = netacuity.NetAcuity;
var EdgeRecord = netacuity.EdgeRecord;

describe('NetAcuity', function() {
  it('should throw exception if no config passed', function() {
    expect(function() {
      new NetAcuity();
    }).to.throw();
  });
  
  it('should throw exception if config.servers missing', function() {
    expect(function() {
      new NetAcuity({});
    }).to.throw();
  });
  
  it('should throw exception if config.servers is not an array', function() {
    expect(function() {
      new NetAcuity({servers:{}});
    }).to.throw();
  });
  
  it('should throw exception if config.servers entry is missing host', function() {
    expect(function() {
      new NetAcuity({
        servers:[{}]
      });
    }).to.throw();
  });
  
  it('should throw exception if config.servers entry is missing host', function() {
    expect(function() {
      new NetAcuity({
        servers:[{port:1234}]
      });
    }).to.throw();
  });
  
  it('should throw exception if config.servers entry has blank host', function() {
    expect(function() {
      new NetAcuity({
        servers:[{host:''}]
      });
    }).to.throw();
  });
  
  it('should throw exception if config.servers contains one bad entry', function() {
    expect(function() {
      new NetAcuity({
        servers:[{host:'host1', port:1234}, {host:'host2'}, {port:1234}, {host:'host3'} ]
      });
    }).to.throw();
  });
  
  it('should not throw exception if all config.servers entries are valid', function() {
    expect(function() {
      new NetAcuity({
        servers:[{host:'host1', port:1234}, {host:'host2'}]
      });
    }).to.not.throw();
  });
  
  describe('NetAcuity.EdgeRecord', function() {
    it('should accept parameterless constructor', function() {
      expect(function() {
        new EdgeRecord();
      }).to.not.throw();
    });
    
    it('should accept empty array constructor', function() {
      expect(function() {
        new EdgeRecord([]);
      }).to.not.throw();
    });
    
    it('test sameAs', function() {
      var tmpl = [ 1, '2', '3', '4', '5', '6', '7', '8', 9, 10.0, 11.0, '12', 13, 14, 15, 16, '17', 18, '19', 20, 21, 22, 23, 24, 'y' ];
      var er1 = new EdgeRecord();
      var er2 = new EdgeRecord();
      
      assert (er1.sameAs(er2));
      assert (er2.sameAs(er1));

      er1 = new EdgeRecord(tmpl);
      assert(!er1.sameAs(er2));
      
      er2 = new EdgeRecord(tmpl);
      assert(er1.sameAs(er2));
    });
    
    it('test toString', function() {
      var tmpl = [ 1, '2', '3', '4', '5', '6', '7', '8', 9, 10.0, 11.0, '12', 13, 14, 15, 16, '17', 18, '19', 20, 21, 22, 23, 24, 'y' ];
      var er1 = new EdgeRecord(tmpl);
      var er2 = new EdgeRecord(tmpl);
      
      assert.equal(er1.toString(), tmpl.join(';') + ';');
      assert.equal(er1.toString(), er2.toString());
    });
    
    it('test exposed properties', function() {
      var tmpl = [ 1, '2', '3', '4', '5', '6', '7', '8', 9, 10.0, 11.0, '12', 13, 14, 15, 16, '17', 18, '19', 20, 21, 22, 23, 24, 'y' ];
      var er = new EdgeRecord(tmpl);
      
      assert.equal(er.apiVersion,          tmpl[ 0]);
      assert.equal(er.ip,                  tmpl[ 1]);
      assert.equal(er.transactionId,       tmpl[ 2]);
      assert.equal(er.error,               tmpl[ 3]);
      assert.equal(er.country,             tmpl[ 4]);
      assert.equal(er.region,              tmpl[ 5]);
      assert.equal(er.city,                tmpl[ 6]);
      assert.equal(er.connectionSpeed,     tmpl[ 7]);
      assert.equal(er.metroCode,           tmpl[ 8]);
      assert.equal(er.latitude,            tmpl[ 9]);
      assert.equal(er.longitude,           tmpl[10]);
      assert.equal(er.postCode,            tmpl[11]);
      assert.equal(er.countryCode,         tmpl[12]);
      assert.equal(er.regionCode,          tmpl[13]);
      assert.equal(er.cityCode,            tmpl[14]);
      assert.equal(er.continentCode,       tmpl[15]);
      assert.equal(er.isoCountryCode,      tmpl[16]);
      assert.equal(er.internalCode,        tmpl[17]);
      assert.equal(er.areaCodes,           tmpl[18]);
      assert.equal(er.countryConfidence,   tmpl[19]);
      assert.equal(er.regionConfidence,    tmpl[20]);
      assert.equal(er.cityConfidence,      tmpl[21]);
      assert.equal(er.postCodeConfidence,  tmpl[22]);
      assert.equal(er.gmtOffset,           tmpl[23]);
      assert.equal(er.inDst,               tmpl[24]);
    });
  });
});
