'use strict';
/* global empty */
var orderCreateService = require('*/cartridge/scripts/order/expressOrderService');
var TokenModel = require('*/cartridge/scripts/models/afterpayTokenModel.js');
var LogUtils = require('*/cartridge/scripts/util/afterpayLogUtils');
var Logger = LogUtils.getLogger('afterpayExpressGetToken');

/**
 * calls token service to retrieve the token
 */
function getExpressToken(basket, checkoutPrice, sourceUrl, merchantReference, store) {
    var AfterpayToken;
    try {
        orderCreateService.generateRequest(basket, checkoutPrice, sourceUrl, merchantReference, store);

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


/*
 * Module exports
 */
module.exports.getExpressToken = getExpressToken;
