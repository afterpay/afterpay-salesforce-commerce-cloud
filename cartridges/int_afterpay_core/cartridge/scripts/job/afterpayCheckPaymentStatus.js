/* eslint no-underscore-dangle: 0 */
var Transaction = require('dw/system/Transaction');

var AfterpayUtilities = require('*/cartridge/scripts/util/afterpayUtilities.js').getAfterpayCheckoutUtilities();
var PAYMENT_MODE = require('*/cartridge/scripts/util/afterpayConstants.js').PAYMENT_MODE;
var PAYMENT_STATUS = require('~/cartridge/scripts/util/afterpayConstants.js').PAYMENT_STATUS;
var LogUtils = require('*/cartridge/scripts/util/afterpayLogUtils');
var Logger = LogUtils.getLogger('AfterpayCheckPaymentStatus');

/**
 * updates all the transaction details related to order
 * @returns {Object} UpdateOrderService - UpdateOrderService
 */
var getUpdateOrderService = function () {
    var BaseUpdateOrderService = require('*/cartridge/scripts/logic/services/afterpayUpdateOrderService.js');

    var UpdateOrderService = BaseUpdateOrderService.extend({
        init: function () {
            this._super();
        },

        updateDeclinedOrder: function (order) {
            this._super(order);
            this.updatePaymentStatusDeclined(order);
        },

        updateApprovedOrder: function (order) {
            this._super(order);
            this.updatePaymentStatusApproved(order);
        },

        updatePaymentStatusApproved: function (order) {
            this.updatePaymentStatus(order, PAYMENT_STATUS.APPROVED);
        },

        updatePaymentStatusDeclined: function (order) {
            Transaction.wrap(function () {
                this.updatePaymentStatus(order, PAYMENT_STATUS.UNKNOWN);
                var paymentTransaction = AfterpayUtilities.getPaymentTransaction(order);
                paymentTransaction.setTransactionID('');
            });
        },

        updatePaymentStatus: function (order, status) {
            var paymentMode = AfterpayUtilities.getPaymentModeFromOrder(order);
            var paymentTransaction = AfterpayUtilities.getPaymentTransaction(order);

            Transaction.wrap(function () {
                if (paymentMode === PAYMENT_MODE.AUTHORISE) {
                    paymentTransaction.custom.apAuthoriseStatus = status;
                } else {
                    paymentTransaction.custom.apDirectPaymentStatus = status;
                }

                Logger.debug('Payment Transaction status:' + status);
            });
        }
    });

    return new UpdateOrderService();
};

/**
 *  pipeline call to check the payment status
 */
function execute() {
    try {
        var UpdateOrderService = getUpdateOrderService();
        var result = UpdateOrderService.checkPaymentStatus();
        var OrdersAvailable = result;
        Logger.debug('Orders Available :' + OrdersAvailable);
    } catch (ex) {
        var exception = ex;
        Logger.error('Error when checking payment status' + exception);
    }
}

/** Exported functions **/
module.exports = {
    execute: execute
};
