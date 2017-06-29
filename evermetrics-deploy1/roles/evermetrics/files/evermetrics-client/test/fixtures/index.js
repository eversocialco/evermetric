'use strict'

const uuid = require('uuid-base62')

const fixtures = {
  getImage () {
    let id = uuid.uuid()
    return {
      description: 'an #awesome picture with #tags #evermetrics',
      tags: [ 'awesome', 'tags', 'evermetrics' ],
      url: `https://evermetrics.test/${uuid.v4()}.jpg`,
      likes: 0,
      liked: false,
      userId: uuid.uuid(),
      publicId: uuid.encode(id),
      id: id,
      createdAt: new Date().toString()
    }
  },

  getEstadisticas () {
    let id = uuid.uuid()
    return {
      id: id,
      publicId: id, // uuid.encode(id),
      userId: uuid.uuid(),
      year: '2016',
      month: 'enero',
      allfans: '150',
      newfans: '45',
      nolikes: '10',
      prints: '30',
      activeusers: '2333'
    }
  },

  getEstadisticasp (n) {
    let dates = []
    while (n-- > 0) {
      dates.push(this.getEstadisticas())
    }

    return dates
  },

  getImages (n) {
    let images = []
    while (n-- > 0) {
      images.push(this.getImage())
    }

    return images
  },

  getUser () {
    return {
      id: uuid.uuid(),
      name: 'A random user',
      username: 'evermetrics',
      createdAt: new Date().toString()
    }
  }
}

module.exports = fixtures
