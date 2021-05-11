/**
 *
 * @input Basket : dw.order.Basket The basket to create shipments for
 * @output AfterpayToken : Object
 */
importPackage( dw.order );
importPackage( dw.system );
importPackage( dw.util );
importPackage( dw.web );

var orderCreateService = require("~/cartridge/scripts/order/OrderService");
var TokenModel = require("~/cartridge/scripts/models/AfterpayTokenModel.js");
var LogUtils = require('~/cartridge/scripts/util/LogUtils');
var Logger = LogUtils.getLogger("AfterpayGetToken");
    
function execute( pdict : PipelineDictionary ) : Number
{
	var basket = pdict.Basket;
	
	if (empty(basket)) {
		Logger.error("No basket for getting token");
		return PIPELET_ERROR;
	}
	var response = getToken(basket);
	
	if(response.error){
		Logger.error("Error creating token in pipeline execution:"+response.error);
		pdict.AfterpayToken = response;
		return PIPELET_ERROR;
	}
	pdict.AfterpayToken = response;
	return PIPELET_NEXT;

}

function getToken(basket){
	var AfterpayToken;
	try {

		orderCreateService.generateRequest(basket);

		var response = orderCreateService.getResponse();
		var res = new TokenModel();

		if (!empty(response.token)) {

			Logger.debug("Afterpay Token generated from service: " + response.token);
			res.apToken = response.token;

			AfterpayToken = res;
			return AfterpayToken;
			
		} else {
			Logger.error("Can not get token. The response: " + response);
			return response;
		}

	} catch (exception) {
		Logger.error("Exception to get token: "+exception);
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
	GetToken: function(Basket){
		return getToken(Basket);
	}
}