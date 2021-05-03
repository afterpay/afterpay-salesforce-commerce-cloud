'use strict';

var assert = require('chai').assert;
var expect = require('chai').expect;
var sinon = require('sinon');
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();
var BasketMgrMock = require('../../../../mocks/dw/order/BasketMgr');
var loggerMock = require('../../../../mocks/dw/system/Logger');

var orderCreateServiceMock = {
    generateRequest: function (lineItemCtnr, url) {
		url = afterpayUtils.endPoint;
		orderCreateServiceMock.generateRequestBody(lineItemCtnr, url);
    },
	getResponse: function () {
		return {
			apToken: 'M2QwZTQxZDJmOTYyMjc1ZTczMWU3NDM3NzM2ZWM1Y2FhNGMwZGRmYWM5MzM2ZGEzNjM1Y2U3NmU5MjMzNTM5MA'
		};
    },
	generateRequestBody : function (lineItemCtnr, url) {
		var requestMethod = 'POST';
		orderRequestBuilderMock.buildRequest(lineItemCtnr, url, requestMethod);
	}
};
var orderRequestBuilderMock = {
    buildRequest: function (params) {
		 var basket = params.basket,
            url = params.url,
            requestMethod = params.requestMethod;
    },
};
var tokenModel = sinon.stub();
tokenModel.returns({
    apToken: null
});
var afterpayUtils = sinon.stub();
afterpayUtils.returns({
    endPoint: 'orders'
});

var customLogger = {
    getLogger: function() {
				return Logger;
	}
};
var Logger = {
	debug: function() {},
	error: function() {},
};
 describe('#getToken()', function () {

	  var afterpayGetToken = proxyquire('../../../../../cartridges/int_afterpay_sfra/cartridge/scripts/checkout/afterpayGetToken.js', {
					'dw/order/BasketMgr': BasketMgrMock,
					'*/cartridge/scripts/order/orderService': orderCreateServiceMock,
					'*/cartridge/scripts/models/afterpayTokenModel.js': tokenModel,
					'*/cartridge/scripts/util/afterpayLogUtils' : customLogger
			});

            it('get token details', function () {
				orderCreateServiceMock.generateRequest(BasketMgrMock.getCurrentBasket());
				var response = orderCreateServiceMock.getResponse();
				var token = tokenModel.apToken;
				token = response.apToken;
            });

			it('when token is empty', function() {
			Logger.error("Can not get token");
        });
});

