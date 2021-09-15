'use strict';
/* global empty */
var orderCreateService = require('*/cartridge/scripts/order/orderService');
var TokenModel = require('*/cartridge/scripts/models/afterpayTokenModel.js');
var LogUtils = require('*/cartridge/scripts/util/afterpayLogUtils');
var Logger = LogUtils.getLogger('afterpayGetToken');
/**
 * calls token service to retrieve the token
 * @param {Object} basket - basket
 * @returns {Object} - Token
 */
function getToken(basket) {
    var AfterpayToken;
    try {
        orderCreateService.generateRequest(basket);
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
