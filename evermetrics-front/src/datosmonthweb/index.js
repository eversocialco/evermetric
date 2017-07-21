var yo = require('yo-yo');

module.exports = function(ctx, dato) {
  return yo`<div class="estadisticas">
  <div id="wb${dato.year}${dato.month}" class="col m12 cont-datos tab-content-datos contAnalytics wb${dato.year}${dato.month}">
    <div class="contHeaderVisual">
      <div class="contTitleVisual">
        <h4 class="title-mes">${dato.month} - ${dato.year}</h4>
      </div>
      <div class="logo-cliente">
        <img src="${ctx.auth.src}"  />
      </div>
    </div>
    <h4>Audiencia</h4>
    <div class="row">
      <div class="col m4 cont-variables">
        <h5>Sesiones</h5>
        <a class="linkgraph" href="#wssesion${dato.year}${dato.month}">
          <p class="current">
          <i class="fa fa-sign-in" aria-hidden="true"></i>${dato.sessionst || 0}</p>
        </a>
      </div>
      <div class="col m4 cont-variables">
        <h5>Usuarios</h5>
        <a class="linkgraph" href="#wsusuario${dato.year}${dato.month}">
          <p class="current">
          <i class="fa fa-user" aria-hidden="true"></i>${dato.usuariosactit || 0}</p>
        </a>
      </div>
      <div class="col m4 cont-variables">
        <h5>Número de visitas a páginas</h5>
        <a class="linkgraph" href="#wsvisitas${dato.year}${dato.month}">
          <p class="current">
          <i class="fa fa-line-chart" aria-hidden="true"></i>${dato.numpageviewst || 0}</p>
        </a>
      </div>
    </div>
    <div class="row">
      <div class="col m6 cont-variables">
        <h5>Duración Promedio de una sesión</h5>
        <a class="linkgraph" href="#wstiempo${dato.year}${dato.month}">
          <p class="current"><i class="fa fa-clock-o" aria-hidden="true"></i>${dato.timepromt || 0}</p>
        </a>
      </div>
      <div class="col m6 cont-variables">
        <h5>Porcentaje de Rebote</h5>
        <a class="linkgraph" href="#wsrebote${dato.year}${dato.month}">
          <p class="current">
          <i class="fa fa-user-times" aria-hidden="true"></i>${dato.reboteport || 0}%</p>
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
    <div id="wssesion${dato.year}${dato.month}" class="tab-content-grafica" style="display:block">
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
    <div id="wsusuario${dato.year}${dato.month}" class="tab-content-grafica">
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
    <div id="wsvisitas${dato.year}${dato.month}" class="tab-content-grafica">
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
    <div id="wstiempo${dato.year}${dato.month}" class="tab-content-grafica">
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
    <div id="wsrebote${dato.year}${dato.month}" class="tab-content-grafica">
      <div class="row">
        <div class="col m12 cont-ano-border">
          <div class="cont-info-ano cont-total-fans-ano">
            <div class="cont-titulo">
              <i class="fa fa-user-times" aria-hidden="true"></i>
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
        <div class="col m12 cont-variables current" style="border-left: none !important;">
          <h5>Demografía</h5>
            <a class="linktorta" href="#wstortaidiomas${dato.year}${dato.month}">
              <p class="current">
              <i class="fa fa-language" aria-hidden="true" ></i> Idioma</p>
            </a>
        </div>
        <div class="col m12 cont-variables current">
          <a class="linktorta" href="#wstortapais${dato.year}${dato.month}">
            <p class="current">
            <i class="fa fa-globe" aria-hidden="true" ></i> País</p>
          </a>
        </div>
        <div class="col m12 cont-variables current">
          <a class="linktorta" href="#wstortaciudad${dato.year}${dato.month}">
            <p class="current">
            <i class="fa fa-building" aria-hidden="true" ></i> Ciudad</p>
          </a>
        </div>
        <div class="col m12 cont-variables">
          <a class="linktorta" href="#wstortavisit${dato.year}${dato.month}">
            <p class="current">
            <i class="fa fa-users" aria-hidden="true" ></i> Visitantes</p>
          </a>
        </div>
      </div>
      <div class="col m7 contDerTabsTortas">
        <div id="wstortaidiomas${dato.year}${dato.month}" class="col m12 tab-content-torta cont-ano-border" >
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
        <div id="wstortapais${dato.year}${dato.month}" class="col m12 tab-content-torta cont-ano-border">
          <div class="cont-info-ano cont-tortas contTortas" >
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
        <div id="wstortaciudad${dato.year}${dato.month}" class="col m12 tab-content-torta cont-ano-border" >
          <div class="cont-info-ano cont-tortas contTortas" >
            <div class="datos-tortas">
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
        <div id="wstortavisit${dato.year}${dato.month}" class="col m12 tab-content-torta cont-ano-border">
          <div class="cont-info-ano cont-tortas contTortas">
            <div class="datos-tortas" >
              <div class="cont-labels wlabel">
                <h5 class="color-mujer"><i class="fa fa-square" aria-hidden="true"></i> Nuevos: </h5>
                <p class="color-mujer"> ${dato.visit.visitnews || 0}%</p>
              </div>
              <div class="cont-labels wlabel">
                <h5 class="color-hombre"><i class="fa fa-square" aria-hidden="true"></i> Recurrentes:</h5>
                <p class="color-hombre">${dato.visit.visitrecurrent || 0}%</p>
              </div>
            </div>
            ${generarChartVisitMonth(dato)}
          </div>
        </div>
      </div>
    </div>
  </div>
  </div>`;


  function generarChartSessions(dato){
    return yo`<div>
    <canvas id="wssesiondatos${dato.month}${dato.year}" width="1100" height="400"></canvas>
    <script>
      if('${dato.type}' == 'month'){
        function chartSessions(){

            var LineChart = {
              labels: ["Día 1", "Día 2","Día 3","Día 4","Día 5","Día 6","Día 7","Día 8","Día 9","Día 10","Día 11","Día 12","Día 13","Día 14","Día 15","Día 16","Día 17","Día 18","Día 19","Día 20","Día 21","Día 22","Día 23","Día 24","Día 25","Día 26","Día 27","Día 28","Día 29","Día 30","Día 31"],
              datasets: [{
                fillColor: "rgba(83, 168, 195, 0.52)",
                strokeColor: "rgb(83, 168, 195)",
                pointColor: "rgba(220,220,220,1)",
                pointStrokeColor: "#fff",
                data: [${dato.sessionsmonth.month.day1}, ${dato.sessionsmonth.month.day2}, ${dato.sessionsmonth.month.day3}, ${dato.sessionsmonth.month.day4}, ${dato.sessionsmonth.month.day5}, ${dato.sessionsmonth.month.day6}, ${dato.sessionsmonth.month.day7}, ${dato.sessionsmonth.month.day8}, ${dato.sessionsmonth.month.day9}, ${dato.sessionsmonth.month.day10}, ${dato.sessionsmonth.month.day11}, ${dato.sessionsmonth.month.day12}, ${dato.sessionsmonth.month.day13}, ${dato.sessionsmonth.month.day14}, ${dato.sessionsmonth.month.day15}, ${dato.sessionsmonth.month.day16}, ${dato.sessionsmonth.month.day17}, ${dato.sessionsmonth.month.day18}, ${dato.sessionsmonth.month.day19}, ${dato.sessionsmonth.month.day20}, ${dato.sessionsmonth.month.day21}, ${dato.sessionsmonth.month.day22}, ${dato.sessionsmonth.month.day23}, ${dato.sessionsmonth.month.day24}, ${dato.sessionsmonth.month.day25}, ${dato.sessionsmonth.month.day26}, ${dato.sessionsmonth.month.day27}, ${dato.sessionsmonth.month.day28}, ${dato.sessionsmonth.month.day29}, ${dato.sessionsmonth.month.day30}, ${dato.sessionsmonth.month.day31}]
              }]
            }
          var ctx = document.getElementById("wssesiondatos${dato.month}${dato.year}").getContext("2d");
          var myLineChart = new Chart(ctx).Line(LineChart, {scaleFontSize : 13, scaleFontColor : "#000000"});
        }
      }
      chartSessions();
    </script>
    </div>`

  }

  function generarChartUsuarios(dato){
    return yo`<div>
    <canvas id="wsusuariodatos${dato.month}${dato.year}" width="1100" height="400"></canvas>
    <script>
      if('${dato.type}' == 'month'){
        function chartUsers(){

            var LineChart = {
              labels: ["Día 1", "Día 2","Día 3","Día 4","Día 5","Día 6","Día 7","Día 8","Día 9","Día 10","Día 11","Día 12","Día 13","Día 14","Día 15","Día 16","Día 17","Día 18","Día 19","Día 20","Día 21","Día 22","Día 23","Día 24","Día 25","Día 26","Día 27","Día 28","Día 29","Día 30","Día 31"],
              datasets: [{
                fillColor: "rgba(59, 178, 115, 0.52)",
                strokeColor: "rgb(59, 178, 115)",
                pointColor: "rgba(220,220,220,1)",
                pointStrokeColor: "#fff",
                data: [${dato.usuariosactimonth.month.day1}, ${dato.usuariosactimonth.month.day2}, ${dato.usuariosactimonth.month.day3}, ${dato.usuariosactimonth.month.day4}, ${dato.usuariosactimonth.month.day5}, ${dato.usuariosactimonth.month.day6}, ${dato.usuariosactimonth.month.day7}, ${dato.usuariosactimonth.month.day8}, ${dato.usuariosactimonth.month.day9}, ${dato.usuariosactimonth.month.day10}, ${dato.usuariosactimonth.month.day11}, ${dato.usuariosactimonth.month.day12}, ${dato.usuariosactimonth.month.day13}, ${dato.usuariosactimonth.month.day14}, ${dato.usuariosactimonth.month.day15}, ${dato.usuariosactimonth.month.day16}, ${dato.usuariosactimonth.month.day17}, ${dato.usuariosactimonth.month.day18}, ${dato.usuariosactimonth.month.day19}, ${dato.usuariosactimonth.month.day20}, ${dato.usuariosactimonth.month.day21}, ${dato.usuariosactimonth.month.day22}, ${dato.usuariosactimonth.month.day23}, ${dato.usuariosactimonth.month.day24}, ${dato.usuariosactimonth.month.day25}, ${dato.usuariosactimonth.month.day26}, ${dato.usuariosactimonth.month.day27}, ${dato.usuariosactimonth.month.day28}, ${dato.usuariosactimonth.month.day29}, ${dato.usuariosactimonth.month.day30}, ${dato.usuariosactimonth.month.day31}]
              }]
            }
          var ctx = document.getElementById("wsusuariodatos${dato.month}${dato.year}").getContext("2d");
          var myLineChart = new Chart(ctx).Line(LineChart, {scaleFontSize : 13, scaleFontColor : "#000000"});
        }
      }
      chartUsers();
    </script>
    </div>`

  }

  function generarChartNumPageViews(dato){
    return yo`<div>
    <canvas id="wsvisitasdatos${dato.month}${dato.year}" width="1100" height="400"></canvas>
    <script>
      if('${dato.type}' == 'month'){
        function chartPageViews(){

            var LineChart = {
              labels: ["Día 1", "Día 2","Día 3","Día 4","Día 5","Día 6","Día 7","Día 8","Día 9","Día 10","Día 11","Día 12","Día 13","Día 14","Día 15","Día 16","Día 17","Día 18","Día 19","Día 20","Día 21","Día 22","Día 23","Día 24","Día 25","Día 26","Día 27","Día 28","Día 29","Día 30","Día 31"],
              datasets: [{
                fillColor: "rgba(225, 188, 41, 0.52)",
                strokeColor: "rgb(225, 188, 41)",
                pointColor: "rgba(220,220,220,1)",
                pointStrokeColor: "#fff",
                data: [${dato.numpageviewsmonth.month.day1}, ${dato.numpageviewsmonth.month.day2}, ${dato.numpageviewsmonth.month.day3}, ${dato.numpageviewsmonth.month.day4}, ${dato.numpageviewsmonth.month.day5}, ${dato.numpageviewsmonth.month.day6}, ${dato.numpageviewsmonth.month.day7}, ${dato.numpageviewsmonth.month.day8}, ${dato.numpageviewsmonth.month.day9}, ${dato.numpageviewsmonth.month.day10}, ${dato.numpageviewsmonth.month.day11}, ${dato.numpageviewsmonth.month.day12}, ${dato.numpageviewsmonth.month.day13}, ${dato.numpageviewsmonth.month.day14}, ${dato.numpageviewsmonth.month.day15}, ${dato.numpageviewsmonth.month.day16}, ${dato.numpageviewsmonth.month.day17}, ${dato.numpageviewsmonth.month.day18}, ${dato.numpageviewsmonth.month.day19}, ${dato.numpageviewsmonth.month.day20}, ${dato.numpageviewsmonth.month.day21}, ${dato.numpageviewsmonth.month.day22}, ${dato.numpageviewsmonth.month.day23}, ${dato.numpageviewsmonth.month.day24}, ${dato.numpageviewsmonth.month.day25}, ${dato.numpageviewsmonth.month.day26}, ${dato.numpageviewsmonth.month.day27}, ${dato.numpageviewsmonth.month.day28}, ${dato.numpageviewsmonth.month.day29}, ${dato.numpageviewsmonth.month.day30}, ${dato.numpageviewsmonth.month.day31}]
              }]
            }
          var ctx = document.getElementById("wsvisitasdatos${dato.month}${dato.year}").getContext("2d");
          var myLineChart = new Chart(ctx).Line(LineChart, {scaleFontSize : 13, scaleFontColor : "#000000"});
        }
      }
      chartPageViews();
    </script>
    </div>`

  }

  function generarChartDuracionProm(dato){
    return yo`<div>
    <canvas id="wstiempodatos${dato.month}${dato.year}" width="1100" height="400"></canvas>
    <script>
      if('${dato.type}' == 'month'){
        function chartDurationProm(){

            var LineChart = {
              labels: ["Día 1", "Día 2","Día 3","Día 4","Día 5","Día 6","Día 7","Día 8","Día 9","Día 10","Día 11","Día 12","Día 13","Día 14","Día 15","Día 16","Día 17","Día 18","Día 19","Día 20","Día 21","Día 22","Día 23","Día 24","Día 25","Día 26","Día 27","Día 28","Día 29","Día 30","Día 31"],
              datasets: [{
                fillColor: "rgba(243, 146, 55, 0.52)",
                strokeColor: "rgb(243, 146, 55)",
                pointColor: "rgba(220,220,220,1)",
                pointStrokeColor: "#fff",
                data: [${dato.timeprommonth.month.day1}, ${dato.timeprommonth.month.day2}, ${dato.timeprommonth.month.day3}, ${dato.timeprommonth.month.day4}, ${dato.timeprommonth.month.day5}, ${dato.timeprommonth.month.day6}, ${dato.timeprommonth.month.day7}, ${dato.timeprommonth.month.day8}, ${dato.timeprommonth.month.day9}, ${dato.timeprommonth.month.day10}, ${dato.timeprommonth.month.day11}, ${dato.timeprommonth.month.day12}, ${dato.timeprommonth.month.day13}, ${dato.timeprommonth.month.day14}, ${dato.timeprommonth.month.day15}, ${dato.timeprommonth.month.day16}, ${dato.timeprommonth.month.day17}, ${dato.timeprommonth.month.day18}, ${dato.timeprommonth.month.day19}, ${dato.timeprommonth.month.day20}, ${dato.timeprommonth.month.day21}, ${dato.timeprommonth.month.day22}, ${dato.timeprommonth.month.day23}, ${dato.timeprommonth.month.day24}, ${dato.timeprommonth.month.day25}, ${dato.timeprommonth.month.day26}, ${dato.timeprommonth.month.day27}, ${dato.timeprommonth.month.day28}, ${dato.timeprommonth.month.day29}, ${dato.timeprommonth.month.day30}, ${dato.timeprommonth.month.day31}]
              }]
            }
          var ctx = document.getElementById("wstiempodatos${dato.month}${dato.year}").getContext("2d");
          var myLineChart = new Chart(ctx).Line(LineChart, {scaleFontSize : 13, scaleFontColor : "#000000"});
        }
      }
      chartDurationProm();
    </script>
    </div>`

  }

  function generarChartRebotePor(dato){
    return yo`<div>
    <canvas id="wsrebotedatos${dato.month}${dato.year}" width="1100" height="400"></canvas>
    <script>
      if('${dato.type}' == 'month'){
        function chartRebotePor(){

            var LineChart = {
              labels: ["Día 1", "Día 2","Día 3","Día 4","Día 5","Día 6","Día 7","Día 8","Día 9","Día 10","Día 11","Día 12","Día 13","Día 14","Día 15","Día 16","Día 17","Día 18","Día 19","Día 20","Día 21","Día 22","Día 23","Día 24","Día 25","Día 26","Día 27","Día 28","Día 29","Día 30","Día 31"],
              datasets: [{
                fillColor: "rgba(250, 172, 237, 0.52)",
                strokeColor: "rgb(250, 172, 237)",
                pointColor: "rgba(220,220,220,1)",
                pointStrokeColor: "#fff",
                data: [${dato.rebotepormonth.month.day1}, ${dato.rebotepormonth.month.day2}, ${dato.rebotepormonth.month.day3}, ${dato.rebotepormonth.month.day4}, ${dato.rebotepormonth.month.day5}, ${dato.rebotepormonth.month.day6}, ${dato.rebotepormonth.month.day7}, ${dato.rebotepormonth.month.day8}, ${dato.rebotepormonth.month.day9}, ${dato.rebotepormonth.month.day10}, ${dato.rebotepormonth.month.day11}, ${dato.rebotepormonth.month.day12}, ${dato.rebotepormonth.month.day13}, ${dato.rebotepormonth.month.day14}, ${dato.rebotepormonth.month.day15}, ${dato.rebotepormonth.month.day16}, ${dato.rebotepormonth.month.day17}, ${dato.rebotepormonth.month.day18}, ${dato.rebotepormonth.month.day19}, ${dato.rebotepormonth.month.day20}, ${dato.rebotepormonth.month.day21}, ${dato.rebotepormonth.month.day22}, ${dato.rebotepormonth.month.day23}, ${dato.rebotepormonth.month.day24}, ${dato.rebotepormonth.month.day25}, ${dato.rebotepormonth.month.day26}, ${dato.rebotepormonth.month.day27}, ${dato.rebotepormonth.month.day28}, ${dato.rebotepormonth.month.day29}, ${dato.rebotepormonth.month.day30}, ${dato.rebotepormonth.month.day31}]
              }]
            }
          var ctx = document.getElementById("wsrebotedatos${dato.month}${dato.year}").getContext("2d");
          var myLineChart = new Chart(ctx).Line(LineChart, {scaleFontSize : 13, scaleFontColor : "#000000"});
        }
      }
      chartRebotePor();
    </script>
    </div>`

  }

  function generarChartLanguage(dato){
      return yo`<div>
      <canvas id="idiomas${dato.month}${dato.year}" width="150" height="150"></canvas>
      <script>
        if('${dato.type}' == 'month'){
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

            var ctx = document.getElementById("idiomas${dato.month}${dato.year}").getContext("2d");
            window.myPie = new Chart(ctx).Pie(idiomaData);
          }
        }
        chartLanguage();
      </script>
    </div>`
  }

  function generarChartCountry(dato){
        return yo`<div>
        <canvas id="paises${dato.month}${dato.year}" width="150" height="150"></canvas>
        <script>
          if('${dato.type}' == 'month'){
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
              var ctx = document.getElementById("paises${dato.month}${dato.year}").getContext("2d");
              window.myPie = new Chart(ctx).Pie(paisData);
            }
          }
          chartCountry();
        </script>
      </div>`
  }

  function generarChartCity(dato){
          return yo`<div>
          <canvas id="ciudad${dato.month}${dato.year}" width="150" height="150"></canvas>
          <script>
            if('${dato.type}' == 'month'){
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
                var ctx = document.getElementById("ciudad${dato.month}${dato.year}").getContext("2d");
                window.myPie = new Chart(ctx).Pie(ciudadesData);
              }
            }
            chartCity();
          </script>
        </div>`
  }

  function generarChartVisitMonth(dato){
      return yo`<div>
      <canvas id="visit${dato.month}${dato.year}" width="150" height="150"></canvas>
      <script>
        if('${dato.type}' == 'month'){
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

            var ctx = document.getElementById("visit${dato.month}${dato.year}").getContext("2d");
            window.myPie = new Chart(ctx).Pie(visitData);
          }
        }
        chartVisit();
      </script>
    </div>`
}

}
