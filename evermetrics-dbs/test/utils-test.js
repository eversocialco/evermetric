'use-strict'

const test = require('ava')
const utils = require('../lib/utils')

test('extracting hashtags from text', t => {
  let tags = utils.extractTags('a tags more used from module instagram #AwEsoMe #Evermetrics #aVA and #100 #yes')

  t.deepEqual(tags, [
    '#AwEsoMe',
    '#Evermetrics',
    '#aVA',
    '#100',
    '#yes'
  ])

  tags = utils.extractTags('a client without tags')
  t.deepEqual(tags, [])

  tags = utils.extractTags()
  t.deepEqual(tags, [])

  tags = utils.extractTags(null)
  t.deepEqual(tags, [])
})

test('ecrypt password', t => {
  let password = 'foo123'
  let encrypted = '02b353bf5358995bc7d193ed1ce9c2eaec2b694b21d2f96232c9d6a0832121d1'

  let result = utils.encrypt(password)

  t.is(result, encrypted)
})
