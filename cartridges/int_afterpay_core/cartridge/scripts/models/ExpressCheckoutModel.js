'use strict';

var sitePreferences = require("~/cartridge/scripts/util/AfterpayUtilities.js").getSitePreferencesUtilities();
var ctrlCartridgeName = sitePreferences.getControllerCartridgeName();
var Class 		= require(ctrlCartridgeName + '/cartridge/scripts/util/Class').Class;

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