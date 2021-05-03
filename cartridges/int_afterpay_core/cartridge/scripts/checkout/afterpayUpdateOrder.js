/* global empty */
var PAYMENT_STATUS = require('*/cartridge/scripts/util/afterpayConstants.js').PAYMENT_STATUS;
var PAYMENT_MODE = require('*/cartridge/scripts/util/afterpayConstants.js').PAYMENT_MODE;
var Transaction = require('dw/system/Transaction');
var Logger = require('dw/system/Logger');
var Money = require('dw/value/Money');
var Order = require('dw/order/Order');
var PaymentMgr = require('dw/order/PaymentMgr');

/**
 * retrieves payment processor
 * @returns {Object} paymentProcessor
 */
function getPaymentProcessor() {
    var paymentProcessor = PaymentMgr.getPaymentMethod(PAYMENT_MODE.PAYMENT_METHOD).paymentProcessor;

    return paymentProcessor;
}

/**
 * saves declined payment transaction status
 * @param {Object} paymentTransaction - paymentTransaction
 * @param {Object} paymentMode - paymentMode
 * @returns {Object} paymentTransaction
 */
function savePaymmentTransactionDeclined(paymentTransaction, paymentMode) {
    var localPaymentTransaction = paymentTransaction;

    Transaction.begin();
    localPaymentTransaction.setPaymentProcessor(getPaymentProcessor());
    localPaymentTransaction.custom.apPaymentMode = paymentMode;
    localPaymentTransaction.custom.apInitialStatus = PAYMENT_STATUS.DECLINED;
    localPaymentTransaction.custom.apToken = null;

    if (paymentMode === PAYMENT_MODE.DIRECT_CAPTURE) {
        localPaymentTransaction.custom.apDirectPaymentStatus = PAYMENT_STATUS.UNKNOWN;
    } else {
        localPaymentTransaction.custom.apAuthoriseStatus = PAYMENT_STATUS.UNKNOWN;
    }
    Transaction.commit();

    return localPaymentTransaction;
}

/**
 * saves order status based on payment trasaction status
 * @param {Object} order - order
 * @param {Object} paymentResult - paymentResult
 * @returns {Object} order
 */
function saveOrder(order, paymentResult) {
    var localOrder = order;
    Transaction.begin();
    localOrder.custom.apIsAfterpayOrder = true;

    if (paymentResult.status === PAYMENT_STATUS.APPROVED) {
        localOrder.setPaymentStatus(Order.PAYMENT_STATUS_PAID);
    } else {
        localOrder.setPaymentStatus(Order.PAYMENT_STATUS_NOTPAID);
    }

    Transaction.commit();

    return localOrder;
}

/**
 * saves success payment transaction status
 * @param {Object} paymentTransaction - paymentTransaction
 * @param {Object} paymentResult - paymentResult
 * @param {string} paymentMode - paymentMode
 * @returns {Object} localPaymentTransaction
 */
function savePaymentTransaction(paymentTransaction, paymentResult, paymentMode) {
    var localPaymentTransaction = paymentTransaction;
    Transaction.begin();
    localPaymentTransaction.setTransactionID(empty(paymentResult.id) ? null : paymentResult.id);
    localPaymentTransaction.setAmount(empty(paymentResult.totalAmount) ? null : new Money(parseFloat(paymentResult.totalAmount.amount), paymentResult.totalAmount.currency));
    localPaymentTransaction.setPaymentProcessor(getPaymentProcessor());
    localPaymentTransaction.custom.apPaymentID = empty(paymentResult.id) ? null : paymentResult.id;
    localPaymentTransaction.custom.apPaymentMode = paymentMode;

    if (paymentMode === PAYMENT_MODE.DIRECT_CAPTURE) {
        localPaymentTransaction.custom.apDirectPaymentStatus = paymentResult.status;
    } else {
        localPaymentTransaction.custom.apAuthoriseStatus = paymentResult.status;
    }
    Transaction.commit();

    return localPaymentTransaction;
}

/**
 * retrieves payment transaction status
 * @param {Object} order - order
 * @returns {Object} paymentTransaction
 */
function getPaymentTransaction(order) {
    var paymentTransaction;
    paymentTransaction = order.getPaymentInstruments(PAYMENT_MODE.PAYMENT_METHOD)[0].getPaymentTransaction();

    return paymentTransaction;
}

/**
 * updates order based of the payment status
 * @param {Object} order - order
 * @param {Object} paymentResult - paymentResult
 * @param {Object} paymentMode - paymentMode
 */
function handleUpdateOrder(order, paymentResult, paymentMode) {
    var paymentTransaction;

    try {
        paymentTransaction = getPaymentTransaction(order);

        if (paymentResult.status !== PAYMENT_STATUS.DECLINED) {
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

module.exports.HanldeUpdateOrder = handleUpdateOrder;
