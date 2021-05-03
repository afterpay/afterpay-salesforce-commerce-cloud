'use strict';

var AfterpaySitePreferencesUtilities = require("~/cartridge/scripts/util/AfterpayUtilities").getSitePreferencesUtilities();
var ctrlCartridgeName = AfterpaySitePreferencesUtilities.getControllerCartridgeName();
var Class 		= require(ctrlCartridgeName + '/cartridge/scripts/util/Class').Class;
var ExpressCaptureRequestBuilder = require('~/cartridge/scripts/payment/ExpressCaptureRequestBuilder');
var LogUtils = require('~/cartridge/scripts/util/LogUtils');
var Logger = LogUtils.getLogger('AfterpayCapture');
var AfterpaySession = require('*/cartridge/scripts/util/AfterpaySession');
var COHelpers = require('*/cartridge/scripts/checkout/AfterpayCheckoutHelpers');

var ExpressCheckoutPaymentHelpers = Class.extend({
    
    createExpressCheckoutModelFromOrderAndSession: function(order) {
        // setting saved in PaymentTransaction for Express Checkout.
        let ExpressCheckoutModel = require("~/cartridge/scripts/models/ExpressCheckoutModel");
        let expressCheckoutModel = new ExpressCheckoutModel();
        expressCheckoutModel.apExpressCheckout = order.getPaymentInstruments("AFTERPAY_PBI")[0].getPaymentTransaction().custom.apExpressCheckout;
        expressCheckoutModel.apExpressCheckoutChecksum = order.getPaymentInstruments("AFTERPAY_PBI")[0].getPaymentTransaction().custom.apExpressCheckoutChecksum;
        if (expressCheckoutModel.apExpressCheckout) {
            let orderToken = order.getPaymentInstruments("AFTERPAY_PBI")[0].getPaymentTransaction().custom.apToken;
            // May need a way to get a session snapshot
            if (AfterpaySession.getToken(orderToken) == orderToken) {
                let lineItemsChanged = this.checkIfLineItemsChanged(order);
                let shippingChanged = this.checkIfShippingChanged(order);
                expressCheckoutModel.apTempShippingAddressChanged = shippingChanged;
                expressCheckoutModel.apTempBasketItemsChanged = lineItemsChanged;
                let initialCheckoutAmount = new dw.value.Money(AfterpaySession.getExpressCheckoutAmount(),AfterpaySession.getExpressCheckoutCurrency());
                let pt = order.getPaymentInstruments("AFTERPAY_PBI")[0].getPaymentTransaction();
                let amount = pt.amount;
                if (!initialCheckoutAmount.equals(amount)) {
                    expressCheckoutModel.apTempCheckoutAmountChanged = true;
                }
            }
        }
        return expressCheckoutModel;
    },
    checkIfLineItemsChanged: function(order) {
        let cksum = COHelpers.computeBasketProductLineItemChecksum(order);
        if (cksum != AfterpaySession.getItemsChecksum()) {
            return true;
        }
        return false;
    },
    checkIfShippingChanged: function(order) {    
        // If the order was originally an in-store pickup, but was
        // changed to home ship during Afterpay Widget finalize flow,
        // consider it a shipping change so capture/auth will send
        // the new address
        if (AfterpaySession.isExpressCheckoutInstorePickup()) {
            // check whether the order is still an in-store pickup
            if (COHelpers.getNumHomeDeliveries(order) > 0) {
                return true;
            }
            return false;
        }
    
        let cksum = COHelpers.computeBasketShippingChecksum(order);
        if (cksum != AfterpaySession.getItemsChecksum()) {
            return true;
        }
        return false;
    }
    

});
  
module.exports = new ExpressCheckoutPaymentHelpers();