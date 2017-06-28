'use strict'
var yo = require('yo-yo');
var layout = require('../layout');
var vistadato = require('../picture-card');
var vistaano = require('../datosano');
var menumonth = require('../menu-lateral-mes');
var menuano = require('../menu-lateral-ano');
var vistainst = require('../datosinst');
var vistawebano = require('../datosanoweb');
var vistamonthweb = require('../datosmonthweb');
var vistatw = require('../datostwit');
var anoatc = [];
var anoatcinst = [];
var anoatcweb = [];
var anoatctw = [];
var anomes;
var anomesins;
var anomesweb;
var anomestw;
var useract;
var contfb = 0;
var conttw = 0;
var contweb = 0;
var contins = 0;
var mostrardatostw = 0;
var mostrardatosweb = 0;
var mostrardatosfb = 0;
var mostrardatosinst = 0;
var redesv = [];
var hay = 0;
var noDatesUser = 1;

module.exports = function (ctx, dates) {

/*  if (!Array.isArray(dates)) { dates = [];}

  console.log(dates)
  for(var i in dates){
    console.log(dates.dato);
  }*/

  var authenticated = yo`<div class="container timeline cont-estadisticas">
  <div id="top-menu" class="container">
      <div class="row">
        <div class="col m7 contNavRedes">
          <ul class="tabs-menu-redes">
            <li class="current facebook"><a href=".facebook"><i class="fa fa-facebook" aria-hidden="true"></i>Facebook</a></li>
            <li class="instagram"><a href=".instagram"><i class="fa fa-instagram" aria-hidden="true"></i>Instagram</a></li>
            <li class="twitter"><a href=".twitter"><i class="fa fa-twitter" aria-hidden="true"></i>Twitter</a></li>
            <li class="web"><a href=".web"><i class="fa fa-globe" aria-hidden="true"></i>Website</a></li>
          </ul>
        </div>
          ${loadMenuFb(ctx, dates)}
          ${loadMenuInst(ctx, dates)}
          ${loadMenuTwit(ctx, dates)}
          ${loadMenuWeb(ctx, dates)}
      </div>
  </div>
  <div id="stadistitics-container" class="cont-redes tab-content">
    <div id="facebook" class="facebook row tab-content-redes" style="display:block" >
        ${loadDatesFb(ctx, dates)}
        <div class="col m12 cont-datos tab-content-datos default">
          <div class="title-error"><i class="fa fa-exclamation-triangle" aria-hidden="true"></i><p>Selecciona un mes para <span class="anoposi"></span></p></div>
        </div>
    </div>

    <div id="instagram" class="instagram row tab-content-redes">
        ${loadDatesInst(ctx, dates)}
        <div class="col m12 cont-datos tab-content-datos default">
          <div class="title-error"><i class="fa fa-exclamation-triangle" aria-hidden="true"></i><p>Selecciona un mes para <span class="anoposi"></span></p></div>
        </div>
    </div>
    <div id="twitter" class="twitter row tab-content-redes">
        ${loadDatesTw(ctx, dates)}
        <div class="col m12 cont-datos tab-content-datos default">
          <div class="title-error"><i class="fa fa-exclamation-triangle" aria-hidden="true"></i><p>Selecciona un mes para <span class="anoposi"></span></p></div>
        </div>
    </div>
    <div id="web" class="web row tab-content-redes">
        ${loadDatesWeb(ctx, dates)}
        <div class="col m12 cont-datos tab-content-datos default">
          <div class="title-error"><i class="fa fa-exclamation-triangle" aria-hidden="true"></i><p>Selecciona un mes para <span class="anoposi"></span></p></div>
        </div>
    </div>

  </div>
  </div>`

  var signin = yo`<div class="container container-login">
      <div class="row">
        <div class="col l12">
          <div class="row contLogoLanding">
            <img src="logo-evermetrics.png"/>
          </div>
        </div>
        <div class="col l12">
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
          </div>
      </div>
    </div>`

  if (ctx.auth) {
    return layout(authenticated);
  } else {
    return layout(signin);
  }

}


function loadDatesInst(ctx, dates){
  var red = "inst";
  for(var i in dates){
    if(dates[i].userId === ctx.auth.username){
     hay = buscardatos(ctx, dates, red);
     if(hay === 1){
       hay = 0;
       ++mostrardatosinst
       if(mostrardatosinst === 1){
         return yo`<div class="cont-meses">
            ${loadViewTabs(ctx, dates, red)}
         </div>`
       }
     }else if (hay === 2){
        hay = 0;
        ++contins
        if(contins === 1){
          return yo`<h1 class="title-error"><i class="fa fa-exclamation-triangle" aria-hidden="true"></i>No existen datos</h1>`
        }
     }
     noDatesUser = 0;
    }else{
      noDatesUser = 1;
    }
  }
  if(noDatesUser===1){
    return yo`<h1 class="title-error"><i class="fa fa-exclamation-triangle" aria-hidden="true"></i>No existen datos</h1>`
  }

}

