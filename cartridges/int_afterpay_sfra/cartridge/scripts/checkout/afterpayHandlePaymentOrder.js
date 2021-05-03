var PAYMENT_STATUS = require('*/cartridge/scripts/util/afterpayConstants').PAYMENT_STATUS;
var handleUpdateOrder = require('*/cartridge/scripts/checkout/afterpayUpdateOrder').handleUpdateOrder;
var baseUpdateOrderService = require('*/cartridge/scripts/logic/services/afterpayUpdateOrderService');
var sitePreferencesUtilities = require('*/cartridge/scripts/util/afterpayUtilities').sitePreferencesUtilities;
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
function getPaymentStatus(order, paymentStatus) {
    var parsedPaymentStatus = parsePaymentStatus(paymentStatus);
    Logger.debug('parsed payment status : ' + parsedPaymentStatus);
    try {
        var paymentResult = baseUpdateOrderService.handleOrder(order, parsedPaymentStatus);
        handleUpdateOrder(order, paymentResult, sitePreferencesUtilities.getPaymentMode().value);
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
