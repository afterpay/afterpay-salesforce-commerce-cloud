'use strict';

var assert = require('chai').assert;
var expect = require('chai').expect;
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();

var afterpayHttpServiceMock = {
    call: function () {
        return {};
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

describe('#ConfigurationService()', function () {
    var afterpayConfigurationService = proxyquire('../../../../../../cartridges/int_afterpay_core/cartridge/scripts/logic/services/afterpayConfigurationService.js', {
        '*/cartridge/scripts/logic/services/afterpayHttpService': afterpayHttpServiceMock,
        '*/cartridge/scripts/util/afterpayUtils': afterpayUtils,
        '*/cartridge/scripts/util/afterpayLogUtils': customLogger
    });

    var token = 'M2QwZTQxZDJmOTYyMjc', orderNo = "2134234";
    it('generated configuration service request successfully', function () {
        var result = afterpayConfigurationService.generateRequest();
        expect(result).to.be.object;

    });

    it('generated configuration response successfully', function () {
        var result = afterpayConfigurationService.getResponse();
        expect(result).to.be.object;

    });
});