'use strict';

var server = require('server');
var Search = module.superModule;
server.extend(Search);

/**
 * appends Search-Show method to show afterpay widget
 */
server.append('Show', function (req, res, next) {
    var sitePreferences = require('*/cartridge/scripts/util/AfterpayUtilities').getSitePreferencesUtilities();
    var afterpayEnable = sitePreferences.isAfterpayEnabled();
    if (afterpayEnable) {
        require('~/cartridge/scripts/util/AfterpayCallThreshold').SetThreshold();
    }
    next();
});

module.exports = server.exports();
