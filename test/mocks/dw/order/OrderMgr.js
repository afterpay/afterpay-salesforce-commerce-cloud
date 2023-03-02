var Order = require('./Order');
var OrderMgr = function () {};
var orders = [new Order('orderMgrTestOrder')];

OrderMgr.resetDefaultOrder = function () { orders = [new Order('orderMgrTestOrder')]; };

OrderMgr.getOrder = function (ID) { return orders.filter(function (order) { return order.ID === ID; })[0]; };
OrderMgr.queryOrders = function () {};
OrderMgr.searchOrder = function () {};
OrderMgr.failOrder = function () {};
OrderMgr.cancelOrder = function () {};
OrderMgr.placeOrder = function () {};
OrderMgr.searchOrders = function () {};
OrderMgr.createOrder = function () {};
OrderMgr.undoFailOrder = function () {};
OrderMgr.processOrders = function (callback) { orders.forEach(function (order) { callback(order); }); };
OrderMgr.describeOrder = function () {};
OrderMgr.queryOrder = function () {};
OrderMgr.createShippingOrders = function () {};

OrderMgr.prototype.order = null;

module.exports = OrderMgr;
