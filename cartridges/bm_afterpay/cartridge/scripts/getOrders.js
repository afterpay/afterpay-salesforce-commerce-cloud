'use strict';

/**
* Gets order list
*
*- @input ItemType: String
*- @input Category: String
*
* @output OrderList: Array
*
*/

// API Includes
var OrderMgr = require('dw/order/OrderMgr');
var ArrayList = require('dw/util/ArrayList');

/**
 * Get orders
 * @param {Object} input - input parameters
 * @returns {Object} orders data
 * */
function getOrders(input) {
    var pageSize = input.pageSize;
    var pageNumber = input.pageNumber;
    var orderNumber = input.orderNumber;
    var result = new ArrayList();
    var totalOrderCount;
    var startRow;
    var endRow;
    var orders;
    var order;
    var rowCount;
    var pageCount;

    totalOrderCount = startRow = endRow = rowCount = pageCount = 0; // eslint-disable-line

    if (orderNumber) { // searching for an order ID
        order = OrderMgr.searchOrder('orderNo = {0}', orderNumber);

        if (order) {
            result.push(order);
            totalOrderCount = startRow = endRow = 1;// eslint-disable-line
        }
    } else { // all orders on pagination
        orders = OrderMgr.searchOrders('custom.apIsAfterpayOrder = {0}', 'creationDate desc', true);

        orders.forward((pageNumber - 1) * pageSize, pageSize);

        while (orders.hasNext()) {
            result.push(orders.next());
            rowCount++;
        }

        totalOrderCount = orders.count;
        startRow = ((pageNumber - 1) * pageSize) + 1;
        endRow = startRow + rowCount;
        endRow--;
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
    output: function (input) {
        return getOrders(input);
    }
};
