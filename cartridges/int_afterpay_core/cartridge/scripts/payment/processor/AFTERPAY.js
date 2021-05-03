'use strict';

/* API Includes */
var URLUtils = require('dw/web/URLUtils');
var Transaction = require('dw/system/Transaction');
var sitePreferences = require("~/cartridge/scripts/util/AfterpayUtilities.js").getSitePreferencesUtilities();
var ctrlCartridgeName = sitePreferences.getControllerCartridgeName();
var Cart = require(ctrlCartridgeName + '/cartridge/scripts/models/CartModel');
var System = require('dw/system');
var Order  = require('dw/order/Order');
var OrderMgr = require('dw/order/OrderMgr');
var Site = require('dw/system/Site');
var	Resource = require('dw/web/Resource');


/* Script Modules */
var app = require(ctrlCartridgeName + '/cartridge/scripts/app');
var guard = require(ctrlCartridgeName + '/cartridge/scripts/guard');
var LogUtils = require('~/cartridge/scripts/util/LogUtils');
var Logger = LogUtils.getLogger("AFTERPAY");
let AfterpaySession = require('*/cartridge/scripts/util/AfterpaySession');
var PAYMENT_MODE = require('~/cartridge/scripts/util/AfterpayConstants');
let ECPaymentHelpers = require('*/cartridge/scripts/payment/ExpressCheckoutPaymentHelpers');

/**
 * Handles Afterpay token generation process. 
 */
function Handle(args) {
	var cart = Cart.get(args.Basket);
	var paymentInstrument;
	Transaction.wrap(function() {
		cart.removeAllPaymentInstruments();
		paymentInstrument = cart.createPaymentInstrument('AFTERPAY_PBI', cart.getNonGiftCertificateAmount());
	});
	
	// Recalculate the payments. If there is only gift certificates, make sure it covers the order total, if not
	    // back to billing page.
    Transaction.wrap(function () {
        if (!cart.calculatePaymentTransactionTotal()) {
        	app.getController('COBilling').Start();
            return {};
        }
    });
	
	var afterPayTokenResponse = require('~/cartridge/scripts/checkout/AfterpayGetToken').GetToken(args.Basket);
	Logger.debug("Token value returned to - AFTERPAY.JS : "+afterPayTokenResponse);
	
	var afterPayToken = afterPayTokenResponse.errorMessage ? afterPayTokenResponse.errorMessage : afterPayTokenResponse;
	
	
	if(afterPayTokenResponse.error){
		var errorCode = require('~/cartridge/scripts/util/AfterpayErrors').GetErrorResponses(afterPayToken);
		Logger.error("Error while generating Token : "+errorCode);
		var redirectURL = dw.web.URLUtils.https("COBilling-Start",'afterpay',errorCode);
		
		app.getView({
			AfterpayRedirectUrl : redirectURL
	    }).render('checkout/redirect');
		
	}
	
	app.getView({
		apToken : afterPayToken
    }).render('checkout/afterpayredirect');
	
	return {success: true};
}

/**
 * Authorizes Afterpay Order process. 
 */
