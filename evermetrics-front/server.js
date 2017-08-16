var express = require('express'); // requerimos la librería y todas sus dependencias
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var expressSession = require('express-session');
var passport = require('passport');
var evermetrics = require('evermetrics-client');
var auth = require('./auth')
var config = require('./config');
var app = express();
var multer  = require('multer');
var ext = require('file-extension');
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads')
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname + '.' + ext(file.originalname))
  }
});

var uploadlogo = multer({ storage : storage}).single('logo');

var uploadp = multer({ storage : storage}).single('filep');

app.post('/api/prueba',function(req,res){
    uploadp(req,res,function(err) {
        if(err) {
            return res.end("Error uploading file.");
        }
        res.end("File is uploaded");
    });
});

var upload = multer({ storage: storage, fileFilter : function(req, file, callback) { //file filter
    if (['xls', 'xlsx'].indexOf(file.originalname.split('.')[file.originalname.split('.').length-1]) === -1) {
        return callback(new Error('El tipo de archivo es incoreccto'));
    }
    callback(null, true);
} }).single('fileexcel');
var xlstojson = require("xls-to-json-lc");
var xlsxtojson = require("xlsx-to-json-depfix");
var fs = require('fs');

var port = process.env.PORT || 5050;

var client = evermetrics.createClient(config.client);

