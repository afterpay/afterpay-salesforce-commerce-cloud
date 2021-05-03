var Money = require('dw/value/Money');
var Site = require('dw/system/Site');
var StringUtils = require('dw/util/StringUtils');

var AfterpayUtilities = require('*/cartridge/scripts/util/afterpayUtilities.js');
var threshold = require('*/cartridge/scripts/util/thresholdUtilities.js').getThreshold();

/**
 *  checks if display message is applicable for the respective page or not
 *  @param {boolean} isPDPPage is the value which determines the widget type.
 *  @returns {boolean} displayPreference
 */
var isDisplayMessage = function (isPDPPage) {
    var sitePreferenceUtilities = AfterpayUtilities.sitePreferencesUtilities;
    var displayPreference = null;

    displayPreference = isPDPPage ? sitePreferenceUtilities.isDisplayPdpInfo() : sitePreferenceUtilities.isDisplayPlpInfo();

    return (typeof displayPreference !== 'undefined') ? displayPreference : false;
};

/**
 *  retrieves the installment price based on the product/order total price
 *  @param {number} price give to calculate threshold.
 *  @returns {Object} returns price amount
 */
var getPrice = function (price) {
    return new Money(Math.round((price / 4) * 100) / 100, Site.getCurrent().getDefaultCurrency());
};

/**
 *  retrieves the widget message based on the price breakdown
 *  @param {number} price give to calculate threshold
 *  @returns {number} calculatedPrice price amount
 */
var getMessage = function (price) {
    var price4 = getPrice(price);
    var calculatedPrice = StringUtils.formatMoney(price4);
    return calculatedPrice;
};

/**
 *  retrieves the display message of the afterpay widget
 */
var afterpayDisplayProductMessage = {
    getMessage: function (isPDPPage, price) {
        var messageResponse = null;
        if (!(price)) {
            messageResponse = null;
        }

        if (isDisplayMessage(isPDPPage)) {
            messageResponse = getMessage(price);
        }
        return messageResponse;
    },

    getPDPMessage: function (price) {
        return this.getMessage(true, Number(price));
    },

    getPLPMessage: function (price) {
        return this.getMessage(false, Number(price));
    },
    getThresholdRange: function (price) {
        var thresholdResponse = null;
        if (price < threshold.minAmount) {
            thresholdResponse = {
                belowThreshold: true,
                minAmount: threshold.minAmount,
                maxAmount: threshold.maxAmount
            };
        } else if (price >= threshold.minAmount && price <= threshold.maxAmount) {
            thresholdResponse = {
                withInThreshold: true
            };
        } else if (price > threshold.maxAmount) {
            thresholdResponse = {
                aboveThreshold: true,
                minAmount: threshold.minAmount,
                maxAmount: threshold.maxAmount
            };
        }
        return thresholdResponse;
    }
};

module.exports = afterpayDisplayProductMessage;
