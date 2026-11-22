'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {getCurrencyCode, formatMoney, formatTariff} = require('../public/money');

test('currency configuration defaults, normalizes and rejects invalid codes', () => {
  assert.equal(getCurrencyCode(), 'GBP');
  assert.equal(getCurrencyCode(' eur '), 'EUR');
  for (const code of ['GBP','EUR','USD','CAD','AUD','NZD','CHF','JPY','CNY','HKD','SGD','INR','SEK','NOK','DKK','PLN','ZAR','BRL','AED','KWD']) {
    assert.equal(getCurrencyCode(code), code);
  }
  for (const code of ['pounds','EU','123','ZZZ','<script>']) assert.throws(() => getCurrencyCode(code), /CURRENCY/);
});

test('money preserves missing costs, free sessions and currency minor units', () => {
  assert.equal(formatMoney(null, 'EUR'), '—');
  assert.equal(formatMoney(undefined, 'USD'), '—');
  assert.equal(formatMoney(NaN, 'GBP'), '—');
  assert.equal(formatMoney(0, 'GBP'), '£0.00');
  assert.equal(formatMoney(12.5, 'EUR'), '€12.50');
  assert.equal(formatMoney(12.5, 'USD'), 'US$12.50');
  assert.equal(formatMoney(1250, 'JPY'), 'JP¥1,250');
  assert.match(formatMoney(1.234, 'KWD'), /1\.234$/);
  assert.equal(formatMoney(-2, 'EUR'), '-€2.00');
});

test('tariffs use selected currency, preserve fractional cents and session fees', () => {
  assert.equal(formatTariff({rate:null}, 'EUR'), 'Rate not recorded');
  assert.equal(formatTariff({rate:.075,fee:0}, 'GBP'), '7.5p/kWh + £0.00 per session');
  assert.equal(formatTariff({rate:.0015}, 'EUR'), '€0.0015/kWh');
  assert.equal(formatTariff({rate:.25,billing:'per_minute',fee:1.5}, 'USD'), 'US$0.25/min + US$1.50 per session');
  assert.equal(formatTariff({rate:25}, 'JPY'), 'JP¥25/kWh');
});
