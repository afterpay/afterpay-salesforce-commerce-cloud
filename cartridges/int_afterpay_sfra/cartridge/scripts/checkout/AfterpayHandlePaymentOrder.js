/**
*   @input PaymentStatus : String
*   @input Order : dw.order.Order
*   @output FinalPaymentStatus : Object   
*
*/
importPackage( dw.system );

var PAYMENT_STATUS = require("~/cartridge/scripts/util/AfterpayConstants").PAYMENT_STATUS;
var hanldeUpdateOrder = require("~/cartridge/scripts/checkout/AfterpayUpdateOrder").HanldeUpdateOrder;
var BaseUpdateOrderService = require("~/cartridge/scripts/logic/services/AfterpayUpdateOrderService");
var sitePreferencesUtilities = require("~/cartridge/scripts/util/AfterpayUtilities").getSitePreferencesUtilities();
var Transaction = require('dw/system/Transaction');
var LogUtils = require('~/cartridge/scripts/util/LogUtils');
var Logger = LogUtils.getLogger("AfterpayHandlePaymentOrder");

var parsePaymentStatus = function (paymentStatus : String) {
	 return (paymentStatus == PAYMENT_STATUS.SUCCESS) ? PAYMENT_STATUS.APPROVED : paymentStatus;
}

function getPaymentStatus(order, paymentStatus, expressCheckoutModel){
		var orderStatus = undefined;
		var UpdateOrderService = undefined;
		
		var paymentStatus = parsePaymentStatus(paymentStatus);
		Logger.debug("parsed payment status : "+paymentStatus);
		try {
			UpdateOrderService = getUpdateOrderService(paymentStatus);
			 // order changes after this next line
			UpdateOrderService.handleOrder(order, paymentStatus, expressCheckoutModel);
			orderStatus = UpdateOrderService.orderStatus;
			
			Logger.debug("UpdatedOrder service status : "+orderStatus);
			
		} catch (exception){
			Logger.error("Exception occured while updating order status " + exception);
			return {
				error : true,
				errorMessage : exception
			};
		}
		return orderStatus;
}

var getUpdateOrderService = function () {
		var UpdateOrderService  = BaseUpdateOrderService.extend({
			
			orderStatus : undefined,
			
			init : function () {
				this._super();
			},
			
			updateDeclinedOrder : function () {
				this.orderStatus = PAYMENT_STATUS.DECLINED;
			},
			
			updateFailedOrder : function () {
				this.orderStatus = PAYMENT_STATUS.FAILED;
			},
			
			/**
			 * Update order after calling direct capture/ authorise mode. The order will be not update if the response returns declined status
			 */
			updateStatusOrder : function (order, paymentStatus) {
				this.orderStatus = paymentStatus.status;
				hanldeUpdateOrder (order, paymentStatus, sitePreferencesUtilities.getPaymentMode().value);			
			}
		});
		return new UpdateOrderService();
	
}


/*
 * Module exports
 */
module.exports.GetPaymentStatus = getPaymentStatus;