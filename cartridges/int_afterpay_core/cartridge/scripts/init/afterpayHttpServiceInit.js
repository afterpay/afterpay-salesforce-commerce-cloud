'use strict';
/* global empty */

var AfterpayWebServiceUtilities = require('~/cartridge/scripts/util/afterpayUtilities').getAfterpayWebServiceUtilities();
var AfterpaySitePreferencesUtilities = require('~/cartridge/scripts/util/afterpayUtilities').getSitePreferencesUtilities();
var AfterpayHttpMockService = require('~/cartridge/scripts/logic/services/afterpayHttpMockService');
var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');

/**
 * returns the service verb
 * @param {Object} service - service
 * @param {Object} response - response
 * @returns {Object} response - response
 */
var parseAllVerbResponse = function (service, response) {
    return response;
};

/**
 * calls mock service
 * @param {Object} service - service
 * @param {Object} response - response
 * @returns {Object} response - response
 */
var mockResponse = function (service, response) {
    var afterpayHttpMockService = new AfterpayHttpMockService();

    return afterpayHttpMockService.call(service, response);
};

/**
 * filters log message
 * @param {string} msg - message
 * @returns {string} message
 */
var filterGetLogMessage = function (msg) {
    return msg.replace('headers', 'OFFWITHTHEHEADERS');
};

/**
 * creates service request
 * @param {Object} service - service
 * @param {Object} args - arguments
 * @returns {string} response - response
 */
var createRequest = function (service, args) {
    var requestMethod = !empty(args) && !empty(args.requestMethod) ? args.requestMethod : 'POST';

    service.addHeader('Content-Type', 'application/json;charset=utf-8');
    service.setRequestMethod(requestMethod);
    AfterpayWebServiceUtilities.setSASAuthorization(service);

    if (!empty(args)) {
        return JSON.stringify(args);
    }

    return '{}';
};

var httpConfiguration = {
    createRequest: createRequest,
    parseResponse: parseAllVerbResponse,
    mockCall: mockResponse,
    filterLogMessage: filterGetLogMessage
};

LocalServiceRegistry.createService(AfterpaySitePreferencesUtilities.getServiceName(), httpConfiguration);
