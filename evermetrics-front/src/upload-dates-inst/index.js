var page = require('page');
var empty = require('empty-element');
var template = require('./template');
var title = require('title');

page('/upload-dates-inst', function(ctx, next){
  title('Evermetrics - Upload Stadistitics Instagram');
  var main = document.getElementById('main-container');
  empty(main).appendChild(template);
})
