var Transaction = require('dw/system/Transaction');

var refundService = require("int_afterpay_core/cartridge/scripts/logic/services/AfterpayRefundService");
var configurationType = require("int_afterpay_core/cartridge/scripts/util/AfterpayConstants.js").CONFIGURATION_TYPE;
var LogUtils = require('int_afterpay_core/cartridge/scripts/util/LogUtils');
var Logger = LogUtils.getLogger("RefundUtilities");

var RefundUtilities = {
	createRefund: function(params){
		refundService.init();
		refundService.generateRequest(params);
		
		var refundResponse;
		
		try {
			refundResponse = refundService.getResponse();
		} catch (e) {
			Logger.debug("Exception occured in refund service call :" + e.message)
			return {
				error : true
			};
			
		}
			
		return refundResponse;
	}
};

module.exports = RefundUtilities;