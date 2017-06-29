'use strict'

import fixtures from '../fixtures/'

export default class Db {
  connect () {
    return Promise.resolve(true)
  }

  disconnect () {
    return Promise.resolve(true)
  }

  getEstadisticas (id) {
    return Promise.resolve(fixtures.getEstadisticas())
  }

  getEstadisticasp () {
    return Promise.resolve(fixtures.getEstadisticasp())
  }

  getImage (id) {
    return Promise.resolve(fixtures.getImage())
  }

  getImages () {
    return Promise.resolve(fixtures.getImages())
  }

  getImagesByTag (tag) {
    return Promise.resolve(fixtures.getImagesByTag())
  }

  saveImage (image) {
    return Promise.resolve(fixtures.getImage())
  }

  saveEstadisticas (dates) {
    return Promise.resolve(fixtures.getEstadisticas())
  }

  likeImage (id) {
    let image = fixtures.getImage()
    image.liked = true
    image.likes = 1
    return Promise.resolve(image)
  }

  saveUser (user) {
    return Promise.resolve(fixtures.getUser())
  }

  getUser (username) {
    return Promise.resolve(fixtures.getUser())
  }

  authenticate (username, password) {
    return Promise.resolve(true)
  }

}
