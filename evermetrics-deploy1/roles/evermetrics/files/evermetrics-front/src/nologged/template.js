var yo = require('yo-yo');

var nologged = yo`<div class="container container-login">
    <div class="row">
      <div class="col l12">
        <div class="row">
          <h1 class="titleNologged"><i class="fa fa-exclamation-triangle" aria-hidden="true"></i>Necesitas iniciar sesión para ver este contenido</h1>
          <div class="contBtnLoggin">
            <a href="/signin" class="btnLoggin">Iniciar sesión</a>
          </div>
        </div>
      </div>
    </div>
  </div>`;

module.exports = nologged;
