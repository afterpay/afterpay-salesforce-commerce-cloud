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

var app = require(ctrlCartridgeName + '/cartridge/scripts/app');
var guard = require(ctrlCartridgeName + '/cartridge/scripts/guard');

/**
 * Renders Afterpay/CLearpay messages
 */
function renderMessage() {
    var params = request.httpParameterMap;
    var totalprice = parseFloat(params.totalprice.stringValue);
    var classname = params.classname.stringValue;
    var afterpayBrand = params.afterpayBrand.stringValue;
    var applyCaching;

    if (totalprice && !(totalprice.isNaN)) {
        totalprice = new Money(totalprice, session.currency);
    } else {
        return;
    }

    var isWithinThreshold = thresholdUtilities.checkThreshold(totalprice);
    var afterpayApplicable = BrandUtilities.isAfterpayApplicable();

    afterpayApplicable = isWithinThreshold.status && afterpayApplicable;

    if (classname !== 'cart-afterpay-message') {
        applyCaching = true;
    }

    if (afterpayApplicable) {
        app.getView({
            applyCaching: applyCaching,
            belowThreshold: isWithinThreshold.belowThreshold,
            classname: classname,
            afterpaybrand: afterpayBrand,
            totalprice: totalprice.value
        }).render('product/components/afterpaymessage');
    }
}

/**
 * @description Remove include of Afterpay js library needed to render badges and installments
 */
function includeAfterpayLibrary() {
    var scope = {
        isAfterpayEnabled: SitePreferences.isAfterpayEnabled()
    };

    if (scope.isAfterpayEnabled) {
        scope.thresholdAmounts = thresholdUtilities.getThresholdAmounts(BrandUtilities.getBrand());
    }

    app.getView(scope).render('util/afterpayLibraryInclude');
}

/* Web exposed methods */

exports.RenderMessage = guard.ensure(['get'], renderMessage);
exports.IncludeAfterpayLibrary = guard.ensure(['get'], includeAfterpayLibrary);
