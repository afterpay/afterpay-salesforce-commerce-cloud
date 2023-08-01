'use strict';

/* API Includes */
var Money = require('dw/value/Money');

/* Script Modules */
var AfterpayCOHelpers = require('*/cartridge/scripts/checkout/afterpayCheckoutHelpers');
var apBrandUtilities = require('*/cartridge/scripts/util/afterpayUtilities').brandUtilities;
var apSitePreferences = require('*/cartridge/scripts/util/afterpayUtilities').sitePreferencesUtilities;

var priceContext = {};
var getTemplateSpecificWidget = {};

/**
 * @description Hide sensitive details like customer details on request for logging purpose
 * @param {string} productObject - product object
 * @param {string} className - widget specific classname
 * @param {string} currencyCode - ISO 4217 mnemonic currency code
 * @param {string} locale - locale, e.g. en_US
 * @returns {string} - request JSON
 */
getTemplateSpecificWidget.getWidgetData = function (productObject, className, currencyCode, locale) {
    var totalPrice = null;

    apBrandUtilities.initBrand(locale);
    var thresholdUtilities = require('*/cartridge/scripts/util/thresholdUtilities');

    if (productObject.productType === 'set' && productObject.individualProducts) {
        getTemplateSpecificWidget.getWidgetDataForSet(productObject, className, currencyCode);
    } else {
        if (productObject.price.sales) {
            totalPrice = productObject.price.sales.value;
        } else if (productObject.price.list) {
            totalPrice = productObject.price.list.value;
        } else if (productObject.price.min.sales) {
            totalPrice = productObject.price.min.sales.value;
        } else if (productObject.price.min.list) {
            totalPrice = productObject.price.min.list.value;
        }

        if (!empty(totalPrice)) {
            totalPrice = new Money(totalPrice, currencyCode);
        }

        priceContext = {
            classname: className,
            totalPrice: totalPrice
        };

        var afterpayLimits = thresholdUtilities.checkThreshold(totalPrice);

        var isEligible = apBrandUtilities.isAfterpayApplicable();
        var isWithinThreshold = afterpayLimits.status;
        var reqProductID = productObject.id;

        if (reqProductID != null && AfterpayCOHelpers.checkRestrictedProducts(reqProductID)) {
            isEligible = false;
        }

        priceContext.apEligible = isEligible;
        priceContext.apMpid = afterpayLimits.mpid;
        priceContext.apApplicable = isEligible && isWithinThreshold;
    }

    return priceContext;
};

getTemplateSpecificWidget.getWidgetDataForSet = function (productObject, className, currencyCode) {
    var thresholdUtilities = require('*/cartridge/scripts/util/thresholdUtilities');
    var totalPrice = null;
    if (productObject.productType === 'set') {
        for (var i = 0; i < productObject.individualProducts.length; i++) {
            var singleSetProduct = productObject.individualProducts[i];
            if (singleSetProduct.price.sales) {
                totalPrice = singleSetProduct.price.sales.value;
            } else if (singleSetProduct.price.list) {
                totalPrice = singleSetProduct.price.list.value;
            } else if (singleSetProduct.price.min.sales) {
                totalPrice = singleSetProduct.price.min.sales.value;
            } else if (singleSetProduct.price.min.list) {
                totalPrice = singleSetProduct.price.min.list.value;
            }

            if (!empty(totalPrice)) {
                totalPrice = new Money(totalPrice, currencyCode);
            }

            var afterpayWidgetData = {
                classname: className,
                quickview: false
            };

            var afterpayLimits = thresholdUtilities.checkThreshold(totalPrice);

            var isEligible = apBrandUtilities.isAfterpayApplicable();
            var reqProductID = singleSetProduct.id;

            if (reqProductID != null && AfterpayCOHelpers.checkRestrictedProducts(reqProductID)) {
                isEligible = false;
            }
            var isWithinThreshold = afterpayLimits.status;

            afterpayWidgetData.apEligible = isEligible;
            afterpayWidgetData.apMpid = afterpayLimits.mpid;
            afterpayWidgetData.apApplicable = isEligible && isWithinThreshold;

            getTemplateSpecificWidget.pushWidgetDataToProduct(singleSetProduct, afterpayWidgetData);
        }
    }
};

getTemplateSpecificWidget.pushWidgetDataToProduct = function (singleSetProduct, afterpayWidgetData) {
    Object.keys(afterpayWidgetData).forEach(function (key) {
        var productObject = singleSetProduct;
        productObject[key] = afterpayWidgetData[key];
    });
};

/**
 * @description Hide sensitive details like customer details on request for logging purpose
 * @param {string} currentBasket - product object
 * @param {string} className - widget specific classname
 * @param {string} locale - locale, e.g. en_US
 * @returns {string} - request JSON
 */
getTemplateSpecificWidget.getCheckoutWidgetData = function (currentBasket, className, locale) {
    var cartProductExcluded = AfterpayCOHelpers.checkRestrictedCart();
    apBrandUtilities.initBrand(locale);

    if (!currentBasket) {
        return priceContext;
    }

    var totalPrice = currentBasket.totalGrossPrice;

    var thresholdUtilities = require('*/cartridge/scripts/util/thresholdUtilities');

    priceContext.classname = className;
    priceContext.totalPrice = totalPrice.value;

    var afterpayLimits = thresholdUtilities.checkThreshold(totalPrice);
    var isEligible = apBrandUtilities.isAfterpayApplicable() && !cartProductExcluded;
    var iscashAppApplicable = apSitePreferences.isCashAppEnabled();
    var isWithinThreshold = afterpayLimits.status;

    priceContext.apEligible = isEligible;
    priceContext.apMpid = afterpayLimits.mpid;
    priceContext.apApplicable = isEligible && isWithinThreshold;
    priceContext.cashAppApplicable = iscashAppApplicable && isWithinThreshold;

    return priceContext;
};

module.exports = getTemplateSpecificWidget;
