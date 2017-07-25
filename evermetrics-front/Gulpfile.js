const gulp = require('gulp');
const sass = require('gulp-sass');
const rename = require('gulp-rename');
const babel = require('babelify');
const browserify = require('browserify');
const source = require('vinyl-source-stream');
const watchify = require('watchify');
const gutil = require('gulp-util');
const webpack = require('webpack');
const webpackConfig = require('./webpack.config.js');

gulp.task('styles', function(){
  gulp
    .src('index.scss')//ruta de nuestro archivo SASS
    .pipe(sass())//le decimos que pase el archivo por el preporcesador de SASS
    .pipe(rename('style.css'))
    .pipe(gulp.dest('public'));//le decimos a gulp que pnga el archivo en la carpeta public
})// definimos una tarea para gulp, primer parametro nombre de la tarea y segundo función que va a ejecutar

gulp.task('assets', function(){
  gulp
    .src('assets/*')//cogemos todo lo que hay dentro de la carpeta assets
    .pipe(gulp.dest('public'));// y lo movemos como destino a la carpeta public
    //glob son expresiones regulares para apuntar archivos
})

function compile(watch){
  var bundle = browserify('./src/index.js'); //Le asignamos a la variable bundle lo que devuelve watchifyy este recibe lo que devuelve browserify y le mandamos como parametro el archivo que queremos que procese
//watchify nos permite saber si hubo algún cambio en este archivo

  if(watch){ //acá preguntamos si watch es verdadero
    bundle = watchify(bundle);
    bundle.on('update', function(){ //on es un metodo que recibe un string que es el nombre de un evento que como segundo parametro recibe una función que se ejecuta cuando el bundle se actualice.
      console.log('--> Bundling...');
      rebundle();// y llamamos la función rebundle
    })
  }
  function rebundle(){
    bundle
      .transform(babel, { presets: ['es2015'], plugins:['syntax-async-functions', 'transform-regenerator'] })//lo transformamos para poder usar las caracteristicas de ecmascript 2015
      .bundle()//aquie le decimos que lo procese y nos genere el archivo
      .on('error', function(err){ console.log(err); this.emit('end')})
      .pipe(source('index.js'))//source lo que hace es transformar lo que nos devuelve el bundler en algo que lo enienda gulp
      .pipe(rename('app.js'))
      .pipe(gulp.dest('public'));
  }


  rebundle();
} //esta función va a crear los scripts de nuevo si hubieron cambios en los archivos, y recibe una variable que le va indicar  si vamos a hacer watch o no, si no lo hace simplemente ejecutaremos el build


// This task is for js build with webpack and babel loader
gulp
  .task('dev', ['styles', 'assets', 'bundle'], () => {
    gulp
      .watch('./src/*', ['bundle']);
    
    gulp
      .watch('./index.scss', ['styles']);
});

gulp
  .task('bundle', () => {
    console.log('Bundle with webpack!');

    webpack(webpackConfig, (error, status) => {
      gutil.log("[webpack:build]", status.toString({
        colors: true,
      }));
    });
  });

/*gulp.task('scripts', function(){
  browserify('./src/index.js')//llamamos browserify y le mandamos como para el archivo que qeremos que procese
   .transform(babel)//lo transformamos para poder usar las caracteristicas de ecmascript 2015
   .bundle()//aquie le decimos que lo procese y nos genere el archivo
   .pipe(source('index.js'))//source lo que hace es transformar lo que nos devuelve el bundler en algo que lo enienda gulp
   .pipe(rename('app.js'))
   .pipe(gulp.dest('public'));
}) //esta tarea procesa el archivo index.js donde está la lógica de nuestra plataforma*/

gulp.task('build', function(){
  return compile();
})

gulp.task('watch', function(){
  return compile(true);
})

gulp.task('default', ['styles', 'assets', 'build'])// definimos una tarea por dafault de gulp, primer parametro nombre de la tarea y segundo es un array con las tareas que vamos a ejecutar
