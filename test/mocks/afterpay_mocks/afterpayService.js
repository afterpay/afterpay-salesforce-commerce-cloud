'use strict';

var proxyquire = require('proxyquire').noCallThru().noPreserveCache();

var afterpayServiceHandler = {
    data: {},
    configObj: {},
    client: {
        text: '{"success":true,"message":"success"}'
    },
    mock: false,
    request: {}
};

var service = {
    configuration: {
        credential: {
            URL: 'URL'
        }
    },
    URL: null,
    headers: [],
    method: 'POST',
    addHeader: function (key, value) {
        this.headers[key] = value;
    },
    setRequestMethod: function (method) {
        this.method = method;
    },
    setURL: function (url) {
        this.configuration.credential.URL = url;
        this.URL = url;
    }
};

var stringUtilsMock = {
    format: function (format, args) {
        var formattedString = format + args;
        return formattedString;
    }
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
    afterpaySitePreferencesUtilities: function () {
        return {
            getUserAgent: function () { return {}; },
            getCaptureTimeout: function () { return {}; },
            getServiceName: function () { return 'afterpay_service_id'; }
        };
    }
};

var afterpayUtilities = {
    brandUtilities: {
        getCountryCode: function () {
            return 'US';
        },
        getBrandSettings: function () {
            return {
                service: 'afterpay.service.USCA'
            }
        }
    },
    sitePreferencesUtilities: {
        getServiceName: function () { return 'afterpay_service_id'; },
        getUserAgent: function () { return {}; },
        getCaptureTimeout: function () { return {}; },
    }
};

function proxyModel() {
    return proxyquire('../../../cartridges/int_afterpay_core/cartridge/scripts/logic/services/afterpayHttpService',
        {
            'dw/svc/LocalServiceRegistry': {
                createService: function (serviceId, configObj) {
                    return {
                        call: function (data) {
                            afterpayServiceHandler.configObj = configObj;
                            afterpayServiceHandler.data = data;
                           
                            var isOk = true;
                            var statusCheck = true;
                            return {
                                ok: isOk,
                                object: {
                                    status: isOk && statusCheck ? 'SUCCESS' : 'ERROR'
                                },
                                error: isOk ? 200 : 400
                            };
                        },
                        setMock: function () {
                            afterpayServiceHandler.mock = true;
                        },
                        getConfiguration: function () {
                            return afterpayServiceHandler.configObj;
                        },
                        getRequestData: function () {
                            afterpayServiceHandler.request = afterpayServiceHandler.configObj.createRequest(service);
                            return afterpayServiceHandler.request;
                        },
                        getResponse: function () {
                            return afterpayServiceHandler.mock
                                ? afterpayServiceHandler.configObj.mockCall(svc)
                                : afterpayServiceHandler.configObj.parseResponse(service, afterpayServiceHandler.client);
                        },
                        getCredentialID: function () {
                            return serviceId;
                        },
                        getMessage: function (response) {
                            return {
                                logMessage: afterpayServiceHandler.configObj.filterLogMessage('header test message'),
                                requestData: afterpayServiceHandler.configObj.getRequestLogMessage(afterpayServiceHandler.request),
                                logResponse: afterpayServiceHandler.configObj.getResponseLogMessage(response)
                            };
                        },
                        getErrorMessage: function (response) {
                            var obj = {};
                            obj.a = { b: obj };
                            return {
                                logMessage: afterpayServiceHandler.configObj.filterLogMessage('header test message'),
                                requestData: afterpayServiceHandler.configObj.getRequestLogMessage(obj),
                                logResponse: afterpayServiceHandler.configObj.getResponseLogMessage(response)
                            };
                        }
                    };
                }
            },
            '*/cartridge/scripts/util/afterpayUtils' : {
                        filterRequestForLog: function () {
                            return {};
                        }
                    },
            '*/cartridge/scripts/util/afterpayUtilities' : afterpayUtilities,
            'dw/util/StringUtils' : stringUtilsMock,
            '*/cartridge/scripts/util/afterpayLogUtils' : customLogger
        });
}

module.exports = proxyModel();