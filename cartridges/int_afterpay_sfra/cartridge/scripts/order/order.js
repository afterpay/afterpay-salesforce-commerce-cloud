(function () {
    'use strict';
    /**
     * definition for customer details
    */
    function Consumer() {
        this.phoneNumber = '';
        this.givenNames = '';
        this.surname = '';
        this.email = '';
    }
    /**
     * definition for address details
    */
    function Address() {
        this.name = '';
        this.line1 = '';
        this.line2 = '';
        this.suburb = '';
        this.state = '';
        this.postcode = '';
        this.countryCode = '';
        this.phoneNumber = '';
    }
    /**
     * definition for amount and currency details
    */
    function Amount() {
        this.amount = '';
        this.currency = '';
    }
    /**
     * definition for merchant details
    */
    function Merchant() {
        this.redirectConfirmUrl = '';
        this.redirectCancelUrl = '';
    }
    /**
     * definition for courier details
    */
    function Courier() {
        this.shippedAt = '';
        this.name = '';
        this.tracking = '';
        this.priority = '';
    }
    /**
     * definition for order details
    */
    function Order() {
        this.consumer = new Consumer();
        this.billing = new Address();
        this.shipping = new Address();
        this.courier = new Courier();
        this.items = [];
        this.discounts = [];
        this.taxAmount = new Amount();
        this.totalAmount = new Amount();
        this.shippingAmount = new Amount();
        this.merchant = new Merchant();
    }
    /**
     * definition for lineitem details
    */
    function LineItem() {
        this.name = '';
        this.sku = '';
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

    module.exports.Order = Order;
    module.exports.LineItem = LineItem;
    module.exports.Discount = Discount;
}());
