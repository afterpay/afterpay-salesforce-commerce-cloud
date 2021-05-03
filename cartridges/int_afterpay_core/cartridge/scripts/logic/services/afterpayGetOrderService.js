/* global empty */
var AfterpayApiContext = require('*/cartridge/scripts/context/afterpayApiContext');
var AfterpayHttpService = require('*/cartridge/scripts/logic/services/afterpayHttpService');
var Class = require('*/cartridge/scripts/util/class').Class;
var StringUtils = require('dw/util/StringUtils');

/**
 *  request and response definitions for the service type 'get orders'
 */
var GetOrderService = Class.extend({
    _requestUrl : null, // eslint-disable-line
    _requestBody : {}, // eslint-disable-line

    init: function () {
        this.afterpayHttpService = new AfterpayHttpService();
        this.afterpayApiContext = new AfterpayApiContext();
    },

    generateRequest: function (token) {
        var param = !empty(token) ? token : '';
        this._requestUrl = StringUtils.format(this.afterpayApiContext.getFlowApiUrls().get('getOrders'), param); // eslint-disable-line
    },

    getResponse: function () {
        var response = this.afterpayHttpService.call(this._requestUrl, 'GET_ORDERS', { requestMethod: 'GET' }); // eslint-disable-line
        return response;
    }
});

module.exports = new GetOrderService();
