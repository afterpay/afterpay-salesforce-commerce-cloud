'use strict';
var Transaction = require('dw/system/Transaction');
var Logger = require('dw/system/Logger');
var PreapprovalModel = require('*/cartridge/scripts/models/preapprovalModel');
var afterpayUtilities = require('*/cartridge/scripts/util/afterpayUtilities');

/**
 * retrieves payment status and order token from httpparameter
 * @param {Object} parameter - parameter
 * @returns {Object} - pre Approval Model
 */
function parsePreapprovalResult(parameter) {
    var preapprovalModel = new PreapprovalModel();
    preapprovalModel.status = parameter.status;
    preapprovalModel.apToken = parameter.orderToken;

    return preapprovalModel;
}

/**
 * saves preapproved payment status in PaymentTransaction object
 * @param {Object} preapprovalModel - preApproval Model
 * @param {Object} lineItemCtnr - line Item Container
 */
function updatePreapprovalStatus(preapprovalModel, lineItemCtnr) {
    var paymentTransaction = afterpayUtilities.checkoutUtilities.getPaymentTransaction(lineItemCtnr);

    if (paymentTransaction) {
        Logger.debug('Payment status after token generation : ' + preapprovalModel.status);
        Transaction.begin();
        paymentTransaction.custom.apInitialStatus = preapprovalModel.status;
        paymentTransaction.custom.apToken = preapprovalModel.apToken;
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
        updatePreapprovalStatus(preapprovalModel, lineItemCtnr);
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
