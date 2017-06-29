var yo = require('yo-yo');
var landing = require('../landing');
var request = require('superagent');

var upforminst = yo`<div class="col l12">
      <div class="row">
        <div class="col sm12 m10 offset-m1 l8 offset-l2 center-align">
        <h3 class="titleUploadred"><i class="fa fa-instagram" aria-hidden="true"></i>Instagram</h3>
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
          <form class="signup-form" action="/api/estadisticas-inst" method="POST">
            <div class="divider"></div>
            <div class="section" style="text-align:center;">
              <input type="text" name="red" value="inst" style="display:none;">
              <input type="text" name="type" value="month" style="display:none;">
              <input type="text" name="year" placeholder="Año">
              <input type="text" name="month" placeholder="Mes">
              <input type="text" name="allfans" placeholder="Total seguidores">
              <input type="text" name="follows" placeholder="Total seguidos">
              <input type="text" name="allpost" placeholder="Total post">
              <input type="text" name="postbymonth" placeholder="Post en el mes">
              <input type="text" name="likebymonth" placeholder="Like en el mes">
              <input type="text" name="comments" placeholder="Comentarios">
              <label>Usuarios activos</label>
              <input type="text" name="nick1" placeholder="Usuario 1">
              <input type="text" name="likes1" placeholder="Me gustas">
              <input type="text" name="nick2" placeholder="Usuario 2">
              <input type="text" name="likes2" placeholder="Me gustas">
              <input type="text" name="nick3" placeholder="Usuario 3">
              <input type="text" name="likes3" placeholder="Me gustas">
              <input type="text" name="src" placeholder="Imagen">
              <input type="text" name="likesone" placeholder="Me gustas post 1">
              <input type="text" name="likestwo" placeholder="Me gustas post 1">
              <input type="text" name="likesthree" placeholder="Me gustas post 1">
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
      console.log(data);
      request
        .post('/api/estadisticas-inst')
        .send(data)
        .end(function(err, res){
          console.log('estos son los datos');
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

module.exports = landing(upforminst);
