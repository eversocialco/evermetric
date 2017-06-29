'use strict'

import { send, json } from 'micro'
import HttpHash from 'http-hash'
import Db from 'evermetrics-dbs'
import DbStub from './test/stub/db'
import config from './config'

const env = process.env.NODE_ENV || 'production'

let db = new Db(config.db)

if (env === 'test') {
  db = new DbStub()
}

const hash = HttpHash()

hash.set('GET /list', async function list (req, res, params) {
  await db.connect()
  let dates = await db.getEstadisticasp()
  await db.disconnect()
  send(res, 200, dates)
})

hash.set('GET /:id', async function getDates (get, res, params) {
  let id = params.id
  await db.connect()
  let dates = await db.getEstadisticas(id)
  await db.disconnect()
  send(res, 200, dates) // enviamos la respuesta
}) // creamos un servidor

hash.set('POST /', async function postEstadisticas (req, res, params) {
  let dates = await json(req)

  await db.connect()
  let created = await db.saveEstadisticas(dates)
  await db.disconnect()
  send(res, 201, created)
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
