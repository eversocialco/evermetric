'use strict'

import test from 'ava' // es lo mismo que require pero con la sintexis de emmascripts modules
import micro from 'micro'
import listen from 'test-listen' // es una herramienta para hacer testing de microservicios con micro
import request from 'request-promise' // módulo que me permite hacer http request utilizando promesas
import fixtures from './fixtures/'
import pictures from '../pictures'
import utils from '../lib/utils'
import config from '../config'

test.beforeEach(async t => {
  let srv = micro(pictures)
  t.context.url = await listen(srv)
})

test('GET /:id', async t => {
  let image = fixtures.getImage()
  let url = t.context.url

  let body = await request({ url: `${url}/${image.publicId}`, json: true })
  t.deepEqual(body, image)
})

test('no token POST /', async t => {
  let image = fixtures.getImage()
  let url = t.context.url

  let options = {
    method: 'POST',
    url: url,
    json: true,
    body: {
      description: image.description,
      src: image.src,
      userId: image.userId
    },
    resolveWithFullResponse: true
  }

  t.throws(request(options), /invalid token/)
})

test('secure POST /', async t => {
  let image = fixtures.getImage()
  let url = t.context.url
  let token = await utils.signToken({ userId: image.userId }, config.secret)

  let options = {
    method: 'POST',
    url: url,
    json: true,
    body: {
      description: image.description,
      src: image.src,
      userId: image.userId
    },
    headers: {
      'Authorization': `Bearer ${token}`
    },
    resolveWithFullResponse: true
  }

  let response = await request(options)

  t.is(response.statusCode, 201)
  t.deepEqual(response.body, image)
})

test('invalid token POST /', async t => {
  let image = fixtures.getImage()
  let url = t.context.url
  let token = await utils.signToken({ userId: 'hacky' }, config.secret)

  let options = {
    method: 'POST',
    url: url,
    json: true,
    body: {
      description: image.description,
      src: image.src,
      userId: image.userId
    },
    headers: {
      'Authorization': `Bearer ${token}`
    },
    resolveWithFullResponse: true
  }

  t.throws(request(options), /invalid token/)
})

test('POST /:id/like', async t => {
  let image = fixtures.getImage()
  let url = t.context.url

  let options = {
    method: 'POST',
    url: `${url}/${image.id}/like`,
    json: true
  }

  let body = await request(options)
  let imageNew = JSON.parse(JSON.stringify(image)) // acá clonamos la imagen
  imageNew.liked = true
  imageNew.likes = 1

  t.deepEqual(body, imageNew)
})

test('GET /list', async t => {
  let images = fixtures.getImages()
  let url = t.context.url

  let options = {
    method: 'GET',
    url: `${url}/list`,
    json: true
  }

  let body = await request(options)

  t.deepEqual(body, images)
})

test('GET /tag/:tag', async t => {
  let images = fixtures.getImagesByTag()
  let url = t.context.url

  let options = {
    method: 'GET',
    url: `${url}/tag/awesome`,
    json: true
  }

  let body = await request(options)
  t.deepEqual(body, images)
})
