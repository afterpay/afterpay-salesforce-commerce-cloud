'use strict';

var Class = require('~/cartridge/scripts/util/Class').Class;

var ExpressCheckoutModel = Class.extend({
    // Note: These correspond to fields that were added to PaymentTransaction
    // for Express Checkout support
	apExpressCheckout: false,
    apExpressCheckoutChecksum: "",

    // Note: These are not persisted.
    apTempShippingAddressChanged: false,
    apTempBasketItemsChanged: false,
    apTempCheckoutAmountChanged: null
});

module.exports = ExpressCheckoutModel;