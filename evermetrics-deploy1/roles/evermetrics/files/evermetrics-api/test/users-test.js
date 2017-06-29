'use strict'

import test from 'ava' // es lo mismo que require pero con la sintexis de emmascripts modules
import micro from 'micro'
import listen from 'test-listen' // es una herramienta para hacer testing de microservicios con micro
import request from 'request-promise' // módulo que me permite hacer http request utilizando promesas
import fixtures from './fixtures/'
import users from '../users'

test.beforeEach(async t => {
  let srv = micro(users)
  t.context.url = await listen(srv)
})

test('POST /', async t => {
  let user = fixtures.getUser()
  let url = t.context.url

  let options = {
    method: 'POST',
    url: url,
    json: true,
    body: {
      name: user.name,
      username: user.username,
      password: user.password,
      email: user.email
    },
    resolveWithFullResponse: true
  }

  let response = await request(options)

  delete user.email
  delete user.password

  t.is(response.statusCode, 201)
  t.deepEqual(response.body, user)
})

test('GET /', async t => {
  let user = fixtures.getUser()
  let url = t.context.url

  let options = {
    method: 'GET',
    url: `${url}/${user.username}`,
    json: true
  }

  let body = await request(options)

  delete user.email
  delete user.password

  t.deepEqual(body, user)
})
