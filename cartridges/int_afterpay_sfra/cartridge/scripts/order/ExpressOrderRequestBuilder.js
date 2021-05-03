/*global empty, dw */
(function() {
    'use strict';
  
    var Builder = require('../util/Builder');
    var Order = require('./ExpressOrder').Order;
    var LineItem = require('./ExpressOrder').LineItem;
    var Discount = require('./ExpressOrder').Discount;
    var Shipping = require('./ExpressOrder').Shipping;
    var Amount = require('./ExpressOrder').Amount;
    
    var AfterpayWebServiceUtilities = require('~/cartridge/scripts/util/AfterpayUtilities').getSitePreferencesUtilities();
    var PAYMENT_MODE = require('~/cartridge/scripts/util/AfterpayConstants')
      .PAYMENT_MODE;
    var LogUtils = require('~/cartridge/scripts/util/LogUtils');
    var Logger = LogUtils.getLogger('OrderRequestBuilder');
  
    function OrderRequestBuilder() {
      this.context = null;
    }
  
    OrderRequestBuilder.prototype = new Builder();
    OrderRequestBuilder.prototype.get = function() {
      return this.context;
    };
  
    /*
          Build request here
      */
    OrderRequestBuilder.prototype.buildRequest = function(params) {
      try {
        handleRequire(params);
      } catch (e) {
        throw new Error(log(e));
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
  
    OrderRequestBuilder.prototype.init = function() {
      this.context = new Order();
  
      return this;
    };
  

    OrderRequestBuilder.prototype.buildRequestMethod = function(requestMethod) {
      this.context.requestMethod = !empty(requestMethod) ? requestMethod : '';
      return this;
    };
  
    OrderRequestBuilder.prototype.buildShipping = function(basket) {
      var shippingAddress = basket.defaultShipment.shippingAddress;
  
      buildAddress.bind(this)('shipping', shippingAddress);
  
      return this;
    };
  
    OrderRequestBuilder.prototype.buildItems = function(basket) {
      var lineItems = basket.getAllProductLineItems().toArray();
  
      this.context.items = lineItems.map(function(li) {
        var item = new LineItem();
        var product = li.product;
  
        // Some lineitems may not be products
        // e.g. extended warranties
        if (!product) {
          item.name = li.getLineItemText();
          item.quantity = li.getQuantity().value;
          item.price.amount = li.adjustedNetPrice.value;
          item.price.currency = li.adjustedNetPrice.currencyCode;
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
  
    OrderRequestBuilder.prototype.buildMerchantInformation = function(sourceUrl) {
      this.context.merchant.popupOriginUrl = !empty(sourceUrl)
        ? sourceUrl
        : AfterpayWebServiceUtilities.getRedirectConfirmUrl(); // using redirect url as backup

      return this;
    };
  
    OrderRequestBuilder.prototype.applyDiscounts = function(basket) {
      var priceAdjustments = basket.getPriceAdjustments().toArray();
  
      this.context.discounts = priceAdjustments.map(function(pa) {
        var discount = new Discount();
  
        discount.displayName = pa.lineItemText;
        discount.amount.amount = Math.abs(pa.price.value);
        discount.amount.currency = pa.price.currencyCode;
  
        return discount;
      });
  
      return this;
    };
  
    OrderRequestBuilder.prototype.buildTotalAmount = function(checkoutPrice) {
      this.context.amount.amount = checkoutPrice.value;
      this.context.amount.currency = checkoutPrice.currencyCode;
  
      return this;
    };
  

    OrderRequestBuilder.prototype.buildMerchantReference = function (merchantReference) {
        this.context.merchantReference = merchantReference;
        return this;
    };

    OrderRequestBuilder.prototype.buildExpressMode = function () {
        this.context.mode = "express";
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
  
    OrderRequestBuilder.prototype.buildShiptoStore = function(store) {
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


    function handleRequire(params) {
      if (
        empty(params) ||
        empty(params.basket)
      ) {
        throw 404;
      }
    }
  
    function log(errorCode) {
      return (
        'Error when generating ExpressOrderRequestBuilder. Error code: ' + errorCode
      );
    }
  
    module.exports = OrderRequestBuilder;
  })();
  