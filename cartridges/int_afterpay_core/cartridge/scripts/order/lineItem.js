'use strict';

var Amount = require('*/cartridge/scripts/order/amount');

/**
 * definition for lineitem details
 */
function LineItem() {
    this.name = '';
    this.sku = '';
    this.quantity = '';
    this.price = new Amount();
}

module.exports = LineItem;
