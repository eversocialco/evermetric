var page = require('page');
var empty = require('empty-element');
var template = require('./template');
var title = require('title');

page('/update-datesfb', function(ctx, next){
  title('Evermetrics - Update Dates from Facebook');
  var main = document.getElementById('main-container');
  empty(main).appendChild(template);
})
