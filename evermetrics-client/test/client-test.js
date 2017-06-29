'use strict'

const test = require('ava')
const nock = require('nock')
const evermetrics = require('../')
const fixtures = require('./fixtures/')

let options = {
  endpoints: {
    pictures: 'http://evermetric.test/picure',
    users: 'http://evermetric.test/user',
    auth: 'http://evermetric.test/auth',
    estadisticas: 'http://evermetric.test/dates'
  }
}

test.beforeEach(t => {
  t.context.client = evermetrics.createClient(options)
})

test('client', t => {
  const client = t.context.client

  t.is(typeof client.getPicture, 'function')
  t.is(typeof client.savePicture, 'function')
  t.is(typeof client.likePicture, 'function')
  t.is(typeof client.listPicture, 'function')
  t.is(typeof client.listPictureByTag, 'function')
  t.is(typeof client.getEstadisticas, 'function')
  t.is(typeof client.saveEstadisticas, 'function')
  t.is(typeof client.listEstadisticas, 'function')
  t.is(typeof client.saveUser, 'function')
  t.is(typeof client.getUser, 'function')
  t.is(typeof client.auth, 'function')
})

test('getPicture', async t => {
  const client = t.context.client

  let image = fixtures.getImage()

  nock(options.endpoints.pictures)
    .get(`/${image.publicId}`)
    .reply(200, image)

  let result = await client.getPicture(image.publicId)

  t.deepEqual(image, result)
})

test('getEstadisticas', async t => {
  const client = t.context.client

  let dates = fixtures.getEstadisticas()

  nock(options.endpoints.estadisticas)
    .get(`/${dates.publicId}`)
    .reply(200, dates)

  let result = await client.getEstadisticas(dates.publicId)

  t.deepEqual(dates, result)
})

test('saveEstadisticas', async t => {
  const client = t.context.client

  let token = 'xxx-xxx-xxx'
  let dates = fixtures.getEstadisticas()
  let newDates = {
    year: dates.year,
    month: dates.month,
    allfans: dates.allfans,
    newfans: dates.newfans,
    nolikes: dates.nolikes,
    prints: dates.prints,
    activeusers: dates.activeusers
  }

  nock(options.endpoints.estadisticas, {
    reqheaders: {
      'Authorization': `Bearer ${token}`
    }
  })
    .post('/', newDates)
    .reply(201, dates)

  let result = await client.saveEstadisticas(newDates, token)

  t.deepEqual(result, dates)
})

test('savePicture', async t => {
  const client = t.context.client

  let token = 'xxx-xxx-xxx'
  let image = fixtures.getImage()
  let newImage = {
    src: image.src,
    description: image.description
  }

  nock(options.endpoints.pictures, {
    reqheaders: {
      'Authorization': `Bearer ${token}`
    }
  })
    .post('/', newImage)
    .reply(201, image)

  let result = await client.savePicture(newImage, token)

  t.deepEqual(result, image)
})

test('likePicture', async t => {
  const client = t.context.client

  let image = fixtures.getImage()
  image.liked = true
  image.likes = 1

  nock(options.endpoints.pictures)
    .post(`/${image.publicId}/like`)
    .reply(200, image)

  let result = await client.likePicture(image.publicId)

  t.deepEqual(image, result)
})

test('listPicture', async t => {
  const client = t.context.client

  let images = fixtures.getImages(3)

  nock(options.endpoints.pictures)
    .get('/list')
    .reply(200, images)

  let result = await client.listPicture()

  t.deepEqual(images, result)
})

test('listEstadisticas', async t => {
  const client = t.context.client

  let dates = fixtures.getEstadisticasp(3)

  nock(options.endpoints.estadisticas)
    .get('/list')
    .reply(200, dates)

  let result = await client.listEstadisticas()

  t.deepEqual(dates, result)
})

test('listPictureByTag', async t => {
  const client = t.context.client

  let images = fixtures.getImages(3)
  let tag = 'evermetrics'

  nock(options.endpoints.pictures)
    .get(`/tag/${tag}`)
    .reply(200, images)

  let result = await client.listPictureByTag(tag)

  t.deepEqual(images, result)
})

test('saveUser', async t => {
  const client = t.context.client

  let user = fixtures.getUser()
  let newUser = {
    username: user.username,
    name: user.name,
    email: 'user@evermetrics.test',
    password: 'ev4r'
  }

  nock(options.endpoints.users)
    .post('/', newUser)
    .reply(201, user)

  let result = await client.saveUser(newUser)

  t.deepEqual(result, user)
})

test('getUser', async t => {
  const client = t.context.client

  let user = fixtures.getUser()

  nock(options.endpoints.users)
    .get(`/${user.username}`)
    .reply(200, user)

  let result = await client.getUser(user.username)

  t.deepEqual(result, user)
})

test('auth', async t => {
  const client = t.context.client

  let credentials = {
    username: 'wserna',
    password: 'ev4r'
  }

  let token = 'xxx-xxx-xxx'

  nock(options.endpoints.auth)
    .post('/', credentials)
    .reply(200, token)

  let result = await client.auth(credentials.username, credentials.password)

  t.deepEqual(result, token)
})
