var Context = require('*/cartridge/scripts/context/context');
var afterpayHttpService = require('*/cartridge/scripts/logic/services/afterpayHttpService');
var StringUtils = require('dw/util/StringUtils');

/**
 *  request and response definitions for payment service type 'refund'
 */
var RefundService = function () {
    // eslint-disable-next-line no-underscore-dangle
    this._requestUrl = null;
    // eslint-disable-next-line no-underscore-dangle
    this._requestBody = {};
    this.afterpayHttpService = afterpayHttpService.getAfterpayHttpService();
    this.context = new Context();
};

RefundService.prototype = {
    constructor: RefundService,
    generateRequest: function (params) {
        var arg = params && params.paymentID ? params.paymentID : '';

        this._requestUrl = StringUtils.format(this.context.get('createRefund'), arg); // eslint-disable-line
        this._generateRequestBody(params); // eslint-disable-line
    },
    getResponse: function () {
        var response = this.afterpayHttpService.call(this._requestUrl, this._requestBody); // eslint-disable-line

        return response;
    },
    _generateRequestBody: function (params) {
        this._requestBody = { // eslint-disable-line
            amount: params.amount,
            merchantReference: params.orderNo,
            requestId: params.requestId,
            requestMethod: 'POST'
        };
    }
};

module.exports = RefundService;
