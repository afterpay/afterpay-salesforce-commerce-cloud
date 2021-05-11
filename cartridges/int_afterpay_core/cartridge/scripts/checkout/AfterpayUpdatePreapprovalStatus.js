/**
*   @input PreapprovalParameterMap : dw.web.HttpParameterMap
*   @input LineItemCtnr : dw.order.LineItemCtnr
*   @output PreapprovalResult : Object
*
*/
importPackage( dw.system );

var Transaction = require('dw/system/Transaction');
var PreapprovalModel = require("~/cartridge/scripts/models/PreapprovalModel.js");
var AfterpayUtilities = require("~/cartridge/scripts/util/AfterpayUtilities.js").getAfterpayCheckoutUtilities();

function execute( args : PipelineDictionary ) : Number
{
	
	var lineItemCtnr = args.LineItemCtnr,
		parameterMap = args.PreapprovalParameterMap;
	
	var preApprovalResult = getPreApprovalResult(lineItemCtnr, parameterMap);
	if(preApprovalResult.error){
		return PIPELET_ERROR;
	}
	args.PreapprovalResult = preApprovalResult;
	
    return PIPELET_NEXT;
}

function parsePreapprovalResult (parameter : dw.web.HttpParameterMap) {
	var preapprovalModel = new PreapprovalModel();
	preapprovalModel.status = parameter.get('status').getStringValue();
	preapprovalModel.apToken = parameter.get('orderToken').getStringValue();
	// Currently only used for express checkout, and not passed in via url
	preapprovalModel.apExpressCheckout = false;
	preapprovalModel.apExpressCheckoutChecksum = "";
	
	return preapprovalModel;
}

function parsePreapprovalResultFromObject (parameter) {
	var preapprovalModel = new PreapprovalModel();
	preapprovalModel.status = parameter.status;
	preapprovalModel.apToken = parameter.apToken;
	preapprovalModel.apExpressCheckout = parameter.apExpressCheckout || false;
	preapprovalModel.apExpressCheckoutChecksum = parameter.apExpressCheckoutChecksum || "";

	
	return preapprovalModel;
}

function updatePreapprovalStatus (preapprovalModel : PreapprovalModel, lineItemCtnr : dw.order.LineItemCtnr) {
	var paymentTransaction = AfterpayUtilities.getPaymentTransaction (lineItemCtnr);
	
	if (empty (paymentTransaction)) {
		throw new InternalError("Can not find payment transaction");
	} 
	Logger.debug("Payment status after token generation : " + preapprovalModel.status);
	Transaction.begin();
	paymentTransaction.custom.apInitialStatus = preapprovalModel.status;
	paymentTransaction.custom.apToken = preapprovalModel.apToken;
	paymentTransaction.custom.apExpressCheckout = preapprovalModel.apExpressCheckout;
	paymentTransaction.custom.apExpressCheckoutChecksum = preapprovalModel.apExpressCheckoutChecksum;
	Transaction.commit();
}

function getPreApprovalResult(lineItemCtnr, parameterMap){
	
	var preapprovalModel = (parameterMap instanceof dw.web.HttpParameterMap) ? parsePreapprovalResult(parameterMap): parsePreapprovalResultFromObject(parameterMap);
	
	if (empty(preapprovalModel.status) || empty(preapprovalModel.apToken)) {
		Logger.error("can not find order token and status in http parameter returned");
		return {error:true};
		
	} 
	try {
		updatePreapprovalStatus(preapprovalModel, lineItemCtnr);
		
	} catch (exception) {
		var e = exception;
		Logger.error("Update payment transaction: " + e);
		return {error:true};
	}
	return preapprovalModel;
}

/*
 * Module exports
 */
module.exports = {
	GetPreApprovalResult: function(lineItemCtnr, parameterMap){
		return getPreApprovalResult(lineItemCtnr, parameterMap);
	}
}