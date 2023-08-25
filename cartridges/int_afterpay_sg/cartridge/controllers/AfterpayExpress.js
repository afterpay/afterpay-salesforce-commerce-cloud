'use strict';

/* API Includes */
var URLUtils = require('dw/web/URLUtils');
var Transaction = require('dw/system/Transaction');
var Resource = require('dw/web/Resource');
var Money = require('dw/value/Money');

/* Global variables */
var AfterpayUtilities = require('*/cartridge/scripts/util/afterpayUtilities');
var sitePreferences = AfterpayUtilities.sitePreferencesUtilities;
var apCheckoutUtilities = AfterpayUtilities.checkoutUtilities;
var ctrlCartridgeName = sitePreferences.getControllerCartridgeName();
var afterpayEnabled = sitePreferences.isAfterpayEnabled();
var expressCheckoutEnabled = sitePreferences.isExpressCheckoutEnabled();

/* Script Modules */
var app = require(ctrlCartridgeName + '/cartridge/scripts/app');
var guard = require(ctrlCartridgeName + '/cartridge/scripts/guard');
var LogUtils = require('*/cartridge/scripts/util/afterpayLogUtils');
var Logger = LogUtils.getLogger('AfterpayExpress');
var AfterpaySession = require('*/cartridge/scripts/util/afterpaySession');
var responseUtils = require('*/cartridge/scripts/util/Response');
var apBrandUtilities = AfterpayUtilities.brandUtilities;
var thresholdUtilities = require('*/cartridge/scripts/util/thresholdUtilities');
var brand = apBrandUtilities.getBrand();
var threshold = thresholdUtilities.getThresholdAmounts();
var AfterpayCOHelpers = require('*/cartridge/scripts/checkout/afterpayCheckoutHelpers');
var AfterpaySGCOHelpers = require('*/cartridge/scripts/checkout/afterpaySGCheckoutHelpers');

var AfterpayShippingHelpers = require('~/cartridge/scripts/checkout/afterpayShippingHelpers');

/**
 * Redirects to error display
 * @param {*} error - error to display
 */
function redirectToErrorDisplay(error) {
    var redirectURL = dw.web.URLUtils.https('COBilling-Start', 'afterpay', error);
    app.getView({
        AfterpayRedirectUrl: redirectURL
    }).render('checkout/redirect');
}

/**
* Just using this for debugging
*/
function DebugOrder() {
    var action = request.httpParameterMap.cartAction;
    if (action === 'showsession') {
        var sess = AfterpaySession.debugGetSessionAsString();
        responseUtils.renderJSON({ type: 'DebugOrder', session: sess });
    } else if (action == 'clearsession') {
        AfterpaySession.clearSession();
        responseUtils.renderJSON({ type: 'DebugOrder', status: 'Session cleared' });
    }
}

/**
 * Check the cart and get cart total and whether the cart qualifies for in-store pickup Express Checkout option
 * Needed to detect in-store pickup option when customer changes to/from in-store and the
 * cart.isml does not get a chance to reload
 * Can be used to get updated cart total amount for Afterpay widget if there are ajax calls on
 * Afterpay widget page that can affect the cart totals.
 */
function CartStatus() {
    if (!afterpayEnabled || !expressCheckoutEnabled) {
        responseUtils.renderJSON({});
        return;
    }
    var cart = app.getModel('Cart').get();
    if (!cart) {
        AfterpaySession.clearSession();
        responseUtils.renderJSON({});
        return;
    }

    var afterpayExpressPickupEnabled = AfterpaySGCOHelpers.shouldEnableExpressPickupMode();
    responseUtils.renderJSON({ instorepickup: afterpayExpressPickupEnabled });
}

/**
 * Handles the payment status returned by the Afterpay. Based on the status Order will be submitted .
 */
