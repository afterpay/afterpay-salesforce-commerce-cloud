'use strict';

var server = require('server');
var parsePrice = require('~/cartridge/scripts/util/parsePriceAfterpay.js');
var URLUtils = require('dw/web/URLUtils');
var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
var AfterpayCOHelpers = require('*/cartridge/scripts/checkout/afterpayCheckoutHelpers');
var AfterpayRefArchCOHelpers = require('~/cartridge/scripts/checkout/afterpayRefArchCheckoutHelpers');
var Resource = require('dw/web/Resource');
var AfterpaySession = require('*/cartridge/scripts/util/afterpaySession');
var ValidationHelpers = require('*/cartridge/scripts/helpers/basketValidationHelpers');
var BasketMgr = require('dw/order/BasketMgr');
var LogUtils = require('*/cartridge/scripts/util/afterpayLogUtils');
var Logger = LogUtils.getLogger('AfterpayExpress');
var AfterpayShippingHelpers = require('*/cartridge/scripts/checkout/afterpayShippingHelpers');
var OrderMgr = require('dw/order/OrderMgr');
var Order = require('dw/order/Order');
var Money = require('dw/value/Money');
var Transaction = require('dw/system/Transaction');
var apUtilities = require('*/cartridge/scripts/util/afterpayUtilities');
var thresholdUtilities = require('*/cartridge/scripts/util/thresholdUtilities');
var sitePreferences = apUtilities.sitePreferencesUtilities;
var afterpayEnabled = sitePreferences.isAfterpayEnabled();
var expressCheckoutEnabled = sitePreferences.isExpressCheckoutEnabled();

/**
 * on error redirects to the cart page
 * @param {Object} res - response
 * @param {Object} next - next
 * @param {Object} err - error
 * @returns {Object} - next
 */
function returnJsonError(res, next, err) {
    res.json({
        status: 'FAILURE',
        error: err,
        redirectUrl: URLUtils.url('Cart-Show').toString()
    });
    return next();
}

/**
 * on error redirects to the checkout page
 * @param {Object} res - response
 * @param {Object} error - error
 */
function redirectToErrorDisplay(res, error) {
    AfterpaySession.clearSession();
    res.redirect(URLUtils.url('Checkout-Begin', 'stage', 'payment', 'afterpayErrorMessage', error));
}

/**
 * Deferred Flow
 * @param {Object} req - request
 * @param {Object} res - response
 * @param {Object} next - next
 * @param {Object} afterPayOrderResponse - Afterpay Order Response
 * @returns {Object} - next
 */
function deferredShippingFlow(req, res, next, afterPayOrderResponse) {
    var currentBasket = BasketMgr.getCurrentBasket();

    AfterpayRefArchCOHelpers.addShippingAddressToBasket(currentBasket, afterPayOrderResponse.shipping);
    AfterpaySession.setShippingChecksum(AfterpayCOHelpers.computeBasketShippingChecksum(currentBasket));
    AfterpayCOHelpers.addConsumerToBasket(currentBasket, afterPayOrderResponse.consumer);
    if (afterPayOrderResponse.billing) {
        AfterpayCOHelpers.addBillingAddressToBasket(currentBasket, afterPayOrderResponse.billing);
    } else {
        // Use shipping address for billing if billing is not passed in
        AfterpayCOHelpers.addBillingAddressToBasket(currentBasket, afterPayOrderResponse.shipping);
    }

    // Recreate the payment instrument in case session changed
    Transaction.wrap(function () {
        AfterpayRefArchCOHelpers.removeAllNonGiftCertificatePayments(currentBasket);
        var apCheckoutUtilities = apUtilities.checkoutUtilities;
        var paymentMethodName = apCheckoutUtilities.getPaymentMethodName();
        currentBasket.createPaymentInstrument(paymentMethodName, new Money(0.0, currentBasket.currencyCode));
    });

    AfterpayRefArchCOHelpers.calculateAndSetPaymentAmount(currentBasket);
    AfterpaySession.setExpressCheckoutFinalizeFlow(true);
    res.redirect(URLUtils.url('Checkout-Begin', 'stage', 'shipping'));
    return next();
}

/**
 * Itegrated Flow
 * @param {Object} req - request
 * @param {Object} res - response
 * @param {Object} next - next
 * @param {Object} afterPayOrderResponse - Afterpay Order Response
 * @returns {Object} - next
 */
