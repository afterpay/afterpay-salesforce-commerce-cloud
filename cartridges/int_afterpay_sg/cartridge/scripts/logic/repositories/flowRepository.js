'use strict';

var System = require('dw/system/System');
/**
 * Flow repository
 * */
var FlowRepository = function () {};

/**
 * retrieves whitelisted IP addresses
 * @returns {string} flowIPAddresses
 */
FlowRepository.prototype.getWhiteListedAddresses = function () {
    var flowIPAddresses = null;

    if (!empty(System.preferences.custom.flowIPAddresses)) {
        flowIPAddresses = System.preferences.custom.flowIPAddresses;
    }

    return flowIPAddresses;
};

module.exports = FlowRepository;
