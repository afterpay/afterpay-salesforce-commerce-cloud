/* global empty */
var AfterpayUtilities = require('*/cartridge/scripts/util/afterpayUtilities.js');
var threshold = require('*/cartridge/scripts/util/thresholdUtilities.js').getThreshold();
var StringUtils = require('dw/util/StringUtils');
var Money = require('dw/value/Money');

/**
 * checks if display message is applicable for the respective page or not
 * @param {boolean} isPDPPage - is PDP Page
 * @returns {boolean} displayPreference - true or false
 */
var isDisplayMessage = function (isPDPPage) {
    var sitePreferenceUtilities = AfterpayUtilities.getSitePreferencesUtilities();
    var displayPreference = null;

    displayPreference = isPDPPage ? sitePreferenceUtilities.isDisplayPdpInfo() : sitePreferenceUtilities.isDisplayPlpInfo();

    return !empty(displayPreference) ? displayPreference : false;
};

/**
 * retrieves the installment price based on the product/order total price
 * @param {Object} price - price
 * @returns {Object} money - money
 */
var getPrice = function (price) {
    return new Money(Math.ceil(price.divide(4).value * 100) / 100, price.getCurrencyCode());
};

/**
 *  retrieves the widget message based on the price breakdown
 *  @param {Object} price - price
 * @returns {Object} price - price
 */
var getMessage = function (price) {
    var price4 = getPrice(price);
    var calculatedPrice = StringUtils.formatMoney(price4);
    return calculatedPrice;
};

/**
 *  retrieves the display message of the afterpay widget
 */
var AfterpayDisplayProductMessage = {
    getMessage: function (isPDPPage, price) {
        if (empty(isPDPPage) || empty(price) || !(price instanceof Money)) {
            return null;
        }

        if (isDisplayMessage(isPDPPage)) {
            return getMessage(price);
        }

        return null;
    },

    getPDPMessage: function (price) {
        return this.getMessage(true, price);
    },

    getPLPMessage: function (price) {
        return this.getMessage(false, price);
    },

    getThresholdRange: function (price) {
        if (price < threshold.minAmount) {
            return {
                belowThreshold: true,
                minAmount: threshold.minAmount,
                maxAmount: threshold.maxAmount
            };
        } else if (price >= threshold.minAmount && price <= threshold.maxAmount) {
            return {
                withInThreshold: true
            };
        } else if (price > threshold.maxAmount) {
            return {
                aboveThreshold: true,
                minAmount: threshold.minAmount,
                maxAmount: threshold.maxAmount
            };
        }

        return {
            withInThreshold: false
        };
    }
};

module.exports = AfterpayDisplayProductMessage;
