var AfterpayApiContext = require('*/cartridge/scripts/context/afterpayApiContext');
var AfterpayHttpService = require('*/cartridge/scripts/logic/services/afterpayHttpService');
var Class = require('*/cartridge/scripts/util/class').Class;
var StringUtils = require('dw/util/StringUtils');

/**
 *  request and response definitions for payment service type 'refund'
 */
var ConfigurationService = Class.extend({

    _requestUrl: null,
    _requestBody: {},

    init: function () {
        this.afterpayHttpService = new AfterpayHttpService();
        this.afterpayApiContext = new AfterpayApiContext();
    },

    generateRequest: function (params) {
        var arg = params && params.paymentID ? params.paymentID : '';

        this._requestUrl = StringUtils.format(this.afterpayApiContext.getFlowApiUrls().get('createRefund'), arg); // eslint-disable-line
        this._generateRequestBody(params); // eslint-disable-line
    },

    getResponse: function () {
        var response = this.afterpayHttpService.call(this._requestUrl, 'CREATE_REFUND', this._requestBody); // eslint-disable-line

        return response;
    },

    _generateRequestBody: function (params) {
        this._requestBody = { // eslint-disable-line
            amount: params.amount,
            merchantReference: params.orderNo,
            requestMethod: 'POST'
        };
    }
});

module.exports = new ConfigurationService();
