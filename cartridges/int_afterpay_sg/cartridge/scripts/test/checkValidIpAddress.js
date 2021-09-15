/**
* @input IpAddress : String
*
*/
var FlowRepository = require("*/cartridge/scripts/logic/repositories/flowRepository.js");
var LogUtils = require('*/cartridge/scripts/util/afterpayLogUtils');
var Logger = LogUtils.getLogger("CheckValidIpAddress");

/**
 *  pipeline call to check valid IP address
 */
function execute( pdict : PipelineDictionary ) : Number
{
		
		var response  = checkValidIPAddress(pdict.IpAddress);
		Logger.debug("Check for Valid IP address"+JSON.stringify(response));
		
		return response.success ? PIPELET_NEXT : PIPELET_ERROR;
}

/**
 *  validated the IP address
 */
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
	checkValidIPAddress: function(ipAddress){
		return checkValidIPAddress(ipAddress);
	}
}