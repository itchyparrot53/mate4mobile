'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {parseCursor,cursorFor,getActivity}=require('../activity');

test('activity cursor preserves microseconds and the type/id tie breaker',()=>{
  const value={stamp:'2026-03-29T23:00:00.123456',type:'charge',id:5};
  assert.deepEqual(parseCursor(cursorFor(value)),value);
  assert.equal(parseCursor(null),null);
});
test('malformed and out-of-range activity cursors are rejected',()=>{
  for(const value of ['?', 'a'.repeat(257),Buffer.from('null').toString('base64url'),
    ...[['2026-02-31T00:00:00.000000','drive',1],['2026-01-01T00:00:00.000000','car',1],['2026-01-01T00:00:00.000000','drive',-1]].map(v=>Buffer.from(JSON.stringify(v)).toString('base64url'))]) {
    assert.throws(()=>parseCursor(value),/invalid cursor/);
  }
});
test('next activity cursor refers to last returned row, not the lookahead row',async()=>{
  const rows=[1,2,3].map(id=>({id,type:'drive',stamp:`2026-11-22T12:00:00.00000${4-id}`}));
  const result=await getActivity({query:async()=>({rows})},1,{limit:2,cursor:{stamp:'2026-11-23T00:00:00.000000',type:'drive',id:99}});
  assert.equal(result.items.length,2);assert.equal(result.hasMore,true);
  assert.deepEqual(parseCursor(result.nextCursor),{stamp:rows[1].stamp,type:'drive',id:2});
});
