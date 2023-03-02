'use strict';

var AfterpayUtilities = require('*/cartridge/scripts/util/afterpayUtilities.js');
var sitePreferences = AfterpayUtilities.sitePreferencesUtilities;
var ShippingMgr = require('dw/order/ShippingMgr');

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
        var shippingMethods = ShippingMgr.getAllShippingMethods();
        var shipMethods = shippingMethods.toArray().filter(function (method) {
            return method.ID == shipId;
        });
        return shipMethods[0] || null;
    },
    setCartShippingMethod: function (cart, shippingMethod) {
        var shippingMethods = ShippingMgr.getAllShippingMethods();
        var Transaction = require('dw/system/Transaction');
        Transaction.wrap(function () {
            cart.updateShipmentShippingMethod(cart.getDefaultShipment().getID(), shippingMethod.getID(), shippingMethod, shippingMethods);
            cart.calculate();
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
    calculateCartTaxShipTotals: function (cart) {
        var Transaction = require('dw/system/Transaction');
        // This should be the in-store pickup. However I guess it can be null for in-store
        // var shipmethod = inMethod || cart.getDefaultShipment().getShippingMethod();
        var shipMethod = cart.getDefaultShipment().getShippingMethod() || ShippingMgr.getDefaultShippingMethod();

        Transaction.wrap(function () {
            cart.updateShipmentShippingMethod(cart.getDefaultShipment().getID(), shipMethod.getID(), null, null);
            cart.calculate();
        });

        // Logic from ordertotals.isml
        var totalCost = cart.object.totalGrossPrice.available ? cart.object.totalGrossPrice
            : cart.object.getAdjustedMerchandizeTotalPrice(true).add(cart.object.giftCertificateTotalPrice);
        var shipCost = cart.object.getAdjustedShippingTotalPrice();
        var taxAmount = new dw.value.Money(0.0, cart.object.currencyCode);
        if (dw.order.TaxMgr.getTaxationPolicy() == dw.order.TaxMgr.TAX_POLICY_NET) {
            if (cart.object.totalTax.available) {
                taxAmount = cart.object.totalTax;
            }
        }

        return { totalCost: totalCost, tax: taxAmount, shippingCost: shipCost };
    }
};

module.exports = storePickupTools;
