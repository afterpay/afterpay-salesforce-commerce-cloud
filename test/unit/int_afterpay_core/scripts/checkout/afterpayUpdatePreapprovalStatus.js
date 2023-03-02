'use strict';
var assert = require('chai').assert;
var expect = require('chai').expect;
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();
var sinon = require('sinon');
var loggerMock = require('../../../../mocks/dw/system/Logger');
var isCashAppPay = false;

var transaction = {
    wrap: function (callBack) {
        return callBack.call();
    },
    begin: function () {
    },
    commit: function () {
    }
};

var stubPreapprovalModel = sinon.stub();
stubPreapprovalModel.returns({
    status: null,
    apToken: null
});

var paymentTransaction = {
    custom: {
        apInitialStatus: 'approved',
        apToken: 'shjdjadgejdksbfcdjfgbdsnkc'
    }
}

var parameter = {
    status: 'some status',
    apToken: 'shjdjadgejdksbfcdjfgbdsnkc'
}

var utilitiesMock = {
    checkoutUtilities: {
        getPaymentTransaction: function () {
            return paymentTransaction;
        },
        getPaymentMethodName: function (isCashAppPay) {
            return 'AFTERPAY';
        }
    }
};

var lineItemCtnrStub = {
    getPaymentInstruments: function () {
        return {
            paymentMethod: {
                equals: function (value) {
                    return value === 'AFTERPAY';
                },
                value: 'AFTERPAY'
            },
            paymentTransaction: {
                transactionID: '11148651345',
                amount: {value: 100},
                custom: {
                    apInitialStatus: "approved"
                }
            }
        }
    }
};

var customLogger = {
    getLogger: function() {
	return Logger;
	}
};

var Logger = {
    debug: function () {
    },
    error: function () {
    },
};

describe('afterpayUpdatePreapprovalStatus', function () {

    var afterpayUpdatePreapprovalStatus = proxyquire('../../../../../cartridges/int_afterpay_core/cartridge/scripts/checkout/afterpayUpdatePreapprovalStatus', {
        'dw/system/Transaction': transaction,
        '*/cartridge/scripts/models/preapprovalModel': stubPreapprovalModel,
        '*/cartridge/scripts/util/afterpayUtilities': utilitiesMock,
        '*/cartridge/scripts/util/afterpayLogUtils': customLogger
    });

    describe('#parsePreapprovalResult()', function () {
        it('parse preapproval status', function () {
            var result = afterpayUpdatePreapprovalStatus.parsePreapprovalResult(parameter);
            expect(result).to.be.object;
        });
    });

    describe('#updatePreapprovalStatus()', function () {
        it('update pre approval status', function () {
            stubPreapprovalModel.returns({
                status: 'some status',
                apToken: 'shjdjadgejdksbfcdjfgbdsnkc'
            });

            var result = afterpayUpdatePreapprovalStatus.updatePreapprovalStatus(stubPreapprovalModel, lineItemCtnrStub, isCashAppPay);
            expect(result).to.be.object;
        });
    });

    describe('#getPreApprovalResult()', function () {
        it('get pre approval status', function () {
            var empty = sinon.stub();
            empty = function () {
                return false;
            }

            var result = afterpayUpdatePreapprovalStatus.getPreApprovalResult(lineItemCtnrStub, parameter);
            expect(result).to.be.object;
        });
    });
});
