/**
 * @desc Micro service for twitter API data
 * @author Juan José Arboleda <soyjuanarbol@gmail.com>
 */

import T from './lib/T.js';
import { send, json } from 'micro';
import HttpHash from 'http-hash';

const hash = HttpHash();

// Route example
// hash.set('METHOD /PATH', function (req, res, params) {
// });

export default async function main (req, res) {
  let { method, url } = req;
  let match = hash.get(`${method.toUpperCase()} ${url}`);

  if (match.handler) {
    try {
      await match.handler(req, res, match.params);
    } catch (e) {
      send(res, 500, { error: e.message });
    }
  } else {
    send(res, 404, { error: 'route not found' });
  }
}
