'use strict';

var server = require('server');
var Response = require('server/response');
var URLUtils = require('dw/web/URLUtils');
var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
var AfterpayCOHelpers = require('*/cartridge/scripts/checkout/AfterpayCheckoutHelpers');
var Resource = require('dw/web/Resource');
let AfterpaySession = require('*/cartridge/scripts/util/AfterpaySession');
let ValidationHelpers = require('*/cartridge/scripts/helpers/basketValidationHelpers');
var BasketMgr = require('dw/order/BasketMgr');
var LogUtils = require('~/cartridge/scripts/util/LogUtils');
var Logger = LogUtils.getLogger('AfterpayExpress');
var AfterpayShippingHelpers = require('*/cartridge/scripts/checkout/AfterpayShippingHelpers');
var OrderMgr = require('dw/order/OrderMgr');
var Order  = require('dw/order/Order');
var Transaction = require('dw/system/Transaction');



/* Global vars */
var sitePreferences = require("~/cartridge/scripts/util/AfterpayUtilities.js").getSitePreferencesUtilities();
var afterpayEnabled = sitePreferences.isAfterpayEnabled();
var expressCheckoutEnabled = sitePreferences.isExpressCheckoutEnabled();

function returnJsonError(res, next, err) {
    res.json({
        status: 'FAILURE',
        error: err,
        redirectUrl: URLUtils.url('Cart-Show').toString()
    });
    return next();
}

server.get('CartStatus',
        server.middleware.https,
        function (req, res, next) {
            var AfterpayCOHelpers = require('*/cartridge/scripts/checkout/AfterpayCheckoutHelpers');

            if (! afterpayEnabled || !expressCheckoutEnabled) {
                res.json({});
                return next();
            }
            var currentBasket = BasketMgr.getCurrentBasket();
            if (!currentBasket) {
                res.json({});
                return next();
            }

            let cartTotals = AfterpayShippingHelpers.calculateBasketTaxShipTotals(req, currentBasket);
            res.json({ cartTotalAmount: cartTotals.totalCost.value,
                 cartTotalCurrency: cartTotals.totalCost.currencyCode,
                  instorepickup: AfterpayCOHelpers.shouldEnableExpressPickupMode(currentBasket),
                expressCheckoutFinalize: AfterpaySession.isExpressCheckoutFinalizeFlow() });
            return next();
        }
);

