'use strict';

var assert = require('chai').assert;
var expect = require('chai').expect;
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();

var afterpayHttpServiceMock = {
    getAfterpayHttpService: function () {
        return {
            call: function () {
                return {};
            }
        }
    }
};

var afterpayUtils = {
    handleServiceResponses: function () {
        return {};
    },
    getEndpoint: function () {
        return "some url";
    },

};

describe('#DirectCapturePaymentService()', function () {
    var afterpayDirectCapturePaymentService = proxyquire('../../../../../../cartridges/int_afterpay_core/cartridge/scripts/logic/services/afterpayDirectCapturePaymentService.js', {
        '*/cartridge/scripts/logic/services/afterpayHttpService': afterpayHttpServiceMock,
        '*/cartridge/scripts/util/afterpayUtils': afterpayUtils
    });

    var token = 'M2QwZTQxZDJmOTYyMjc', orderNo = "2134234";
    it('generated direct capture service request successfully', function () {
        var result = afterpayDirectCapturePaymentService.generateRequest(token, orderNo);
        expect(result).to.be.object;

    });

    it('generated direct capture response successfully', function () {
        var result = afterpayDirectCapturePaymentService.getResponse(token);
        expect(result).to.be.object;

    });
});