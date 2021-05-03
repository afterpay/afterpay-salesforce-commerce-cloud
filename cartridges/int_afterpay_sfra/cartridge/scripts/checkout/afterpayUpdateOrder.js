var afterpayConstants = require('*/cartridge/scripts/util/afterpayConstants');
var Transaction = require('dw/system/Transaction');
var Logger = require('dw/system/Logger');

/**
 * retrieves payment transaction status
 * @param {Object} order - order
 * @returns {Object} - payment transaction
 */
function getPaymentTransaction(order) {
    var paymentTransaction;
    for (var i = 0; i < order.paymentInstruments.length; i += 1) {
        var paymentInstrument = order.paymentInstruments[i];

        if (paymentInstrument.paymentMethod.equals(afterpayConstants.PAYMENT_MODE.PAYMENT_METHOD)) {
            paymentTransaction = paymentInstrument.paymentTransaction;
        }
    }
    return paymentTransaction;
}

/**
 * retrieves payment processor
 * @returns {Object} - processor
 */
function getPaymentProcessor() {
    var PaymentMgr = require('dw/order/PaymentMgr');
    var paymentProcessor = PaymentMgr.getPaymentMethod(afterpayConstants.PAYMENT_MODE.PAYMENT_METHOD).paymentProcessor;
    return paymentProcessor;
}

/**
 * saves success payment transaction status
 * @param {Object} paymentTransaction - transaction
 * @param {Object} paymentResult - result
 * @param {string} paymentMode - mode
 * @returns {Object} - transaction
 */
function savePaymentTransaction(paymentTransaction, paymentResult, paymentMode) {
    var Money = require('dw/value/Money');
    var payTrans = paymentTransaction;

    Transaction.begin();
    payTrans.setTransactionID((paymentResult.id) ? paymentResult.id : null);
    payTrans.setAmount((paymentResult.totalAmount) ? new Money(parseFloat(paymentResult.totalAmount.amount), paymentResult.totalAmount.currency) : null);
    payTrans.setPaymentProcessor(getPaymentProcessor());
    payTrans.custom.apPaymentID = (paymentResult.id) ? paymentResult.id : null;
    payTrans.custom.apPaymentMode = paymentMode;
    if (paymentMode === afterpayConstants.PAYMENT_MODE.DIRECT_CAPTURE) {
        payTrans.custom.apDirectPaymentStatus = paymentResult.status;
    } else {
        payTrans.custom.apAuthoriseStatus = paymentResult.status;
    }
    Transaction.commit();

    return payTrans;
}

/**
 * saves order status based on payment transaction status
 * @param {Object} order - order
 * @param {Object} paymentResult - result
 * @returns {Object} - order
 */
function saveOrder(order, paymentResult) {
    var Order = require('dw/order/Order');
    var outOrder = order;
    Transaction.begin();
    outOrder.custom.apIsAfterpayOrder = true;
    if (paymentResult.status === afterpayConstants.PAYMENT_STATUS.APPROVED) {
        outOrder.setPaymentStatus(Order.PAYMENT_STATUS_PAID);
    } else {
        outOrder.setPaymentStatus(Order.PAYMENT_STATUS_NOTPAID);
    }

    Transaction.commit();
    return outOrder;
}

/**
 * saves declined payment transaction status
 * @param {Object} paymentTransaction - transaction
 * @param {string} paymentMode - payment mode
 * @returns {Object} - transaction
 */
function savePaymmentTransactionDeclined(paymentTransaction, paymentMode) {
    var payTrans = paymentTransaction;
    Transaction.begin();
    payTrans.setPaymentProcessor(getPaymentProcessor());
    payTrans.custom.apPaymentMode = paymentMode;
    payTrans.custom.apInitialStatus = afterpayConstants.PAYMENT_STATUS.DECLINED;
    payTrans.custom.apToken = null;
    if (paymentMode === afterpayConstants.PAYMENT_MODE.DIRECT_CAPTURE) {
        payTrans.custom.apDirectPaymentStatus = afterpayConstants.PAYMENT_STATUS.UNKNOWN;
    } else {
        payTrans.custom.apAuthoriseStatus = afterpayConstants.PAYMENT_STATUS.UNKNOWN;
    }
    Transaction.commit();

    return payTrans;
}

/**
 * updates order based of the payment status
 * @param {Object} order - order
 * @param {Object} paymentResult - payment result
 * @param {string} paymentMode - payment mode
 */
function handleUpdateOrder(order, paymentResult, paymentMode) {
    var paymentTransaction;
    try {
        paymentTransaction = getPaymentTransaction(order);
        if (paymentResult.status !== afterpayConstants.PAYMENT_STATUS.DECLINED) {
            savePaymentTransaction(paymentTransaction, paymentResult, paymentMode);
            saveOrder(order, paymentResult);
        } else {
            savePaymmentTransactionDeclined(paymentTransaction, paymentMode);
        }
    } catch (exception) {
        var e = exception;
        Logger.error(e);
        throw e;
    }
}

module.exports = {
    handleUpdateOrder: handleUpdateOrder,
    getPaymentTransaction: getPaymentTransaction,
    savePaymentTransaction: savePaymentTransaction,
    getPaymentProcessor: getPaymentProcessor,
    saveOrder: saveOrder
};
