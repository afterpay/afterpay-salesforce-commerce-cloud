'use strict';
/* global empty */
/*
*    Get formatted amount currency value
*/
var LogUtils = require('*/cartridge/scripts/util/afterpayLogUtils');
var Logger = LogUtils.getLogger('afterpayUtils');
var StringUtils = require('dw/util/StringUtils');
var Resource = require('dw/web/Resource');
var context;

var afterpayUtils = {};

/**
* Hide sensitive details like customer details on request for logging purpose
* @param {string} requestJSON - json request
* @returns {string} - request JSON
*/
afterpayUtils.filterLogData = function (requestJSON) {
    if (requestJSON) {
        var request = JSON.parse(requestJSON);
        var filteredResponse;

        if (request.orderDetails) {
            filteredResponse = afterpayUtils.maskDetails(request.orderDetails);
        } else {
            filteredResponse = afterpayUtils.maskDetails(request);
        }
        return filteredResponse;
    }
    return requestJSON;
};

/**
* mask the details in request
* @param {string} requestJSON - json request
* @returns {string} - request JSON
*/
afterpayUtils.maskDetails = function (requestJSON) {
    var index;
    var responseJSON = requestJSON;
    if (requestJSON.shipping) {
        for (index = 0; index < requestJSON.shipping.length; index++) {
            responseJSON.shipping[index] = '***';
        }
    }

    if (requestJSON.billing) {
        for (index = 0; index < requestJSON.billing.length; index++) {
            responseJSON.billing[index] = '***';
        }
    }

    if (requestJSON.consumer && requestJSON.consumer.email) {
        responseJSON.consumer.email = '***';
    }
    return JSON.stringify(responseJSON);
};

/**
* return endpoint URL based on the service
* @param {string} service - service name
* @returns {string} - end point as per service name
*/
afterpayUtils.getEndpoint = function (service) {
    if (!context) {
        var Context = require('~/cartridge/scripts/context/context');
        context = new Context();
    }

    return context.get(service);
};

/**
* Logs error response
* @param {Object} result - result of the response
* @param {string} requestUrl - requestUrl
* @param {string} requestBody - request Body
*/
function logErrorResponse(result, requestUrl, requestBody) {
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
}

/**
* Gets error response
* @param {string} errorCode - errorCoe
* @returns {string} - default message
*/
function getErrorResponse(errorCode) {
    var errorResource = 'apierror.flow.' + errorCode;
    var defaultMessage = Resource.msg('apierror.flow.default', 'afterpay', null);
    var errorMessage = Resource.msg(errorResource, 'afterpay', defaultMessage);

    if (!empty(errorMessage)) {
        return errorMessage;
    }

    return defaultMessage;
}

/**
* Detects error response of service call
* @param {Object} result - result in response
* @param {string} httpVerb - httpVerb
* @param {function} errorDelegate - errorDelegate
* @param {string} requestUrl - request Url
* @param {string} requestBody - request Body
* @returns {string} - return value of errorDelegate call
*/
function detectErrorResponse(result, httpVerb, errorDelegate, requestUrl, requestBody) {
    if (empty(result)) {
        Logger.error('result was empty');
        throw new Error(getErrorResponse('default'));
    } else if (!empty(errorDelegate)) {
        return errorDelegate(result);
    } else if (result.error !== 0 || result.status === 'ERROR') {
        logErrorResponse(result, requestUrl, requestBody);
        throw JSON.parse(result.errorMessage);
    }
    return null;
}

/**
* Logs response data
* @param {string} urlPath - url Path
* @param {string} httpVerb - httpVerb
* @param {string} requestBody - request Body
* @param {Object} result - result of the response
* @param {boolean} errorWasThrown - true if error was thrown
*/
function logResponseData(urlPath, httpVerb, requestBody, result, errorWasThrown) {
    try {
        var message = '';
        var requestBodyJson = requestBody ? JSON.stringify(requestBody) : '';
        requestBodyJson = afterpayUtils.filterLogData(requestBodyJson);
        var responseBodyJson = result.object;
        responseBodyJson = afterpayUtils.filterLogData(responseBodyJson);

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

/**
* checks whether afterpay is enabled or not in the configuration and checks the minimum and maximum threshold
* @param {string} urlPath - url Path
* @param {string} httpVerb - httpVerb
* @param {Object} result - result of the response
* @param {string} requestBody - request Body
* @param {function} errorDelegate - errorDelegate method
* @returns {Object}
*/

afterpayUtils.handleServiceResponses = function (urlPath, httpVerb, result, requestBody, errorDelegate) {
    if (result.status !== 'OK') {
        Logger.error('Error on Afterpay Service execution: ' + result.errorMessage);
    }
    var resultClone = result;
    logResponseData(urlPath, httpVerb, requestBody, resultClone, false);
    var resultFromDelegate = detectErrorResponse(resultClone, httpVerb, errorDelegate, urlPath, requestBody);

    if (!empty(resultFromDelegate)) {
        return resultFromDelegate;
    }

    var jsonResponse = !empty(result.object) ? JSON.parse(result.object) : result;

    if (result.status === 'SERVICE_UNAVAILABLE' || result.status === 'INTERNAL_SERVICE_ERROR') {
        throw result.status;
    }
    return jsonResponse;
};

module.exports = afterpayUtils;
