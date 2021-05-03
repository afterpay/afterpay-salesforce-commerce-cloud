/* global empty, InternalError */
var Transaction = require('dw/system/Transaction');
var PreapprovalModel = require('*/cartridge/scripts/models/preapprovalModel.js');
var AfterpayUtilities = require('*/cartridge/scripts/util/afterpayUtilities.js').getAfterpayCheckoutUtilities();

var Logger = require('dw/system/Logger');
/**
 * retrieves payment status and order token from httpparameter
 * @param {Object} parameter - parameter map
 * @returns {Object} preapprovalModel - preapprovalModel
 */
function parsePreapprovalResult(parameter) {
    var preapprovalModel = new PreapprovalModel();

    preapprovalModel.status = parameter.get('status').getStringValue();
    preapprovalModel.apToken = parameter.get('orderToken').getStringValue();

    return preapprovalModel;
}

/**
 * saves preapproved payment status in PaymentTransaction object
 * @param {Object} preapprovalModel - preapprovalModel
 * @param {Object} lineItemCtnr - lineItemCtnr
 */
function updatePreapprovalStatus(preapprovalModel, lineItemCtnr) {
    var paymentTransaction = AfterpayUtilities.getPaymentTransaction(lineItemCtnr);

    if (empty(paymentTransaction)) {
        throw new InternalError('Can not find payment transaction');
    }

    Logger.debug('Payment status after token generation : ' + preapprovalModel.status);
    Transaction.begin();
    paymentTransaction.custom.apInitialStatus = preapprovalModel.status;
    paymentTransaction.custom.apToken = preapprovalModel.apToken;
    Transaction.commit();
}

/**
 * retrieves preapproved payment status
 * @param {Object} lineItemCtnr - lineItemCtnr
 * @param {Object} parameterMap - parameterMap
 * @returns {Object} preapprovalModel - preapprovalModel
 */
function getPreApprovalResult(lineItemCtnr, parameterMap) {
    var preapprovalModel = parsePreapprovalResult(parameterMap);

    if (empty(preapprovalModel.status) || empty(preapprovalModel.apToken)) {
        Logger.error('can not find order token and status in http parameter returned');

        return { error: true };
    } try {
        updatePreapprovalStatus(preapprovalModel, lineItemCtnr);
    } catch (exception) {
        var e = exception;
        Logger.error('Update payment transaction: ' + e);

        return { error: true };
    }

    return preapprovalModel;
}

/*
 * Module exports
 */
module.exports = {
    getPreApprovalResult: function (lineItemCtnr, parameterMap) {
        return getPreApprovalResult(lineItemCtnr, parameterMap);
    }
};
