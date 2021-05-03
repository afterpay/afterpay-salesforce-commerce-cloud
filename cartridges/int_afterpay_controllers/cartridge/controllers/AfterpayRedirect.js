'use strict';

/**
 * Controller to handle the response from Afterpay
 *
 * @module controllers/AfterpayRedirect
 */

/* API Includes */
var URLUtils = require('dw/web/URLUtils');
var Transaction = require('dw/system/Transaction'); 
var System = require('dw/system');
var	Resource = require('dw/web/Resource');

/* Global variables */
var sitePreferences = require("int_afterpay_core/cartridge/scripts/util/AfterpayUtilities.js").getSitePreferencesUtilities();
var ctrlCartridgeName = sitePreferences.getControllerCartridgeName();

/* Script Modules */
var app = require(ctrlCartridgeName + '/cartridge/scripts/app');
var guard = require(ctrlCartridgeName + '/cartridge/scripts/guard');
var Cart = app.getModel('Cart');
var LogUtils = require('int_afterpay_core/cartridge/scripts/util/LogUtils');
var Logger = LogUtils.getLogger("AfterpayRedirect");


/**
 * Handles the payment status returned by the Afterpay. Based on the status Order will be submitted .
 */
function HandleResponse(){
	var afterpayPaymentInstrument, paymentInstrument, cart, iter, paymentStatus,
	redirectURL, PreapprovalResult, placeOrderResult, productExists;
	
	
	cart = Cart.get();
	
	iter =  cart.object.getPaymentInstruments().iterator();
	while (iter.hasNext()) {
		afterpayPaymentInstrument = iter.next();
		if(afterpayPaymentInstrument.paymentMethod == 'AFTERPAY_PBI'){
			paymentInstrument = afterpayPaymentInstrument;
		}
	 }
	
	paymentStatus = request.httpParameterMap.status.getStringValue();
	
	if(paymentStatus == 'SUCCESS'){
		
		productExists = require('int_afterpay_core/cartridge/scripts/checkout/AfterpayTokenConflict').CheckTokenConflict(cart.object,request.httpParameterMap.orderToken.getStringValue());
		
		PreapprovalResult = require('int_afterpay_core/cartridge/scripts/checkout/AfterpayUpdatePreapprovalStatus').GetPreApprovalResult(cart.object, request.httpParameterMap);
		
		if(!productExists){
			if(productExists.error){
				redirectURL = dw.web.URLUtils.https("COBilling-Start",'afterpay',Resource.msg('apierror.flow.default', 'afterpay', null));
			}
			redirectURL = dw.web.URLUtils.https("COBilling-Start",'afterpay',Resource.msg('apierror.token.conflict', 'afterpay', null));
        }
		else if(PreapprovalResult.error){
			redirectURL = dw.web.URLUtils.https("COBilling-Start",'afterpay',Resource.msg('apierror.flow.default', 'afterpay', null));
		}else{
			
			try{
				placeOrderResult = app.getController('COPlaceOrder').Start();
				Logger.debug("PlaceOrder status :"+JSON.stringify(placeOrderResult));
				if (placeOrderResult.order_created) {
			    	app.getController('COSummary').ShowConfirmation(placeOrderResult.Order);
			    } else if (placeOrderResult.error) {
			    	var error = !empty(placeOrderResult.afterpayOrderAuthorizeError) ? placeOrderResult.afterpayOrderAuthorizeError : Resource.msg('apierror.flow.default', 'afterpay', null);
			    	redirectURL = dw.web.URLUtils.https("COBilling-Start",'afterpay',error);
			    }
				
			}
			catch(e){
				Logger.error("Exception occured while creating order :"+e);	
				redirectURL = dw.web.URLUtils.https("COBilling-Start",'afterpay',Resource.msg('apierror.flow.default', 'afterpay', null));
			}
			
		}
		
	}else if(paymentStatus == 'CANCELLED'){
		redirectURL = dw.web.URLUtils.https("COBilling-Start",'afterpay',Resource.msg('afterpay.api.cancelled','afterpay',null));
	}else if(paymentInstrument.getPaymentTransaction().custom.apToken !== request.httpParameterMap.orderToken.stringValue ){
		redirectURL = dw.web.URLUtils.https("COBilling-Start",'afterpay',Resource.msg('apierror.flow.default', 'afterpay', null));
	}
	else{
		redirectURL = dw.web.URLUtils.https("COBilling-Start",'afterpay',Resource.msg('apierror.flow.default', 'afterpay', null));
	}
	
	if(!empty(redirectURL)){
		Logger.debug("AfterpayRedirectUrl: "+redirectURL);
		app.getView({
			AfterpayRedirectUrl : redirectURL
	    }).render('checkout/redirect');
		
	}
	
	
}
 

/*
* Module exports
*/

/*
* Web exposed methods
*/

/** Payment status handling.
 * @see module:controllers/AfterpayRedirect~Confirm */
exports.HandleResponse = guard.ensure(['https'], HandleResponse);