function loadMenuInst(ctx, dates){
   var red = "inst";
   for(var i in dates){
     if(dates[i].userId === ctx.auth.username){
       hay = buscardatos(ctx, dates, red);
       if(hay === 1){
        hay = 0;
        var mostrarItemsInst = 0;
        ++mostrarItemsInst;
        if(mostrarItemsInst === 1){
          return yo`<div class="instagram col m5 tab-content-redesm">
          <div class="contNavTabs">
            <div class="col m4 offset-m4 itemNavTabs">
              <input type="button" data-activates="drop-anoinst" class="dropdown-button" value="Año" /><span class="btnano"></span>
              <ul id="drop-anoinst" class="dropdown-content">
                ${loadMenuYear(ctx, dates, 'it')}
              </ul>
            </div>
            <div class="col m4 itemNavTabs">
              <input type="button" data-activates="drop-mesinst" class="dropdown-button" value="Mes" />
              <ul id="drop-mesinst" class="dropdown-content">
                ${loadMenuMonths(ctx, dates, 'it')}
              </ul>
            </div>
          </div></div>`
        }
      }
     }
   }
}

function loadDatesFb(ctx, dates){
   var red = "fb";
   for(var i in dates){
     if(dates[i].userId === ctx.auth.username){
      hay = buscardatos(ctx, dates, red);
      if(hay === 1){
        hay = 0;
        ++mostrardatosfb
        if(mostrardatosfb === 1){
          return yo`<div class="cont-meses">
             ${loadViewTabs(ctx, dates, red)}
          </div>`
        }
      }else if (hay === 2){
         hay = 0;
         ++contfb
         if(contfb === 1){
           return yo`<h1 class="title-error"><i class="fa fa-exclamation-triangle" aria-hidden="true"></i>No existen datos</h1>`
         }
      }
      noDatesUser = 0;
     }else{
       noDatesUser = 1;
     }
   }
   if(noDatesUser===1){
     return yo`<h1 class="title-error"><i class="fa fa-exclamation-triangle" aria-hidden="true"></i>No existen datos</h1>`
   }
}

function loadMenuFb(ctx, dates){
   var red = "fb";
   for(var i in dates){
     if(dates[i].userId === ctx.auth.username){
       hay = buscardatos(ctx, dates, red);
       if(hay === 1){
        hay = 0;
        var mostrarItemsfb = 0;
        ++mostrarItemsfb;
        if(mostrarItemsfb === 1){
          return yo`<div class="facebook col m5 tab-content-redesm" style="display:block">
          <div class="contNavTabs">
            <div class="col m4 offset-m4 itemNavTabs">
              <input type="button" data-activates="drop-ano" class="dropdown-button" value="Año" /><span class="btnano"></span>
              <ul id="drop-ano" class="dropdown-content">
                ${loadMenuYear(ctx, dates, red)}
              </ul>
            </div>
            <div class="col m4 itemNavTabs">
              <input type="button" data-activates="drop-mes" class="dropdown-button" value="Mes" />
              <ul id="drop-mes" class="dropdown-content">
                ${loadMenuMonths(ctx, dates, red)}
              </ul>
            </div>
          </div></div>`
        }
      }
     }
   }
}

function loadMenuWeb(ctx, dates){
   var red = "web";
   for(var i in dates){
     if(dates[i].userId === ctx.auth.username){
       hay = buscardatos(ctx, dates, red);
       if(hay === 1){
        hay = 0;
        var mostrarItemsweb = 0;
        ++mostrarItemsweb;
        if(mostrarItemsweb === 1){
          return yo`<div class="web col m5 tab-content-redesm">
          <div class="contNavTabs">
            <div class="col m4 offset-m4 itemNavTabs">
              <input type="button" data-activates="drop-anoweb" class="dropdown-button" value="Año" /><span class="btnano"></span>
              <ul id="drop-anoweb" class="dropdown-content">
                ${loadMenuYear(ctx, dates, 'wb')}
              </ul>
            </div>
            <div class="col m4 itemNavTabs">
              <input type="button" data-activates="drop-mesweb" class="dropdown-button" value="Mes" />
              <ul id="drop-mesweb" class="dropdown-content">
                ${loadMenuMonths(ctx, dates, 'wb')}
              </ul>
            </div>
          </div></div>`
        }
      }
     }
   }
}

