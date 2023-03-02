'use strict';

var apCheckoutUtilities = require('*/cartridge/scripts/util/afterpayUtilities').checkoutUtilities;
var sitePreferences = require('*/cartridge/scripts/util/afterpayUtilities').sitePreferencesUtilities;
var ctrlCartridgeName = sitePreferences.getControllerCartridgeName();

/* Script Modules */
var app = require(ctrlCartridgeName + '/cartridge/scripts/app');

var apHandlers = {
    // recompute the amount for the Afterpay payment instrument
    recomputeAfterpayPayment: function () {
        var AfterpaySession = require('*/cartridge/scripts/util/afterpaySession');
        if (AfterpaySession.isExpressCheckout()) {
            var paymentMethodName = apCheckoutUtilities.getPaymentMethodName();
            var Transaction = require('dw/system/Transaction');

            var cart = app.getModel('Cart').get();
            if (cart) {
                // Just make sure there's an Afterpay payment instrument before computing the amount
                var pi = cart.object.getPaymentInstruments(paymentMethodName);
                if (pi.length === 0) {
                    return;
                }
                Transaction.wrap(function () {
                    require('~/cartridge/scripts/checkout/afterpaySGCheckoutHelpers').removeAllNonGiftCertificatePayments(cart);
                    cart.object.createPaymentInstrument(paymentMethodName, new dw.value.Money(0.0, cart.object.currencyCode));
                    // will compute the amount for us for the payment instrument
                    cart.calculatePaymentTransactionTotal();
                });
            }
        }
    },
    // only call when changing to non-Afterpay payment method
    handleChangedPaymentInstrument: function (paymentMethod) {
        if (paymentMethod != 'CASHAPPPAY') {
            this.removePaymentMethods(true);
        }
        if (paymentMethod != 'AFTERPAY' && paymentMethod != 'CLEARPAY') {
            this.removePaymentMethods();
        }
    },
    // When the shipping method is updated, we need to update the Afterpay
    // payment in the cart with the correct amount
    handleShippingMethodUpdate: function () {
        this.recomputeAfterpayPayment();
    },
    handleBillingStart: function () {
        this.recomputeAfterpayPayment();
    },
    removePaymentMethods: function (isCashAppPay) {
        var AfterpaySession = require('*/cartridge/scripts/util/afterpaySession');
        var paymentMethodName = apCheckoutUtilities.getPaymentMethodName(isCashAppPay);
        var cart = app.getModel('Cart').get();
        cart.removePaymentInstruments(cart.getPaymentInstruments(paymentMethodName));
        // clears all session vars used by Afterpay
        AfterpaySession.clearSession();
    }
};

module.exports = apHandlers;