function CreateToken() {
    if (!afterpayEnabled || !expressCheckoutEnabled) {
        responseUtils.renderJSON({ status: 'FAILURE', error: Resource.msg('expresscheckout.error.disabled', brand, null) });
        return;
    }
    var ShippingMgr = require('dw/order/ShippingMgr');
    // reset all session params if user clicks checkout again
    AfterpaySession.clearSession();

    // Check if we need to add a product to the cart. This is to support the Afterpay Express
    // button on a product details page.
    var action = request.httpParameterMap.cartAction;
    var cart;
    if (action && action.stringValue === 'add') {
        cart = app.getModel('Cart').goc();
        // Note: we are calling addProductToCart the same way it would normally be called from Cart-AddProduct.
        // addProductToCart will read the current request's httpParameterMap, so we just have to make sure we're
        // being called the same way as Cart-AddProduct
        cart.addProductToCart();
    }

    cart = app.getModel('Cart').get();
    if (!cart) {
        AfterpaySession.clearSession();
        responseUtils.renderJSON({ status: 'FAILURE', error: Resource.msg('expresscheckout.error.emptycart', brand, null) });
        return;
    }

    // Get a map of storeId -> store .
    var storeMap = AfterpayCOHelpers.getInStorePickupsMap(cart.object);
    var numHomeDeliveries = AfterpayCOHelpers.getNumHomeDeliveries(cart.object);

    var store = null;
    var expressCheckoutShippingStrategy = sitePreferences.getExpressCheckoutShippingStrategy();

    // Make sure everything is only going to a single store and there are no home deliveries.
    // If so, we use in-store pickup mode for express checkout
    if ((numHomeDeliveries == 0) && (Object.keys(storeMap).length == 1)) {
        Object.keys(storeMap).forEach(function (key) {
            store = storeMap[key];
        });
    } else if ((numHomeDeliveries > 0) && (Object.keys(storeMap).length > 0) && expressCheckoutShippingStrategy == 'integrated') {
        // If there are items going to multiple places, we can't use express checkout
        responseUtils.renderJSON({ status: 'FAILURE', error: Resource.msg('expresscheckout.error.multidestination', brand, null) });
        return;
    } else if (Object.keys(storeMap).length > 1) {
        responseUtils.renderJSON({ status: 'FAILURE', error: Resource.msg('expresscheckout.error.multidestination', brand, null) });
        return;
    }
    // NOTE: We need to check for multi-shipping as well

    var sourceUrl = request.httpParameterMap.s_url.stringValue;

    // merchantnum is currently unused. Just pass in a "x"
    // var merchantOrderNum = Math.random().toString(36).substring(2, 15);
    var merchantOrderNum = 'x';

    // We need to keep track of what we're using with create checkout so we can compute the
    // delta for Afterpay checkout widget later.
    // Note that if we change this, we need to change the request builder as well.
    Transaction.wrap(function () {
        var currentShippingMethod = cart.getDefaultShipment().getShippingMethod() || ShippingMgr.getDefaultShippingMethod();
        cart.updateShipmentShippingMethod(cart.getDefaultShipment().getID(), currentShippingMethod.getID(), null, null);
        cart.calculate();
    });

    // This is the initial amount we will create the checkout with
    // var createCheckoutPrice = cart.object.getAdjustedMerchandizeTotalGrossPrice();
    var createCheckoutPrice = cart.getNonGiftCertificateAmount();
    if (!AfterpayCOHelpers.isPriceWithinThreshold(createCheckoutPrice)) {
        responseUtils.renderJSON({
            status: 'FAILURE',
            error: Resource.msgf('minimum.threshold.message', brand, null, new Money(threshold.minAmount, cart.object.currencyCode), new Money(threshold.maxAmount, cart.object.currencyCode))
        });
        return;
    }

    // Need to pass the amount in as well, not just compute it from the cart.
    var afterPayTokenResponse = require('*/cartridge/scripts/checkout/afterpayExpressGetToken').getExpressToken(cart, createCheckoutPrice, sourceUrl, merchantOrderNum, store);
    if (afterPayTokenResponse.error) {
        responseUtils.renderJSON({ status: 'FAILURE', error: Resource.msg('expresscheckout.error.gettoken', brand, null) });
        return;
    }

    var orderToken = afterPayTokenResponse.apToken;
    if (!orderToken) {
        responseUtils.renderJSON({ status: 'FAILURE', error: Resource.msg('expresscheckout.error.gettoken', brand, null) });
        return;
    }
    AfterpaySession.newSession(orderToken);
    AfterpaySession.setExpressCheckout(true);
    AfterpaySession.setMerchantReference(merchantOrderNum);
    AfterpaySession.setExpressCheckoutAmount(createCheckoutPrice.value);
    AfterpaySession.setExpressCheckoutCurrency(createCheckoutPrice.currencyCode);
    // Store a checksum of the line items into the session. Check this before we do a capture.
    AfterpaySession.setItemsChecksum(AfterpayCOHelpers.computeBasketProductLineItemChecksum(cart.object));

    app.getController('COShipping').PrepareShipments(); // eslint-disable-line

    responseUtils.renderJSON({ status: 'SUCCESS', token: afterPayTokenResponse, merchantRef: merchantOrderNum });
}

