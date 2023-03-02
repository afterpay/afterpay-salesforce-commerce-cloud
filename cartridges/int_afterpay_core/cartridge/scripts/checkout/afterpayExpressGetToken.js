'use strict';

var orderCreateService = require('*/cartridge/scripts/order/expressOrderService');
var TokenModel = require('*/cartridge/scripts/models/afterpayTokenModel.js');
var LogUtils = require('*/cartridge/scripts/util/afterpayLogUtils');
var Logger = LogUtils.getLogger('afterpayExpressGetToken');

/**
 * calls token service to retrieve the token
 * @param {Object} basket - basket
 * @param {Object} checkoutPrice - Afterpay order value
 * @param {string} sourceUrl - source url
 * @param {string} merchantReference - merchantorder order
 * @param {Object} store - If store pickup
 * @returns {Object} - Token
 */
function getExpressToken(basket, checkoutPrice, sourceUrl, merchantReference, store) {
    try {
        orderCreateService.generateRequest(basket, checkoutPrice, sourceUrl, merchantReference, store);
        var response = orderCreateService.getResponse();
        if (!empty(response.token)) {
            var AfterpayToken = new TokenModel();
            Logger.debug('Afterpay Token generated from service: ' + response.token);
            AfterpayToken.apToken = response.token;
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

/*
 * Module exports
 */
module.exports.getExpressToken = getExpressToken;
