var AfterpayApiContext = require('*/cartridge/scripts/context/afterpayApiContext');
var AfterpayHttpService = require('*/cartridge/scripts/logic/services/afterpayHttpService');
var AfterpaySitePreferencesUtilities = require('*/cartridge/scripts/util/afterpayUtilities').getSitePreferencesUtilities();
var Class = require('*/cartridge/scripts/util/class').Class;
var OrderRequestBuilder = require('*/cartridge/scripts/order/orderRequestBuilder');

/**
 * request and response definitions to retrieve token
 */
var OrderService = Class.extend({
     _requestUrl : null, // eslint-disable-line
     _requestBody : {}, // eslint-disable-line

    init: function () {
        this.afterpayHttpService = new AfterpayHttpService();
        this.afterpayApiContext = new AfterpayApiContext();
        this.afterpaySitePreferencesUtilities = AfterpaySitePreferencesUtilities;
    },

    generateRequest: function (lineItemCtnr, url) {
        this._requestUrl = this.afterpayApiContext.getFlowApiUrls().get('createOrders'); // eslint-disable-line
        this._generateRequestBody(lineItemCtnr, url); // eslint-disable-line
    },

    getResponse: function () {
        var response = this.afterpayHttpService.call(this._requestUrl, 'CREATE_ORDER', this._requestBody); // eslint-disable-line
        return response;
    },

    _generateRequestBody: function (lineItemCtnr, url) { // eslint-disable-line
        var orderRequestBuilder = new OrderRequestBuilder();

        this._requestBody = orderRequestBuilder.buildRequest({ // eslint-disable-line
            basket: lineItemCtnr,
            url: url,
            requestMethod: 'POST'
        }).get();
    }
});

module.exports = new OrderService();
