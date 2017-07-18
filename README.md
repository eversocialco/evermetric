# evermetric

**Instrucciones para ejecutar**

Para lanzar la aplicación localmente se debe tener instalado rethinkdb. Una vez instalado se lanza con el comando

```
rethinkdb
```

Luego debemos vamos a lanzar los microservicios, para esto debemos tener en cuenta que debemos linkear el paquete de evermetrics-dbs como dependencia de evermetrics-api localmente con el comando

```
npm link.
```
Para lanzar los servicios lo realizamos con el siguiente comando.

```
micro -p 5001 users.js

micro -p 5002  auth.js

micro -p 5003 estadisticas.js
```

Luego para finalizar debemos ejecutar la aplicación desde el módulo front, para esto debemos tener en cuenta que debemos tener linkeado el paquete de evermetrics-client en el módulo de evermetrics front, esto lo realizamos con

```
npm link
```

Para lanzar la aplicación se realiza con el comando.

```
npm start
```
