'use strict';


/* Script Modules */
var sitePreferences = require("~/cartridge/scripts/util/AfterpayUtilities.js").getSitePreferencesUtilities();
var ctrlCartridgeName = sitePreferences.getControllerCartridgeName();
var app = require(ctrlCartridgeName + '/cartridge/scripts/app');
var LogUtils = require('~/cartridge/scripts/util/LogUtils');
var Logger = LogUtils.getLogger("AFTERPAY_CREDIT");



/**
 * Calls  Handle of AFTERPAY
 */
function Handle(args) {

	var response = require('~/cartridge/scripts/payment/processor/AFTERPAY').Handle(args);
		if(response.error){
			return {
				error: true
			};
		}
		return {success: true};
}

/**
 * Calls  Authorize of AFTERPAY 
 */
function Authorize(args) {
	
	var authorizationStatus = require('~/cartridge/scripts/payment/processor/AFTERPAY').Authorise(args);
	
	Logger.debug("Authorization response in AFTERPAY_CREDIT: "+JSON.stringify(authorizationStatus));
	if(authorizationStatus.authorized) {
		return {authorized: true};
	} else {
		return {
			authorizationResponse : authorizationStatus.AfterpayOrderErrorMessage,
			error: true
		};
	}
}

/*
 * Local methods
 */
exports.Handle = Handle;
exports.Authorize = Authorize;
