'use strict';
var sitePreferences = require("int_afterpay_core/cartridge/scripts/util/AfterpayUtilities.js").getSitePreferencesUtilities();
var ctrlCartridgeName = sitePreferences.getControllerCartridgeName();

/* Script Modules */
var app = require(ctrlCartridgeName + '/cartridge/scripts/app');

var apHandlers = {
    // recompute the amount for the Afterpay payment instrument
    recomputeAfterpayPayment: function() {
        let AfterpaySession = require('*/cartridge/scripts/util/AfterpaySession');
        if (AfterpaySession.isExpressCheckout()) {
            var Transaction = require('dw/system/Transaction');
            var COHelpers = require('*/cartridge/scripts/checkout/AfterpayCheckoutHelpers');

            var cart = app.getModel('Cart').get();
            if (cart) {
                // Just make sure there's an Afterpay payment instrument before computing the amount
                let pi = cart.object.getPaymentInstruments("AFTERPAY_PBI");
                if (pi.length == 0) {
                    return;
                }

                Transaction.wrap(function () {
                    COHelpers.removeAllNonGiftCertificatePayments(cart);
                    let paymentInstrument = cart.object.createPaymentInstrument('AFTERPAY_PBI', new dw.value.Money(0.0, cart.object.currencyCode));
                    // will compute the amount for us for the payment instrument
                    cart.calculatePaymentTransactionTotal();
                });
            }
        }
    },
    // only call when changing to non-Afterpay payment method
    handleChangedPaymentInstrument: function() {
        let AfterpaySession = require('*/cartridge/scripts/util/AfterpaySession');
        var cart = app.getModel('Cart').get();
        cart.removePaymentInstruments( cart.getPaymentInstruments('AFTERPAY_PBI'));
        // clears all session vars used by Afterpay
        AfterpaySession.clearSession();
    },
    // When the shipping method is updated, we need to update the Afterpay
    // payment in the cart with the correct amount
    handleShippingMethodUpdate: function() {
        this.recomputeAfterpayPayment();
    },
    handleBillingStart: function() {
        this.recomputeAfterpayPayment();
    }

}
module.exports = apHandlers;