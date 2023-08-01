'use strict';

/* API Includes */
var URLUtils = require('dw/web/URLUtils');
var Resource = require('dw/web/Resource');

/* Global variables */
var AfterpayUtilities = require('*/cartridge/scripts/util/afterpayUtilities');
var sitePreferences = AfterpayUtilities.sitePreferencesUtilities;
var AfterpaySession = require('*/cartridge/scripts/util/afterpaySession');
var AfterpayCOHelpers = require('*/cartridge/scripts/checkout/afterpayCheckoutHelpers');
var PAYMENT_STATUS = require('*/cartridge/scripts/util/afterpayConstants').PAYMENT_STATUS;

/* Script Modules */
var ctrlCartridgeName = sitePreferences.getControllerCartridgeName();
var app = require(ctrlCartridgeName + '/cartridge/scripts/app');
var guard = require(ctrlCartridgeName + '/cartridge/scripts/guard');
var COPlaceOrder = require('*/cartridge/controllers/COPlaceOrder');
var COSummary = require('*/cartridge/controllers/COSummary');
var Cart = app.getModel('Cart');
var LogUtils = require('*/cartridge/scripts/util/afterpayLogUtils');
var Logger = LogUtils.getLogger('CashApp');

/**
 * Handles the payment status returned by the Afterpay. Based on the status Order will be submitted .
 */
function HandleResponse() {
    var cart;
    var paymentStatus;
    var redirectURL;
    var PreapprovalResult;
    var placeOrderResult;
    var basketValid = false;

    cart = Cart.get();

    paymentStatus = request.httpParameterMap.status.getStringValue();
    var itemsChecksum = AfterpayCOHelpers.computeBasketProductLineItemChecksum(cart.object);
    if (AfterpaySession.isValid()) {
        if (itemsChecksum == AfterpaySession.getItemsChecksum()) {
            basketValid = true;
        }
        AfterpaySession.clearSession();
    }

    if (basketValid) {
        if (paymentStatus === PAYMENT_STATUS.SUCCESS) {
            var orderTokenString = request.httpParameterMap.orderToken.getStringValue();
            PreapprovalResult = require('*/cartridge/scripts/checkout/afterpayUpdatePreapprovalStatus').getPreApprovalResult(cart.object, {
                status: paymentStatus,
                orderToken: orderTokenString,
                isCashAppPay: 'true'
            });

            if (PreapprovalResult.error) {
                redirectURL = URLUtils.https('COBilling-Start', 'afterpay', Resource.msg('apierror.flow.default', session.privacy.afterpayBrand, null));
            } else {
                try {
                    placeOrderResult = COPlaceOrder.Start(); // eslint-disable-line
                    Logger.debug('PlaceOrder status :' + JSON.stringify(placeOrderResult));

                    if (placeOrderResult.order_created) {
                        COSummary.ShowConfirmation(placeOrderResult.Order); // eslint-disable-line
                    } else if (placeOrderResult.error) {
                        var error = !empty(placeOrderResult.afterpayOrderAuthorizeError) ? placeOrderResult.afterpayOrderAuthorizeError : Resource.msg('apierror.flow.default', session.privacy.afterpayBrand, null);
                        redirectURL = URLUtils.https('COBilling-Start', 'afterpay', error);
                    }
                } catch (e) {
                    Logger.error('Exception occured while creating order :' + e);
                    redirectURL = URLUtils.https('COBilling-Start', 'afterpay', Resource.msg('apierror.flow.default', session.privacy.afterpayBrand, null));
                }
            }
        } else if (paymentStatus === PAYMENT_STATUS.CANCELLED) {
            redirectURL = URLUtils.https('COBilling-Start', 'afterpay', Resource.msg('afterpay.api.cancelled', session.privacy.afterpayBrand, null));
        } else if (paymentStatus === PAYMENT_STATUS.DECLINED) {
            redirectURL = URLUtils.https('COBilling-Start', 'afterpay', Resource.msg('afterpay.api.declined', session.privacy.afterpayBrand, null));
        } else {
            redirectURL = URLUtils.https('COBilling-Start', 'afterpay', Resource.msg('apierror.flow.default', session.privacy.afterpayBrand, null));
        }
    } else {
        redirectURL = URLUtils.https('COBilling-Start', 'afterpay', Resource.msg('cashapppay.error.missmatch', session.privacy.afterpayBrand, null));
    }

    if (!empty(redirectURL)) {
        app.getView({
            AfterpayRedirectUrl: redirectURL
        }).render('checkout/redirect');
    }
}
/**
* Handle Cash App response
*/
function HandleMobileResponse() {
    var cashRequestId = request.httpParameterMap.cash_request_id.getStringValue();
    if (!empty(cashRequestId)) {
        app.getView().render('checkout/cashAppMobile');
    } else {
        var redirectURL = URLUtils.https('COBilling-Start', 'afterpay', Resource.msg('cashapppay.error.missmatch', session.privacy.afterpayBrand, null));
        app.getView({
            AfterpayRedirectUrl: redirectURL
        }).render('checkout/redirect');
    }
}

/**
* Web exposed methods
*/
/** Payment status handling.
 * @see module:controllers/AfterpayRedirect~Confirm */
exports.HandleResponse = guard.ensure(['https'], HandleResponse);
exports.HandleMobileResponse = guard.ensure(['https'], HandleMobileResponse);
