/* global session */
var Transaction = require('dw/system/Transaction');

var AfterpaySitePreferencesUtilities = require('*/cartridge/scripts/util/afterpayUtilities').getSitePreferencesUtilities();
var configurationService = require('*/cartridge/scripts/logic/services/afterpayConfigurationService');
var configurationType = require('*/cartridge/scripts/util/afterpayConstants.js').CONFIGURATION_TYPE;
var LogUtils = require('*/cartridge/scripts/util/afterpayLogUtils');
var Logger = LogUtils.getLogger('ThresholdUtilities');

/**
 * set threshold in session based either on the configuration or from API response
 */
var ThresholdUtilities = {
    setThresholdInSession: function () {
        var minThresholdAmount = AfterpaySitePreferencesUtilities.getMinThresholdAmount();
        var maxThresholdAmount = AfterpaySitePreferencesUtilities.getMaxThresholdAmount();

        if (minThresholdAmount !== null && maxThresholdAmount !== null && (minThresholdAmount - maxThresholdAmount !== 0.0)) {
            Transaction.begin();
            session.privacy.afterPayIsRangeAvailable = true;
            session.privacy.afterPayMinAmount = minThresholdAmount;
            session.privacy.afterPayMaxAmount = maxThresholdAmount;
            Transaction.commit();
        } else {
            configurationService.init();
            configurationService.generateRequest();
            var thresholdResponse;
            try {
                thresholdResponse = configurationService.getResponse();
                Logger.debug('service response to get the threshold amount :' + JSON.stringify(thresholdResponse));
            } catch (e) {
                Logger.debug('Exception occured to set the threshold amount in session :' + e);

                return {
                    error: true
                };
            }

            var threshold;

            if (thresholdResponse.length > 0) {
                // for each(threshold in thresholdResponse){
                for (var i = 0; i < thresholdResponse.length; i++) {
                    threshold = thresholdResponse[i];

                    if (threshold.type === configurationType.PAY_BY_INSTALLMENT && (parseFloat(threshold.minimumAmount.amount, 10) - parseFloat(threshold.maximumAmount.amount, 10)) !== 0.0) {
                        Transaction.begin();
                        session.privacy.afterPayIsRangeAvailable = true;
                        session.privacy.afterPayMinAmount = parseFloat(threshold.minimumAmount.amount, 10);
                        session.privacy.afterPayMaxAmount = parseFloat(threshold.maximumAmount.amount, 10);
                        Transaction.commit();
                        break;
                    }
                }
            }
        }

        return {
            error: false
        };
    },
    getThreshold: function () {
        return {
            isRangeAvailable: session.privacy.afterPayIsRangeAvailable || false,
            minAmount: session.privacy.afterPayMinAmount || 0.0,
            maxAmount: session.privacy.afterPayMaxAmount || 0.0
        };
    }
};

module.exports = ThresholdUtilities;