function loadDatesTw(ctx, dates){
  var red = "tw";
  for(var i in dates){
    if(dates[i].userId === ctx.auth.username){
     hay = buscardatos(ctx, dates, red);
     if(hay === 1){
       hay = 0;
       ++mostrardatostw
       if(mostrardatostw === 1){
         return yo`<div class="cont-meses">
            ${loadViewTabs(ctx, dates, red)}
         </div>`
       }
     }else if (hay === 2){
        hay = 0;
        ++conttw
        if(conttw === 1){
          return yo`<h1 class="title-error"><i class="fa fa-exclamation-triangle" aria-hidden="true"></i>No existen datos</h1>`
        }
     }
     noDatesUser = 0;
    }else{
      noDatesUser = 1;
    }
  }
  if(noDatesUser===1){
    return yo`<h1 class="title-error"><i class="fa fa-exclamation-triangle" aria-hidden="true"></i>No existen datos</h1>`
  }
}

function loadMenuTwit(ctx, dates){
   var red = "tw";
   for(var i in dates){
     if(dates[i].userId === ctx.auth.username){
       hay = buscardatos(ctx, dates, red);
       if(hay === 1){
        hay = 0;
        var mostrarItemstw = 0;
        ++mostrarItemstw;
        if(mostrarItemstw === 1){
          return yo`<div class="twitter col m5 tab-content-redesm">
          <div class="contNavTabs">
            <div class="col m4 offset-m4 itemNavTabs">
              <input type="button" data-activates="drop-anotw" class="dropdown-button" value="Año" /><span class="btnano"></span>
              <ul id="drop-anotw" class="dropdown-content">
                ${loadMenuYear(ctx, dates, red)}
              </ul>
            </div>
            <div class="col m4 itemNavTabs">
              <input type="button" data-activates="drop-mestw" class="dropdown-button" value="Mes" />
              <ul id="drop-mestw" class="dropdown-content">
                ${loadMenuMonths(ctx, dates, red)}
              </ul>
            </div>
          </div></div>`
        }
      }
     }
   }
}

function loadDatesWeb(ctx, dates){
  var red = "web";
  for(var i in dates){
    if(dates[i].userId === ctx.auth.username){
     hay = buscardatos(ctx, dates, red);
     if(hay === 1){
       hay = 0;
       ++mostrardatosweb
       if(mostrardatosweb === 1){
         return yo`<div class="cont-meses">
            ${loadViewTabs(ctx, dates, red)}
         </div>`
       }
     }else if (hay === 2){
        hay = 0;
        ++contweb
        if(contweb === 1){
          return yo`<h1 class="title-error"><i class="fa fa-exclamation-triangle" aria-hidden="true"></i>No existen datos</h1>`
        }
     }
     noDatesUser = 0;
    }else{
      noDatesUser = 1;
    }
  }
  if(noDatesUser===1){
    return yo`<h1 class="title-error"><i class="fa fa-exclamation-triangle" aria-hidden="true"></i>No existen datos</h1>`
  }
}

function loadMenuYear(ctx, dates, red){
  var ul = document.createElement('ul');
  ul.className = "tabs-menu-datos";
  ul.setAttribute('data-collapsible', 'accordion');
  if(red === "fb"){
    for(var i in dates){
      var index = anoatc.indexOf(dates[i].year);
      if(index === -1 & dates[i].userId === ctx.auth.username & dates[i].red === red){
      anoatc.push(dates[i].year);
      ul.appendChild(liMenuYear(ctx, dates, dates[i], red));
      }
    }
  }else if (red === "it"){
    for(var i in dates){
      var index = anoatcinst.indexOf(dates[i].year);
      if(index === -1 & dates[i].userId === ctx.auth.username & dates[i].red === 'inst'){
      anoatcinst.push(dates[i].year);
      ul.appendChild(liMenuYear(ctx, dates, dates[i], red));
      }
    }
  }else if (red === "wb"){
    for(var i in dates){
      var index = anoatcweb.indexOf(dates[i].year);
      if(index === -1 & dates[i].userId === ctx.auth.username & dates[i].red === 'web'){
      anoatcweb.push(dates[i].year);
      ul.appendChild(liMenuYear(ctx, dates, dates[i], red));
      }
    }
  }else{
    for(var i in dates){
      var index = anoatctw.indexOf(dates[i].year);
      if(index === -1 & dates[i].userId === ctx.auth.username & dates[i].red === red){
      anoatctw.push(dates[i].year);
      ul.appendChild(liMenuYear(ctx, dates, dates[i], red));
      }
    }
  }
  return ul;
}

function liMenuYear(ctx, dates, dato, red){
  return yo`<li class="liYear"><a class="ayear" href=".${red}${dato.year}">${dato.year}</a></li>`
}

