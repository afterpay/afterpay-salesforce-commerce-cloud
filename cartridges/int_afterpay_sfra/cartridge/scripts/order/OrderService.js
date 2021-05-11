'use strict';

var AfterpayApiContext = require("~/cartridge/scripts/context/AfterpayApiContext");
var AfterpayHttpService = require("~/cartridge/scripts/logic/services/AfterpayHttpService");
var AfterpaySitePreferencesUtilities = require("~/cartridge/scripts/util/AfterpayUtilities").getSitePreferencesUtilities();
var OrderRequestBuilder = require('~/cartridge/scripts/order/OrderRequestBuilder');
var Class = require('~/cartridge/scripts/util/Class').Class;
var Site = require('dw/system/Site');

var OrderService = Class.extend({

     _requestUrl : null,
     _requestBody : {},

    init : function() {
        this.afterpayHttpService = new AfterpayHttpService();
        this.afterpayApiContext = new AfterpayApiContext();
        this.afterpaySitePreferencesUtilities = AfterpaySitePreferencesUtilities;
    },

    generateRequest : function(lineItemCtnr : dw.order.LineItemCtnr, url : String) {
        this._requestUrl = this.afterpayApiContext.getFlowApiUrls().get("createOrders");
        this._generateRequestBody(lineItemCtnr, url);
    },

    getResponse : function () {
        var response = this.afterpayHttpService.call(this._requestUrl, "CREATE_ORDER", this._requestBody);
        return response;
    },

    _generateRequestBody : function (lineItemCtnr, url) {
        var orderRequestBuilder = new OrderRequestBuilder();

        this._requestBody = orderRequestBuilder.buildRequest({
            basket: lineItemCtnr,
            url: url,
            "requestMethod" : 'POST'
        }).get();
    }
});

module.exports = new OrderService();