const { Facebook } = require('fb');
const config = require('./config');

const FB = new Facebook(config);
FB.options({version: 'v2.9'});

// Get an longLive access token
const fields = {
  grant_type: 'fb_exchange_token',
  client_id: config.appId,
  client_secret: config.client_secret,
  fb_exchange_token: 'EAAIAb2OuyU8BABuZBxMDEqZBX0tkPhC05zd1hNtDooU2E8twlB7Hj8N0RncCZAmHBdOSEkJSUPySTGZALHP39Q5N6bJ0Q37JKNqw8VnrIF8ZBVMnm0KZAGbvDUIz2BkGcjxyJBh41mfHy0sZAlHr7MnqZC4Lz7xVspdqZAxmA5glWXaIDZBIoauj9WP58JjxhsW9SOabZAsYhZBkZCQZDZD'
};

FB.api('oauth/access_token', fields , (res) => {
  if (!res || res.error) {
    console.log(!res ? 'error occurred' : res.error);
    return;
  }

  FB.setAccessToken(res.access_token)
});

module.exports = { FB };