var AfterpayApiContext = require('*/cartridge/scripts/context/afterpayApiContext');

/**
 *  creation of api context object
 */
var AfterpayHttpMockService = function () {
    this.afterpayApiContext = new AfterpayApiContext();
};

/**
 * mock service is being called
 * @param {Object} service - service
 * @returns {Object} response - response
 */
AfterpayHttpMockService.prototype.call = function (service) {
    var url = service.URL;
    var requestMethod = service.requestMethod;

    return this.determineApiCall(url, requestMethod);
};

AfterpayHttpMockService.prototype.determineApiCall = function () {};

module.exports = AfterpayHttpMockService;
