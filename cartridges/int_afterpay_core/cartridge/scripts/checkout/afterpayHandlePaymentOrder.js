/**
* @input PaymentStatus : String
* @input Order : dw.order.Order
* @output FinalPaymentStatus : Object
*/

var PAYMENT_STATUS = require('*/cartridge/scripts/util/afterpayConstants.js').PAYMENT_STATUS;
var hanldeUpdateOrder = require('*/cartridge/scripts/checkout/afterpayUpdateOrder.js').HanldeUpdateOrder;
var BaseUpdateOrderService = require('*/cartridge/scripts/logic/services/afterpayUpdateOrderService.js');
var sitePreferencesUtilities = require('*/cartridge/scripts/util/afterpayUtilities.js').getSitePreferencesUtilities();
var LogUtils = require('*/cartridge/scripts/util/afterpayLogUtils');
var Logger = LogUtils.getLogger('AfterpayHandlePaymentOrder');

/**
 * retrieve payment status
 * @param {string} paymentStatus - paymentStatus
 * @returns {Object} orderStatus - orderStatus
 * */
var parsePaymentStatus = function (paymentStatus) {
    return (paymentStatus === PAYMENT_STATUS.SUCCESS) ? PAYMENT_STATUS.APPROVED : paymentStatus;
};

/**
 * saves payment status in order object
 * @returns {Object} UpdateOrderService - new UpdateOrderService object
 * */
var getUpdateOrderService = function () {
    var UpdateOrderService = BaseUpdateOrderService.extend({
        orderStatus: undefined,

        init: function () {
            this._super(); // eslint-disable-line
        },

        updateDeclinedOrder: function () {
            this.orderStatus = PAYMENT_STATUS.DECLINED;
        },

        updateFailedOrder: function () {
            this.orderStatus = PAYMENT_STATUS.FAILED;
        },

        updateStatusOrder: function (order, paymentStatus) {
            this.orderStatus = paymentStatus.status;
            hanldeUpdateOrder(order, paymentStatus, sitePreferencesUtilities.getPaymentMode().value);
        }
    });

    return new UpdateOrderService();
};

/**
 * updates order service status
 * @param {Object} order - order
 * @param {string} paymentStatus - paymentStatus
 * @returns {Object} orderStatus - orderStatus
 * */
function getPaymentStatus(order, paymentStatus) {
    var orderStatus;
    var UpdateOrderService;
    var payStatus = parsePaymentStatus(paymentStatus);

    Logger.debug('parsed payment status : ' + payStatus);

    try {
        UpdateOrderService = getUpdateOrderService(payStatus);
        UpdateOrderService.handleOrder(order, payStatus);
        orderStatus = UpdateOrderService.orderStatus;

        Logger.debug('UpdatedOrder service status : ' + orderStatus);
    } catch (exception) {
        Logger.error('Exception occured while updating order status ' + exception);

        return {
            error: true,
            errorMessage: exception
        };
    }

    return orderStatus;
}

/*
 * Module exports
 */
module.exports = {
    getPaymentStatus: function (order, paymentStatus) {
        return getPaymentStatus(order, paymentStatus);
    }
};
