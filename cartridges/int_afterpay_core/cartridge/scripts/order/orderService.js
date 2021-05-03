'use strict';
/* eslint no-underscore-dangle: 0 */

var AfterpayApiContext = require('*/cartridge/scripts/context/afterpayApiContext');
var AfterpayHttpService = require('*/cartridge/scripts/logic/services/afterpayHttpService');
var AfterpaySitePreferencesUtilities = require('*/cartridge/scripts/util/afterpayUtilities').getSitePreferencesUtilities();
var Class = require('*/cartridge/scripts/util/class').Class;
var OrderRequestBuilder = require('*/cartridge/scripts/order/orderRequestBuilder');

/**
 *  request and response definitions for payment service type 'create orders'
 */
var OrderService = Class.extend({
    _requestUrl: null,
    _requestBody: {},

    init: function () {
        this.afterpayHttpService = new AfterpayHttpService();
        this.afterpayApiContext = new AfterpayApiContext();
        this.afterpaySitePreferencesUtilities = AfterpaySitePreferencesUtilities;
    },

    generateRequest: function (lineItemCtnr, url) {
        this._requestUrl = this.afterpayApiContext.getFlowApiUrls().get('createOrders');
        this._generateRequestBody(lineItemCtnr, url);
    },

    getResponse: function () {
        var response = this.afterpayHttpService.call(this._requestUrl, 'CREATE_ORDER', this._requestBody);
        return response;
    },

    _generateRequestBody: function (lineItemCtnr, url) {
        var orderRequestBuilder = new OrderRequestBuilder();

        this._requestBody = orderRequestBuilder.buildRequest({
            basket: lineItemCtnr,
            url: url,
            requestMethod: 'POST'
        }).get();
    }
});

module.exports = new OrderService();
