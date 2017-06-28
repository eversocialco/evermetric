var page = require('page');
var empty = require('empty-element');
var template = require('./template');
var title = require('title');

page('/uploadp', function(ctx, next){
  title('Evermetrics - Upload p');
  var main = document.getElementById('main-container');
  empty(main).appendChild(template);
})