server.get('CreateToken',
        server.middleware.https,
        function (req, res, next) {

        var OrderModel = require('*/cartridge/models/order');
        var Locale = require('dw/util/Locale');
        var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');
        var AfterpaySitePreferencesUtilities = require('~/cartridge/scripts/util/AfterpayUtilities').getSitePreferencesUtilities();
        var currentBasket = BasketMgr.getCurrentBasket();
        var currentLocale = Locale.getLocale(req.locale.id);
        var cartHelper = require('*/cartridge/scripts/cart/cartHelpers');
        var AfterpayCOHelpers = require('*/cartridge/scripts/checkout/AfterpayCheckoutHelpers');

        let sourceUrl = req.form.s_url;

        if (!currentBasket || currentBasket.allLineItems.length === 0) {
            return returnJsonError(res, next, Resource.msg('expresscheckout.error.emptycart', 'afterpay', null));
        }

        let basketModel = null;

        var validatedProducts = ValidationHelpers.validateProducts(currentBasket);
        if (validatedProducts.error) {
            return returnJsonError(res, next, "Problem with basket");
        }

        COHelpers.recalculateBasket(currentBasket);
        
        basketModel = new OrderModel(
            currentBasket,
            { usingMultiShipping: false, countryCode: currentLocale.country, containerView: 'basket' }
        );
        let grandTotal = basketModel.totals.grandTotal.replace(/\$|\,/g, '');
        let checkoutPrice = new dw.value.Money(grandTotal, currentBasket.currencyCode);
        var minThresholdAmount = AfterpaySitePreferencesUtilities.getMinThresholdAmount();
        var maxThresholdAmount = AfterpaySitePreferencesUtilities.getMaxThresholdAmount();
        if ((checkoutPrice < minThresholdAmount) || (checkoutPrice > maxThresholdAmount)) {
            return returnJsonError(res, next, Resource.msg('expresscheckout.error.invalidamount', 'afterpay', null));
        }

        // Get a map of storeId -> store .
        let storeMap = AfterpayCOHelpers.getInStorePickupsMap(currentBasket);
        let numHomeDeliveries = AfterpayCOHelpers.getNumHomeDeliveries(currentBasket);
        let store = null;
        let storePickup = false;
        // Make sure everything is only going to a single store and there are no home deliveries.
        // If so, we use in-store pickup mode for express checkout
        if ((numHomeDeliveries == 0) && (Object.keys(storeMap).length == 1)) {
            storePickup = true;
            for (key in storeMap) {
                store = storeMap[key];
            }
        }
        else if ((numHomeDeliveries > 0) && (Object.keys(storeMap).length > 0)) {
            // If there are items going to multiple places, we can't use express checkout
            return returnJsonError(res, next, Resource.msg('expresscheckout.error.multidestination', 'afterpay', null));
        }
        else if (Object.keys(storeMap).length > 1) {
            return returnJsonError(res, next, Resource.msg('expresscheckout.error.multidestination', 'afterpay', null));
        }

        // merchantnum is currently unused. Just pass in a "x"
        //var merchantOrderNum = Math.random().toString(36).substring(2, 15);
        var merchantOrderNum = 'x';
        var afterPayTokenResponse = require('~/cartridge/scripts/checkout/AfterpayExpressGetToken').GetToken(currentBasket, checkoutPrice, sourceUrl, merchantOrderNum, store);
        if (afterPayTokenResponse.error) {
            return returnJsonError(res, next, Resource.msg('expresscheckout.error.gettoken', 'afterpay', null));
        }
        var orderToken = afterPayTokenResponse.apToken;
        if (!orderToken) {
            return returnJsonError(res, next, Resource.msg('expresscheckout.error.gettoken', 'afterpay', null));
        }

        // Create the payment instrument
        Transaction.wrap(function () {
            AfterpayCOHelpers.removeAllNonGiftCertificatePayments(currentBasket);
            paymentInstrument = currentBasket.createPaymentInstrument('AFTERPAY_PBI', checkoutPrice);
        });

        AfterpaySession.newSession(orderToken);
        AfterpaySession.setExpressCheckout(true);
        AfterpaySession.setMerchantReference(merchantOrderNum);
        AfterpaySession.setExpressCheckoutAmount( checkoutPrice.value );
        AfterpaySession.setExpressCheckoutCurrency( checkoutPrice.currencyCode );
        AfterpaySession.setItemsChecksum(AfterpayCOHelpers.computeBasketProductLineItemChecksum(currentBasket));

        res.json({ status: 'SUCCESS', token: afterPayTokenResponse, merchantRef: merchantOrderNum });
        return next();
    }
);

