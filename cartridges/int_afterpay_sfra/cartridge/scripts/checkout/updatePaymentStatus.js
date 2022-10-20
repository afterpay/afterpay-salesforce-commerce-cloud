'use strict';
/* global empty */

/* API Includes */
var Transaction = require('dw/system/Transaction');
var Order = require('dw/order/Order');
var Status = require('dw/system/Status');
var OrderMgr = require('dw/order/OrderMgr');
var Resource = require('dw/web/Resource');

/* Script Modules */
var LogUtils = require('*/cartridge/scripts/util/afterpayLogUtils');
var Logger = LogUtils.getLogger('updatePaymentStatus');
let AfterpaySession = require('*/cartridge/scripts/util/afterpaySession');
let ECPaymentHelpers = require('*/cartridge/scripts/payment/expressCheckoutPaymentHelpers');

var updatePaymentStatus = {};

/**
* update Afterpay payment status.
* @param {Object} order - order
* @returns {Object} - authorization or error
*/
updatePaymentStatus.handlePaymentStatus = function (order, isCashAppPay) {
    var { checkoutUtilities: apCheckoutUtilities } = require('*/cartridge/scripts/util/afterpayUtilities');
    var response;
    var finalPaymentStatus;
    var errorMessage;
    var responseCode;
    var paymentTransaction;
    var apInitialStatus;
    var isCashAppPay = isCashAppPay || false;
    var paymentMethodName = apCheckoutUtilities.getPaymentMethodName(isCashAppPay);
    var impactOrder = order;

    if (!paymentMethodName) {
        return null;
    }

    for (var i = 0; i < order.paymentInstruments.length; i += 1) {
        var paymentInstrument = order.paymentInstruments[i];

        if (paymentInstrument.paymentMethod.equals(paymentMethodName)) {
            paymentTransaction = paymentInstrument.paymentTransaction;
        }
    }

    apInitialStatus = paymentTransaction.custom.apInitialStatus;
    Logger.debug('Afterpay Initial payment status :' + apInitialStatus);

    // Express Checkout
    var orderToken = order.getPaymentInstruments(paymentMethodName)[0].getPaymentTransaction().custom.apToken;
    var expressCheckoutModel = null;
    // Only do afterpay express checkout specific stuff if AfterpaySession is valid. Otherwise, assume that
    // we are doing a capture of non-express checkout order
    if (AfterpaySession.isValid()) {
        if (AfterpaySession.getToken() === orderToken) {
            expressCheckoutModel = ECPaymentHelpers.createExpressCheckoutModelFromOrderAndSession(order);
        }
        // Theoretically, session may have changed while we did the change checks, so
        // make sure the token in the session is still the one we expect. If not, we
        // fail the order
        if (AfterpaySession.getToken() != orderToken) {
            Transaction.begin();
            Order.getPaymentInstruments(paymentMethodName)[0].getPaymentTransaction().custom.apInitialStatus = apInitialStatus;
            Order.setPaymentStatus(dw.order.Order.PAYMENT_STATUS_NOTPAID);
            OrderMgr.failOrder(Order);
            Transaction.commit();
            Logger.error('Payment has been declined. Session changed so there is no way to verify that order created was correct.');
            AfterpaySession.clearSession();

            return {
                AfterpayOrderErrorMessage: Resource.msg('expresscheckout.error.paymentinvalidsession', 'afterpay', null),
                error: true
            };
        }
    }

    finalPaymentStatus = require('*/cartridge/scripts/checkout/afterpayHandlePaymentOrder').getPaymentStatus(order, apInitialStatus, expressCheckoutModel, isCashAppPay);
    response = (finalPaymentStatus.errorMessage) ? finalPaymentStatus.errorMessage : finalPaymentStatus;
    responseCode = apCheckoutUtilities.getPaymentResponseCode(finalPaymentStatus);

    if (response === 'SERVICE_UNAVAILABLE' || response.httpStatusCode === 500 || response === 'INTERNAL_SERVICE_ERROR') {
        finalPaymentStatus = require('*/cartridge/scripts/checkout/afterpayIdempotency').delayPayment(order, apInitialStatus, expressCheckoutModel);
    }

    Logger.debug('Afterpay final payment status :' + finalPaymentStatus);

    if (finalPaymentStatus === 'APPROVED') {
        return { authorized: true };
    } else if (finalPaymentStatus === 'PENDING') {
        return {
            error: true,
            AfterpayOrderErrorMessage: new Status(Status.ERROR, apInitialStatus, 'afterpay.api.declined'),
            apInitialStatus: !empty(order.getPaymentInstruments(paymentMethodName)[0].getPaymentTransaction().custom.apInitialStatus) ? Order.getPaymentInstruments(paymentMethodName)[0].getPaymentTransaction().custom.apInitialStatus : null
        };
    } else if (finalPaymentStatus === 'DECLINED') {
        errorMessage = require('*/cartridge/scripts/util/afterpayErrors').getErrorResponses(responseCode, true);
        Transaction.begin();
        impactOrder.getPaymentInstruments(paymentMethodName)[0].getPaymentTransaction().custom.apInitialStatus = apInitialStatus;
        Transaction.commit();
        Logger.error('Payment has been declined : ' + responseCode);
        if (AfterpaySession.isValid()) {
            AfterpaySession.clearSession();
        }
        return {
            AfterpayOrderErrorMessage: errorMessage,
            error: true
        };
    }

    if (finalPaymentStatus.error) {
        errorMessage = require('*/cartridge/scripts/util/afterpayErrors').getErrorResponses(responseCode, true);
        Transaction.begin();
        impactOrder.getPaymentInstruments(paymentMethodName)[0].getPaymentTransaction().custom.apInitialStatus = apInitialStatus;
        Transaction.commit();
        Logger.error('Error while Authorizing Order : '
            + require('*/cartridge/scripts/util/afterpayErrors').getErrorResponses(responseCode));
    }

    return {
        AfterpayOrderErrorMessage: errorMessage,
        error: true
    };
};

module.exports = updatePaymentStatus;
