'use strict';
var sitePreferences = require("int_afterpay_core/cartridge/scripts/util/AfterpayUtilities.js").getSitePreferencesUtilities();
var ctrlCartridgeName = sitePreferences.getControllerCartridgeName();

/* Script Modules */
var app = require(ctrlCartridgeName + '/cartridge/scripts/app');

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
    setCartShippingMethod: function(cart, shippingMethod) {
        let shippingMethods = dw.order.ShippingMgr.getAllShippingMethods();
        let Transaction = require('dw/system/Transaction');
        Transaction.wrap(function () {
            cart.updateShipmentShippingMethod(cart.getDefaultShipment().getID(), shippingMethod.getID(), shippingMethod, shippingMethods);
            cart.calculate();
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
    calculateCartTaxShipTotals: function(cart) {
        var ShippingMgr = require('dw/order/ShippingMgr');
        let Transaction = require('dw/system/Transaction'); 
        // This should be the in-store pickup. However I guess it can be null for in-store
        //let shipmethod = inMethod || cart.getDefaultShipment().getShippingMethod();
        let shipMethod = cart.getDefaultShipment().getShippingMethod() || ShippingMgr.getDefaultShippingMethod();

        Transaction.wrap(function () {
            cart.updateShipmentShippingMethod(cart.getDefaultShipment().getID(), shipMethod.getID(), null, null);
            cart.calculate();
        });

        // Logic from ordertotals.isml
        let totalCost = cart.object.totalGrossPrice.available ? cart.object.totalGrossPrice
            : cart.object.getAdjustedMerchandizeTotalPrice(true).add(cart.object.giftCertificateTotalPrice)
        let shipCost = cart.object.getAdjustedShippingTotalPrice();
        let taxAmount = new dw.value.Money(0.0, cart.object.currencyCode);
        if (dw.order.TaxMgr.getTaxationPolicy() == dw.order.TaxMgr.TAX_POLICY_NET) {
            if (cart.object.totalTax.available) {
                taxAmount = cart.object.totalTax;
            }
        }

        return {totalCost: totalCost, tax: taxAmount, shippingCost: shipCost};
    }
};

module.exports = storePickupTools;
