'use strict';

const assert = require('assert');
const tokenExtractor = require('../lib/index');

describe('token-extractor', function() {
  let token = new Buffer('sometoken').toString('base64');

  describe('Work tests', function() {
    const req = {};

    it('should extract token from authorization header', function(done) {
      req.headers = {
        authorization: 'Bearer ' + token
      };

      tokenExtractor(req, function(err, extractedToken) {
        assert.ifError(err);
        assert.equal(token, extractedToken);

        done();
      });
    });
  });

  describe('Failure tests', function() {
    const req = {};

    it('should throw if second argument is not a function', function() {
      try {
        tokenExtractor(null, 'invalid_callback');
      } catch (err) {
        assert.ok(err);
        assert(/Second argument must be a function callback/.test(err));
      }
    });

    it('should return Error if NO authorization header is present', function(done) {
      req.headers = {};

      tokenExtractor(req, function(err) {
        assert.ok(err);
        assert.equal(err.code, 'E_AUTHORIZATION_REQUIRED');

        done();
      });
    });

    it('should return Error if authorization header format is invalid', function(done) {
      req.headers = {
        authorization: 'Bearer' + token
      };

      tokenExtractor(req, function(err) {
        assert.ok(err);
        assert.equal(err.code, 'E_AUTHORIZATION_INVALID_FORMAT');

        done();
      });
    });

    it('should return Error if token is not present in authorization header', function(done) {
      req.headers = {
        authorization: 'Bearer '
      };

      tokenExtractor(req, function(err) {
        assert.ok(err);
        assert.equal(err.code, 'E_AUTHORIZATION_TOKEN_NOT_FOUND');

        done();
      });
    });
  });
});
