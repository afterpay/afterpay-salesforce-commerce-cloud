'use strict';
var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');
var afterpayUtils = require('*/cartridge/scripts/util/afterpayUtils');
var LogUtils = require('*/cartridge/scripts/util/afterpayLogUtils');
var Logger = LogUtils.getLogger('afterpayHttpService');
var afterpaySitePreferencesUtilities = require('*/cartridge/scripts/util/afterpayUtilities');

/**
 * generic method  to process  all service type requests and responses
 */

/**
 * Gets service id
 * @returns {string} - service id
 * */
function getServiceID() {
    var serviceID;
    if (afterpaySitePreferencesUtilities.sitePreferencesUtilities.getServiceName()) {
        serviceID = afterpaySitePreferencesUtilities.sitePreferencesUtilities.getServiceName();
    } else {
        throw new Error('No HTTP service defined for identifier - ' + serviceID);
    }
    return serviceID;
}

var AfterpayHttpService = LocalServiceRegistry.createService(getServiceID(), {
    createRequest: function (service, endPointUrl, requestBody) {
        service.setURL(service.configuration.credential.URL + endPointUrl);
        service.setRequestMethod(requestBody.requestMethod);
        service.addHeader('Content-Type', 'application/json');
        service.addHeader('User-Agent', afterpaySitePreferencesUtilities.sitePreferencesUtilities.getUserAgent());

        if (endPointUrl === 'payments/capture') {
            service.client.setTimeout(afterpaySitePreferencesUtilities.sitePreferencesUtilities.getCaptureTimeout());
        }
        return JSON.stringify(requestBody);
    },

    parseResponse: function (service, httpClient) {
        if (httpClient.statusCode === 200 || httpClient.statusCode === 201) {
            var parseResponse = httpClient.text;
            var filterResponse = parseResponse;
            Logger.debug('Parsed Response : ' + afterpayUtils.filterLogData(filterResponse));
            return parseResponse;
        }
        Logger.error('Error on Afterpay request processing : ' + httpClient.statusCode);
        return httpClient;
    },

    getRequestLogMessage: function (request) {
        return afterpayUtils.filterLogData(request);
    },

    getResponseLogMessage: function (response) {
        return afterpayUtils.filterLogData(response.text);
    }
});

module.exports = AfterpayHttpService;
