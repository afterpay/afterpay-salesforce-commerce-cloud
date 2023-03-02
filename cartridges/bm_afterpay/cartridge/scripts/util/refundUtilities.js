'use strict';

var RefundService = require('*/cartridge/scripts/logic/services/afterpayRefundService');
var LogUtils = require('*/cartridge/scripts/util/afterpayLogUtils');
var Logger = LogUtils.getLogger('RefundUtilities');

var RefundUtilities = {
    createRefund: function (params) {
        var refundService = new RefundService();
        refundService.generateRequest(params);

        var refundResponse;

        try {
            refundResponse = refundService.getResponse();
        } catch (e) {
            Logger.debug('Exception occured in refund service call :' + e.message);

            return {
                error: true
            };
        }

        return refundResponse;
    }
};

module.exports = RefundUtilities;