function integratedShippingFlow(req, res, next, afterPayOrderResponse) {
    var currentBasket = BasketMgr.getCurrentBasket();

    var apOrderToken = AfterpaySession.getToken();
    // Shipping option chosen by the consumer
    var selectedShipOption = afterPayOrderResponse.shippingOptionIdentifier;

    var isStorePickup = false;
    if (AfterpayRefArchCOHelpers.shouldEnableExpressPickupMode(currentBasket)) {
        isStorePickup = true;
    }

    // For in-store pickup, the address will be the address of the store
    AfterpayRefArchCOHelpers.addShippingAddressToBasket(currentBasket, afterPayOrderResponse.shipping);
    AfterpaySession.setShippingChecksum(AfterpayCOHelpers.computeBasketShippingChecksum(currentBasket));

    if (!isStorePickup) {
        // Need to compute the cost given the chosen shipping selection
        var shipMethod = AfterpayShippingHelpers.getShippingMethodForID(selectedShipOption);
        if (!shipMethod) {
            Logger.error('Shipping method returned by Afterpay was invalid.');
            redirectToErrorDisplay(res, Resource.msg('expresscheckout.error.checkout', 'afterpay', null));
            return next();
        }
        AfterpayShippingHelpers.setBasketShippingMethod(currentBasket, shipMethod.ID);
    } else {
        // Should we get the address of the store? Or if it's instore pickup, we will never send
        // Store a checksum of the line items into the session. Check this before we do a capture.
        AfterpaySession.setExpressCheckoutInstorePickup(true);
    }
    var cartTotals = AfterpayShippingHelpers.calculateBasketTaxShipTotals(req, currentBasket);
    AfterpayCOHelpers.addConsumerToBasket(currentBasket, afterPayOrderResponse.consumer);

    if (afterPayOrderResponse.billing) {
        AfterpayCOHelpers.addBillingAddressToBasket(currentBasket, afterPayOrderResponse.billing);
    } else {
        // Use shipping address for billing if billing is not passed in
        AfterpayCOHelpers.addBillingAddressToBasket(currentBasket, afterPayOrderResponse.shipping);
    }
    var adjustCartResponse = { totalCost: cartTotals.totalCost };

    var amount = afterPayOrderResponse.amount.amount;
    var currency = afterPayOrderResponse.amount.currency;
    if ((adjustCartResponse.totalCost.value != amount) || (adjustCartResponse.totalCost.currencyCode != currency)) {
        // this can occur if session was modified while express checkout was in flight
        Logger.error('Amount returned by Afterpay did not match expected amount. Afterpay returned=' + amount + currency + ' Merchant computed=' + adjustCartResponse.totalCost.value + adjustCartResponse.totalCost.currencyCode);
        redirectToErrorDisplay(res, Resource.msg('expresscheckout.error.amountMismatch', 'afterpay', null));
        return next();
    }

    var buyNow = sitePreferences.isExpressCheckoutBuyNowEnabled();
    if (buyNow) {
        // create the payment transaction with Afterpay for the desired amount
        Transaction.wrap(function () {
            AfterpayRefArchCOHelpers.removeAllNonGiftCertificatePayments(currentBasket);
            var apCheckoutUtilities = apUtilities.checkoutUtilities;
            var paymentMethodName = apCheckoutUtilities.getPaymentMethodName();
            currentBasket.createPaymentInstrument(paymentMethodName, new Money(amount, currency));
            AfterpayRefArchCOHelpers.addShippingAddressToBasket(currentBasket, afterPayOrderResponse.shipping);
        });
        // puts initial state into paymentTransaction
        require('*/cartridge/scripts/checkout/afterpayUpdatePreapprovalStatus').getPreApprovalResult(currentBasket, {
            status: 'SUCCESS', orderToken: apOrderToken, apExpressCheckout: true
        });

        // Place the order
        // This logic is similar to AfterpayRedirect-HandleResponse, which is what gets called after Afterpay redirect flow returns to site
        var order = COHelpers.createOrder(currentBasket);
        // auth/capture payment
        var paymentStatusUpdated = require('*/cartridge/scripts/checkout/updatePaymentStatus').handlePaymentStatus(order);
        if (paymentStatusUpdated.authorized) {
            Transaction.begin();
            var orderPlacementStatus = OrderMgr.placeOrder(order);
            Transaction.commit();
            if (!orderPlacementStatus.error) {
                Transaction.begin();
                order.setConfirmationStatus(Order.CONFIRMATION_STATUS_CONFIRMED);
                order.setExportStatus(Order.EXPORT_STATUS_READY);
                Transaction.commit();
                res.render('checkout/confirmOrder', {
                    orderID: order.orderNo,
                    orderToken: order.orderToken,
                    continueUrl: URLUtils.url('Order-Confirm').toString()
                });
            } else {
                Transaction.wrap(function () {
                    OrderMgr.failOrder(order, false);
                });
                res.redirect(URLUtils.url('Checkout-Begin', 'stage', 'payment', 'afterpayErrorMessage', Resource.msg('order.submission.error', 'afterpay', null)));
            }
        } else {
            Transaction.wrap(function () {
                OrderMgr.failOrder(order);
            });
            res.redirect(URLUtils.url('Checkout-Begin', 'stage', 'payment', 'afterpayErrorMessage', paymentStatusUpdated.AfterpayOrderErrorMessage ? paymentStatusUpdated.AfterpayOrderErrorMessage : Resource.msg('apierror.flow.default', 'afterpay', null)));
        }
        return next();
    }
    Transaction.wrap(function () {
        AfterpayRefArchCOHelpers.removeAllNonGiftCertificatePayments(currentBasket);
        var apCheckoutUtilities = apUtilities.checkoutUtilities;
        var paymentMethodName = apCheckoutUtilities.getPaymentMethodName();
        currentBasket.createPaymentInstrument(paymentMethodName, new Money(amount, currency));
        AfterpayRefArchCOHelpers.addShippingAddressToBasket(currentBasket, afterPayOrderResponse.shipping);
    });
    AfterpaySession.setExpressCheckoutFinalizeFlow(true);
    // puts initial state into paymentTransaction
    require('*/cartridge/scripts/checkout/afterpayUpdatePreapprovalStatus').getPreApprovalResult(currentBasket, {
        status: 'SUCCESS', orderToken: apOrderToken, apExpressCheckout: true
    });
    res.redirect(URLUtils.url('Checkout-Begin', 'stage', 'placeOrder'));
    return next();
}

