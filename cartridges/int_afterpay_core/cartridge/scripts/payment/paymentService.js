'use strict';
/* global empty */

var StringUtils = require('dw/util/StringUtils');

var afterpayHttpService = require('*/cartridge/scripts/logic/services/afterpayHttpService');
var afterpayUtils = require('*/cartridge/scripts/util/afterpayUtils');

/**
 *  request and response definitions for payment service type 'get payment'
 */
var paymentService = {
    generateRequest: function (token, paymentID) {
        var param = !empty(token) ? 'token:' + token : paymentID;
        var requestUrl = StringUtils.format(afterpayUtils.getEndpoint('getPayment'), param);
        return requestUrl;
    },

    getResponse: function (requestUrl) {
        var service = afterpayHttpService.getAfterpayHttpService();
        var result = service.call(requestUrl, { requestMethod: 'GET' });
        var response = afterpayUtils.handleServiceResponses(requestUrl, 'GET_PAYMENT', result, { requestMethod: 'GET' });
        return response;
    }
};

module.exports = paymentService;