// Mainly getting logic from CheckoutShippingServices-UpdateShippingMethodsList
server.post('GetShippingMethods',
        server.middleware.https,
        function (req, res, next) {
        var OrderModel = require('*/cartridge/models/order');
        var Locale = require('dw/util/Locale');
        var ShippingHelper = require('*/cartridge/scripts/checkout/shippingHelpers');
        var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');
        var TotalsModel = require('*/cartridge/models/totals');
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


        if (AfterpayCOHelpers.shouldEnableExpressPickupMode(currentBasket)) {
            // if this is a store pickup, just get the store name
            let storeMap = AfterpayCOHelpers.getInStorePickupsMap(currentBasket);
            let store = null;
            for (key in storeMap) {
                store = storeMap[key];
            }
            if (store) {
                // The cart should only have in-store pickup items at this point
                let costs = AfterpayShippingHelpers.calculateBasketTaxShipTotals(req, currentBasket);
                res.json({shipmethods: [{
                    id: store.ID, name: store.name,
                    description: sitePreferences.getStorePickupDescription(),
                    shippingAmount: { amount: costs.shippingCost.value.toString(), currency: costs.shippingCost.currencyCode },
                    taxAmount: { amount: costs.tax.value.toString(), currency: costs.tax.currencyCode },
                    orderAmount: { amount: costs.totalCost.value.toString(), currency: costs.totalCost.currencyCode }
                    }]
                });
                return next();
            }
        }

        let shipment = currentBasket.defaultShipment;

        // If there's a shipping method set already, just default to that initially
        // There is always a default
        var shippingMethodID;
        if (shipment.shippingMethod) {
            shippingMethodID = shipment.shippingMethod.ID;
        }

        let address = {};
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
        for (i = 0; i < applicableShippingMethods.length; i++) {
            let method = applicableShippingMethods[i];
            if (method.storePickupEnabled) {
                continue;
            }
            try {
                Transaction.wrap(function () {

                    ShippingHelper.selectShippingMethod(shipment, method.ID);

                    basketCalculationHelpers.calculateTotals(currentBasket);

                    var innerModel = new OrderModel(
                        currentBasket,
                        { usingMultiShipping: false, countryCode: address.countryCode, containerView: 'basket' }
                    );
                    responseMethods.push({
                        id: method.ID,
                        name: method.displayName,
                        description: method.description,
                        shippingAmount: { amount: AfterpayCOHelpers.removeMoneySymbols(innerModel.totals.totalShippingCost), currency: currentBasket.currencyCode },
                        taxAmount: { amount: AfterpayCOHelpers.removeMoneySymbols(innerModel.totals.totalTax), currency: currentBasket.currencyCode },
                        orderAmount: { amount: AfterpayCOHelpers.removeMoneySymbols(innerModel.totals.grandTotal), currency: currentBasket.currencyCode }
                    });
                });
            } catch (err) {
                res.setStatusCode(500);
                res.json({
                    error: true,
                    errorMessage: Resource.msg('error.cannot.select.shipping.method', 'cart', null)
                });

                return;
            }
        }
        res.json({shipmethods: responseMethods});
        return next();
    }
);

server.get('PostAfterpayCheckoutFlow',
        server.middleware.https,
        function (req, res, next) {
            if (! afterpayEnabled) {
                Logger.error('Afterpay not enabled.');
                res.redirect(URLUtils.url('Cart-Show'));
                return next();
            }
            else if (!expressCheckoutEnabled) {
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
                Logger.error("Missing token from session.");
                redirectToErrorDisplay(res, Resource.msg('expresscheckout.error.invalidsession', 'afterpay', null));
                return next();
            }

            // retrieve the order from Afterpay using api
            var afterPayOrderResponse = require('~/cartridge/scripts/util/GetOrderToken').validateOrderToken(apOrderToken);
            if (afterPayOrderResponse.error) {
                Logger.error(afterPayOrderResponse.errorMessage || "Unable to verify order token");
                redirectToErrorDisplay(res, afterPayOrderResponse.errorMessage || Resource.msg('expresscheckout.error.gettoken', 'afterpay', null));
                return next();
            }
            if (! afterPayOrderResponse.consumer || ! afterPayOrderResponse.shipping) {
                Logger.error("Missing data from Afterpay Get Order.");
                redirectToErrorDisplay(res, Resource.msg('expresscheckout.error.checkout', 'afterpay', null));
                return next();
            }

            let expressCheckoutShippingStrategy = sitePreferences.getExpressCheckoutShippingStrategy();
           // If this is deferred shipping, just call DeferredFlow()
            if (expressCheckoutShippingStrategy == "deferred") {
                return DeferredShippingFlow(req, res, next, afterPayOrderResponse);
            }
            else {
                return IntegratedShippingFlow(req, res, next, afterPayOrderResponse);
            }
        }
);

