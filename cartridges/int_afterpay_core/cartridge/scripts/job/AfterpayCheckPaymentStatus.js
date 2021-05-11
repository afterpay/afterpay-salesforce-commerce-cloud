importPackage( dw.order );
importPackage( dw.system );
importPackage( dw.util );

var BaseUpdateOrderService = require("~/cartridge/scripts/logic/services/AfterpayUpdateOrderService.ds");
var AfterpayUtilities = require("~/cartridge/scripts/util/AfterpayUtilities.js").getAfterpayCheckoutUtilities();
var PAYMENT_MODE = require("~/cartridge/scripts/util/AfterpayConstants.js").PAYMENT_MODE;
var PAYMENT_STATUS = require("~/cartridge/scripts/util/AfterpayConstants.js").PAYMENT_STATUS;
var LogUtils = require('~/cartridge/scripts/util/LogUtils');
var Logger = LogUtils.getLogger("AfterpayCheckPaymentStatus");


function execute()
{
	var UpdateOrderService = undefined; 
	try {
		UpdateOrderService = getUpdateOrderService();		
		var result = UpdateOrderService.checkPaymentStatus();
		var OrdersAvailable = result;
		Logger.debug("Orders Available :" +OrdersAvailable);
		
	} catch (ex) {
		var exception = ex;
        Logger.error("Error when checking payment status" +exception);
	}
	
}

var getUpdateOrderService = function () {
	
	var UpdateOrderService  = BaseUpdateOrderService.extend({
		
		init : function () {
			this._super();
		},
		
		updateDeclinedOrder : function (order) {
	    	this._super(order);
    		this.updatePaymentStatusDeclined(order);    		
	    },
	    
	    updateApprovedOrder : function (order) {
			this._super(order);
			this.updatePaymentStatusApproved(order);
	    },
	    
	    updatePaymentStatusApproved : function(order) {
	    	this.updatePaymentStatus(order, PAYMENT_STATUS.APPROVED);
	    },
	    
	    updatePaymentStatusDeclined : function(order) {
	    	Transaction.wrap(function() {
	    		this.updatePaymentStatus(order, PAYMENT_STATUS.UNKNOWN);
	    		var paymentTransaction = AfterpayUtilities.getPaymentTransaction(order);
	    		paymentTransaction.setTransactionID("");
    		});
	    },
	    
	    updatePaymentStatus: function(order, status) {
    		var paymentMode = AfterpayUtilities.getPaymentModeFromOrder(order);
    		var paymentTransaction = AfterpayUtilities.getPaymentTransaction(order);
    		Transaction.wrap(function() {
	    		if(paymentMode == PAYMENT_MODE.AUTHORISE) {
					paymentTransaction.custom.apAuthoriseStatus = status;
	    		} else {
					paymentTransaction.custom.apDirectPaymentStatus = status;
	    		}
	    		Logger.debug("Payment Transaction status:"+status);
    		});
	    }
	    
	});
	
	return new UpdateOrderService();
}


/** Exported functions **/
module.exports = {
	execute: execute
};