'use strict'

const co = require('co')
const r = require('rethinkdb')
const Promise = require('bluebird')
const uuid = require('uuid-base62')
const utils = require('./utils')

const defaults = {
  host: 'localhost',
  port: 28015,
  db: 'dbevermetrics'
}

class Db {

  constructor (options) {
    options = options || {}
    this.host = options.host || defaults.host
    this.port = options.port || defaults.port
    this.db = options.db || defaults.db
    this.setup = options.setup || false
  }

  connect (callback) {
    this.connection = r.connect({
      host: this.host,
      port: this.port
    })

    this.connected = true

    let db = this.db
    let connection = this.connection

    if (!this.setup) {
      return Promise.resolve(connection).asCallback(callback)
    }

    let setup = co.wrap(function * () {
      let conn = yield connection

      let dbList = yield r.dbList().run(conn)
      if (dbList.indexOf(db) === -1) {
        yield r.dbCreate(db).run(conn)
      }

      let dbTables = yield r.db(db).tableList().run(conn)
      if (dbTables.indexOf('dfacebook') === -1) {
        yield r.db(db).tableCreate('dfacebook').run(conn)
        yield r.db(db).table('dfacebook').indexCreate('createdAt').run(conn)
        yield r.db(db).table('dfacebook').indexCreate('userId', { multi: true }).run(conn)
      }

      if (dbTables.indexOf('users') === -1) {
        yield r.db(db).tableCreate('users').run(conn)
        yield r.db(db).table('users').indexCreate('username').run(conn)
      }

      return conn
    })

    return Promise.resolve(setup()).asCallback(callback) // acá estamos diciendo que si no me pasan callback retornamos la promesa resuelta y si sí tiene callback me lo maneje como una función asyncrina normal con callback
  }

  disconnect (callback) {
    if (!this.connected) {
      return Promise.reject(new Error('not connected')).asCallback(callback)
    }

    this.connected = false
    return Promise.resolve(this.connection).then((conn) => conn.close())
  }

  saveImage (image, callback) {
    if (!this.connected) {
      return Promise.reject(new Error('not connected')).asCallback(callback)
    }

    let connection = this.connection
    let db = this.db

    let tasks = co.wrap(function * () {
      let conn = yield connection
      image.createdAt = new Date()
      image.tags = utils.extractTags(image.description)

      let result = yield r.db(db).table('dfacebook').insert(image).run(conn)
      if (result.errors > 0) {
        return Promise.reject(new Error(result.first_error))
      }

      image.id = result.generated_keys[0]

      yield r.db(db).table('dfacebook').get(image.id).update({
        publicId: uuid.encode(image.id)
      }).run(conn)

      let created = yield r.db(db).table('dfacebook').get(image.id).run(conn)

      return Promise.resolve(created)
    })

    return Promise.resolve(tasks()).asCallback(callback)
  }

  saveEstadisticas (dates, callback) {
    if (!this.connected) {
      return Promise.reject(new Error('not connected')).asCallback(callback)
    }

    let connection = this.connection
    let db = this.db

    let tasks = co.wrap(function * () {
      let conn = yield connection
      dates.createdAt = new Date()

      let result = yield r.db(db).table('dfacebook').insert(dates).run(conn)
      if (result.errors > 0) {
        return Promise.reject(new Error(result.first_error))
      }

      dates.id = result.generated_keys[0]

      yield r.db(db).table('dfacebook').get(dates.id).update({
        publicId: dates.id//  uuid.encode(dates.id)
      }).run(conn)

      let created = yield r.db(db).table('dfacebook').get(dates.id).run(conn)

      return Promise.resolve(created)
    })

    return Promise.resolve(tasks()).asCallback(callback)
  }

  getEstadisticas (id, callback) {
    if (!this.connected) {
      return Promise.reject(new Error('not connected')).asCallback(callback)
    }

    let connection = this.connection
    let db = this.db
    let datesId = id // uuid.decode(id)

    let tasks = co.wrap(function * () {
      let conn = yield connection
      let dates = yield r.db(db).table('dfacebook').get(datesId).run(conn)

      if (!dates) {
        return Promise.reject(new Error(`Dates ${datesId} not found`))
      }

      return Promise.resolve(dates)
    })

    return Promise.resolve(tasks()).asCallback(callback)
  }

  getEstadisticasp (callback) {
    if (!this.connected) {
      return Promise.reject(new Error('not connected')).asCallback(callback)
    }
    let connection = this.connection
    let db = this.db

    let tasks = co.wrap(function * () {
      let conn = yield connection

      yield r.db(db).table('dfacebook').indexWait().run(conn)
      let dates = yield r.db(db).table('dfacebook').orderBy({
        index: r.desc('createdAt')
      }).run(conn)

      let result = yield dates.toArray()

      return Promise.resolve(result)
    })

    return Promise.resolve(tasks()).asCallback(callback)
  }