function DeferredShippingFlow(req, res, next, afterPayOrderResponse) {
    var currentBasket = BasketMgr.getCurrentBasket();

    var AfterpayCOHelpers = require('*/cartridge/scripts/checkout/AfterpayCheckoutHelpers');
    AfterpayCOHelpers.addShippingAddressToBasket(currentBasket, afterPayOrderResponse.shipping);
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
        AfterpayCOHelpers.removeAllNonGiftCertificatePayments(currentBasket);
        let paymentInstrument = currentBasket.createPaymentInstrument('AFTERPAY_PBI', new dw.value.Money(0.0, currentBasket.currencyCode));
    });

    AfterpayCOHelpers.calculateAndSetPaymentAmount(currentBasket);
    AfterpaySession.setExpressCheckoutFinalizeFlow(true);
    res.redirect(URLUtils.url('Checkout-Begin', 'stage', 'shipping'));
    return next();
}

function IntegratedShippingFlow(req, res, next, afterPayOrderResponse) {
    var AfterpayShippingHelpers = require('*/cartridge/scripts/checkout/AfterpayShippingHelpers');
    var AfterpayCOHelpers = require('*/cartridge/scripts/checkout/AfterpayCheckoutHelpers');

    var currentBasket = BasketMgr.getCurrentBasket();

    var apOrderToken = AfterpaySession.getToken();
    // Shipping option chosen by the consumer
    var selectedShipOption = afterPayOrderResponse.shippingOptionIdentifier;

    let isStorePickup = false;
    if (AfterpayCOHelpers.shouldEnableExpressPickupMode(currentBasket)) {
        isStorePickup = true;
    }

    // For in-store pickup, the address will be the address of the store
    AfterpayCOHelpers.addShippingAddressToBasket(currentBasket, afterPayOrderResponse.shipping);
    AfterpaySession.setShippingChecksum(AfterpayCOHelpers.computeBasketShippingChecksum(currentBasket));

    if (!isStorePickup) {
        // Need to compute the cost given the chosen shipping selection
        let shipMethod = AfterpayShippingHelpers.getShippingMethodForID(selectedShipOption);
        if (!shipMethod) {
            Logger.error("Shipping method returned by Afterpay was invalid.");
            redirectToErrorDisplay(res, Resource.msg('expresscheckout.error.checkout', 'afterpay', null));
            return next();
        }
        AfterpayShippingHelpers.setBasketShippingMethod(currentBasket, shipMethod.ID);

    }
    else {
        // Should we get the address of the store? Or if it's instore pickup, we will never send
        // Store a checksum of the line items into the session. Check this before we do a capture.
        AfterpaySession.setExpressCheckoutInstorePickup(true);
    }
    let cartTotals = AfterpayShippingHelpers.calculateBasketTaxShipTotals(req, currentBasket);
    AfterpayCOHelpers.addConsumerToBasket(currentBasket, afterPayOrderResponse.consumer);

    if (afterPayOrderResponse.billing) {
        AfterpayCOHelpers.addBillingAddressToBasket(currentBasket, afterPayOrderResponse.billing);
    } else {
        // Use shipping address for billing if billing is not passed in
        AfterpayCOHelpers.addBillingAddressToBasket(currentBasket, afterPayOrderResponse.shipping);
    }
    adjustCartResponse = {totalCost: cartTotals.totalCost};

    var amount = afterPayOrderResponse.amount.amount;
    var currency = afterPayOrderResponse.amount.currency;
    if ((adjustCartResponse.totalCost.value != amount) ||
        (adjustCartResponse.totalCost.currencyCode != currency)) {
        // this can occur if session was modified while express checkout was in flight
        Logger.error("Amount returned by Afterpay did not match expected amount. Afterpay returned=" + amount + currency + " Merchant computed=" + adjustCartResponse.totalCost.value + adjustCartResponse.totalCost.currencyCode);
        redirectToErrorDisplay(res, Resource.msg('expresscheckout.error.checkout', 'afterpay', null));
        return next();
    }

    var buyNow = sitePreferences.isExpressCheckoutBuyNowEnabled();
    if (buyNow) {
        // create the payment transaction with Afterpay for the desired amount
        Transaction.wrap(function () {
            AfterpayCOHelpers.removeAllNonGiftCertificatePayments(currentBasket);

            paymentInstrument = currentBasket.createPaymentInstrument('AFTERPAY_PBI', new dw.value.Money(amount, currency));
            AfterpayCOHelpers.addShippingAddressToBasket(currentBasket, afterPayOrderResponse.shipping);
        });

        // puts initial state into paymentTransaction
        require('~/cartridge/scripts/checkout/AfterpayUpdatePreapprovalStatus').GetPreApprovalResult(currentBasket, {status: "SUCCESS", orderToken: apOrderToken, apExpressCheckout: true});

        // Place the order
        // This logic is similar to AfterpayRedirect-HandleResponse, which is what gets called after Afterpay redirect flow returns to site
        var order = COHelpers.createOrder(currentBasket);
        // auth/capture payment
        let paymentStatusUpdated = require('*/cartridge/scripts/checkout/UpdatePaymentStatus').HandlePaymentStatus(order);
        if (paymentStatusUpdated.authorized) {
            Transaction.begin();
            orderPlacementStatus = OrderMgr.placeOrder(order);
            Transaction.commit();
            if (!orderPlacementStatus.error) {
                Transaction.begin();
                order.setConfirmationStatus(Order.CONFIRMATION_STATUS_CONFIRMED);
                order.setExportStatus(Order.EXPORT_STATUS_READY);
                Transaction.commit();
                res.redirect(URLUtils.url('Order-Confirm', 'ID', order.orderNo, 'token', order.orderToken));
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
    else {
        Transaction.wrap(function () {
            AfterpayCOHelpers.removeAllNonGiftCertificatePayments(currentBasket);
            paymentInstrument = currentBasket.createPaymentInstrument('AFTERPAY_PBI', new dw.value.Money(amount, currency));
            AfterpayCOHelpers.addShippingAddressToBasket(currentBasket, afterPayOrderResponse.shipping);
        });
        AfterpaySession.setExpressCheckoutFinalizeFlow(true);
        // puts initial state into paymentTransaction
        require('~/cartridge/scripts/checkout/AfterpayUpdatePreapprovalStatus').GetPreApprovalResult(currentBasket, {status: "SUCCESS", orderToken: apOrderToken, apExpressCheckout: true});
        res.redirect(URLUtils.url('Checkout-Begin', 'stage', 'placeOrder'));
        return next();
    }
}


server.get('ContinueFinalize',
        server.middleware.https,
        function (req, res, next) {
            var AfterpayCOHelpers = require('~/cartridge/scripts/checkout/AfterpayCheckoutHelpers');

            if (! afterpayEnabled || !expressCheckoutEnabled || !AfterpaySession.isExpressCheckoutFinalizeFlow()) {
                res.redirect(URLUtils.url('Cart-Show'));
                return next();
            }
            var currentBasket = BasketMgr.getCurrentBasket();
            if (!currentBasket || currentBasket.allLineItems.length === 0) {
                res.redirect(URLUtils.url('Cart-Show'));
                return next();
            }
            Transaction.wrap(function () {
                AfterpayCOHelpers.removeAllNonGiftCertificatePayments(currentBasket);
                paymentInstrument = currentBasket.createPaymentInstrument('AFTERPAY_PBI', new dw.value.Money(0.0, currentBasket.currencyCode));
            });
            // This does a recalculation using the current basket
            AfterpayCOHelpers.calculateAndSetPaymentAmount(currentBasket);
            let payAmt = AfterpayCOHelpers.getCurrentAfterpayPaymentAmount(currentBasket);
            if (! AfterpayCOHelpers.isPriceWithinThreshold(payAmt)) {
                redirectToErrorDisplay(res, Resource.msgf('minimum.threshold.message', 'afterpay', null, new dw.value.Money(sitePreferences.getMinThresholdAmount(), currentBasket.currencyCode)
                , new dw.value.Money(sitePreferences.getMaxThresholdAmount(), currentBasket.currencyCode)));
                return next();
            }

            res.redirect(URLUtils.url('Checkout-Begin', 'stage', 'placeOrder'));
            return next();
        }
);

server.get('FinalizeOrder',
        server.middleware.https,
        function (req, res, next) {
            var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
            var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');
            var AfterpayCOHelpers = require('*/cartridge/scripts/checkout/AfterpayCheckoutHelpers');

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
            let apOrderToken = AfterpaySession.getToken();

            if (!widgetChecksum) {
                redirectToErrorDisplay(res, Resource.msg('expresscheckout.error.missingchecksum', 'afterpay', null));
                return next();
            }
            // Get logic from CheckoutServices-PlaceOrder . can't call it directly due to widgetchecksum stuff

            // Recreate the payment instrument in case session changed
            Transaction.wrap(function () {
                AfterpayCOHelpers.removeAllNonGiftCertificatePayments(currentBasket);
                let paymentInstrument = currentBasket.createPaymentInstrument('AFTERPAY_PBI', new dw.value.Money(0.0, currentBasket.currencyCode));
            });
            AfterpayCOHelpers.calculateAndSetPaymentAmount(currentBasket);

            // Re-calculate the payments.
            var calculatedPaymentTransaction = COHelpers.calculatePaymentTransaction(
                currentBasket
            );
            if (calculatedPaymentTransaction.error) {
                redirectToErrorDisplay(res, Resource.msg('error.technical', 'checkout', null));
                return next();
            }

            require('~/cartridge/scripts/checkout/AfterpayUpdatePreapprovalStatus').GetPreApprovalResult(currentBasket, {status: "SUCCESS", orderToken: apOrderToken, apExpressCheckout: true, apExpressCheckoutChecksum: widgetChecksum});

            // Place order and show confirmation. What's the best way? Can we return to checkout.isml? Or probably just directly 

            // This logic is similar to AfterpayRedirect-HandleResponse, which is what gets called after Afterpay redirect flow returns to site
            var order = COHelpers.createOrder(currentBasket);
            // auth/capture payment
            let paymentStatusUpdated = require('*/cartridge/scripts/checkout/UpdatePaymentStatus').HandlePaymentStatus(order);
            if (paymentStatusUpdated.authorized) {
                Transaction.begin();
                orderPlacementStatus = OrderMgr.placeOrder(order);
                Transaction.commit();
                if (!orderPlacementStatus.error) {
                    Transaction.begin();
                    order.setConfirmationStatus(Order.CONFIRMATION_STATUS_CONFIRMED);
                    order.setExportStatus(Order.EXPORT_STATUS_READY);
                    Transaction.commit();
                    res.redirect(URLUtils.url('Order-Confirm', 'ID', order.orderNo, 'token', order.orderToken));
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
        }
);


server.get('WidgetError',
        server.middleware.https,
        function (req, res, next) {
            AfterpaySession.clearSession();
            let error = req.querystring.error || '';
            redirectToErrorDisplay(res, error);
            return next();
        }
);

/**
 * Called by Express Checkout widget when onComplete() is called with a fail status.
 * Also called by the widget when token creation fails.
 */
server.get('CancelOrder',
        server.middleware.https,
        function (req, res, next) {
            var apOrderToken = AfterpaySession.getToken();
            AfterpaySession.clearSession();
            if (req.querystring.afterpayerror) {
                res.redirect(URLUtils.url('Cart-Show', 'afterpayerror', req.querystring.afterpayerror));
            }
            else {
                res.redirect(URLUtils.url('Cart-Show'));
            }
            return next();
        }
);

server.get('Debug',
        server.middleware.https,
        function (req, res, next) {
            var currentBasket = BasketMgr.getCurrentBasket();
            var AfterpayCOHelpers = require('*/cartridge/scripts/checkout/AfterpayCheckoutHelpers');
            var AfterpaySession = require('*/cartridge/scripts/util/AfterpaySession');

            AfterpayCOHelpers.removeAllNonGiftCertificatePayments(currentBasket);

            let cartTotals = AfterpayShippingHelpers.calculateBasketTaxShipTotals(req, currentBasket);
            return next();
        }
);

function redirectToErrorDisplay(res, error) {
    res.redirect(URLUtils.url('Checkout-Begin', 'stage', 'payment', 'afterpayErrorMessage', error));
}

module.exports = server.exports();
