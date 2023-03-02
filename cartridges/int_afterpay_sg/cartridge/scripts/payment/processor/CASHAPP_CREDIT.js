'use strict';

/* Script Modules */
var LogUtils = require('*/cartridge/scripts/util/afterpayLogUtils');
var BrandMapping = require('*/cartridge/scripts/brandMapping');
var Logger = LogUtils.getLogger('CashApp_Credit');
var brand = 'cashapp';
/**
 * Calls  Handle of CASHAPPPAY
 * @param {Object} args - arguments
 * @returns {Object} response - response
 */
function Handle(args) {
    var mapping = BrandMapping[brand];
    var processorPath = null;

    if (mapping) {
        processorPath = mapping.paymentProcessor;

        if (!processorPath) {
            return {
                error: true
            };
        }
    }

    var response = require(processorPath).Handle(args); // eslint-disable-line

    if (response.error) {
        return {
            error: true
        };
    }

    return {
        success: true
    };
}

/**
 * Calls  Authorize of CASHAPPPAY
 * @param {Object} args - arguments
 * @returns {Object} response - response
 */
function Authorize(args) {
    var mapping = BrandMapping[brand];
    var processorPath = null;

    if (mapping) {
        processorPath = mapping.paymentProcessor;

        if (!processorPath) {
            return {
                error: true
            };
        }
    }

    var authorizationStatus = require(processorPath).Authorise(args); // eslint-disable-line

    Logger.debug('Authorization response in CASHAPP_CREDIT: ' + JSON.stringify(authorizationStatus));

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
