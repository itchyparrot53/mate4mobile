(function (root, factory) {

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MateMoney = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const supported = typeof Intl.supportedValuesOf === 'function'
    ? new Set(Intl.supportedValuesOf('currency')) : null;

  function getCurrencyCode(value = 'GBP') {
    const code = String(value || 'GBP').trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(code) || (supported && !supported.has(code))) {
      throw new Error('CURRENCY must be a supported ISO currency code, such as GBP, EUR, USD, CAD, AUD or JPY.');
    }
    return code;
  }

  function formatMoney(value, code = 'GBP', rate = false) {
    if (value == null || value === '' || !Number.isFinite(Number(value))) return '—';
    const options = { style: 'currency', currency: getCurrencyCode(code) };
    // Tariffs may contain fractions of a cent; totals use the currency's own
    // minor units (e.g. zero decimals for JPY, three for KWD).
    if (rate) options.maximumFractionDigits = 4;
    return new Intl.NumberFormat('en-GB', options).format(Number(value));
  }

  function formatTariff(tariff, code = 'GBP') {
    if (tariff.rate == null) return 'Rate not recorded';
    code = getCurrencyCode(code);
    const rate = code === 'GBP'
      ? new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 }).format(tariff.rate * 100) + 'p'
      : formatMoney(tariff.rate, code, true);
    const unit = tariff.billing === 'per_minute' ? '/min' : '/kWh';
    return rate + unit + (tariff.fee == null ? '' : ' + ' + formatMoney(tariff.fee, code) + ' per session');
  }

  return { getCurrencyCode, formatMoney, formatTariff };
});
