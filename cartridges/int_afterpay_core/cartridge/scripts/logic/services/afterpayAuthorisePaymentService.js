'use strict';
var afterpayHttpService = require('*/cartridge/scripts/logic/services/afterpayHttpService');
var afterpayUtils = require('*/cartridge/scripts/util/afterpayUtils');

/**
 *  request and response definitions for payment service type 'authorise'
 */
var AuthorisePaymentService = {
    generateRequest: function (order, token, orderNo, amount, expressCheckoutModel) {
        var requestUrl = afterpayUtils.getEndpoint('authorise');
        var requestBody = null;

        if (expressCheckoutModel && expressCheckoutModel.apExpressCheckout) {
            // check the session state:
            var shippingObj = null;
            var itemsObj = null;
            var isCheckoutAdjusted = false;
            let CaptureHelpers = require('*/cartridge/scripts/payment/expressCaptureHelpers');
            let body = CaptureHelpers.generateItemsAndShippingBody(order);
            if (expressCheckoutModel.apTempShippingAddressChanged) {
                shippingObj = body.shipping;
                isCheckoutAdjusted = true;
            }
            if (expressCheckoutModel.apTempBasketItemsChanged) {
                itemsObj = body.items;
                isCheckoutAdjusted = true;
            }
            // Possibly account for coupons, or possibly other factors
            if (expressCheckoutModel.apTempCheckoutAmountChanged) {
                isCheckoutAdjusted = true;
            }
            // express checkout has 2 types of capture. One is with the Afterpay widget (has checksum)
            // and one does not (usually BuyNow)
            if (expressCheckoutModel.apExpressCheckoutChecksum) {
                requestBody = this.generateRequestBodyExpressCheckoutWithChecksum(token, orderNo,
                    amount, expressCheckoutModel.apExpressCheckoutChecksum, itemsObj, shippingObj, isCheckoutAdjusted);
            } else {
                requestBody = this.generateRequestBodyExpressCheckout(token, orderNo, amount);
            }
        } else {
            requestBody = this.generateRequestBody(token, orderNo);
        }
        return {
            requestBody: requestBody,
            requestUrl: requestUrl
        };
    },

    getResponse: function (requestUrl, requestBody) {
        var service = afterpayHttpService.getAfterpayHttpService();
        var result = service.call(requestUrl, requestBody);
        var response = afterpayUtils.handleServiceResponses(requestUrl, 'AUTHORISE_PAYMENT', result, requestBody);
        return response;
    },

    generateRequestBody: function (token, orderNo) {
        var requestBody = {
            token: token,
            merchantReference: orderNo,
            requestMethod: 'POST'
        };
        return requestBody;
    },

    generateRequestBodyExpressCheckout: function (token, orderNo, amount) {
        var requestBody = {
            token: token,
            merchantReference: orderNo,
            requestMethod: 'POST',
            amount: { amount: amount.value, currency: amount.currencyCode }
        };
        return requestBody;
    },
    generateRequestBodyExpressCheckoutWithChecksum: function (token, orderNo, amount, checksum, itemsObj, shippingObj, isCheckoutAdjusted) {
        var requestBody = {
            token: token,
            merchantReference: orderNo,
            requestMethod: 'POST',
            isCheckoutAdjusted: isCheckoutAdjusted,
            amount: { amount: amount.value, currency: amount.currencyCode }
        };
        if (shippingObj) {
            requestBody.shipping = shippingObj;
        }
        if (itemsObj) {
            requestBody.items = itemsObj;
        }
        if (isCheckoutAdjusted || shippingObj || itemsObj) {
            requestBody.paymentScheduleChecksum = checksum;
        }
        return requestBody;
    }
};

module.exports = AuthorisePaymentService;
