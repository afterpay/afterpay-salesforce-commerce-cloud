/**
*	@input Basket : dw.order.LineItemCtnr
*   @output HttpResult : Object
*/
var LogUtils = require('*/cartridge/scripts/util/afterpayLogUtils');
var Logger = LogUtils.getLogger("TestOrderService");

/**
 *  pipeline call to execute token service
 */
function execute( args : PipelineDictionary ) : Number
{
		var response  = getOrderService(args.Basket);
    	args.HttpResult = response;
   		Logger.debug("Order service response in pipeline execution: "+response);
    
   		return response.errorCode ? PIPELET_ERROR : PIPELET_NEXT;

}

/**
 *  retrieves token 
 */
function getOrderService(basket)
{
	var result = null;
	var httpResult;
    try {
        var OrderService = require("*/cartridge/scripts/order/orderService");

        OrderService.generateRequest(basket);
		
		result = OrderService.getResponse();
		} catch(ex) {
			var exception = ex;
			httpResult = exception.message;
			Logger.error("Error Occured in Order service response :"+httpResult);
		}

		if(result == null) {
			return httpResult;
		}

		httpResult = JSON.stringify(result);

		return httpResult;
}


/*
 * Module exports
 */
module.exports = {
	getOrderService: function(basket){
		return getOrderService(basket);
	}
}