/*global empty, dw */
(function() {
  'use strict';

  var Builder = require('../util/Builder');
  var Order = require('./Order').Order;
  var LineItem = require('./Order').LineItem;
  var Discount = require('./Order').Discount;
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

    var basket = params.basket,
      url = params.url;
    requestMethod = params.requestMethod;

    return this.init()
      .buildConsumer(basket)
      .buildBilling(basket)
      .buildShipping(basket)
      .buildItems(basket)
      .applyDiscounts(basket)
      .buildTotalAmount(basket)
      .buildShippingAmount(basket)
      .buildTotalTax(basket)
      .buildMerchantInformation(url)
      .buildRequestMethod(requestMethod);
  };

  OrderRequestBuilder.prototype.init = function() {
    this.context = new Order();

    return this;
  };

  OrderRequestBuilder.prototype.buildConsumer = function(basket) {
    var billingAddress = basket.billingAddress;

    var currentCustomer = basket.getCustomer();

    var phoneNumber = billingAddress.phone || '';
    var givenNames = billingAddress.firstName || '';
    var surname = billingAddress.lastName || '';
    if (!empty(currentCustomer) && !empty(currentCustomer.profile)) {
      phoneNumber = currentCustomer.profile.phoneMobile;
      givenNames = currentCustomer.profile.firstName;
      surname = currentCustomer.profile.lastName;
    }

    this.context.consumer.phoneNumber = phoneNumber;
    this.context.consumer.givenNames = givenNames;
    this.context.consumer.surname = surname;
    this.context.consumer.email = basket.customerEmail || '';

    return this;
  };

  OrderRequestBuilder.prototype.buildBilling = function(basket) {
    var billingAddress = basket.billingAddress;

    buildAddress.bind(this)('billing', billingAddress);

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

  OrderRequestBuilder.prototype.buildMerchantInformation = function(url) {
    this.context.merchant.redirectConfirmUrl = !empty(url)
      ? url
      : AfterpayWebServiceUtilities.getRedirectConfirmUrl();
    this.context.merchant.redirectCancelUrl = !empty(url)
      ? url
      : AfterpayWebServiceUtilities.getRedirectCancelUrl();

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

  OrderRequestBuilder.prototype.buildTotalAmount = function(basket) {
    var paymentInstrument: dw.order.PaymentInstrument = basket.getPaymentInstruments(
      PAYMENT_MODE.PAYMENT_METHOD
    )[0];
    var PaymentTransaction = paymentInstrument.getPaymentTransaction();

    this.context.amount.amount = PaymentTransaction.amount.value;
    this.context.amount.currency = basket.getCurrencyCode();

    return this;
  };

  OrderRequestBuilder.prototype.buildShippingAmount = function(basket) {
    var adjustedShippingTotalPrice = basket.getAdjustedShippingTotalPrice();
    if (
      !empty(adjustedShippingTotalPrice) &&
      adjustedShippingTotalPrice.value == 0
    ) {
      delete this.context.shippingAmount;
      return this;
    }

    this.context.shippingAmount.amount = !empty(adjustedShippingTotalPrice)
      ? adjustedShippingTotalPrice.value
      : '';
    this.context.shippingAmount.currency = !empty(adjustedShippingTotalPrice)
      ? adjustedShippingTotalPrice.currencyCode
      : '';

    return this;
  };

  OrderRequestBuilder.prototype.buildTotalTax = function(basket) {
    var totalTax = basket.getTotalTax();

    this.context.taxAmount.amount = !empty(totalTax) ? totalTax.value : '';
    this.context.taxAmount.currency = !empty(totalTax)
      ? totalTax.currencyCode
      : '';

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

  function handleRequire(params) {
    if (
      empty(params) ||
      empty(params.basket) ||
      empty(params.basket.billingAddress) ||
      empty(params.basket.defaultShipment.shippingAddress)
    ) {
      throw 404;
    }
  }

  function log(errorCode) {
    return (
      'Error when generating OrderRequestBuilder. Error code: ' + errorCode
    );
  }

  module.exports = OrderRequestBuilder;
})();
