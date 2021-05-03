/* global empty, dw */

(function () {
    'use strict';

    var Builder = require('../util/builder');
    var Order = require('./order').Order;
    var LineItem = require('./order').LineItem;
    var Discount = require('./order').Discount;
    var AfterpayWebServiceUtilities = require('*/cartridge/scripts/util/afterpayUtilities').getSitePreferencesUtilities();
    var PAYMENT_MODE = require('*/cartridge/scripts/util/afterpayConstants').PAYMENT_MODE;

    /**
     * defines order request object
     */
    function OrderRequestBuilder() {
        this.context = null;
    }

    OrderRequestBuilder.prototype = new Builder();

    /**
     * get context
     * @returns {Object} context - context
     * */
    OrderRequestBuilder.prototype.get = function () {
        return this.context;
    };

    /**
     * validates request params
     * @param {Object} params - params
     * @returns {number} httpCode - http code
     */
    function handleRequire(params) {
        if (empty(params) ||
                empty(params.basket) ||
                empty(params.basket.billingAddress) ||
                empty(params.basket.defaultShipment.shippingAddress)) {
            return 404;
        }

        return 200;
    }

    /**
     * Build request here
     * @param {Object} params - parameters
     * @returns {Object} initMethods - init methods
     */
    OrderRequestBuilder.prototype.buildRequest = function (params) {
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
     * @returns {Object} this - this object
     */
    OrderRequestBuilder.prototype.init = function () {
        this.context = new Order();

        return this;
    };

    /**
     * builds consumer details
     * @param {Object} basket - basket
     * @returns {Object} this - this object
     */
    OrderRequestBuilder.prototype.buildConsumer = function (basket) {
        var billingAddress = basket.billingAddress;
        var currentCustomer = basket.getCustomer();
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
        this.context.consumer.email = basket.customerEmail || '';

        return this;
    };

    /**
     * builds address details
     * @param {string} type - type
     * @param {Object} address - address
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
     * @returns {Object} this - this object
     */
    OrderRequestBuilder.prototype.buildBilling = function (basket) {
        var billingAddress = basket.billingAddress;

        buildAddress.bind(this)('billing', billingAddress);

        return this;
    };

    /**
     * builds request method details
     * @param {Object} requestMethod - requestMethod
     * @returns {Object} this - this object
     */
    OrderRequestBuilder.prototype.buildRequestMethod = function (requestMethod) {
        this.context.requestMethod = !empty(requestMethod) ? requestMethod : '';
        return this;
    };

    /**
     * builds shipping details
     * @param {Object} basket - basket
     * @returns {Object} this - this object
     */
    OrderRequestBuilder.prototype.buildShipping = function (basket) {
        var shippingAddress = basket.defaultShipment.shippingAddress;

        buildAddress.bind(this)('shipping', shippingAddress);

        return this;
    };

    /**
     * builds lineitem container details
     * @param {Object} basket - basket
     * @returns {Object} this - this object
     */
    OrderRequestBuilder.prototype.buildItems = function (basket) {
        var lineItems = basket.getAllProductLineItems().toArray();

        this.context.items = lineItems.map(function (li) {
            var item = new LineItem();
            var product = li.product;

            item.name = product.name;
            item.sku = product.ID;
            item.quantity = li.getQuantity().value;
            item.price.amount = product.getPriceModel().getPrice().value;
            item.price.currency = product.getPriceModel().getPrice().currencyCode;

            return item;
        });

        return this;
    };

    /**
     * builds merchant details
     * @param {Object} url - url
     * @returns {Object} this - this object
     */
    OrderRequestBuilder.prototype.buildMerchantInformation = function (url) {
        this.context.merchant.redirectConfirmUrl = !empty(url) ? url : AfterpayWebServiceUtilities.getRedirectConfirmUrl();
        this.context.merchant.redirectCancelUrl = !empty(url) ? url : AfterpayWebServiceUtilities.getRedirectCancelUrl();

        return this;
    };

    /**
     * builds discounts details
     * @param {Object} basket - basket
     * @returns {Object} this - this object
     */
    OrderRequestBuilder.prototype.applyDiscounts = function (basket) {
        var priceAdjustments = basket.getPriceAdjustments().toArray();

        this.context.discounts = priceAdjustments.map(function (pa) {
            var discount = new Discount();

            discount.displayName = pa.lineItemText;
            discount.amount.amount = Math.abs(pa.price.value);
            discount.amount.currency = pa.price.currencyCode;

            return discount;
        });

        return this;
    };

    /**
     * builds total amount details
     * @param {Object} basket - basket
     * @returns {Object} this - this object
     */
    OrderRequestBuilder.prototype.buildTotalAmount = function (basket) {
        var paymentInstrument = basket.getPaymentInstruments(PAYMENT_MODE.PAYMENT_METHOD)[0];
        var PaymentTransaction = paymentInstrument.getPaymentTransaction();

        this.context.totalAmount.amount = PaymentTransaction.amount.value;
        this.context.totalAmount.currency = basket.getCurrencyCode();

        return this;
    };

    /**
     * builds shipping amount details
     * @param {Object} basket - basket
     * @returns {Object} this - this object
     */
    OrderRequestBuilder.prototype.buildShippingAmount = function (basket) {
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
     * @returns {Object} this - this object
     */
    OrderRequestBuilder.prototype.buildTotalTax = function (basket) {
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
     * logs error code against the validation of request params
     * @param {number} errorCode - error code
     * @returns {string} message - message
     */
    function log(errorCode) {
        return 'Error when generating OrderRequestBuilder. Error code: ' + errorCode;
    }

    module.exports = OrderRequestBuilder;
}());
