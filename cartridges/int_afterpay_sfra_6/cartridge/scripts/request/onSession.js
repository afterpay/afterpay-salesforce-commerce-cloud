'use strict';

var Status = require('dw/system/Status');
/**
 * The onSession hook function.
 * @returns {dw.system.Status} status
 */
exports.onSession = function () {
    var brandUtilities = require('*/cartridge/scripts/util/afterpayUtilities').brandUtilities;
    brandUtilities.initBrand(request.locale);
    // here comes a session change
    return new Status(Status.OK);
};
