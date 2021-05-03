'use strict';
var afterpayHttpService = require('*/cartridge/scripts/logic/services/afterpayHttpService');
var afterpayUtils = require('*/cartridge/scripts/util/afterpayUtils');

/**
 *  request and response definitions for payment service type 'direct capture'
 */

var DirectCapturePaymentService = {
    generateRequest: function (token, orderNo) {
        var requestUrl = afterpayUtils.getEndpoint('directCapturePayment');
        var requestBody = this.generateRequestBody(token, orderNo);
        return {
            requestBody: requestBody,
            requestUrl: requestUrl
        };
    },

    getResponse: function (requestUrl, requestBody) {
        var result = afterpayHttpService.call(requestUrl, requestBody);
        var response = afterpayUtils.handleServiceResponses(requestUrl, 'DIRECT_CAPTURE_PAYMENT', result, requestBody);
        return response;
    },

    generateRequestBody: function (token, orderNo) {
        var requestBody = {
            token: token,
            merchantReference: orderNo,
            requestMethod: 'POST'
        };
        return requestBody;
    }
};

module.exports = DirectCapturePaymentService;
