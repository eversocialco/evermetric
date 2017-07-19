var yo = require('yo-yo');
var anoatcm = [];
var anoatcins = [];
var anoatctw = [];
var anoatcweb = [];

module.exports = function(ctx, dates, dato, user, anomes, red) {

  switch (dato.red) {
    case 'fb': {
      return createList('fb', anoatcm);
    }
    case 'wb': {
      return createList('wb', anoatcweb);
    }
    case 'it': {
      return createList('it', anoatcins);
    }
    case  'tw': {
      return createList('tw', anoatctw);
    }
  }

  /**
   * @func createList
   * @desc Prepare list month items for the navbar menu
   * @param {string} type 
   * @param {Array} array 
   */
  function createList(type, array) {
    const list = document.createElement('ul');
    list.className = `tab-content-datosm ${type}${anomes}`;

    const dateNotExists = !array.includes(anomes);
    if (dateNotExists) {
      array.push(anomes);

      dates.map(date => {
        if (anomes === date.year && date.userId === ctx.auth.username && date.type === 'month' && date.red === dato.red) {
          list.appendChild(yo`<li class="liMes"><a href="#${type}${date.year}${date.month}">${date.month}</a></li>`);
        }
      });

      const liNumber = list.getElementsByTagName('li').length;
      if (liNumber > 0) {
        return list;
      }
    }
  }
}