/**
 * Most of the logic for computing shipping costs is from COShipping-UpdateShippingMethodList
 */
function GetShippingMethods() {
    if (!afterpayEnabled || !expressCheckoutEnabled) {
        responseUtils.renderJSON([]);
        return;
    }
    var ShippingMgr = require('dw/order/ShippingMgr');
    var method;
    var cart = app.getModel('Cart').get();
    var TransientAddress = app.getModel('TransientAddress');

    if (!cart) {
        Logger.error(Resource.msg('expresscheckout.error.emptycart', brand, null));
        AfterpaySession.clearSession();
        responseUtils.renderJSON([]);
        return;
    }

    if (AfterpaySGCOHelpers.shouldEnableExpressPickupMode(cart)) {
        // if this is a store pickup, just get the store name
        var storeMap = AfterpayCOHelpers.getInStorePickupsMap(cart.object);
        var store = null;
        Object.keys(storeMap).forEach(function (key) {
            store = storeMap[key];
        });
        if (store) {
            // The cart should only have in-store pickup items at this point
            var costs = AfterpayShippingHelpers.calculateCartTaxShipTotals(cart);
            responseUtils.renderJSON([{
                id: store.ID,
                name: store.name,
                description: sitePreferences.getStorePickupDescription(),
                shippingAmount: { amount: costs.shippingCost.value.toString(), currency: costs.shippingCost.currencyCode },
                taxAmount: { amount: costs.tax.value.toString(), currency: costs.tax.currencyCode },
                orderAmount: { amount: costs.totalCost.value.toString(), currency: costs.totalCost.currencyCode }
            }]);
            return;
        }
    }

    var paramMap = request.getHttpParameterMap();
    var reqBody = paramMap.getRequestBodyAsString();
    var addressIn = JSON.parse(reqBody);

    var address = new TransientAddress();
    address.countryCode = addressIn.countryCode || '';
    address.stateCode = addressIn.state || '';
    address.postalCode = addressIn.postcode || '';
    address.city = addressIn.suburb || '';
    address.address1 = addressIn.address1 || '';
    address.address2 = addressIn.address2 || '';

    Logger.debug('GetShippingMethods: for address=' + address.address1 + ' postcode=' + address.postalCode);

    var applicableShippingMethods = cart.getApplicableShippingMethods(address);
    var currentShippingMethod = cart.getDefaultShipment().getShippingMethod() || ShippingMgr.getDefaultShippingMethod();

    var responseMethods = [];

    // Calculates shipping cost by updating each shipping method in the cart
    // and computing shipping and tax before rolling back
    Transaction.begin();

    for (var i = 0; i < applicableShippingMethods.length; i++) {
        method = applicableShippingMethods[i];
        // skip in-store pickup shipping method
        if (!method.custom.storePickupEnabled) {
            // copy in the shipping address to the basket to get tax/shipping rates
            AfterpaySGCOHelpers.addShippingAddressToBasket(cart.object, {
                name: '',
                line1: addressIn.address1 || '',
                line2: addressIn.address2 || '',
                area1: addressIn.suburb || '',
                postcode: addressIn.postcode || '',
                region: addressIn.state || '',
                countryCode: addressIn.countryCode || '',
                phone: ''
            });
            cart.updateShipmentShippingMethod(cart.getDefaultShipment().getID(), method.getID(), null, null);
            cart.calculate();

            // Logic from ordertotals.isml
            var totalCost = cart.object.totalGrossPrice.available ? cart.object.totalGrossPrice : cart.object.getAdjustedMerchandizeTotalPrice(true).add(cart.object.giftCertificateTotalPrice);
            var shipCost = cart.object.getAdjustedShippingTotalPrice();
            var taxAmount = new Money(0.0, cart.object.currencyCode);
            if (dw.order.TaxMgr.getTaxationPolicy() == dw.order.TaxMgr.TAX_POLICY_NET) {
                if (cart.object.totalTax.available) {
                    taxAmount = cart.object.totalTax;
                }
            }
            responseMethods.push({
                id: method.getID(),
                name: method.displayName,
                description: method.description,
                shippingAmount: { amount: shipCost.value.toString(), currency: shipCost.currencyCode },
                taxAmount: { amount: taxAmount.value.toString(), currency: taxAmount.currencyCode },
                orderAmount: { amount: totalCost.value.toString(), currency: totalCost.currencyCode }
            });
        }
    }

    Transaction.rollback();

    Transaction.wrap(function () {
        cart.updateShipmentShippingMethod(cart.getDefaultShipment().getID(), currentShippingMethod.getID(), currentShippingMethod, applicableShippingMethods);
        cart.calculate();
    });

    Logger.debug('All returned shipping options: ' + JSON.stringify(responseMethods));
    responseUtils.renderJSON(responseMethods);
}

