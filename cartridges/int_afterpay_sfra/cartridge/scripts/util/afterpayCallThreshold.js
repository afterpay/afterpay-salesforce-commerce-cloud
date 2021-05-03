
importPackage( dw.system );

var LogUtils = require('~/cartridge/scripts/util/LogUtils');
var Logger = LogUtils.getLogger("AfterpayCallThreshold");

function execute( args : PipelineDictionary ) : Number
{
	var response = setThreshold();
	
	if(response.error){
		return PIPELET_ERROR;
	}
    	
   return PIPELET_NEXT;
}

function setThreshold(){
	
	try{
		require('~/cartridge/scripts/util/ThresholdUtilities').setThresholdInSession();
		return {error : false};	
	}catch (exception) {
		Logger.error("Exception to set threshold in session: "+exception);
		return {
			error : true
		};
	}
}


/*
 * Module exports
 */
module.exports = {
	SetThreshold: function(){
		return setThreshold();
	}
}