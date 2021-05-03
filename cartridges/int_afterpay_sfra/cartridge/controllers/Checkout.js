'use strict';

var server = require('server');

var Checkout = module.superModule;
server.extend(Checkout);

var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var consentTracking = require('*/cartridge/scripts/middleware/consentTracking');
var showAfterpayPayment = require('*/cartridge/scripts/util/afterpayUtils').showAfterpayPayment();

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
        var priceContext;
        priceContext = require('*/cartridge/scripts/util/getTemplateSpecificWidget').getCheckoutWidgetData(currentBasket, 'checkout-afterpay-message');
        var afterpayForm = server.forms.getForm('afterpay');

        res.render('checkout/checkout', {
            afterpayApiError: afterpayErrorResponse,
            showAfterpayPayment: showAfterpayPayment,
            priceContext: priceContext,
            customForms: {
                afterpayForm: afterpayForm
            }
        });

        return next();
    }
);


module.exports = server.exports();