/**
 * @param {*} afterPayOrderResponse - response object
 * Deferred Payment Flow
 */
function deferredShippingFlow(afterPayOrderResponse) {
    var cart = app.getModel('Cart').get();
    if (!cart) {
        AfterpaySession.clearSession();
        responseUtils.renderJSON({ type: 'DeferredShippingFlow', error: Resource.msg('expresscheckout.error.emptycart', brand, null) });
        return;
    }
    AfterpaySGCOHelpers.addShippingAddressToBasket(cart.object, afterPayOrderResponse.shipping);
    AfterpaySession.setShippingChecksum(AfterpayCOHelpers.computeBasketShippingChecksum(cart.object));
    AfterpayCOHelpers.addConsumerToBasket(cart.object, afterPayOrderResponse.consumer);

    if (afterPayOrderResponse.billing) {
        AfterpayCOHelpers.addBillingAddressToBasket(cart.object, afterPayOrderResponse.billing);
    } else {
        // Use shipping address for billing if billing is not passed in
        AfterpayCOHelpers.addBillingAddressToBasket(cart.object, afterPayOrderResponse.shipping);
    }
    AfterpayShippingHelpers.calculateCartTaxShipTotals(cart);
    app.getController('COShipping').PrepareShipments(); // eslint-disable-line
    var paymentMethodName = apCheckoutUtilities.getPaymentMethodName();

    // Even though we do not know shipping cost yet, create the payment instrument
    // so billing screens will show Afterpay as the selected billing option.
    // We will change it later as amounts get updated.
    Transaction.wrap(function () {
        cart.calculate();
        // remove everything except gift certs
        AfterpaySGCOHelpers.removeAllNonGiftCertificatePayments(cart);
        cart.object.createPaymentInstrument(paymentMethodName, new Money(0.0, cart.object.currencyCode));
        // will compute the amount for us for the payment instrument
        cart.calculatePaymentTransactionTotal();
    });

    // Prepopulate the billing form with Afterpay payment type
    app.getForm('billing').object.paymentMethods.selectedPaymentMethodID.htmlValue = paymentMethodName;
    app.getForm('billing').object.paymentMethods.selectedPaymentMethodID.value = paymentMethodName;
    AfterpaySession.setExpressCheckoutFinalizeFlow(true);

    response.redirect(URLUtils.url('COShipping-Start'));
    return; // eslint-disable-line no-useless-return
}

/**
 * @param {*} afterPayOrderResponse - response object
 * Integrated Shipping Flow
 */
