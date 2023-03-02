'use strict';

/* eslint consistent-return: 0 */
var countries = require('*/cartridge/countries');
var Locale = require('dw/util/Locale');
var Site = require('dw/system/Site');

/**
 * @description filter out the countries array to return only ones that are allowed in
 * site's allowedLocales
 * @return {array} allowedCountries array of countries that have allowed locales
 */
function getCountries() {
    var site = Site.getCurrent();
    var allowedLocales = site.getAllowedLocales();
    var allowedCountries = countries.filter(function (country) {
        var hasAllowedLocale = false;
        // loop over allowed locales
        for (var i = 0; i < allowedLocales.length; i++) { // eslint-disable-line
            var locale = Locale.getLocale(allowedLocales[i]);
            if (country.countryCode === locale.country) {
                hasAllowedLocale = true;
                break;
            }
        }
        return hasAllowedLocale;
    });
    return allowedCountries;
}

/**
 * retrieves countries as grouped
 * @param {Object} group - group
 * @returns {Object} countriesGrouped
 */
function getCountriesGroupedBy(group) {
    var allCountries = getCountries();
    var countriesGrouped = {};
    allCountries.forEach(function (country) {
        var key = Object.prototype.hasOwnProperty.call(country, group) ? country[group] : undefined;
        if (Object.prototype.hasOwnProperty.call(countriesGrouped, key)) {
            countriesGrouped[key].push(country);
        } else {
            countriesGrouped[key] = [country];
        }
    });
    return countriesGrouped;
}

/**
 * iterate over the countries array, find the first country that has the current locale
 * @param {PipelineDictionary} pdict - the current pdict object
 * @returns {Object} country - the object containing the country's settings
 */
function getCurrent(pdict) {
    if (!countries || countries.length === 0) {
        return;
    }
    var currentLocale = Locale.getLocale(pdict.CurrentRequest.locale);
    var country;
    if (!currentLocale.country) {
        return countries[0]; // return the first in the list if the requested one is not available
    }
    for (var i = 0; i < countries.length; i++) { // eslint-disable-line
        var _country = countries[i]; // eslint-disable-line
        if (_country.countryCode === currentLocale.country) {
            country = _country;
            break;
        }
    }
    return country || countries[0]; // return the first in the list if the requested one is not available
}

exports.getCountries = getCountries;
exports.getCountriesGroupedBy = getCountriesGroupedBy;
exports.getCurrent = getCurrent;
