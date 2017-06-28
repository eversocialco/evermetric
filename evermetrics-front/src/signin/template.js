var yo = require('yo-yo');
var landing = require('../landing');

var loginform = yo`<div class="col l12">
      <div class="row">
        <div class="signup-box">
          <form class="signup-form" action="/login" method="POST">
            <div class="section cont-form-login" style="text-align:center;">
              <input type="text" name="username" placeholder="Nombre de usuario">
              <input type="password" name="password" placeholder="Contraseña">
              <button class="btn waves-effect waves-light btn-login" type="submit">Iniciar sesión</button>
            </div>
          </form>
        </div>
        <div class="row hide">
          <a href="/signup">No tienes una cuenta</a>
        </div>
      </div>
    </div>`;

module.exports = landing(loginform);
