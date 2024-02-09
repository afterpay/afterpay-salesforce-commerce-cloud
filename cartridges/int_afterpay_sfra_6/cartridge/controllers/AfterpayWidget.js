'use strict';

/* API Includes */
var Money = require('dw/value/Money');
var BasketMgr = require('dw/order/BasketMgr');

/* Script Modules */
var server = require('server');
var apUtilities = require('*/cartridge/scripts/util/afterpayUtilities');
var thresholdUtilities = require('*/cartridge/scripts/util/thresholdUtilities');

server.get('IncludeAfterpayLibrary', server.middleware.https, server.middleware.include, function (req, res, next) {
    var apSitePreferencesUtilities = apUtilities.sitePreferencesUtilities;
    if (apSitePreferencesUtilities.isAfterpayEnabled()) {
        var scope = {
            apJavascriptURL: apSitePreferencesUtilities.getJavascriptURL() || null
        };
        if (scope.apJavascriptURL) {
            res.render('util/afterpayLibraryInclude', scope);
            next();
        }
    }
});

/**
 *  Retrieve Updated Afterpay widgets
 */
server.get('GetUpdatedWidget', server.middleware.https, function (req, res, next) {
    var renderTemplateHelper = require('*/cartridge/scripts/renderTemplateHelper');
    var updatedTemplate = 'util/afterpayMessage';
    var priceContext;
    var totalPrice;
    var AfterpayCOHelpers = require('*/cartridge/scripts/checkout/afterpayCheckoutHelpers');
    var reqProductID = '';
    var isWithinThreshold = AfterpayCOHelpers.isPDPBasketAmountWithinThreshold();
    var apBrandUtilities = apUtilities.brandUtilities;

    var currencyCode = req.session.currency.currencyCode;
    var apEligible = apBrandUtilities.isAfterpayApplicable();

    if (req.querystring.className === 'pdp-afterpay-message') {
        totalPrice = req.querystring.updatedPrice;
        if (!empty(totalPrice)) {
            totalPrice = new Money(totalPrice, currencyCode);
        }
        reqProductID = req.querystring.productID;
        apEligible = !AfterpayCOHelpers.checkRestrictedProducts(reqProductID);
    } else if (req.querystring.className === 'cart-afterpay-message') {
        var currentBasket = BasketMgr.getCurrentBasket();
        var cartData = AfterpayCOHelpers.getCartData();
        totalPrice = currentBasket.totalGrossPrice;
        apEligible = cartData.apCartEligible;
        reqProductID = cartData.apProductIDs;
    }
    var afterpayLimits = thresholdUtilities.checkThreshold(totalPrice);

    priceContext = {
        classname: req.querystring.className,
        totalprice: totalPrice.value ? totalPrice.value : totalPrice,
        eligible: apEligible,
        mpid: afterpayLimits.mpid,
        approductids: reqProductID
    };

    var updatedWidget = renderTemplateHelper.getRenderedHtml(
        priceContext,
        updatedTemplate
    );

    res.json({
        apApplicable: (isWithinThreshold && afterpayLimits.status) && apEligible,
        error: false,
        updatedWidget: updatedWidget
    });

    next();
});

server.get('updateCheckoutWidget', server.middleware.https, function (req, res, next) {
    var renderTemplateHelper = require('*/cartridge/scripts/renderTemplateHelper');
    var updatedTemplate = 'util/afterpayMessage';
    var priceContext;
    var currentBasket = BasketMgr.getCurrentBasket();
    var totalPrice = currentBasket.totalGrossPrice;
    var afterpayLimits = thresholdUtilities.checkThreshold(totalPrice);

    priceContext = {
        totalprice: totalPrice.value ? totalPrice.value : totalPrice,
        mpid: afterpayLimits.mpid,
        classname: 'checkout-afterpay-message'
    };

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

server.get('IncludeAfterpayMessage',
    server.middleware.include,
    function (req, res, next) {
        var ProductFactory = require('*/cartridge/scripts/factories/product');

        res.setViewData({
            product: ProductFactory.get(req.querystring)
        });

        var priceContext = require('*/cartridge/scripts/util/getTemplateSpecificWidget').getWidgetData(
            ProductFactory.get(req.querystring),
            'pdp-afterpay-message',
            req.session.currency.currencyCode,
            req.locale.id
        );

        res.render('util/afterpayMessageInclude', priceContext);
        next();
    });

module.exports = server.exports();
