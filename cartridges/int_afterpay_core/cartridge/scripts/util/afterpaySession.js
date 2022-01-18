'use strict';

// Mainly for Afterpay Express Checkout to store state in session
// Just wrapper to avoid making direct session references
// Note: SFCC only supports setting primitives in session, not objects
var AfterpaySession = {
    newSession: function (token) {
        session.custom.afterpay_token = token;
        session.custom.afterpay_merchant_reference = '';
        session.custom.afterpay_express_checkout = false;
        session.custom.afterpay_express_checkout_finalize_flow = false;
        session.custom.afterpay_express_checkout_amount = 0;
        session.custom.afterpay_express_checkout_currency = '';
        session.custom.afterpay_express_checkout_checksum = '';
        session.custom.afterpay_express_checkout_shipping_checksum = 0;
        session.custom.afterpay_express_checkout_items_checksum = 0;
        session.custom.afterpay_express_instore_pickup = false;
    },
    // Call this whenever the Afterpay Express transaction should be completely cleared
    clearSession: function () {
        delete session.custom.afterpay_token;
        delete session.custom.afterpay_merchant_reference;
        delete session.custom.afterpay_express_checkout;
        delete session.custom.afterpay_express_checkout_finalize_flow;
        delete session.custom.afterpay_express_checkout_amount;
        delete session.custom.afterpay_express_checkout_currency;
        delete session.custom.afterpay_express_checkout_checksum;
        delete session.custom.afterpay_express_checkout_shipping_checksum;
        delete session.custom.afterpay_express_checkout_items_checksum;
        delete session.custom.afterpay_express_instore_pickup;
    },
    isValid: function () {
        return (!empty(session.custom.afterpay_token));
    },
    getToken: function () {
        return session.custom.afterpay_token;
    },
    setExpressCheckout: function (val) {
        session.custom.afterpay_express_checkout = val;
    },
    isExpressCheckout: function () {
        return session.custom.afterpay_express_checkout == true;
    },

    setExpressCheckoutFinalizeFlow: function (val) {
        session.custom.afterpay_express_checkout_finalize_flow = val;
    },
    isExpressCheckoutFinalizeFlow: function () {
        return session.custom.afterpay_express_checkout_finalize_flow == true;
    },


    setExpressCheckoutAmount: function (amount) {
        session.custom.afterpay_express_checkout_amount = amount;
    },
    getExpressCheckoutAmount: function () {
        return session.custom.afterpay_express_checkout_amount;
    },
    setExpressCheckoutCurrency: function (currency) {
        session.custom.afterpay_express_checkout_currency = currency;
    },
    getExpressCheckoutCurrency: function () {
        return session.custom.afterpay_express_checkout_currency;
    },
    setShippingChecksum: function (cksum) {
        session.custom.afterpay_express_checkout_shipping_checksum = cksum;
    },
    getShippingChecksum: function () {
        return session.custom.afterpay_express_checkout_shipping_checksum;
    },
    setItemsChecksum: function (cksum) {
        session.custom.afterpay_express_checkout_items_checksum = cksum;
    },
    getItemsChecksum: function () {
        return session.custom.afterpay_express_checkout_items_checksum;
    },
    setMerchantReference: function (mr) {
        session.custom.afterpay_merchant_reference = mr;
    },
    getMerchantReference: function () {
        return session.custom.afterpay_merchant_reference;
    },
    setExpressCheckoutInstorePickup: function (val) {
        session.custom.afterpay_express_instore_pickup = val;
    },
    isExpressCheckoutInstorePickup: function () {
        return session.custom.afterpay_express_instore_pickup;
    },

    debugGetSessionAsString: function () {
        return 'token: ' + session.custom.afterpay_token + ' express_checkout: ' + session.custom.afterpay_express_checkout
          + ' finalize_flow: ' + session.custom.afterpay_express_checkout_finalize_flow + ' checkout_amount: ' + session.custom.afterpay_express_checkout_amount
          + ' instore_pickup: ' + session.custom.afterpay_express_checkout_amount;
    }
};

module.exports = AfterpaySession;
