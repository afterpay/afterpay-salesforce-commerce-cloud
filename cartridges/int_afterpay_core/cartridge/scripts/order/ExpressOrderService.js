'use strict';

var afterpayHttpService = require('*/cartridge/scripts/logic/services/afterpayHttpService');
var afterpayUtils = require('*/cartridge/scripts/util/afterpayUtils');
var OrderRequestBuilder = require('*/cartridge/scripts/order/expressOrderRequestBuilder');
var LogUtils = require('*/cartridge/scripts/util/afterpayLogUtils');
var Logger = LogUtils.getLogger('expressOrderService');

/**
 *  request and response definitions for payment service type 'create orders'
 */
var requestUrl = null;
var requestBody = {};
var expressOrderService = {
    generateRequest: function (basket, checkoutPrice, sourceUrl, merchantReference, store) {
        requestUrl = afterpayUtils.getEndpoint('createOrders');
        this.generateRequestBody(basket, checkoutPrice, sourceUrl, merchantReference, store);
    },

    getResponse: function () {
        var service = afterpayHttpService.getAfterpayHttpService();
        var result = service.call(requestUrl, requestBody);
        Logger.debug('RequestBody: ' + JSON.stringify(requestBody));
        var response = afterpayUtils.handleServiceResponses(requestUrl, 'CREATE_ORDER', result, { requestMethod: 'GET' });
        Logger.debug('Response: ' + JSON.stringify(response));
        return response;
    },

    generateRequestBody: function (basket, checkoutPrice, sourceUrl, merchantReference, store) {
        var orderRequestBuilder = new OrderRequestBuilder();
        requestBody = orderRequestBuilder.buildRequest({
            basket: basket,
            checkoutPrice: checkoutPrice,
            merchantReference: merchantReference,
            sourceUrl: sourceUrl,
            store: store,
            requestMethod: 'POST'
        }).get();
    }
};

module.exports = expressOrderService;
