# node-token-extractor

[![npm version](https://badge.fury.io/js/token-extractor.svg)](https://badge.fury.io/js/token-extractor)

Extracts `access_token` from a HTTP request header `Authorization: Bearer <access_token>`

## Install

```
$ npm install token-extractor --save
```

## Usage

### tokenExtractor(req, callback)

**Arguments**

* `req`: HTTP Node.js request
* `callback(err, token)`: A callback which is called with either the token extracted from the header or a possible error.

**Example**

```javascript
const tokenExtractor = require('token-extractor');

tokenExtractor(req, (err, token) => {
  if (err) {
    // handle error
  }

  console.log(token); // token extracted from HTTP header
});
```

## Error handling

### TokenExtractorError

**Possible thrown errors**

| message                                         | code                                 |
| ----------------------------------------------- |:------------------------------------:|
| No Authorization header is present              | `E_AUTHORIZATION_REQUIRED`           |
| Format is :: Authorization: Bearer <token>      | `E_AUTHORIZATION_INVALID_FORMAT`     |
| Authorization token was not found               | `E_AUTHORIZATION_TOKEN_NOT_FOUND`    |

**Example**

Suppose `E_AUTHORIZATION_TOKEN_NOT_FOUND` error was thrown

```javascript
tokenExtractor(req, (err, token) => {
  if (err) {
    console.log(err.toJSON());
    /*
      {
        status: 401,
        message: 'Authorization token was not found',
        code: 'E_AUTHORIZATION_TOKEN_NOT_FOUND'
      }
    */

    console.log(err.toString());
    /*
      [TokenExtractedError (E_AUTHORIZATION_TOKEN_NOT_FOUND) Authorization token was not found]
    */

    console.trace(err);
    /*
      prints Error Stack since err instanceof Error
    */
  }
}));
```

## Test

```
$ npm test
```
