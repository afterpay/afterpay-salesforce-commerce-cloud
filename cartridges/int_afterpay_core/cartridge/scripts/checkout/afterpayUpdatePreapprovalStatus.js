'use strict';

var Transaction = require('dw/system/Transaction');
var PreapprovalModel = require('*/cartridge/scripts/models/preapprovalModel');
var LogUtils = require('*/cartridge/scripts/util/afterpayLogUtils');
var Logger = LogUtils.getLogger('afterpaUpdatePreapprovalStatus');

/**
 * retrieves payment status and order token from httpparameter
 * @param {Object} parameter - parameter
 * @returns {Object} - pre Approval Model
 */
function parsePreapprovalResult(parameter) {
    var preapprovalModel = new PreapprovalModel();
    preapprovalModel.status = parameter.status;
    preapprovalModel.apToken = parameter.orderToken;
    preapprovalModel.apExpressCheckout = parameter.apExpressCheckout || false;
    preapprovalModel.apExpressCheckoutChecksum = parameter.apExpressCheckoutChecksum || '';
    return preapprovalModel;
}

/**
 * saves preapproved payment status in PaymentTransaction object
 * @param {Object} preapprovalModel - preApproval Model
 * @param {Object} lineItemCtnr - line Item Container
 * @param {Object} parameterMap - parameters objects
 */
function updatePreapprovalStatus(preapprovalModel, lineItemCtnr, parameterMap) {
    var apCheckoutUtilities = require('*/cartridge/scripts/util/afterpayUtilities').checkoutUtilities;
    var isCashAppPayment = parameterMap.isCashAppPay || false;
    var paymentMethodName = apCheckoutUtilities.getPaymentMethodName(isCashAppPayment);
    var paymentInstrument = lineItemCtnr.getPaymentInstruments(paymentMethodName)[0];
    var paymentTransaction = paymentInstrument ? paymentInstrument.getPaymentTransaction() : null;
    if (paymentTransaction) {
        Logger.debug('Payment status after token generation : ' + preapprovalModel.status);
        Transaction.begin();
        paymentTransaction.custom.apInitialStatus = preapprovalModel.status;
        paymentTransaction.custom.apToken = preapprovalModel.apToken;
        paymentTransaction.custom.apExpressCheckout = preapprovalModel.apExpressCheckout;
        paymentTransaction.custom.apExpressCheckoutChecksum = preapprovalModel.apExpressCheckoutChecksum;
        Transaction.commit();
    } else {
        Logger.error('Can not find payment transaction');
    }
}

/**
 * retrieves preapproved payment status
 * @param {Object} lineItemCtnr - line Item Container
 * @param {Object} parameterMap - parameter Map
 * @returns {Object} - preApproval Model
 */
function getPreApprovalResult(lineItemCtnr, parameterMap) {
    var preapprovalModel = parsePreapprovalResult(parameterMap);
    if (!(preapprovalModel.status) || !(preapprovalModel.apToken)) {
        Logger.error('can not find order token and status in http parameter returned');
        return { error: true };
    }
    try {
        updatePreapprovalStatus(preapprovalModel, lineItemCtnr, parameterMap);
    } catch (exception) {
        var e = exception;
        Logger.error('Update payment transaction: ' + e);
        return { error: true };
    }
    return preapprovalModel;
}

module.exports = {
    getPreApprovalResult: getPreApprovalResult,
    updatePreapprovalStatus: updatePreapprovalStatus,
    parsePreapprovalResult: parsePreapprovalResult
};
