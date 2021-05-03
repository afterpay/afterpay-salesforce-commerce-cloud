'use strict';

var AfterpayApiContext = require("~/cartridge/scripts/context/AfterpayApiContext");
var AfterpayHttpService = require("~/cartridge/scripts/logic/services/AfterpayHttpService.ds");
var AfterpaySitePreferencesUtilities = require("~/cartridge/scripts/util/AfterpayUtilities").getSitePreferencesUtilities();
var ctrlCartridgeName = AfterpaySitePreferencesUtilities.getControllerCartridgeName();
var Class 		= require(ctrlCartridgeName + '/cartridge/scripts/util/Class').Class;
var OrderRequestBuilder = require('~/cartridge/scripts/order/ExpressOrderRequestBuilder');
var Site = require('dw/system/Site');
var LogUtils = require('~/cartridge/scripts/util/LogUtils');
var Logger = LogUtils.getLogger('AfterpayGetToken');

var ExpressOrderService = Class.extend({

     _requestUrl : null,
     _requestBody : {},

    init : function() {
        this.afterpayHttpService = new AfterpayHttpService();
        this.afterpayApiContext = new AfterpayApiContext();
        this.afterpaySitePreferencesUtilities = AfterpaySitePreferencesUtilities;
    },

    generateRequest : function(cart, checkoutPrice: dw.value.Money, sourceUrl: String, merchantReference: String, store: dw.catalog.Store) {
        this._requestUrl = this.afterpayApiContext.getFlowApiUrls().get("createOrders");
        this._generateRequestBody(cart, checkoutPrice, sourceUrl, merchantReference, store);
    },

    getResponse : function () {
        Logger.debug("RequestBody: " + JSON.stringify(this._requestBody));
        var response = this.afterpayHttpService.call(this._requestUrl, "CREATE_ORDER", this._requestBody);
        Logger.debug("Response: " + JSON.stringify(response));
        return response;
    },

    _generateRequestBody : function (cart, checkoutPrice, sourceUrl: String, merchantReference: String, store: dw.catalog.Store) {
        var orderRequestBuilder = new OrderRequestBuilder();

        this._requestBody = orderRequestBuilder.buildRequest({
            cart: cart,
            checkoutPrice: checkoutPrice,
            merchantReference: merchantReference,
            sourceUrl: sourceUrl,
            store: store,
            "requestMethod" : 'POST'
        }).get();
    }
});

module.exports = new ExpressOrderService();