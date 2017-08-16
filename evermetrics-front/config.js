'use strict'

const config = {
  client: {
    endpoints: {
      pictures: 'http://api.evermetric.co/picture',
      users: 'http://api.evermetric.co/user',
      auth: 'http://api.evermetric.co/auth',
      metrics: 'http://api.evermetric.co/dates',
      facebookApi: 'http://api.evermetric.co/facebook'
    }
  },
  secret: process.env.EVERMETRICS_SECRET || 'pl4tz1' // ojo no usar defaults
}

if(process.env.NODE_ENV !== 'production') {
  config.client.endpoints = {
    pictures: 'http://localhost:5000',
    users: 'http://localhost:5001',
    auth: 'http://localhost:5002',
    metrics: 'http://localhost:5003',
    facebookApi:'http://localhost:5004'
  }
}

module.exports = config
