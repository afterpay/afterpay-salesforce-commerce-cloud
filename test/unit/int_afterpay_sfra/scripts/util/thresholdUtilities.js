'use strict';
var assert = require('chai').assert;
var expect = require('chai').expect;
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();
var sinon = require('sinon');
var loggerMock = require('../../../../mocks/dw/system/Logger');
var afterpayConstants = require('../../../../../cartridges/int_afterpay_sfra/cartridge/scripts/util/afterpayConstants');

var transaction = {
    wrap: function (callBack) {
        return callBack.call();
    },
    begin: function () { },
    commit: function () { }
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

var utilitiesMock = {
    sitePreferencesUtilities: {
        getMinThresholdAmount: function () { return 100; },
        getMaxThresholdAmount: function () { return 1000; }
    }
};

var session = {
		privacy: {
            map: new Map(), // eslint-disable-line no-undef
            get: function (key) { // eslint-disable-line no-unused-vars
                return this.map.get(key);
            },
            set: function (key, value) { // eslint-disable-line no-unused-vars
                this.map.set(key, value);
            },
            key: ''
        }
    };

global.session = session;

describe('set threshold in session', function () {

         var thresholdUtilities = proxyquire('../../../../../cartridges/int_afterpay_sfra/cartridge/scripts/util/thresholdUtilities.js', {
                    'dw/system/Transaction': transaction,
                    '*/cartridge/scripts/logic/services/afterpayConfigurationService':  {
                    init: function () {
                        return {};
                    },
                     generateRequest: function () {
                        return {};
                    }

                },
                    '*/cartridge/scripts/util/afterpayUtilities': utilitiesMock,
                    '*/cartridge/scripts/util/afterpayLogUtils' : customLogger,
                    '*/cartridge/scripts/util/afterpayConstants.js': afterpayConstants
			    });
            it('set session in utilities', function () {
                var afterPayIsRangeAvailable = session.privacy.set('afterPayIsRangeAvailable', true);
                var afterPayMinAmount = session.privacy.set('afterPayMinAmount', 100);
                var afterPayMaxAmount = session.privacy.set('afterPayMaxAmount', 1000);
                var result = thresholdUtilities.setThresholdInSession();
                expect(result).to.be.object;
            });
});

