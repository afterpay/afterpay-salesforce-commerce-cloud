'use strict';

var AfterpaySession = require('*/cartridge/scripts/util/afterpaySession');
var AfterpayCOHelpers = require('*/cartridge/scripts/checkout/afterpayCheckoutHelpers');
var ExpressCaptureRequestBuilder = require('~/cartridge/scripts/payment/expressCaptureRequestBuilder');
var apUtilities = require('*/cartridge/scripts/util/afterpayUtilities');
var apCheckoutUtilities = apUtilities.checkoutUtilities;

var ExpressCheckoutPaymentHelpers = {

    createExpressCheckoutModelFromOrderAndSession: function (order) {
        // setting saved in PaymentTransaction for Express Checkout.
        var ExpressCheckoutModel = require('*/cartridge/scripts/models/expressCheckoutModel');
        var expressCheckoutModel = new ExpressCheckoutModel();
        var paymentMethod = apCheckoutUtilities.getPaymentMethodName();
        expressCheckoutModel.apExpressCheckout = order.getPaymentInstruments(paymentMethod)[0].getPaymentTransaction().custom.apExpressCheckout;
        expressCheckoutModel.apExpressCheckoutChecksum = order.getPaymentInstruments(paymentMethod)[0].getPaymentTransaction().custom.apExpressCheckoutChecksum;
        if (expressCheckoutModel.apExpressCheckout) {
            let orderToken = order.getPaymentInstruments(paymentMethod)[0].getPaymentTransaction().custom.apToken;
            // May need a way to get a session snapshot
            if (AfterpaySession.getToken(orderToken) == orderToken) {
                let lineItemsChanged = this.checkIfLineItemsChanged(order);
                let shippingChanged = this.checkIfShippingChanged(order);
                expressCheckoutModel.apTempShippingAddressChanged = shippingChanged;
                expressCheckoutModel.apTempBasketItemsChanged = lineItemsChanged;
                let initialCheckoutAmount = new dw.value.Money(AfterpaySession.getExpressCheckoutAmount(), AfterpaySession.getExpressCheckoutCurrency());
                let pt = order.getPaymentInstruments(paymentMethod)[0].getPaymentTransaction();
                let amount = pt.amount;
                if (!initialCheckoutAmount.equals(amount)) {
                    expressCheckoutModel.apTempCheckoutAmountChanged = true;
                }
            }
        }
        return expressCheckoutModel;
    },
    checkIfLineItemsChanged: function (order) {
        let cksum = AfterpayCOHelpers.computeBasketProductLineItemChecksum(order);
        if (cksum != AfterpaySession.getItemsChecksum()) {
            return true;
        }
        return false;
    },
    checkIfShippingChanged: function (order) {
        // If the order was originally an in-store pickup, but was
        // changed to home ship during Afterpay Widget finalize flow,
        // consider it a shipping change so capture/auth will send
        // the new address
        if (AfterpaySession.isExpressCheckoutInstorePickup()) {
            // check whether the order is still an in-store pickup
            if (AfterpayCOHelpers.getNumHomeDeliveries(order) > 0) {
                return true;
            }
            return false;
        }

        let cksum = AfterpayCOHelpers.computeBasketShippingChecksum(order);
        if (cksum != AfterpaySession.getItemsChecksum()) {
            return true;
        }
        return false;
    }
};

module.exports = ExpressCheckoutPaymentHelpers;