server.get('ContinueFinalize', server.middleware.https, function (req, res, next) {
    if (!afterpayEnabled || !expressCheckoutEnabled || !AfterpaySession.isExpressCheckoutFinalizeFlow()) {
        res.redirect(URLUtils.url('Cart-Show'));
        return next();
    }
    var currentBasket = BasketMgr.getCurrentBasket();
    if (!currentBasket || currentBasket.allLineItems.length === 0) {
        res.redirect(URLUtils.url('Cart-Show'));
        return next();
    }
    Transaction.wrap(function () {
        AfterpayRefArchCOHelpers.removeAllNonGiftCertificatePayments(currentBasket);
        var apCheckoutUtilities = apUtilities.checkoutUtilities;
        var paymentMethodName = apCheckoutUtilities.getPaymentMethodName();
        currentBasket.createPaymentInstrument(paymentMethodName, new Money(0.0, currentBasket.currencyCode));
    });
    // This does a recalculation using the current basket
    AfterpayRefArchCOHelpers.calculateAndSetPaymentAmount(currentBasket);
    var payAmt = AfterpayCOHelpers.getCurrentAfterpayPaymentAmount(currentBasket);
    if (!AfterpayCOHelpers.isPriceWithinThreshold(payAmt)) {
        var threshold = thresholdUtilities.getThresholdAmounts();
        redirectToErrorDisplay(res, Resource.msgf('minimum.threshold.message', 'afterpay', null, new Money(threshold.minAmount, currentBasket.currencyCode), new Money(sitePreferences.maxAmount, currentBasket.currencyCode)));
        return next();
    }

    res.redirect(URLUtils.url('Checkout-Begin', 'stage', 'placeOrder'));
    return next();
});

