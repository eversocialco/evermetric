var yo = require('yo-yo');
var landing = require('../landing');
var request = require('superagent');

var upformweb = yo`<div class="col l12">
      <div class="row">
        <div class="col sm12 m10 offset-m1 l8 offset-l2 center-align">
        <h3 class="titleUploadred"><i class="fa fa-globe" aria-hidden="true"></i>Web Analytics</h3>
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
        .post('/api/estadisticas-web')
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

module.exports = landing(upformweb);
