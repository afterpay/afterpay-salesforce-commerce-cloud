// API Includes
var Resource = require('dw/web/Resource');
/**
 * @description retrieves error description based on error codes from the response
 * @param {number} responseCode - response code
 * @paran {boolean} storefrontView - end user doesn't need specific error message, containing technical details,
 * so this flag forces to return generic error message, except of the case with declined payment - client should be
 * informed about such response
 * @returns {string} errorMessage - error message
 */

var afterpayErrors = {};

afterpayErrors.getErrorResponses = function (responseCode, storefrontView) {
    var statusCode = responseCode && responseCode.httpStatusCode ? responseCode.httpStatusCode : responseCode;
    var errorMessage;

    if (storefrontView) {
        switch (statusCode) {
            case 'DECLINED':
            case 402:
                return Resource.msg('apierror.flow.402', session.privacy.afterpayBrand, null);
            default:
                return Resource.msg('apierror.flow.default', session.privacy.afterpayBrand, null);
        }
    }

    switch (statusCode) {
        case 400:
            errorMessage = Resource.msg('apierror.flow.400', session.privacy.afterpayBrand, null);
            break;
        case 401:
            errorMessage = Resource.msg('apierror.flow.401', session.privacy.afterpayBrand, null);
            break;
        case 'DECLINED':
        case 402:
            errorMessage = Resource.msg('apierror.flow.402', session.privacy.afterpayBrand, null);
            break;
        case 404:
            errorMessage = Resource.msg('apierror.flow.404', session.privacy.afterpayBrand, null);
            break;
        case 405:
            errorMessage = Resource.msg('apierror.flow.405', session.privacy.afterpayBrand, null);
            break;
        case 406:
            errorMessage = Resource.msg('apierror.flow.406', session.privacy.afterpayBrand, null);
            break;
        case 409:
            errorMessage = Resource.msg('apierror.flow.409', session.privacy.afterpayBrand, null);
            break;
        case 410:
            errorMessage = Resource.msg('apierror.flow.410', session.privacy.afterpayBrand, null);
            break;
        case 412:
            errorMessage = Resource.msg('apierror.flow.412', session.privacy.afterpayBrand, null);
            break;
        case 422:
            errorMessage = Resource.msg('apierror.flow.422', session.privacy.afterpayBrand, null);
            break;
        case 429:
            errorMessage = Resource.msg('apierror.flow.429', session.privacy.afterpayBrand, null);
            break;
        case 'INTERNAL_SERVICE_ERROR':
        case 500:
            errorMessage = Resource.msg('apierror.flow.500', session.privacy.afterpayBrand, null);
            break;
        case 'SERVICE_UNAVAILABLE':
        case 503:
            errorMessage = Resource.msg('apierror.flow.503', session.privacy.afterpayBrand, null);
            break;
        case 524:
            errorMessage = Resource.msg('apierror.flow.524', session.privacy.afterpayBrand, null);
            break;
        case 'TOKEN_ERROR':
            errorMessage = Resource.msg('apierror.invalid.email.error', session.privacy.afterpayBrand, null);
            break;
        default:
            errorMessage = Resource.msg('apierror.flow.default', session.privacy.afterpayBrand, null);
    }

    return errorMessage;
};


/*
 * Module exports
 */
module.exports = afterpayErrors;