server.get('FinalizeOrder', server.middleware.https, function (req, res, next) {
    var widgetChecksum = req.querystring.checksum;

    var currentBasket = BasketMgr.getCurrentBasket();
    if (!currentBasket || currentBasket.allLineItems.length === 0) {
        redirectToErrorDisplay(res, Resource.msg('expresscheckout.error.emptycart', 'afterpay', null));
        return next();
    }
    if (!AfterpaySession.isExpressCheckoutFinalizeFlow()) {
        // This should only be run during a express checkout finalize flow.
        // session may have timed out
        AfterpaySession.clearSession();
        // Can we call the old checkout here?
        redirectToErrorDisplay(res, Resource.msg('expresscheckout.error.notfinalizeflow', 'afterpay', null));
        return next();
    }
    var apOrderToken = AfterpaySession.getToken();

    if (!widgetChecksum) {
        redirectToErrorDisplay(res, Resource.msg('expresscheckout.error.missingchecksum', 'afterpay', null));
        return next();
    }
    // Get logic from CheckoutServices-PlaceOrder . can't call it directly due to widgetchecksum stuff

    // Recreate the payment instrument in case session changed
    Transaction.wrap(function () {
        AfterpayRefArchCOHelpers.removeAllNonGiftCertificatePayments(currentBasket);
        var apCheckoutUtilities = apUtilities.checkoutUtilities;
        var paymentMethodName = apCheckoutUtilities.getPaymentMethodName();
        currentBasket.createPaymentInstrument(paymentMethodName, new Money(0.0, currentBasket.currencyCode));
    });
    AfterpayRefArchCOHelpers.calculateAndSetPaymentAmount(currentBasket);

    // Re-calculate the payments.
    var calculatedPaymentTransaction = COHelpers.calculatePaymentTransaction(
        currentBasket
    );
    if (calculatedPaymentTransaction.error) {
        redirectToErrorDisplay(res, Resource.msg('error.technical', 'checkout', null));
        return next();
    }

    require('*/cartridge/scripts/checkout/afterpayUpdatePreapprovalStatus').getPreApprovalResult(currentBasket, {
        status: 'SUCCESS',
        orderToken: apOrderToken,
        apExpressCheckout: true,
        apExpressCheckoutChecksum: widgetChecksum
    });

    // Place order and show confirmation. What's the best way? Can we return to checkout.isml? Or probably just directly

    // This logic is similar to AfterpayRedirect-HandleResponse, which is what gets called after Afterpay redirect flow returns to site
    var order = COHelpers.createOrder(currentBasket);
    // auth/capture payment
    var paymentStatusUpdated = require('*/cartridge/scripts/checkout/updatePaymentStatus').handlePaymentStatus(order);
    if (paymentStatusUpdated.authorized) {
        Transaction.begin();
        var orderPlacementStatus = OrderMgr.placeOrder(order);
        Transaction.commit();
        if (!orderPlacementStatus.error) {
            Transaction.begin();
            order.setConfirmationStatus(Order.CONFIRMATION_STATUS_CONFIRMED);
            order.setExportStatus(Order.EXPORT_STATUS_READY);
            Transaction.commit();
            res.render('checkout/confirmOrder', {
                orderID: order.orderNo,
                orderToken: order.orderToken,
                continueUrl: URLUtils.url('Order-Confirm').toString()
            });
        } else {
            Transaction.wrap(function () {
                OrderMgr.failOrder(order, false);
            });
            res.redirect(URLUtils.url('Checkout-Begin', 'stage', 'payment', 'afterpayErrorMessage', Resource.msg('order.submission.error', 'afterpay', null)));
        }
    } else {
        Transaction.wrap(function () {
            OrderMgr.failOrder(order);
        });
        res.redirect(URLUtils.url('Checkout-Begin', 'stage', 'payment', 'afterpayErrorMessage', paymentStatusUpdated.AfterpayOrderErrorMessage ? paymentStatusUpdated.AfterpayOrderErrorMessage : Resource.msg('apierror.flow.default', 'afterpay', null)));
    }
    AfterpaySession.clearSession();
    return next();
});

server.get('WidgetError', server.middleware.https, function (req, res, next) {
    AfterpaySession.clearSession();
    var error = req.querystring.error || '';
    redirectToErrorDisplay(res, error);
    return next();
});

/**
 * Called by Express Checkout widget when onComplete() is called with a fail status.
 * Also called by the widget when token creation fails.
 */