function integratedShippingFlow(afterPayOrderResponse) {
    var apOrderToken = AfterpaySession.getToken();
    var cart = app.getModel('Cart').get();
    // Shipping option chosen by the consumer
    var selectedShipOption = afterPayOrderResponse.shippingOptionIdentifier;

    if (!cart) {
        AfterpaySession.clearSession();
        responseUtils.renderJSON({ type: 'IntegratedShippingFlow', error: Resource.msg('expresscheckout.error.emptycart', brand, null) });
        return;
    }

    var isStorePickup = false;
    if (AfterpaySGCOHelpers.shouldEnableExpressPickupMode(cart)) {
        isStorePickup = true;
    }

    var adjustCartResponse = false;

    // For in-store pickup, the address will be the address of the store
    AfterpaySGCOHelpers.addShippingAddressToBasket(cart.object, afterPayOrderResponse.shipping);
    AfterpaySession.setShippingChecksum(AfterpayCOHelpers.computeBasketShippingChecksum(cart.object));

    if (!isStorePickup) {
        // Need to compute the cost given the chosen shipping selection
        var shipMethod = AfterpayShippingHelpers.getShippingMethodForID(selectedShipOption);
        if (!shipMethod) {
            Logger.error('Shipping method returned by Afterpay was invalid.');
            redirectToErrorDisplay(Resource.msg('expresscheckout.error.checkout', brand, null));
            return;
        }
        AfterpayShippingHelpers.setCartShippingMethod(cart, shipMethod);
    } else {
        // Should we get the address of the store? Or if it's instore pickup, we will never send
        // Store a checksum of the line items into the session. Check this before we do a capture.
        AfterpaySession.setExpressCheckoutInstorePickup(true);
    }

    var cartTotals = AfterpayShippingHelpers.calculateCartTaxShipTotals(cart);
    AfterpayCOHelpers.addConsumerToBasket(cart.object, afterPayOrderResponse.consumer);

    if (afterPayOrderResponse.billing) {
        AfterpayCOHelpers.addBillingAddressToBasket(cart.object, afterPayOrderResponse.billing);
    } else {
        // Use shipping address for billing if billing is not passed in
        AfterpayCOHelpers.addBillingAddressToBasket(cart.object, afterPayOrderResponse.shipping);
    }
    adjustCartResponse = { totalCost: cartTotals.totalCost };

    var amount = afterPayOrderResponse.amount.amount;
    var currency = afterPayOrderResponse.amount.currency;
    if ((adjustCartResponse.totalCost.value != amount) || (adjustCartResponse.totalCost.currencyCode != currency)) {
        // this can occur if session was modified while express checkout was in flight
        Logger.error('Amount returned by Afterpay did not match expected amount. Afterpay returned=' + amount + currency + ' Merchant computed=' + adjustCartResponse.totalCost.value + adjustCartResponse.totalCost.currencyCode);
        redirectToErrorDisplay(Resource.msg('expresscheckout.error.amountMismatch', brand, null));
        return;
    }

    var buyNow = sitePreferences.isExpressCheckoutBuyNowEnabled();
    if (buyNow) {
        // needed so checkout thinks we're past billing stage
        session.forms.billing.fulfilled.value = true;
        // create the payment transaction with Afterpay for the desired amount
        Transaction.wrap(function () {
            AfterpaySGCOHelpers.removeAllNonGiftCertificatePayments(cart);

            var paymentMethodName = apCheckoutUtilities.getPaymentMethodName();
            cart.object.createPaymentInstrument(paymentMethodName, new Money(amount, currency));
            AfterpaySGCOHelpers.addShippingAddressToBasket(cart.object, afterPayOrderResponse.shipping);
        });

        // puts initial state into paymentTransaction
        require('*/cartridge/scripts/checkout/afterpayUpdatePreapprovalStatus').getPreApprovalResult(cart.object, { status: 'SUCCESS', orderToken: apOrderToken, apExpressCheckout: true });
        var redirectURL = '';
        // go into order placement flow
        try {
            // call entry point for order creation
            var placeOrderResult = app.getController('COPlaceOrder').Start(); // eslint-disable-line
            if (placeOrderResult.order_created) {
                app.getController('COSummary').ShowConfirmation(placeOrderResult.Order); // eslint-disable-line
                return;
            } else if (placeOrderResult.error) {
                var error = !empty(placeOrderResult.afterpayOrderAuthorizeError) ? placeOrderResult.afterpayOrderAuthorizeError : Resource.msg('apierror.flow.default', brand, null);
                redirectURL = dw.web.URLUtils.https('COBilling-Start', 'afterpay', error);
            }
        } catch (e) {
            Logger.error('Exception occured while creating order :' + e);
            // Change error page later
            redirectURL = dw.web.URLUtils.https('COBilling-Start', 'afterpay', Resource.msg('apierror.flow.default', brand, null));
        }
        app.getView({
            AfterpayRedirectUrl: redirectURL
        }).render('checkout/redirect');
    } else {
        // Just copy in billing/shipping info, create Afterpay payment instrument, and go to checkout summary view
        // However, consumer can still modify anything, so will recreate as necessary
        var paymentMethodName = apCheckoutUtilities.getPaymentMethodName();
        Transaction.wrap(function () {
            AfterpaySGCOHelpers.removeAllNonGiftCertificatePayments(cart);

            cart.object.createPaymentInstrument(paymentMethodName, new Money(amount, currency));
            AfterpaySGCOHelpers.addShippingAddressToBasket(cart.object, afterPayOrderResponse.shipping);
        });
        // Prepopulate the billing form with Afterpay payment type
        app.getForm('billing').object.paymentMethods.selectedPaymentMethodID.htmlValue = paymentMethodName;
        app.getForm('billing').object.paymentMethods.selectedPaymentMethodID.value = paymentMethodName;

        AfterpaySession.setExpressCheckoutFinalizeFlow(true);
        // Need this so checkout thinks we've filled in billing info (which we have automatically)
        session.forms.billing.fulfilled.value = true;

        // puts initial state into paymentTransaction
        require('*/cartridge/scripts/checkout/afterpayUpdatePreapprovalStatus').getPreApprovalResult(cart.object, { status: 'SUCCESS', orderToken: apOrderToken, apExpressCheckout: true });

        // redirect to order review
        response.redirect(URLUtils.https('COSummary-Start'));
        return; // eslint-disable-line no-useless-return
    }
}