app.set(bodyParser.json()); // le decimos que express sea capaz de hacer parse de peticiones http que contengan un json
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(expressSession({
  secret: config.secret,
  resave: false,
  saveUnitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.set('view engine','pug'); //le decimos que vamos a usar un motor de vistas, utilizando pug para renderizarla

app.use(express.static('public'));//define un middleware que le indica al servidor que esta almacenado en la variable app que la carpeta public sea estatica y cualquier usuario la pueda ver y va ser una carpeta virtual
app.use(express.static('uploads'));//puse esta carpeta publica

passport.use(auth.localStrategy);
passport.deserializeUser(auth.deserializeUser);
passport.serializeUser(auth.serializeUser); // acá le decimos a passport que utilice las estrategias que definimos en nuestro archivo de auth

app.get('/',  function (req, res) {
  res.render('index', { title:'Evermetrics' });//llamamos el motor de vistas, primer parametro es el nombre del archivo que lo va ir a buscar por defecto en una carpeta llamada views
})//parametros ruta y función. Aquí le decimos que cuando aceda a la ruta ejecute esta función

app.get('/signup', function (req, res) {
  res.render('index', { title:'Evermetrics -  Signup' });//luego del nombre de del archivo le pasamos un objeto de javascript(los objetos se escriben con llave y se le pone una clave valor)
})

app.get('/uploadp', function (req, res) {
  res.render('index', { title:'Evermetrics -  uploadp' });//luego del nombre de del archivo le pasamos un objeto de javascript(los objetos se escriben con llave y se le pone una clave valor)
})

app.get('/update-datesfb', function (req, res) {
  res.render('index', { title:'Evermetrics -  Update Facebook' });//luego del nombre de del archivo le pasamos un objeto de javascript(los objetos se escriben con llave y se le pone una clave valor)
})

app.post('/signup', function (req, res) {
  uploadlogo(req, res, function(err){
    if(err) {
      return res.send(500, "Error uploading file");
    }

    var ruta = req.file.filename;
    console.log(ruta);
    var user = req.body;

    client.saveUser({
      username: user.username,
      password: user.password,
      email: user.email,
      name: user.name,
      src: ruta
    }, function (err, usr) {
      if (err) return res.status(500).send(err.message);

      res.redirect('/signin');
    })

  })
})

app.get('/signin', function (req, res) {
  res.render('index', { title:'Evermetrics - Signin' });
})

app.get('/nologged', function (req, res) {
  res.render('index', { title:'Evermetrics - No logged in' });
})

app.get('/userinvalid', function (req, res) {
  res.render('index', { title:'Evermetrics - User or Pass Invalid' });
})

app.get('/upload-dates', ensureAuth, function (req, res) {
  res.render('index', { title:'Evermetrics - Upload Stadistitics' });
})

app.get('/upload-dates-inst', ensureAuth, function (req, res) {
  res.render('index', { title:'Evermetrics - Upload Stadistitics Instagram' });
})

app.get('/upload-dates-tw', ensureAuth, function (req, res) {
  res.render('index', { title:'Evermetrics - Upload Stadistitics Twitter' });
})

app.get('/upload-dates-web', ensureAuth, function (req, res) {
  res.render('index', { title:'Evermetrics - Upload Stadistitics Web Analytics' });
})

app.post('/login', passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/userinvalid'
}))

app.get('/logout', function (req, res) {
  req.logout();

  res.redirect('/signin')
})

function ensureAuth (req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
    //res.status(401).send({ error: 'not authenticate' })
    res.redirect('/nologged');
}

app.get('/whoami', function (req, res) {
  if(req.isAuthenticated()) {
    return res.json(req.user); //respondemos como un json todo el objeto completo del usuario lo obtenemos con el objeto req gracias a passport
  }

  res.json({ auth: false })
})

app.get('/api/pictures', function (req, res) {
  client.getPicture('eversocial', function (err, pictures) {
    if (err) return res.send([]);

    res.send(pictures);
  })
})

app.get('/api/estadisticas', function (req, res) {
 client.listMetrics(function (err, dates) {
    if (err) return res.send([]);

    res.send(dates);
  })
})

app.get('/api/facebook/:page', (req, res) => {
  const page = req.params.page
  client.getFacebookDataOf(page, (error, response) => {
    if (error)
      res.status(500).send(error);
    res.status(200).send(response);
  });
});

app.post('/api/pictures', ensureAuth, function (req, res) {

  var user = req.user;
  var token = req.user.token;
  var username = req.user.username;

  client.savePicture({
    publicId: uuid.encode(id),
    userId: username,
    src: `prueba`,
    user:{
      username: username,
      avatar: user.avatar,
      name: user.name
    }
  }, token, function (err, img) {
    if (err) return res.status(500).send(err.message);

    res.send(`File uploaded`);
  })
})

// ruta post de facebook
app.post('/api/estadisticas', ensureAuth, function (req, res) {
   console.log("entró a la ruta post de api");

   /*var user = req.user;
    var username = req.user.username;
    var dates = req.body;
    console.log(dates);

    client.saveMetrics({
      red: dates.red,
      type: dates.type,
      likebyday: dates.promLikesByDay,
      postbymonth: dates.postInMonth,
      scopebyday: dates.promAlcByDay,
      externalreference: dates.numRefExternal,
      viewswindows: dates.numViewsTabs,
      topwindows: dates.princTabs,
      topreference: dates.princRef,
      postsrc: dates.postsrc,
      datespost: dates.bestPost,
      month: dates.month,
      newfans: dates.fansNews,
      nolikes: dates.fansRemove,
      prints: dates.impresions,
      year: dates.year,
      allfans:dates.totalFans,
      activeusers:dates.activeUsers,
      userId: username,
      user: {
          username: username,
          avatar: user.avatar,
          name: user.name
      }
    }, function (err, img) {
      if (err) return res.status(500).send(err.message);

      res.send(`File uploaded`);
    })*/

 upload(req, res, function(err){
    if(err) {
      console.log("entró al if");
      return res.send(500, "Error uploading file");
    }
    console.log("entró al upload");
    /** Check the extension of the incoming file and
     *  use the appropriate module**/

    if(req.file.originalname.split('.')[req.file.originalname.split('.').length-1] === 'xlsx'){
        exceltojson = xlsxtojson;
    } else {
        exceltojson = xlstojson;
    }
    console.log(req.file.path);
    console.log(exceltojson);
    try {
        exceltojson({
            input: req.file.path,
            output: null, //since we don't need output.json
            lowerCaseHeaders:true
        }, function(err, result) {
            if(err) {
              console.error(err);
            } else {
              console.log('result')
              var datesj= result;
              console.log(datesj);
              try {
                    fs.unlinkSync(req.file.path);
                } catch(e) {
                    console.error(err);
              }
              datesj.map(function(dates){
                console.log(dates.red);
                  var user = req.user;
                  var username = req.user.username;


                    client.saveMetrics({
                      red: dates.red,
                      type: dates.type,
                      likebyday: dates.likebyday,
                      postbymonth: dates.postbymonth,
                      scopebyday: dates.scopebyday,
                      externalreference: dates.externalreference,
                      viewswindows: dates.viewswindows,
                      topwindows: dates.topwindows,
                      topreference: dates.topreference,
                      postsrc: dates.postsrc,
                      datespost: dates.datespost,
                      month: dates.month,
                      newfans: dates.newfans,
                      nolikes: dates.nolikes,
                      prints: dates.prints,
                      year: dates.year,
                      allfans:dates.allfans,
                      activeusers:dates.activeusers,
                      userId: username,
                      user: {
                          username: username,
                          avatar: user.avatar,
                          name: user.name
                      },
                      printsy: {
                        months: {
                          enero:  dates.print_enero ,
                          febrero:  dates.print_febrero ,
                          marzo:  dates.print_marzo ,
                          abril:  dates.print_abril,
                          mayo: dates.print_mayo,
                          junio: dates.print_junio,
                          julio: dates.print_julio,
                          agosto: dates.print_agosto,
                          septiembre: dates.print_septiembre,
                          octubre: dates.print_octubre,
                          noviembre: dates.print_noviembre,
                          diciembre: dates.print_diciembre
                      } ,
                        total:  dates.total_print
                      },
                      nolikesy: {
                        months: {
                          enero:  dates.nolikes_enero ,
                          febrero:  dates.nolikes_febrero ,
                          marzo:  dates.nolikes_marzo ,
                          abril:  dates.nolikes_abril,
                          mayo: dates.nolikes_mayo,
                          junio: dates.nolikes_junio,
                          julio: dates.nolikes_julio,
                          agosto: dates.nolikes_agosto,
                          septiembre: dates.nolikes_septiembre,
                          octubre: dates.nolikes_octubre,
                          noviembre: dates.nolikes_noviembre,
                          diciembre: dates.nolikes_diciembre
                        } ,
                        total:  dates.total_nolikes
                      },
                      newfansy: {
                        months: {
                          enero:  dates.newfans_enero ,
                          febrero:  dates.newfans_febrero ,
                          marzo:  dates.newfans_marzo ,
                          abril:  dates.newfans_abril,
                          mayo: dates.newfans_mayo,
                          junio: dates.newfans_junio,
                          julio: dates.newfans_julio,
                          agosto: dates.newfans_agosto,
                          septiembre: dates.newfans_septiembre,
                          octubre: dates.newfans_octubre,
                          noviembre: dates.newfans_noviembre,
                          diciembre: dates.newfans_diciembre
                        } ,
                        total:  dates.total_newfans
                      },
                      allfansy: {
                        months: {
                          enero:  dates.allfans_enero ,
                          febrero:  dates.allfans_febrero ,
                          marzo:  dates.allfans_marzo ,
                          abril:  dates.allfans_abril,
                          mayo: dates.allfans_mayo,
                          junio: dates.allfans_junio,
                          julio: dates.allfans_julio,
                          agosto: dates.allfans_agosto,
                          septiembre: dates.allfans_septiembre,
                          octubre: dates.allfans_octubre,
                          noviembre: dates.allfans_noviembre,
                          diciembre: dates.allfans_diciembre
                        },
                        total:  dates.total_allfans
                      },
                      activeusersy: {
                        months: {
                          enero:  dates.activeusers_enero ,
                          febrero:  dates.activeusers_febrero ,
                          marzo:  dates.activeusers_marzo ,
                          abril:  dates.activeusers_abril,
                          mayo: dates.activeusers_mayo,
                          junio: dates.activeusers_junio,
                          julio: dates.activeusers_julio,
                          agosto: dates.activeusers_agosto,
                          septiembre: dates.activeusers_septiembre,
                          octubre: dates.activeusers_octubre,
                          noviembre: dates.activeusers_noviembre,
                          diciembre: dates.activeusers_diciembre
                        },
                        total:  dates.total_activeusers
                      },
                      language: {
                        others:  dates.otherlanguage,
                        ppal:  dates.ppallanguage
                      },
                      genre: {
                        men:  dates.men,
                        women: dates.women
                      },
                      country: {
                        others:  dates.othercountry,
                        ppal:  dates.ppalcountry,
                        sec:  dates.seccountry
                      },
                      city: {
                        others:  dates.othercity,
                        ppal:  dates.ppalcity,
                        sec:  dates.seccity
                      },
                      age: {
                        others:  dates.otheragey,
                        ppal:  dates.ppalagey
                      }
                    }, function (err, img) {
                    if (err) return res.status(500).send(err.message);

                    res.send(`File uploaded`);
                  })
              })

            }
          });
    } catch (e){
       console.log(e);
        res.json({error_code:1,err_desc:"Corupted excel file"});
    }
  })

})

//Instagram
app.post('/api/estadisticas-inst', ensureAuth, function (req, res) {
  console.log("entró a la ruta post de api");
  upload(req, res, function(err){
    if(err) {
      console.log("entró al if");
      return res.send(500, "Error uploading file");
    }
    console.log("entró al upload");
    /** Check the extension of the incoming file and
     *  use the appropriate module
     */
    console.log(req.body);
    console.log(req.file);
    if(req.file.originalname.split('.')[req.file.originalname.split('.').length-1] === 'xlsx'){
        exceltojson = xlsxtojson;
    } else {
        exceltojson = xlstojson;
    }
    console.log(req.file.path);
    console.log(exceltojson);
    try {
        exceltojson({
            input: req.file.path,
            output: null, //since we don't need output.json
            lowerCaseHeaders:true
        }, function(err, result) {
            if(err) {
              console.error(err);
            } else {

              var datesj= result;
              try {
                    fs.unlinkSync(req.file.path);
                } catch(e) {
                    console.error(err);
              }
              datesj.map(function(dates){
                  var user = req.user;
                  var username = req.user.username;

                  client.saveMetrics({
                    red: dates.red,
                    type: dates.type,
                    year: dates.year,
                    month: dates.month,
                    allfans:dates.allfans,
                    follows: dates.follows,
                    allpost: dates.allpost,
                    postbymonth: dates.postbymonth,
                    likebymonth: dates.likebymonth,
                    comments: dates.comments,
                    usersppal: {
                      userone:{
                        nick: dates.nick1,
                        likes: dates.likes1
                      },
                      usertwo:{
                        nick: dates.nick2,
                        likes: dates.likes2
                      },
                      userthree:{
                        nick: dates.nick3,
                        likes: dates.likes3
                      }
                    },
                    topposts: {
                      src: dates.src,
                      likesone: dates.likesone,
                      likestwo: dates.likestwo,
                      likesthree:dates.likesthree
                    },
                    userId: username,
                    user: {
                        username: username,
                        avatar: user.avatar,
                        name: user.name
                    }
                  }, function (err, img) {
                    if (err) return res.status(500).send(err.message);

                    res.send(`File uploaded`);
                  })
              })

            }
          });
    } catch (e){
        res.json({error_code:1,err_desc:"Corupted excel file"});
    }
  })
})

//twitter
app.post('/api/estadisticas-tw', ensureAuth, function (req, res) {
  upload(req, res, function(err){
    if(err) {
      return res.send(500, "Error uploading file");
    }

    /** Check the extension of the incoming file and
     *  use the appropriate module
     */
    if(req.file.originalname.split('.')[req.file.originalname.split('.').length-1] === 'xlsx'){
        exceltojson = xlsxtojson;
    } else {
        exceltojson = xlstojson;
    }
    console.log(req.file.path);
    console.log(exceltojson);
    try {
        exceltojson({
            input: req.file.path,
            output: null, //since we don't need output.json
            lowerCaseHeaders:true
        }, function(err, result) {
            if(err) {
              console.error(err);
            } else {

              var datesj= result;
              try {
                    fs.unlinkSync(req.file.path);
                } catch(e) {
                    console.error(err);
              }
              datesj.map(function(dates){
                  var user = req.user;
                  var username = req.user.username;

                  client.saveMetrics({
                    red: dates.red,
                    type: dates.type,
                    year: dates.year,
                    month: dates.month,
                    allfans:dates.allfans,
                    allfollows: dates.allfollows,
                    newfans: dates.newfans,
                    globalmedia: dates.globalmedia,
                    globalfavorites: dates.globalfavorites,
                    alltweets: dates.alltweets,
                    tweets: dates.tweets,
                    retweets: dates.retweets,
                    mentions: dates.mentions,
                    favorites: dates.favorites,
                    messagedirects: dates.messagedirects,
                    hashtags: {
                      label1: dates.label1,
                      cant1: dates.cant1,
                      label2: dates.label2,
                      cant2: dates.cant2,
                      label3: dates.label3,
                      cant3: dates.cant3,
                      label4: dates.label4,
                      cant4: dates.cant4,
                      label5: dates.label5,
                      cant5: dates.cant5,
                      label6: dates.label6,
                      cant6: dates.cant6,
                      label7: dates.label7,
                      cant7: dates.cant7,
                      label8: dates.label8,
                      cant8: dates.cant8
                    },
                    userId: username,
                    user: {
                        username: username,
                        avatar: user.avatar,
                        name: user.name
                    }
                  }, function (err, img) {
                    if (err) return res.status(500).send(err.message);

                    res.send(`File uploaded`);
                  })
              })

            }
          });
    } catch (e){
        res.json({error_code:1,err_desc:"Corupted excel file"});
    }
  })

})

//analytics web
app.post('/api/estadisticas-web', ensureAuth, function (req, res) {
  upload(req, res, function(err){
    if(err) {
      return res.send(500, "Error uploading file");
    }

    /** Check the extension of the incoming file and
     *  use the appropriate module
     */
    if(req.file.originalname.split('.')[req.file.originalname.split('.').length-1] === 'xlsx'){
        exceltojson = xlsxtojson;
    } else {
        exceltojson = xlstojson;
    }
    console.log(req.file.path);
    console.log(exceltojson);
    try {
        exceltojson({
            input: req.file.path,
            output: null, //since we don't need output.json
            lowerCaseHeaders:true
        }, function(err, result) {
            if(err) {
              console.error(err);
            } else {

              var datesj= result;
              try {
                    fs.unlinkSync(req.file.path);
                } catch(e) {
                    console.error(err);
              }
              datesj.map(function(dates){
                  var user = req.user;
                  var username = req.user.username;

                  client.saveMetrics({
                    red: dates.red,
                    type: dates.type,
                    year: dates.year,
                    month: dates.month,
                    sessionst: dates.sessionst,
                    usuariosactit: dates.usuariosactit,
                    numpageviewst: dates.numpageviewst,
                    timepromt: dates.timepromt,
                    reboteport: dates.reboteport,
                    urlpagmoreview1: dates.urlpagmoreview1,
                    urlpagmoreview2: dates.urlpagmoreview2,
                    urlpagmoreview3: dates.urlpagmoreview3,
                    pagmoreview1: dates.pagmoreview1,
                    pagmoreview2: dates.pagmoreview2,
                    pagmoreview3: dates.pagmoreview3,
                    numpagmoreview1: dates.numpagmoreview1,
                    numpagmoreview2: dates.numpagmoreview2,
                    numpagmoreview3: dates.numpagmoreview3,
                    visit: {
                      visitnews: dates.visitnews,
                      visitrecurrent: dates.visitrecurrent
                    },
                    language: {
                      others:  dates.languageothers,
                      ppal:  dates.languageppal
                    },
                    country: {
                      sec: dates.countrysec,
                      others:  dates.countryothers,
                      ppal:  dates.countryppal
                    },
                    city: {
                      sec: dates.citysec,
                      others:  dates.cityothers,
                      ppal:  dates.cityppal
                    },
                    sessionsmonth: {
                      month: {
                        day1:  dates.sessions_d1,
                        day2:  dates.sessions_d2,
                        day3:  dates.sessions_d3,
                        day4:  dates.sessions_d4,
                        day5: dates.sessions_d5,
                        day6: dates.sessions_d6,
                        day7: dates.sessions_d7,
                        day8: dates.sessions_d8,
                        day9: dates.sessions_d9,
                        day10: dates.sessions_d10,
                        day11: dates.sessions_d11,
                        day12: dates.sessions_d12,
                        day13: dates.sessions_d13,
                        day14: dates.sessions_d14,
                        day15: dates.sessions_d15,
                        day16: dates.sessions_d16,
                        day17: dates.sessions_d17,
                        day18: dates.sessions_d18,
                        day19: dates.sessions_d19,
                        day20: dates.sessions_d20,
                        day21: dates.sessions_d21,
                        day22: dates.sessions_d22,
                        day23: dates.sessions_d23,
                        day24: dates.sessions_d24,
                        day25: dates.sessions_d25,
                        day26: dates.sessions_d26,
                        day27: dates.sessions_d27,
                        day28: dates.sessions_d28,
                        day29: dates.sessions_d29,
                        day30: dates.sessions_d30,
                        day31: dates.sessions_d31
                      }
                    },
                    usuariosactimonth: {
                      month: {
                        day1:  dates.usuariosacti_d1,
                        day2:  dates.usuariosacti_d2,
                        day3:  dates.usuariosacti_d3,
                        day4:  dates.usuariosacti_d4,
                        day5: dates.usuariosacti_d5,
                        day6: dates.usuariosacti_d6,
                        day7: dates.usuariosacti_d7,
                        day8: dates.usuariosacti_d8,
                        day9: dates.usuariosacti_d9,
                        day10: dates.usuariosacti_d10,
                        day11: dates.usuariosacti_d11,
                        day12: dates.usuariosacti_d12,
                        day13: dates.usuariosacti_d13,
                        day14: dates.usuariosacti_d14,
                        day15: dates.usuariosacti_d15,
                        day16: dates.usuariosacti_d16,
                        day17: dates.usuariosacti_d17,
                        day18: dates.usuariosacti_d18,
                        day19: dates.usuariosacti_d19,
                        day20: dates.usuariosacti_d20,
                        day21: dates.usuariosacti_d21,
                        day22: dates.usuariosacti_d22,
                        day23: dates.usuariosacti_d23,
                        day24: dates.usuariosacti_d24,
                        day25: dates.usuariosacti_d25,
                        day26: dates.usuariosacti_d26,
                        day27: dates.usuariosacti_d27,
                        day28: dates.usuariosacti_d28,
                        day29: dates.usuariosacti_d29,
                        day30: dates.usuariosacti_d30,
                        day31: dates.usuariosacti_d31
                      }
                    },
                    numpageviewsmonth: {
                      month: {
                        day1:  dates.numpageviews_d1,
                        day2:  dates.numpageviews_d2,
                        day3:  dates.numpageviews_d3,
                        day4:  dates.numpageviews_d4,
                        day5: dates.numpageviews_d5,
                        day6: dates.numpageviews_d6,
                        day7: dates.numpageviews_d7,
                        day8: dates.numpageviews_d8,
                        day9: dates.numpageviews_d9,
                        day10: dates.numpageviews_d10,
                        day11: dates.numpageviews_d11,
                        day12: dates.numpageviews_d12,
                        day13: dates.numpageviews_d13,
                        day14: dates.numpageviews_d14,
                        day15: dates.numpageviews_d15,
                        day16: dates.numpageviews_d16,
                        day17: dates.numpageviews_d17,
                        day18: dates.numpageviews_d18,
                        day19: dates.numpageviews_d19,
                        day20: dates.numpageviews_d20,
                        day21: dates.numpageviews_d21,
                        day22: dates.numpageviews_d22,
                        day23: dates.numpageviews_d23,
                        day24: dates.numpageviews_d24,
                        day25: dates.numpageviews_d25,
                        day26: dates.numpageviews_d26,
                        day27: dates.numpageviews_d27,
                        day28: dates.numpageviews_d28,
                        day29: dates.numpageviews_d29,
                        day30: dates.numpageviews_d30,
                        day31: dates.numpageviews_d31
                      }
                    },
                    timeprommonth: {
                      month: {
                        day1:  dates.timeprom_d1,
                        day2:  dates.timeprom_d2,
                        day3:  dates.timeprom_d3,
                        day4:  dates.timeprom_d4,
                        day5: dates.timeprom_d5,
                        day6: dates.timeprom_d6,
                        day7: dates.timeprom_d7,
                        day8: dates.timeprom_d8,
                        day9: dates.timeprom_d9,
                        day10: dates.timeprom_d10,
                        day11: dates.timeprom_d11,
                        day12: dates.timeprom_d12,
                        day13: dates.timeprom_d13,
                        day14: dates.timeprom_d14,
                        day15: dates.timeprom_d15,
                        day16: dates.timeprom_d16,
                        day17: dates.timeprom_d17,
                        day18: dates.timeprom_d18,
                        day19: dates.timeprom_d19,
                        day20: dates.timeprom_d20,
                        day21: dates.timeprom_d21,
                        day22: dates.timeprom_d22,
                        day23: dates.timeprom_d23,
                        day24: dates.timeprom_d24,
                        day25: dates.timeprom_d25,
                        day26: dates.timeprom_d26,
                        day27: dates.timeprom_d27,
                        day28: dates.timeprom_d28,
                        day29: dates.timeprom_d29,
                        day30: dates.timeprom_d30,
                        day31: dates.timeprom_d31
                      }
                    },
                    rebotepormonth: {
                      month: {
                        day1:  dates.rebotepor_d1,
                        day2:  dates.rebotepor_d2,
                        day3:  dates.rebotepor_d3,
                        day4:  dates.rebotepor_d4,
                        day5: dates.rebotepor_d5,
                        day6: dates.rebotepor_d6,
                        day7: dates.rebotepor_d7,
                        day8: dates.rebotepor_d8,
                        day9: dates.rebotepor_d9,
                        day10: dates.rebotepor_d10,
                        day11: dates.rebotepor_d11,
                        day12: dates.rebotepor_d12,
                        day13: dates.rebotepor_d13,
                        day14: dates.rebotepor_d14,
                        day15: dates.rebotepor_d15,
                        day16: dates.rebotepor_d16,
                        day17: dates.rebotepor_d17,
                        day18: dates.rebotepor_d18,
                        day19: dates.rebotepor_d19,
                        day20: dates.rebotepor_d20,
                        day21: dates.rebotepor_d21,
                        day22: dates.rebotepor_d22,
                        day23: dates.rebotepor_d23,
                        day24: dates.rebotepor_d24,
                        day25: dates.rebotepor_d25,
                        day26: dates.rebotepor_d26,
                        day27: dates.rebotepor_d27,
                        day28: dates.rebotepor_d28,
                        day29: dates.rebotepor_d29,
                        day30: dates.rebotepor_d30,
                        day31: dates.rebotepor_d31
                      }
                    },
                    sessions: {
                      months: {
                        enero:  dates.sessions_enero,
                        febrero:  dates.sessions_febrero,
                        marzo:  dates.sessions_marzo,
                        abril:  dates.sessions_abril,
                        mayo: dates.sessions_mayo,
                        junio: dates.sessions_junio,
                        julio: dates.sessions_julio,
                        agosto: dates.sessions_agosto,
                        septiembre: dates.sessions_septiembre,
                        octubre: dates.sessions_octubre,
                        noviembre: dates.sessions_noviembre,
                        diciembre: dates.sessions_diciembre
                      }
                    },
                    usuariosacti: {
                      months: {
                        enero:  dates.usuariosacti_enero,
                        febrero:  dates.usuariosacti_febrero,
                        marzo:  dates.usuariosacti_marzo,
                        abril:  dates.usuariosacti_abril,
                        mayo: dates.usuariosacti_mayo,
                        junio: dates.usuariosacti_junio,
                        julio: dates.usuariosacti_julio,
                        agosto: dates.usuariosacti_agosto,
                        septiembre: dates.usuariosacti_septiembre,
                        octubre: dates.usuariosacti_octubre,
                        noviembre: dates.usuariosacti_noviembre,
                        diciembre: dates.usuariosacti_diciembre
                      }
                    },
                    numpageviews: {
                      months: {
                        enero:  dates.numpageviews_enero,
                        febrero:  dates.numpageviews_febrero,
                        marzo:  dates.numpageviews_marzo,
                        abril:  dates.numpageviews_abril,
                        mayo: dates.numpageviews_mayo,
                        junio: dates.numpageviews_junio,
                        julio: dates.numpageviews_julio,
                        agosto: dates.numpageviews_agosto,
                        septiembre: dates.numpageviews_septiembre,
                        octubre: dates.numpageviews_octubre,
                        noviembre: dates.numpageviews_noviembre,
                        diciembre: dates.numpageviews_diciembre
                      }
                    },
                    timeprom: {
                      months: {
                        enero:  dates.timeprom_enero,
                        febrero:  dates.timeprom_febrero,
                        marzo:  dates.timeprom_marzo,
                        abril:  dates.timeprom_abril,
                        mayo: dates.timeprom_mayo,
                        junio: dates.timeprom_junio,
                        julio: dates.timeprom_julio,
                        agosto: dates.timeprom_agosto,
                        septiembre: dates.timeprom_septiembre,
                        octubre: dates.timeprom_octubre,
                        noviembre: dates.timeprom_noviembre,
                        diciembre: dates.timeprom_diciembre
                      }
                    },
                    rebotepor: {
                      months: {
                        enero:  dates.rebotepor_enero,
                        febrero:  dates.rebotepor_febrero,
                        marzo:  dates.rebotepor_marzo,
                        abril:  dates.rebotepor_abril,
                        mayo: dates.rebotepor_mayo,
                        junio: dates.rebotepor_junio,
                        julio: dates.rebotepor_julio,
                        agosto: dates.rebotepor_agosto,
                        septiembre: dates.rebotepor_septiembre,
                        octubre: dates.rebotepor_octubre,
                        noviembre: dates.rebotepor_noviembre,
                        diciembre: dates.rebotepor_diciembre
                      }
                    },
                    userId: username,
                    user: {
                        username: username,
                        avatar: user.avatar,
                        name: user.name
                    }
                  }, function (err, img) {
                    if (err) return res.status(500).send(err.message);

                    res.send(`File uploaded`);
                  })
              })

            }
          });
    } catch (e){
        res.json({error_code:1,err_desc:"Corupted excel file"});
    }
  })

})

app.listen(port, function (err) {
  if(err) return console.log('Hubo un error'), process.exit(1);// con esto le indicamos que hubo un error pasandole por parametro un num distinto de cero

  console.log('evermetrics escuchando en el puerto 5050');
})//Acá lanzamos el servidor web, le decimos que en el puerto 3000 y ponemos una función que toma un error en caso que lo haya y preguntamos si hubo un error y retornamos un mensaje
