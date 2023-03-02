'use strict';

var AfterpayUtilities = require('*/cartridge/scripts/util/afterpayUtilities.js');
var sitePreferences = AfterpayUtilities.sitePreferencesUtilities;

var storePickupTools = {
    getStorePickupMethodSet: function () {
        var storePickupMethods = sitePreferences.getStorePickupShippingMethodIDs();
        var arr = storePickupMethods.split(',').map(function (item) {
            return item.trim();
        });
        var storePickupSet = new dw.util.HashSet();
        storePickupSet.add(arr);
        return storePickupSet;
    },
    getShippingMethodForID: function (shipId) {
        var shippingMethods = dw.order.ShippingMgr.getAllShippingMethods();
        var shipMethods = shippingMethods.toArray().filter(function (method) {
            return method.ID == shipId;
        });
        return shipMethods[0] || null;
    },
    setBasketShippingMethod: function (basket, shippingMethodID) {
        var ShippingHelper = require('*/cartridge/scripts/checkout/shippingHelpers');
        var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');

        var shipment = basket.defaultShipment;
        var Transaction = require('dw/system/Transaction');
        Transaction.wrap(function () {
            ShippingHelper.selectShippingMethod(shipment, shippingMethodID);
            basketCalculationHelpers.calculateTotals(basket);
        });
    },
    getInstorePickupShipMethodFromCart: function (cart) {
        var plis = cart.getAllProductLineItems();
        for (var i = 0; i < plis.length; i++) {
            var pli = plis[i];
            if (pli.shipment.shippingMethod && pli.shipment.shippingMethod.custom.storePickupEnabled) {
                var method = pli.shipment.shippingMethod;
                return method;
            }
        }
        return null;
    },
    calculateBasketTaxShipTotals: function (req, basket) {
        // mostly logic from Checkout-Begin
        var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
        var parsePrice = require('~/cartridge/scripts/util/parsePriceAfterpay.js');
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

        var grandTotal = parsePrice(basketModel.totals.grandTotal).toString();
        var taxTotal = parsePrice(basketModel.totals.totalTax).toString();
        var shipTotal = parsePrice(basketModel.totals.totalShippingCost).toString();
        return {
            totalCost: new dw.value.Money(grandTotal, basket.currencyCode),
            tax: new dw.value.Money(taxTotal, basket.currencyCode),
            shippingCost: new dw.value.Money(shipTotal, basket.currencyCode)
        };
    }
};

module.exports = storePickupTools;
