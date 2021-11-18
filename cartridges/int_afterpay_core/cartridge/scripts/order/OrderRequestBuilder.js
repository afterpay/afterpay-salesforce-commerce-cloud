/* eslint no-underscore-dangle: 0 */

var Resource = require('dw/web/Resource');
var TaxMgr = require('dw/order/TaxMgr');

var Builder = require('../util/builder');
var { checkoutUtilities, brandUtilities, sitePreferencesUtilities } = require('*/cartridge/scripts/util/afterpayUtilities');
var Order = require('*/cartridge/scripts/order/order');
var LineItem = require('*/cartridge/scripts/order/lineItem');
var Discount = require('*/cartridge/scripts/order/discount');

/**
 * @class
 * @abstract
 * @classdesc defines order request object
 */
function OrderRequestBuilder() {
    this.context = null;
}

OrderRequestBuilder.prototype = new Builder();

/**
 * logs error code against the validation fo request params
 * @private
 * @param {number} errorCode - error code
 * @returns {string} - error message
 */
OrderRequestBuilder.prototype._log = function (errorCode) {
    return 'Error when generating orderRequestBuilder. Error code: ' + errorCode;
};

/**
 * validates request params
 * @private
 * @param {Object} params - params
 */
OrderRequestBuilder.prototype._handleRequire = function (params) {
    if (empty(params) ||
        empty(params.basket) ||
        empty(params.basket.billingAddress) ||
        empty(params.basket.defaultShipment.shippingAddress)) {
        throw new Error('404');
    }
};

/**
 * builds address details
 * @private
 * @param {string} type - type
 * @param {dw.order.OrderAddress} address - address object
 */
OrderRequestBuilder.prototype._buildAddress = function (type, address) {
    this.context[type].name = address.firstName + ' ' + address.lastName;
    this.context[type].line1 = address.address1 || '';
    this.context[type].line2 = address.address2 || '';
    this.context[type].postcode = address.postalCode || '';
    this.context[type].countryCode = (address.countryCode.value && address.countryCode.value.toUpperCase()) || '';
    this.context[type].phoneNumber = address.phone || '';
    this.context[type].area1 = address.city || '';
    this.context[type].region = address.stateCode || '';
};

/**
 * @description Retrieves payment transaction from basket
 * @private
 * @param {dw.order.Basket} basket - source cart
 * @returns {dw.order.PaymentTransaction} - payment transaction associated with provided basket
 */
OrderRequestBuilder.prototype._getPaymentTransaction = function (basket) {
    var paymentMethod = checkoutUtilities.getPaymentMethodName();

    if (!paymentMethod) {
        return null;
    }

    var paymentInstrument = basket.getPaymentInstruments(paymentMethod)[0];
    return paymentInstrument.getPaymentTransaction();
};

OrderRequestBuilder.prototype.get = function () {
    return this.context;
};

/**
 * Build request here
 * @param {Object} params - parameters
 * @returns {Object} - this main object itself
 */
