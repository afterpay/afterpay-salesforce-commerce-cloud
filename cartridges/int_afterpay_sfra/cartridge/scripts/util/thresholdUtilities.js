'use strict';
/* global session */
var Transaction = require('dw/system/Transaction');

var afterpaySitePreferencesUtilities = require('*/cartridge/scripts/util/afterpayUtilities');
var configurationService = require('*/cartridge/scripts/logic/services/afterpayConfigurationService');
var configurationType = require('*/cartridge/scripts/util/afterpayConstants.js').CONFIGURATION_TYPE;
var LogUtils = require('*/cartridge/scripts/util/afterpayLogUtils');
var Logger = LogUtils.getLogger('thresholdUtilities');

/**
 *  set threshold in session based either on the configuration or from API response
 */
var thresholdUtilities = {
    setThresholdInSession: function () {
        var minThresholdAmount = afterpaySitePreferencesUtilities.sitePreferencesUtilities.getMinThresholdAmount();
        var maxThresholdAmount = afterpaySitePreferencesUtilities.sitePreferencesUtilities.getMaxThresholdAmount();
        var isErrorOccured = false;
        if (minThresholdAmount !== null && maxThresholdAmount !== null && (minThresholdAmount - maxThresholdAmount !== 0.0)) {
            Transaction.begin();
            session.privacy.afterPayIsRangeAvailable = true;
            session.privacy.afterPayMinAmount = minThresholdAmount;
            session.privacy.afterPayMaxAmount = maxThresholdAmount;
            Transaction.commit();
        } else {
            configurationService.generateRequest();
            var thresholdResponse;
            try {
                thresholdResponse = configurationService.getResponse();
                Logger.debug('service response to get the threshold amount :' + JSON.stringify(thresholdResponse));
            } catch (e) {
                Logger.debug('Exception occured to set the threshold amount in session :' + e);
                isErrorOccured = {
                    error: true
                };
            }

            if (thresholdResponse.length > 0) {
                for (var i = 0; i < thresholdResponse.length; i++) {
                    var threshold = thresholdResponse[i];
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
        return isErrorOccured;
    },
    getThreshold: function () {
        return {
            isRangeAvailable: session.privacy.afterPayIsRangeAvailable || false,
            minAmount: session.privacy.afterPayMinAmount || 0.0,
            maxAmount: session.privacy.afterPayMaxAmount || 0.0
        };
    }
};

module.exports = thresholdUtilities;
