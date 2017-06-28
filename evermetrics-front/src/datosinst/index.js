var yo = require('yo-yo');

module.exports = function(ctx, dato) {
  return yo`<div class="estadisticas cont-instagram">
              <div id="it${dato.year}${dato.month}" class="col m12 cont-datos tab-content-datos it${dato.year}${dato.month}">
                <div class="contHeaderVisual">
                  <div class="contTitleVisual">
                    <h4 class="title-mes">${dato.month} - ${dato.year}</h4>
                  </div>
                  <div class="logo-cliente">
                    <img src="${ctx.auth.src}"  />
                  </div>
                </div>
                <h4>Crecimiento</h4>
                    <div class="row">
                      <div class="col m4 cont-variables">
                        <h5>Total seguidores</h5>
                        <p>${dato.allfans || 0}</p>
                      </div>
                      <div class="col m4 cont-variables">
                        <h5>Total seguidos</h5>
                        <p>${dato.follows || 0}</p>
                      </div>
                      <div class="col m4 cont-variables">
                        <h5>Total post</h5>
                        <p>${dato.allpost || 0}</p>
                      </div>
                    </div>
                    <div class="row">
                      <div class="col m4 cont-variables">
                        <h5>Post mes</h5>
                        <p>${dato.postbymonth || 0}</p>
                      </div>
                      <div class="col m4 cont-variables">
                        <h5>Likes mes</h5>
                        <p>${dato.likebymonth || 0}</p>
                      </div>
                      <div class="col m4 cont-variables">
                        <h5>Comentarios</h5>
                        <p>${dato.comments || 0}</p>
                      </div>
                    </div>
                <h4>Usuarios Principales</h4>
                        <div class="row">
                            <div class="col m4 cont-variables">
                              <h5>${dato.usersppal.userone.nick}</h5>
                              <p>${dato.usersppal.userone.likes} likes</p>
                            </div>
                            <div class="col m4 cont-variables">
                              <h5>${dato.usersppal.usertwo.nick}</h5>
                              <p>${dato.usersppal.usertwo.likes} likes</p>
                            </div>
                            <div class="col m4 cont-variables">
                              <h5>${dato.usersppal.userthree.nick}</h5>
                              <p>${dato.usersppal.userthree.likes} likes</p>
                            </div>
                        </div>
                 <h4>Interacción</h4>
                        <div class="row">
                            <div class="col m8 cont-variables">
                              <img src="${dato.topposts.src}"  />
                            </div>
                            <div class="col m4 cont-variables">
                              <h5>Post con mayor likes</h5>
                              <p>  1. ${dato.topposts.likesone} likes<br>2. ${dato.topposts.likestwo} likes<br>3. ${dato.topposts.likesthree} likes</p>
                            </div>
                        </div>
              </div>
  </div>`;
}
