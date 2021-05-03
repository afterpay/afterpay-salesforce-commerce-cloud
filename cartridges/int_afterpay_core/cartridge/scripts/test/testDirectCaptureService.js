/**
*   @input path : String
*   @output HttpResult : Object
*/
var LogUtils = require('*/cartridge/scripts/util/afterpayLogUtils');
var Logger = LogUtils.getLogger("TestDirectCaptureService");


/**
 *  pipeline call to invoke the direct capture payment services
 */
function execute( args : PipelineDictionary ) : Number
{
    var response  = directCaptureService(args.path);
    args.HttpResult = response;
    Logger.debug("Directcapture service response in pipeline execution: "+response);
    
    return response.errorCode ? PIPELET_ERROR : PIPELET_NEXT;
}

/**
 *  processes direct capture payment service
 */
function directCaptureService(queryString)
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
	
	    var captureService = require("*/cartridge/scripts/logic/services/afterpayDirectCapturePaymentService.ds");
	    
	    var token = queryParameters.get("token");
	    captureService.generateRequest(token);
	    
		result = captureService.getResponse();		
	} catch(ex) {
		var exception = ex;
		httpResult = exception.message;
		Logger.error("Error Occured in Capture service response :"+httpResult);
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
	directCaptureService: function(queryString){
		return directCaptureService(queryString);
	}
}