server.get('CancelOrder', server.middleware.https, function (req, res, next) {
    AfterpaySession.clearSession();
    if (req.querystring.afterpayerror) {
        res.redirect(URLUtils.url('Cart-Show', 'afterpayerror', req.querystring.afterpayerror));
    } else {
        res.redirect(URLUtils.url('Cart-Show', 'afterpayerror', Resource.msg('apierror.flow.default', 'afterpay', null)));
    }
    return next();
});

server.get('Debug', server.middleware.https, function (req, res, next) {
    var currentBasket = BasketMgr.getCurrentBasket();
    AfterpayRefArchCOHelpers.removeAllNonGiftCertificatePayments(currentBasket);
    AfterpayShippingHelpers.calculateBasketTaxShipTotals(req, currentBasket);
    return next();
});

server.get('CartStatus', server.middleware.https, function (req, res, next) {
    if (!afterpayEnabled || !expressCheckoutEnabled) {
        res.json({});
        return next();
    }
    var currentBasket = BasketMgr.getCurrentBasket();
    if (!currentBasket) {
        res.json({});
        return next();
    }

    res.json({
        apApplicable: AfterpayCOHelpers.isBasketAmountWithinThreshold(),
        instorepickup: AfterpayRefArchCOHelpers.shouldEnableExpressPickupMode(currentBasket)
    });
    return next();
});

server.get('GetShippingRequired', server.middleware.https, function (req, res, next) {
    if (!afterpayEnabled || !expressCheckoutEnabled) {
        res.json({});
        return next();
    }

    var afterpayShipmentType = '';
    var currentBasket = BasketMgr.getCurrentBasket();
    if (currentBasket) {
        afterpayShipmentType = AfterpayRefArchCOHelpers.getCartShipmentType(currentBasket);
    }

    res.json({
        shipmentType: afterpayShipmentType
    });

    return next();
});

server.get('CreateToken', server.middleware.https, function (req, res, next) {
    var OrderModel = require('*/cartridge/models/order');
    var Locale = require('dw/util/Locale');
    var currentBasket = BasketMgr.getCurrentBasket();
    var currentLocale = Locale.getLocale(req.locale.id);

    var sourceUrl = req.form.s_url;

    if (!currentBasket || currentBasket.allLineItems.length === 0) {
        return returnJsonError(res, next, Resource.msg('expresscheckout.error.emptycart', 'afterpay', null));
    }

    var basketModel = null;

    var validatedProducts = ValidationHelpers.validateProducts(currentBasket);
    if (validatedProducts.error) {
        return returnJsonError(res, next, 'Problem with basket');
    }

    COHelpers.recalculateBasket(currentBasket);

    basketModel = new OrderModel(
        currentBasket,
        { usingMultiShipping: false, countryCode: currentLocale.country, containerView: 'basket' }
    );

    var grandTotal = parsePrice(basketModel.totals.grandTotal);
    var checkoutPrice = new Money(grandTotal, currentBasket.currencyCode);
    var isWithinThreshold = thresholdUtilities.checkThreshold(checkoutPrice);
    if (!isWithinThreshold.status) {
        return returnJsonError(res, next, Resource.msg('expresscheckout.error.invalidamount', 'afterpay', null));
    }

    // Get a map of storeId -> store .
    var storeMap = AfterpayCOHelpers.getInStorePickupsMap(currentBasket);
    var store = null;
    var shipmentType = AfterpayRefArchCOHelpers.getCartShipmentType(currentBasket);
    var expressCheckoutSplitShipment = false;
    // Make sure everything is only going to a single store and there are no home deliveries.
    // If so, we use in-store pickup mode for express checkout
    if (!empty(shipmentType)) {
        if (shipmentType != 'SingleStorePickup') {
            expressCheckoutSplitShipment = true;
        }

        Object.keys(storeMap).forEach(function (key) {
            store = storeMap[key];
        });
    }

    // merchantnum is currently unused. Just pass in a "x"
    // var merchantOrderNum = Math.random().toString(36).substring(2, 15);
    var merchantOrderNum = 'x';
    var afterPayTokenResponse = require('*/cartridge/scripts/checkout/afterpayExpressGetToken').getExpressToken(currentBasket, checkoutPrice, sourceUrl, merchantOrderNum, store);
    if (afterPayTokenResponse.error) {
        return returnJsonError(res, next, Resource.msg('expresscheckout.error.gettoken', 'afterpay', null));
    }
    var orderToken = afterPayTokenResponse.apToken;
    if (!orderToken) {
        return returnJsonError(res, next, Resource.msg('expresscheckout.error.gettoken', 'afterpay', null));
    }

    // Create the payment instrument
    Transaction.wrap(function () {
        AfterpayRefArchCOHelpers.removeAllNonGiftCertificatePayments(currentBasket);
        var apCheckoutUtilities = apUtilities.checkoutUtilities;
        var paymentMethodName = apCheckoutUtilities.getPaymentMethodName();
        currentBasket.createPaymentInstrument(paymentMethodName, checkoutPrice);
    });

    AfterpaySession.newSession(orderToken);
    AfterpaySession.setExpressCheckout(true);
    AfterpaySession.setMerchantReference(merchantOrderNum);
    AfterpaySession.setExpressCheckoutAmount(checkoutPrice.value);
    AfterpaySession.setExpressCheckoutCurrency(checkoutPrice.currencyCode);
    AfterpaySession.setItemsChecksum(AfterpayCOHelpers.computeBasketProductLineItemChecksum(currentBasket));
    AfterpaySession.setIsSplitShipment(expressCheckoutSplitShipment);

    res.json({ status: 'SUCCESS', token: afterPayTokenResponse, merchantRef: merchantOrderNum });
    return next();
});

