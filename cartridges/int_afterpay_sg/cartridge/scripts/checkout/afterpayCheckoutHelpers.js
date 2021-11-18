'use strict';
var { checkoutUtilities: apCheckoutUtilities, sitePreferencesUtilities: sitePreferences } = require('*/cartridge/scripts/util/afterpayUtilities');
var thresholdUtilities = require('*/cartridge/scripts/util/thresholdUtilities');
var ArrayList = require('dw/util/ArrayList');
var LogUtils = require('*/cartridge/scripts/util/afterpayLogUtils');
var Logger = LogUtils.getLogger('afterpayCheckoutHelpers');


/* Script Modules */
var ctrlCartridgeName = sitePreferences.getControllerCartridgeName();
var app = require(ctrlCartridgeName + '/cartridge/scripts/app');

var checkoutTools = {
    // splits name into first/last
    splitName: function (singleName) {
        var firstName = singleName.split(' ').slice(0, -1).join(' ');
        var lastName = singleName.split(' ').slice(-1).join(' ');
        return {
            firstName: firstName,
            lastName: lastName
        };
    },
    // currently just strips the leading 1 if it exists
    stripUSPhoneNumberLeadingOne: function (phone) {
        // the current regex used by SiteGenesis is in validator.js (for north america)
        let regex = /^(1-?)(\(?([2-9][0-8][0-9])\)?[\-\. ]?([2-9][0-9]{2})[\-\. ]?([0-9]{4})(\s*x[0-9]+)?)$/;
        let found = phone.match(regex);
        if (found) {
            phone = found[2];
        }
        return phone;
    },
    addConsumerToBasket: function (basket, apConsumer) {
        var Transaction = require('dw/system/Transaction');
        Transaction.wrap(function () {
            basket.setCustomerEmail(apConsumer.email || '');
            basket.setCustomerName((apConsumer.givenNames || '').trim() + ' ' + (apConsumer.givenNames || '').trim());
        });
        // ignoring
        // apConsumer.phoneNumber;
    },
    addBillingAddressToBasket: function (basket, apBilling) {
        var Transaction = require('dw/system/Transaction');
        var billingAddress = basket.billingAddress;
        let name = this.splitName(apBilling.name || '');
        let stripLeadingOne = this.stripUSPhoneNumberLeadingOne;

        Transaction.wrap(function () {
            if (!billingAddress) {
                billingAddress = basket.createBillingAddress();
            }

            billingAddress.setFirstName(name.firstName || '');
            billingAddress.setLastName(name.lastName || '');

            billingAddress.setAddress1(apBilling.line1 || '');
            billingAddress.setAddress2(apBilling.line2 || '');
            billingAddress.setCity(apBilling.area1 || '');
            billingAddress.setPostalCode(apBilling.postcode || '');
            billingAddress.setStateCode(apBilling.region || '');
            billingAddress.setCountryCode(apBilling.countryCode || '');
            if (apBilling.countryCode.toUpperCase() === 'US') {
                billingAddress.setPhone(stripLeadingOne(apBilling.phoneNumber || ''));
            } else {
                billingAddress.setPhone(apBilling.phoneNumber || '');
            }
        });
    },

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
        let name = this.splitName(apShipping.name || '');
        let stripLeadingOne = this.stripUSPhoneNumberLeadingOne;
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
    // returns a Map with storeid's -> addresses. The "NONE" corresponds to
    // items which are not a store pickup
    getInStorePickupsMap: function (basket) {
        // let lineItems = cart.object.getProductLineItems();
        // let storeMap = new Map();
        var storeMap = {};
        let lineItemsIter = basket.allProductLineItems.iterator();
        while (lineItemsIter.hasNext()) {
            let lineItem = lineItemsIter.next();
            if (lineItem.custom.fromStoreId) {
                storeMap[lineItem.custom.fromStoreId] = dw.catalog.StoreMgr.getStore(lineItem.custom.fromStoreId);
            }
        }
        return storeMap;
    },
    getNumHomeDeliveries: function (basket) {
        let cnt = 0;
        let lineItemsIter = basket.allProductLineItems.iterator();
        while (lineItemsIter.hasNext()) {
            let lineItem = lineItemsIter.next();
            if (!lineItem.custom.fromStoreId) {
                ++cnt;
            }
        }
        return cnt;
    },
    shouldEnableExpressPickupMode: function (cart) {
        if (!cart) {
            cart = app.getModel('Cart').get();
        }
        if (!cart) {
            return false;
        }
        let storeMap = this.getInStorePickupsMap(cart.object);
        // items that are being shipped
        let numNonStorePickups = this.getNumHomeDeliveries(cart.object);
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
    getCurrentAfterpayPaymentAmount: function (basket) {
        // Just gets the amount currently associated with the Afterpay payment instrument
        var paymentMethod = apCheckoutUtilities.getPaymentMethodName();
        let pi = basket.getPaymentInstruments(paymentMethod);
        if (pi.length == 0) {
            return new dw.value.Money(0.0, basket.currencyCode);
        }
        let payment = pi[0].getPaymentTransaction();
        if (!payment) {
            return new dw.value.Money(0.0, basket.currencyCode);
        }
        return payment.amount;
    },
    // compute a checksum for the current items in the basket so we can check
    // if anything changed
    computeBasketProductLineItemChecksum: function (ctnr) {
        let crc32 = require('*/cartridge/scripts/util/afterpayUtilities.js').crc32;
        // Should use whatever info we use in building the create checkout
        var lineItems = ctnr.getAllProductLineItems().toArray();
        // let product = li.product;
        let cksum = 0;

        lineItems.map(function (li) {
            let product = li.product;
            // just ignore names. Using quantity/price/currency
            // product can be null if line-item is something like a warranty. Just ignoring those.
            let cc = null;
            let id = null;
            if (product) {
                cc = product.getPriceModel().getPrice().currencyCode.toUpperCase();
                id = product.ID;
            } else {
                cc = li.adjustedNetPrice.currencyCode.toUpperCase();
                id = li.productID;
            }
            let s = '' + li.getQuantity().value + ',' + id + ',' + cc;
            cksum += crc32(s);
            Logger.debug('Line and checksum: ' + s + ' Checksum:' + cksum);
        });
        Logger.debug("Final Checksum" + cksum);
        return cksum;
    },
    // compute a checksum for the current shipping address so we can check
    // if anything changed
    computeBasketShippingChecksum: function (ctnr) {
        let crc32 = require('*/cartridge/scripts/util/afterpayUtilities.js').crc32;
        let address = ctnr.defaultShipment.shippingAddress;
        if (!address) {
            return 0;
        }
        let s = (address.address1 || '') + ',' + (address.address2 || '') + ',' + (address.city || '') + ','
            + (address.stateCode || '').toUpperCase() + ',' + (address.postalCode || '') + ',' + (address.countryCode.value || '').toUpperCase();
        let cksum = crc32(s);
        Logger.debug('Address and checksum: ' + s + ' Checksum:' + cksum);

        return cksum;
    },
    isPriceWithinThreshold: function (price) {
        if (!price) {
            return false;
        }
        var isWithinThreshold = thresholdUtilities.checkThreshold(price);
        return isWithinThreshold.status;
    },
    isBasketAmountWithinThreshold: function () {
        var basket = dw.order.BasketMgr.getCurrentBasket();
        if (!basket) {
            return false;
        }
        let orderTotal = basket.totalGrossPrice.available ? basket.totalGrossPrice : basket.getAdjustedMerchandizeTotalPrice(true).add(basket.giftCertificateTotalPrice);

        var isWithinThreshold = thresholdUtilities.checkThreshold(orderTotal);
        return isWithinThreshold.status;
    },
    // compute a checksum from the Afterpay Response
    // if anything changed
    computeResponseProductLineItemChecksum: function (ctnr) {
        let crc32 = require("*/cartridge/scripts/util/afterpayUtilities.js").crc32;
        // Should use whatever info we use in building the create checkout
        var lineItems = new ArrayList(ctnr.items);
        var apItemsList = lineItems.iterator();
        let cksum = 0;
        while (apItemsList.hasNext()) {
            let apProductLineItem = apItemsList.hasNext() ? apItemsList.next() : '';
            let cc = apProductLineItem.price.currency;
            let id = apProductLineItem.sku ? apProductLineItem.sku : '';
            let s = "" + apProductLineItem.quantity + "," + id + "," + cc;
            cksum += crc32(s);
            Logger.debug("Line and checksum: " + s + " Checksum:" + cksum);
        }
        Logger.debug("Final Checksum" + cksum);
        return cksum;
    }
};

module.exports = checkoutTools;
