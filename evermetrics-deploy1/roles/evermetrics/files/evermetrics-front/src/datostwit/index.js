var yo = require('yo-yo');

module.exports = function(ctx, dato) {
  return yo`<div class="estadisticas cont-twitter">
          <div id="tw${dato.year}${dato.month}" class="col m12 cont-datos tab-content-datos">
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
                    <div class="col m6 cont-variables">
                      <h5>Total seguidores</h5>
                      <p id="count-number" class="timer count-title" data-to="${dato.allfans}" data-speed="1500"></p>
                    </div>
                    <div class="col m6 cont-variables">
                      <h5>Total seguidos</h5>
                      <p id="count-number" class="timer count-title" data-to="${dato.allfollows}" data-speed="1500"></p>
                    </div>
                  </div>
                  <div class="row">
                    <div class="col m6 cont-variables">
                      <h5>Nuevos Seguidores</h5>
                      <p id="count-number" class="timer count-title" data-to="${dato.newfans}" data-speed="1500"></p>
                    </div>
                    <div class="col m6 cont-variables">
                      <h5>Fotos / Videos Globales</h5>
                      <p id="count-number" class="timer count-title" data-to="${dato.globalmedia}" data-speed="1500"></p>
                    </div>
                  </div>
                  <div class="row">
                    <div class="col m12 cont-variables">
                      <h5>Favoritos Globales</h5>
                      <p id="count-number" class="timer count-title" data-to="${dato.globalfavorites}" data-speed="1500"></p>
                    </div>
                  </div>
              <h4>Interacción</h4>
                      <div class="row">
                          <div class="col m4 cont-variables">
                            <h5>Total Tweets</h5>
                            <p id="count-number" class="timer count-title" data-to="${dato.alltweets}" data-speed="1500"></p>
                          </div>
                          <div class="col m4 cont-variables">
                            <h5>Tweets</h5>
                            <p id="count-number" class="timer count-title" data-to="${dato.tweets}" data-speed="1500"></p>

                          </div>
                          <div class="col m4 cont-variables">
                            <h5>Retweets</h5>
                            <p>${dato.retweets}</p>
                          </div>
                      </div>
                      <div class="row">
                          <div class="col m4 cont-variables">
                            <h5>Menciones</h5>
                            <p>${dato.mentions}</p>
                          </div>
                          <div class="col m4 cont-variables">
                            <h5>Favoritos</h5>
                            <p>${dato.favorites}</p>
                          </div>
                          <div class="col m4 cont-variables">
                            <h5>Mensajes Directos</h5>
                            <p>${dato.messagedirects}</p>
                          </div>
                      </div>
               <h4>Otros datos</h4>
                 <div class="row">
                     <div class="col m3 cont-variables">
                       <h5>${dato.hashtags.label1}</h5>
                       <p>${dato.hashtags.cant1}</p>
                     </div>
                     <div class="col m3 cont-variables">
                       <h5>${dato.hashtags.label2}</h5>
                       <p>${dato.hashtags.cant2}</p>
                     </div>
                     <div class="col m3 cont-variables">
                       <h5>${dato.hashtags.label3}</h5>
                       <p>${dato.hashtags.cant3}</p>
                     </div>
                     <div class="col m3 cont-variables">
                       <h5>${dato.hashtags.label4}</h5>
                       <p>${dato.hashtags.cant4}</p>
                     </div>
                 </div>
                 <div class="row">
                     <div class="col m3 cont-variables">
                       <h5>${dato.hashtags.label5}</h5>
                       <p>${dato.hashtags.cant5}</p>
                     </div>
                     <div class="col m3 cont-variables">
                       <h5>${dato.hashtags.label6}</h5>
                       <p>${dato.hashtags.cant6}</p>
                     </div>
                     <div class="col m3 cont-variables">
                       <h5>${dato.hashtags.label7}</h5>
                       <p>${dato.hashtags.cant7}</p>
                     </div>
                     <div class="col m3 cont-variables">
                       <h5>${dato.hashtags.label8}</h5>
                       <p>${dato.hashtags.cant8}</p>
                     </div>
                 </div>
            </div>
  </div>`;
}
