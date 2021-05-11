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
var OrderMgr = require('dw/order/OrderMgr');

 function checkTokenConflict(basket, token){
 	
 	var productPresent = false, tokenValidate, apItemsArray, apItemsList,
 	productLineItems, apProductLineItem, productLineItem, productSku, apProductSku;
 	
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
		productLineItems = removeBundledItems(basket.getAllProductLineItems().toArray());
		productLineItems = new dw.util.ArrayList(productLineItems);
		productLineItems = productLineItems.iterator();
		
		apItemsArray = new dw.util.ArrayList(tokenValidate.items);
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
 
 function removeBundledItems(basketProductsList){
	 
	 var filteredProductsList = [];
	 for (i = 0; i < basketProductsList.length; i++) { 
		var product = basketProductsList[i].product; 
		var bundledProduct = product && product.bundled ? product.bundled : false;
		var optionalProduct = basketProductsList[i].optionProductLineItem ? basketProductsList[i].optionProductLineItem : false;
		
		if(!bundledProduct && !optionalProduct){
			filteredProductsList.push(basketProductsList[i]);
 		}
 	}
	return  filteredProductsList ? filteredProductsList : basketProductsList;
 }
 
 /*
 * Module exports
 */
module.exports.CheckTokenConflict = checkTokenConflict;