// Mainly getting logic from CheckoutShippingServices-UpdateShippingMethodsList
server.post('GetShippingMethods', server.middleware.https, function (req, res, next) {
    var OrderModel = require('*/cartridge/models/order');
    var Locale = require('dw/util/Locale');
    var ShippingHelper = require('*/cartridge/scripts/checkout/shippingHelpers');
    var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');
    var currentBasket = BasketMgr.getCurrentBasket();
    var responseMethods = [];

    if (!currentBasket) {
        res.json({
            error: true,
            cartError: true,
            fieldErrors: [],
            serverErrors: [],
            redirectUrl: URLUtils.url('Cart-Show').toString()
        });
        return next();
    }

    if (AfterpayRefArchCOHelpers.shouldEnableExpressPickupMode(currentBasket)) {
    // if this is a store pickup, just get the store name
        var storeMap = AfterpayCOHelpers.getInStorePickupsMap(currentBasket);
        var store = null;

        Object.keys(storeMap).forEach(function (key) {
            store = storeMap[key];
        });
        if (store) {
        // The cart should only have in-store pickup items at this point
            var costs = AfterpayShippingHelpers.calculateBasketTaxShipTotals(req, currentBasket);
            res.json({
                shipmethods: [{
                    id: store.ID,
                    name: store.name,
                    description: sitePreferences.getStorePickupDescription(),
                    shippingAmount: { amount: costs.shippingCost.value.toString(), currency: costs.shippingCost.currencyCode },
                    taxAmount: { amount: costs.tax.value.toString(), currency: costs.tax.currencyCode },
                    orderAmount: { amount: costs.totalCost.value.toString(), currency: costs.totalCost.currencyCode }
                }]
            });
            return next();
        }
    }

    var shipment = currentBasket.defaultShipment;

    // If there's a shipping method set already, just default to that initially
    // There is always a default
    var shippingMethodID;
    if (shipment.shippingMethod && shipment.shippingMethod.ID) {
        shippingMethodID = shipment.shippingMethod.ID;
    }

    var address = {};
    address.countryCode = req.form.countryCode || '';
    address.stateCode = req.form.state || '';
    address.postalCode = req.form.postcode || '';
    address.city = req.form.suburb || '';
    address.address1 = req.form.address1 || '';
    address.address2 = req.form.address2 || '';

    Transaction.wrap(function () {
        var shippingAddress = shipment.shippingAddress;

        if (!shippingAddress) {
            shippingAddress = shipment.createShippingAddress();
        }

        shippingAddress.setFirstName(address.firstName || '');
        shippingAddress.setLastName(address.lastName || '');
        shippingAddress.setAddress1(address.address1 || '');
        shippingAddress.setAddress2(address.address2 || '');
        shippingAddress.setCity(address.city || '');
        shippingAddress.setPostalCode(address.postalCode || '');
        shippingAddress.setStateCode(address.stateCode || '');
        shippingAddress.setCountryCode(address.countryCode || '');
        shippingAddress.setPhone(address.phone || '');

        ShippingHelper.selectShippingMethod(shipment, shippingMethodID);
        basketCalculationHelpers.calculateTotals(currentBasket);
    });

    var currentLocale = Locale.getLocale(req.locale.id);

    var basketModel = new OrderModel(
        currentBasket,
        { usingMultiShipping: false, countryCode: currentLocale.country, containerView: 'basket' }
    );

    var applicableShippingMethods = basketModel.shipping[0].applicableShippingMethods;

    // Calculates shipping cost by updating each shipping method in the cart
    // and computing shipping and tax before rolling back
    // Some logic from CheckoutShippingServices
    for (var i = 0; i < applicableShippingMethods.length; i++) {
        var method = applicableShippingMethods[i];
        if (!method.storePickupEnabled) {
            try {
                // eslint-disable-next-line no-loop-func
                Transaction.wrap(function () {
                    ShippingHelper.selectShippingMethod(shipment, method.ID);
                    basketCalculationHelpers.calculateTotals(currentBasket);

                    var innerModel = new OrderModel(currentBasket, { usingMultiShipping: false, countryCode: address.countryCode, containerView: 'basket' });

                    responseMethods.push({
                        id: method.ID,
                        name: method.displayName,
                        description: method.description,
                        shippingAmount: { amount: parsePrice(innerModel.totals.totalShippingCost).toString(), currency: currentBasket.currencyCode },
                        taxAmount: { amount: parsePrice(innerModel.totals.totalTax).toString(), currency: currentBasket.currencyCode },
                        orderAmount: { amount: parsePrice(innerModel.totals.grandTotal).toString(), currency: currentBasket.currencyCode }
                    });
                });
            } catch (err) {
                res.setStatusCode(500);
                res.json({
                    error: true,
                    errorMessage: Resource.msg('error.cannot.select.shipping.method', 'cart', null)
                });
            }
        }
    }
    res.json({ shipmethods: responseMethods });
    return next();
});

