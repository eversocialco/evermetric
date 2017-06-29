'use strict'

import test from 'ava' // es lo mismo que require pero con la sintexis de emmascripts modules
import micro from 'micro'
import listen from 'test-listen' // es una herramienta para hacer testing de microservicios con micro
import request from 'request-promise' // módulo que me permite hacer http request utilizando promesas
import fixtures from './fixtures/'
import auth from '../auth'
import config from '../config'
import utils from '../lib/utils'

test.beforeEach(async t => {
  let srv = micro(auth)
  t.context.url = await listen(srv)
})

test('success POST /', async t => {
  let user = fixtures.getUser()
  let url = t.context.url

  let options = {
    method: 'POST',
    uri: url,
    body: {
      username: user.username,
      password: user.password
    },
    json: true
  }

  let token = await request(options)
  let decoded = await utils.verifyToken(token, config.secret)

  t.is(decoded.userId, user.username)
})
