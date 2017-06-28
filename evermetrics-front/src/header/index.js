var yo = require('yo-yo');
var empty = require('empty-element');

var authCard = function (ctx) {

  var authenticated = yo`<div class="col m9 cont-header">
    <div class="col m5 push-m7 cont-user authmenu">
      <p>¡Hola! @${ctx.auth.name}</p> <a href="/logout" rel="external"><i class="fa fa-sign-out" aria-hidden="true"></i>Salir</a>

    </div>
    </div>`

  var signin = yo`  <div class="col m9 cont-header">
      <div class="col m3 push-m9 cont-user">
        <a href="#" data-activates="drop-users" class="dropdown-button" style="line-height: 29px">
        <i class="fa fa-bars small icon-st" aria-hidden="true"></i></a>
        <ul id="drop-users" class="dropdown-content">
             <li><a class='dropdown-button' href='/signin' data-activates='dropdown1'><h5>Inicia sesión</h5></a></li>
        </ul>
      </div>
    </div>`

  if (ctx.auth) {
    return authenticated
  } else {
    return signin
  }
}

var renderHeader = function (ctx){
  return yo`<div class="container">
        <div class="row row-header">
          <div class="col m3 cont-logo">
            <a class="logo" href="/"><img src="logo-evermetrics-blanco.png"/></a>
          </div>
          ${authCard(ctx)}
        </div>
      </div>`;

}

module.exports = function(ctx, next){
    var container = document.getElementById('header-container');
    empty(container).appendChild(renderHeader(ctx));
    next();
}
