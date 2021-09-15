'use strict';

var afterpayHttpService = require('*/cartridge/scripts/logic/services/afterpayHttpService');
var afterpayUtils = require('*/cartridge/scripts/util/afterpayUtils');
var { brandUtilities } = require('*/cartridge/scripts/util/afterpayUtilities');
var OrderRequestBuilder = require('*/cartridge/scripts/order/orderRequestBuilder');

/**
 *  request and response definitions for payment service type 'create orders'
 */
var requestUrl = null;
var requestBody = {};
var orderService = {
    generateRequest: function (lineItemCtnr, url) {
        requestUrl = afterpayUtils.getEndpoint('createOrders');
        this.generateRequestBody(lineItemCtnr, url);
    },

    getResponse: function () {
        var service = afterpayHttpService.getAfterpayHttpService();
        var result = service.call(requestUrl, requestBody);
        var response = afterpayUtils.handleServiceResponses(requestUrl, 'CREATE_ORDER', result, { requestMethod: 'GET' });
        return response;
    },

    generateRequestBody: function (lineItemCtnr, url) {
        var orderRequestBuilder = new OrderRequestBuilder();

        requestBody = orderRequestBuilder.buildRequest({
            basket: lineItemCtnr,
            url: url,
            requestMethod: 'POST'
        }).get();
    }
};

module.exports = orderService;
