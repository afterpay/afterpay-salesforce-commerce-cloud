'use strict';
var sitePreferences = require("~/cartridge/scripts/util/AfterpayUtilities.js").getSitePreferencesUtilities();

var storePickupTools = {
    getStorePickupMethodSet: function() {
        let storePickupMethods = sitePreferences.getStorePickupShippingMethodIDs();
        let arr = storePickupMethods.split(',').map(function(item) {
            return item.trim();
        });
        let storePickupSet = new dw.util.HashSet();
        storePickupSet.add(arr);
        return storePickupSet;
    },
    getShippingMethodForID: function(shipId) {
        let shippingMethods = dw.order.ShippingMgr.getAllShippingMethods();
        let shipMethods = shippingMethods.toArray().filter(function(method) {
            return method.ID == shipId;
        })
        return shipMethods[0] || null;
    },
    setBasketShippingMethod: function(basket, shippingMethodID) {
        var ShippingHelper = require('*/cartridge/scripts/checkout/shippingHelpers');
        var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');

        let shipment = basket.defaultShipment;
        let Transaction = require('dw/system/Transaction');
        Transaction.wrap(function () {
            ShippingHelper.selectShippingMethod(shipment, shippingMethodID);
            basketCalculationHelpers.calculateTotals(basket);
        });
    },
    getInstorePickupShipMethodFromCart: function(cart) {
        let plis = cart.getAllProductLineItems();
        for (var i = 0; i < plis.length; i++) {
            var pli = plis[i];
            if (pli.shipment.shippingMethod && pli.shipment.shippingMethod.custom.storePickupEnabled) {
                let method = pli.shipment.shippingMethod;
                return method;
            }
        }
        return null;
    },
    calculateBasketTaxShipTotals: function(req, basket) {
        // mostly logic from Checkout-Begin
        var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
        var cartHelper = require('*/cartridge/scripts/cart/cartHelpers');
        var OrderModel = require('*/cartridge/models/order');
        var Locale = require('dw/util/Locale');
        var Transaction = require('dw/system/Transaction');

        var currentLocale = Locale.getLocale(req.locale.id);
        var usingMultiShipping = req.session.privacyCache.get('usingMultiShipping');

        Transaction.wrap(function () {
            COHelpers.ensureNoEmptyShipments(req);
            cartHelper.ensureAllShipmentsHaveMethods(basket);
        });
        if (basket.currencyCode !== req.session.currency.currencyCode) {
            Transaction.wrap(function () {
                basket.updateCurrency();
            });
        }

        COHelpers.recalculateBasket(basket);

        // Loop through all shipments and make sure all are valid
        var allValid = COHelpers.ensureValidShipments(basket);

        var basketModel = new OrderModel(
            basket,
            {
                usingMultiShipping: usingMultiShipping,
                shippable: allValid,
                countryCode: currentLocale.country,
                containerView: 'basket'
            }
        );

        let grandTotal = basketModel.totals.grandTotal.replace(/\$/g, '');
        let taxTotal = basketModel.totals.totalTax.replace(/\$/g, '');
        let shipTotal = basketModel.totals.totalShippingCost.replace(/\$/g, '');

        return {totalCost: new dw.value.Money(grandTotal, basket.currencyCode),
            tax: new dw.value.Money(taxTotal, basket.currencyCode),
            shippingCost: new dw.value.Money(shipTotal, basket.currencyCode)};
    }
};

module.exports = storePickupTools;
