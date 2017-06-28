var yo = require('yo-yo');

var invalid = yo`<div class="container container-login">
    <div class="row">
    <div class="col l12">
          <div class="row">
            <h1 class="titleNologged titleError"><i class="fa fa-exclamation-triangle" aria-hidden="true"></i>Usuario y/o contraseña no es válido</h1>
          </div>
          <div class="contBtnLoggin" style="margin-top:20px !important;">
            <a href="/signin" class="btnLoggin">Volver a intentarlo</a>
          </div>
        </div>
    </div>
  </div>`;

module.exports = invalid;
