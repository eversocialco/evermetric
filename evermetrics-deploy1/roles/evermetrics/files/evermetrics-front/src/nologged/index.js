var page = require('page');
var empty = require('empty-element');
var template = require('./template');
var title = require('title');

page('/nologged', function(ctx, next){
  title('Evermetrics - No logged in');
  var main = document.getElementById('main-container');
  empty(main).appendChild(template);
})
