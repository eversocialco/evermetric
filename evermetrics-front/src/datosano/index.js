var yo = require('yo-yo');

module.exports = function(dato) {
  return yo`<div class="ano">
  <div id="fb${dato.year}" class="col m12 comparativo-ano tab-content-datos fb${dato.year}">
    <h4 style="padding:20px;text-align:center;">Año ${dato.year}</h4>
      <div class="cont-datos-anos">
        <div class="row" style="margin-bottom: 30px !important;">
          <div class="col m8 cont-ano-border" >
            <div class="cont-info-ano cont-total-fans-ano">
              <div class="cont-titulo">
                <i class="fa fa-users" aria-hidden="true"></i>
                <div class="con-der-titulo">
                  <h5 style="margin-bottom: 0;">Fans Totales</h5>
                  <p id="count-number" class="timer count-title" data-to="${dato.allfansy.total}" data-speed="1500" style="color: rgb(59, 178, 115);"></p>
                </div>
              </div>
              ${genechartfantotal(dato)}
            </div>
          </div>
          <div class="col m4">
            <div class="col m12 cont-ano-border">
              <div class="cont-info-ano">
                <div style="padding: 0 40px;">
                  <h5 style="margin-bottom: 0;"><i class="fa fa-thumbs-o-up" aria-hidden="true"></i>Fans Nuevos</h5>
                  <small>(Promedio por mes)</small>
                  <p id="count-number" class="timer count-title" data-to="${dato.newfansy.total}" data-speed="1500" style="color: rgb(59, 178, 115);"></p>
                </div>
                ${genechartfannew(dato)}
              </div>
            </div>

          </div>
        </div>
        <div class="row" style="margin-bottom: 30px !important;">
          <div class="col m4 cont-ano-border">
            <div class="cont-info-ano">
              <div style="padding: 0 40px;">
                <h5 style="margin-bottom: 0;"><i class="fa fa-thumbs-o-down" aria-hidden="true"></i>No me Gusta</h5>
                <small>(Promedio por mes)</small>
                <p id="count-number" class="timer count-title" data-to="${dato.nolikesy.total}" data-speed="1500" style="color: #f39237;"></p>
              </div>
              ${genechartnolikes(dato)}
            </div>
          </div>
          <div class="col m4 cont-ano-border">
            <div class="cont-info-ano">
              <div style="padding: 0 40px;">
                <h5 style="margin-bottom: 0;"><i class="fa fa-exchange" aria-hidden="true"></i>Impresión</h5>
                <small>(Promedio por mes)</small>
                <p id="count-number" class="timer count-title" data-to="${dato.printsy.total}" data-speed="1500" style="color: #e1bc29;"></p>
              </div>
              ${genechartprints(dato)}
            </div>
          </div>
          <div class="col m4 cont-ano-border">
            <div class="cont-info-ano">
              <div style="padding: 0 40px;">
                <h5 style="margin-bottom: 0;"><i class="fa fa-user" aria-hidden="true"></i>Usuarios Activos</h5>
                <small>(Promedio por mes)</small>
                <p id="count-number" class="timer count-title" data-to="${dato.activeusersy.total}" data-speed="1500" style="color: rgb(83, 168, 195);">1913</p>
              </div>
              ${genechartactiveusers(dato)}
            </div>
          </div>
        </div>
        <div class="row" style="display:flex;margin-bottom: 30px !important;">
          <div class="cont-ano-border">
            <div class="cont-info-ano cont-tortas">
              <div class="datos-tortas">
                <div class="contTitleTorta">
                  <h5><i class="fa fa-venus-mars" aria-hidden="true"></i>Género</h5>
                </div>
                <div class="contLabelsTortas">
                  <div class="cont-labels-torta">
                    <h6 class="color-mujer"><i class="fa fa-venus" aria-hidden="true"></i> Mujeres</h6>
                    <p class="color-mujer"><i class="fa fa-square" ></i> ${dato.genre.women}%</p>
                  </div>
                  <div class="cont-labels-torta">
                    <h6 class="color-hombre"><i class="fa fa-mars" aria-hidden="true"></i> Hombres</h6>
                    <p class="color-hombre"><i class="fa fa-square" ></i> ${dato.genre.men}% </p>
                  </div>
                </div>
              </div>
              ${genechartgenre(dato)}
            </div>
          </div>
          <div class="cont-ano-border">
            <div class="cont-info-ano cont-tortas">
              <div class="datos-tortas">
                <div class="contTitleTorta">
                  <h5><i class="fa fa-calendar" aria-hidden="true"></i>Edades Principales</h5>
                </div>
                <div class="contLabelsTortas">
                  <p class="color-edadp"><i class="fa fa-square" ></i> 25 - 34 Años: ${dato.age.ppal}%</p>
                  <p class="color-edads"><i class="fa fa-square" ></i> Otros: ${dato.age.others}% </p>
                </div>
               </div>
               ${genechartage(dato)}
            </div>
          </div>
          <div class="cont-ano-border">
            <div class="cont-info-ano cont-tortas">
              <div class="datos-tortas">
                <div class="contTitleTorta">
                  <h5><i class="fa fa-language" aria-hidden="true"></i>Principales idiomas</h5>
                </div>
                <div class="contLabelsTortas">
                 <p class="color-idiomap"><i class="fa fa-square" ></i> Español: ${dato.language.ppal}%</p>
                 <p class="color-idiomas"><i class="fa fa-square" ></i> Otros: ${dato.language.others}%</p>
                </div>
               </div>
               ${genechartlanguage(dato)}
            </div>
          </div>
          <div class="cont-ano-border">
            <div class="cont-info-ano cont-tortas">
             <div class="datos-tortas">
              <div class="contTitleTorta">
                <h5><i class="fa fa-globe" aria-hidden="true"></i>Principales Países</h5>
              </div>
              <div class="contLabelsTortas">
               <p class="color-paisp"><i class="fa fa-square" ></i> Colombia: ${dato.country.ppal}%</p>
               <p class="color-paiss"><i class="fa fa-square" ></i> USA: ${dato.country.sec}%</p>
               <p class="color-paiso"><i class="fa fa-square" ></i> Otros: ${dato.country.others}%</p>
              </div>
             </div>
             <div class="cont-canvas">
               ${genechartcountry(dato)}
             </div>
            </div>
          </div>
          <div class="cont-ano-border">
            <div class="cont-info-ano cont-tortas">
              <div class="datos-tortas">
                <div class="contTitleTorta">
                  <h5><i class="fa fa-map-marker" aria-hidden="true"></i>Principales Ciudades</h5>
                </div>
                <div class="contLabelsTortas">
                  <p class="color-ciudadp"><i class="fa fa-square" ></i> Medellín: ${dato.city.ppal}%</p>
                  <p class="color-ciudads"><i class="fa fa-square" ></i> Bogotá: ${dato.city.sec}%</p>
                  <p class="color-ciudado"><i class="fa fa-square" ></i> Otros: ${dato.city.others}%</p>
                </div>
              </div>
               <div class="cont-canvas">
                 ${genechartcity(dato)}
               </div>
            </div>
          </div>
        </div>

      </div>
  </div>
  </div>`;

  function genechartfantotal(dato){
    return yo`<div>
    <canvas id="datos${dato.year}ano" width="720" height="300"></canvas>
    <script>
      if('${dato.type}' == 'year'){
        function chartfantotal(){

            var LineChart = {
              labels: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],
              datasets: [{
                fillColor: "rgba(83, 168, 195, 0.52)",
                strokeColor: "rgb(83, 168, 195)",
                pointColor: "rgba(220,220,220,1)",
                pointStrokeColor: "#fff",
                data: [${dato.allfansy.months.enero}, ${dato.allfansy.months.febrero}, ${dato.allfansy.months.marzo}, ${dato.allfansy.months.abril}, ${dato.allfansy.months.mayo}, ${dato.allfansy.months.junio}, ${dato.allfansy.months.julio}, ${dato.allfansy.months.agosto}, ${dato.allfansy.months.septiembre}, ${dato.allfansy.months.octubre}, ${dato.allfansy.months.noviembre}, ${dato.allfansy.months.diciembre}]
              }]
            }
          var ctx = document.getElementById("datos${dato.year}ano").getContext("2d");
          var myLineChart = new Chart(ctx).Line(LineChart, {scaleFontSize : 13, scaleFontColor : "#000000"});
        }
      }
      chartfantotal();
    </script>
  </div>`
  }

  function genechartfannew(dato){
    return yo`<div>
    <canvas id="newfans${dato.year}ano" width="380" height="300"></canvas>
    <script>
      if('${dato.type}' == 'year'){
        function chartfannew(){

            var BarChart = {
             labels: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],
             datasets: [{
             fillColor: "rgba(59, 178, 115, 0.52)",
             strokeColor: "rgb(59, 178, 115)",
             data: [${dato.allfansy.months.enero}, ${dato.allfansy.months.febrero}, ${dato.allfansy.months.marzo}, ${dato.allfansy.months.abril}, ${dato.allfansy.months.mayo}, ${dato.allfansy.months.junio}, ${dato.allfansy.months.julio}, ${dato.allfansy.months.agosto}, ${dato.newfansy.months.septiembre}, ${dato.newfansy.months.octubre}, ${dato.newfansy.months.noviembre}, ${dato.newfansy.months.diciembre}]
             }]
            }
          var ctx = document.getElementById("newfans${dato.year}ano").getContext("2d");
          var myBarChart = new Chart(ctx).Bar(BarChart, {scaleFontSize : 13, scaleFontColor : "#000000"});
        }
      }
      chartfannew();
    </script>
  </div>`
  }

  function genechartnolikes(dato){
    return yo`<div>
    <canvas id="nolikes${dato.year}ano" width="380" height="300"></canvas>
    <script>
      if('${dato.type}' == 'year'){
        function chartnolikes(){

            var BarChart = {
             labels: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],
             datasets: [{
             fillColor: "rgba(243, 146, 55, 0.52)",
             strokeColor: "rgb(243, 146, 55)",
             data: [${dato.allfansy.months.enero}, ${dato.allfansy.months.febrero}, ${dato.allfansy.months.marzo}, ${dato.allfansy.months.abril}, ${dato.allfansy.months.mayo}, ${dato.allfansy.months.junio}, ${dato.allfansy.months.julio}, ${dato.allfansy.months.agosto}, ${dato.nolikesy.months.septiembre}, ${dato.nolikesy.months.octubre}, ${dato.nolikesy.months.noviembre}, ${dato.nolikesy.months.diciembre}]
             }]
            }
          var ctx = document.getElementById("nolikes${dato.year}ano").getContext("2d");
          var myBarChart = new Chart(ctx).Bar(BarChart, {scaleFontSize : 13, scaleFontColor : "#000000"});
        }
      }
      chartnolikes();
    </script>
  </div>`
  }

  function genechartprints(dato){
    return yo`<div>
    <canvas id="impresion${dato.year}ano" width="380" height="300"></canvas>
    <script>
      if('${dato.type}' == 'year'){
        function chartprints(){
          var LineChart = {
           labels: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],
           datasets: [{
           fillColor: "rgba(225, 188, 41, 0.52)",
           strokeColor: "rgb(225, 188, 41)",
           pointColor: "rgba(220,220,220,1)",
           pointStrokeColor: "#fff",
           data: [${dato.allfansy.months.enero}, ${dato.allfansy.months.febrero}, ${dato.allfansy.months.marzo}, ${dato.allfansy.months.abril}, ${dato.allfansy.months.mayo}, ${dato.allfansy.months.junio}, ${dato.allfansy.months.julio}, ${dato.allfansy.months.agosto}, ${dato.printsy.months.septiembre}, ${dato.printsy.months.octubre}, ${dato.printsy.months.noviembre}, ${dato.printsy.months.diciembre}]
           }]
          }

          var ctx = document.getElementById("impresion${dato.year}ano").getContext("2d");
          var myLineChart = new Chart(ctx).Line(LineChart, {scaleFontSize : 13, scaleFontColor : "#000000"});
        }
      }
      chartprints();
    </script>
  </div>`
  }

  function genechartactiveusers(dato){
    return yo`<div>
    <canvas id="usuariosact${dato.year}ano" width="380" height="300"></canvas>
    <script>
      if('${dato.type}' == 'year'){
        function chartactiveusers(){

          var LineChart = {
           labels: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],
           datasets: [{
           fillColor: "rgba(83, 168, 195, 0.52)",
           strokeColor: "rgb(83, 168, 195)",
           pointColor: "rgba(220,220,220,1)",
           pointStrokeColor: "#fff",
           data: [${dato.allfansy.months.enero}, ${dato.allfansy.months.febrero}, ${dato.allfansy.months.marzo}, ${dato.allfansy.months.abril}, ${dato.allfansy.months.mayo}, ${dato.allfansy.months.junio}, ${dato.allfansy.months.julio}, ${dato.allfansy.months.agosto}, ${dato.activeusersy.months.septiembre}, ${dato.activeusersy.months.octubre}, ${dato.activeusersy.months.noviembre}, ${dato.activeusersy.months.diciembre}]
           }]
          }

          var ctx = document.getElementById("usuariosact${dato.year}ano").getContext("2d");
          var myLineChart = new Chart(ctx).Line(LineChart, {scaleFontSize : 13, scaleFontColor : "#000000"});
        }
      }
      chartactiveusers();
    </script>
  </div>`
  }

  function genechartgenre(dato){
    return yo`<div>
    <canvas id="genero${dato.year}" width="150" height="150"></canvas>
    <script>
      if('${dato.type}' == 'year'){
        function chartgenre(){
          var generoData = [
          				{
          					value: ${dato.genre.women},
          					color: "#F39237",
          					highlight: "rgba(243,146,55,0.8)",
          					label: "Mujeres"},
          				{
          					value: ${dato.genre.men},
          					color: "#53A8C3",
          					highlight: "rgba(83,168,195,0.80)",
          					label: "Hombres"
          				}
          			];

          var ctx = document.getElementById("genero${dato.year}").getContext("2d");
          window.myPie = new Chart(ctx).Pie(generoData);
        }
      }
      chartgenre();
    </script>
  </div>`
  }

  function genechartage(dato){
    return yo`<div>
    <canvas id="edad${dato.year}" width="150" height="150"></canvas>
    <script>
      if('${dato.type}' == 'year'){
        function chartage(){
          var edadData = [
          				{
          					value: ${dato.age.ppal},
          					color:"#53A8C3",
          					highlight: "rgba(83,168,195,0.80)",
          					label: "25 - 34 Años"},
          				{
          					value: ${dato.age.others},
          					color: "#3BB273",
          					highlight: "rgba(59,178,115,0.8)",
          					label: "Otros"
          				}
          			];

          var ctx = document.getElementById("edad${dato.year}").getContext("2d");
          window.myPie = new Chart(ctx).Pie(edadData);
        }
      }
      chartage();
    </script>
  </div>`
  }

  function genechartlanguage(dato){
    return yo`<div>
    <canvas id="idioma${dato.year}" width="150" height="150"></canvas>
    <script>
      if('${dato.type}' == 'year'){
        function chartlanguage(){
          var idiomaData = [
         				{
         					value: ${dato.language.ppal},
         					color:"#F39237",
         					highlight: "rgba(243,146,55,0.8)",
         					label: "Español"},
         				{
         					value: ${dato.language.others},
         					color: "#3BB273",
         					highlight: "rgba(59,178,115,0.8)",
         					label: "Otros"
         				}
         			];

          var ctx = document.getElementById("idioma${dato.year}").getContext("2d");
          window.myPie = new Chart(ctx).Pie(idiomaData);
        }
      }
      chartlanguage();
    </script>
  </div>`
  }

  function genechartcountry(dato){
    return yo`<div>
    <canvas id="pais${dato.year}" width="150" height="150"></canvas>
    <script>
      if('${dato.type}' == 'year'){
        function chartcountry(){
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

          var ctx = document.getElementById("pais${dato.year}").getContext("2d");
          window.myPie = new Chart(ctx).Pie(paisData);
        }
      }
      chartcountry();
    </script>
  </div>`
  }

  function genechartcity(dato){
    return yo`<div>
    <canvas id="ciudades${dato.year}" width="150" height="150"></canvas>
    <script>
      if('${dato.type}' == 'year'){
        function chartcity(){
          var ciudadesData = [
        				{
        					value: ${dato.city.ppal},
        					color:"#3BB273",
        					highlight: "rgba(59,178,115,0.8)",
        					label: "Medellín"},
        				{
        					value: ${dato.city.sec},
        					color:"#E1BC29",
        					highlight: "rgba(225,188,41,0.80)",
        					label: "Bogotá"},
        				{
        					value: ${dato.city.others},
        					color: "#53A8C3",
        					highlight: "rgba(83,168,195,0.80)",
        					label: "Otros"
        				}
        			];

          var ctx = document.getElementById("ciudades${dato.year}").getContext("2d");
          window.myPie = new Chart(ctx).Pie(ciudadesData);
        }
      }
      chartcity();
    </script>
  </div>`
  }
}
