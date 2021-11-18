'use strict';

/* API Includes */
var Money = require('dw/value/Money');
var BasketMgr = require('dw/order/BasketMgr');

/* Script Modules */
var server = require('server');
var apUtilities = require('*/cartridge/scripts/util/afterpayUtilities');
var apBrandUtilities = apUtilities.brandUtilities;
var thresholdUtilities = require('*/cartridge/scripts/util/thresholdUtilities');

server.get('IncludeAfterpayLibrary',
    server.middleware.https,
    server.middleware.include,
    function (req, res, next) {
        var scope = {
            isAfterpayEnabled: apUtilities.sitePreferencesUtilities.isAfterpayEnabled()
        };

        if (scope.isAfterpayEnabled) {
            scope.thresholdAmounts = thresholdUtilities.getThresholdAmounts(apBrandUtilities.getBrand());
        }

        res.render('util/afterpayLibraryInclude', scope);
        next();
    }
);

/**
 *  Retrieve Updated Afterpay widgets
 */
server.get('GetUpdatedWidget',
    server.middleware.https,
    function (req, res, next) {
        var ProductFactory = require('*/cartridge/scripts/factories/product');
        var renderTemplateHelper = require('*/cartridge/scripts/renderTemplateHelper');

        var updatedTemplate = 'util/afterpayMessage';
        var priceContext;
        var totalPrice;

        if (req.querystring.className === 'cart-afterpay-message' || req.querystring.className === 'checkout-afterpay-message') {
            var basketObject = BasketMgr.getCurrentBasket();
            totalPrice = basketObject.totalGrossPrice;
        } else {
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

        var isWithinThreshold = thresholdUtilities.checkThreshold(totalPrice);

        res.json({
            apApplicable: apBrandUtilities.isAfterpayApplicable() && isWithinThreshold.status,
            error: false,
            updatedWidget: updatedWidget
        });

        next();
    });


module.exports = server.exports();
