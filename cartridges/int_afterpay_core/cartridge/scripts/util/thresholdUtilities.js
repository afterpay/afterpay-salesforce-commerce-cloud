'use strict';

var configurationService = require('*/cartridge/scripts/logic/services/afterpayConfigurationService');
var LogUtils = require('*/cartridge/scripts/util/afterpayLogUtils');
var Logger = LogUtils.getLogger('thresholdUtilities');
var brandUtilities = require('*/cartridge/scripts/util/afterpayUtilities').brandUtilities;
var result = {
    status: false
};

/**
 * @abstract
 * @description set threshold in session based either on the configuration or from API response
 */
var thresholdUtilities = {
    parseConfigurationResponse: function (thresholdResponse) {
        var configuration = {
            minAmount: 0,
            maxAmount: 0,
            mpid: ''
        };

        var minThresholdObj;
        var maxThresholdObj;

        var currentCurrency = session.currency.getCurrencyCode();
        if (thresholdResponse && thresholdResponse.maximumAmount) {
            if (thresholdResponse.maximumAmount.currency !== currentCurrency) {
                if (('CBT' in thresholdResponse) && thresholdResponse.CBT.enabled && thresholdResponse.CBT.limits) {
                    var cbtLimits = thresholdResponse.CBT.limits;
                    if (Object.keys(cbtLimits).length >= 1 && currentCurrency in cbtLimits) {
                        minThresholdObj = cbtLimits[currentCurrency].minimumAmount;
                        maxThresholdObj = cbtLimits[currentCurrency].maximumAmount;
                    }
                }
            } else {
                minThresholdObj = thresholdResponse.minimumAmount;
                maxThresholdObj = thresholdResponse.maximumAmount;
            }

            if (minThresholdObj) {
                configuration.minAmount = parseFloat(minThresholdObj.amount, 10);
            }

            if (maxThresholdObj) {
                configuration.maxAmount = parseFloat(maxThresholdObj.amount, 10);
            }

            if ('publicId' in thresholdResponse) {
                configuration.mpid = thresholdResponse.publicId;
            }
        }

        return configuration;
    },
    getThresholdAmounts: function () {
        var thresholdResult = {};

        var prefix = request.getLocale();
        thresholdResult.minAmount = session.privacy[prefix + 'MinAmount'];
        thresholdResult.maxAmount = session.privacy[prefix + 'MaxAmount'];
        thresholdResult.mpid = session.privacy[prefix + 'mpid'];

        var thresholdResponse;

        if (empty(thresholdResult.minAmount) || empty(thresholdResult.maxAmount)) {
            configurationService.generateRequest();
            try {
                thresholdResponse = configurationService.getResponse();
            } catch (e) {
                Logger.debug('Exception occured to set the threshold amount in session :' + e);

                return {
                    error: true
                };
            }

            thresholdResult = this.parseConfigurationResponse(thresholdResponse);
            this.saveThresholds(thresholdResult);
        }

        return thresholdResult;
    },
    saveThresholds: function (thresholds) {
        var prefix = request.getLocale();

        if (thresholds.minAmount) {
            session.privacy[prefix + 'MinAmount'] = thresholds.minAmount;
        } else {
            session.privacy[prefix + 'MinAmount'] = 0;
        }
        if (thresholds.maxAmount) {
            session.privacy[prefix + 'MaxAmount'] = thresholds.maxAmount;
        } else {
            session.privacy[prefix + 'MaxAmount'] = 0;
        }
        session.privacy[prefix + 'mpid'] = thresholds.mpid || '';
    },
    checkThreshold: function (price) {
        if (price && price.value) {
            result = this.getThresholdResult(price.value);
        }
        return result;
    },
    checkPriceThreshold: function (price) {
        if (price) {
            result = this.getThresholdResult(price);
        }
        return result;
    },
    getThresholdResult: function (price) {
        result.status = false;

        if (price) {
            var threshold = this.getThresholdAmounts();
            var isApplicable = brandUtilities.isAfterpayApplicable();
            if (isApplicable) {
                result.minThresholdAmount = threshold.minAmount;
                result.maxThresholdAmount = threshold.maxAmount;
                result.mpid = threshold.mpid;

                if (price >= threshold.minAmount && price <= threshold.maxAmount) {
                    result.status = true;
                }
            }
        }

        return result;
    }
};

module.exports = thresholdUtilities;
