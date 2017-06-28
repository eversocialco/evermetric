var yo = require('yo-yo');
var landing = require('../landing');
var request = require('superagent');

var upformtw = yo`<div class="col l12">
      <div class="row">
        <div class="col sm12 m10 offset-m1 l8 offset-l2 center-align">
        <h3 class="titleUploadred"><i class="fa fa-twitter" aria-hidden="true"></i>Twitter</h3>
          <form enctype="multipart/form-data" class="form-upload" id="formUpload" onsubmit=${onsubmit}>
            <div id="fileName" class="fileUpload btn">
              <span><i class="fa fa-file-excel-o" aria-hidden="true" style="padding-right:10px;"></i>Subir archivo</span>
              <input name="fileexcel" id="file" type="file" class="upload" onchange=${onchange} />
            </div>
            <button id="btnUpload" type="submit" class="btn hide">Subir</button>
            <button id="btnCancel" type="button" style="background-color:#f39237;" class="btn hide" onclick=${cancel}><i class="fa fa-times" aria-hidden="true"></i></button>
          </form>
           <span id="fotoUpExito"class="hide">El archivo se ha subido con éxito.</span>
        </div>
      </div>
      <div class="row" style="display:none;">
        <div class="signup-box">
          <form class="signup-form" action="/api/estadisticas-tw" method="POST">
            <div class="divider"></div>
            <div class="section" style="text-align:center;">
              <input type="text" name="red" value="tw" style="display:none;">
              <input type="text" name="type" value="month" style="display:none;">
              <input type="text" name="year" placeholder="Año">
              <input type="text" name="month" placeholder="Mes">
              <input type="text" name="allfans" placeholder="Total seguidores">
              <input type="text" name="allfollows" placeholder="Total seguidos">
              <input type="text" name="newfans" placeholder="Nuevos seguidores">
              <input type="text" name="globalmedia" placeholder="Fotos / Videos Globales">
              <input type="text" name="globalfavorites" placeholder="Favoritos Globales">
              <input type="text" name="alltweets" placeholder="Total tweets">
              <input type="text" name="tweets" placeholder="Tweets">
              <input type="text" name="retweets" placeholder="Retweets">
              <input type="text" name="mentions" placeholder="Menciones">
              <input type="text" name="favorites" placeholder="Favoritos">
              <input type="text" name="messagedirects" placeholder="Mensajes directos">
              <label>Hashtags</label>
              <input type="text" name="label1" placeholder="Hashtag 1">
              <input type="text" name="cant1" placeholder="Veces usadas">
              <input type="text" name="label2" placeholder="Hashtag 2">
              <input type="text" name="cant2" placeholder="Veces usadas">
              <input type="text" name="label3" placeholder="Hashtag 3">
              <input type="text" name="cant3" placeholder="Veces usadas">
              <input type="text" name="label4" placeholder="Hashtag 4">
              <input type="text" name="cant4" placeholder="Veces usadas">
              <input type="text" name="label5" placeholder="Hashtag 5">
              <input type="text" name="cant5" placeholder="Veces usadas">
              <input type="text" name="label6" placeholder="Hashtag 6">
              <input type="text" name="cant6" placeholder="Veces usadas">
              <input type="text" name="label7" placeholder="Hashtag 7">
              <input type="text" name="cant7" placeholder="Veces usadas">
              <input type="text" name="label8" placeholder="Hashtag 8">
              <input type="text" name="cant8" placeholder="Veces usadas">
              <button class="btn waves-effect waves-light btn-login" type="submit">Registrar</button>
            </div>
          </form>
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
        .post('/api/estadisticas-tw')
        .send(data)
        .end(function(err, res){
          console.log(arguments); //arguments es una array de todos lo parametros que recibe una función
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

module.exports = landing(upformtw);
