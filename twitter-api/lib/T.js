/**
 * @desc Here is the basic (and required) information about the twitter app
 * for access the twitter API
 * @author Juan José Arboleda <soyjuanarbol@gmail.com>
 */
const Twit = require('twit');

const T = new Twit({
  consumer_key: 'RRrt4dyGTmzk9eevitwhkA',
  consumer_secret: 'quowToLUhWOE1T9CkuikKKFIp03nZjnbwCrj5GJkHgM',
  access_token: '136516227-T3P619nUCNDOnnOXGZz5302OMQjTA2Bm5YeKfgta',
  access_token_secret: 'YgXlSvlFVYMulmOZKlLh7s4Hy6yUk2yGSyxuJfRgUcE',
});

module.exports = T;