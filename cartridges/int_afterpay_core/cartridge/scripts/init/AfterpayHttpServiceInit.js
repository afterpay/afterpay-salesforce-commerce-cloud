'use strict';

require('dw/io');
require('dw/net');
importPackage(dw.svc);

var AfterpayWebServiceUtilities = require("~/cartridge/scripts/util/AfterpayUtilities").getAfterpayWebServiceUtilities();
var AfterpaySitePreferencesUtilities = require("~/cartridge/scripts/util/AfterpayUtilities").getSitePreferencesUtilities();
var AfterpayHttpMockService = require("~/cartridge/scripts/logic/services/AfterpayHttpMockService");

var parseAllVerbResponse = function(service : HTTPService, response : Object) {
    return response;
};

var mockResponse = function(service : HTTPService, response : Object){
    var afterpayHttpMockService = new AfterpayHttpMockService();

    return afterpayHttpMockService.call(service, response);
};

var filterGetLogMessage = function(msg:String) {
    return msg.replace("headers", "OFFWITHTHEHEADERS");
};

var createRequest = function (service : HTTPService, args) {
	var requestMethod = !empty(args) && !empty(args.requestMethod) ? args.requestMethod : 'POST';
	
	service.addHeader("Content-Type", "application/json;charset=utf-8");
	service.setRequestMethod(requestMethod);
	AfterpayWebServiceUtilities.setSASAuthorization(service);
	
	if (!empty(args)) {
		return JSON.stringify(args);
	}
};

var httpConfiguration = {
    createRequest: createRequest,
    parseResponse: parseAllVerbResponse,
    mockCall: mockResponse,
    filterLogMessage: filterGetLogMessage
};

ServiceRegistry.configure(AfterpaySitePreferencesUtilities.getServiceName(), httpConfiguration );
