var yo = require('yo-yo');
var landing = require('../landing');

var updatebtn = yo`<div class="col l12">
      <div class="row">
        <div id="caja" class="contBtnUpdate" style="text-align: center;margin: 40px 0 10px;">
          <input type="button"  class="btn" value="Actualizar" onclick=${datesfb}>
        </div>
      </div>
    </div>`;


function datesfb(){
    window.fbAsyncInit = function() {
      FB.init({
        appId      : '563428367190351',
        secret     : '0657823647bd8087717cc22e29c1e1be',
        xfbml      : true,
        version    : 'v2.9'
      })
      /*FB.api(
        '/me',
        'GET',
        {"fields":"id,name,about,likes,posts", access_token: 'EAAaZCZCVDNsU4BAM8OgVJqnc6JLDSSg189AnZAf0O3iuxf53lPMXvRIQyVuvz6TvHmZAZCXrbq8dp7Y0tdVeOHZCJShEMUWQOgvvYBnT2atdjM3ZC3kZAPAZCgIOwAF4mlmAATYJhdieEHpIIt3C4hSzEiMwu1kOe6Q8ZD'},
        function(response) {
          console.log(response);
          mostrardates(response.name);
          console.log(response.name);
        }
      );*/
      //{"fields":"id,name,about,link,talking_about_count,fan_count,engagement,posts{likes,comments,link,message,reactions}", access_token: 'EAAIAb2OuyU8BACUUDpxKPyaZA2ur72UMZCbFBbZCUBgCp0DxHbyVkouwtkU04ebakvM1IfquvKrDek36fZAKfBFr2BWPhVZBPOvQwgy64VKyBKjaIZBUpKpTuVNlhiOANGZAa5uDOL25ZCVe4ZCEA4JlDf0ZAkL9MJsfgZD'},

/*      FB.api(
        '/eversocial',
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
      );*/
      /*FB.api(
          '/eversocial/insights/page_impressions,page_fan_adds,page_fan_removes,page_views_login,page_admin_num_posts,post_fan_reach,page_views_external_referrals,page_tab_views_login_top_unique',
          {"since":"1493614800", "until":"1494133200", access_token: 'EAACEdEose0cBAGKxoYE8cPkuKKFqKwqmhxIwWyANPKCG4dqS8qTcud1cLkyUVSnWia1ePrfFK3CM7DyvHI9NLaUA8ujmaRKQHZC7r76RkHHXc2Hd7HbTsnnv5yxjNbNq9uJOSAn05ZBDrUwUZAxqi5z30RVbR7voNr0zROlBcExdam2F4YSkt4hHSNpX24ZD'},
          function (response) {
            if (response && !response.error) {
              console.log(response);
            }
            else {
              console.log(response.error);
            }
          }
      );*/
      //token app evermetric EAAIAb2OuyU8BAKGwCoOE2wexkpx4ZCcBLiwkDtX6Ybf1FdCokv4Fc8pGnOWzWtH4znQyNylLA759ZBa5sGFa3oqUKiiMPEX67OzCjbkAzB6WVPi7eewYHewpYZCZBOkaOKglDHOp6RaIZCb5QV6Ilgpz3C4xCVT4ZD
      //token de app prueba EAAaZCZCVDNsU4BAM8OgVJqnc6JLDSSg189AnZAf0O3iuxf53lPMXvRIQyVuvz6TvHmZAZCXrbq8dp7Y0tdVeOHZCJShEMUWQOgvvYBnT2atdjM3ZC3kZAPAZCgIOwAF4mlmAATYJhdieEHpIIt3C4hSzEiMwu1kOe6Q8ZD
      var token= 'EAACEdEose0cBABiPCikVC87LnJvhiatFZBrWkaAiist3F9qNHkIFOiV6WUb5Ei9qtxFQQcVt61ksvJhgkyXZC05rUNKUkaN6cY8sNSupyYkhMI2xB56p7i3MBlXpaWFVqRuVlZBMqAqZARDgUCaELunsPDuJSAbIypeeGP6v6cpFRZCnAZBm0n9gexJxxIdqgZD';
      FB.api(
        '/maratondelasfloresmedellin/insights/page_views_external_referrals',
        {"since":"1496206800", "until":"1498885199", access_token: token},
        function (response) {
          console.log(response);
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
          }
          else {
            console.log(response.error);
          }
        }
     );

      /*FB.api(
        '/maratondelasfloresmedellin',
        'GET',
        {"fields":"id,name,posts.until(1498885199).since(1496206800){likes,comments,message,created_time,full_picture,link,insights.metric(post_impressions_unique)}", access_token: token},
        function (response) {
          console.log(response);
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
              if(response.posts.data[posicionBest] !== undefined ){
                response.posts.data[posicionBest].likes.data.map(function(valor){
                  numLikes = response.posts.data[posicionBest].likes.data.length;
                })
              }else{
                  numLikes = 0;
              }

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
            }
            else {
              console.log(response.error);
            }
        }
      );*/

      /*FB.api(
          '/maratondelasfloresmedellin/insights/page_tab_views_login_top_unique',
          {"period":"day","since":"1496206800", "until":"1498885199", access_token: token},
          function (response) {
            console.log(response);
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
                    console.log(i);
                      if(objectmayor[0] === i){
                        acummayor = acummayor + valor.value[i];
                      }
                      if(objectmedio[0] === i){
                        acummedio = acummedio + valor.value[i];
                      }
                      if(objecter[0] === i){
                        acummenor = acummenor + valor.value[i];
                      }
                  }


                })
              })

              var key = "princTabs";

                var cadenaPrinTabs = objectmayor[0] + ': ' + acummayor + ' '+ objectmedio[0]  + ': ' + acummedio + ' ' + objecter[0] + ': ' + acummenor;
                 console.log(cadenaPrinTabs);
            }
            else {
              console.log(response.error);
            }
          }
      );*/

         /*FB.api(
           '/maratondelasfloresmedellin/insights/page_views_external_referrals',
           {"since":"1496206800", "until":"1498885199", access_token: token},
           function (response) {
             console.log(response);
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
                       console.log(key);
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


               var arrayPrinRef = [objectmayor,objectmedio,objecter];
               console.log(arrayPrinRef);
              /* var cadenaPrinRef = objectmayor[0] + ': ' + objectmayor[1] + '\n'
                 + objectmedio[0] + ': ' + objectmedio[1] + '\n'
                 + objecter[0] + ': ' + objecter[1];cierro comentario
              var cadenaPrinRef = objectmayor[0] + ': ' + objectmayor[1] + ' ' + objectmedio[0] + ': ' + objectmedio[1] + ' ' + objecter[0] + ': ' + objecter[1];
             }
             else {
               console.log(response.error);
             }
           }
        );*/
      /*FB.api(
          '/maratondelasfloresmedellin/insights/page_tab_views_login_top_unique',
          {"period":"day","since":"1493614800", "until":"1494478800", access_token: token},
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

              var arrayMayor =[objectmayor[0], acummayor];
              var arrayMedio =[objectmedio[0], acummedio];
              var arrayMenor =[objecter[0], acummenor];
              var arrayPrinTabs = [arrayMayor,arrayMedio,arrayMenor]
              var key = "princTabs";
              console.log(objectmayor[0] + ': ' + acummayor + '\n'
              + objectmedio[0] + ': ' + acummedio + '\n'
              + objecter[0] + ': ' + acummenor);
              console.log(arrayPrinTabs);
            }
            else {
              console.log(response.error);
            }
          }
      );*/
      FB.AppEvents.logPageView();
    };

    (function(d, s, id){
       var js, fjs = d.getElementsByTagName(s)[0];
       if (d.getElementById(id)) {return;}
       js = d.createElement(s); js.id = id;
       js.src = "https://connect.facebook.net/en_US/sdk.js";
       fjs.parentNode.insertBefore(js, fjs);
     }(document, 'script', 'facebook-jssdk'));

     /*var infoPage = datePage();
     var infoStadisticas = stadisticsPage();

     alert('Datos de la página  \n Fans totales: ' + infoPage.fan_count + ' \n' +
    'Fans nuevos: ' + )*/

}


