'use strict';
var { sitePreferencesUtilities: sitePreferences } = require('*/cartridge/scripts/util/afterpayUtilities');
var AfterpayCOHelpers = require('*/cartridge/scripts/checkout/afterpayCheckoutHelpers');


/* Script Modules */
var ctrlCartridgeName = sitePreferences.getControllerCartridgeName();
var app = require(ctrlCartridgeName + '/cartridge/scripts/app');

var checkoutTools = {
    addShippingAddressToBasket: function (basket, apShipping) {
        var Transaction = require('dw/system/Transaction');
        var shipment = basket.defaultShipment;
        var shippingAddress = shipment.shippingAddress;

        /*
        there are some utility methods if we need them
        COHelpers.copyShippingAddressToShipment(
            shippingData,
            basket.defaultShipment
        );
        */
        let name = AfterpayCOHelpers.splitName(apShipping.name || '');
        let stripLeadingOne = AfterpayCOHelpers.stripUSPhoneNumberLeadingOne;
        Transaction.wrap(function () {
            if (shippingAddress === null) {
                shippingAddress = shipment.createShippingAddress();
            }
            shippingAddress.setFirstName(name.firstName || '');
            shippingAddress.setLastName(name.lastName || '');
            shippingAddress.setAddress1(apShipping.line1 || '');
            shippingAddress.setAddress2(apShipping.line2 || '');
            shippingAddress.setCity(apShipping.area1 || '');
            shippingAddress.setPostalCode(apShipping.postcode || '');
            shippingAddress.setStateCode(apShipping.region || '');
            shippingAddress.setCountryCode(apShipping.countryCode || '');
            if (apShipping.countryCode.toUpperCase() === 'US') {
                shippingAddress.setPhone(stripLeadingOne(apShipping.phoneNumber || ''));
            } else {
                shippingAddress.setPhone(apShipping.phoneNumber || '');
            }
        });
    },
    getShippingMethodsForAddress: function (cart, apShipping) {
        var TransientAddress = app.getModel('TransientAddress');
        var address = new TransientAddress();
        address.countryCode = apShipping.countryCode || '';
        address.stateCode = apShipping.region || '';
        address.postalCode = apShipping.postcode || '';
        address.city = apShipping.area1 || '';
        address.address1 = apShipping.line1 || '';
        address.address2 = apShipping.line2 || '';

        var applicableShippingMethods = cart.getApplicableShippingMethods(address);
        return applicableShippingMethods;
    },
    getDefaultShippingMethodForAddress: function (cart, apShipping) {
        let shipMethods = this.getShippingMethodsForAddress(cart, apShipping);
        let shipIter = shipMethods.iterator();
        while (shipIter.hasNext()) {
            let shipMethod = shipIter.next();
            if (shipMethod.defaultMethod == true) {
                return shipMethod;
            }
        }
        return null;
    },
    shouldEnableExpressPickupMode: function (cart) {
        if (!cart) {
            cart = app.getModel('Cart').get();
        }
        if (!cart) {
            return false;
        }
        let storeMap = AfterpayCOHelpers.getInStorePickupsMap(cart.object);
        // items that are being shipped
        let numNonStorePickups = AfterpayCOHelpers.getNumHomeDeliveries(cart.object);
        if ((numNonStorePickups == 0) && (Object.keys(storeMap).length == 1)) {
            return true;
        }
        return false;
    },
    removeAllNonGiftCertificatePayments: function (cart) {
        let PaymentInstrument = require('dw/order/PaymentInstrument');

        let payInstr = cart.getPaymentInstruments();
        let iter = payInstr.iterator();
        while (iter.hasNext()) {
            let pi = iter.next();
            if (!PaymentInstrument.METHOD_GIFT_CERTIFICATE.equals(pi.getPaymentMethod())) {
                cart.removePaymentInstrument(pi);
            }
        }
    },
    disableSummaryForAfterpay: function (cart, viewContext) {
        var afterpayEnable = sitePreferences.isAfterpayEnabled();
        var expressCheckoutEnable = sitePreferences.isExpressCheckoutEnabled();
        let isExpressCheckout = require('*/cartridge/scripts/util/afterpaySession').isExpressCheckout();
    
        var apPaymentInstrument;
        var iter = cart.object.getPaymentInstruments().iterator();
    
        while (iter.hasNext()) {
            apPaymentInstrument = iter.next();
    
            // don't disable summary for express checkout when the current order is an express checkout order.
            // Non-express-checkout still skips summary screen
            if ((expressCheckoutEnable && isExpressCheckout) || afterpayEnable == false || apPaymentInstrument.paymentMethod !== 'AFTERPAY' || apPaymentInstrument.paymentMethod !== 'CLEARPAY') {
                app.getView(viewContext).render('checkout/summary/summary');
            }
        }
    }
};

module.exports = checkoutTools;
