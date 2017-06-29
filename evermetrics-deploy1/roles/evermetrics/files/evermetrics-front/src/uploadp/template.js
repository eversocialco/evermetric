var yo = require('yo-yo');
var landing = require('../landing');
var request = require('superagent')

var upform = yo`<div class="col l12">
      <div class="row">
        <div class="signup-box">
        <form class="signup-form" action="/api/prueba" method="POST" enctype="multipart/form-data">
        <input type="file" name="filep" />
        <input type="submit" value="Upload Image" name="submit">
        </form>

        </div>
      </div>
      <div class="row">
        <a href="/">Volver a la cuenta</a>
      </div>
    </div>`;


module.exports = landing(upform);
