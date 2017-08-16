/**
 * @desc In this file we're gonna make all fields from a page
 * @author Juan José Arboleda <soyjuanarbol@gmail.com>
 */
const { FB } = require('./FB');

// This functions recive and process as params the page, fields and type (example: insigths...) to get from the API adn just return'em
function getFromThis(page, fields, type) {
  if (!type) {

    return FB.api(`${page}`, { fields })
      .then(res => { return res; })
      .catch(e => { return e; });
  } else {
    
    return FB.api(`${page}/${type}`, fields)
      .then(res => { return res; })
      .catch(e => { return e; });
  }
  
}

module.exports = getFromThis;