importPackage( dw.order );
importPackage( dw.system );
importPackage( dw.util );
importPackage( dw.web );

var orderCreateService = require("~/cartridge/scripts/order/OrderService");
var TokenModel = require("~/cartridge/scripts/models/AfterpayTokenModel.js");
var Transaction = require('dw/system/Transaction');
var collections = require('*/cartridge/scripts/util/collections');
var LogUtils = require('~/cartridge/scripts/util/LogUtils');
var Logger = LogUtils.getLogger("AfterpayGetToken");
    

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

module.exports.GetToken = getToken;