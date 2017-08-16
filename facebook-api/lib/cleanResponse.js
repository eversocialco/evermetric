/**
 * @func cleanThis will convert api response in something readable...
 * @param {Object} response is the Api response
 * @author Juan José Arboleda <soyjuanarbol@gmail.com>
 */
function cleanThis(response) {
  // Insigths or types got from the api
  const topics = [
    'page_fan_adds',
    'page_fan_removes',
    'page_actions_post_reactions_like_total',
    'page_views_external_referrals',
    'page_impressions',
    'page_engaged_users',
    'page_admin_num_posts',
    'page_tab_views_login_top_unique',
    'page_views_total'
  ];

  // Order the api response with his topics
  let responseOrdered = [];
  topics.map(topic => {

    let data = response.filter(theTypeOf);
    responseOrdered.push(data);

    function theTypeOf(response) {
      return response.name === topic;
    }

  });

  // Once is ordered the reponse get the values of dates and push'em in one array
  let apiValues = [];
  responseOrdered.map(topicList => {
    let datesAndValues = [];

    topicList.map(topicData => {
      let values = topicData.values;
      datesAndValues.push(...values)
    });

    apiValues.push(datesAndValues);
  });

  // Once we've all the values of two yers, put them into his respective object
  // and delete the other objects (the other range of dates)
  apiValues.map((values, index) => {
    responseOrdered[index][0]['values'] = values;
    responseOrdered[index].splice(1);
  });

  // finally, put all of this into an array fill with objects, no others arrays
  let finalResponse = [];
  responseOrdered.map((element, index) => {
    finalResponse.push(...element);
  });

  // return this
  return finalResponse;
}

module.exports = cleanThis;