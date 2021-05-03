
var LogUtils = require('*/cartridge/scripts/util/afterpayLogUtils');
var Logger = LogUtils.getLogger('afterpayCallThreshold');

/**
 *  calls 'thresholdUtilities' module to set threshold amount
 *  @returns {boolean} error
 */
function setThreshold() {
    try {
        require('*/cartridge/scripts/util/thresholdUtilities').setThresholdInSession();
        return { error: false };
    } catch (exception) {
        Logger.error('Exception to set threshold in session: ' + exception);
        return {
            error: true
        };
    }
}


/*
 * Module exports
 */
module.exports = {
    setThreshold: function () {
        return setThreshold();
    }
};
