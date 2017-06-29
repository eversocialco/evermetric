var yo = require('yo-yo');
var landing = require('../landing');
var request = require('superagent')

var signupForm = yo`<div class="col l12">
      <div class="row">
        <div class="signup-box">
          <form id="formUpload" enctype="multipart/form-data" class="signup-form form-upload" method="POST" onsubmit=${onsubmit}>
            <div class="divider"></div>
            <div class="section" style="text-align:center;">
              <input type="text" name="name" placeholder="Nombre">
              <input type="email" name="email" placeholder="Email">
              <input type="text" name="username" placeholder="Nombre de usuario">
              <input type="password" name="password" placeholder="Contraseña">
              <div class="contBtnLogo">
                <div id="fileName" class="fileUpload btn cyan">
                  <span><i class="fa fa-file-excel-o" aria-hidden="true" style="padding-right:10px;"></i>Subir logo</span>
                  <input required name="logo" id="file" type="file" class="upload" onchange=${onchange} />
                </div>
                <button id="btnCancel" type="button" class="btn red hide" onclick=${cancel}><i class="fa fa-times" aria-hidden="true"></i></button>
              </div>
              <button class="btn waves-effect waves-light btn-login" type="submit">Registrate</button>
            </div>
          </form>
        </div>
        <div class="row">
          <a href="/signin">Tienes una cuenta</a>
        </div>
      </div>
    </div>`;
//action="/signup"
    function toggleButtons(){
      document.getElementById('fileName').classList.toggle('hide');
      document.getElementById('btnCancel').classList.toggle('hide');
    }
    function cancel(){
      toggleButtons();
      document.getElementById('fileName').reset();
    }

    function onchange() {
      toggleButtons();
    }

    function onsubmit(ev){
      ev.preventDefault();
      var data = new FormData(this);
      request
        .post('/signup')
        .send(data)
        .end(function(err, res){
          toggleButtons();
          document.getElementById('formUpload').reset();
        })
    }

module.exports = landing(signupForm);
