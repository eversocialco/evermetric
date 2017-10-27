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

hash.set('POST /', async function saveUser (req, res, params) {
  let user = await json(req)
  await db.connect()
  let created = await db.saveUser(user)
  await db.disconnect()

  delete created.email
  delete created.password
  send(res, 201, created)
})

hash.set('GET /:username', async function getUser (req, res, params) {
  let username = params.username
  await db.connect()
  let user = await db.getUser(username)
  await db.disconnect()

  delete user.email
  delete user.password

  send(res, 200, user)
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
