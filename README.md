# Evermetric

## Instrucciones para ejecutar

1. Para lanzar la aplicación localmente se debe tener instalado como dependencias globales rethinkdb y micro, y correr `$ npm install` en todos los directorios.

  i. [Instalar rethinkdb](https://www.rethinkdb.com/docs/install/).
  ii. [Instalar micro](https://github.com/zeit/micro#usage).
  iii. Después corre el comando `$ rethinkdb` donde quieras (directorio) guardar la info de la db.


2. Ir al directorio `*evermetrics-dbs*` y correr `$ node setup.js` para instalar la base de datos

3. En el mismo directorio (*evermetrics-dbs*) correr los microservicios en sus respectivos puertos

  i. `$ micro -p 5001 users.js`
  ii. `$ micro -p 5002 auth.js`
  iii. `$ micro -p 5003 estadisticas.js`
  * Recordar que cada uno es un proceso en la terminal.

4. Finalmente, una vez tenemos todo listo, solo corremos el script `$ npm start`
