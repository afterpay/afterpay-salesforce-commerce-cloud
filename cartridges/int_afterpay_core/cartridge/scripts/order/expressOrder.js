'use strict';

/**
 * definition for amount and currency details
 */
function Amount() {
    this.amount = '';
    this.currency = '';
}
/**
 * definition for lineitem details
 */
function LineItem() {
    this.name = '';
    this.quantity = '';
    this.price = new Amount();
}
/**
 * definition for discount details
 */
function Discount() {
    this.displayName = '';
    this.amount = new Amount();
}
/**
 * definition for merchant origin url
 */
function Merchant() {
    this.popupOriginUrl = '';
}
/**
 * definition for shipping details
 */
function Shipping() {
    this.name = '';
    this.line1 = '';
    this.postcode = '';
}
/**
 * definition for order details
 */
function Order() {
    this.items = [];
    this.discounts = [];
    this.amount = new Amount();
    this.merchant = new Merchant();
}

module.exports.Order = Order;
module.exports.LineItem = LineItem;
module.exports.Discount = Discount;
module.exports.Shipping = Shipping;
