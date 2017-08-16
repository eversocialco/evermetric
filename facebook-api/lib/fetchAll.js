'use strict';

import moment from 'moment';

function fetchAll(promise, page) {
  let data = [];

  // dates for our range since:until Facebook API
  const yesterday = moment().add(-1, 'day'); // yesterday, cuz' today has not passed!
  let since = moment().add(-2, 'years');
  let until = since.clone().add(90, 'days');

  while (until <= yesterday) {

    // Facebook API only recognize UNIX date, so we convert our dates, into UNIX dates
    let sinceFormatted = since.unix();
    let untilFormatted = until.unix();

    // push the promise to our data
    let thePromise = promise(page, sinceFormatted, untilFormatted);
    data.push(thePromise);
  
    // finally, advance...
    // why 90? Facebook API only allows 90 days of range
    since = since.add(90, 'days');
    until = until.add(90, 'days');
  }

  // FIX ME I MUST BE INSIDE WHILE LOOP!
  // when until is going to be greater than yesterday, we have to set him equals to yesterday (the future haven't happened)
  if (until.clone().add(90, 'days') > yesterday) {
    let dif = until.add(90, 'days').diff(yesterday, 'days');
    until = until.add(-dif, 'days');

    let sinceFormatted = since.unix();
    let untilFormatted = until.unix();
    
    let thePromise = promise(page, sinceFormatted, untilFormatted);
    data.push(thePromise);
  }

  // return the data (a bunch of promises)
  return data;
}

module.exports = fetchAll;