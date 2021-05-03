/**
* @input IpAddress : String
*
*/
importPackage( dw.system );
importPackage( dw.util );

var FlowRepository = require("~/cartridge/scripts/logic/repositories/FlowRepository.ds");
var LogUtils = require('~/cartridge/scripts/util/LogUtils');
var Logger = LogUtils.getLogger("CheckValidIpAddress");

function execute( pdict : PipelineDictionary ) : Number
{
		
		var response  = checkValidIPAddress(pdict.IpAddress);
		Logger.debug("Check for Valid IP address"+JSON.stringify(response));
		
		return response.success ? PIPELET_NEXT : PIPELET_ERROR;
}

function checkValidIPAddress(ipAddress)
{
	try {
		var flowRepository = new FlowRepository();
		
		var whiteListedIPAddresses = flowRepository.getWhiteListedAddresses();

		var isIPWhiteListed = whiteListedIPAddresses.indexOf(ipAddress) != -1; 
	    
	   	Logger.debug("IP Address is valid "+isIPWhiteListed);
	   	if(isIPWhiteListed){
	    	return{success:true};
	    }else{
	    	return{error:true};
	    }
	}
	catch (ex) {
		var exception = ex;
		Logger.error("Error Validating IP Address :"+exception);
		return{error:true};
	}
}


/*
 * Module exports
 */
module.exports = {
	CheckValidIPAddress: function(ipAddress){
		return checkValidIPAddress(ipAddress);
	}
}