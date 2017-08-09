/**
 * @desc On this file we'll process the data brought by the model
 * @author Juan José Arboleda<soyjuanarbol@gmail.com>
 */
import { send, json } from 'micro';
import HttpHash from 'http-hash';
import moment from 'moment';
import fetchAll from './lib/fetchAll';
import { 
  totalFansOf,
  newFansOf,
  dislakesOf,
  totalImpressionsOf,
  activeUsersOf,
  likesAndReactionsOf,
  numberOfPostsOf,
  externalReferralsOf,
  tabsViewsOf,
  totalViewsOf,
} from './lib/model'; // import methods from model

const hash = HttpHash();

hash.set('GET /:page', async function authenticate (req, res, params) {
  const page = params.page;

  await Promise
    .all([
      totalFansOf(page),
      ...fetchAll(newFansOf, page),
      ...fetchAll(dislakesOf, page),
      ...fetchAll(totalImpressionsOf, page),
      ...fetchAll(activeUsersOf, page),
      ...fetchAll(likesAndReactionsOf, page),
      ...fetchAll(numberOfPostsOf, page),
      ...fetchAll(externalReferralsOf, page),
      ...fetchAll(tabsViewsOf, page),
      ...fetchAll(totalViewsOf, page)
    ])
    .then(responses => {
      send(res, 200, responses);
      console.log(responses);
    })
    .catch(e => { console.log(e); send(res, 500, e); })
    
});

export default async function main (req, res) {
  let { method, url } = req // esto es lo mismo que si lo solicitamos por separado let method = req.method y let url = req.url
  let match = hash.get(`${method.toUpperCase()} ${url}`)

  if (match.handler) {
    // ejecutar handler!
    try {
      await match.handler(req, res, match.params)
    } catch (e) {
      send(res, 500, { error: e.message })
    }
  } else {
    send(res, 404, { error: 'route not found' })
  }
}
