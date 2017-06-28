var yo = require('yo-yo');

module.exports = function(ctx, dato) {
  return yo`<div class="estadisticas">
       <div id="fb${dato.year}${dato.month}" class="col m12 cont-datos tab-content-datos">
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
                 <h5><i class="fa fa-users" aria-hidden="true"></i> Fans Totales</h5>
                 <p id="count-number" class="timer count-title" data-to="${dato.allfans || 0}" data-speed="1500"></p>
               </div>
               <div class="col m4 cont-variables">
                 <h5><i class="fa fa-thumbs-o-up" aria-hidden="true"></i> Fans Nuevos</h5>
                 <p id="count-number" class="timer count-title" data-to="${dato.newfans || 0}" data-speed="1500"></p>
               </div>
               <div class="col m4 cont-variables">
                 <h5><i class="fa fa-thumbs-o-down" aria-hidden="true"></i> No me Gusta</h5>
                 <p id="count-number" class="timer count-title" data-to="${dato.nolikes || 0}" data-speed="1500"></p>
               </div>
             </div>
             <div class="row">
               <div class="col m4 cont-variables">
                 <h5><i class="fa fa-exchange" aria-hidden="true"></i> Impresión</h5>
                 <p id="count-number" class="timer count-title" data-to="${dato.prints || 0}" data-speed="1500"></p>
               </div>
               <div class="col m4 cont-variables">
                 <h5><i class="fa fa-user" aria-hidden="true"></i> Usuarios Activos</h5>
                 <p id="count-number" class="timer count-title" data-to="${dato.activeusers || 0}" data-speed="1500"></p>
               </div>
               <div class="col m4 cont-variables">
                 <h5><i class="fa fa-thumbs-o-up" aria-hidden="true"></i> Me Gusta (promedio x día)</h5>
                 <p id="count-number" class="timer count-title" data-to="${dato.likebyday || 0}" data-speed="1500"></p>
               </div>
             </div>
             <div class="row">
               <div class="col m6 cont-variables">
                 <h5><i class="fa fa-newspaper-o" aria-hidden="true"></i> Post en el mes</h5>
                 <p id="count-number" class="timer count-title" data-to="${dato.postbymonth || 0}" data-speed="1500"></p>
               </div>
               <div class="col m6 cont-variables">
                 <h5><i class="fa fa-line-chart" aria-hidden="true"></i> Alcance (promedio por día)</h5>
                 <p id="count-number" class="timer count-title" data-to="${dato.scopebyday || 0}" data-speed="1500"></p>
               </div>
             </div>

         <h4>Interacción</h4>
           <div class="row">
             <div class="col m6 cont-variables">
               <h5><i class="fa fa-external-link" aria-hidden="true"></i> Referencias Externas</h5>
               <p id="count-number" class="timer count-title" data-to="${dato.externalreference || 0}" data-speed="1500"></p>
             </div>
             <div class="col m6 cont-variables">
               <h5><i class="fa fa-window-restore" aria-hidden="true"></i> Vistas Pestañas</h5>
               <p id="count-number" class="timer count-title" data-to="${dato.viewswindows || 0}" data-speed="1500"></p>
             </div>
           </div>
           <div class="row">
             <div class="col m6 cont-variables">
               <h5><i class="fa fa-window-maximize" aria-hidden="true"></i> Principales Pestañas</h5>
               <p>${dato.topwindows || 0}</p>
             </div>
             <div class="col m6 cont-variables">
               <h5><i class="fa fa-link" aria-hidden="true"></i> Principales Referencias</h5>
               <p>${dato.topreference || 0}</p>
             </div>
           </div>
         <h4>Contenido</h4>
           <div class="row">
               <div class="col m6 cont-variables">
                 <h5><i class="fa fa-picture-o" aria-hidden="true"></i> Post más efectivo</h5>
                 <img src="${dato.postsrc}" style="width:100%" />
               </div>
               <div class="col m6 cont-variables">
                 <h5><i class="fa fa-file-text-o" aria-hidden="true"></i> Datos del post</h5>
                 <p>${dato.datespost}</p>
               </div>
           </div>
       </div>
  </div>`;
}
