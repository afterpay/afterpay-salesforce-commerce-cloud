/* global empty */
var LogUtils = require('*/cartridge/scripts/util/afterpayLogUtils');
var Logger = LogUtils.getLogger('AfterpayHttpService');
var StringUtils = require('dw/util/StringUtils');
var AfterpaySitePreferencesUtilities = require('*/cartridge/scripts/util/afterpayUtilities').getSitePreferencesUtilities();
var Class = require('*/cartridge/scripts/util/class').Class;
var Resource = require('dw/web/Resource');

/**
 *  generic method  to process  all service type requests and responses
 */
var AfterpayHttpService = Class.extend({
    init: function () {
        this.afterpaySitePreferencesUtilities = AfterpaySitePreferencesUtilities;
    },

    call: function (urlPath, httpVerb, requestBody, errorDelegate) {
        var serviceArgs;
        var service;
        var result;
        var serviceID = this.getServiceID(httpVerb);
        var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');

        service = LocalServiceRegistry.createService(serviceID, {
            createRequest: function (reqService, args) {
                reqService.setURL(reqService.URL + args.endPointUrl);
                reqService.setRequestMethod(args.method);
                reqService.addHeader('Content-Type', 'application/json');
                reqService.addHeader('User-Agent', AfterpaySitePreferencesUtilities.getUserAgent());

                return JSON.stringify(args.request);
            },

            parseResponse: function (respService, httpClient) {
                if (httpClient.statusCode === 200 || httpClient.statusCode === 201) {
                    var parseResponse = httpClient.text;
                    Logger.debug('Parsed Response : ' + parseResponse);
                    return parseResponse;
                }

                Logger.error('Error on Afterpay request processing: ' + httpClient.getErrorText());
                return httpClient;
            }
        });

        serviceArgs = {
            request: requestBody,
            method: requestBody.requestMethod,
            endPointUrl: urlPath
        };

        if (urlPath === 'payments/capture') {
            service.timeout = AfterpaySitePreferencesUtilities.getCaptureTimeout();
        }

        try {
            if (empty(requestBody)) {
                result = service.call();
            } else {
                result = service.call(serviceArgs);
            }
        } catch (ex) {
            var exception = ex;
            this._logger.error(exception.message); // eslint-disable-line
        }

        if (result.status !== 'OK') {
            Logger.error('Error on Afterpay Service execution: ' + result.errorMessage);
        }

        this.logResponseData(urlPath, httpVerb, requestBody, result, false);
        var resultFromDelegate = this.detectErrorResponse(result, httpVerb, errorDelegate, service.URL, requestBody);

        if (!empty(resultFromDelegate)) {
            return resultFromDelegate;
        }

        var jsonResponse = !empty(result.object) ? JSON.parse(result.object) : result;

        if (result.status === 'SERVICE_UNAVAILABLE' || result.status === 'INTERNAL_SERVICE_ERROR') {
            throw result.status;
        }

        return jsonResponse;
    },

    getServiceID: function (serviceIdentifier) {
        switch (serviceIdentifier) {
            case 'CREATE_ORDER': return this.afterpaySitePreferencesUtilities.getServiceName();
            case 'AUTHORISE_PAYMENT': return this.afterpaySitePreferencesUtilities.getServiceName();
            case 'DIRECT_CAPTURE_PAYMENT': return this.afterpaySitePreferencesUtilities.getServiceName();
            case 'GET_PAYMENT': return this.afterpaySitePreferencesUtilities.getServiceName();
            case 'GET_CONFIGURATION': return this.afterpaySitePreferencesUtilities.getServiceName();
            case 'GET_ORDERS': return this.afterpaySitePreferencesUtilities.getServiceName();
            case 'CREATE_REFUND' : return this.afterpaySitePreferencesUtilities.getServiceName();
            default: throw new Error('No HTTP service defined for identifier - ' + serviceIdentifier);
        }
    },

    detectErrorResponse: function (result, httpVerb, errorDelegate, requestUrl, requestBody) {
        if (empty(result)) {
            this._logger.error('result was empty'); // eslint-disable-line
            throw new Error(this.getErrorResponse('default'));
        } else if (!empty(errorDelegate)) {
            return errorDelegate(result);
        } else if (result.error !== 0 || result.status === 'ERROR') {
            this.logErrorResponse(result, requestUrl, requestBody);
            throw JSON.parse(result.errorMessage);
        }

        return '';
    },

    getErrorResponse: function (errorCode) {
        var errorResource = 'apierror.flow.' + errorCode;
        var defaultMessage = Resource.msg('apierror.flow.default', 'afterpay', null);
        var errorMessage = Resource.msg(errorResource, 'afterpay', defaultMessage);

        if (!empty(errorMessage)) {
            return errorMessage;
        }

        return defaultMessage;
    },

    logErrorResponse: function (result, requestUrl, requestBody) {
        var content = 'result.error=[' + result.error;
        content += '], result.status=[' + result.status;
        content += '], result.errorMessage=[' + result.errorMessage + ']';

        if (!empty(result.object) && !empty(result.object.text)) {
            content += '], result.object.text=[' + result.object.text + ']';
        }

        if (!empty(requestUrl)) {
            content += ', requestUrl=[' + requestUrl + ']';
        }

        if (!empty(requestBody)) {
            content += ', requestBody=[' + JSON.stringify(requestBody) + ']';
        }

        Logger.error(content);
    },

    logResponseData: function (urlPath, httpVerb, requestBody, result, errorWasThrown) {
        try {
            var message = '';
            var requestBodyJson = JSON.stringify(requestBody);
            var responseBodyJson = result.object;

            if (!empty(result.object) && !empty(result.status === 'OK')) {
                message = StringUtils.format('Response for request urlPath={0}, httpVerb={1}, requestBody=[{2}], responseBody=[{3}]',
                            urlPath,
                            httpVerb,
                            requestBodyJson,
                            responseBodyJson);
            } else if (!errorWasThrown) {
                message = StringUtils.format('Response for EMPTY request urlPath={0}, httpVerb={1}, requestBody=[{2}], responseBody=[{3}] - CHECK ERROR LOGS FOR RESPONSE',
                            urlPath,
                            httpVerb,
                            requestBodyJson,
                            result);
            } else if (errorWasThrown) {
                message = StringUtils.format('ERROR thrown for request. urlPath={0}, httpVerb={1}, requestBody=[{2}]. SEE previous error logged',
                            urlPath,
                            httpVerb,
                            requestBodyJson);
            }

            if (errorWasThrown) {
                Logger.error(message);
            } else {
                Logger.debug(message);
            }
        } catch (e) {
            var exception = e;
            Logger.error(exception);
        }
    }
});

module.exports = AfterpayHttpService;
