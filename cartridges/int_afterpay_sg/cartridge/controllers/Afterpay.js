'use strict';

/* eslint-disable no-new-wrappers */
/**
*
* Controller to render the Afterpay messages and terms
*/

/* API Includes */
var Money = require('dw/value/Money');

/* Script Modules */
var BrandUtilities = require('*/cartridge/scripts/util/afterpayUtilities').brandUtilities;
var SitePreferences = require('*/cartridge/scripts/util/afterpayUtilities').sitePreferencesUtilities;
var ctrlCartridgeName = SitePreferences.getControllerCartridgeName();
var thresholdUtilities = require('*/cartridge/scripts/util/thresholdUtilities');
var AfterpayCOHelpers = require('*/cartridge/scripts/checkout/afterpayCheckoutHelpers');

var app = require(ctrlCartridgeName + '/cartridge/scripts/app');
var guard = require(ctrlCartridgeName + '/cartridge/scripts/guard');

/**
 * Renders Afterpay/CLearpay messages
 */
function renderMessage() {
    var params = request.httpParameterMap;
    var totalprice = parseFloat(params.totalprice.stringValue);
    var classname = params.classname.stringValue;
    var applyCaching;

    if (totalprice && !(totalprice.isNaN)) {
        totalprice = new Money(totalprice, session.currency);
    } else {
        return;
    }

    var afterpayApplicable = BrandUtilities.isAfterpayApplicable();
    var isEligible = true;
    if (classname !== 'cart-afterpay-message') {
        applyCaching = true;
        var reqProductID = params.productID.stringValue;
        isEligible = !AfterpayCOHelpers.checkRestrictedProducts(reqProductID);
    } else {
        isEligible = !AfterpayCOHelpers.checkRestrictedCart();
    }
    var afterpayLimits = thresholdUtilities.checkThreshold(totalprice);
    if (afterpayApplicable) {
        app.getView({
            applyCaching: applyCaching,
            eligible: isEligible,
            classname: classname,
            mpid: afterpayLimits.mpid,
            totalprice: totalprice.value
        }).render('product/components/afterpaymessage');
    }
}

/**
 * @description Remove include of Afterpay js library needed to render badges and installments
 */
function includeAfterpayLibrary() {
    if (SitePreferences.isAfterpayEnabled()) {
        app.getView().render('util/afterpayLibraryInclude');
    }
}

/* Web exposed methods */

exports.RenderMessage = guard.ensure(['get'], renderMessage);
exports.IncludeAfterpayLibrary = guard.ensure(['get'], includeAfterpayLibrary);
