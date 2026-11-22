'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {nearestIndex,layout}=require('../public/charts');
test('chart hit testing uses time spacing, clamps edges and handles a single sample',()=>{
  const points=[{x:0},{x:5},{x:100}];
  assert.equal(nearestIndex(points,40),1);assert.equal(nearestIndex(points,90),2);
  assert.equal(nearestIndex(points,-50),0);assert.equal(nearestIndex(points,1000),2);
  assert.equal(nearestIndex([{x:5}],100),0);assert.equal(nearestIndex([],0),-1);
});
test('chart layout removes unknown readings, sorts time and excludes out-of-window samples',()=>{
  const plot=layout([{x:10000,y:4},{x:3000,y:3},{x:5000,y:null},{x:6000,y:NaN},{x:8000,y:5},{x:11000,y:2}],{windowHours:1/720},10000);
  assert.deepEqual(plot.points.map(p=>p.x),[8000,10000]);
  assert.ok(plot.coords.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
});
test('single, zero and constant samples have finite geometry and visible zero-height bars',()=>{
  for(const input of [[{x:1,y:0}],[{x:1,y:5},{x:2,y:5}]]){
    const p=layout(input,{bar:true,min:0});
    assert.ok(p.coords.every(c=>Number.isFinite(c.x)&&Number.isFinite(c.y)&&c.x>=p.L&&c.x<=p.W-p.R));
  }
});
