/**
 * @desc In this file we're gonna make all fields from a page
 * @author Juan José Arboleda <soyjuanarbol@gmail.com>
 */
const { FB } = require('./FB');

// This functions rerive as params tha page and fields to get from the API
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