/* eslint-disable valid-jsdoc */
/**
 * Run by onComplete.
 * for BuyNow, should retrieve order from Afterpay, verify amounts, create order in store, auth/capture, and show confirmation screen
 * for non-BuyNow, should retrieve order from Afterpay, populate cart with as much info as we received from portal, redirect to checkout screen
 * for deferred shipping, should retrieve order from Afterpay, populate cart with as much info as we received from portal, redirect to checkout screen
 */
function PostAfterpayCheckoutFlow() {
    if (!afterpayEnabled) {
        Logger.error('Afterpay not enabled.');
        response.redirect(URLUtils.https('Cart-Show'));
        return;
    } else if (!expressCheckoutEnabled) {
        Logger.error('Afterpay Express Checkout not enabled.');
        response.redirect(URLUtils.https('Cart-Show'));
        return;
    }
    var cart = app.getModel('Cart').get();
    if (!cart) {
        Logger.error('Cart is empty.');
        response.redirect(URLUtils.https('Cart-Show'));
        return;
    }

    var apOrderToken = AfterpaySession.getToken();

    if (!apOrderToken) {
        AfterpaySession.clearSession();
        Logger.error('Missing token from session.');
        redirectToErrorDisplay(Resource.msg('expresscheckout.error.invalidsession', brand, null));
        return;
    }

    // retrieve the order from Afterpay using api
    var afterPayOrderResponse = require('*/cartridge/scripts/checkout/afterpayGetOrder').GetOrder(apOrderToken); // eslint-disable-line
    if (afterPayOrderResponse.error) {
        // responseUtils.renderJSON({ type: 'ProcessOrder', error: afterPayOrderResponse.errorMessage });
        Logger.error(afterPayOrderResponse.errorMessage);
        redirectToErrorDisplay(afterPayOrderResponse.errorMessage);
        return;
    }

    // Make sure the merchant reference returned by Afterpay is the same as what we stored in session during CreateToken
    // if (merchantOrderNum != afterPayOrderResponse.merchantReference) {
    //    redirectToErrorDisplay(Resource.msg('expresscheckout.error.checkout', brand, null));
    //    return;
    // }

    // billing is not always returned
    // if (! afterPayOrderResponse.consumer || ! afterPayOrderResponse.billing || ! afterPayOrderResponse.shipping) {
    if (!afterPayOrderResponse.consumer || !afterPayOrderResponse.shipping) {
        Logger.error('Missing data from Afterpay Get Order.');
        redirectToErrorDisplay(Resource.msg('expresscheckout.error.checkout', brand, null));
        return;
    }

    var expressCheckoutShippingStrategy = sitePreferences.getExpressCheckoutShippingStrategy();
    app.getController('COShipping').PrepareShipments(); // eslint-disable-line

    // If this is deferred shipping, just call DeferredFlow()
    if (expressCheckoutShippingStrategy == 'deferred') {
        return deferredShippingFlow(afterPayOrderResponse); // eslint-disable-line
    }

    return integratedShippingFlow(afterPayOrderResponse); // eslint-disable-line
}
/* eslint-enable valid-jsdoc */

