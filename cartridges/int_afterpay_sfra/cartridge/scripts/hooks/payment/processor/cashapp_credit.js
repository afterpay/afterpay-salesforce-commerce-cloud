'use strict';

/* API Includes */
var Transaction = require('dw/system/Transaction');

/* Script Modules */
var collections = require('*/cartridge/scripts/util/collections');

/**
* removes other payment instruments from basket and saves afterpay
* @param {Object} basket - basket
* @returns {Object} - errors
*/
function Handle(basket) {
    var currentBasket = basket;
    var { checkoutUtilities } = require('*/cartridge/scripts/util/afterpayUtilities');
    var paymentMethodName = checkoutUtilities.getPaymentMethodName(true);

    if (!paymentMethodName) {
        return {
            error: true
        };
    }

    Transaction.wrap(function () {
        var paymentInstruments = currentBasket.getPaymentInstruments();
        collections.forEach(paymentInstruments, function (item) {
            currentBasket.removePaymentInstrument(item);
        });

        currentBasket.createPaymentInstrument(
            paymentMethodName, currentBasket.totalGrossPrice
        );
    });

    return { fieldErrors: {}, serverErrors: [], error: false };
}

/**
 * authorizes the payment processor
 * @returns {Object} - errors
 */
function Authorize() {
    return { fieldErrors: {}, serverErrors: [], error: false };
}

exports.Handle = Handle;
exports.Authorize = Authorize;
