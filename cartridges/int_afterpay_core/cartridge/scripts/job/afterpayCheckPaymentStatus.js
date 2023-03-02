'use strict';

/* eslint no-underscore-dangle: 0 */
var Transaction = require('dw/system/Transaction');
var OrderMgr = require('dw/order/OrderMgr');
var Order = require('dw/order/Order');
var AfterpayCheckoutUtilities = require('*/cartridge/scripts/util/afterpayUtilities').checkoutUtilities;
var brandUtilities = require('*/cartridge/scripts/util/afterpayUtilities').brandUtilities;
var PAYMENT_MODE = require('*/cartridge/scripts/util/afterpayConstants').PAYMENT_MODE;
var PAYMENT_STATUS = require('*/cartridge/scripts/util/afterpayConstants').PAYMENT_STATUS;
var LogUtils = require('*/cartridge/scripts/util/afterpayLogUtils');
var Logger = LogUtils.getLogger('AfterpayCheckPaymentStatus');

/**
 * updates all the transaction details related to order
 * @returns {Object} UpdateOrderService - UpdateOrderService
 */

var getUpdateOrderService = function () {
    var baseUpdateOrderService = require('*/cartridge/scripts/logic/services/afterpayUpdateOrderService.js');

    var UpdateOrderService = function () {};

    UpdateOrderService.prototype = Object.create(baseUpdateOrderService);

    // extend afterpayUpdateOrderService
    UpdateOrderService.prototype.updateDeclinedOrder = function (order) {
        baseUpdateOrderService.updateDeclinedOrder.call(this, order);
        this.updatePaymentStatusDeclined(order);
    };

    UpdateOrderService.prototype.updateApprovedOrder = function (order) {
        baseUpdateOrderService.updateApprovedOrder.call(this, order, 'order');
        this.updatePaymentStatusApproved(order);
    };

    UpdateOrderService.prototype.updatePaymentStatusApproved = function (order) {
        this.updatePaymentStatus(order, PAYMENT_STATUS.APPROVED);
    };

    UpdateOrderService.prototype.updatePaymentStatusDeclined = function (order) {
        Transaction.wrap(function () {
            this.updatePaymentStatus(order, PAYMENT_STATUS.UNKNOWN);
            var paymentTransaction = AfterpayCheckoutUtilities.getPaymentTransaction(order);
            paymentTransaction.setTransactionID('');
        });
    };

    UpdateOrderService.prototype.updatePaymentStatus = function (order, status) {
        var paymentMode = AfterpayCheckoutUtilities.getPaymentModeFromOrder(order);
        var paymentTransaction = AfterpayCheckoutUtilities.getPaymentTransaction(order);

        Transaction.wrap(function () {
            if (paymentMode === PAYMENT_MODE.AUTHORISE) {
                paymentTransaction.custom.apAuthoriseStatus = status;
            } else {
                paymentTransaction.custom.apDirectPaymentStatus = status;
            }

            Logger.debug('Payment Transaction status:' + status);
        });
    };

    return new UpdateOrderService();
};

var _getOrdersNotPaid = function () {
    var sortString = 'creationDate DESC';
    var queryString = 'paymentStatus = {0} AND custom.apIsAfterpayOrder = true';

    return OrderMgr.searchOrders(queryString, sortString, Order.PAYMENT_STATUS_NOTPAID);
};

var checkPaymentStatus = function () {
    var orders = _getOrdersNotPaid();

    if (orders.count === 0) {
        return false;
    }

    while (orders.hasNext()) {
        var order = orders.next();
        brandUtilities.initBrand(order.customerLocaleID);
        var UpdateOrderService = getUpdateOrderService();

        try {
            var paymentResult = UpdateOrderService.loadPaymentResult(order);
            if (!empty(paymentResult)) {
                UpdateOrderService.handleOrder(order, paymentResult.status);
            }
        } catch (exception) {
            Logger.error('Error when update the order ID: {0}. Exception Details:\n{1}', order.orderNo, exception);
        }
    }

    orders.close();

    return true;
};

/**
 *  pipeline call to check the payment status
 */
function execute() {
    try {
        var result = checkPaymentStatus();
        var OrdersAvailable = result;
        Logger.debug('Orders Available :' + OrdersAvailable);
    } catch (exception) {
        Logger.error('Error when checking payment status' + exception);
    }
}

/** Exported functions */
module.exports = {
    execute: execute
};
