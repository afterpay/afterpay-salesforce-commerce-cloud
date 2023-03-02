'use strict';

var assert = require('chai').assert;
var expect = require('chai').expect;
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();
var sinon = require('sinon');
var loggerMock = require('../../../../../mocks/dw/system/Logger');

describe('afterpayService', function () {
    var afterpayServiceInit = require('../../../../../mocks/afterpay_mocks/afterpayService');

    var data = {
        request: {
            urlPath: 'orders',
            requestMethod: 'POST',
            basket: {}
        }
    };

    it('afterpayService should be initialized', function () {
        var service = afterpayServiceInit.getAfterpayHttpService();
        var result = service.call("afterpay.http.defaultendpoint.US");
        assert.isNotNull(result);
        var responseData = service.getResponse();
        assert.isNotNull(responseData);
    });

    it('afterpayService createRequest is working', function () {
        var expectedOrderRequest = {
            expires: 'formatted date',
            token: 'authentication token'
        };
        var service = afterpayServiceInit.getAfterpayHttpService();
        var result = service.call("afterpay.http.defaultendpoint.US");
    });

    it('afterpayService createRequest is null', function () {
        var dataWithInvalidMethod = {
            urlPath: '/orders',
            requestMethod: 'POST',
            request: {}
        };
        var service = afterpayServiceInit.getAfterpayHttpService();
        var resultWithInvalidMethod = service.call("afterpay.http.defaultendpoint.US");

    });

    it('afterpayService getRequestLogMessage and getResponseLogMessage are null if request and response are bad respectively', function () {
        var service = afterpayServiceInit.getAfterpayHttpService();
        var result = service.call("afterpay.http.defaultendpoint.US");
    });
});
