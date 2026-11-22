'use strict';

const {test} = require('node:test');
const assert = require('node:assert/strict');
const {cleanRoute,thinPoints,averagePower} = require('../src/lib');

test('route removes invalid coordinates, stays within 250 and preserves endpoints',()=>{
  const input=[{lat:null,lng:0},{lat:95,lng:0},...Array.from({length:501},(_,i)=>({lat:51+i/10000,lng:-.2-i/10000})),{lat:0,lng:NaN}];
  const route=cleanRoute(input);
  assert.equal(route.length,250);
  assert.deepEqual(route[0],[51,-.2]);
  assert.deepEqual(route.at(-1),[51.05,-.25]);
  assert.equal(cleanRoute([]).length,0);
});
test('small series and single route point remain intact',()=>{
  const points=[[1,2]];assert.equal(thinPoints(points),points);
});
test('average power accounts for unequal sampling intervals',()=>{
  const at=seconds=>new Date(seconds*1000).toISOString();
  assert.equal(averagePower([{at:at(0),powerKw:10},{at:at(10),powerKw:10},{at:at(110),powerKw:0}]),5.5);
  assert.equal(averagePower([{at:at(0),powerKw:null},{at:at(10),powerKw:10}]),null);
});
