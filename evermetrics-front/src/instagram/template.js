var yo = require('yo-yo');
var landing = require('../landing');
var superagent = require ('superagent')

var instagram_btn = yo`<div class="col l12">
      <div class="row">
        <div id="caja" class="contBtnUpdate" style="text-align: center;margin: 40px 0 10px;">
          <button  class="btn"  onclick=${instagramData}>
              Instagram
              <i class="fa fa-instagram" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    </div>`;


function instagramData(){
  const TOKEN = '328393463.ce4bd1a.68cb1506b4574674a13040c1ba207668'

  var counts = {};
  var likes = {};
  $.ajax({
    url: 'https://api.instagram.com/v1/users/self/',
    dataType: 'jsonp',
    type: 'GET',
    data: { access_token: TOKEN },
    success: (res) => counts = res.data.counts,
    error: (data) => console.log(data)
  });

  $.ajax({
    url: 'https://api.instagram.com/v1/users/self/media/recent/',
    dataType: 'jsonp',
    type: 'GET',
    data: { access_token: TOKEN },
    success: (res) => {
      var media = res.data

      // sort by likes
      media.sort(function (a, b) {
        return b.likes.count - a.likes.count;
      });
      likes = media.slice(0, 3);

      console.log(counts);
      console.log(likes);
    },
    error: (data) => console.log(data)
  });

  superagent
    .post('/api/instagram')
    .send(counts)
    .end(function(err, res){
      if (err || !res.ok) {
        console.log('Instagram Post Method Error');
      } else {
        console.log(res);
      }
    })
}


module.exports = landing(instagram_btn);
