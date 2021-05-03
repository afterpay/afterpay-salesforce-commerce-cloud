'use strict';
/* global empty, request */

/**
 * Controller to handle the response from Afterpay
 *
 * @module controllers/AfterpayRedirect
 */

/* API Includes */
var Resource = require('dw/web/Resource');
var URLUtils = require('dw/web/URLUtils');

/* Global variables */
var sitePreferences = require('*/cartridge/scripts/util/afterpayUtilities.js').getSitePreferencesUtilities();
var ctrlCartridgeName = sitePreferences.getControllerCartridgeName();

/* Script Modules */
var app = require(ctrlCartridgeName + '/cartridge/scripts/app');
var guard = require(ctrlCartridgeName + '/cartridge/scripts/guard');
var Cart = app.getModel('Cart');
var LogUtils = require('*/cartridge/scripts/util/afterpayLogUtils');
var Logger = LogUtils.getLogger('AfterpayRedirect');

/**
 * Handles the payment status returned by the Afterpay. Based on the status Order will be submitted .
 */
function HandleResponse() {
    var afterpayPaymentInstrument;
    var paymentInstrument;
    var cart;
    var iter;
    var paymentStatus;
    var redirectURL;
    var PreapprovalResult;
    var placeOrderResult;
    var productExists;

    cart = Cart.get();
    iter = cart.object.getPaymentInstruments().iterator();

    while (iter.hasNext()) {
        afterpayPaymentInstrument = iter.next();

        if (afterpayPaymentInstrument.paymentMethod === 'AFTERPAY_PBI') {
            paymentInstrument = afterpayPaymentInstrument;
        }
    }

    paymentStatus = request.httpParameterMap.status.getStringValue();

    if (paymentStatus === 'SUCCESS') {
        productExists = require('*/cartridge/scripts/checkout/afterpayTokenConflict').checkTokenConflict(cart.object, request.httpParameterMap.orderToken.getStringValue());
        PreapprovalResult = require('*/cartridge/scripts/checkout/afterpayUpdatePreapprovalStatus').getPreApprovalResult(cart.object, request.httpParameterMap);

        if (!productExists) {
            if (productExists.error) {
                redirectURL = URLUtils.https('COBilling-Start', 'afterpay', Resource.msg('apierror.flow.default', 'afterpay', null));
            }

            redirectURL = URLUtils.https('COBilling-Start', 'afterpay', Resource.msg('apierror.token.conflict', 'afterpay', null));
        } else if (PreapprovalResult.error) {
            redirectURL = URLUtils.https('COBilling-Start', 'afterpay', Resource.msg('apierror.flow.default', 'afterpay', null));
        } else {
            try {
                placeOrderResult = app.getController('COPlaceOrder').Start(); // eslint-disable-line
                Logger.debug('PlaceOrder status :' + JSON.stringify(placeOrderResult));

                if (placeOrderResult.order_created) {
                    app.getController('COSummary').ShowConfirmation(placeOrderResult.Order); // eslint-disable-line
                } else if (placeOrderResult.error) {
                    var error = !empty(placeOrderResult.afterpayOrderAuthorizeError) ? placeOrderResult.afterpayOrderAuthorizeError : Resource.msg('apierror.flow.default', 'afterpay', null);
                    redirectURL = URLUtils.https('COBilling-Start', 'afterpay', error);
                }
            } catch (e) {
                Logger.error('Exception occured while creating order :' + e);
                redirectURL = URLUtils.https('COBilling-Start', 'afterpay', Resource.msg('apierror.flow.default', 'afterpay', null));
            }
        }
    } else if (paymentStatus === 'CANCELLED') {
        redirectURL = URLUtils.https('COBilling-Start', 'afterpay', Resource.msg('afterpay.api.cancelled', 'afterpay', null));
    } else if (paymentInstrument.getPaymentTransaction().custom.apToken !== request.httpParameterMap.orderToken.stringValue) {
        redirectURL = URLUtils.https('COBilling-Start', 'afterpay', Resource.msg('apierror.flow.default', 'afterpay', null));
    } else {
        redirectURL = URLUtils.https('COBilling-Start', 'afterpay', Resource.msg('apierror.flow.default', 'afterpay', null));
    }

    if (!empty(redirectURL)) {
        Logger.debug('AfterpayRedirectUrl: ' + redirectURL);

        app.getView({
            AfterpayRedirectUrl: redirectURL
        }).render('checkout/redirect');
    }
}

/*
* Web exposed methods
*/

/** Payment status handling.
 * @see module:controllers/AfterpayRedirect~Confirm */
exports.HandleResponse = guard.ensure(['https'], HandleResponse);
