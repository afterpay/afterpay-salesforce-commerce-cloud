'use strict';

var AfterpaySitePreferencesUtilities = require("~/cartridge/scripts/util/AfterpayUtilities").getSitePreferencesUtilities();
var ctrlCartridgeName = AfterpaySitePreferencesUtilities.getControllerCartridgeName();
var Class 		= require(ctrlCartridgeName + '/cartridge/scripts/util/Class').Class;
var ExpressCaptureRequestBuilder = require('~/cartridge/scripts/payment/ExpressCaptureRequestBuilder');
var LogUtils = require('~/cartridge/scripts/util/LogUtils');
var Logger = LogUtils.getLogger('AfterpayCapture');

var ExpressCaptureHelpers = Class.extend({
    generateItemsAndShippingBody : function(lineItemCtnr : dw.order.LineItemCtnr) {
        var expressCaptureRequestBuilder = new ExpressCaptureRequestBuilder();

        let body = expressCaptureRequestBuilder.buildRequest({
            basket: lineItemCtnr,
        }).get();
        return body;
    }

});
  
module.exports = new ExpressCaptureHelpers();