function loadMenuMonths(ctx, dates, red){
  var ulM = document.createElement('ul');
  ulM.className = "menumonths menu-lateral";
  var items = document.createElement('div');
  if(red === "fb"){
    for(var i in dates){
      if(dates[i].type === 'month' & dates[i].red === red & dates[i].userId === ctx.auth.username){
        anomes = dates[i].year;
        var t = menumonth (ctx, dates, dates[i], dates[i].userId, anomes, red);
        if(t !== "" & t !== undefined & t !== null){
          items.appendChild(t);
        }
      }
    }
  }else if(red === "it"){
    for(var i in dates){
      if(dates[i].type === 'month' & dates[i].red === 'inst' &  dates[i].userId === ctx.auth.username){
        anomesins = dates[i].year;
        var tins = menumonth (ctx, dates, dates[i], dates[i].userId, anomesins, red);
        if(tins !== "" & tins !== undefined & tins !== null){
          items.appendChild(tins);
        }
      }
    }
  }else if(red === "wb"){
    for(var i in dates){
      if(dates[i].type === 'month' & dates[i].red === 'web' &  dates[i].userId === ctx.auth.username){
        anomesweb = dates[i].year;
        var tweb = menumonth (ctx, dates, dates[i], dates[i].userId, anomesweb, red);
        if(tweb !== "" & tweb !== undefined & tweb !== null){
          items.appendChild(tweb);
        }
      }
    }
  }else{
    for(var i in dates){
      if(dates[i].type === 'month' & dates[i].red === red &  dates[i].userId === ctx.auth.username){
        anomestw = dates[i].year;
        var ttw = menumonth (ctx, dates, dates[i], dates[i].userId, anomestw, red);
        if(ttw !== "" & ttw !== undefined & ttw !== null){
          items.appendChild(ttw);
        }
      }
    }
  }
  return items;
}

function loadViewTabs(ctx, dates, red){
 var resultado = document.createElement('div');
  if(red === "fb"){
    for(var i in dates){
      if(dates[i].userId === ctx.auth.username & dates[i].red === 'fb'){
        if(dates[i].type === 'year'  ){
          //console.log('d yeart');
          resultado.appendChild(vistaano (dates[i]));
        }else{
          //console.log('d month');
          resultado.appendChild(vistadato (ctx, dates[i]));
        }
      }
    }
  }else if(red === "inst"){
    for(var i in dates){
      if(dates[i].userId === ctx.auth.username & dates[i].red === 'inst'){
        resultado.appendChild(vistainst (ctx, dates[i]));
      }
    }
  }else if(red === "web"){
    for(var i in dates){
      if(dates[i].userId === ctx.auth.username & dates[i].red === 'web'){
        if(dates[i].type === 'year'  ){
          resultado.appendChild(vistawebano (dates[i]));
        }else{
          console.log('entro else year web');
          resultado.appendChild(vistamonthweb (ctx, dates[i]));
        }
      }
    }
  }else{
    for(var i in dates){
      if(dates[i].userId === ctx.auth.username & dates[i].red === 'tw'){
          resultado.appendChild(vistatw (ctx, dates[i]));
      }
    }
  }

  return resultado;
}

function buscardatos(ctx, dates, red){
  for(var i in dates){
   if(dates[i].userId === ctx.auth.username){
     redesv.push(dates[i].red);
   }
  }
  var index1 = redesv.indexOf(red);
  //console.log (redesv);
  //console.log (index1);
  redesv.length = 0;
  if(index1 === -1) {
    return 2;
  }else{
    return 1;
  }
}
/*
function datesfb(ctx){

    window.fbAsyncInit = function() {
      FB.init({
        appId      : '1899944563552590',
        secret     : 'be9d9f282bec3e8cd1886ab7556fa127',
        xfbml      : true,
        version    : 'v2.9'
      })
      FB.api(
        '/'+ctx.auth.username,
        'GET',
        {"fields":"id,name,about,likes,fan_count,posts,new_like_count,impressum,can_post,best_page,were_here_count", access_token: 'EAAIAb2OuyU8BACUUDpxKPyaZA2ur72UMZCbFBbZCUBgCp0DxHbyVkouwtkU04ebakvM1IfquvKrDek36fZAKfBFr2BWPhVZBPOvQwgy64VKyBKjaIZBUpKpTuVNlhiOANGZAa5uDOL25ZCVe4ZCEA4JlDf0ZAkL9MJsfgZD'},
        function (response) {
          if (response && !response.error) {
            alert(response.name + ' /n ' + response.fan_count);
            console.log(response);
          }
          else {
            console.log(response.error);
          }
        }
      );
      FB.AppEvents.logPageView();
    };

    (function(d, s, id){
       var js, fjs = d.getElementsByTagName(s)[0];
       if (d.getElementById(id)) {return;}
       js = d.createElement(s); js.id = id;
       js.src = "https://connect.facebook.net/en_US/sdk.js";
       fjs.parentNode.insertBefore(js, fjs);
     }(document, 'script', 'facebook-jssdk'));
}*/