/**
 * Continue to finalize
 */
function ContinueFinalize() {
    if (!afterpayEnabled || !expressCheckoutEnabled || !AfterpaySession.isExpressCheckoutFinalizeFlow()) {
        response.redirect(URLUtils.https('Cart-Show'));
        return;
    }

    // Check if we need to add a product to the cart. This is to support the Afterpay Express Checkout
    // button on a product details page (during the Express Checkout finalize flow)
    var action = request.httpParameterMap.cartAction;
    var cart;
    if (action && action.stringValue === 'add') {
        cart = app.getModel('Cart').goc();
        // Note: we are calling addProductToCart the same way it would normally be called from Cart-AddProduct.
        // addProductToCart will read the current request's httpParameterMap, so we just have to make sure we're
        // being called the same way as Cart-AddProduct
        cart.addProductToCart();
    }

    cart = app.getModel('Cart').get();
    if (!cart) {
        AfterpaySession.clearSession();
        responseUtils.renderJSON({ type: 'ContinueFinalize', error: Resource.msg('expresscheckout.error.emptycart', brand, null) });
        return;
    }

    // The cart may have changed so need to call this before calculating the total payment.
    app.getController('COShipping').PrepareShipments(); // eslint-disable-line

    var paymentMethodName = apCheckoutUtilities.getPaymentMethodName();
    Transaction.wrap(function () {
        AfterpaySGCOHelpers.removeAllNonGiftCertificatePayments(cart);
        cart.object.createPaymentInstrument(paymentMethodName, new Money(0.0, cart.object.currencyCode));
        cart.calculatePaymentTransactionTotal();
    });
    // Prepopulate the billing form with Afterpay payment type
    app.getForm('billing').object.paymentMethods.selectedPaymentMethodID.htmlValue = paymentMethodName;
    app.getForm('billing').object.paymentMethods.selectedPaymentMethodID.value = paymentMethodName;
    session.forms.billing.fulfilled.value = true;

    // redirect to order review
    response.redirect(URLUtils.https('COSummary-Start'));
    return; // eslint-disable-line no-useless-return
}

/**
 * This is called for deferred shipping and integrated shipping with no Buy-Now option.
 * It handles the final "Place order with Afterpay" button.
 *
 * Basically, we need to capture with the widget checksum and the
 * diff amount from the original checkout. This means we need to create a
 * payment transaction with those included as tags, so that
 * the capturing logic has that
 */
