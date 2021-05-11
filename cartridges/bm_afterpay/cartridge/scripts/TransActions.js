/**
* AfterPay Transaction Actions
*
* @input Action: String
* @input OrderNo: String
* @input Amount: String
*
*/
importPackage( dw.system );

/* API Includes */
var OrderMgr = require('dw/order/OrderMgr');
var Pipeline = require('dw/system/Pipeline');
var Transaction = require('dw/system/Transaction');
var Resource = require('dw/web/Resource');

/* Script Modules */
var LogUtils = require('~/cartridge/scripts/util/LogUtils');
var Logger = LogUtils.getLogger('TransActions');

function execute( pdict : PipelineDictionary ) : Number
{
	var action = pdict.Action,
		orderNo = pdict.OrderNo,
		amount = parseFloat(pdict.Amount, 10),
		result;
	
	switch(action){
		case "refund":
			result = refund(orderNo, amount, action);
			break;
	}
	
	response.getWriter().println(JSON.stringify(result));
	
	return PIPELET_NEXT;
}

/**
 * Refund action
 * */
function refund(orderNo, amountString){
	var order = OrderMgr.getOrder(orderNo),
		paymentInstrument, apPaymentInstrument, paymentTransaction,
		status = false,
		amountArray = amountString.split(' '),
		currency = amountArray[0],
		amount = amountArray[1],
		response, logRefundRequest, logResponse, paymentID,
		request, settleHistory, statusResponse, settleEntry, settleAmount,transactionID, transactionRef, refundAmount,error;
	
	var iter = order.getPaymentInstruments().iterator();
	while (iter.hasNext()) {
		apPaymentInstrument = iter.next();
		if(apPaymentInstrument.paymentMethod == 'AFTERPAY_PBI'){
			paymentInstrument = apPaymentInstrument;
		}
	}
	
	paymentTransaction = paymentInstrument.getPaymentTransaction();
	paymentID = paymentTransaction.custom.apPaymentID;
	amount = parseFloat(amount, 10);
	
	request = makeRefundRequest(orderNo, amount, currency, paymentID);
	
	Logger.debug("Refund request: " + JSON.stringify(request));
	
	response = callAction(request);
	
	Logger.debug("Refund response: " + JSON.stringify(response));
	
	if(response == null || (response && response.refundId == undefined)){
		error = Resource.msg('transaction.unknown', 'afterpay', null);
	}
	
	if(response != null || (response && response.refundId)){
		status = true;
		
		Transaction.begin();
		paymentTransaction.custom.apRefundID = response.refundId;
		Transaction.commit();
		
		updateOrderStatus(orderNo);
	}
	
	return {
		status: status,
		error: error
	};
}

/**
 * generate Refund Request
 * */
function makeRefundRequest(orderNo, amount, currency, paymentID){
	var data = {
		paymentID: paymentID,
		amount: {
			amount: amount,
			currency: currency
		},
		orderNo: orderNo
    };
	
	return data;
}

/**
 * updates the order status
 * */
function updateOrderStatus(orderNo){
	var Order = OrderMgr.getOrder(orderNo);
	
	try{
		Transaction.begin();
		Order.setPaymentStatus(Order.PAYMENT_STATUS_NOTPAID);
	    Order.setStatus(Order.ORDER_STATUS_CANCELLED);
	    Transaction.commit();
	    
	}catch(e){
		Transaction.rollback();
		Logger.error("Exception occured while updating the order status after Refund Transaction"+e);
	}
}

/**
 * call action
 * */
function callAction(request){
	var refund = require("~/cartridge/scripts/util/RefundUtilities.js");
	var response;
	
    if(refund && !(refund.error)){
    	response = refund.createRefund(request);
	}
	
	return response;
}

/**
 * Internal methods
 */
exports.refund = function(orderNo, amount, action){
	return refund(orderNo, amount, action);
};