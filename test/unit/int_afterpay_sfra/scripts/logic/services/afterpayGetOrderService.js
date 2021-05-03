'use strict';

var assert = require('chai').assert;
var expect = require('chai').expect;
var sinon = require('sinon');
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();
var StringUtilsMock = require('../../../../../mocks/util/StringUtils');

var afterpayHttpServiceMock = {
   call: function() {
				return {};
	}
};

var afterpayUtils = {
    getOrders: function() {
				return "orders/{0}";
	},
	getEndpoint: function() {
				return "some url";
	},
	
};

var customLogger = {
    getLogger: function() {
				return Logger;
	}
};

var Logger = {
	debug: function() {},
	error: function() {},
};
describe('#getOrderService()', function () {
	var afterpayGetOrderService = proxyquire('../../../../../../cartridges/int_afterpay_sfra/cartridge/scripts/logic/services/afterpayGetOrderService.js', {
				'dw/util/StringUtils': StringUtilsMock,
				'*/cartridge/scripts/logic/services/afterpayHttpService': afterpayHttpServiceMock,
				'*/cartridge/scripts/util/afterpayUtils' : afterpayUtils,
				'*/cartridge/scripts/util/afterpayLogUtils' : customLogger
			});
			
			
			var token = 'M2QwZTQxZDJmOTYyMjc';
			 it('generated getOrder service request successfully', function () {
                var result = afterpayGetOrderService.generateRequest(token);
                expect(result).to.be.object;

            });
            
            it('generated getOrder service response successfully', function () {
                var result = afterpayGetOrderService.getResponse(token);
                expect(result).to.be.object;

            });
 });