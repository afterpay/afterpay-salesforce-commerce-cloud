'use strict';

var URLAction = require('dw/web/URLAction');
var URLParameter = require('dw/web/URLParameter');
var URLUtils = require('dw/web/URLUtils');
var Site = require('dw/system/Site');

/**
 * @description Generate URL for the current request with locale
 * @param {PipelineDictionary} pdict the pipeline dictionary object of current request
 * @param {string} locale the locale
 * @returns {string} url
 */
exports.getCurrent = function getCurrent(pdict, locale) {
    var currentAction = pdict.CurrentSession.clickStream.last.pipelineName;
    var siteId = Site.getCurrent().getID();
    var loc;

    if (!locale) {
        loc = 'default';
    }

    var urlAction = new URLAction(currentAction, siteId, loc);
    var args = [urlAction];
    var parameterMap = pdict.CurrentHttpParameterMap;

    // iterate over current request's parameters, put them into the URL
    Object.keys(parameterMap).forEach(function (p) {
        if (Object.prototype.hasOwnProperty.call(parameterMap, p) && p !== 'lang') {
            args.push(new URLParameter(p, parameterMap[p]));
        }
    });

    return pdict.CurrentRequest.httpProtocol + '://' +
        pdict.CurrentRequest.httpHost +
        URLUtils.url.apply(null, args);
};
