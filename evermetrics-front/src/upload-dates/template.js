var yo = require('yo-yo');
var landing = require('../landing');
var request = require('superagent');
var datafb = [];
var datajson = "";

var upform = yo`<div class="col l12">
      <div class="row" >
        <div class="col sm12 m10 offset-m1 l8 offset-l2 center-align">
        <h3 class="titleUploadred"><i class="fa fa-facebook" aria-hidden="true"></i>Facebook</h3>
          <form enctype="multipart/form-data" class="form-upload" id="formUpload" onsubmit=${onsubmit}>
            <div id="fileName" class="fileUpload btn">
              <span><i class="fa fa-file-excel-o" aria-hidden="true" style="padding-right:10px;"></i>Subir archivo</span>
              <input name="fileexcel" id="file" type="file" class="upload" onchange=${onchange} />
            </div>
            <button id="btnUpload" type="submit" class="btn hide">Subir</button>
            <button id="btnCancel" type="button" style="background-color:#f39237;" class="btn hide" onclick=${cancel}><i class="fa fa-times" aria-hidden="true"></i></button>
          </form>
           <span id="fotoUpExito" class="hide">El archivo se ha subido con éxito.</span>
        </div>
      </div>
      <div class="row" style="display:none;">
        <div class="signup-box">
          <form class="signup-form" action="/api/estadisticas" method="POST">
            <div class="divider"></div>
            <div class="section" style="text-align:center;">
              <input type="text" name="red" value="fb" style="display:none;">
              <input type="text" name="type" value="month" style="display:none;">
              <input type="text" name="year" value="2017" placeholder="Año">
              <input type="text" name="month" placeholder="Mes">
              <input type="text" name="allfans" placeholder="Fans totales">
              <input type="text" name="newfans" placeholder="Fans nuevos">
              <input type="text" name="prints" placeholder="Impresiones">
              <input type="text" name="nolikes" placeholder="No me gustas">
              <input type="text" name="activeusers" placeholder="Usuarios activos">
              <input type="text" name="likebyday" placeholder="Me Gusta (promedio por día)">
              <input type="text" name="postbymonth" placeholder="Post en el mes">
              <input type="text" name="scopebyday" placeholder="Alcance (promedio por día)">
              <input type="text" name="externalreference" placeholder="Referencias Externas">
              <input type="text" name="viewswindows" placeholder="Vistas Pestañas">
              <input type="text" name="topwindows" placeholder="Principales Pestañas">
              <input type="text" name="topreference" placeholder="Principales Referencias">
              <input type="text" name="postsrc" placeholder="Post más efectivo">
              <input type="text" name="datespost" placeholder="Datos del post">
              <button class="btn waves-effect waves-light btn-login" type="submit">Registrar</button>
            </div>
          </form>
        </div>
      </div>
      <div class="row"  style="display:none;">
        <div id="caja" class="contBtnUpdate" style="text-align: center;margin: 40px 0 10px;">
          <div class="contFecha" style="display:flex;">
             <div style="flex:1;text-align: right;padding: 0 10px;"><input type="date" id="since" style="width:50%;border: 1px solid #7ae7c7;color: #7ae7c7;border-radius: 4px;padding: 0 15px;"></div>
             <div style="flex:1;text-align: left;"><input type="date" id="until" style="width:50%;border: 1px solid #7ae7c7;color: #7ae7c7;border-radius: 4px;padding: 0 15px;"></div>
          </div>
          <input type="button"  class="btn" value="Cargar fecha" onclick=${inicializarApi}></input>
          <input type="button" id="actualizarfb" class="btn hide" value="Actualizar" onclick=${controlBtn}></input>
        </div>
      </div>
      <div class="row">
        <a href="/">Volver a la cuenta</a>
      </div>
    </div>`;

    function toggleButtons(){
      document.getElementById('fileName').classList.toggle('hide');
      document.getElementById('btnUpload').classList.toggle('hide');
      document.getElementById('btnCancel').classList.toggle('hide');
    }
    function cancel(){
      toggleButtons();
      document.getElementById('formUpload').reset();
    }

    function onchange() {
      toggleButtons();
    }

    function onsubmit(ev){
      ev.preventDefault();
      var data = new FormData(this);
      request
        .post('/api/estadisticas')
        .send(data)
        .end(function(err, res){
          toggleButtons();
          document.getElementById('formUpload').reset();
          document.getElementById("fotoUpExito").classList.toggle("hide");
          //  Hacemos aparecer el rotulito que le avisa al usuario que la foto seha Subido.
          //Esto se encuentra enla etiqueta "span" debajo de la etiqueta “form”.
          setTimeout(function(){
            document.getElementById("fotoUpExito").classList.toggle("hide");
          }, 2000)
          // Con esta función RETRASADA, quitamos el rotulito que previamente mostramos al usuario,
          // ya que no hay necesidad de que permanezca ahí visible.
        })
    }

    function inicializarApi(){
      var token= 'EAACEdEose0cBAEhcYmrtuZAUE8jbStJsHYx9l9nohnPAdoHAJtwMf1lBwdcInzVtZAA5LRQxFD7mx5cagQiu1ygZArv8VsyUkgwlV5lmZCbDwjl7Oit5VwZCQqZCllBY8sqmbKib8ClkbHn8CKecMIDuFymG4GV66eARfJvSnpxhO9Djf1BDNEE8dG3dVOKZBcZD';
      var dateSince = document.getElementById('since').value;
      var dateUntil = document.getElementById('until').value;

      console.log(dateSince);
      console.log(dateUntil);
      function splitDate(date){
          var result = date.split('-');
          console.log(result);
          return result;

      }

      var nowkdate = splitDate(dateSince);
      console.log(nowkdate);
      var yearspl = nowkdate[0];
      var monthspl = parseInt(nowkdate[1]);
      console.log(yearspl);
      console.log(monthspl);

      switch(monthspl) {
          case 1:
              console.log('enero');
              break;
          case 2:
              console.log('febrero');
              break;
          case 3:
              console.log('marzo');
              break;
          case 4:
              console.log('abril');
              break;
          case 5:
              console.log('mayo');
              break;
          case 6:
              console.log('junio');
              break;
          case 7:
              console.log('julio');
              break;
          case 8:
              console.log('agosto');
              break;
          case 9:
              console.log('septiembre');
              break;
          case 10:
              console.log('octubre');
              break;
          case 11:
              console.log('noviembre');
              break;
          case 12:
              console.log('diciembre');
              break;
          default:
              console.log('otro')
      }

      /*var parts = '2017-05-03'.split('-');
      //please put attention to the month (parts[0]), Javascript counts months from 0:
      // January - 0, February - 1, etc
      var myDate = new Date(parts[2],parts[0]-1,parts[1]);
      console.log(myDate);
      var yearp = myDate.getFullYear();
      var monthp = ("0" + myDate.getMonth()).slice(-2);
      var dayp = ("0" + myDate.getDate()).slice(-2);*/

      dateSince += " 00:00:00";
      dateUntil += " 23:59:59";

      var sinceR = Date.parse(dateSince+"-0500")/1000;
      var untilR = Date.parse(dateUntil+"-0500")/1000;

      createObject(token, sinceR, untilR, function(key, dato){
           /*datafb.push(dato);*/
           datajson += '"'+ key + '":"' + dato + '", ';
           /*if(dato.length>1){
               console.log(dato);
               console.log('tres veces');
           }else{
             console.log('muchas veces');
           }*/
       });
       toggleButtonAct();

    }

    function toggleButtonAct(){
      document.getElementById('actualizarfb').classList.toggle('hide');
    }

    function controlBtn(){
/*
      function splitDate(date){
          return  result = date.split('-');
      }
      var dateSince = document.getElementById('since').value;

      var nowkdate = splitDate(dateSince);
      var yearspl = nowkdate[0];
      var monthspl = nowkdate[1];
      console.log(yearspl);
      console.log(monthspl);*/
      subir('fb', 'month','mayo','2017');
    }

    function subir(red, type, month, year){
      console.log(datajson);
      var objeto ='{';
      objeto +=datajson;
      objeto +='"red":"'+red+'",';
      objeto +='"type":"'+type+'",';
      objeto +='"year":"'+year+'",';
      objeto +='"month":"'+month+'"}';

      console.log(objeto);
      //console.log(objeto);
      var o = JSON.parse(objeto);
      //console.log(datafb);
      console.log(o);

      request
        .post('/api/estadisticas')
        .send(o)
        .end(function(err, res){
          if (err) console.log(err);
          console.log(res);//arguments es una array de todos lo parametros que recibe una función
      })
    }

    function datePage(token){
      FB.api(
        '/maratondelasfloresmedellin',
        'GET',
        {"fields":"id,name,about,likes,fan_count,posts,new_like_count,impressum,can_post,best_page,were_here_count", access_token: token},
        function (response) {
          if (response && !response.error) {
              //console.log(response);
              return response;
            }
            else {
              console.log(response.error);
            }
        }
      );
    }

    function createObject(token, sinceR, untilR, callback){
      window.fbAsyncInit = function() {
          FB.init({
            appId      : '563428367190351',
            secret     : '0657823647bd8087717cc22e29c1e1be',
            xfbml      : true,
            version    : 'v2.9'
          })
          FB.api(
            '/maratondelasfloresmedellin',
            'GET',
            {"fields":"id,name,about,likes,fan_count,posts,new_like_count,impressum,can_post,best_page,were_here_count", access_token: token},
            function (response) {
              if (response && !response.error) {
                  console.log(response.fan_count + ' total fans');
                  var key = "totalFans";
                  callback(key, response.fan_count);
                }
                else {
                  console.log(response.error);
                }
            }
          );
          FB.api(
              '/maratondelasfloresmedellin/insights/page_fan_adds',
              {"since":sinceR, "until":untilR, access_token: token},
              function(response) {
                if (response && !response.error) {
                  var fansNews = 0;
                  response.data.map(function(datos){
                    datos.values.map(function(valor){
                      fansNews= fansNews + valor.value;
                    })
                  })
                  parseInt(fansNews);
                  console.log(fansNews + ' total new fans');
                  var key = "fansNews";
                  callback(key,fansNews);
                }
                else {
                  console.log(response.error);
                }
              }
          );
          FB.api(
              '/maratondelasfloresmedellin/insights/page_fan_removes',
              {"since":sinceR, "until":untilR, access_token: token},
              function (response) {
                if (response && !response.error) {
                  var fansRemove=0;
                  response.data.map(function(datos){
                    datos.values.map(function(valor){
                      fansRemove= fansRemove + valor.value;
                    })
                  })
                  console.log(fansRemove + ' total no me gustas');
                  var key = "fansRemove";
                  callback(key, fansRemove);
                }
                else {
                  console.log(response.error);
                }
              }
          );
          FB.api(
              '/maratondelasfloresmedellin/insights/page_impressions',
              {"period":"day", "since":sinceR, "until":untilR, access_token: token},
              function (response) {
                if (response && !response.error) {
                  var impresions=0;
                  response.data.map(function(datos){
                    datos.values.map(function(valor){
                      impresions= impresions + valor.value;
                    })
                  })
                  console.log(impresions + ' total impresiones');
                  var key = "impresions";
                  callback(key, impresions);
                }
                else {
                  console.log(response.error);
                }
              }
          );
          FB.api(
              '/maratondelasfloresmedellin/insights/page_engaged_users',
              {"period":"day", "since":sinceR, "until":untilR, access_token: token},
              function (response) {
                if (response && !response.error) {
                  var activeusers=0;
                  response.data.map(function(datos){
                    datos.values.map(function(valor){
                      activeusers= activeusers + valor.value;
                    })
                  })
                  console.log(activeusers + ' total usuarios activos');
                  var key = "activeUsers";
                  callback(key, activeusers);
                }
                else {
                  console.log(response.error);
                }
              }
          );
          FB.api(
              '/maratondelasfloresmedellin/insights/page_actions_post_reactions_like_total',
              {"since":sinceR, "until":untilR, access_token: token},
              function (response) {
                if (response && !response.error) {
                  var megustapro=0;
                  var numDias=0;
                  response.data.map(function(datos){
                    datos.values.map(function(valor){
                      megustapro= megustapro + valor.value;
                    })
                    numDias = datos.values.length;
                  })
                  var promedioDia = megustapro / numDias;
                  promedioDia = parseInt(promedioDia, 10);//pasar el nùmero a entero
                  console.log(promedioDia + ' Promedio por día');
                  var key = "promLikesByDay";
                  callback(key, promedioDia);
                }
                else {
                  console.log(response.error);
                }
              }
          );
          FB.api(
              '/maratondelasfloresmedellin/insights/page_admin_num_posts',
              {"period":"day", "since":sinceR, "until":untilR, access_token: token},
              function (response) {
                if (response && !response.error) {
                  var postinmonth=0;
                  response.data.map(function(datos){
                    datos.values.map(function(valor){
                      postinmonth= postinmonth + valor.value;
                    })
                  })
                  console.log(postinmonth + ' Post en el mes');
                  var key = "postInMonth";
                  callback(key, postinmonth);
                }
                else {
                  console.log(response.error);
                }
              }
          );
          FB.api(
               '/maratondelasfloresmedellin/insights/page_views_external_referrals',
               {"since":sinceR, "until":untilR, access_token: token},
               function (response) {
                 if (response && !response.error) {
                   var numrefexternal=0;
                   response.data.map(function(datos){
                     datos.values.map(function(valor){
                       for(var i in valor.value){
                         numrefexternal = numrefexternal + valor.value[i];
                       }
                     })
                   })
                   console.log(numrefexternal + ' total referencias externas');
                   var key = "numRefExternal";
                   callback(key, numrefexternal);
                 }
                 else {
                   console.log(response.error);
                 }
               }
           );
           FB.api(
             '/maratondelasfloresmedellin/insights/page_views_external_referrals',
             {"since":sinceR, "until":untilR, access_token: token},
             function (response) {
               if (response && !response.error) {
                 var numrefexternal = 0;
                 var nummayor =0;
                 var nummedio =0;
                 var numter =0;
                 var objectmayor=[];
                 var objectmedio=[];
                 var objecter=[];
                 var yaestam= [];
                 response.data.map(function(datos){
                   datos.values.map(function(valor){

                     for(var i in valor.value){
                         var key = i;
                         numrefexternal = valor.value[i];
                         var index = yaestam.indexOf(key);
                         if(numrefexternal > nummayor && index === -1){
                           nummayor = numrefexternal;
                           objectmayor = [key, nummayor];
                           yaestam.push(key);
                         }else if(numrefexternal > nummayor && objectmayor[0] === key){
                           nummayor = numrefexternal;
                           objectmayor = [key, nummayor];
                         }
                         else if(nummedio < nummayor && nummedio < numrefexternal && index === -1){
                           nummedio = numrefexternal;
                           objectmedio = [key, nummedio];
                           yaestam.push(key);
                         }else if(nummedio < nummayor && nummedio < numrefexternal && objectmedio[0] === key){
                           nummedio = numrefexternal;
                           objectmedio = [key, nummedio];
                         }
                         else if(numter<numrefexternal && numter < nummedio && index === -1){
                           numter = numrefexternal;
                           objecter = [key, numter]
                           yaestam.push(key);
                         }else if(numter<numrefexternal && numter < nummedio && objecter[0] === key){
                           numter = numrefexternal;
                           objecter = [key, numter]
                         }
                     }
                   })
                 })


                var cadenaPrinRef = objectmayor[0] + ': ' + objectmayor[1] + ' ' + objectmedio[0] + ': ' + objectmedio[1] + ' ' + objecter[0] + ': ' + objecter[1];
                 var key = "princRef";
                 callback(key, cadenaPrinRef);
               }
               else {
                 console.log(response.error);
               }
             }
          );
          FB.api(
               '/maratondelasfloresmedellin/insights/page_tab_views_login_top_unique',
               {"period":"day","since":sinceR, "until":untilR, access_token: token},
               function (response) {
                 if (response && !response.error) {
                   var numviewtabs=0;
                   response.data.map(function(datos){
                     datos.values.map(function(valor){
                       for(var i in valor.value){
                         numviewtabs = numviewtabs + valor.value[i];
                       }
                     })
                   })
                   console.log(numviewtabs + ' total vistas pestañas');
                   var key = "numViewsTabs";
                   callback(key, numviewtabs);
                 }
                 else {
                   console.log(response.error);
                 }
               }
           );
           FB.api(
               '/maratondelasfloresmedellin/insights/page_tab_views_login_top_unique',
               {"period":"day","since":sinceR, "until":untilR, access_token: token},
               function (response) {
                 if (response && !response.error) {
                   var numviewtabs=0;
                   var numviewmayor=0;
                   var numviewmedio=0;
                   var numviewmenor=0;
                   var objectmayor=[];
                   var objectmedio=[];
                   var objecter=[];
                   var yaestam= [];
                   var acummayor=0;
                   var acummedio=0;
                   var acummenor=0;
                   response.data.map(function(datos){
                     datos.values.map(function(valor){

                       for(var i in valor.value){
                           var key = i;
                           numviewtabs = valor.value[i];
                           var index = yaestam.indexOf(key);
                           if(numviewtabs > numviewmayor && index === -1){
                             numviewmayor = numviewtabs;
                             objectmayor = [key, numviewmayor];
                             yaestam.push(key);
                           }else if(numviewtabs > numviewmayor && objectmayor[0] === key){
                             numviewmayor = numviewtabs;
                             objectmayor = [key, numviewmayor];
                           }
                           else if(numviewmedio < numviewmayor && numviewmedio < numviewtabs && index === -1){
                             numviewmedio = numviewtabs;
                             objectmedio = [key, numviewmedio];
                             yaestam.push(key);
                           }else if(numviewmedio < numviewmayor && numviewmedio < numviewtabs && objectmedio[0] === key){
                             numviewmedio = numviewtabs;
                             objectmedio = [key, numviewmedio];
                           }
                           else if(numviewmenor<numviewtabs && numviewmenor < numviewmedio && index === -1){
                             numviewmenor = numviewtabs;
                             objecter = [key, numviewmenor]
                             yaestam.push(key);
                           }else if(numviewmenor<numviewtabs && numviewmenor < numviewmedio && objecter[0] === key){
                             numviewmenor = numviewtabs;
                             objecter = [key, numviewmenor]
                           }
                       }

                     })
                   })
                   response.data.map(function(datos){
                     datos.values.map(function(valor){

                       for(var i in valor.value){
                           if(objectmayor[0] === i){
                             acummayor = acummayor + valor.value[i];
                           }
                       }
                       for(var i in valor.value){
                           if(objectmedio[0] === i){
                             acummedio = acummedio + valor.value[i];
                           }
                       }
                       for(var i in valor.value){
                           if(objecter[0] === i){
                             acummenor = acummenor + valor.value[i];
                           }
                       }

                     })
                   })
                   /*console.log(objectmayor[0] + ' ' + acummayor + ' mayor');
                   var arrayMayor =[objectmayor[0], acummayor];
                   console.log(objectmedio[0] + ' ' + acummedio + ' medio');
                   var arrayMedio =[objectmedio[0], acummedio];
                   console.log(objecter[0] + ' ' + acummenor + ' menor');
                   var arrayMenor =[objecter[0], acummenor];
                   var arrayPrinTabs = [arrayMayor,arrayMedio,arrayMenor]*/
                   var key = "princTabs";
                   /*var cadenaPrinTabs = objectmayor[0] + ': ' + acummayor + '\n'
                     + objectmedio[0]  + ': ' + acummedio + '\n'
                     + objecter[0] + ': ' + acummenor;*/
                     var cadenaPrinTabs = objectmayor[0] + ': ' + acummayor + ' '+ objectmedio[0]  + ': ' + acummedio + ' ' + objecter[0] + ': ' + acummenor;
                      console.log(cadenaPrinTabs);
                   callback(key, cadenaPrinTabs);
                 }
                 else {
                   console.log(response.error);
                 }
               }
           );
           FB.api(
               '/maratondelasfloresmedellin/insights/page_views_total',
               {"period": "day","since":sinceR, "until":untilR, access_token: token},
               function (response) {
                 if (response && !response.error) {
                   var totalViewPage = 0;
                   var numDias = 0;
                   response.data.map(function(datos){
                     datos.values.map(function(valor){
                       totalViewPage= totalViewPage + valor.value;
                     })
                     numDias = datos.values.length;
                   })
                   var promDiaAlcance = totalViewPage / numDias;
                   promDiaAlcance = parseInt(promDiaAlcance, 10);
                   console.log(promDiaAlcance + ' Promedio día de alcance ');
                   var key = "promAlcByDay";
                   callback(key, promDiaAlcance);
                 }
                 else {
                   console.log(response.error);
                 }
               }
           );
           FB.api(
             '/maratondelasfloresmedellin',
             'GET',
             {"fields":"id,name,posts.until("+ untilR +").since("+ sinceR +"){likes,comments,message,created_time,full_picture,link,insights.metric(post_impressions_unique)}", access_token: token},
             function (response) {
               if (response && !response.error) {
                   var numLikes = 0;
                   var numComments = 0;
                   var bestPostId;
                   var posicionBest;
                   var mayorCantLikes = 0;
                   var alcancepost = 0;
                   response.posts.data.map(function(datos, indexE){

                     if(datos.likes !== undefined ){
                       datos.likes.data.map(function(valor){
                         numLikes = datos.likes.data.length;
                       })
                     }else{
                         numLikes = 0;
                     }
                     if(numLikes > mayorCantLikes){
                       mayorCantLikes = numLikes;
                       bestPostId = datos.id;
                       posicionBest = indexE;
                     }
                   })

                   console.log('El post de mayor likes es ' + bestPostId + ' con ' + mayorCantLikes);

                   console.log(response.posts.data[posicionBest].id);
                   var datetime = new Date(response.posts.data[posicionBest].created_time).toUTCString().split(" ").slice(1,4).join(" ");//new Date(datos.created_time).toDateString();
                   var messagePost = response.posts.data[posicionBest].message;
                   var link = response.posts.data[posicionBest].link;
                   var rutaImg = response.posts.data[posicionBest].full_picture;
                   /*if(response.posts.data[posicionBest] !== undefined ){
                     response.posts.data[posicionBest].likes.data.map(function(valor){
                       numLikes = response.posts.data[posicionBest].likes.data.length;
                     })
                   }else{
                       numLikes = 0;
                   }*/

                   if(response.posts.data[posicionBest].comments !== undefined){
                     response.posts.data[posicionBest].comments.data.map(function(valor){
                       numComments = response.posts.data[posicionBest].comments.data.length;
                     })
                   }else {
                     numComments = 0;
                   }

                   if(response.posts.data[posicionBest].insights !== undefined){
                     response.posts.data[posicionBest].insights.data.map(function(valor){
                       valor.values.map(function(dato){
                         alcancepost=dato.value;
                       })
                     })
                   }else {
                     alcancepost = 0;
                   }

                   var arrayBestPost = [datetime, link, rutaImg, numLikes, numComments, alcancepost];
                   var key = "bestPost";
                   console.log(arrayBestPost);
                   callback(key, arrayBestPost);
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
      }


module.exports = landing(upform);
