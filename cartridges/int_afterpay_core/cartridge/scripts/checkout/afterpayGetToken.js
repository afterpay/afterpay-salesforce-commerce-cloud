'use strict';

var orderCreateService = require('*/cartridge/scripts/order/orderService');
var TokenModel = require('*/cartridge/scripts/models/afterpayTokenModel.js');
var LogUtils = require('*/cartridge/scripts/util/afterpayLogUtils');
var Logger = LogUtils.getLogger('afterpayGetToken');
/**
 * calls token service to retrieve the token
 * @param {Object} basket - basket
 * @param {boolean} isCashAppPay - is payment CashApp Pay
 * @returns {Object} - Token
 */
function getToken(basket, isCashAppPay) {
    var AfterpayToken;
    var isCashAppPayment = isCashAppPay || false;
    try {
        orderCreateService.generateRequest(basket, isCashAppPayment);
        var response = orderCreateService.getResponse();
        var res = new TokenModel();

        if (!empty(response.token)) {
            Logger.debug('Afterpay Token generated from service: ' + response.token);
            res.apToken = response.token;
            AfterpayToken = res;
            return AfterpayToken;
        }
        Logger.error('Can not get token. The response: ' + response);
        return response;
    } catch (exception) {
        Logger.error('Exception to get token: ' + exception);
        return {
            error: true,
            errorMessage: exception
        };
    }
}

module.exports.getToken = getToken;
