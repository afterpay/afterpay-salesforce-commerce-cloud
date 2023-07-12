'use strict';

/* API Includes */
var Money = require('dw/value/Money');
var BasketMgr = require('dw/order/BasketMgr');

/* Script Modules */
var server = require('server');
var apUtilities = require('*/cartridge/scripts/util/afterpayUtilities');
var apBrandUtilities = apUtilities.brandUtilities;
var thresholdUtilities = require('*/cartridge/scripts/util/thresholdUtilities');

server.get('IncludeAfterpayLibrary', server.middleware.https, server.middleware.include, function (req, res, next) {
    var scope = {
        isAfterpayEnabled: apUtilities.sitePreferencesUtilities.isAfterpayEnabled()
    };

    if (scope.isAfterpayEnabled) {
        scope.thresholdAmounts = thresholdUtilities.getThresholdAmounts(apBrandUtilities.getBrand());
    }

    res.render('util/afterpayLibraryInclude', scope);
    next();
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
    var reqProductID = req.querystring.productID;
    var isWithinThreshold = AfterpayCOHelpers.isPDPBasketAmountWithinThreshold();

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
        totalPrice = currentBasket.totalGrossPrice;
        apEligible = !AfterpayCOHelpers.checkRestrictedCart();
    }

    priceContext = {
        classname: req.querystring.className,
        totalprice: totalPrice.value ? totalPrice.value : totalPrice,
        brand: apBrandUtilities.getBrand(),
        eligible: apEligible
    };

    var updatedWidget = renderTemplateHelper.getRenderedHtml(
        priceContext,
        updatedTemplate
    );

    var afterpayLimits = thresholdUtilities.checkThreshold(totalPrice);

    res.json({
        apApplicable: (isWithinThreshold && afterpayLimits.status) && apEligible,
        error: false,
        updatedWidget: updatedWidget
    });

    next();
});

module.exports = server.exports();
