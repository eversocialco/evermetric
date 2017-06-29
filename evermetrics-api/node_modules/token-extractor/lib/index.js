'use strict';

const TokenExtractorError = require('../lib/error/TokenExtractorError');

/**
 * Extracts access_token from a HTTP request header:
 * Authorization: Bearer <access_token>
 *
 * @param  {Object} req http request
 */
module.exports = function TokenExtractor(req, cb) {
  req = (req || {});

  if (typeof cb != 'function') {
    throw new Error('Second argument must be a function callback');
  }

  let parts;
  let token;

  if (!req.headers || !req.headers.authorization) {
    return cb(new TokenExtractorError({
      status: 401,
      code: 'E_AUTHORIZATION_REQUIRED',
      message: 'No Authorization header is present'
    }));
  }

  parts = req.headers.authorization.split(' ');

  if (!/^Bearer$/.test(parts[0]) || parts.length !== 2) {
    return cb(new TokenExtractorError({
      status: 401,
      code: 'E_AUTHORIZATION_INVALID_FORMAT',
      message: 'Format is :: Authorization: Bearer <token>'
    }));
  }

  token = parts[1];

  if (!token) {
    return cb(new TokenExtractorError({
      status: 401,
      code: 'E_AUTHORIZATION_TOKEN_NOT_FOUND',
      message: 'Authorization token was not found'
    }));
  }

  return cb(null, token);
};
