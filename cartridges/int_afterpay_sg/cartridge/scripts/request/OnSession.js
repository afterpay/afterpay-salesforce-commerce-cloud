var Status = require('dw/system/Status');

/**
 * The onSession hook function.
 * @returns {dw.system.Status} status
 */
exports.onSession = function () {
    var AfterpayUtilities = require('*/cartridge/scripts/util/afterpayUtilities');
    var BrandUtilities = AfterpayUtilities.brandUtilities;

    BrandUtilities.initBrand(request.locale);
    return new Status(Status.OK);
};
