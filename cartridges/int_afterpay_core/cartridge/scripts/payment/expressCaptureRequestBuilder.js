/*
* Used to generate a request body containing only the "shipping"
* and "items" keys. This is specifically for express checkout to
* pass in to the capture when the cart items or shipping address
* has changed.
*/

'use strict';

var Builder = require('../util/builder');
var expressOrderObject = require('*/cartridge/scripts/order/expressOrder');
/**
 * @class
 * @abstract
 * @classdesc defines order request object
 */
function ExpressCaptureRequestBuilder() {
    this.context = null;
}

ExpressCaptureRequestBuilder.prototype = new Builder();
ExpressCaptureRequestBuilder.prototype.get = function () {
    return this.context;
};

/**
 * Capture request
 */
function Capture() {
    this.shipping = new expressOrderObject.Shipping();
    this.items = [];
}

/**
 * Build Address
 * @param {string} type - shipping / billing address
 * @param {Object} address - empty address object
 */
function buildAddress(type, address) {
    this.context[type].name = address.firstName + ' ' + address.lastName;
    this.context[type].line1 = address.address1 || '';
    this.context[type].line2 = address.address2 || '';
    this.context[type].area1 = address.city || '';
    this.context[type].region = address.stateCode || '';
    this.context[type].postcode = address.postalCode || '';
    this.context[type].countryCode = address.countryCode.value || '';
    this.context[type].phoneNumber = address.phone || '';
}

/**
 * Build request here
 * @param {Object} params - pareameter object passed
 * @returns {Object} - capture request object
 */
ExpressCaptureRequestBuilder.prototype.buildRequest = function (params) {
    var basket = params.basket;

    return this.init()
        .buildShipping(basket)
        .buildItems(basket);
};

/**
 * Creates capture request object
 * @returns {Object} - capture request object
 */
ExpressCaptureRequestBuilder.prototype.init = function () {
    this.context = new Capture();

    return this;
};

/**
 * Builds shipping details
 * /**
 * Builds product details
 * @param {dw.order.Basket} basket - basket
 * @returns {Object} - shipping address
 */
ExpressCaptureRequestBuilder.prototype.buildShipping = function (basket) {
    var shippingAddress = basket.defaultShipment.shippingAddress;

    buildAddress.bind(this)('shipping', shippingAddress);

    return this;
};

/**
 * Builds product details
 * @param {dw.order.Basket} basket - basket
 * @returns {Object} - product details
 */
ExpressCaptureRequestBuilder.prototype.buildItems = function (basket) {
    var lineItems = basket.getAllProductLineItems().toArray();

    this.context.items = lineItems.map(function (li) {
        var item = new expressOrderObject.LineItem();
        var product = li.product;

        // Some lineitems may not be products
        // e.g. extended warranties
        if (!product) {
            item.name = li.getLineItemText();
            item.sku = li.productID;
            item.price.currency = li.adjustedNetPrice.currencyCode;
        } else {
            item.name = product.name;
            item.sku = product.ID;
            item.price.currency = product.getPriceModel().getPrice().currencyCode;
        }
        item.quantity = li.getQuantity().value;
        item.price.amount = (li.adjustedPrice.value / item.quantity).toString();
        return item;
    });

    return this;
};

module.exports = ExpressCaptureRequestBuilder;
