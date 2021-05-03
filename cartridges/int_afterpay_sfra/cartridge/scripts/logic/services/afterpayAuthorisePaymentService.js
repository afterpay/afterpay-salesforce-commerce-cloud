'use strict';
var afterpayHttpService = require('*/cartridge/scripts/logic/services/afterpayHttpService');
var afterpayUtils = require('*/cartridge/scripts/util/afterpayUtils');

/**
 *  request and response definitions for payment service type 'authorise'
 */
var AuthorisePaymentService = {
    requestUrl: null,
    requestBody: {},

    generateRequest: function (token, orderNo) {
        this.requestUrl = afterpayUtils.getEndpoint('authorise');
        this.generateRequestBody(token, orderNo);
    },

    getResponse: function () {
        var result = afterpayHttpService.call(this.requestUrl, this.requestBody);
        var response = afterpayUtils.handleServiceResponses(this.requestUrl, 'AUTHORISE_PAYMENT', result, this.requestBody);
        return response;
    },

    generateRequestBody: function (token, orderNo) {
        this.requestBody = {
            token: token,
            merchantReference: orderNo,
            requestMethod: 'POST'
        };
    }
};

module.exports = AuthorisePaymentService;
