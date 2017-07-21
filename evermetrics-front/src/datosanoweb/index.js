var yo = require('yo-yo');

module.exports = function(dato) {
  return yo`<div class="estadisticas">
  <div id="wb${dato.year}" class="col m12 cont-datos tab-content-datos contAnalytics wb${dato.year}">
    <h4 class="titlteHeaderAno">Año ${dato.year}</h4>
    <h4>Audiencia</h4>
    <div class="row">
      <div class="col m4 cont-variables">
        <h5>Sesiones</h5>
        <a class="linkgraph" href="#wssesion${dato.year}">
          <p class="current">
          <i class="fa fa-sign-in" aria-hidden="true"></i>${dato.sessionst || 0}</p>
        </a>
      </div>
      <div class="col m4 cont-variables">
        <h5>Usuarios</h5>
        <a class="linkgraph" href="#wsusuario${dato.year}">
          <p class="current">
          <i class="fa fa-user" aria-hidden="true"></i>${dato.usuariosactit || 0}</p>
        </a>
      </div>
      <div class="col m4 cont-variables">
        <h5>Número de visitas a páginas</h5>
        <a class="linkgraph" href="#wsvisitas${dato.year}">
          <p class="current" >
          <i class="fa fa-line-chart" aria-hidden="true"></i>${dato.numpageviewst || 0}</p>
        </a>
      </div>
    </div>
    <div class="row">
      <div class="col m6 cont-variables">
        <h5>Duración Promedio de una sesión</h5>
        <a class="linkgraph" href="#wstiempo${dato.year}">
          <p class="current">
          <i class="fa fa-clock-o" aria-hidden="true"></i>${dato.timepromt || 0}</p>
        </a>
      </div>
      <div class="col m6 cont-variables">
        <h5>Porcentaje de Rebote</h5>
        <a class="linkgraph" href="#wsrebote${dato.year}">
          <p class="current">
          <i class="fa fa-user-times" aria-hidden="true"></i>${dato.reboteport || 0} %</p>
        </a>
      </div>
    </div>
    <div class="row">
        <div class="col m7 cont-variables ">
            <h5>Páginas más vistas</h5>
            <p><a href="${dato.urlpagmoreview1 || 0}" target="_blank" style="color: #53a8c3;">1. ${dato.pagmoreview1 || 0}</a></p>
            <p><a href="${dato.urlpagmoreview2 || 0}" target="_blank" style="color: #53a8c3;">2. ${dato.pagmoreview2 || 0}</a></p>
            <p><a href="${dato.urlpagmoreview3 || 0}" target="_blank" style="color: #53a8c3;">3. ${dato.pagmoreview3 || 0}</a></p>
        </div>
        <div class="col m5 cont-variables">
            <h5>Número de veces vistas </h5>
            <p> ${dato.numpagmoreview1 || 0} vistos <br> ${dato.numpagmoreview2 || 0} vistos<br> ${dato.numpagmoreview3 || 0} vistos</p>
        </div>
    </div>
    <div id="wssesion${dato.year}" class="tab-content-grafica" style="display:block">
        <div class="row">
          <div class="col m12 cont-ano-border">
            <div class="cont-info-ano cont-total-fans-ano">
              <div class="cont-titulo">
                <i class="fa fa-sign-in" aria-hidden="true" ></i>
                <div class="con-der-titulo">
                  <h5 style="margin-bottom: 0;">Sesiones</h5>
                </div>
              </div>
               ${generarChartSessions(dato)}
            </div>
          </div>
        </div>
    </div>
    <div id="wsusuario${dato.year}" class="tab-content-grafica">
        <div class="row">
          <div class="col m12 cont-ano-border">
            <div class="cont-info-ano cont-total-fans-ano">
              <div class="cont-titulo">
                <i class="fa fa-user" aria-hidden="true"></i>
                <div class="con-der-titulo">
                  <h5 style="margin-bottom: 0;">Usuarios</h5>
                </div>
              </div>
               ${generarChartUsuarios(dato)}
            </div>
          </div>
        </div>
    </div>
    <div id="wsvisitas${dato.year}" class="tab-content-grafica">
      <div class="row">
        <div class="col m12 cont-ano-border">
          <div class="cont-info-ano cont-total-fans-ano">
            <div class="cont-titulo">
              <i class="fa fa-line-chart" aria-hidden="true"></i>
              <div class="con-der-titulo">
                <h5 style="margin-bottom: 0;">Numero de visitas a páginas</h5>
              </div>
            </div>
            ${generarChartNumPageViews(dato)}
          </div>
        </div>
      </div>
    </div>
    <div id="wstiempo${dato.year}" class="tab-content-grafica">
      <div class="row">
        <div class="col m12 cont-ano-border">
          <div class="cont-info-ano cont-total-fans-ano">
            <div class="cont-titulo">
              <i class="fa fa-clock-o" aria-hidden="true" ></i>
              <div class="con-der-titulo">
                <h5 style="margin-bottom: 0;">Duración Promedio de la sesión</h5>
              </div>
            </div>
            ${generarChartDuracionProm(dato)}
          </div>
        </div>
      </div>
    </div>
    <div id="wsrebote${dato.year}" class="tab-content-grafica">
      <div class="row">
        <div class="col m12 cont-ano-border">
          <div class="cont-info-ano cont-total-fans-ano">
            <div class="cont-titulo">
              <i class="fa fa-user-times" aria-hidden="true" ></i>
              <div class="con-der-titulo">
                <h5 style="margin-bottom: 0;">Porcentaje de Rebote</h5>
              </div>
            </div>
            ${generarChartRebotePor(dato)}
          </div>
        </div>
      </div>
    </div>
    <div class="row">
      <div class="col m5">
        <div class="col m12 cont-variables borderLeftNone current">
          <h5>Demografía</h5>
            <a class="linktorta" href="#wstortaidiomas${dato.year}">
              <p class="current">
              <i class="fa fa-language" aria-hidden="true"></i> Idioma</p>
            </a>
        </div>
        <div class="col m12 cont-variables current">
          <a class="linktorta" href="#wstortapais${dato.year}">
            <p class="current">
            <i class="fa fa-globe" aria-hidden="true"></i> País</p>
          </a>
        </div>
        <div class="col m12 cont-variables current">
          <a class="linktorta" href="#wstortaciudad${dato.year}">
            <p class="current">
            <i class="fa fa-building" aria-hidden="true"></i> Ciudad</p>
          </a>
        </div>
        <div class="col m12 cont-variables">
          <a class="linktorta" href="#wstortavisit${dato.year}">
            <p class="current">
            <i class="fa fa-users" aria-hidden="true"></i> Visitantes</p>
          </a>
        </div>
      </div>
      <div class="col m7 contDerTabsTortas">
        <div id="wstortaidiomas${dato.year}" class="col m12 tab-content-torta cont-ano-border">
          <div class="cont-info-ano cont-tortas contTortas">
            <div class="datos-tortas">
              <div class="cont-labels wlabel">
                <h5 class="color-edadp" style="color:#53a8c3"><i class="fa fa-square" aria-hidden="true"></i>Español: </h5>
                <p class="color-edadp"> ${dato.language.ppal || 0}%</p>
              </div>
              <div class="cont-labels wlabel">
                <h5 class="color-mujer"><i class="fa fa-square" aria-hidden="true"></i>Otros: </h5>
                <p class="color-mujer"> ${dato.language.others || 0}%</p>
              </div>
            </div>
            ${generarChartLanguage(dato)}
          </div>
        </div>
        <div id="wstortapais${dato.year}" class="col m12 tab-content-torta cont-ano-border" >
          <div class="cont-info-ano cont-tortas contTortas">
            <div class="datos-tortas">
              <div class="cont-labels wlabel">
                <h5 class="color-hombre" style="color:#e1bc29 !important"><i class="fa fa-square" aria-hidden="true"></i>Colombia:</h5>
                <p class="color-hombre" style="color:#e1bc29 !important"> ${dato.country.ppal || 0}%</p>
              </div>
              <div class="cont-labels wlabel">
                <h5 class="color-mujer" style="color:#53A8C3 !important"><i class="fa fa-square" aria-hidden="true"></i>USA:</h5>
                <p class="color-mujer" style="color:#53A8C3 !important"> ${dato.country.sec || 0}%</p>
              </div>
              <div class="cont-labels wlabel">
                <h5 class="color-paiso" style="color:#3bb273"><i class="fa fa-square" aria-hidden="true"></i>Otros:</h5>
                <p class="color-paiso"> ${dato.country.others || 0}%</p>
              </div>
            </div>
            ${generarChartCountry(dato)}
          </div>
        </div>
        <div id="wstortaciudad${dato.year}" class="col m12 tab-content-torta cont-ano-border" >
          <div class="cont-info-ano cont-tortas contTortas">
            <div class="datos-tortas" style="margin-bottom:9px;">
              <div class="cont-labels wlabel">
                <h5 class="color-paisp" style="color:#e1bc29;"><i class="fa fa-square" aria-hidden="true"></i>Medellín: </h5>
                <p class="color-paisp">${dato.city.ppal || 0}%</p>
              </div>
              <div class="cont-labels wlabel">
                <h5 class="color-paiss" style="color:#53a8c3;"><i class="fa fa-square" aria-hidden="true"></i>New York:</h5>
                <p class="color-paiss"> ${dato.city.sec || 0}% </p>
              </div>
              <div class="cont-labels wlabel">
                <h5 class="color-paiso" style="color:#3bb273;"><i class="fa fa-square" aria-hidden="true"></i>Otros:</h5>
                <p class="color-paiso"> ${dato.city.others || 0}% </p>
              </div>
            </div>
            ${generarChartCity(dato)}
          </div>
        </div>
        <div id="wstortavisit${dato.year}" class="col m12 tab-content-torta cont-ano-border">
          <div class="cont-info-ano cont-tortas contTortas">
            <div class="datos-tortas">
              <div class="cont-labels wlabel">
                <h5 class="color-mujer"><i class="fa fa-square" aria-hidden="true"></i> Nuevos: </h5>
                <p class="color-mujer"> ${dato.visit.visitnews || 0}%</p>
              </div>
              <div class="cont-labels wlabel">
                <h5 class="color-hombre"><i class="fa fa-square" aria-hidden="true"></i> Recurrentes:</h5>
                <p class="color-hombre">${dato.visit.visitrecurrent || 0}%</p>
              </div>
            </div>
            ${generarChartVisit(dato)}
          </div>
        </div>
      </div>
    </div>
  </div>
  </div>`;


function generarChartSessions(dato){
  return yo`<div>
  <canvas id="wssesiondatos${dato.year}" width="1100" height="400"></canvas>
  <script>
    if('${dato.type}' == 'year'){
      function chartSessions(){

          var LineChart = {
            labels: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],
            datasets: [{
              fillColor: "rgba(83, 168, 195, 0.52)",
              strokeColor: "rgb(83, 168, 195)",
              pointColor: "rgba(220,220,220,1)",
              pointStrokeColor: "#fff",
              data: [${dato.sessions.months.enero}, ${dato.sessions.months.febrero}, ${dato.sessions.months.marzo}, ${dato.sessions.months.abril}, ${dato.sessions.months.mayo}, ${dato.sessions.months.junio}, ${dato.sessions.months.julio}, ${dato.sessions.months.agosto}, ${dato.sessions.months.septiembre}, ${dato.sessions.months.octubre}, ${dato.sessions.months.noviembre}, ${dato.sessions.months.diciembre}]
            }]
          }
        var ctx = document.getElementById("wssesiondatos${dato.year}").getContext("2d");
        var myLineChart = new Chart(ctx).Line(LineChart, {scaleFontSize : 13, scaleFontColor : "#000000"});
      }
    }
    chartSessions();
  </script>
  </div>`

}

function generarChartUsuarios(dato){
  return yo`<div>
  <canvas id="wsusuariodatos${dato.year}" width="1100" height="400"></canvas>
  <script>
    if('${dato.type}' == 'year'){
      function chartUsers(){

          var LineChart = {
            labels: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],
            datasets: [{
              fillColor: "rgba(59, 178, 115, 0.52)",
              strokeColor: "rgb(59, 178, 115)",
              pointColor: "rgba(220,220,220,1)",
              pointStrokeColor: "#fff",
              data: [${dato.usuariosacti.months.enero}, ${dato.usuariosacti.months.febrero}, ${dato.usuariosacti.months.marzo}, ${dato.usuariosacti.months.abril}, ${dato.usuariosacti.months.mayo}, ${dato.usuariosacti.months.junio}, ${dato.usuariosacti.months.julio}, ${dato.usuariosacti.months.agosto}, ${dato.usuariosacti.months.septiembre}, ${dato.usuariosacti.months.octubre}, ${dato.usuariosacti.months.noviembre}, ${dato.usuariosacti.months.diciembre}]
            }]
          }
        var ctx = document.getElementById("wsusuariodatos${dato.year}").getContext("2d");
        var myLineChart = new Chart(ctx).Line(LineChart, {scaleFontSize : 13, scaleFontColor : "#000000"});
      }
    }
    chartUsers();
  </script>
  </div>`

}

function generarChartNumPageViews(dato){
  return yo`<div>
  <canvas id="wsvisitasdatos${dato.year}" width="1100" height="400"></canvas>
  <script>
    if('${dato.type}' == 'year'){
      function chartPageViews(){

          var LineChart = {
            labels: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],
            datasets: [{
              fillColor: "rgba(225, 188, 41, 0.52)",
              strokeColor: "rgb(225, 188, 41)",
              pointColor: "rgba(220,220,220,1)",
              pointStrokeColor: "#fff",
              data: [${dato.numpageviews.months.enero}, ${dato.numpageviews.months.febrero}, ${dato.numpageviews.months.marzo}, ${dato.numpageviews.months.abril}, ${dato.numpageviews.months.mayo}, ${dato.numpageviews.months.junio}, ${dato.numpageviews.months.julio}, ${dato.numpageviews.months.agosto}, ${dato.numpageviews.months.septiembre}, ${dato.numpageviews.months.octubre}, ${dato.numpageviews.months.noviembre}, ${dato.numpageviews.months.diciembre}]
            }]
          }
        var ctx = document.getElementById("wsvisitasdatos${dato.year}").getContext("2d");
        var myLineChart = new Chart(ctx).Line(LineChart, {scaleFontSize : 13, scaleFontColor : "#000000"});
      }
    }
    chartPageViews();
  </script>
  </div>`

}

function generarChartDuracionProm(dato){
  return yo`<div>
  <canvas id="wstiempodatos${dato.year}" width="1100" height="400"></canvas>
  <script>
    if('${dato.type}' == 'year'){
      function chartDurationProm(){

          var LineChart = {
            labels: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],
            datasets: [{
              fillColor: "rgba(243, 146, 55, 0.52)",
              strokeColor: "rgb(243, 146, 55)",
              pointColor: "rgba(220,220,220,1)",
              pointStrokeColor: "#fff",
              data: [${dato.timeprom.months.enero}, ${dato.timeprom.months.febrero}, ${dato.timeprom.months.marzo}, ${dato.timeprom.months.abril}, ${dato.timeprom.months.mayo}, ${dato.timeprom.months.junio}, ${dato.timeprom.months.julio}, ${dato.timeprom.months.agosto}, ${dato.timeprom.months.septiembre}, ${dato.timeprom.months.octubre}, ${dato.timeprom.months.noviembre}, ${dato.timeprom.months.diciembre}]
            }]
          }
        var ctx = document.getElementById("wstiempodatos${dato.year}").getContext("2d");
        var myLineChart = new Chart(ctx).Line(LineChart, {scaleFontSize : 13, scaleFontColor : "#000000"});
      }
    }
    chartDurationProm();
  </script>
  </div>`

}

function generarChartRebotePor(dato){
  return yo`<div>
  <canvas id="wsrebotedatos${dato.year}" width="1100" height="400"></canvas>
  <script>
    if('${dato.type}' == 'year'){
      function chartRebotePor(){

          var LineChart = {
            labels: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],
            datasets: [{
              fillColor: "rgba(250, 172, 237, 0.52)",
              strokeColor: "rgb(250, 172, 237)",
              pointColor: "rgba(220,220,220,1)",
              pointStrokeColor: "#fff",
              data: [${dato.rebotepor.months.enero}, ${dato.rebotepor.months.febrero}, ${dato.rebotepor.months.marzo}, ${dato.rebotepor.months.abril}, ${dato.rebotepor.months.mayo}, ${dato.rebotepor.months.junio}, ${dato.rebotepor.months.julio}, ${dato.rebotepor.months.agosto}, ${dato.rebotepor.months.septiembre}, ${dato.rebotepor.months.octubre}, ${dato.rebotepor.months.noviembre}, ${dato.rebotepor.months.diciembre}]
            }]
          }
        var ctx = document.getElementById("wsrebotedatos${dato.year}").getContext("2d");
        var myLineChart = new Chart(ctx).Line(LineChart, {scaleFontSize : 13, scaleFontColor : "#000000"});
      }
    }
    chartRebotePor();
  </script>
  </div>`

}

function generarChartLanguage(dato){
    return yo`<div>
    <canvas id="idiomas${dato.year}" width="150" height="150"></canvas>
    <script>
      if('${dato.type}' == 'year'){
        function chartLanguage(){
          var idiomaData = [
         				{
         					value: ${dato.language.ppal},
         					color:"#53a8c3",
         					highlight: "rgba(83, 168, 195, 0.8)",
         					label: "Español"},
         				{
         					value: ${dato.language.others},
         					color: "#F39237",
         					highlight: "rgba(243,146,55,0.8)",
         					label: "Otros"
         				}
         			];

          var ctx = document.getElementById("idiomas${dato.year}").getContext("2d");
          window.myPie = new Chart(ctx).Pie(idiomaData);
        }
      }
      chartLanguage();
    </script>
  </div>`
}

function generarChartCountry(dato){
      return yo`<div>
      <canvas id="paises${dato.year}" width="150" height="150"></canvas>
      <script>
        if('${dato.type}' == 'year'){
          function chartCountry(){
            var paisData = [
         				{
         					value: ${dato.country.ppal},
         					color:"#E1BC29",
         					highlight: "rgba(225,188,41,0.80)",
         					label: "Colombia"},
         				{
         					value: ${dato.country.sec},
         					color: "#53A8C3",
         					highlight: "rgba(83,168,195,0.80)",
         					label: "USA"},
         				{
         					value: ${dato.country.others},
         					color: "#3bb273",
         					highlight: "rgba(59,178,115,0.8)",
         					label: "Otros"
         				}
         			];
            var ctx = document.getElementById("paises${dato.year}").getContext("2d");
            window.myPie = new Chart(ctx).Pie(paisData);
          }
        }
        chartCountry();
      </script>
    </div>`
}

function generarChartCity(dato){
        return yo`<div>
        <canvas id="ciudad${dato.year}" width="150" height="150"></canvas>
        <script>
          if('${dato.type}' == 'year'){
            function chartCity(){
              var ciudadesData = [
                  {
                    value: ${dato.city.ppal},
                    color:"#E1BC29",
                    highlight: "rgba(225,188,41,0.80)",
                    label: "Medellín"},
                  {
                    value: ${dato.city.sec},
                    color: "#53A8C3",
                    highlight: "rgba(83,168,195,0.80)",
                    label: "New York"},
                  {
                    value: ${dato.city.others},
                    color: "#3bb273",
                    highlight: "rgba(59,178,115,0.8)",
                    label: "Otros"
                  }
                ];
              var ctx = document.getElementById("ciudad${dato.year}").getContext("2d");
              window.myPie = new Chart(ctx).Pie(ciudadesData);
            }
          }
          chartCity();
        </script>
      </div>`
}

function generarChartVisit(dato){
    return yo`<div>
    <canvas id="visit${dato.year}" width="150" height="150"></canvas>
    <script>
      if('${dato.type}' == 'year'){
        function chartVisit(){
          var visitData = [
         				{
         					value: ${dato.visit.visitnews},
         					color:"#F39237",
         					highlight: "rgba(243,146,55,0.8)",
         					label: "Nuevos"},
         				{
         					value: ${dato.visit.visitrecurrent},
         					color: "#53a8c3",
         					highlight: "rgba(83, 168, 195, 0.8)",
         					label: "Recurrentes"
         				}
         			];

          var ctx = document.getElementById("visit${dato.year}").getContext("2d");
          window.myPie = new Chart(ctx).Pie(visitData);
        }
      }
      chartVisit();
    </script>
  </div>`
}

}
