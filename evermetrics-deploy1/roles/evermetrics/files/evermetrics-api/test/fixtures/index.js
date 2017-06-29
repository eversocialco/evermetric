'use strict'

export default {
  getImage () {
    return {
      id: '6a238b19-3ee3-4d5c-acb5-944a3450d',
      publicId: '3ehqEZvwZByc6hjzEZU5p',
      userId: 'wserna',
      liked: false,
      likes: 0,
      src: 'http://evermetrics.co/3ehqEZvwZByc6hjzEZU5p.jpg',
      description: '#prueba',
      tags: [ 'prueba' ],
      createdAt: new Date().toString()
    }
  },

  getEstadisticas () {
    return {
      id: '6a238b19-3ee3-4d5c-acb5-94sa3e0d',
      publicId: '3ehqEZvwZByc6hjzEZ49p',
      userId: 'wserna',
      year: '2016',
      month: 'enero',
      allfans: '150',
      newfans: '45',
      nolikes: '10',
      prints: '30',
      activeusers: '2333'
    }
  },

  getEstadisticasp () {
    return [
      this.getEstadisticas(),
      this.getEstadisticas(),
      this.getEstadisticas()
    ]
  },

  getImages () {
    return [
      this.getImage(),
      this.getImage(),
      this.getImage()
    ]
  },

  getImagesByTag () {
    return [
      this.getImage(),
      this.getImage()
    ]
  },

  getUser () {
    return {
      id: 'f632db90-d6bf-46f0-9fb1-4eb6912cbdb4',
      name: 'William Serna',
      username: 'wserna',
      email: 'wsernalaverde@gmail.com',
      password: 'pl4tz1',
      createdAt: new Date().toString()
    }
  }
}
