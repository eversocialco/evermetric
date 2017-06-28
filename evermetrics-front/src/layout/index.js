var yo = require('yo-yo');

module.exports = function layout(content){
  return yo`<div class="content">
     ${content}
    </div>`;
}
