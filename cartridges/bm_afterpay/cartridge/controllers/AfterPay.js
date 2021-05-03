'use strict';

/**
 * Controller for Order management pages
 *
 */

/* API Includes */
var ISML = require('dw/template/ISML');


/* Script Modules */
var LogUtils = require('~/cartridge/scripts/util/LogUtils'),
	Logger = LogUtils.getLogger("AfterPay");

/**
 * AfterPay Order List page
 * */
function orderList(){
	var pageSize = request.httpParameterMap.pagesize.value,
	pageNumber = request.httpParameterMap.pagenumber.value,
	orderNumber = request.httpParameterMap.ordernumber.value || "",
	orderListResponse;

	pageSize = pageSize ? parseInt(pageSize, 10) : 10;
	pageNumber = pageNumber ? parseInt(pageNumber, 10) : 1;
	
	orderListResponse = require('~/cartridge/scripts/getOrders').output({
		pageSize: pageSize,
		pageNumber: pageNumber,
		orderNumber: orderNumber
	});
	ISML.renderTemplate('application/orderlist', orderListResponse);
}


/**
 * AfterPay Order Details page
 * */
function orderDetails(){
	ISML.renderTemplate('application/orderdetails', {});
}

function documentation(){
	ISML.renderTemplate('application/documentation', {});
}

/*
 * Exposed web methods
 */
orderList.public = true;
orderDetails.public = true;
documentation.public = true;

exports.OrderList = orderList;
exports.OrderDetails = orderDetails;
exports.Documentation = documentation;