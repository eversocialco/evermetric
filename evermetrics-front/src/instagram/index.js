var page = require('page');
var empty = require('empty-element');
var template = require('./template');
var title = require('title');

page('/instagram', function(ctx, next){
  title('Evermetrics - Get Data from Instagram');
  var main = document.getElementById('main-container');
  empty(main).appendChild(template);
});
