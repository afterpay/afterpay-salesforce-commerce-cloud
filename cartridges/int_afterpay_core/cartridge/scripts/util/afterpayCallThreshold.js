var LogUtils = require('*/cartridge/scripts/util/afterpayLogUtils');
var Logger = LogUtils.getLogger('AfterpayCallThreshold');

/**
 * calls 'ThresholdUtilities' module to set threshold amount
 * @returns {Object} errorStatus - error status
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
    SetThreshold: function () {
        return setThreshold();
    }
};
