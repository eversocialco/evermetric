var page = require('page');
var empty = require('empty-element');
var template = require('./template');
var title = require('title');

page('/upload-dates', function(ctx, next){
  title('Evermetrics - Upload Stadistitics');
  var main = document.getElementById('main-container');
  empty(main).appendChild(template);
})
