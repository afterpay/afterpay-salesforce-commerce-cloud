var PAYMENT_STATUS = require('*/cartridge/scripts/util/afterpayConstants').PAYMENT_STATUS;
var apUtilities = require('*/cartridge/scripts/util/afterpayUtilities');
var brandUtilities = apUtilities.brandUtilities;
var sitePreferencesUtilities = apUtilities.sitePreferencesUtilities;
var afterpayUpdateOrder = require('*/cartridge/scripts/checkout/afterpayUpdateOrder');
var baseUpdateOrderService = require('*/cartridge/scripts/logic/services/afterpayUpdateOrderService');
var LogUtils = require('*/cartridge/scripts/util/afterpayLogUtils');
var Logger = LogUtils.getLogger('afterpayHandlePaymentOrder');

/**
 * retrieve payment status
 * @param {number} paymentStatus - payment status
 * @returns {number} - payment status
 */
var parsePaymentStatus = function (paymentStatus) {
    return (paymentStatus === PAYMENT_STATUS.SUCCESS) ? PAYMENT_STATUS.APPROVED : paymentStatus;
};

/**
 * updates order service status
 * @param {Object} order - order
 * @param {number} paymentStatus - payment status
 * @returns {number} - payment status
 */
function getPaymentStatus(order, paymentStatus, expressCheckoutModel) {
    var parsedPaymentStatus = parsePaymentStatus(paymentStatus);
    Logger.debug('parsed payment status : ' + parsedPaymentStatus);
    var paymentResult;
    try {
        paymentResult = baseUpdateOrderService.handleOrder(order, parsedPaymentStatus, expressCheckoutModel);
        if (paymentResult && paymentResult.status === 'DECLINED') {
            parsedPaymentStatus = paymentResult.status;
        }
        afterpayUpdateOrder.handleUpdateOrder(order, paymentResult, sitePreferencesUtilities.getPaymentMode().value);
        Logger.debug('UpdatedOrder service status : ' + parsedPaymentStatus);
    } catch (exception) {
        Logger.error('Exception occured while updating order status ' + exception);
        return {
            error: true,
            errorMessage: exception
        };
    }
    return parsedPaymentStatus;
}

module.exports = {
    getPaymentStatus: getPaymentStatus
};
