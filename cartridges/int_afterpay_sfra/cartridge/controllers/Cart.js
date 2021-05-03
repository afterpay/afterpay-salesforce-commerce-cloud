'use strict';

var server = require('server');

var Cart = module.superModule;
server.extend(Cart);

var sitePreferences = require('*/cartridge/scripts/util/afterpayUtilities').sitePreferencesUtilities;
/**
* prepends Cart-Show method to show afterpay widget
*/
server.prepend(
    'Show',
    server.middleware.https,
    function (req, res, next) {
        var BasketMgr = require('dw/order/BasketMgr');
        var currentBasket = BasketMgr.getCurrentBasket();
        var enabledAfterpay = sitePreferences.isAfterpayEnabled();
        if (enabledAfterpay) {
            require('*/cartridge/scripts/util/afterpayCallThreshold.js').setThreshold();
            var priceContext;
            priceContext = require('*/cartridge/scripts/util/getTemplateSpecificWidget').getCheckoutWidgetData(currentBasket, 'cart-afterpay-message');
            res.setViewData(priceContext);
        }
        next();
    }
);

module.exports = server.exports();
