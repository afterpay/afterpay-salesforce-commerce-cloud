'use strict';

var HashMap = require('dw/util/HashMap');

var AfterpayApiContext = function () {};

AfterpayApiContext.prototype.getFlowApiUrls = function () {
    if (this._flowApiUrls == null) {
        this._flowApiUrls = new HashMap();

        this._flowApiUrls.put('authorise', 'payments/auth');
        this._flowApiUrls.put('getPayment', 'payments/{0}');
        this._flowApiUrls.put('createOrders', 'checkouts');
        this._flowApiUrls.put('directCapturePayment', 'payments/capture');
        this._flowApiUrls.put('getConfiguration', 'configuration');
        this._flowApiUrls.put('createRefund', 'payments/{0}/refund');
        this._flowApiUrls.put('getOrders', 'checkouts/{0}');
        this._flowApiUrls.put('capturePayment', 'payments/{0}/capture');
        this._flowApiUrls.put('voidPayment', 'payments/{0}/void');
        this._flowApiUrls.put('updateShippingCourier', 'payments/{0}/void');
    }

    return this._flowApiUrls;
};

AfterpayApiContext.prototype.getFlowApiErrorResponses = function () {
    if (this._flowApiErrorResponses == null) {
        this._flowApiErrorResponses = new HashMap();

        this._flowApiErrorResponses.put(
            '400',
            'Bad Request – Your request is a little wrong'
        );
        this._flowApiErrorResponses.put(
            '401',
            'Unauthorized – Your API key is wrong'
        );
        this._flowApiErrorResponses.put(
            '402',
            'Payment Required – Generally returned in cases where payments are declined'
        );
        this._flowApiErrorResponses.put(
            '404',
            'Not Found – The specified resource could not be found'
        );
        this._flowApiErrorResponses.put(
            '405',
            'Method Not Allowed – You tried to access a resource with an invalid method'
        );
        this._flowApiErrorResponses.put(
            '406',
            'Not Acceptable – You requested a format that isn’t json'
        );
        this._flowApiErrorResponses.put(
            '409',
            'Conflict – You tried to perform an operation that conflicts with another operation'
        );
        this._flowApiErrorResponses.put(
            '410',
            'Gone – The resource requested has been removed from our servers'
        );
        this._flowApiErrorResponses.put(
            '412',
            'Precondition Failed – A prerequisite step that was required before calling the resource had not been performed'
        );
        this._flowApiErrorResponses.put(
            '422',
            'Unprocessable Entity – The request format was valid, however one or more values were incorrect'
        );
        this._flowApiErrorResponses.put(
            '429',
            'Too Many Requests – Too many requests may occur if an abnormal number of requests occur'
        );
        this._flowApiErrorResponses.put(
            '500',
            'Internal Server Error – We had a problem with our server. Try again later'
        );
        this._flowApiErrorResponses.put(
            '503',
            'Service Unavailable – We’re temporarially offline for maintanance. Please try again later'
        );
    }

    return this._flowApiErrorResponses;
};

module.exports = AfterpayApiContext;
