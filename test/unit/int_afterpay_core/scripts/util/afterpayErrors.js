'use strict';
var assert = require('chai').assert;
var expect = require('chai').expect;
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();
var sinon = require('sinon');

var responseCode = {
    httpStatusCode: "402"
};

global.session = {
    privacy: {
        afterpayBrand: 'afterpay'
    }
};

describe('afterpayErrors', function () {

    it('handle error responses based on the httpstatus codes', function () {
        var afterpayErrors = proxyquire('../../../../../cartridges/int_afterpay_core/cartridge/scripts/util/afterpayErrors.js', {
            'dw/web/Resource': {
                msg: function () {
                    return 'someString';
                }
            }
        });

        var result = afterpayErrors.getErrorResponses(responseCode);
        expect(result).to.be.an('string');
    });
});
