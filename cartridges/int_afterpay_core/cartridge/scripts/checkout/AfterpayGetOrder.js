/**
 *
 * @input Basket : dw.order.Basket The basket to create shipments for
 * @output AfterpayToken : Object
 */
importPackage( dw.order );
importPackage( dw.system );
importPackage( dw.util );
importPackage( dw.web );

var orderGetService = require("~/cartridge/scripts/logic/services/AfterpayGetOrderService");
var LogUtils = require('~/cartridge/scripts/util/LogUtils');
var Logger = LogUtils.getLogger("AfterpayGetToken");
    
// execute() is untested
function execute( pdict : PipelineDictionary ) : Number
{
	var token = pdict.token;
	
	if (!token) {
		Logger.error("No token to get order for");
		return PIPELET_ERROR;
	}
	var response = getOrder(token);
	
	if(response.error){
		Logger.error("Error getting token in pipeline execution:"+response.error);
		return PIPELET_ERROR;
	}
	pdict.order = response;
	return PIPELET_NEXT;

}

function getOrder(token){
	try {

		orderGetService.generateRequest(token);

		var response = orderGetService.getResponse();

		if (!response || !response.token) {
            Logger.error('Can not get order. The response: ' + response);
            
            return {
                error: true,
                errorMessage: "Could not retrieve order details from Afterpay"
            };			
		} 
        Logger.debug("Afterpay order returned from service: " + response);
        return response;

	} catch (exception) {
		Logger.error("Exception to get order: "+exception);
		return {
			error : true,
			errorMessage : exception
		};
	}
}


/*
 * Module exports
 */
module.exports = {
	GetOrder: function(token){
		return getOrder(token);
	}
}