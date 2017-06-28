var page = require('page');
var empty = require('empty-element');
var template = require('./template');
var title = require('title');

page('/upload-dates-web', function(ctx, next){
  title('Evermetrics - Upload Stadistitics Web Analytics');
  var main = document.getElementById('main-container');
  empty(main).appendChild(template);
})
