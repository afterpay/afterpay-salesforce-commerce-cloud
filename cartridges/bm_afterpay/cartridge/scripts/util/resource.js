/**
 * Resource helper
 *
 */
function ResourceHelper() {}

/**
 * Get the client-side resources of a given page
 * @returns {Object} An objects key key-value pairs holding the resources
 */
ResourceHelper.getResources = function () {
    var Resource = require('dw/web/Resource');

    // application resources
    var resources = {
        // Transaction operation messages
        SHOW_ACTIONS: Resource.msg('operations.show.actions', 'afterpay', null),
        HIDE_ACTIONS: Resource.msg('operations.hide.actions', 'afterpay', null),
        CHOOSE_ACTIONS: Resource.msg('operations.actions', 'afterpay', null),
        CHOOSE_ORDERS: Resource.msg('operations.orders', 'afterpay', null),
        TRANSACTION_SUCCESS: Resource.msg('transaction.success', 'afterpay', null),
        TRANSACTION_FAILED: Resource.msg('transaction.failed', 'afterpay', null),
        BULK_AUTHORIZE_FAILED: Resource.msg('bulk.authorize.failed', 'afterpay', null),
        TRANSACTION_PROCESSING: Resource.msg('operations.wait', 'afterpay', null),
        INVALID_COMPLETE_AMOUNT: Resource.msg('complete.amount.validation', 'afterpay', null),
        INVALID_REFUND_AMOUNT: Resource.msg('refund.amount.validation', 'afterpay', null),
        MAXIMUM_REFUND_AMOUNT: Resource.msg('maximum.refund.amount', 'afterpay', null),
        MAXIMUM_COMPLETE_AMOUNT: Resource.msg('maximum.complete.amount', 'afterpay', null)
    };
    return resources;
};

/**
 * Get the client-side URLs of a given page
 * @returns {Object} An objects key key-value pairs holding the URLs
 */
ResourceHelper.getUrls = function () {
    var URLUtils = require('dw/web/URLUtils');

    // application urls
    var urls = {
        operationActions: URLUtils.url('Operations-Action').toString()
    };

    return urls;
};

module.exports = ResourceHelper;
