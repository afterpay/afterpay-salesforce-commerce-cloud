'use strict';
/* global empty */

var Site = require('dw/system/Site');
var PaymentMgr = require('dw/order/PaymentMgr');
var URLUtils = require('dw/web/URLUtils');

/**
 *  Site Preferences Utilities
 */
var sitePreferencesUtilities = {

    getRedirectConfirmUrl: function () {
        return URLUtils.https('AfterpayRedirect-HandleResponse').toString();
    },

    getRedirectCancelUrl: function () {
        return URLUtils.https('AfterpayRedirect-HandleResponse').toString();
    },

    getPaymentMode: function () {
        return Site.current.preferences.custom.apPaymentMode;
    },

    getServiceName: function () {
        return Site.current.preferences.custom.apServiceName;
    },

    isDisplayPdpInfo: function () {
        return Site.getCurrent().getCustomPreferenceValue('apDisplayPdpInfo');
    },

    isDisplayPlpInfo: function () {
        return Site.getCurrent().getCustomPreferenceValue('apDisplayPlpInfo');
    },

    getUserAgent: function () {
        return Site.getCurrent().getCustomPreferenceValue('apUserAgent');
    },

    getCaptureTimeout: function () {
        return Site.getCurrent().getCustomPreferenceValue('apCaptureTimeout');
    },

    isAfterpayEnabled: function () {
        return Site.getCurrent().getCustomPreferenceValue('enableAfterpay') || false;
    },
    getMinThresholdAmount: function () {
        return Site.getCurrent().getCustomPreferenceValue('apMinThresholdAmount');
    },

    getMaxThresholdAmount: function () {
        return Site.getCurrent().getCustomPreferenceValue('apMaxThresholdAmount');
    }

};

/**
 *  Checkout Utilities
 */
var checkoutUtilities = {

    PAYMENT_MODE: require('*/cartridge/scripts/util/afterpayConstants.js').PAYMENT_MODE,

    getPaymentMethod: function () {
        return PaymentMgr.getPaymentMethod(this.PAYMENT_MODE.PAYMENT_METHOD);
    },

    getPaymentTransaction: function (lineItemCtnr) {
        var paymentInstrument = this.getPaymentInstrument(lineItemCtnr);
        return paymentInstrument ? paymentInstrument.getPaymentTransaction() : null;
    },

    getPaymentInstrument: function (lineItemCtnr) {
        return lineItemCtnr.getPaymentInstruments(this.PAYMENT_MODE.PAYMENT_METHOD)[0];
    },

    getPaymentModeFromOrder: function (order) {
        if (empty(order)) {
            return null;
        }

        var paymentTransaction = this.getPaymentTransaction(order);
        return paymentTransaction.custom.apPaymentMode;
    },

    getPaymentMode: function (order) {
        var paymentMode = this.getPaymentModeFromOrder(order);
        if (empty(paymentMode)) {
            paymentMode = sitePreferencesUtilities.getPaymentMode().value;
        }
        return paymentMode;
    }
};


module.exports = {
    sitePreferencesUtilities: sitePreferencesUtilities,
    checkoutUtilities: checkoutUtilities
};
