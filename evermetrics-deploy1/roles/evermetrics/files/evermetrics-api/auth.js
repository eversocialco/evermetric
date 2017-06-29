'use strict'

import { send, json } from 'micro'
import HttpHash from 'http-hash'
import Db from 'evermetrics-dbs'
import config from './config'
import utils from './lib/utils'
import DbStub from './test/stub/db'

const env = process.env.NODE_ENV || 'production'

let db = new Db(config.db)

if (env === 'test') {
  db = new DbStub()
}

const hash = HttpHash()

hash.set('POST /', async function authenticate (req, res, params) {
  let credentials = await json(req) // obtenemos el objeto que contiene los datos de autenticación
  await db.connect()
  let auth = await db.authenticate(credentials.username, credentials.password)
  await db.disconnect()

  if (!auth) {
    return send(res, 401, { error: 'invalid credentianls' })
  }

  let token = await utils.signToken({
    userId: credentials.username
  }, config.secret)

  send(res, 200, token)
})

// en esta función vamos a hacer la logica para verificar cuando llega una petición para la ruta a o la ruta b
export default async function main (req, res) {
  let { method, url } = req // esto es lo mismo que si lo solicitamos por separado let method = req.method y let url = req.url
  let match = hash.get(`${method.toUpperCase()} ${url}`)

  if (match.handler) {
    // ejecutar handler!
    try {
      await match.handler(req, res, match.params)
    } catch (e) {
      send(res, 500, { error: e.message })
    }
  } else {
    send(res, 404, { error: 'route not found' })
  }
}
