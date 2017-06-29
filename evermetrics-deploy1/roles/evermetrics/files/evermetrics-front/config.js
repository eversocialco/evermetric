'use strict'

const config = {
  client: {
    endpoints: {
      pictures: 'http://api.evermetric.co/picture',
      users: 'http://api.evermetric.co/user',
      auth: 'http://api.evermetric.co/auth',
      estadisticas: 'http://api.evermetric.co/dates'
    }
  },
  secret: process.env.EVERMETRICS_SECRET || 'pl4tz1' // ojo no usar defaults
}

if(process.env.NODE_ENV !== 'production') {
  config.client.endpoints = {
    pictures: 'http://localhost:5000',
    users: 'http://localhost:5001',
    auth: 'http://localhost:5002',
    estadisticas: 'http://localhost:5003'
  }
}

module.exports = config
