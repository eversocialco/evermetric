var page = require('page');
var empty = require('empty-element');
var template = require('./template');
var title = require('title');

page('/userinvalid', function(ctx, next){
  title('Evermetrics - Invalid user');
  var main = document.getElementById('main-container');
  empty(main).appendChild(template);
})
