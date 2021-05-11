/**
*   @input responseToken : String
*   @input Basket : dw.order.Basket The basket to create shipments for
*   @output productPresent : Boolean   
*
*/

importPackage( dw.order );
importPackage( dw.system );
importPackage( dw.util );

var LogUtils = require('~/cartridge/scripts/util/LogUtils');
var Logger = LogUtils.getLogger("AfterpayTokenConflict");

function execute( args : PipelineDictionary ) : Number
{	
		var tokenValidate, productExists,
		basket = args.Basket;
	
		if (empty(basket) || empty(args.responseToken)) {
			Logger.error("One or the other paramter is missing");
			return PIPELET_ERROR;
		}
		
		try{
			productExists = checkTokenConflict(basket, args.responseToken);
		}
		catch (exception) {
			Logger.error("Exception to getOrders service: "+exception);
			return PIPELET_ERROR;
		}
		
		args.productPresent = productExists;
		
		return PIPELET_NEXT;
}

 function checkTokenConflict(basket, token){
 	
 	var productPresent = false, tokenValidate, apItemsArray, apItemsList,
 	productLineItems, apProductLineItem, productLineItem, productSku, apProductSku;
 	
 	productLineItems = basket.getAllProductLineItems().iterator();
		
		try{
			tokenValidate = require('~/cartridge/scripts/util/GetOrderToken').validateOrderToken(token);
		}
		catch (exception) {
			Logger.error("Exception to getOrders service: "+exception);
			return {
				error : true,
				errorMessage : exception
			};
		}
    	
		
		apItemsArray = new dw.util.ArrayList();
		apItemsArray.add(tokenValidate.items);
		
		apItemsList = apItemsArray.iterator();
		
		while (productLineItems.hasNext() || apItemsList.hasNext()) {
			 productLineItem = productLineItems.hasNext() ? productLineItems.next() : "";
			 apProductLineItem = apItemsList.hasNext() ? apItemsList.next() : "";
			 
			 productSku = productLineItem.productID ? productLineItem.productID : "";
			 apProductSku = apProductLineItem.sku ? apProductLineItem.sku.toString() : "";
			 
			 if(productSku == apProductSku){
				 if(productLineItem.quantity == apProductLineItem.quantity){
	     			productPresent = true;
		        }else{
		     		 productPresent = false;
			      }
			 }else{
	     		 productPresent = false;
		     }
	        	 
	    }
	    return productPresent;
	    
 }
 
 
 /*
 * Module exports
 */
module.exports = {
	CheckTokenConflict: function(Basket, token){
		return checkTokenConflict(Basket, token);
	}
}