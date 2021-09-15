var Status = require('dw/system/Status');

/**
 * The onSession hook function.
 * @returns {dw.system.Status} status
 */
exports.onSession = function () {
    var { brandUtilities } = require('*/cartridge/scripts/util/afterpayUtilities');

    brandUtilities.initBrand(request.locale);
    var thresholdUtilities = require('*/cartridge/scripts/util/thresholdUtilities');
    var brand = brandUtilities.getBrand();
    var threshold = thresholdUtilities.getThresholdAmounts(brand);
    thresholdUtilities.saveThresholds(brand, threshold);
    // here comes a session change
    return new Status(Status.OK);
};
