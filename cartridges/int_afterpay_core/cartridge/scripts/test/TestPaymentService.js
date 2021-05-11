/**
*   @input path : String
*   @output HttpResult : Object
*/

importPackage( dw.catalog );
importPackage( dw.system );
importPackage( dw.util );

var LogUtils = require('~/cartridge/scripts/util/LogUtils');
var Logger = LogUtils.getLogger("TestPaymentService");

function execute( args : PipelineDictionary ) : Number
{
    var response  = getPaymentService(args.path);
    args.HttpResult = response;
    Logger.debug("GetPayment service response in pipeline execution: "+response);
    
    return response.errorCode ? PIPELET_ERROR : PIPELET_NEXT;
	
}

function getPaymentService(queryString)
{
    var httpResult;
    var result = null;
    
    try {
    	var keyValuePairs = queryString.split("&");
    	var queryParameters = new HashMap();
	    for each (var keyValueString in keyValuePairs) {
	        var keyValuePair = keyValueString.split("=");
	        
	        if (keyValuePair.length == 2) {
	            queryParameters.put(keyValuePair[0], keyValuePair[1]);
	        }
	    }
	
	    var PaymentService = require("~/cartridge/scripts/payment/PaymentService");
	    
	    var token = queryParameters.get("token");
	    var paymentID = queryParameters.get("paymentid");
	    
	    PaymentService.generateRequest(token, paymentID);
    
		result = PaymentService.getResponse();		
	} catch(ex) {
		var exception = ex;
		httpResult = exception.message;
		Logger.error("Error Occured in PaymentService response :"+httpResult);
	}
	if(result == null) {
		return httpResult;
	}

	httpResult =  JSON.stringify(result);
	return httpResult;
}


/*
 * Module exports
 */
module.exports = {
	GetPaymentService: function(queryString){
		return getPaymentService(queryString);
	}
}