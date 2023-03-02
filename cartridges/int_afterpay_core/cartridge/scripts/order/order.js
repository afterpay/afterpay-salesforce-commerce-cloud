'use strict';

var Consumer = require('*/cartridge/scripts/order/consumer');
var Address = require('*/cartridge/scripts/order/address');
var Amount = require('*/cartridge/scripts/order/amount');
var Merchant = require('*/cartridge/scripts/order/merchant');

/**
 * definition for order details
 */
function Order() {
    this.consumer = new Consumer();
    this.billing = new Address();
    this.shipping = new Address();
    this.items = [];
    this.discounts = [];
    this.taxAmount = new Amount();
    this.shippingAmount = new Amount();
    this.merchant = new Merchant();
    this.amount = new Amount();
}

module.exports = Order;
