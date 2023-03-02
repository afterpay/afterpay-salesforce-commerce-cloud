'use strict';

var apCheckoutUtilities = require('*/cartridge/scripts/util/afterpayUtilities').checkoutUtilities;
var AfterpayCOHelpers = require('*/cartridge/scripts/checkout/afterpayCheckoutHelpers');

var checkoutTools = {
    // given a PriceModel, gets the actual price we should use for Afterpay messaging
    getProductPriceForMessaging: function (price) {
        if (price.sales) {
            return price.sales;
        } else if (price.list) {
            return price.list;
        } else if (price.min && price.min.sales) {
            return price.min.sales;
        } else if (price.min && price.min.list) {
            return price.min.list;
        } else if (price.tiers) {
            if (price.tiers[0].price && price.tiers[0].price.sales) {
                return price.tiers[0].price.sales;
            } else if (price.tiers[0].price && price.tiers[0].price.list) {
                return price.tiers[0].price.list;
            }
        }
        return null;
    },
    // copy the shipping address to the default shipment in the basket
    // unless it's an instore pickup shipment
    addShippingAddressToBasket: function (basket, apShipping) {
        var Transaction = require('dw/system/Transaction');
        var shipment = basket.defaultShipment;
        var shippingAddress = shipment.shippingAddress;

        // Only do copy when defaultShipment is not storepickup
        var storepickup = shipment.custom.shipmentType === 'instore';
        if (storepickup) {
            return;
        }

        /*
        there are some utility methods if we need them
        COHelpers.copyShippingAddressToShipment(
            shippingData,
            basket.defaultShipment
        );
        */
        var name = AfterpayCOHelpers.splitName(apShipping.name || '');
        var stripLeadingOne = AfterpayCOHelpers.stripUSPhoneNumberLeadingOne;
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
    shouldEnableExpressPickupMode: function (basket) {
        var currentBasket = basket || dw.order.BasketMgr.getCurrentBasket();
        if (!currentBasket) {
            return false;
        }
        var storeMap = AfterpayCOHelpers.getInStorePickupsMap(currentBasket);
        // items that are being shipped
        var numNonStorePickups = AfterpayCOHelpers.getNumHomeDeliveries(currentBasket);
        if ((numNonStorePickups == 0) && (Object.keys(storeMap).length == 1)) {
            return true;
        }
        return false;
    },
    getCartShipmentType: function (basket) {
        var storeMap = AfterpayCOHelpers.getInStorePickupsMap(basket);
        var numHomeDeliveries = AfterpayCOHelpers.getNumHomeDeliveries(basket);
        var shipmentType = '';

        if ((numHomeDeliveries == 0) && (Object.keys(storeMap).length == 1)) {
            shipmentType = 'SingleStorePickup';
        } else if (((numHomeDeliveries > 0) && (Object.keys(storeMap).length > 0))) {
            shipmentType = 'SplitShipment';
        } else if (Object.keys(storeMap).length > 1) {
            shipmentType = 'MultiplePickup';
        }

        return shipmentType;
    },
    removeAllNonGiftCertificatePayments: function (basket) {
        var PaymentInstrument = require('dw/order/PaymentInstrument');
        var Transaction = require('dw/system/Transaction');
        Transaction.wrap(function () {
            var payInstr = basket.getPaymentInstruments();
            var iter = payInstr.iterator();
            while (iter.hasNext()) {
                var pi = iter.next();
                if (!PaymentInstrument.METHOD_GIFT_CERTIFICATE.equals(pi.getPaymentMethod())) {
                    basket.removePaymentInstrument(pi);
                }
            }
        });
    },
    removeAfterpayPayments: function (basket) {
        var Transaction = require('dw/system/Transaction');
        var paymentMethod = apCheckoutUtilities.getPaymentMethodName();
        Transaction.wrap(function () {
            var payInstr = basket.getPaymentInstruments(paymentMethod);
            var iter = payInstr.iterator();
            while (iter.hasNext()) {
                var pi = iter.next();
                basket.removePaymentInstrument(pi);
            }
        });
    },
    calculateAndSetPaymentAmount: function (basket) {
        var Transaction = require('dw/system/Transaction');
        var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');
        var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
        var cartHelper = require('*/cartridge/scripts/cart/cartHelpers');

        Transaction.wrap(function () {
            cartHelper.ensureAllShipmentsHaveMethods(basket);
            basketCalculationHelpers.calculateTotals(basket);
        });

        // Re-calculate the payments.
        COHelpers.calculatePaymentTransaction(
            basket
        );
    }
};

module.exports = checkoutTools;
