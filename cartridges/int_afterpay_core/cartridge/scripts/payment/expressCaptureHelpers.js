'use strict';

var ExpressCaptureRequestBuilder = require('*/cartridge/scripts/payment/expressCaptureRequestBuilder');

var ExpressCaptureHelpers = {
    generateItemsAndShippingBody: function (lineItemCtnr) {
        var expressCaptureRequestBuilder = new ExpressCaptureRequestBuilder();

        var body = expressCaptureRequestBuilder.buildRequest({
            basket: lineItemCtnr
        }).get();
        return body;
    }
};

module.exports = ExpressCaptureHelpers;
