'use strict';

var server = require('server');

/**
 *  Retrieve Updated Afterpay widgets
 */
var BasketMgr = require('dw/order/BasketMgr');
var ProductMgr = require('dw/catalog/ProductMgr');
server.get('GetUpdatedWidget',
    server.middleware.https,
    function (req, res, next) {
        var apMessageService = require('*/cartridge/scripts/util/afterpayDisplayProductMessage');
        var renderTemplateHelper = require('*/cartridge/scripts/renderTemplateHelper');
        var updatedTemplate = 'util/afterpayMessage';
        var thresholdResponse;
        var priceContext;
        var installmentAmount;
        var totalPrice = 0;
        if (req.querystring.className === 'cart-afterpay-message' || req.querystring.className === 'checkout-afterpay-message') {
            var basketObject = BasketMgr.getCurrentBasket();
            totalPrice = basketObject.totalGrossPrice;
            installmentAmount = apMessageService.getPLPMessage(totalPrice);
        } else {
            var productID = req.querystring.productID;
            var productObject = ProductMgr.getProduct(productID);
            totalPrice = productObject.priceModel.price.available ? productObject.priceModel.price.decimalValue : req.querystring.updatedProductPrice;
            installmentAmount = apMessageService.getPDPMessage(totalPrice);
        }
        priceContext = { message: installmentAmount, classname: req.querystring.className };
        thresholdResponse = apMessageService.getThresholdRange(totalPrice);
        if (thresholdResponse && thresholdResponse.belowThreshold) {
            priceContext = { belowthreshold: thresholdResponse.belowThreshold, minthresholdamount: thresholdResponse.minAmount, maxthresholdamount: thresholdResponse.maxAmount, classname: req.querystring.className };
        } else if (thresholdResponse && thresholdResponse.aboveThreshold) {
            priceContext = { abovethreshold: thresholdResponse.aboveThreshold, minthresholdamount: thresholdResponse.minAmount, maxthresholdamount: thresholdResponse.maxAmount, classname: req.querystring.className };
        }
        var updatedWidget = renderTemplateHelper.getRenderedHtml(
                priceContext,
                updatedTemplate
        );
        res.json({
            error: false,
            updatedWidget: updatedWidget
        });
        next();
    });


module.exports = server.exports();
