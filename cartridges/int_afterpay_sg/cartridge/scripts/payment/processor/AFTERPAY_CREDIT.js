'use strict';

/* Script Modules */
var LogUtils = require('*/cartridge/scripts/util/afterpayLogUtils');
var Logger = LogUtils.getLogger('AFTERPAY_CREDIT');
var AfterpayUtilities = require('*/cartridge/scripts/util/afterpayUtilities');
var BrandUtilities = AfterpayUtilities.brandUtilities;
var BrandMapping = require('*/cartridge/scripts/brandMapping');

/**
 * Calls  Handle of AFTERPAY
 * @param {Object} args - arguments
 * @returns {Object} response - response
 */
function Handle(args) {
    var brand = BrandUtilities.getBrand();
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
        redirect: response.redirect,
        success: true
    };
}

/**
 * Calls  Authorize of AFTERPAY
 * @param {Object} args - arguments
 * @returns {Object} response - response
 */
function Authorize(args) {
    var brand = BrandUtilities.getBrand();
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
