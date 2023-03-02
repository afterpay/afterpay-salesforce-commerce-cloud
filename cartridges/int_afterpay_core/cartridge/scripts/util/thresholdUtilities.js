'use strict';

var configurationService = require('*/cartridge/scripts/logic/services/afterpayConfigurationService');
var LogUtils = require('*/cartridge/scripts/util/afterpayLogUtils');
var Logger = LogUtils.getLogger('thresholdUtilities');
var brandUtilities = require('*/cartridge/scripts/util/afterpayUtilities').brandUtilities;
var afterpayBrand = brandUtilities.getBrand();
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
            maxAmount: 0
        };

        if (thresholdResponse) {
            var minThresholdObj = thresholdResponse.minimumAmount;
            var maxThresholdObj = thresholdResponse.maximumAmount;

            if (minThresholdObj) {
                configuration.minAmount = parseFloat(minThresholdObj.amount, 10);
            }

            if (maxThresholdObj) {
                configuration.maxAmount = parseFloat(maxThresholdObj.amount, 10);
            }
        }

        return configuration;
    },
    getThresholdAmounts: function (brand) {
        var prefix = request.getLocale() + brand.toUpperCase();
        var thresholdResult = {
            minAmount: session.privacy[prefix + 'MinAmount'],
            maxAmount: session.privacy[prefix + 'MaxAmount']
        };

        var thresholdResponse;

        if (empty(thresholdResult.minAmount) || empty(thresholdResult.maxAmount)) {
            configurationService.generateRequest();
            try {
                thresholdResponse = configurationService.getResponse();
                Logger.debug('service response to get the threshold amount :' + JSON.stringify(thresholdResponse));
            } catch (e) {
                Logger.debug('Exception occured to set the threshold amount in session :' + e);

                return {
                    error: true
                };
            }

            thresholdResult = this.parseConfigurationResponse(thresholdResponse);
        }

        return thresholdResult;
    },
    saveThresholds: function (brand, thresholds) {
        var prefix = request.getLocale() + brand.toUpperCase();
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
    },
    checkThreshold: function (price) {
        if (afterpayBrand && (price && price.value)) {
            result = this.getThresholdResult(price.value);
        }
        return result;
    },
    checkPriceThreshold: function (price) {
        if (afterpayBrand && price) {
            result = this.getThresholdResult(price);
        }
        return result;
    },
    getThresholdResult: function (price) {
        result.status = false;

        if (price) {
            var threshold = this.getThresholdAmounts(afterpayBrand);
            this.saveThresholds(afterpayBrand, threshold);
            var isApplicable = brandUtilities.isAfterpayApplicable();
            if (isApplicable) {
                result.belowThreshold = price <= threshold.minAmount;
                result.aboveThreshold = price >= threshold.maxAmount;
                result.minThresholdAmount = threshold.minAmount;
                result.maxThresholdAmount = threshold.maxAmount;

                if (price >= threshold.minAmount && price <= threshold.maxAmount) {
                    result.status = true;
                }
            }
        }

        return result;
    }
};

module.exports = thresholdUtilities;
