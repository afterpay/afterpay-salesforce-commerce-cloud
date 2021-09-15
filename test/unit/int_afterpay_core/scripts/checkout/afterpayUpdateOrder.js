'use strict';
var assert = require('chai').assert;
var expect = require('chai').expect;
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();
var sinon = require('sinon');
var loggerMock = require('../../../../mocks/dw/system/Logger');
var afterpayConstants = require('../../../../../cartridges/int_afterpay_core/cartridge/scripts/util/afterpayConstants');
var OrderMock = require('../../../../mocks/models/order');
var moneyMock = require('../../../../mocks/dw.value.Money');
var ArrayList = require('../../../../mocks/dw.util.Collection.js');
var PaymentMgrMock = require('../../../../mocks/dw/order/PaymentMgr');

var order = new OrderMock();

var transaction = {
    wrap: function (callBack) {
        return callBack.call();
    },
    begin: function () {
    },
    commit: function () {
    }
};

var paymentResult = {
    status: 'some status'
};
var paymentModeMock = {};

var paymentTransaction = {
    UUID: '1234-1234-1234-1234',
    amount: {value: 300.00}
}
var paymentMethod = {
    paymentProcessor: {
        ID: '23decmnzfds'
    }
}
var apUtilities = {
    brandUtilities: {
        getCountryCode: function () {
            return 'US';
        }
    },
    checkoutUtilities: {
        getPaymentMethodName: function () {
            return 'AFTERPAY';
        }
    }
};

global.empty = function (value) {
    if (value && value.length) {
        return !value.length;
    }
    return !value;
};

var abstractAfterpayUpdateOrder = proxyquire('../../../../../cartridges/int_afterpay_core/cartridge/scripts/checkout/afterpayUpdateOrder.js', {
    '*/cartridge/scripts/util/afterpayConstants': afterpayConstants,
    '*/cartridge/scripts/util/afterpayUtilities': apUtilities,
    'dw/system/Transaction': transaction,
    'dw/system/Logger': loggerMock,
    'dw/order/Order': OrderMock,
    'dw/value/Money': moneyMock,
    'dw/order/PaymentMgr': PaymentMgrMock
});

describe('afterpayUpdateOrder', function () {

    var afterpayUpdateOrder = proxyquire('../../../../../cartridges/int_afterpay_core/cartridge/scripts/checkout/v2/afterpayUpdateOrder.js', {
        '*/cartridge/scripts/util/afterpayConstants': afterpayConstants,
        '*/cartridge/scripts/util/afterpayUtilities': apUtilities,
        '*/cartridge/scripts/checkout/afterpayUpdateOrder': abstractAfterpayUpdateOrder,
        'dw/system/Transaction': transaction,
        'dw/system/Logger': loggerMock,
        'dw/order/Order': OrderMock,
        'dw/value/Money': moneyMock,
        'dw/order/PaymentMgr': PaymentMgrMock
    });
    OrderMock.ORDER_STATUS_CREATED = 0;
    order.orderNo = '1234567';
    order.status = {};
    order = {
        paymentInstruments: [
            {

                paymentMethod: {
                    equals: function (value) {
                        return value === 'AFTERPAY';
                    },
                    value: 'AFTERPAY'
                }
            }
        ]
    };

    describe('#getPaymentTransaction()', function () {
        it('get payment transaction details', function () {

            var result = afterpayUpdateOrder.getPaymentTransaction(order);
            expect(result).to.be.object;
        });
    });

    describe('#getPaymentProcessor()', function () {
        it('get payment processor details', function () {

            PaymentMgrMock.getPaymentMethod = function () {
                return {
                    getPaymentProcessor: function () {
                        return 'AFTERPAY_CREDIT';
                    }
                };
            };
            var result = afterpayUpdateOrder.getPaymentProcessor();
            expect(result).to.be.object;

        });
    });

    describe('#saveOrder()', function () {
        it('save order details', function () {

            var Order = {
                paymentStatus: "success",
                custom: {apIsAfterpayOrder: true},
                setPaymentStatus: function (paymentStatusInput) {
                    this.paymentStatus = paymentStatusInput;
                }
            };

            var result = afterpayUpdateOrder.saveOrder(Order, paymentResult);
            expect(result).to.be.object;

        });
    });

    describe('#savePaymentTransaction()', function () {
        var paymentResult = {
            id: '1234',
            totalAmount: {amount: 100},
            status: 'SUCCESS'
        };
        var paymentMode = {
            DIRECT_CAPTURE: 'DIRECT_CAPTURE'
        };

        paymentTransaction = {
            transactionID: '1234ded',
            amount: '1234ded',
            paymentProcessor: {
                ID: '23decmnzfds'
            },

            setTransactionID: function (transactionIDInput) {
                this.transactionID = transactionIDInput;
            },
            setAmount: function (amountInput) {
                this.amount = amountInput;
            },
            setPaymentProcessor: function (paymentProcessorInput) {
                this.processor = paymentProcessorInput;
            },
            custom: {apPaymentID: 'someUUID'},
        };
        it('save payment transaction details', function () {
            var result = afterpayUpdateOrder.savePaymentTransaction(paymentTransaction, paymentResult, paymentMode);
            expect(result).to.be.object;
        });
    });
});
