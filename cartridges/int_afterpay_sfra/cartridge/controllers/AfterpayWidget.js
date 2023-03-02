'use strict';

/* API Includes */
var Money = require('dw/value/Money');

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
    var isWithinThreshold = AfterpayCOHelpers.isPDPBasketAmountWithinThreshold();

    if (req.querystring.className === 'pdp-afterpay-message') {
        var currencyCode = req.session.currency.currencyCode;
        totalPrice = req.querystring.updatedProductPrice;

        if (!empty(totalPrice)) {
            totalPrice = new Money(totalPrice, currencyCode);
        }
    }

    priceContext = {
        classname: req.querystring.className,
        totalprice: totalPrice.value,
        brand: apBrandUtilities.getBrand()
    };

    var updatedWidget = renderTemplateHelper.getRenderedHtml(
        priceContext,
        updatedTemplate
    );

    isWithinThreshold = isWithinThreshold && thresholdUtilities.checkPriceThreshold(priceContext.totalprice).status;

    res.json({
        apApplicable: apBrandUtilities.isAfterpayApplicable(),
        withinThreshold: isWithinThreshold,
        error: false,
        updatedWidget: updatedWidget
    });

    next();
});

module.exports = server.exports();
