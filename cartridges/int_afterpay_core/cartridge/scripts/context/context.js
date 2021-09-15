/**
 * @class
 * @abstract
 * @classdesc Maps actions to an actual endpoints and provides access to this configuration
 */
var Context = function () {
    this.actionEndpointMap = {
        getPayment: 'payments/{0}',
        directCapturePayment: 'payments/capture',
        getConfiguration: 'configuration',
        createRefund: 'payments/{0}/refund',
        authorise: 'payments/auth',
        createOrders: 'checkouts',
        getOrders: 'checkouts/{0}'
    };
};

/**
 * @description returns an API endpoint by provided action
 * @param {string} action - target action
 * @returns {string} - corresponding API endpoint
 */
Context.prototype.get = function (action) {
    return this.actionEndpointMap[action] || this.getDefaultEndpoint();
};

// eslint-disable-next-line valid-jsdoc
/**
 * @description returns a default endpoint.
 * It is called in case if nothing is mapped to provided action
 * @returns {string} - default API endpoint
 */
Context.prototype.getDefaultEndpoint = function () {
    return 'checkouts/{0}';
};

module.exports = Context;
