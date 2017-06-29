'use strict'

const request = require('request-promise')
const Promise = require('bluebird')

class Client {

  constructor (options) {
    this.options = options || {
      endpoints: {
        pictures: 'http://api.evermetric.co/picture',
        users: 'http://api.evermetric.co/user',
        auth: 'http://api.evermetric.co/auth',
        estadisticas: 'http://api.evermetric.co/dates'
      }
    }
  }

  getPicture (id, callback) {
    let opt = {
      method: 'GET',
      uri: `${this.options.endpoints.pictures}/${id}`,
      json: true
    }

    return Promise.resolve(request(opt)).asCallback(callback)
  }

  getEstadisticas (id, callback) {
    let opt = {
      method: 'GET',
      uri: `${this.options.endpoints.estadisticas}/${id}`,
      json: true
    }

    return Promise.resolve(request(opt)).asCallback(callback)
  }

  saveEstadisticas (dates, callback) {
    let opt = {
      method: 'POST',
      uri: `${this.options.endpoints.estadisticas}/`,
      body: dates,
      json: true
    }

    return Promise.resolve(request(opt)).asCallback(callback)
  }

  listEstadisticas (callback) {
    let opt = {
      method: 'GET',
      uri: `${this.options.endpoints.estadisticas}/list`,
      json: true
    }
    return Promise.resolve(request(opt)).asCallback(callback)
  }

  savePicture (picture, token, callback) {
    let opt = {
      method: 'POST',
      uri: `${this.options.endpoints.pictures}/`,
      body: picture,
      headers: {
        'Authorization': `Bearer ${token}`
      },
      json: true
    }

    return Promise.resolve(request(opt)).asCallback(callback)
  }

  likePicture (id, callback) {
    let opt = {
      method: 'POST',
      uri: `${this.options.endpoints.pictures}/${id}/like`,
      json: true
    }

    return Promise.resolve(request(opt)).asCallback(callback)
  }

  listPicture (callback) {
    let opt = {
      method: 'GET',
      uri: `${this.options.endpoints.pictures}/list`,
      json: true
    }
    return Promise.resolve(request(opt)).asCallback(callback)
  }

  listPictureByTag (tag, callback) {
    let opt = {
      method: 'GET',
      uri: `${this.options.endpoints.pictures}/tag/${tag}`,
      json: true
    }
    return Promise.resolve(request(opt)).asCallback(callback)
  }

  saveUser (user, callback) {
    let opt = {
      method: 'POST',
      uri: `${this.options.endpoints.users}/`,
      body: user,
      json: true
    }
    return Promise.resolve(request(opt)).asCallback(callback)
  }

  getUser (username, callback) {
    let opt = {
      method: 'GET',
      uri: `${this.options.endpoints.users}/${username}`,
      json: true
    }
    return Promise.resolve(request(opt)).asCallback(callback)
  }

  auth (username, password, callback) {
    let opt = {
      method: 'POST',
      uri: `${this.options.endpoints.auth}/`,
      body: {
        username,
        password
      },
      json: true
    }

    return Promise.resolve(request(opt)).asCallback(callback)
  }
}

module.exports = Client
