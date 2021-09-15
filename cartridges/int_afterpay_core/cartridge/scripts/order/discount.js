var Amount = require('*/cartridge/scripts/order/amount');

/**
 * definition for discount details
 */
function Discount() {
    this.displayName = '';
    this.amount = new Amount();
}

module.exports = Discount;
