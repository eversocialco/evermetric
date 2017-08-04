const { Facebook } = require('fb');
const { config } = require('./config');

const FB = new Facebook(config);
FB.options({version: 'v2.9'});

FB.setAccessToken('EAACEdEose0cBANuiHNnjpVhUEzXgp2HZBQP8dxFdKkZCqZB2OldYUmO05WJ4v7M2mlJmMZCd093fNDDxLWquerxpK3e8BdbKCamIXthDbnmqPaGRBzCW4krMKI8c1bxvjDmnxj5cR7tiO5sVC48E0HzAWtuRUcJM3PNPPuhXp18SOwlTGNwTBYAe72oeLQAZD');

module.exports = { FB };