OrderRequestBuilder.prototype.buildRequest = function (params) {
    try {
        this._handleRequire(params);
    } catch (e) {
        throw new Error(this._log(e));
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
        .buildPurchaseCountry()
        .buildRequestMethod(requestMethod);
};

/**
 * creates order request object
 * @returns {Object} - This object
 */
OrderRequestBuilder.prototype.init = function () {
    this.context = new Order();

    return this;
};

/**
 * builds consumer details
 * @param {Object} basket - basket
 * @returns {Object} - this object
 */
OrderRequestBuilder.prototype.buildConsumer = function (basket) {
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
 * builds billing details
 * @param {dw.order.Basket} basket - basket
 * @returns {Object} - this object
 */
OrderRequestBuilder.prototype.buildBilling = function (basket) {
    var billingAddress = basket.billingAddress;

    this._buildAddress('billing', billingAddress);

    return this;
};

/**
 * builds request method details
 * @param {string} requestMethod - request Method
 * @returns {Object} - this object
 */
OrderRequestBuilder.prototype.buildRequestMethod = function (requestMethod) {
    this.context.requestMethod = !empty(requestMethod) ? requestMethod : '';
    return this;
};

/**
 * @description Adds to request purchaseCountry
 * purchaseCountry is needed in case if there are several countries hosted by one third-party instance
 * @returns {Object} - this object
 */
OrderRequestBuilder.prototype.buildPurchaseCountry = function () {
    this.context.purchaseCountry = brandUtilities.getCountryCode();
    return this;
};

/**
 * builds shipping details
 * @param {dw.order.Basket} basket - basket
 * @returns {Object} - this object
 */
OrderRequestBuilder.prototype.buildShipping = function (basket) {
    var shippingAddress = basket.defaultShipment.shippingAddress;
    if(shippingAddress.address1 !== null){
        this._buildAddress('shipping', shippingAddress);
    }
    else{
        var storeMap = {};
        let lineItemsIter = basket.allProductLineItems.iterator();
        while(lineItemsIter.hasNext()) {
            let lineItem = lineItemsIter.next();
            if (lineItem.custom.fromStoreId) {
                storeMap[lineItem.custom.fromStoreId] = dw.catalog.StoreMgr.getStore(lineItem.custom.fromStoreId);
            }
        }
        Logger.debug("storeMap : " + JSON.stringify(storeMap));
        if (Object.keys(storeMap).length == 1) {
            storePickup = true;
            for (var key in storeMap) {
                store = storeMap[key];
            }
            if(store){
                this._buildShiptoStore('shipping', store);
            }
        }
        else{
            return null;
        }
    }
    return this;
};

/**
 * builds lineitem container details
 * @param {Object} basket - basket
 * @returns {Object} - this object
 */
OrderRequestBuilder.prototype.buildItems = function (basket) {
    var lineItems = basket.getAllProductLineItems().toArray();

    this.context.items = lineItems.map(function (li) {
                var item = new LineItem();
        var product = li.product;

    // Some lineitems may not be products
    // e.g. extended warranties
        if (!product) {
            item.name = li.getLineItemText();
            item.sku = li.productID;
            item.quantity = li.getQuantity().value;
            item.price.amount = li.adjustedNetPrice.value;
            item.price.currency = li.adjustedNetPrice.currencyCode;
        } else {
                item.name = product.name;
                item.sku = product.ID;
            item.quantity = li.getQuantity().value;
            item.price.amount = product.getPriceModel().getPrice().value;
                item.price.currency = product.getPriceModel().getPrice().currencyCode;
            }
        return item;
    });
    return this;
};

/**
 * builds merchant details
 * @param {string} url - url
 * @returns {Object} - this object
 */
OrderRequestBuilder.prototype.buildMerchantInformation = function (url) {
    this.context.merchant.redirectConfirmUrl = !empty(url) ? url : sitePreferencesUtilities.getRedirectConfirmUrl();
    this.context.merchant.redirectCancelUrl = !empty(url) ? url : sitePreferencesUtilities.getRedirectCancelUrl();

    return this;
};

/**
 * builds discounts details
 * @param {Object} basket - basket
 * @returns {Object} - this object
 */
OrderRequestBuilder.prototype.applyDiscounts = function (basket) {
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
 * @param {dw.order.Basket} basket - basket
 * @returns {Object} - this object
 */
// eslint-disable-next-line no-unused-vars
OrderRequestBuilder.prototype.buildTotalAmount = function (basket) {
    var paymentTransaction = this._getPaymentTransaction(basket);

    if (!paymentTransaction) {
        return null;
    }

    this.context.amount.amount = paymentTransaction.amount.value;
    this.context.amount.currency = basket.getCurrencyCode();
    return this;
};

/**
 * builds shipping amount details
 * @param {Object} basket - basket
 * @returns {Object} - this object
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
 * @param {dw.order.Basket} basket - basket
 * @returns {Object} - this object
 */
OrderRequestBuilder.prototype.buildTotalTax = function (basket) {
    if (TaxMgr.getTaxationPolicy() === TaxMgr.TAX_POLICY_NET) {
        var totalTax = basket.getTotalTax();

        this.context.taxAmount.amount = !empty(totalTax)
            ? totalTax.value
            : '';
        this.context.taxAmount.currency = !empty(totalTax)
            ? totalTax.currencyCode
            : '';
    } else {
        this.context.taxAmount.amount = 0.0;
        this.context.taxAmount.currency = basket.getCurrencyCode();
    }

    return this;
};

OrderRequestBuilder.prototype._buildShiptoStore = function(type, store) {
    this.context[type].name = store.name || 'UNKNOWN';
    this.context[type].line1 = store.address1 || '';
    this.context[type].line2 = store.address2 || '';
    this.context[type].area1 = store.city || '';
    this.context[type].region = store.stateCode || '';
    this.context[type].postcode = store.postalCode || '';
    this.context[type].countryCode = store.countryCode.value || '';
    this.context[type].phoneNumber = store.phone || '';
};


module.exports = OrderRequestBuilder;
