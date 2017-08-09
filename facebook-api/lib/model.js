'use strict';
/**
 * @desc In this file we're gonna put all requested data (or neeeded for the dashboard)
 * @author Juan José Arboleda <soyjuanarbol@gmail.com>
 */
const getFromThis = require('./getFromThisApi');

// This method will return the number of fans
function totalFansOf(page) {
  return getFromThis(page, 'fan_count')
    .then(response => { return response; })
    .catch(error => { return error; });
}

// Returns all the new fans in a range
function newFansOf(page, since, until) {
  return getFromThis(page, { since, until }, 'insights/page_fan_adds')
    .then(response => { return response.data[0]; })
    .catch(error => { return error; });
}

// Return dislikes in a range
function dislakesOf(page, since, until) {
  return getFromThis(page, { since, until }, 'insights/page_fan_removes')
    .then(response => { return response.data[0]; })
    .catch(error => { return error; });
}

// Get the likes and reactions of a page
function likesAndReactionsOf(page, since, until) {
  return getFromThis(page, { since, until }, 'insights/page_actions_post_reactions_like_total')
    .then(response => { return response.data[0]; })
    .catch(error => { return error; });
}

// Get external referrals
function externalReferralsOf(page, since, until) {
  return getFromThis(page, { since, until }, 'insights/page_views_external_referrals')
    .then(response => { return response.data[0]; })
    .catch(error => { return error; });
}

// Return total impressions in a range
function totalImpressionsOf(page, since, until) {
  return getFromThis(page, { since, until, period: 'day' }, 'insights/page_impressions')
    .then(response => { return response.data[0]; })
    .catch(error => { return error; });
}

// Get the most active users
function activeUsersOf(page, since, until) {
  return getFromThis(page, { since, until, period: 'day' }, 'insights/page_engaged_users')
    .then(response => { return response.data[0]; })
    .catch(error => { return error; });
}

// Get post of a page in a range
function numberOfPostsOf(page, since, until) {
  return getFromThis(page, { since, until, period: 'day' }, 'insights/page_admin_num_posts')
    .then(response => { return response.data[0]; })
    .catch(error => { return error; });
}

// Get views (or clicks) on tabs
function tabsViewsOf(page, since, until) {
  return getFromThis(page, { since, until, period: 'day' }, 'insights/page_tab_views_login_top_unique')
    .then(response => { return response.data[0]; })
    .catch(error => { return error; });
}

// Get totals views of page in a view
function totalViewsOf(page, since, until) {
  return getFromThis(page, { since, until, period: 'day' }, 'insights/page_views_total')
    .then(response => { return response.data[0]; })
    .catch(error => { return error; });
}

// export all this public methods
module.exports = {
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
}