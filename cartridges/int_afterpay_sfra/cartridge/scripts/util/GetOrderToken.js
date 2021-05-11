
var getOrderService = require("~/cartridge/scripts/logic/services/AfterpayGetOrderService");
var LogUtils = require('~/cartridge/scripts/util/LogUtils');
var Logger = LogUtils.getLogger("GetOrderToken");


var GetOrderToken = {
	validateOrderToken: function(token){
		getOrderService.init();
		getOrderService.generateRequest(token);
		var getOrdersResponse;
		try {
			getOrdersResponse = getOrderService.getResponse();
			Logger.debug("service response to get the Orders :"+getOrdersResponse);
			return getOrdersResponse;
		} catch (e) {
			Logger.debug("Exception occured to get the Orders :"+e)
			return {
				error : true
			};
		}
			
	}
};

module.exports = GetOrderToken;