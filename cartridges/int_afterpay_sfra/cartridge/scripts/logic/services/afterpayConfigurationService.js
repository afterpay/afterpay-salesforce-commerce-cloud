'use strict';
var afterpayHttpService = require('*/cartridge/scripts/logic/services/afterpayHttpService');
var afterpayUtils = require('*/cartridge/scripts/util/afterpayUtils');
var LogUtils = require('*/cartridge/scripts/util/afterpayLogUtils');
var Logger = LogUtils.getLogger('afterpayConfigurationService');

/**
 *  request and response definitions for service to retrieve threshold amounts
 */
var requestUrl = null;
var ConfigurationService = {
    generateRequest: function () {
        requestUrl = afterpayUtils.getEndpoint('getConfiguration');
    },
    getResponse: function () {
        var response;
        try {
            var result = afterpayHttpService.call(requestUrl, { requestMethod: 'GET' });
            response = afterpayUtils.handleServiceResponses(requestUrl, 'GET_CONFIGURATION', result, { requestMethod: 'GET' });
        } catch (ex) {
            var exception = ex;
            Logger.error(exception.message);
        }
        return response;
    }
};

module.exports = ConfigurationService;
