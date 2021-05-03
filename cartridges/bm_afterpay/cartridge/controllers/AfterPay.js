'use strict';
/* global request */

/**
 * Controller for Order management pages
 *
 */

/* API Includes */
var ISML = require('dw/template/ISML');

/**
 * AfterPay Order List page
 * */
function orderList() {
    var ResourceHelper = require('~/cartridge/scripts/util/resource.js');
    var pageSize = request.httpParameterMap.pagesize.value;
    var pageNumber = request.httpParameterMap.pagenumber.value;
    var orderNumber = request.httpParameterMap.ordernumber.value || '';
    var orderListResponse;

    pageSize = pageSize ? parseInt(pageSize, 10) : 10;
    pageNumber = pageNumber ? parseInt(pageNumber, 10) : 1;

    orderListResponse = require('*/cartridge/scripts/getOrders').output({
        pageSize: pageSize,
        pageNumber: pageNumber,
        orderNumber: orderNumber
    });
    orderListResponse.ResourceHelper = ResourceHelper;

    ISML.renderTemplate('application/orderlist', orderListResponse);
}


/**
 * AfterPay Order Details page
 * */
function orderDetails() {
    var ResourceHelper = require('~/cartridge/scripts/util/resource.js');

    ISML.renderTemplate('application/orderdetails', { ResourceHelper: ResourceHelper });
}

/**
 * Link to documentation page
 * */
function documentation() {
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
