'use strict';
var assert = require('chai').assert;
var expect = require('chai').expect;
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();
var sinon = require('sinon');
var afterpayConstants = require('../../../../../../cartridges/int_afterpay_sfra/cartridge/scripts/util/afterpayConstants');
var SiteMock = require('../../../../../mocks/dw/system/Site');
var OrderMock = require('../../../../../mocks/models/order');

var order = new OrderMock();

var transaction = {
    wrap: function (callBack) {
        return callBack.call();
    },
    begin: function () { },
    commit: function () { }
};

var orderMgrMock = {
    searchOrders: function () { }
};

var  order = {
    paymentInstruments: [
    {
        paymentMethod: {
            equals: function (value) {
            return value === 'AFTERPAY_PBI';
            },
            value: 'AFTERPAY_PBI'
        }
    }]
};

var paymentStatus ={
    status: 'some status'
};


var utilitiesMock = {
    checkoutUtilities: {
        getPaymentMode: function () { return 'AFTERPAY_PBI'; }
    }
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

var HashMapMock = function (data) {
    return {
        result: data,
        put: function (key, context) {
            this.result[key] = context;
        },
        get: function (key) {
            return this.result[key];
        }
    };
};


describe('#afterpayupdateOrderService()', function () {

             var updateOrderService = proxyquire('../../../../../../cartridges/int_afterpay_sfra/cartridge/scripts/logic/services/afterpayUpdateOrderService', {
                    'dw/system/Transaction': transaction,
                    'dw/order/OrderMgr': orderMgrMock,
                     'dw/web/Resource': {
                     	msg: function () {
                        	return 'someString';
                    	}
                 	},
                    '*/cartridge/scripts/payment/paymentService' : {
                        handleUpdateOrder: function () { return {}; }
                    },
                    '*/cartridge/scripts/logic/services/afterpayDirectCapturePaymentService' : {
                        generateRequest: function () { return {}; },
                        getResponse: function () { return {}; }
                    },
                    '*/cartridge/scripts/logic/services/afterpayAuthorisePaymentService' : {
                        handleUpdateOrder: function () { return {}; }
                    },
                    '*/cartridge/scripts/util/afterpayUtilities' : utilitiesMock,
                    '*/cartridge/scripts/logic/services/afterpayUpdateOrderService' : {
                        extend: function () {
                        return {};
                        }
                    },
                    '*/cartridge/scripts/util/afterpayLogUtils' : customLogger,
                    '*/cartridge/scripts/util/afterpayConstants': afterpayConstants,
                     'dw/system/Site': SiteMock,
                     'dw/web/Resource': {
                      msg: function () {
                			return 'someString';
                			}
            	      },
                     'dw/util/HashMap': HashMapMock,
                     'dw/order/Order': OrderMock                     
			    });
				
				OrderMock.ORDER_STATUS_CREATED = 0;
		        order.orderNo = '1234567';
                order.status = {};
                order = {
                    paymentInstruments: [
                    {

                    paymentMethod: {
                        equals: function (value) {
                            return value === 'AFTERPAY_PBI';
                        },
                        value: 'AFTERPAY_PBI'
                    },
                    paymentTransaction : {
        				custom: { 
        					apToken: "jhsdjkbcdj",
        					apPaymentID: "payment ID"
        
        				}
					}

                  }
                  ]
                };
                
            it('handled order details successfully', function () {
                var result = updateOrderService.handleOrder(order, paymentStatus);
                expect(result).to.be.object;
            });
			
			it('authorise direct capture successfully', function () {
                var result = updateOrderService.handleApprovalOrder(order);
                expect(result).to.be.object;
            });

        });

