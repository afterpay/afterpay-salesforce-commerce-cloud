require('dw/io');
require('dw/net');
require('dw/object');
require('dw/svc');
require('dw/system');
require('dw/util');
require('dw/web');

var AfterpayApiContext = require("~/cartridge/scripts/context/AfterpayApiContext");

var AfterpayHttpMockService = function() {
    this.afterpayApiContext = new AfterpayApiContext();
};

AfterpayHttpMockService.prototype.call = function(service : HTTPService, client : HTTPClient) {
    var hservice = service;
    var hclient = client;
    var url = service.URL;
    var requestMethod = service.requestMethod;

    return this.determineApiCall(url, requestMethod);
};

AfterpayHttpMockService.prototype.determineApiCall = function(urlPath : String, requestMethod : String) {

};

module.exports = AfterpayHttpMockService