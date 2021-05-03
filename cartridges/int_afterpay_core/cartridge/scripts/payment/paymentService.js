/* eslint no-underscore-dangle: 0 */
/* global empty */
var AfterpayApiContext = require('*/cartridge/scripts/context/afterpayApiContext');
var AfterpayHttpService = require('*/cartridge/scripts/logic/services/afterpayHttpService');
var Class = require('*/cartridge/scripts/util/class').Class;
var StringUtils = require('dw/util/StringUtils');

/**
 *  request and response definitions for payment service type 'get payment'
 */
var PaymentService = Class.extend({
    _requestUrl: null,

    init: function () {
        this.afterpayHttpService = new AfterpayHttpService();
        this.afterpayApiContext = new AfterpayApiContext();
    },

    generateRequest: function (token, paymentID) {
        var param = !empty(token) ? 'token:' + token : paymentID;
        this._requestUrl = StringUtils.format(this.afterpayApiContext.getFlowApiUrls().get('getPayment'), param);
    },

    getResponse: function () {
        var response = this.afterpayHttpService.call(this._requestUrl, 'GET_PAYMENT', { requestMethod: 'GET' });
        return response;
    }
});

module.exports = new PaymentService();
