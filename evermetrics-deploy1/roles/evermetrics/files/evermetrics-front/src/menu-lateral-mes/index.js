var yo = require('yo-yo');
var anoatcm = [];
var anoatcins = [];
var anoatctw = [];
var anoatcweb = [];

module.exports = function(ctx, dates, dato, user, anomes, red) {

  var facebook = yo`${ulfb(ctx, dates, user, anomes, red)}`

  var instagram = yo`${ulins(ctx, dates, user, anomes, red)}`

  var twitter = yo`${ultwi(ctx, dates, user, anomes, red)}`

  var web = yo`${ulweb(ctx, dates, user, anomes, red)}`

  if(dato.red === 'fb')
  {
    return facebook
  }else if(dato.red ==='web'){
    return web
  }else if(dato.red ==='inst'){
    return instagram
  }else{
    return twitter
  }

}

function ulfb(ctx, dates, user, anomes, red){
  var ulM = document.createElement('ul');
  ulM.className = "tab-content-datosm fb"+anomes;
  var index = anoatcm.indexOf(anomes);
  if(index === -1 & user === ctx.auth.username & red === 'fb'){
      anoatcm.push(anomes);
      for(var i in dates){
        if(anomes === dates[i].year & dates[i].userId === ctx.auth.username & dates[i].type === 'month' & dates[i].red === 'fb'){
        ulM.appendChild(yo`<li class="liMes"><a href="#fb${dates[i].year}${dates[i].month}">${dates[i].month}</a></li>`);
          //return yo`<ul id="#fb${dates[i].year}" class="tab-content-datos"><li class="liMes"><a href="#fb${dates[i].year}${dates[i].month}">${dates[i].month}</a></li></ul>`;
        }
      }
  }

  var hayli = ulM.getElementsByTagName("li").length;
  if(hayli !== 0){
    return ulM;
  }
}

function ulins(ctx, dates, user, anomes, red){
  var ulMins = document.createElement('ul');
  ulMins.className = "tab-content-datosm it"+anomes;
  var index = anoatcins.indexOf(anomes);
  if(index === -1 & user === ctx.auth.username & red === 'it'){
      anoatcins.push(anomes);
      for(var i in dates){
        if(anomes === dates[i].year & dates[i].userId === ctx.auth.username & dates[i].type === 'month' & dates[i].red === 'inst'){
          ulMins.appendChild(yo`<li class="liMes"><a href="#it${dates[i].year}${dates[i].month}">${dates[i].month}</a></li>`);
          //return yo`<ul id="#fb${dates[i].year}" class="tab-content-datos"><li class="liMes"><a href="#fb${dates[i].year}${dates[i].month}">${dates[i].month}</a></li></ul>`;
        }
      }
  }

  var hayli = ulMins.getElementsByTagName("li").length;
  if(hayli !== 0){
    return ulMins;
  }
}

function ulweb(ctx, dates, user, anomes, red){
  var ulMweb = document.createElement('ul');
  ulMweb.className = "tab-content-datosm wb"+anomes;
  var index = anoatcweb.indexOf(anomes);
  if(index === -1 & user === ctx.auth.username & red === 'wb'){
      anoatcweb.push(anomes);
      for(var i in dates){
        if(anomes === dates[i].year & dates[i].userId === ctx.auth.username & dates[i].type === 'month' & dates[i].red === 'web'){
          ulMweb.appendChild(yo`<li class="liMes"><a href="#wb${dates[i].year}${dates[i].month}">${dates[i].month}</a></li>`);
          //return yo`<ul id="#fb${dates[i].year}" class="tab-content-datos"><li class="liMes"><a href="#fb${dates[i].year}${dates[i].month}">${dates[i].month}</a></li></ul>`;
        }
      }
  }

  var hayli = ulMweb.getElementsByTagName("li").length;
  if(hayli !== 0){
    return ulMweb;
  }
}

function ultwi(ctx, dates, user, anomes, red){
  var ulMtw = document.createElement('ul');
  ulMtw.className = "tab-content-datosm tw"+anomes;
  var index = anoatctw.indexOf(anomes);
  if(index === -1 & user === ctx.auth.username & red === 'tw'){
      anoatctw.push(anomes);
      for(var i in dates){
        if(anomes === dates[i].year & dates[i].userId === ctx.auth.username & dates[i].type === 'month' & dates[i].red === 'tw'){
          ulMtw.appendChild(yo`<li class="liMes"><a href="#tw${dates[i].year}${dates[i].month}">${dates[i].month}</a></li>`);
          //return yo`<ul id="#fb${dates[i].year}" class="tab-content-datos"><li class="liMes"><a href="#fb${dates[i].year}${dates[i].month}">${dates[i].month}</a></li></ul>`;
        }
      }
  }

  var hayli = ulMtw.getElementsByTagName("li").length;
  if(hayli !== 0){
    return ulMtw;
  }
}
