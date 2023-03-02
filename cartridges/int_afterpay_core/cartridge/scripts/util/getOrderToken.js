'use strict';

var getOrderService = require('*/cartridge/scripts/logic/services/afterpayGetOrderService');
var LogUtils = require('*/cartridge/scripts/util/afterpayLogUtils');
var Logger = LogUtils.getLogger('getOrderToken');

/**
 *  retrieves token related to particular order object
 */
var getOrderToken = {
    validateOrderToken: function (token) {
        getOrderService.generateRequest(token);
        var getOrdersResponse;
        try {
            getOrdersResponse = getOrderService.getResponse();
            Logger.debug('service response to get the Orders : ' + getOrdersResponse);
            return getOrdersResponse;
        } catch (e) {
            Logger.debug('Exception occured to get the Orders : ' + e);
            return {
                error: true
            };
        }
    }
};

module.exports = getOrderToken;
