'use strict';

/* API Includes */
var URLUtils = require('dw/web/URLUtils');
var Transaction = require('dw/system/Transaction');
var System = require('dw/system');
var Order  = require('dw/order/Order');
var OrderMgr = require('dw/order/OrderMgr');
var Site = require('dw/system/Site');

/* Script Modules */
var LogUtils = require('~/cartridge/scripts/util/LogUtils');
var Logger = LogUtils.getLogger("UpdatePaymentStatus");
let AfterpaySession = require('*/cartridge/scripts/util/AfterpaySession');

let ECPaymentHelpers = require('*/cartridge/scripts/payment/ExpressCheckoutPaymentHelpers');

/**
 * update Afterpay payment status. 
 */
function handlePaymentStatus(order) {
	
	var response, finalPaymentStatus, errorCode;
	var apInitialStatus = order.getPaymentInstruments("AFTERPAY_PBI")[0].getPaymentTransaction().custom.apInitialStatus;
	Logger.debug("Afterpay Initial payment status :"+apInitialStatus);


	// Express Checkout
	let orderToken = order.getPaymentInstruments("AFTERPAY_PBI")[0].getPaymentTransaction().custom.apToken;
	let expressCheckoutModel = null;
	// Only do afterpay express checkout specific stuff if AfterpaySession is valid. Otherwise, assume that
	// we are doing a capture of non-express checkout order
	if (AfterpaySession.isValid()) {
		if (AfterpaySession.getToken() == orderToken) {
			expressCheckoutModel = ECPaymentHelpers.createExpressCheckoutModelFromOrderAndSession(order);
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

	
	finalPaymentStatus = require('~/cartridge/scripts/checkout/AfterpayHandlePaymentOrder').GetPaymentStatus(order, apInitialStatus, expressCheckoutModel);
	response = !empty(finalPaymentStatus.errorMessage) ? finalPaymentStatus.errorMessage : finalPaymentStatus;
	
	if(response == "SERVICE_UNAVAILABLE" || response.httpStatusCode == 500 || response == "INTERNAL_SERVICE_ERROR"){
		finalPaymentStatus = require('~/cartridge/scripts/checkout/AfterpayIdempotency').DelayPayment(order, apInitialStatus, expressCheckoutModel);
	 }
	
	Logger.debug("Afterpay final payment status :"+finalPaymentStatus);
	
	if(finalPaymentStatus == 'APPROVED') {
		return {authorized: true};
	} else if(finalPaymentStatus == 'PENDING'){
		return {
			error: true,
			AfterpayOrderErrorMessage: new dw.system.Status(dw.system.Status.ERROR, apInitialStatus,  'afterpay.api.declined'),
			apInitialStatus: !empty(order.getPaymentInstruments("AFTERPAY_PBI")[0].getPaymentTransaction().custom.apInitialStatus) ? Order.getPaymentInstruments("AFTERPAY_PBI")[0].getPaymentTransaction().custom.apInitialStatus : null
		};
	}else if(finalPaymentStatus == 'DECLINED'){
		 errorCode = require('~/cartridge/scripts/util/AfterpayErrors').GetErrorResponses(response); 
		 Transaction.begin();
		 order.getPaymentInstruments("AFTERPAY_PBI")[0].getPaymentTransaction().custom.apInitialStatus = apInitialStatus;
		 Transaction.commit();
		 
		 Logger.error("Payment has been declined : "+response);
		 return{
				AfterpayOrderErrorMessage: errorCode,
				error:true
			};
	}else{
		 if(finalPaymentStatus.error){
			 errorCode = require('~/cartridge/scripts/util/AfterpayErrors').GetErrorResponses(response); 
			 Transaction.begin();
			 order.getPaymentInstruments("AFTERPAY_PBI")[0].getPaymentTransaction().custom.apInitialStatus = apInitialStatus;
			 Transaction.commit();
			 
			 Logger.error("Error while Authorizing Order : "+response);
		 }
		
		return{
			AfterpayOrderErrorMessage: errorCode,
			error:true
		};
	}
}

module.exports.HandlePaymentStatus = handlePaymentStatus;
