'use strict';

const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const appearance = require('../public/appearance.js');

test('old, corrupt and unrecognised stored preferences resolve to supported assets',()=>{
  for(const value of [null,'broken','null','[]','42','{"model":"__proto__","paint":"constructor"}']) {
    assert.deepEqual(appearance.parse(value),appearance.DEFAULT);
  }
  for(const model of appearance.models) for(const paint of model.paints) {
    const choice = {model:model.id,paint:paint.code};
    assert.deepEqual(appearance.parse(JSON.stringify(choice)),choice);
  }
  assert.equal(appearance.resolve({model:'m3-chrome',paint:'not-a-paint'}).model,'m3-chrome');
});

test('changing generations retains the selected paint family when available',()=>{
  assert.deepEqual(appearance.changeModel({model:'m3-black-trim',paint:'PPMR'},'m3-refresh'),{model:'m3-refresh',paint:'PR01'});
  assert.deepEqual(appearance.changeModel({model:'m3-refresh',paint:'PN01'},'m3-chrome'),{model:'m3-chrome',paint:'PMNG'});
  assert.deepEqual(appearance.changeModel({model:'m3-refresh',paint:'PPSW'},'my-original'),{model:'my-original',paint:'PPSW'});
});

test('every catalogue choice has a distinct local PNG and valid crop geometry',()=>{
  const ids=new Set(),hashes=new Set();
  for(const model of appearance.models) {
    assert.equal(ids.has(model.id),false);ids.add(model.id);
    assert.ok(model.paints.length>=5);
    for(const value of Object.values(model.crop)) assert.ok(Number.isFinite(value));
    const codes = new Set();
    for(const paint of model.paints) {
      assert.equal(codes.has(paint.code),false);codes.add(paint.code);
      assert.match(paint.src,/^\/assets\/(?:vehicles\/[a-z0-9-]+-[A-Z0-9]+|model-3)\.png$/);
      assert.match(paint.hex,/^#[a-fA-F0-9]{6}$/);
      const bytes=fs.readFileSync(path.join(__dirname,'../public',paint.src));
      assert.equal(bytes.subarray(1,4).toString(),'PNG');
      assert.equal(bytes.readUInt32BE(16),1440);assert.equal(bytes.readUInt32BE(20),810);
      assert.ok(bytes.length>25000);
      const hash=crypto.createHash('sha256').update(bytes).digest('hex');
      assert.equal(hashes.has(hash),false,`Duplicate image: ${model.id} ${paint.code}`);hashes.add(hash);
    }
  }
  assert.equal(ids.size,7);
});
