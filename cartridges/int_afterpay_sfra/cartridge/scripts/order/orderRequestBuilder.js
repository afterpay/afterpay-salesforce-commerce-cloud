/* global empty */
(function () {
    'use strict';

    var Builder = require('../util/builder');
    var Order = require('./order').Order;
    var LineItem = require('./order').LineItem;
    var Discount = require('./order').Discount;
    var afterpayWebServiceUtilities = require('*/cartridge/scripts/util/afterpayUtilities').sitePreferencesUtilities;
    var PAYMENT_MODE = require('*/cartridge/scripts/util/afterpayConstants').PAYMENT_MODE;
    var Resource = require('dw/web/Resource');

    /**
     * defines order request object
    */
    function orderRequestBuilder() {
        this.context = null;
    }

    orderRequestBuilder.prototype = new Builder();
    orderRequestBuilder.prototype.get = function () {
        return this.context;
    };

    /**
     * validates request params
     * @param {Object} params - params
    */
    function handleRequire(params) {
        if (empty(params) ||
                empty(params.basket) ||
                empty(params.basket.billingAddress) ||
                empty(params.basket.defaultShipment.shippingAddress)) {
            throw new Error('404');
        }
    }

    /**
     * Build request here
     * @param {Object} params - parameters
     * @returns {Object} - this main object itself
    */
    orderRequestBuilder.prototype.buildRequest = function (params) {
        try {
            handleRequire(params);
        } catch (e) {
            throw new Error(log(e));
        }

        var basket = params.basket;
        var url = params.url;
        var requestMethod = params.requestMethod;

        return this.init()
            .buildConsumer(basket)
            .buildBilling(basket)
            .buildShipping(basket)
            .buildItems(basket)
            .applyDiscounts(basket)
            .buildTotalAmount(basket)
            .buildShippingAmount(basket)
            .buildTotalTax(basket)
            .buildMerchantInformation(url)
            .buildRequestMethod(requestMethod);
    };

    /**
     * creates order request object
     * @returns {Object} - This object
    */
    orderRequestBuilder.prototype.init = function () {
        this.context = new Order();

        return this;
    };

    /**
     * builds consumer details
     * @param {Object} basket - basket
     * @returns {Object} - this object
    */
    orderRequestBuilder.prototype.buildConsumer = function (basket) {
        var billingAddress = basket.billingAddress;
        var customerEmail = Resource.msg('dummy.email.id', 'afterpay', null);
        var currentCustomer = basket.getCustomer();

        if (currentCustomer && currentCustomer.profile && currentCustomer.profile.email) {
            customerEmail = currentCustomer.profile.email;
        } else {
            customerEmail = basket.customerEmail || '';
        }

        var phoneNumber = billingAddress.phone || '';
        var givenNames = billingAddress.firstName || '';
        var surname = billingAddress.lastName || '';

        if (!empty(currentCustomer) && !empty(currentCustomer.profile)) {
            phoneNumber = currentCustomer.profile.phoneMobile;
            givenNames = currentCustomer.profile.firstName;
            surname = currentCustomer.profile.lastName;
        }

        this.context.consumer.phoneNumber = phoneNumber;
        this.context.consumer.givenNames = givenNames;
        this.context.consumer.surname = surname;
        this.context.consumer.email = customerEmail;

        return this;
    };

    /**
     * builds address details
     * @param {string} type - type
     * @param {Object} address - address object
    */
    function buildAddress(type, address) {
        this.context[type].name = address.firstName + ' ' + address.lastName;
        this.context[type].line1 = address.address1 || '';
        this.context[type].line2 = address.address2 || '';
        this.context[type].suburb = address.city || '';
        this.context[type].state = address.stateCode || '';
        this.context[type].postcode = address.postalCode || '';
        this.context[type].countryCode = address.countryCode.value || '';
        this.context[type].phoneNumber = address.phone || '';
    }

    /**
     * builds billing details
     * @param {Object} basket - basket
     * @returns {Object} - this object
    */
    orderRequestBuilder.prototype.buildBilling = function (basket) {
        var billingAddress = basket.billingAddress;

        buildAddress.bind(this)('billing', billingAddress);

        return this;
    };

    /**
     * builds request method details
     * @param {string} requestMethod - request Method
     * @returns {Object} - this object
    */
    orderRequestBuilder.prototype.buildRequestMethod = function (requestMethod) {
        this.context.requestMethod = !empty(requestMethod) ? requestMethod : '';
        return this;
    };

    /**
     * builds shipping details
     * @param {Object} basket - basket
     * @returns {Object} - this object
    */
    orderRequestBuilder.prototype.buildShipping = function (basket) {
        var shippingAddress = basket.defaultShipment.shippingAddress;

        buildAddress.bind(this)('shipping', shippingAddress);

        return this;
    };

    /**
     * builds lineitem container details
     * @param {Object} basket - basket
     * @returns {Object} - this object
    */
    orderRequestBuilder.prototype.buildItems = function (basket) {
        var lineItems = basket.getAllProductLineItems().toArray();

        for (var i = 0; i < lineItems.length; i++) {
            var lineItem = lineItems[i];
            var product = lineItem.product;

            if (product) {
                var bundledProduct = product.bundled ? product.bundled : false;

                if (!(bundledProduct)) {
                    var item = new LineItem();
                    item.name = product.name;
                    item.sku = product.ID;
                    item.quantity = lineItem.getQuantity().value;
                    item.price.amount = lineItem.adjustedNetPrice ? lineItem.adjustedNetPrice.value : product.getPriceModel().getPrice().value;
                    item.price.currency = product.getPriceModel().getPrice().currencyCode;

                    this.context.items.push(item);
                }
            }
        }
        return this;
    };

    /**
     * builds merchant details
     * @param {string} url - url
     * @returns {Object} - this object
    */
    orderRequestBuilder.prototype.buildMerchantInformation = function (url) {
        this.context.merchant.redirectConfirmUrl = !empty(url) ? url : afterpayWebServiceUtilities.getRedirectConfirmUrl();
        this.context.merchant.redirectCancelUrl = !empty(url) ? url : afterpayWebServiceUtilities.getRedirectCancelUrl();

        return this;
    };

    /**
     * builds discounts details
     * @param {Object} basket - basket
     * @returns {Object} - this object
    */
    orderRequestBuilder.prototype.applyDiscounts = function (basket) {
        var couponLineItems = basket.getCouponLineItems() ? basket.getCouponLineItems().toArray() : [];
        var couponLineItem;
        var priceAdjustment;
        var i;

        for (i = 0; i < couponLineItems.length; i++) {
            couponLineItem = couponLineItems[i];

            if (couponLineItem) {
                var priceAdjustments = couponLineItem.getPriceAdjustments().toArray();
                for (i = 0; i < priceAdjustments.length; i++) {
                    priceAdjustment = priceAdjustments[i];
                    var discount = new Discount();

                    discount.displayName = priceAdjustment.lineItemText;
                    discount.amount.amount = Math.abs(priceAdjustment.price.value);
                    discount.amount.currency = priceAdjustment.price.currencyCode;

                    this.context.discounts.push(discount);
                }
            }
        }

        return this;
    };

    /**
     * builds total amount details
     * @param {Object} basket - basket
     * @returns {Object} - this object
    */
    orderRequestBuilder.prototype.buildTotalAmount = function (basket) {
        var paymentInstrument = basket.getPaymentInstruments(PAYMENT_MODE.PAYMENT_METHOD)[0];
        var PaymentTransaction = paymentInstrument.getPaymentTransaction();

        this.context.totalAmount.amount = PaymentTransaction.amount.value;
        this.context.totalAmount.currency = basket.getCurrencyCode();

        return this;
    };

    /**
     * builds shipping amount details
     * @param {Object} basket - basket
     * @returns {Object} - this object
    */
    orderRequestBuilder.prototype.buildShippingAmount = function (basket) {
        var adjustedShippingTotalPrice = basket.getAdjustedShippingTotalPrice();
        if (!empty(adjustedShippingTotalPrice) && adjustedShippingTotalPrice.value === 0) {
            delete this.context.shippingAmount;
            return this;
        }

        this.context.shippingAmount.amount = !empty(adjustedShippingTotalPrice)
            ? adjustedShippingTotalPrice.value
            : '';
        this.context.shippingAmount.currency = !empty(adjustedShippingTotalPrice)
            ? adjustedShippingTotalPrice.currencyCode
            : '';

        return this;
    };

    /**
     * builds total tax details
     * @param {Object} basket - basket
     * @returns {Object} - this object
    */
    orderRequestBuilder.prototype.buildTotalTax = function (basket) {
        var totalTax = basket.getTotalTax();

        this.context.taxAmount.amount = !empty(totalTax)
            ? totalTax.value
            : '';
        this.context.taxAmount.currency = !empty(totalTax)
            ? totalTax.currencyCode
            : '';

        return this;
    };

    /**
     * logs error code against the validation fo request params
     * @param {number} errorCode - error code
     * @returns {string} - error message
    */
    function log(errorCode) {
        return 'Error when generating orderRequestBuilder. Error code: ' + errorCode;
    }

    module.exports = orderRequestBuilder;
}());
