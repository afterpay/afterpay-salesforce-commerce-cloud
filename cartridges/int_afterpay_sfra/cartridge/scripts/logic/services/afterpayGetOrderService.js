'use strict';
var StringUtils = require('dw/util/StringUtils');

var afterpayHttpService = require('*/cartridge/scripts/logic/services/afterpayHttpService');
var afterpayUtils = require('*/cartridge/scripts/util/afterpayUtils');
var LogUtils = require('*/cartridge/scripts/util/afterpayLogUtils');
var Logger = LogUtils.getLogger('afterpayGetOrderService');
/**
 *  request and response definitions for the service type 'get orders'
 */
var requestUrl = null;

var getOrderService = {
    generateRequest: function (token) {
        var param = token || '';
        requestUrl = StringUtils.format(afterpayUtils.getEndpoint('getOrders'), param);
    },

    getResponse: function () {
        var response;
        try {
            var result = afterpayHttpService.call(requestUrl, { requestMethod: 'GET' });
            response = afterpayUtils.handleServiceResponses(requestUrl, 'GET_ORDERS', result, { requestMethod: 'GET' });
        } catch (ex) {
            var exception = ex;
            Logger.error(exception.message);
        }
        return response;
    }
};

module.exports = getOrderService;
