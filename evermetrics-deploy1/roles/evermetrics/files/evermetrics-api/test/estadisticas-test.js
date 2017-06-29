'use strict'

import test from 'ava' // es lo mismo que require pero con la sintexis de emmascripts modules
import micro from 'micro'
import listen from 'test-listen' // es una herramienta para hacer testing de microservicios con micro
import request from 'request-promise' // módulo que me permite hacer http request utilizando promesas
import fixtures from './fixtures/'
import estadisticas from '../estadisticas'
import utils from '../lib/utils'
import config from '../config'

test.beforeEach(async t => {
  let srv = micro(estadisticas)
  t.context.url = await listen(srv)
})

test('GET /:id', async t => {
  let dates = fixtures.getEstadisticas()
  let url = t.context.url

  let body = await request({ url: `${url}/${dates.publicId}`, json: true })
  t.deepEqual(body, dates)
})

test('GET /list', async t => {
  let dates = fixtures.getEstadisticasp()
  let url = t.context.url

  let options = {
    method: 'GET',
    url: `${url}/list`,
    json: true
  }

  let body = await request(options)

  t.deepEqual(body, dates)
})

test('no token POST /', async t => {
  let dates = fixtures.getEstadisticas()
  let url = t.context.url

  let options = {
    method: 'POST',
    url: url,
    json: true,
    body: {
      userId: dates.userId,
      year: dates.year,
      month: dates.month,
      allfans: dates.allfans,
      newfans: dates.newfans,
      nolikes: dates.nolikes,
      prints: dates.prints,
      activeusers: dates.activeusers
    },
    resolveWithFullResponse: true
  }

  t.throws(request(options), /invalid token/)
})

test('secure POST /', async t => {
  let dates = fixtures.getEstadisticas()
  let url = t.context.url
  let token = await utils.signToken({ userId: dates.userId }, config.secret)

  let options = {
    method: 'POST',
    url: url,
    json: true,
    body: {
      userId: dates.userId,
      year: dates.year,
      month: dates.month,
      allfans: dates.allfans,
      newfans: dates.newfans,
      nolikes: dates.nolikes,
      prints: dates.prints,
      activeusers: dates.activeusers
    },
    headers: {
      'Authorization': `Bearer ${token}`
    },
    resolveWithFullResponse: true
  }

  let response = await request(options)

  t.is(response.statusCode, 201)
  t.deepEqual(response.body, dates)
})

test('invalid token POST /', async t => {
  let dates = fixtures.getEstadisticas()
  let url = t.context.url
  let token = await utils.signToken({ userId: 'hacky' }, config.secret)

  let options = {
    method: 'POST',
    url: url,
    json: true,
    body: {
      userId: dates.userId,
      year: dates.year,
      month: dates.month,
      allfans: dates.allfans,
      newfans: dates.newfans,
      nolikes: dates.nolikes,
      prints: dates.prints,
      activeusers: dates.activeusers
    },
    headers: {
      'Authorization': `Bearer ${token}`
    },
    resolveWithFullResponse: true
  }

  t.throws(request(options), /invalid token/)
})