function Authorise(args) {
	var response, finalPaymentStatus, errorCode;
	var Order = OrderMgr.getOrder(args.OrderNo);
	var apInitialStatus = Order.getPaymentInstruments("AFTERPAY_PBI")[0].getPaymentTransaction().custom.apInitialStatus;

	let orderToken = Order.getPaymentInstruments("AFTERPAY_PBI")[0].getPaymentTransaction().custom.apToken;
	let expressCheckoutModel = null;
	// Only do afterpay express checkout specific stuff if AfterpaySession is valid. Otherwise, assume that
	// we are doing a capture of non-express checkout order
	if (AfterpaySession.isValid()) {
		if (AfterpaySession.getToken() == orderToken) {
			expressCheckoutModel = ECPaymentHelpers.createExpressCheckoutModelFromOrderAndSession(Order);
		}
		// Theoretically, session may have changed while we did the change checks, so
		// make sure the token in the session is still the one we expect. If not, we
		// fail the order
		if (AfterpaySession.getToken() != orderToken) {
			Transaction.begin();
			Order.getPaymentInstruments("AFTERPAY_PBI")[0].getPaymentTransaction().custom.apInitialStatus = apInitialStatus;
			Order.setPaymentStatus(dw.order.Order.PAYMENT_STATUS_NOTPAID);
			OrderMgr.failOrder(Order);
			Transaction.commit();
			Logger.error("Payment has been declined. Session changed so there is no way to verify that order created was correct.");
			AfterpaySession.clearSession();

			return{
				AfterpayOrderErrorMessage: Resource.msg('expresscheckout.error.paymentinvalidsession', 'afterpay', null),
				error:true
			};
		}
	}
	Logger.debug("Afterpay Initial payment status :"+apInitialStatus);
	
	finalPaymentStatus = require('~/cartridge/scripts/checkout/AfterpayHandlePaymentOrder').GetPaymentStatus(Order, apInitialStatus, expressCheckoutModel);
	
	response = !empty(finalPaymentStatus.errorMessage) ? finalPaymentStatus.errorMessage : finalPaymentStatus;

	if(response == "SERVICE_UNAVAILABLE" || response.httpStatusCode == 500 || response == "INTERNAL_SERVICE_ERROR"){
		
		finalPaymentStatus = require('~/cartridge/scripts/checkout/AfterpayIdempotency').DelayPayment(Order, apInitialStatus, expressCheckoutModel);
		
	 }
	
	// Clear the Afterpay session regardless of capture outcome
	AfterpaySession.clearSession();


	Logger.debug("Afterpay final payment status :"+finalPaymentStatus);
	
	if(finalPaymentStatus == 'APPROVED') {
		return {authorized: true};
	} else if(finalPaymentStatus == 'PENDING'){
		return {
			error: true,
			PlaceOrderError: new dw.system.Status(dw.system.Status.ERROR, apInitialStatus,  'afterpay.api.declined'),
			apInitialStatus: !empty(Order.getPaymentInstruments("AFTERPAY_PBI")[0].getPaymentTransaction().custom.apInitialStatus) ? Order.getPaymentInstruments("AFTERPAY_PBI")[0].getPaymentTransaction().custom.apInitialStatus : null
		};
	}else if(finalPaymentStatus == 'DECLINED'){
		 errorCode = require('int_afterpay_core/cartridge/scripts/util/AfterpayErrors').GetErrorResponses(response); 
		 Transaction.begin();
		 Order.getPaymentInstruments("AFTERPAY_PBI")[0].getPaymentTransaction().custom.apInitialStatus = apInitialStatus;
		 Transaction.commit();
		 
		 Logger.error("Payment has been declined : "+response);
		 return{
				AfterpayOrderErrorMessage: errorCode,
				error:true
			};
	}else{
		 if(finalPaymentStatus.error){
			 errorCode = require('int_afterpay_core/cartridge/scripts/util/AfterpayErrors').GetErrorResponses(response); 
			 Transaction.begin();
			 Order.getPaymentInstruments("AFTERPAY_PBI")[0].getPaymentTransaction().custom.apInitialStatus = apInitialStatus;
			 Transaction.commit();
			 
			 Logger.error("Error while Authorizing Order : "+response);
		 }
		
		return{
			AfterpayOrderErrorMessage: errorCode,
			error:true
		};
	}
	
	
}

/**
 * Calls Handle method and based on response ,if error then redirects to billing page with the respective error 
 * else redirects to order confirmation page. 
 */
function JSHandle(args) {
	var response ,
		redirectURL;
	response = Handle(args);
	if(response.error){
		redirectURL = dw.web.URLUtils.https("COBilling-Start",'afterpay','error');
	}else if(response.cancelled){
		redirectURL = dw.web.URLUtils.https("COBilling-Start",'afterpay','cancelled');
	}else if(response.success){
		var saveAddress = dw.web.URLUtils.https("COBilling-SaveAddress");
		redirectURL = dw.web.URLUtils.https("COSummary-Start");
		app.getForm('billing').object.fulfilled.value = true;
	}
	Logger.debug("AfterpayRedirectUrl: "+redirectURL);
	app.getView({
		AfterpayRedirectUrl : redirectURL
    }).render('checkout/redirect');
	
}

/**
 * checks for invalid billing address
 */

function invalidBilling(){
	 app.getForm('billing').object.fulfilled.value = false;
	 app.getView().render('util/empty');
}

 
/*
 * Local methods
 */
exports.Handle = Handle;
exports.Authorise = Authorise;
exports.JSHandle = guard.ensure(['https'], JSHandle);
exports.InvalidBilling = guard.ensure(['get'], invalidBilling);
