'use strict'

const uuid = require('uuid-base62')

const fixtures = {
  getImage () {
    return {
      description: 'an #awesome picture with #tags #platzi',
      url: `http://platzigram.test/${uuid.v4()}.jpg`,
      likes: 0,
      liked: false,
      userId: uuid.uuid()
    }
  },
  getEstadisticas () {
    return {
      year: '2016',
      month: 'enero',
      allfans: '150',
      newfans: '45',
      nolikes: '10',
      prints: '30',
      activeusers: '2333',
      userId: uuid.uuid()
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
      name: 'A radom user',
      username: `user_${uuid.v4()}`,
      password: uuid.uuid(),
      email: `${uuid.v4()}@evermetrics.test`
    }
  }
}

module.exports = fixtures
