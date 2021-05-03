/* global empty */
var Resource = require('dw/web/Resource');

/**
 * retrieves error description based on error codes from the response
 * @param {number} responseCode - response code
 * @returns {string} errorMessage - error message
 */
function getErrorResponses(responseCode) {
    var statusCode = !empty(responseCode.httpStatusCode) ? responseCode.httpStatusCode : responseCode;
    var errorMessage = '';

    switch (statusCode) {
        case 400:
            errorMessage = Resource.msg('apierror.flow.400', 'afterpay', null);
            break;
        case 401:
            errorMessage = Resource.msg('apierror.flow.401', 'afterpay', null);
            break;
        case 'DECLINED':
        case 402:
            errorMessage = Resource.msg('apierror.flow.402', 'afterpay', null);
            break;
        case 404:
            errorMessage = Resource.msg('apierror.flow.404', 'afterpay', null);
            break;
        case 405:
            errorMessage = Resource.msg('apierror.flow.405', 'afterpay', null);
            break;
        case 406:
            errorMessage = Resource.msg('apierror.flow.406', 'afterpay', null);
            break;
        case 409:
            errorMessage = Resource.msg('apierror.flow.409', 'afterpay', null);
            break;
        case 410:
            errorMessage = Resource.msg('apierror.flow.410', 'afterpay', null);
            break;
        case 412:
            errorMessage = Resource.msg('apierror.flow.412', 'afterpay', null);
            break;
        case 422:
            errorMessage = Resource.msg('apierror.flow.422', 'afterpay', null);
            break;
        case 429:
            errorMessage = Resource.msg('apierror.flow.429', 'afterpay', null);
            break;
        case 'INTERNAL_SERVICE_ERROR':
        case 500:
            errorMessage = Resource.msg('apierror.flow.500', 'afterpay', null);
            break;
        case 'SERVICE_UNAVAILABLE':
        case 503:
            errorMessage = Resource.msg('apierror.flow.503', 'afterpay', null);
            break;
        case 524:
            errorMessage = Resource.msg('apierror.flow.524', 'afterpay', null);
            break;
        default:
            errorMessage = Resource.msg('apierror.flow.default', 'afterpay', null);
    }

    return errorMessage;
}

/*
 * Module exports
 */
module.exports = {
    getErrorResponses: function (responseCode) {
        return getErrorResponses(responseCode);
    }
};
