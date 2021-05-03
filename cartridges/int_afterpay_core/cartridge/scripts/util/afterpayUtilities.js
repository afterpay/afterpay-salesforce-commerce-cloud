'use strict';
/* global empty */

/* API Includes */
var ISML = require('dw/template/ISML');
var Encoding = require('dw/crypto/Encoding');
var Site = require('dw/system/Site');
var Bytes = require('dw/util/Bytes');
var PaymentMgr = require('dw/order/PaymentMgr');
var URLUtils = require('dw/web/URLUtils');

var Class = require('*/cartridge/scripts/util/class').Class;

/**
 *  creates web service utilities
 */
var createAfterpayWebServiceUtilities = Class.extend({
    setSASAuthorization: function (svc) {
        var apMerchantID = svc.configuration.credential.user || '';
        var apMerchantKey = svc.configuration.credential.password || '';
        var auth = [apMerchantID, apMerchantKey].join(':');
        var authCodeByte = new Bytes(auth);
        var authCode = 'Basic ' + Encoding.toBase64(authCodeByte);

        svc.setAuthentication('BASIC');
        svc.addHeader('Authorization', authCode);
    }
});

/**
 * retrieves web service utilities
 * @returns {Object} AfterpayWebServiceUtilities
 */
var getAfterpayWebServiceUtilities = function () {
    var AfterpayWebServiceUtilities = createAfterpayWebServiceUtilities;

    return new AfterpayWebServiceUtilities();
};

/**
 *  Site Preferences Utilities
 */
var createAfterpaySitePreferencesUtilities = Class.extend({
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

    getControllerCartridgeName: function () {
        return Site.getCurrent().getCustomPreferenceValue('apControllerCartridgeName');
    },

    getCoreCartridgeName: function () {
        return Site.getCurrent().getCustomPreferenceValue('apCoreCartridge');
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
});

/**
 * retrieves SitePreferences object
 * @return {Object} sitePreferences
 */
var getSitePreferencesUtilities = function () {
    var SitePreferences = createAfterpaySitePreferencesUtilities;

    return new SitePreferences();
};

/**
 *  Checkout Utilities
 */
var createAfterpayCheckoutUtilities = Class.extend({
    PAYMENT_MODE: require('*/cartridge/scripts/util/afterpayConstants.js').PAYMENT_MODE,

    getPaymentMethod: function () {
        return PaymentMgr.getPaymentMethod(this.PAYMENT_MODE.PAYMENT_METHOD);
    },

    getPaymentTransaction: function (lineItemCtnr) {
        var paymentInstrument = this.getPaymentInstrument(lineItemCtnr);
        return empty(paymentInstrument) ? null : paymentInstrument.getPaymentTransaction();
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
            var sitePreferencesUtilities = getSitePreferencesUtilities();
            paymentMode = sitePreferencesUtilities.getPaymentMode().value;
        }

        return paymentMode;
    }
});

/**
 * retrieves AfterpayCheckouttilities object
 * @returns {Object} utilities
 */
var getAfterpayCheckoutUtilities = function () {
    var AfterpayCheckouttilities = createAfterpayCheckoutUtilities;

    return new AfterpayCheckouttilities();
};

/**
 * disables summary page based on the payment method
 * @param {Object} cart - cart
 */
var disableSummaryForAfterpay = function (cart) {
    var sitePreferencesUtilities = getSitePreferencesUtilities();
    var afterpayEnable = sitePreferencesUtilities.isAfterpayEnabled();

    var apPaymentInstrument;
    var iter = cart.object.getPaymentInstruments().iterator();

    while (iter.hasNext()) {
        apPaymentInstrument = iter.next();

        if (afterpayEnable === false || apPaymentInstrument.paymentMethod !== 'AFTERPAY_PBI') {
            ISML.renderTemplate('checkout/summary/summary');
        }
    }
};

module.exports.disableSummaryForAfterpay = disableSummaryForAfterpay;
module.exports.getSitePreferencesUtilities = getSitePreferencesUtilities;
module.exports.getAfterpayCheckoutUtilities = getAfterpayCheckoutUtilities;
module.exports.getAfterpayWebServiceUtilities = getAfterpayWebServiceUtilities;
