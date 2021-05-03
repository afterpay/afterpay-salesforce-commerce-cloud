'use strict';
var collections = require('*/cartridge/scripts/util/collections');
var Transaction = require('dw/system/Transaction');

/**
* removes other payment instruments from basket and saves afterpay
* @param {Object} basket - basket
* @returns {Object} - errors
*/
function Handle(basket) {
    var currentBasket = basket;
    Transaction.wrap(function () {
        var paymentInstruments = currentBasket.getPaymentInstruments();
        collections.forEach(paymentInstruments, function (item) {
            currentBasket.removePaymentInstrument(item);
        });

        currentBasket.createPaymentInstrument(
            'AFTERPAY_PBI', currentBasket.totalGrossPrice
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
