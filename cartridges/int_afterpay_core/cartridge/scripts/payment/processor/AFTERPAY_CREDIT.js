'use strict';

/* Script Modules */
var LogUtils = require('*/cartridge/scripts/util/afterpayLogUtils');
var Logger = LogUtils.getLogger('AFTERPAY_CREDIT');

/**
 * Calls  Handle of AFTERPAY
 * @param {Object} args - arguments
 * @returns {Object} response - response
 */
function Handle(args) {
    var response = require('*/cartridge/scripts/payment/processor/AFTERPAY').Handle(args); // eslint-disable-line

    if (response.error) {
        return {
            error: true
        };
    }

    return { success: true };
}

/**
 * Calls  Authorize of AFTERPAY
 * @param {Object} args - arguments
 * @returns {Object} response - response
 */
function Authorize(args) {
    var authorizationStatus = require('*/cartridge/scripts/payment/processor/AFTERPAY').Authorise(args); // eslint-disable-line

    Logger.debug('Authorization response in AFTERPAY_CREDIT: ' + JSON.stringify(authorizationStatus));

    if (authorizationStatus.authorized) {
        return { authorized: true };
    }

    return {
        authorizationResponse: authorizationStatus.AfterpayOrderErrorMessage,
        error: true
    };
}

/*
 * Local methods
 */
exports.Handle = Handle;
exports.Authorize = Authorize;