function sumarTotalViewsMayores(response){
  response.data.map(function(datos){
    datos.values.map(function(valor){

      for(var i in valor.value){
        var index2 = acum.indexOf(key);
          if(index2 === -1){
            acum.push(key);
            console.log(acum);
          }
      }
    })
  })
}

function mostrardates(response){
  alert(response);
}

function inicializarApi(){
  window.fbAsyncInit = function() {
    FB.init({
      appId      : '563428367190351',
      secret     : '0657823647bd8087717cc22e29c1e1be',
      xfbml      : true,
      version    : 'v2.9'
    })
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

function datePage(){
  FB.api(
    '/eversocial',
    'GET',
    {"fields":"id,name,about,likes,fan_count,posts,new_like_count,impressum,can_post,best_page,were_here_count", access_token: token},
    function (response) {
      if (response && !response.error) {
          console.log(response);
          return response;
        }
        else {
          console.log(response.error);
        }
    }
  );
}

function stadisticsPage(){
  FB.api(
      '/eversocial/insights/page_impressions,page_fan_adds,page_fan_removes,page_engaged_users,page_views_login,page_admin_num_posts,page_views_total,post_fan_reach,page_views_external_referrals,page_tab_views_login_top_unique',
      {"since":"1493614800", "until":"1494133200", access_token: token},
      function (response) {
        if (response && !response.error) {
          console.log(response);
          return response;
        }
        else {
          console.log(response.error);
        }
      }
  );
}

function fansNuevos(){
  FB.api(
      '/eversocial/insights/page_fan_adds',
      {"since":"1493614800", "until":"1494478800", access_token: token},
      function (response) {
        if (response && !response.error) {
          console.log(response);
          var fansNews=0;
          response.data.map(function(datos){
            datos.values.map(function(valor){
              fansNews= fansNews + valor.value;
            })
          })
          console.log(fansNews + 'total fans');
          return fansNews;
        }
        else {
          console.log(response.error);
        }
      }
  );
}

function fansRemove(){
  FB.api(
      '/eversocial/insights/page_fan_removes',
      {"since":"1493614800", "until":"1494133200", access_token: token},
      function (response) {
        if (response && !response.error) {
          console.log(response);
          var fansRemove=0;
          response.data.map(function(datos){
            datos.values.map(function(valor){
              fansRemove= fansRemove + valor.value;
            })
          })
          console.log(fansRemove + ' total no me gustas');
          return fansRemove;
        }
        else {
          console.log(response.error);
        }
      }
  );
}

function totalImpresions(){
  FB.api(
      '/eversocial/insights/page_impressions',
      {"period":"day", "since":"1493614800", "until":"1494133200", access_token: token},
      function (response) {
        if (response && !response.error) {
          console.log(response);
          var impresions=0;
          response.data.map(function(datos){
            datos.values.map(function(valor){
              impresions= impresions + valor.value;
            })
          })
          console.log(impresions + ' total impresiones');
          return impresions;
        }
        else {
          console.log(response.error);
        }
      }
  );
}

function totalUserActives(){
  FB.api(
      '/eversocial/insights/page_engaged_users',
      {"period":"day", "since":"1493614800", "until":"1494133200", access_token: token},
      function (response) {
        if (response && !response.error) {
          console.log(response);
          var activeusers=0;
          response.data.map(function(datos){
            datos.values.map(function(valor){
              activeusers= activeusers + valor.value;
            })
          })
          console.log(activeusers + ' total usuarios activos');
          return activeusers;
        }
        else {
          console.log(response.error);
        }
      }
  );
}

function promLikesByDay(){
  FB.api(
      '/eversocial/insights/page_actions_post_reactions_like_total',
      {"since":"1493614800", "until":"1494133200", access_token: token},
      function (response) {
        if (response && !response.error) {
          console.log(response);
          var megustapro=0;
          var numDias=0;
          response.data.map(function(datos){
            datos.values.map(function(valor){
              megustapro= megustapro + valor.value;
            })
            numDias = datos.values.length;
          })
          var promedioDia = megustapro / numDias;
          promedioDia = parseInt(promedioDia, 10);
          console.log(promedioDia + ' Promedio por día');
          return promedioDia ;
        }
        else {
          console.log(response.error);
        }
      }
  );
}

function postInMonth(){
  FB.api(
      '/eversocial/insights/page_admin_num_posts',
      {"period":"day", "since":"1493614800", "until":"1494133200", access_token: token},
      function (response) {
        if (response && !response.error) {
          console.log(response);
          var postinmonth=0;
          response.data.map(function(datos){
            datos.values.map(function(valor){
              postinmonth= postinmonth + valor.value;
            })
          })
          console.log(postinmonth + ' Post en el mes');
          return postinmonth;
        }
        else {
          console.log(response.error);
        }
      }
  );
}

function cantReferencesExternal(){
  FB.api(
       '/maratondelasfloresmedellin/insights/page_views_external_referrals',
       {"since":"1493614800", "until":"1494478800", access_token: token},
       function (response) {
         if (response && !response.error) {
           console.log(response);
           var numrefexternal=0;
           response.data.map(function(datos){
             datos.values.map(function(valor){
               for(var i in valor.value){
                 numrefexternal = numrefexternal + valor.value[i];
               }
             })
           })
           console.log(numrefexternal + ' total referencias externas');
           return numrefexternal;
         }
         else {
           console.log(response.error);
         }
       }
   );
}

function principalsReferencesExternal(){
  FB.api(
    '/maratondelasfloresmedellin/insights/page_views_external_referrals',
    {"since":"1493614800", "until":"1494478800", access_token: token},
    function (response) {
      if (response && !response.error) {
        console.log(response);
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
                console.log(i);
                var key = i;
                numrefexternal = valor.value[i];
                console.log(numrefexternal);
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
        console.log('mayor');
        console.log(objectmayor);
        console.log('medio');
        console.log(objectmedio);
        console.log('menor');
        console.log(objecter);
      }
      else {
        console.log(response.error);
      }
    }
   );
}

function totalViewsTabs(){
  FB.api(
       '/maratondelasfloresmedellin/insights/page_tab_views_login_top_unique',
       {"period":"day","since":"1493614800", "until":"1494478800", access_token: token},
       function (response) {
         if (response && !response.error) {
           console.log(response);
           var numviewtabs=0;
           response.data.map(function(datos){
             datos.values.map(function(valor){
               for(var i in valor.value){
                 numviewtabs = numviewtabs + valor.value[i];
               }
             })
           })
           console.log(numviewtabs + ' total vistas pestañas');
           return numviewtabs;
         }
         else {
           console.log(response.error);
         }
       }
   );
}

function principalsViewsTabs(){
  FB.api(
      '/maratondelasfloresmedellin/insights/page_tab_views_login_top_unique',
      {"period":"day","since":"1493614800", "until":"1494478800", access_token: token},
      function (response) {
        if (response && !response.error) {
          console.log(response);
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

          console.log('mayor');
          console.log(objectmayor);
          console.log(objectmayor[0] + ' ' + acummayor);
          console.log('medio');
          console.log(objectmedio);
          console.log(objectmedio[0] + ' ' + acummedio);
          console.log('menor');
          console.log(objecter);
          console.log(objecter[0] + ' ' + acummenor);
        }
        else {
          console.log(response.error);
        }
      }
  );
}

function postMoreEffective(){
  FB.api(
    '/maratondelasfloresmedellin',
    'GET',
    {"fields":"id,name,posts.until(1494478800).since(1493614800){likes,comments,message,created_time,full_picture,insights.metric(post_impressions_unique)}", access_token: token},
    function (response) {
      if (response && !response.error) {
          console.log(response);
          var numLikes = 0;
          var numComments = 0;
          var bestPostId;
          var posicionBest;
          var mayorCantLikes = 0;
          var alcancepost = 0;
          response.posts.data.map(function(datos, indexE){
            //console.log(datos.id);
            var datetime = new Date(datos.created_time).toUTCString().split(" ").slice(1,4).join(" ");//new Date(datos.created_time).toDateString();
            //console.log('Este post fué publicado el ' + datetime);
            //console.log('Mensaje del post: ' + datos.message);
            //console.log('Ruta img: ' + datos.full_picture);

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
            //  console.log('entro al if  \n' + bestPostId + ' \n' + mayorCantLikes);
            }

            //console.log('este post tiene ' + numLikes + ' me gustas.');

            if(datos.comments !== undefined){
              datos.comments.data.map(function(valor){
                numComments = datos.comments.data.length;
              })
            }else {
              numComments = 0;
            }

            //console.log('Este post tiene ' + numComments + ' comentarios.' );

            datos.insights.data.map(function(valor){
              valor.values.map(function(dato){
                alcancepost=dato.value;
              })
            })

            //console.log('Este post tiene ' + alcancepost + ' de alcance');
          })

          console.log('El post de mayor likes es ' + bestPostId + ' con ' + mayorCantLikes);
          console.log('El post de mayor likes es ' + posicionBest );

          console.log(response.posts.data[posicionBest].id);
          var datetime = new Date(response.posts.data[posicionBest].created_time).toUTCString().split(" ").slice(1,4).join(" ");//new Date(datos.created_time).toDateString();
          console.log('Este post fué publicado el ' + datetime);
          console.log('Mensaje del post: ' + response.posts.data[posicionBest].message);
          console.log('Ruta img: ' + response.posts.data[posicionBest].full_picture);
          if(response.posts.data[posicionBest] !== undefined ){
            response.posts.data[posicionBest].likes.data.map(function(valor){
              numLikes = response.posts.data[posicionBest].likes.data.length;
            })
          }else{
              numLikes = 0;
          }

          console.log('Este post tiene ' + numLikes + ' me gustas.');

          if(response.posts.data[posicionBest].comments !== undefined){
            response.posts.data[posicionBest].comments.data.map(function(valor){
              numComments = response.posts.data[posicionBest].comments.data.length;
            })
          }else {
            numComments = 0;
          }

          console.log('Este post tiene ' + numComments + ' comentarios.' );

          if(response.posts.data[posicionBest].insights !== undefined){
            response.posts.data[posicionBest].insights.data.map(function(valor){
              valor.values.map(function(dato){
                alcancepost=dato.value;
              })
            })
          }else {
            alcancepost = 0;
          }

          console.log('Este post tiene ' + alcancepost + ' de alcance');

        }
        else {
          console.log(response.error);
        }
    }
  );
}

function reachPage(){
  FB.api(
      '/maratondelasfloresmedellin/insights/page_views_total',
      {"period": "day","since":"1493614800", "until":"1494478800", access_token: token},
      function (response) {
        if (response && !response.error) {
          console.log(response);
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
          return promDiaAlcance;
        }
        else {
          console.log(response.error);
        }
      }
  );
}



module.exports = landing(updatebtn);
