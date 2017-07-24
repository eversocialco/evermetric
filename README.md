# Evermetric

## Instrucciones para ejecutar

1. Para lanzar la aplicación localmente se debe tener instalado como dependencias globales rethinkdb y micro, y correr `$ npm install` en todos los directorios.

  1. [Instalar rethinkdb](https://www.rethinkdb.com/docs/install/).
  2. [Instalar micro](https://github.com/zeit/micro#usage).
  3. Después corre el comando `$ rethinkdb` donde quieras (directorio) guardar la info de la db.


2. Ir al directorio `*evermetrics-dbs*` y correr `$ node setup.js` para instalar la base de datos

3. En el mismo directorio (*evermetrics-dbs*) correr los microservicios en sus respectivos puertos

  1. `$ micro -p 5001 users.js`
  2. `$ micro -p 5002 auth.js`
  3. `$ micro -p 5003 estadisticas.js`
  4. Recordar que cada uno es un proceso en la terminal.

4. Finalmente, una vez tenemos todo listo, solo corremos el script `$ npm start`
