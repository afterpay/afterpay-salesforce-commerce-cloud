'use strict';
var apMessageService = require('*/cartridge/scripts/util/afterpayDisplayProductMessage');

var getTemplateSpecificWidget = {};

/**
* Hide sensitive details like customer details on request for logging purpose
* @param {string} productObject - product object
* @param {string} className - widget specific classname
* @returns {string} - request JSON
*/
getTemplateSpecificWidget.getWidgetData = function (productObject, className) {
    var priceContext;
    var totalPrice = 0.0;
    var installmentAmount = 0.0;
    if (productObject.productType === 'set' && productObject.individualProducts) {
        getTemplateSpecificWidget.getWidgetDataForSet(productObject, className);
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
        if (className === 'plp-afterpay-message') {
            installmentAmount = apMessageService.getPLPMessage(totalPrice);
        } else {
            installmentAmount = apMessageService.getPDPMessage(totalPrice);
        }
        var thresholdResponse = apMessageService.getThresholdRange(totalPrice);
        if (thresholdResponse && thresholdResponse.withInThreshold) {
            priceContext = { message: installmentAmount, classname: className, thresholdResponse: thresholdResponse };
        } else {
            priceContext = { classname: className, thresholdResponse: thresholdResponse };
        }
    }
    return priceContext;
};

getTemplateSpecificWidget.getWidgetDataForSet = function (productObject, className) {
    var totalPrice = 0.0;
    if (productObject.productType === 'set') {
        var afterpayWidgetData = {};
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
            var installmentAmount = apMessageService.getPLPMessage(totalPrice);
            var thresholdResponse = apMessageService.getThresholdRange(totalPrice);
            if (thresholdResponse && thresholdResponse.withInThreshold) {
                afterpayWidgetData = {
                    message: installmentAmount,
                    classname: className,
                    thresholdResponse: thresholdResponse
                };
            } else {
                afterpayWidgetData = {
                    classname: className,
                    thresholdResponse: thresholdResponse
                };
            }
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
* Hide sensitive details like customer details on request for logging purpose
* @param {string} currentBasket - product object
* @param {string} className - widget specific classname
* @returns {string} - request JSON
*/
getTemplateSpecificWidget.getCheckoutWidgetData = function (currentBasket, className) {
    var priceContext;
    var totalPrice = 0.0;
    totalPrice = currentBasket.totalGrossPrice;
    var installmentAmount = apMessageService.getPDPMessage(totalPrice);
    var thresholdResponse = apMessageService.getThresholdRange(totalPrice);
    if (thresholdResponse && thresholdResponse.withInThreshold) {
        priceContext = { message: installmentAmount, classname: className, thresholdResponse: thresholdResponse };
    } else {
        priceContext = { classname: className, thresholdResponse: thresholdResponse };
    }
    return priceContext;
};

module.exports = getTemplateSpecificWidget;
