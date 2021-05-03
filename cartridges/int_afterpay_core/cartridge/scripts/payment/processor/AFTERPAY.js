'use strict';
/* global empty, request */

/* API Includes */
var Transaction = require('dw/system/Transaction');
var sitePreferences = require('*/cartridge/scripts/util/afterpayUtilities.js').getSitePreferencesUtilities();
var ctrlCartridgeName = sitePreferences.getControllerCartridgeName();
var Cart = require(ctrlCartridgeName + '/cartridge/scripts/models/CartModel');
var OrderMgr = require('dw/order/OrderMgr');
var URLUtils = require('dw/web/URLUtils');
var Status = require('dw/system/Status');

/* Script Modules */
var app = require(ctrlCartridgeName + '/cartridge/scripts/app');
var guard = require(ctrlCartridgeName + '/cartridge/scripts/guard');
var LogUtils = require('*/cartridge/scripts/util/afterpayLogUtils');
var Logger = LogUtils.getLogger('AFTERPAY');

/**
 * Handles Afterpay token generation process
 * @param {Object} args - arguments
 * @returns {Object} response - response
 */
function Handle(args) {
    var cart = Cart.get(args.Basket);

    Transaction.wrap(function () {
        cart.removeAllPaymentInstruments();
        cart.createPaymentInstrument('AFTERPAY_PBI', cart.getNonGiftCertificateAmount());
    });

    // Recalculate the payments. If there is only gift certificates, make sure it covers the order total, if not
    // back to billing page.
    Transaction.wrap(function () {
        if (!cart.calculatePaymentTransactionTotal()) {
            app.getController('COBilling').Start(); // eslint-disable-line
        }

        return {};
    });

    var afterPayTokenResponse = require('*/cartridge/scripts/checkout/afterpayGetToken').getToken(args.Basket);
    Logger.debug('Token value returned to - AFTERPAY.JS : ' + JSON.stringify(afterPayTokenResponse));

    var afterPayToken = afterPayTokenResponse.errorMessage ? afterPayTokenResponse.errorMessage : afterPayTokenResponse;

    if (afterPayTokenResponse.error) {
        var errorCode = require('*/cartridge/scripts/util/afterpayErrors').getErrorResponses(afterPayToken);
        Logger.error('Error while generating Token : ' + errorCode);
        var redirectURL = URLUtils.https('COBilling-Start', 'afterpay', errorCode);

        app.getView({
            AfterpayRedirectUrl: redirectURL
        }).render('checkout/redirect');
    }

    var coreCartridge = sitePreferences.getCoreCartridgeName();
    var Countries = require(coreCartridge + '/cartridge/scripts/util/Countries');
    var countryCode = Countries.getCurrent({
        CurrentRequest: {
            locale: request.locale
        }
    }).countryCode;

    app.getView({
        apToken: afterPayToken,
        countryCode: countryCode
    }).render('checkout/afterpayredirect');

    return { success: true };
}

/**
 * Authorizes Afterpay Order process.
 * @param {Object} args - arguments
 * @returns {Object} response - response
 */
function Authorise(args) {
    var response;
    var finalPaymentStatus;
    var errorCode;
    var Order = OrderMgr.getOrder(args.OrderNo);
    var apInitialStatus = Order.getPaymentInstruments('AFTERPAY_PBI')[0].getPaymentTransaction().custom.apInitialStatus;

    Logger.debug('Afterpay Initial payment status :' + apInitialStatus);
    finalPaymentStatus = require('*/cartridge/scripts/checkout/afterpayHandlePaymentOrder').getPaymentStatus(Order, apInitialStatus);
    response = !empty(finalPaymentStatus.errorMessage) ? finalPaymentStatus.errorMessage : finalPaymentStatus;

    if (response === 'SERVICE_UNAVAILABLE' || response.httpStatusCode === 500 || response === 'INTERNAL_SERVICE_ERROR') {
        finalPaymentStatus = require('*/cartridge/scripts/checkout/afterpayIdempotency').delayPayment(Order, apInitialStatus);
    }

    Logger.debug('Afterpay final payment status :' + finalPaymentStatus);

    if (finalPaymentStatus === 'APPROVED') {
        return { authorized: true };
    } else if (finalPaymentStatus === 'PENDING') {
        return {
            error: true,
            PlaceOrderError: new Status(Status.ERROR, apInitialStatus, 'afterpay.api.declined'),
            apInitialStatus: !empty(Order.getPaymentInstruments('AFTERPAY_PBI')[0].getPaymentTransaction().custom.apInitialStatus) ? Order.getPaymentInstruments('AFTERPAY_PBI')[0].getPaymentTransaction().custom.apInitialStatus : null
        };
    } else if (finalPaymentStatus === 'DECLINED') {
        errorCode = require('*/cartridge/scripts/util/afterpayErrors').getErrorResponses(response);
        Transaction.begin();
        Order.getPaymentInstruments('AFTERPAY_PBI')[0].getPaymentTransaction().custom.apInitialStatus = apInitialStatus;
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
        Order.getPaymentInstruments('AFTERPAY_PBI')[0].getPaymentTransaction().custom.apInitialStatus = apInitialStatus;
        Transaction.commit();

        Logger.error('Error while Authorizing Order : ' + response);
    }

    return {
        AfterpayOrderErrorMessage: errorCode,
        error: true
    };
}

/**
 * Calls Handle method and based on response ,if error then redirects to billing page with the respective error else redirects to order confirmation page
 * @param {Object} args - arguments
 */
function JSHandle(args) {
    var response;
    var redirectURL;

    response = Handle(args); // eslint-disable-line

    if (response.error) {
        redirectURL = URLUtils.https('COBilling-Start', 'afterpay', 'error');
    } else if (response.cancelled) {
        redirectURL = URLUtils.https('COBilling-Start', 'afterpay', 'cancelled');
    } else if (response.success) {
        redirectURL = URLUtils.https('COSummary-Start');
        app.getForm('billing').object.fulfilled.value = true;
    }

    Logger.debug('AfterpayRedirectUrl: ' + redirectURL);
    app.getView({
        AfterpayRedirectUrl: redirectURL
    }).render('checkout/redirect');
}

/**
 * checks for invalid billing address
 */
function invalidBilling() {
    app.getForm('billing').object.fulfilled.value = false;
    app.getView().render('util/empty');
}

/*
 * Local methods
 */
exports.Handle = Handle;
exports.Authorise = Authorise;
exports.JSHandle = guard.ensure(['https'], JSHandle);
exports.InvalidBilling = guard.ensure(['get'], invalidBilling);
