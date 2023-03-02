'use strict';

/**
 *
 * @input Basket : dw.order.Basket The basket to create shipments for
 * @output AfterpayToken : Object
 */
var getOrderService = require('*/cartridge/scripts/logic/services/afterpayGetOrderService');
var LogUtils = require('*/cartridge/scripts/util/afterpayLogUtils');
var Logger = LogUtils.getLogger('AfterpayGetToken');

/**
 * calls token service to retrieve the token
 * @param {string} token - token
 * @returns {Object} - Order object
 */
function getOrder(token) {
    try {
        getOrderService.generateRequest(token);

        var response = getOrderService.getResponse();

        if (!response || !response.token) {
            Logger.error('Can not get order. The response: ' + response);

            return {
                error: true,
                errorMessage: 'Could not retrieve order details from Afterpay'
            };
        }
        Logger.debug('Afterpay order returned from service: ' + response);
        return response;
    } catch (exception) {
        Logger.error('Exception to get order: ' + exception);
        return {
            error: true,
            errorMessage: exception
        };
    }
}

/*
 * Module exports
 */
module.exports = {
    GetOrder: function (token) {
        return getOrder(token);
    }
};