  likeImage (id, callback) {
    if (!this.connected) {
      return Promise.reject(new Error('not connected')).asCallback(callback)
    }

    let connection = this.connection
    let db = this.db
    let getImage = this.getImage.bind(this)

    let tasks = co.wrap(function * () {
      let conn = yield connection

      let image = yield getImage(id)
      yield r.db(db).table('dfacebook').get(image.id).update({
        liked: true,
        likes: image.likes + 1
      }).run(conn)

      let created = yield getImage(id)
      return Promise.resolve(created)
    })

    return Promise.resolve(tasks()).asCallback(callback)
  }

  getImage (id, callback) {
    if (!this.connected) {
      return Promise.reject(new Error('not connected')).asCallback(callback)
    }

    let connection = this.connection
    let db = this.db
    let imageId = uuid.decode(id)

    let tasks = co.wrap(function * () {
      let conn = yield connection
      let image = yield r.db(db).table('dfacebook').get(imageId).run(conn)

      if (!image) {
        return Promise.reject(new Error(`image ${imageId} not found`))
      }

      return Promise.resolve(image)
    })

    return Promise.resolve(tasks()).asCallback(callback)
  }

  getImages (callback) {
    if (!this.connected) {
      return Promise.reject(new Error('not connected')).asCallback(callback)
    }
    let connection = this.connection
    let db = this.db

    let tasks = co.wrap(function * () {
      let conn = yield connection

      yield r.db(db).table('dfacebook').indexWait().run(conn)
      let images = yield r.db(db).table('dfacebook').orderBy({
        index: r.desc('createdAt')
      }).run(conn)

      let result = yield images.toArray()

      return Promise.resolve(result)
    })

    return Promise.resolve(tasks()).asCallback(callback)
  }

  saveUser (user, callback) {
    if (!this.connected) {
      return Promise.reject(new Error('not connected')).asCallback(callback)
    }
    let connection = this.connection
    let db = this.db

    let tasks = co.wrap(function * () {
      let conn = yield connection
      user.password = utils.encrypt(user.password)
      user.createdAt = new Date()

      let result = yield r.db(db).table('users').insert(user).run(conn)

      if (result.errors > 0) {
        return Promise.reject(new Error(result.first_error))
      }

      user.id = result.generated_keys[0]

      let created = yield r.db(db).table('users').get(user.id).run(conn)

      return Promise.resolve(created)
    })

    return Promise.resolve(tasks()).asCallback(callback)
  }

  getUser (username, callback) {
    if (!this.connected) {
      return Promise.reject(new Error('not connected')).asCallback(callback)
    }
    let connection = this.connection
    let db = this.db

    let tasks = co.wrap(function * () {
      let conn = yield connection

      yield r.db(db).table('users').indexWait().run(conn)
      let users = yield r.db(db).table('users').getAll(username, {
        index: 'username'
      }).run(conn)

      let result = null

      try {
        result = yield users.next()
      } catch (e) {
        return Promise.reject(new Error(`user ${username} not found`))
      }

      return Promise.resolve(result)
    })

    return Promise.resolve(tasks()).asCallback(callback)
  }

  authenticate (username, password, callback) {
    if (!this.connected) {
      return Promise.reject(new Error('not connected')).asCallback(callback)
    }

    let getUser = this.getUser.bind(this)

    let tasks = co.wrap(function * () {
      let user = null
      try {
        user = yield getUser(username)
      } catch (e) {
        return Promise.resolve(false)
      }
      if (user.password === utils.encrypt(password)) {
        return Promise.resolve(true)
      }

      return Promise.resolve(false)
    })

    return Promise.resolve(tasks()).asCallback(callback)
  }

  getImageByUser (userId, callback) {
    if (!this.connected) {
      return Promise.reject(new Error('not connected')).asCallback(callback)
    }

    let connection = this.connection
    let db = this.db

    let tasks = co.wrap(function * () {
      let conn = yield connection

      yield r.db(db).table('dfacebook').indexWait().run(conn)
      let images = yield r.db(db).table('dfacebook').getAll(userId, {
        index: 'userId'
      }).run(conn)

      let result = yield images.toArray()

      return Promise.resolve(result)
    })

    return Promise.resolve(tasks()).asCallback(callback)
  }

  getImageByTag (tag, callback) {
    if (!this.connected) {
      return Promise.reject(new Error('not connected')).asCallback(callback)
    }

    let connection = this.connection
    let db = this.db

    let tasks = co.wrap(function * () {
      let conn = yield connection

      yield r.db(db).table('dfacebook').indexWait().run(conn)
      let images = yield r.db(db).table('dfacebook').filter((img) => {
        return img('tags').contains(tag)
      }).orderBy(r.desc('createdAt')).run(conn)

      let result = yield images.toArray()

      return Promise.resolve(result)
    })

    return Promise.resolve(tasks()).asCallback(callback)
  }

}

module.exports = Db
