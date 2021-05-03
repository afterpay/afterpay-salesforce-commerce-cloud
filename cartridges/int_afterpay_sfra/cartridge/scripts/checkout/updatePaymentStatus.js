'use strict';
/* global empty */

/* API Includes */
var Transaction = require('dw/system/Transaction');
var Order = require('dw/order/Order');
var Status = require('dw/system/Status');

/* Script Modules */
var LogUtils = require('*/cartridge/scripts/util/afterpayLogUtils');
var Logger = LogUtils.getLogger('updatePaymentStatus');

var updatePaymentStatus = {};

/**
* update Afterpay payment status.
* @param {Object} order - order
* @returns {Object} - authorization or error
*/
updatePaymentStatus.handlePaymentStatus = function (order) {
    var response;
    var finalPaymentStatus;
    var errorCode;
    var paymentTransaction;
    var apInitialStatus;
    var impactOrder = order;

    for (var i = 0; i < order.paymentInstruments.length; i += 1) {
        var paymentInstrument = order.paymentInstruments[i];

        if (paymentInstrument.paymentMethod.equals('AFTERPAY_PBI')) {
            paymentTransaction = paymentInstrument.paymentTransaction;
        }
    }
    apInitialStatus = paymentTransaction.custom.apInitialStatus;
    Logger.debug('Afterpay Initial payment status :' + apInitialStatus);
    finalPaymentStatus = require('*/cartridge/scripts/checkout/afterpayHandlePaymentOrder').getPaymentStatus(order, apInitialStatus);
    response = (finalPaymentStatus.errorMessage) ? finalPaymentStatus.errorMessage : finalPaymentStatus;
    if (response === 'SERVICE_UNAVAILABLE' || response.httpStatusCode === 500 || response === 'INTERNAL_SERVICE_ERROR') {
        finalPaymentStatus = require('*/cartridge/scripts/checkout/afterpayIdempotency').delayPayment(order, apInitialStatus);
    }
    Logger.debug('Afterpay final payment status :' + finalPaymentStatus);
    if (finalPaymentStatus === 'APPROVED') {
        return { authorized: true };
    } else if (finalPaymentStatus === 'PENDING') {
        return {
            error: true,
            AfterpayOrderErrorMessage: new Status(Status.ERROR, apInitialStatus, 'afterpay.api.declined'),
            apInitialStatus: !empty(order.getPaymentInstruments('AFTERPAY_PBI')[0].getPaymentTransaction().custom.apInitialStatus) ? Order.getPaymentInstruments('AFTERPAY_PBI')[0].getPaymentTransaction().custom.apInitialStatus : null
        };
    } else if (finalPaymentStatus === 'DECLINED') {
        errorCode = require('*/cartridge/scripts/util/afterpayErrors').getErrorResponses(response);
        Transaction.begin();
        impactOrder.getPaymentInstruments('AFTERPAY_PBI')[0].getPaymentTransaction().custom.apInitialStatus = apInitialStatus;
        Transaction.commit();
        Logger.error('Payment has been declined : ' + response);
        return {
            AfterpayOrderErrorMessage: errorCode,
            error: true
        };
    }

    if (finalPaymentStatus.error) {
        errorCode = require('*/cartridge/scripts/util/afterpayErrors').getErrorResponses(response);
        Transaction.begin();
        impactOrder.getPaymentInstruments('AFTERPAY_PBI')[0].getPaymentTransaction().custom.apInitialStatus = apInitialStatus;
        Transaction.commit();
        Logger.error('Error while Authorizing Order : ' + response);
    }
    return {
        AfterpayOrderErrorMessage: errorCode,
        error: true
    };
};

module.exports = updatePaymentStatus;
