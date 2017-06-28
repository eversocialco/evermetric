var page = require('page');
var empty = require('empty-element');
var template = require('./template');
var title = require('title');

page('/upload-dates-tw', function(ctx, next){
  title('Evermetrics - Upload Stadistitics Twitter');
  var main = document.getElementById('main-container');
  empty(main).appendChild(template);
})
