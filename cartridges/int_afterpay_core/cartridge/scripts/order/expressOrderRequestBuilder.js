/* eslint no-underscore-dangle: 0 */

var Builder = require('../util/builder');
var afterpayWebServiceUtilities = require('*/cartridge/scripts/util/afterpayUtilities').sitePreferencesUtilities;
var { Order, LineItem, Discount, Shipping, Amount } = require('*/cartridge/scripts/order/expressOrder');

/**
 * @class
 * @abstract
 * @classdesc defines order request object
 */
function OrderRequestBuilder() {
    this.context = null;
}

OrderRequestBuilder.prototype = new Builder();
OrderRequestBuilder.prototype.get = function () {
    return this.context;
};
/**
 * logs error code against the validation fo request params
 * @private
 * @param {number} errorCode - error code
 * @returns {string} - error message
 */
OrderRequestBuilder.prototype._log = function (errorCode) {
    return 'Error when generating expressOrderRequestBuilder. Error code: ' + errorCode;
};

/**
 * validates request params
 * @private
 * @param {Object} params - params
*/
OrderRequestBuilder.prototype._handleRequire = function (params) {
    if (
    empty(params) ||
    empty(params.basket)
    ) {
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
    this.context[type].area1 = address.city || '';
    this.context[type].region = address.stateCode || '';
    this.context[type].postcode = address.postalCode || '';
    this.context[type].countryCode = address.countryCode.value || '';
    this.context[type].phoneNumber = address.phone || '';
};

/*
    Build request here
*/
OrderRequestBuilder.prototype.buildRequest = function (params) {
    try {
        this._handleRequire(params);
    } catch (e) {
        throw new Error(this._log(e));
    }

    var basket = params.basket;
    var checkoutPrice = params.checkoutPrice;
    var merchantReference = params.merchantReference;
    var store = params.store;

    var sourceUrl = params.sourceUrl;
    var requestMethod = params.requestMethod;

    return this.init()
    .buildItems(basket)
    .applyDiscounts(basket)
    .buildTotalAmount(checkoutPrice)
    .buildMerchantInformation(sourceUrl)
    .buildRequestMethod(requestMethod)
    .buildMerchantReference(merchantReference)
    .buildShiptoStore(store)
    .buildExpressMode();
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
 * builds request method details
 * @param {string} requestMethod - request Method
 * @returns {Object} - this object
 */
OrderRequestBuilder.prototype.buildRequestMethod = function (requestMethod) {
    this.context.requestMethod = !empty(requestMethod) ? requestMethod : '';
    return this;
};

/**
 * builds shipping details
 * @param {dw.order.Basket} basket - basket
 * @returns {Object} - this object
 */
OrderRequestBuilder.prototype.buildShipping = function (basket) {
    var shippingAddress = basket.defaultShipment.shippingAddress;

    this._buildAddress('shipping', shippingAddress);

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
            item.price.currency = li.adjustedNetPrice.currencyCode;
        } else {
                item.name = product.name;
                item.sku = product.ID;
                item.price.currency = product.getPriceModel().getPrice().currencyCode;
        }
        item.quantity = li.getQuantity().value;
        item.price.amount = (li.adjustedPrice.value/item.quantity).toString();
        return item;
    });

    return this;
};

/**
 * builds merchant details
 * @param {string} sourceUrl - sourceUrl
 * @returns {Object} - this object
 */
OrderRequestBuilder.prototype.buildMerchantInformation = function (sourceUrl) {
    this.context.merchant.popupOriginUrl = !empty(sourceUrl)
    ? sourceUrl
    : afterpayWebServiceUtilities.getRedirectConfirmUrl(); // using redirect url as backup

    return this;
};

/**
 * builds discounts details
 * @param {Object} basket - basket
 * @returns {Object} - this object
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
 * @param {dw.order.Basket} basket - basket
 * @returns {Object} - this object
 */
// eslint-disable-next-line no-unused-vars
OrderRequestBuilder.prototype.buildTotalAmount = function (checkoutPrice) {
    this.context.amount.amount = checkoutPrice.value;
    this.context.amount.currency = checkoutPrice.currencyCode;

    return this;
};


OrderRequestBuilder.prototype.buildMerchantReference = function (merchantReference) {
    this.context.merchantReference = merchantReference;
    return this;
};

OrderRequestBuilder.prototype.buildExpressMode = function () {
    this.context.mode = 'express';
    return this;
};

OrderRequestBuilder.prototype.buildShiptoStore = function (store) {
    // If no store, do not include a shipping field
    if (!store) {
        return this;
    }
    let shipping = new Shipping();
    this.context.shipping = shipping;
    shipping.name = store.name || 'UNKNOWN';
    shipping.line1 = store.address1 || '';
    shipping.line2 = store.address2 || '';
    shipping.area1 = store.city || '';
    shipping.region = store.stateCode || '';
    shipping.postcode = store.postalCode || '';
    shipping.countryCode = store.countryCode.value || '';
    shipping.phoneNumber = store.phone || '';

    return this;
};

module.exports = OrderRequestBuilder;
