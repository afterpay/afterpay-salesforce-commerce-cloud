'use strict';

var server = require('server');

var Checkout = module.superModule;
server.extend(Checkout);

var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var consentTracking = require('*/cartridge/scripts/middleware/consentTracking');

/**
 * Main entry point for Checkout
 */

/**
* overrides Begin method to show afterpay error message
*/
server.append(
    'Begin',
    server.middleware.https,
    consentTracking.consent,
    csrfProtection.generateToken,
    function (req, res, next) {
        var BasketMgr = require('dw/order/BasketMgr');
        var currentBasket = BasketMgr.getCurrentBasket();
        var afterpayErrorResponse = req.querystring.afterpayErrorMessage;
        var afterpayForm = server.forms.getForm('afterpay');
        var sitePreferencesUtilities = require('*/cartridge/scripts/util/afterpayUtilities').sitePreferencesUtilities;
        var priceContext;
        if (sitePreferencesUtilities.isAfterpayEnabled()) {
            priceContext = require('*/cartridge/scripts/util/getTemplateSpecificWidget').getCheckoutWidgetData(
                currentBasket,
                'checkout-afterpay-message',
                req.locale.id
            );
            res.render('checkout/checkout', {
                afterpayApiError: afterpayErrorResponse,
                priceContext: priceContext,
                customForms: {
                    afterpayForm: afterpayForm
                }
            });
        }
        return next();
    }
);

module.exports = server.exports();
