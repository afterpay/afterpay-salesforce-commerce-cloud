'use strict';
var assert = require('chai').assert;
var expect = require('chai').expect;
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();
var sinon = require('sinon');
var afterpayConstants = require('../../../../../cartridges/int_afterpay_core/cartridge/scripts/util/afterpayConstants');

var transaction = {
    wrap: function (callBack) {
        return callBack.call();
    },
    begin: function () {
    },
    commit: function () {
    }
};

var order = {
    paymentInstruments: [
        {
            paymentMethod: {
                equals: function (value) {
                    return value === 'AFTERPAY';
                },
                value: 'AFTERPAY'
            }
        }]
};

var paymentStatus = {
    status: 'some status'
};

var utilitiesMock = {
    getSitePreferencesUtilities: function () {
        return {
            getPaymentMode: function () {
                return 'AFTERPAY';
            }
        };
    },
    brandUtilities: {
        getApiVersionDependentClass: function () {
            return {
                handleUpdateOrder: function () {
                }
            }
        }
    }
};

var customLogger = {
    getLogger: function () {
        return Logger;
    }
};
var Logger = {
    debug: function () {
    },
    error: function () {
    },
};

describe('#afterpayHandlePaymentOrder()', function () {

    var afterpayHandlePaymentOrder = proxyquire('../../../../../cartridges/int_afterpay_core/cartridge/scripts/checkout/afterpayHandlePaymentOrder', {
        'dw/system/Transaction': transaction,
        '*/cartridge/scripts/checkout/afterpayUpdateOrder': {
            handleUpdateOrder: function () {
                return {};
            }
        },
        '*/cartridge/scripts/util/afterpayUtilities': utilitiesMock,
        '*/cartridge/scripts/logic/services/afterpayUpdateOrderService': {
            extend: function () {
                return {};
            }
        },
        '*/cartridge/scripts/util/afterpayLogUtils': customLogger,
        '*/cartridge/scripts/util/afterpayConstants': afterpayConstants
    });

    it('get payment transaction details', function () {
        var result = afterpayHandlePaymentOrder.getPaymentStatus(order, paymentStatus);
        expect(result).to.be.object;
    });

});

