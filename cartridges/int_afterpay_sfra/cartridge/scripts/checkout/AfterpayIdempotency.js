/**
*   @input ApInitialStatus : String
*   @input Order : dw.order.Order
*   @output FinalPaymentStatus : String   
*
*/

importPackage( dw.system );

var LogUtils = require('~/cartridge/scripts/util/LogUtils');
var Logger = LogUtils.getLogger("AfterpayIdempotency");

/**
 * Delays the payment retry by 5 secs. 
 */

function sleep(milliseconds) {
	milliseconds = milliseconds*1000;
	var initialTimestamp = new Date().getTime();
	var checkTimestamp, presentTimestamp;

	checkTimestamp = true;
	while(checkTimestamp){
	    presentTimestamp = new Date().getTime();
	    if(presentTimestamp-initialTimestamp > milliseconds) 
	    {
	    	checkTimestamp = false;
	    }
	}
}

function delayPayment(Order, initialStatus, expressCheckoutModel) {
	var paymentStatus;
	if(empty(Order) || empty(initialStatus)){
		Logger.error("Either of the Parameters provided -Order or Paymentstatus or finalPaymentStatus is empty ");
		return {error:true};
	}
	
	 for (var i = 0; i < 4; i++) { 
    	Logger.debug("Payment retry Execution count "+i+ " -and intial payment status :"+ initialStatus);
		Logger.debug("Before time delay : "+ new Date());
			
    	sleep(Site.getCurrent().getCustomPreferenceValue('apDelayRetry'));
    	Logger.debug("After 5 secs time delay : "+ new Date());
		paymentStatus = require('~/cartridge/scripts/checkout/AfterpayHandlePaymentOrder').GetPaymentStatus(Order, initialStatus, expressCheckoutModel);
		if(paymentStatus == 'APPROVED'){
			break;
		}
		Logger.debug("Final Payment Status : "+ paymentStatus);
	}
	return paymentStatus;
}


/*
 * Module exports
 */
module.exports.DelayPayment = delayPayment;
