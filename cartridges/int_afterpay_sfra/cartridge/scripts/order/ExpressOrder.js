(function() {
    'use strict';
  
    function Order() {
      this.items = [];
      this.discounts = [];
      this.amount = new Amount();
      this.merchant = new Merchant();
    }
  
    /*
     * Define references Model
     *
     * Hoisting functions
     */
  
    function LineItem() {
      this.name = '';
      //this.sku = '';
      this.quantity = '';
      this.price = new Amount();
    }
  
    function Discount() {
      this.displayName = '';
      this.amount = new Amount();
    }
  
    function Amount() {
      this.amount = '';
      this.currency = '';
    }
  
    function Merchant() {
      this.popupOriginUrl = '';
    }

    function Shipping() {
      this.name = '';
      this.line1 = '';
      this.postcode = '';
    }




    module.exports.Order = Order;
    module.exports.LineItem = LineItem;
    module.exports.Discount = Discount;
    module.exports.Shipping = Shipping;
  })();
  