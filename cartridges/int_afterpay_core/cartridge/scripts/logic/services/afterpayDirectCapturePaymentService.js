var AfterpayApiContext = require('*/cartridge/scripts/context/afterpayApiContext');
var AfterpayHttpService = require('*/cartridge/scripts/logic/services/afterpayHttpService');
var Class = require('*/cartridge/scripts/util/class').Class;

/**
 *  request and response definitions for payment service type 'direct capture'
 */
var DirectCapturePaymentService = Class.extend({
    _requestUrl: null, // eslint-disable-line
    _requestBody: {}, // eslint-disable-line

    init: function () {
        this.afterpayHttpService = new AfterpayHttpService();
        this.afterpayApiContext = new AfterpayApiContext();
    },

    generateRequest: function (token, orderNo) {
        this._requestUrl = this.afterpayApiContext.getFlowApiUrls().get('directCapturePayment'); // eslint-disable-line
        this._generateRequestBody(token, orderNo); // eslint-disable-line
    },

    getResponse: function () {
        var response = this.afterpayHttpService.call(this._requestUrl, 'DIRECT_CAPTURE_PAYMENT', this._requestBody); // eslint-disable-line
        return response;
    },

    _generateRequestBody: function (token, orderNo) { // eslint-disable-line
        this._requestBody = { // eslint-disable-line
            token: token,
            merchantReference: orderNo,
            requestMethod: 'POST'
        };
    }
});

module.exports = new DirectCapturePaymentService();
