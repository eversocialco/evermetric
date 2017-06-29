'use strict';

const util = require('util');

function TokenExtractorError(properties) {
  Error.call(this);
  Error.captureStackTrace(this, TokenExtractorError);

  properties = (properties || {});

  this.name = this.constructor.name;
  this.message = properties.message || 'Encountered an unexpected error';

  this.status = properties.status || 500;
  this.code = properties.code || 'E_UNKNOWN';
}

util.inherits(TokenExtractorError, Error);

TokenExtractorError.prototype.toString = function() {
  return util.format('[%s (%s) %s]', this.name, this.code, this.message);
};

TokenExtractorError.prototype.toJSON = function() {
  return {
    status: this.status,
    code: this.code,
    message: this.message
  };
};

module.exports = TokenExtractorError;
