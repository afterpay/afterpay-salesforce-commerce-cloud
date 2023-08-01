'use strict';

/* API Includes */
var Transaction = require('dw/system/Transaction');
var AfterpayUtilities = require('*/cartridge/scripts/util/afterpayUtilities.js');
var sitePreferences = AfterpayUtilities.sitePreferencesUtilities;
var ctrlCartridgeName = sitePreferences.getControllerCartridgeName();
var Cart = require(ctrlCartridgeName + '/cartridge/scripts/models/CartModel');
var OrderMgr = require('dw/order/OrderMgr');
var URLUtils = require('dw/web/URLUtils');
var Status = require('dw/system/Status');
var Resource = require('dw/web/Resource');

/* Script Modules */
var app = require(ctrlCartridgeName + '/cartridge/scripts/app');
var LogUtils = require('*/cartridge/scripts/util/afterpayLogUtils');
var Logger = LogUtils.getLogger('AFTERPAY');
var AfterpaySession = require('*/cartridge/scripts/util/afterpaySession');
var ECPaymentHelpers = require('*/cartridge/scripts/payment/expressCheckoutPaymentHelpers');
var brandUtilities = AfterpayUtilities.brandUtilities;
var PAYMENT_STATUS = require('*/cartridge/scripts/util/afterpayConstants').PAYMENT_STATUS;

/**
 * Handles Afterpay token generation process
 * @param {Object} args - arguments
 * @returns {Object} response - response
 */
function Handle(args) {
    var cart = Cart.get(args.Basket);

    Transaction.wrap(function () {
        cart.removeExistingPaymentInstruments('AFTERPAY');
        cart.createPaymentInstrument('AFTERPAY', cart.getNonGiftCertificateAmount());
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
    var responseCode = AfterpayUtilities.checkoutUtilities.getPaymentResponseCode(afterPayTokenResponse);

    if (afterPayTokenResponse.error) {
        var errorMessage = require('*/cartridge/scripts/util/afterpayErrors').getErrorResponses(responseCode, true);
        Logger.error('Error while generating Token : ' + errorMessage);
        var redirectURL = URLUtils.https('COBilling-Start', 'afterpay', errorMessage);

        app.getView({
            AfterpayRedirectUrl: redirectURL
        }).render('checkout/redirect');
    }

    var countryCode = brandUtilities.getCountryCode();

    app.getView({
        apBrand: brandUtilities.getBrand(),
        apToken: afterPayToken,
        countryCode: countryCode
    }).render('checkout/afterpayredirect');

    return {
        redirect: true,
        success: true
    };
}

/**
 * Authorizes Afterpay Order process.
 * @param {Object} args - arguments
 * @returns {Object} response - response
 */
function Authorise(args) {
    var response;
    var finalPaymentStatus;
    var errorMessage;
    var responseCode;
    var Order = OrderMgr.getOrder(args.OrderNo);
    var apInitialStatus = Order.getPaymentInstruments('AFTERPAY')[0].getPaymentTransaction().custom.apInitialStatus;
    var orderToken = Order.getPaymentInstruments('AFTERPAY')[0].getPaymentTransaction().custom.apToken;

    var expressCheckoutModel = null;
    Logger.debug('AfterpaySession getToken :' + AfterpaySession.getToken());
    // Only do afterpay express checkout specific stuff if AfterpaySession is valid. Otherwise, assume that
    // we are doing a capture of non-express checkout order
    if (AfterpaySession.isValid()) {
        if (AfterpaySession.getToken() == orderToken) {
            expressCheckoutModel = ECPaymentHelpers.createExpressCheckoutModelFromOrderAndSession(Order);
        }
        // Theoretically, session may have changed while we did the change checks, so
        // make sure the token in the session is still the one we expect. If not, we
        // fail the order
        if (AfterpaySession.getToken() != orderToken) {
            return Transaction.wrap(function () {
                OrderMgr.failOrder(Order);
                Logger.error('Payment has been declined. Session changed so there is no way to verify that order created was correct.');
                AfterpaySession.clearSession();
                return {
                    AfterpayOrderErrorMessage: Resource.msg('expresscheckout.error.paymentinvalidsession', brandUtilities.getBrand(), null),
                    error: true
                };
            });
        }
    }
    // Clear the Afterpay session regardless of capture outcome
    AfterpaySession.clearSession();
    Logger.debug('Afterpay Initial payment status :' + apInitialStatus);
    finalPaymentStatus = require('*/cartridge/scripts/checkout/afterpayHandlePaymentOrder').getPaymentStatus(Order, apInitialStatus, expressCheckoutModel);
    response = !empty(finalPaymentStatus.errorMessage) ? finalPaymentStatus.errorMessage : finalPaymentStatus;
    responseCode = AfterpayUtilities.checkoutUtilities.getPaymentResponseCode(finalPaymentStatus);

    if (response === 'SERVICE_UNAVAILABLE' || response.httpStatusCode === 500 || response === 'INTERNAL_SERVICE_ERROR') {
        finalPaymentStatus = require('*/cartridge/scripts/checkout/afterpayIdempotency').delayPayment(Order, apInitialStatus, expressCheckoutModel);
    }

    Logger.debug('Afterpay final payment status :' + finalPaymentStatus);

    if (finalPaymentStatus === PAYMENT_STATUS.APPROVED || finalPaymentStatus === PAYMENT_STATUS.ACTIVE) {
        return { authorized: true };
    } else if (finalPaymentStatus === PAYMENT_STATUS.PENDING) {
        return {
            error: true,
            PlaceOrderError: new Status(Status.ERROR, apInitialStatus, 'afterpay.api.declined'),
            apInitialStatus: !empty(Order.getPaymentInstruments('AFTERPAY')[0].getPaymentTransaction().custom.apInitialStatus) ? Order.getPaymentInstruments('AFTERPAY')[0].getPaymentTransaction().custom.apInitialStatus : null
        };
    } else if (finalPaymentStatus === PAYMENT_STATUS.DECLINED) {
        errorMessage = require('*/cartridge/scripts/util/afterpayErrors').getErrorResponses(responseCode, true);
        Transaction.begin();
        Order.getPaymentInstruments('AFTERPAY')[0].getPaymentTransaction().custom.apInitialStatus = apInitialStatus;
        Transaction.commit();

        Logger.error('Payment has been declined : ' + responseCode);
        return {
            AfterpayOrderErrorMessage: errorMessage,
            error: true
        };
    }

    if (finalPaymentStatus.error) {
        errorMessage = require('*/cartridge/scripts/util/afterpayErrors').getErrorResponses(responseCode, true);
        Transaction.begin();
        Order.getPaymentInstruments('AFTERPAY')[0].getPaymentTransaction().custom.apInitialStatus = apInitialStatus;
        Transaction.commit();

        Logger.error('Error while Authorizing Order : ' + responseCode);
    }

    return {
        AfterpayOrderErrorMessage: errorMessage,
        error: true
    };
}

/*
 * Local methods
 */
exports.Handle = Handle;
exports.Authorise = Authorise;
