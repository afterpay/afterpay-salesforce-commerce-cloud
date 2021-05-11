/**
*   @input path : String
*   @output HttpResult : Object
*/

importPackage( dw.catalog );
importPackage( dw.system );
importPackage( dw.util );

var LogUtils = require('~/cartridge/scripts/util/LogUtils');
var Logger = LogUtils.getLogger("TestAuthoriseService");

function execute( args : PipelineDictionary ) : Number
{
	var response  = authorisePaymentService(args.path);
    args.HttpResult = response;
    Logger.debug("Authorise Payment service response in pipeline execution: "+response);
    
    return response.errorCode ? PIPELET_ERROR : PIPELET_NEXT;
}

function authorisePaymentService(queryString)
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
	
	    var AuthoriseService = require("~/cartridge/scripts/logic/services/AfterpayAuthorisePaymentService.ds");
	    
	    var token = queryParameters.get("token");
	    
	    AuthoriseService.generateRequest(token);
	    
		result = AuthoriseService.getResponse();		
	} catch(ex) {
		var exception = ex;
		httpResult = exception.message;
		Logger.error("Error Occured in Authorise service response : "+httpResult);
	}
	
	if(result == null) {
		return httpResult;
	}
	
	httpResult = JSON.stringify(result);
	return httpResult;
}


/*
 * Module exports
 */
module.exports = {
	AuthorisePaymentService: function(queryString){
		return authorisePaymentService(queryString);
	}
}