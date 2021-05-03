/**
*	Gets order list 
*
*-	@input ItemType: String
*-	@input Category: String
*
*	@output OrderList: Array
*
*/

// API Includes
var OrderMgr = require('dw/order/OrderMgr'),
	Site = require('dw/system/Site'),
	Transaction = require('dw/system/Transaction'),
	Resource = require('dw/web/Resource');

var LogUtils = require('~/cartridge/scripts/util/LogUtils'),
	log = LogUtils.getLogger("getOrders");

function getOrders(input) {
	var pageSize = input.pageSize,
		pageNumber = input.pageNumber,
		orderNumber = input.orderNumber,
		result = new dw.util.ArrayList(),
		totalOrderCount, startRow, endRow, orders, order, rowCount;
	
	totalOrderCount = startRow = endRow = rowCount = pageCount = 0;
	
	if(orderNumber){//searching for an order ID
		order = OrderMgr.searchOrder("orderNo = {0}", orderNumber);
		
		if(order){
			result.push(order);
			totalOrderCount = startRow = endRow = 1;
		}
	}
	else{// all orders on pagination
		orders = OrderMgr.searchOrders("custom.apIsAfterpayOrder = {0}", "creationDate desc", true);
		
		orders.forward((pageNumber - 1) * pageSize, pageSize);
		
		while(orders.hasNext()){
			result.push(orders.next());
			rowCount++;
		}
		
		totalOrderCount = orders.count;
		startRow = ((pageNumber - 1) * pageSize) + 1;
		endRow = startRow + rowCount - 1;
		pageCount = Math.ceil(totalOrderCount / pageSize);
	}
	
	return {
		orders: result,
		totalOrderCount: totalOrderCount,
		startRow: startRow,
		endRow: endRow,
		pageSize: pageSize,
		pageNumber: pageNumber,
		pageCount: pageCount,
		orderNumber: orderNumber
	};
}

module.exports = {
	output: function(input){
		return getOrders(input);
	}
}