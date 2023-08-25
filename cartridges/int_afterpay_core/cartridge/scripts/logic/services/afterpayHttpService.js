'use strict';

var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');
var afterpayUtils = require('*/cartridge/scripts/util/afterpayUtils');
var LogUtils = require('*/cartridge/scripts/util/afterpayLogUtils');
var Logger = LogUtils.getLogger('afterpayHttpService');
var AfterpayUtilities = require('*/cartridge/scripts/util/afterpayUtilities');

/**
 * generic method  to process  all service type requests and responses
 */

/**
 * Gets service id
 * @returns {string} - service id
 * */
function getServiceID() {
    var BrandUtilities = AfterpayUtilities.brandUtilities;
    var countryCode = BrandUtilities.getCountryCode();
    var brandSettings = BrandUtilities.getBrandSettings(countryCode);
    var serviceID;

    if (!brandSettings) {
        throw new Error('No HTTP service defined for identifier - ' + serviceID);
    } else {
        serviceID = brandSettings.service;
    }

    return serviceID;
}

/**
 * Provides differernt request - response services
 * @returns {Object} - object
 * */
function getAfterpayHttpService() {
    var URLUtils = require('dw/web/URLUtils');
    var Site = require('dw/system/Site');
    var Resource = require('dw/web/Resource');
    var serviceID = getServiceID();
    var prefix = request.getLocale();
    var mpid = session.privacy[prefix + 'mpid'] || null;

    var afterpayHttpService = LocalServiceRegistry.createService(serviceID, {
        createRequest: function (service, endPointUrl, requestBody) {
            var apSitePreferencesUtilities = AfterpayUtilities.sitePreferencesUtilities;

            service.setURL(service.configuration.credential.URL + endPointUrl);
            service.setRequestMethod(requestBody.requestMethod);
            service.addHeader('Content-Type', 'application/json');

            var afterpayCartridge = 'AfterpayCartridge/23.4.1';
            var merchantID = service.configuration.credential.user;
            var siteURL = URLUtils.httpsHome().toString();
            var storeFront = Site.getCurrent().getID();
            var hostURL = siteURL.substring(0, siteURL.indexOf('/', 14));
            var compatibilityMode = dw.system.System.getCompatibilityMode();
            var cashAppEnabled = apSitePreferencesUtilities.isCashAppEnabled() ? '1' : '0';
            var storefrontVersion = '';
            if (storeFront.indexOf('SiteGenesis') >= 0) {
                storefrontVersion = Resource.msg('revisioninfo.revisionnumber', 'revisioninfo', null);
            } else if (storeFront.indexOf('RefArch') >= 0) {
                storefrontVersion = Resource.msg('global.version.number', 'version', null);
            }

            var uaAdditionalInfo = [
                'SalesforceCommerceCloud',
                storeFront + '/' + storefrontVersion,
                'CompatibilityMode/' + compatibilityMode,
                'Merchant/' + merchantID,
                'MPID/' + mpid,
                'CashAppEnabled/' + cashAppEnabled
            ].join('; ');

            var userAgent = [
                afterpayCartridge,
                '(' + uaAdditionalInfo + ')',
                hostURL
            ].join(' ');

            service.addHeader('User-Agent', userAgent);

            if (endPointUrl === 'payments/capture') {
                service.timeout = apSitePreferencesUtilities.getCaptureTimeout();
            }

            return JSON.stringify(requestBody);
        },

        parseResponse: function (service, httpClient) {
            if (httpClient.statusCode === 200 || httpClient.statusCode === 201 || httpClient.statusCode === 202) {
                var parseResponse = httpClient.text;
                var filterResponse = parseResponse;
                Logger.debug('Parsed Response : ' + afterpayUtils.filterLogData(filterResponse));
                return parseResponse;
            }
            Logger.error('Error on Afterpay request processing : ' + httpClient.statusCode);
            return httpClient;
        },

        getRequestLogMessage: function (request) {
            return afterpayUtils.filterLogData(request);
        },

        getResponseLogMessage: function (response) {
            return afterpayUtils.filterLogData(response.text);
        }
    });

    return afterpayHttpService;
}

module.exports = {
    getAfterpayHttpService: getAfterpayHttpService
};
