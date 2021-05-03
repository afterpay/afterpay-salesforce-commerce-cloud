var AfterpayApiContext = require('*/cartridge/scripts/context/afterpayApiContext');
var AfterpayHttpService = require('*/cartridge/scripts/logic/services/afterpayHttpService.js');
var Class = require('*/cartridge/scripts/util/class').Class;

/**
 *  request and response definitions for service to retrieve threshold amounts
 */
var ConfigurationService = Class.extend({

    _requestUrl: null, // eslint-disable-line

    init: function () {
        this.afterpayHttpService = new AfterpayHttpService();
        this.afterpayApiContext = new AfterpayApiContext();
    },

    generateRequest: function () {
        this._requestUrl = this.afterpayApiContext.getFlowApiUrls().get('getConfiguration'); // eslint-disable-line
    },

    getResponse: function () {
        var response = this.afterpayHttpService.call(this._requestUrl, 'GET_CONFIGURATION', { requestMethod: 'GET' }); // eslint-disable-line
        return response;
    }
});

module.exports = new ConfigurationService();
