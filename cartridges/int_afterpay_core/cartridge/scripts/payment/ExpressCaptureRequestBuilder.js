/*
* Used to generate a request body containing only the "shipping"
* and "items" keys. This is specifically for express checkout to
* pass in to the capture when the cart items or shipping address
* has changed.
*/
(function() {
    'use strict';
  
    var Builder = require('../util/Builder');
    var LogUtils = require('~/cartridge/scripts/util/LogUtils');
    var Logger = LogUtils.getLogger('ExpressCaptureRequestBuilder');

    function Capture() {
        this.shipping = new Address();
        this.items = [];
    }

    function Address() {
        this.name = '';
        this.line1 = '';
        this.line2 = '';
        this.area1 = '';
        this.area2 = '';
        this.region = '';
        this.postcode = '';
        this.countryCode = '';
        this.phoneNumber = '';
    }

    function LineItem() {
        this.name = '';
        //this.sku = '';
        this.quantity = '';
        this.price = new Amount();
    }
    
    function Amount() {
        this.amount = '';
        this.currency = '';
    }

    function ExpressCaptureRequestBuilder() {
      this.context = null;
    }
  
    ExpressCaptureRequestBuilder.prototype.get = function() {
        return this.context;
      };

    ExpressCaptureRequestBuilder.prototype = new Builder();
    ExpressCaptureRequestBuilder.prototype.get = function() {
      return this.context;
    };
  
    /*
          Build request here
      */
    ExpressCaptureRequestBuilder.prototype.buildRequest = function(params) {
      var basket = params.basket;
  
      return this.init()
        .buildShipping(basket)
        .buildItems(basket);
    };
  
    ExpressCaptureRequestBuilder.prototype.init = function() {
      this.context = new Capture();
  
      return this;
    };
  
    ExpressCaptureRequestBuilder.prototype.buildShipping = function(basket) {
      var shippingAddress = basket.defaultShipment.shippingAddress;
  
      buildAddress.bind(this)('shipping', shippingAddress);
  
      return this;
    };
  
    ExpressCaptureRequestBuilder.prototype.buildItems = function(basket) {
      var lineItems = basket.getAllProductLineItems().toArray();
  
      this.context.items = lineItems.map(function(li) {
        var item = new LineItem();
        var product = li.product;
  
        // Some lineitems may not be products
        // e.g. extended warranties
        if (!product) {
          item.name = li.getLineItemText();
          item.quantity = li.getQuantity().value;
          item.price.amount = 0;
          item.price.currency = basket.currencyCode;
        }
        else {
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
  
  
    function log(errorCode) {
      return (
        'Error when generating ExpressCaptureRequestBuilder. Error code: ' + errorCode
      );
    }
  
    module.exports = ExpressCaptureRequestBuilder;
  })();
  