function FinalizeOrder() {
    if (!afterpayEnabled || !expressCheckoutEnabled) {
        response.redirect(URLUtils.https('Cart-Show'));
        return;
    }
    var cart = app.getModel('Cart').get();
    if (!cart) {
        response.redirect(URLUtils.https('Cart-Show'));
        return;
    }

    if (!AfterpaySession.isExpressCheckoutFinalizeFlow()) {
        // This should only be run during a express checkout finalize flow.
        // session may have timed out
        AfterpaySession.clearSession();
        redirectToErrorDisplay(Resource.msg('expresscheckout.error.notfinalizeflow', brand, null));
        return;
    }

    var redirectURL;

    var apOrderToken = AfterpaySession.getToken();

    var parameterMap = request.getHttpParameterMap();
    var widgetChecksum = parameterMap.checksum.stringValue;

    // run PrepareShipments again in case cart has changed
    app.getController('COShipping').PrepareShipments(); // eslint-disable-line

    Transaction.wrap(function () {
        AfterpaySGCOHelpers.removeAllNonGiftCertificatePayments(cart);
        var paymentMethodName = apCheckoutUtilities.getPaymentMethodName();
        cart.object.createPaymentInstrument(paymentMethodName, new Money(0.0, cart.object.currencyCode));
        // will compute the amount for us for the payment instrument
        cart.calculatePaymentTransactionTotal();
    });

    // needed so checkout thinks we're past billing stage
    session.forms.billing.fulfilled.value = true;
    require('*/cartridge/scripts/checkout/afterpayUpdatePreapprovalStatus').getPreApprovalResult(cart.object, {
        status: 'SUCCESS',
        orderToken: apOrderToken,
        apExpressCheckout: true,
        apExpressCheckoutChecksum: widgetChecksum
    });

    // go into order placement flow
    try {
        var placeOrderResult = app.getController('COPlaceOrder').Start(); // eslint-disable-line
        if (placeOrderResult.order_created) {
            app.getController('COSummary').ShowConfirmation(placeOrderResult.Order); // eslint-disable-line
            return;
        } else if (placeOrderResult.error) {
            var error = !empty(placeOrderResult.afterpayOrderAuthorizeError) ? placeOrderResult.afterpayOrderAuthorizeError : Resource.msg('apierror.flow.default', brand, null);
            redirectURL = dw.web.URLUtils.https('COBilling-Start', 'afterpay', error);
        }
    } catch (e) {
        Logger.error('Exception occured while creating order :' + e);
        // Change error page later
        redirectURL = dw.web.URLUtils.https('AfterpayExpress-CancelOrder', 'error', JSON.stringify(e));
    }
    app.getView({
        AfterpayRedirectUrl: redirectURL
    }).render('checkout/redirect');
}

/**
 * Cancel Order
 */
function CancelOrder() {
    var apOrderToken = AfterpaySession.getToken();
    AfterpaySession.clearSession();

    Logger.debug('Order canceled. apOrderToken=' + apOrderToken);
    response.redirect(URLUtils.https('Cart-Show'));
}

/**
 * Widget Error
 */
function WidgetError() {
    var error = request.httpParameterMap.error || '';
    AfterpaySession.clearSession();
    redirectToErrorDisplay(error);
}

/*
* Calls Afterpay's "create checkout" and species "express checkout" mode
*/
exports.CreateToken = guard.ensure(['https'], CreateToken);
/*
* Called by the onCommenceCheckout() handler in the express checkout popup
* so merchant site can pass shipping options and prices (shipping/tax/total)
*/
exports.GetShippingMethods = guard.ensure(['https'], GetShippingMethods);

/*
* Called by onComplete() handler in the express checkout popup.
*/
exports.PostAfterpayCheckoutFlow = guard.ensure(['https'], PostAfterpayCheckoutFlow);

/*
* Cancels the current order. Removes express checkout related session state
*/
exports.CancelOrder = guard.ensure(['https'], CancelOrder);
/*
* When the consumer is in the Afterpay Express finalization steps, use ContinueFinalize
* for the checkout buttons to get straight to the summary page.
*/
exports.ContinueFinalize = guard.ensure(['https'], ContinueFinalize);
/*
* When the consumer is in the Afterpay Express finalization steps, use FinalizeOrder
* to start the order creation process and payment process.
*/
exports.FinalizeOrder = guard.ensure(['https'], FinalizeOrder);
/*
* Webservice that checks cart and returns flag indicating whether the
* cart qualifies for in-store-pickup
*/
exports.CartStatus = guard.ensure(['https'], CartStatus);
/*
* Called specifically by the Afterpay Widget when isValid==false
*/
exports.WidgetError = guard.ensure(['https'], WidgetError);
// Just for debugging.
exports.DebugOrder = guard.ensure(['https'], DebugOrder);
