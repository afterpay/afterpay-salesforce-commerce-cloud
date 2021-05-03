'use strict';
var assert = require('chai').assert;
var expect = require('chai').expect;
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();
var sinon = require('sinon');
var ArrayList = require('../../../../../../mocks/dw.util.Collection.js');
var collections = require('../../../../../../mocks/afterpayCollections');

function MockBasket() {}

MockBasket.prototype.getPaymentInstruments = function () {
    return new ArrayList([null, null, null]);
};

MockBasket.prototype.removePaymentInstrument = function () {
    return true;
 };

MockBasket.prototype.createPaymentInstrument = function () {
    return {
        paymentMethod: "AFTERPAY",
        paymentTransaction:
        {
            amount: {
                    value: "300.00"
                    }
        }
    };
 };

var transaction = {
    wrap: function (callBack) {
        return callBack.call();
    },
    begin: function () { },
    commit: function () { }
};

var item = {
    paymentMethod: "CREDIT_CARD",
    paymentTransaction:
        {
            amount: {
                    value: "300.00"
                    }
        }
};

describe('afterpay_credit', function () {
    describe('#Handle', function() {

		it('handle afterpay payment processor', function() {
            var currentBasket = new MockBasket();


            var afterpayCredit = proxyquire('../../../../../../../cartridges/int_afterpay_sfra/cartridge/scripts/hooks/payment/processor/afterpay_credit.js', {
				'*/cartridge/scripts/util/collections': collections,
				'dw/system/Transaction': transaction
			});

			var result = afterpayCredit.Handle(currentBasket);
            expect(result).to.be.an('object');
        });

	});
});
