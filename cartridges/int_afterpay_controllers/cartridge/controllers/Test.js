/**
*
* Controller to test the afterpay services
*/

'use strict';

/* Global variables */
var sitePreferences = require("int_afterpay_core/cartridge/scripts/util/AfterpayUtilities.js").getSitePreferencesUtilities();
var ctrlCartridgeName = sitePreferences.getControllerCartridgeName();

/* API Includes */
var app = require(ctrlCartridgeName + '/cartridge/scripts/app');
var guard = require(ctrlCartridgeName + '/cartridge/scripts/guard');

var Transaction = require('dw/system/Transaction');

/**
 * Check for the permitted Access
 */
function start() {
    
        // Initializes all forms of the billing page including: - address form - email address - coupon form
        checkAccessPermitted();
        app.getView().render('test/test');
}

/**
 * Check for valid IP address
 */
function checkAccessPermitted(){
	
	//Disallow access from production - return a 404
	if(dw.system.System.instanceType != dw.system.System.PRODUCTION_SYSTEM){
		var ipAddress = request.httpRemoteAddress;
		var validIPAddress = require('~/cartridge/scripts/test/CheckValidIpAddress').CheckValidIPAddress(ipAddress);
	}else if(validIPAddress.error || dw.system.System.instanceType == dw.system.System.PRODUCTION_SYSTEM){
		app.getView().render('flow/http_404');
	}
	
}

/**
 * Check the payment service based on the token and payment ID
 */
function getPayment(){
	
	var queryString = request.httpQueryString;
	var httpResult = require('~/cartridge/scripts/test/TestPaymentService').GetPaymentService(queryString);
	app.getView({
		HttpResult : httpResult
    }).render('test/testresult');
}

/**
 * Check the Direct Capture service based on the token and payment ID
 */
function directCapture(){
	
	var queryString = request.httpQueryString;
	var httpResult = require('~/cartridge/scripts/test/TestDirectCaptureService').DirectCaptureService(queryString);
	app.getView({
		HttpResult : httpResult
    }).render('test/testresult');
}

/**
 * Check the Authorise service based on the token 
 */
function authoriseService(){
	
	var queryString = request.httpQueryString;
	var httpResult = require('~/cartridge/scripts/test/TestAuthoriseService').AuthorisePaymentService(queryString);
	app.getView({
		HttpResult : httpResult
    }).render('test/testresult');
}

/**
 * Redirects to the Afterpay widget
 */
function showPopUp(){
	app.getView().render('test/popup');
}

/**
 * Check the Order service .
 */
function orderService(){
	var cart = app.getModel('Cart').get();
	
    Transaction.wrap(function () {
        cart.calculate();
    });
    
    var httpResult = require('~/cartridge/scripts/test/TestOrderService').GetOrderService(cart.object);
    
	app.getView({
		HttpResult : httpResult
    }).render('test/testresult');
}

/* Web exposed methods */

/** Checks for the Valid IP Address.
 * @see {@link module:controllers/Test~start} */
exports.Start = guard.ensure(['https', 'get'], start);
/** Get payment service.
 * @see module:controllers/Test~getPayment */
exports.GetPayment = guard.ensure(['get'], getPayment);
/** Get Direct Capture Service.
 * @see module:controllers/Test~directCapture */
exports.DirectCapture = guard.ensure(['get'], directCapture);
/** Get Authorise Service.
 * @see module:controllers/Test~authoriseService */
exports.Authorise = guard.ensure(['get'], authoriseService);
/** Redirects to Afterpay widget.
 * @see module:controllers/Test~showPopUp */
exports.ShowPopUp = guard.ensure(['get'], showPopUp);
/** Get Order Service.
 * @see module:controllers/Test~orderService */
exports.OrderService = guard.ensure(['get'], orderService);