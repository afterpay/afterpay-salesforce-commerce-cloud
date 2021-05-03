importPackage( dw.order );
importPackage( dw.system );
importPackage( dw.util );
importPackage( dw.web );

var orderCreateService = require("~/cartridge/scripts/order/ExpressOrderService");
var TokenModel = require("~/cartridge/scripts/models/AfterpayTokenModel.js");
var Transaction = require('dw/system/Transaction');
var collections = require('*/cartridge/scripts/util/collections');
var LogUtils = require('~/cartridge/scripts/util/LogUtils');
var Logger = LogUtils.getLogger("AfterpayGetToken");

function getToken(basket, checkoutPrice, sourceUrl, merchantReference, store){
	var AfterpayToken;
	try {

		orderCreateService.generateRequest(basket, checkoutPrice, sourceUrl, merchantReference, store);

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
	GetToken: function(basket, checkoutPrice, sourceUrl, merchantReference, store){
		return getToken(basket, checkoutPrice, sourceUrl, merchantReference, store);
	}
}