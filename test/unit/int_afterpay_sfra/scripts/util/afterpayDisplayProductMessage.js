
'use strict';
/* global empty */
var assert = require('chai').assert;
var expect = require('chai').expect;
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();
var moneyMock = require('../../../../mocks/dw.value.Money');
var SiteMock = require('../../../../mocks/dw/system/Site');
var StringUtilsMock = require('../../../../mocks/util/StringUtils');

var booleanMock = true;

var utilitiesMock = {
    sitePreferencesUtilities: {
        isDisplayPdpInfo: function () { return booleanMock; },
        isDisplayPlpInfo: function () { return booleanMock; }
    }
};

describe('getwidgetResponse', function () {

		var displayProductMessage = proxyquire('../../../../../cartridges/int_afterpay_sfra/cartridge/scripts/util/afterpayDisplayProductMessage.js', {
			  'dw/value/Money': moneyMock,
			  'dw/web/Resource': {
                     msg: function () {
                        return 'someString';
                    }
                 },
              '*/cartridge/scripts/util/afterpayUtilities.js': utilitiesMock,
              'dw/util/StringUtils': StringUtilsMock,
              'dw/system/Site': SiteMock,
              '*/cartridge/scripts/util/thresholdUtilities.js': {
                    getThreshold: function () {
                        return {
                            minAmount : 100,
                            maxAmount : 1000
                        };
                    }
                }
		});


		it('get widget object', function() {
			var result = displayProductMessage.getMessage(true,100);
			expect(result).to.be.object;
        });

        it('get product details widget object', function() {
			var result = displayProductMessage.getPDPMessage(true,100);
			expect(result).to.be.object;
        });

         it('get product listing page widget object', function() {
			var result = displayProductMessage.getPLPMessage(true,100);
			expect(result).to.be.object;
        });

        it('get threshold widget object', function() {
			var result = displayProductMessage.getThresholdRange(100);
			expect(result).to.be.object;
        });

});