server.get('PostAfterpayCheckoutFlow', server.middleware.https, function (req, res, next) {
    if (!afterpayEnabled) {
        Logger.error('Afterpay not enabled.');
        res.redirect(URLUtils.url('Cart-Show'));
        return next();
    } else if (!expressCheckoutEnabled) {
        Logger.error('Afterpay Express Checkout not enabled.');
        res.redirect(URLUtils.url('Cart-Show'));
        return next();
    }

    var currentBasket = BasketMgr.getCurrentBasket();
    if (!currentBasket) {
        Logger.error('Cart is empty.');
        res.redirect(URLUtils.url('Cart-Show'));
        return next();
    }

    var apOrderToken = AfterpaySession.getToken();
    if (!apOrderToken) {
        AfterpaySession.clearSession();
        Logger.error('Missing token from session.');
        redirectToErrorDisplay(res, Resource.msg('expresscheckout.error.invalidsession', 'afterpay', null));
        return next();
    }

    // retrieve the order from Afterpay using api
    var afterPayOrderResponse = require('*/cartridge/scripts/util/getOrderToken').validateOrderToken(apOrderToken);
    if (afterPayOrderResponse.error) {
        Logger.error(afterPayOrderResponse.errorMessage || 'Unable to verify order token');
        redirectToErrorDisplay(res, afterPayOrderResponse.errorMessage || Resource.msg('expresscheckout.error.gettoken', 'afterpay', null));
        return next();
    }
    if (!afterPayOrderResponse.consumer || !afterPayOrderResponse.shipping) {
        Logger.error('Missing data from Afterpay Get Order.');
        redirectToErrorDisplay(res, Resource.msg('expresscheckout.error.checkout', 'afterpay', null));
        return next();
    }

    var expressCheckoutShippingStrategy = sitePreferences.getExpressCheckoutShippingStrategy();

    if ((!empty(AfterpaySession.getIsSplitShipment()) && AfterpaySession.getIsSplitShipment())) {
        expressCheckoutShippingStrategy = 'deferred';
    }

    // If this is deferred shipping, just call DeferredFlow()
    if (expressCheckoutShippingStrategy == 'deferred') {
        return deferredShippingFlow(req, res, next, afterPayOrderResponse);
    }

    return integratedShippingFlow(req, res, next, afterPayOrderResponse);
});

module.exports = server.exports();
