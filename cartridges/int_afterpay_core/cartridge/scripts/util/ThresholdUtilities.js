/* global session */
var PaymentMgr = require('dw/order/PaymentMgr');

var configurationService = require('*/cartridge/scripts/logic/services/afterpayConfigurationService');
var LogUtils = require('*/cartridge/scripts/util/afterpayLogUtils');
var Logger = LogUtils.getLogger('thresholdUtilities');
var { brandUtilities, checkoutUtilities } = require('*/cartridge/scripts/util/afterpayUtilities');
var afterpayBrand = BrandUtilities.getBrand();
var countryCode = BrandUtilities.getCountryCode();
var result = {
    status: false
};

/**
 * @abstract
 * @description set threshold in session based either on the configuration or from API response
 */
var thresholdUtilities = {
    // eslint-disable-next-line no-unused-vars
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
    getThresholdAmounts: function (afterpayBrand) {
        var prefix = request.getLocale() + afterpayBrand.toUpperCase();
        var result = {
            minAmount: session.privacy[prefix + 'MinAmount'],
            maxAmount: session.privacy[prefix + 'MaxAmount']
        };

        var thresholdResponse;

        if (empty(result.minAmount) || empty(result.maxAmount)) {
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

            result = this.parseConfigurationResponse(thresholdResponse);
        }

        return result;
    },
    saveThresholds: function (afterpayBrand, thresholds) {
        var prefix = request.getLocale() + afterpayBrand.toUpperCase();
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
            result =  this.getThresholdResult(price.value);
        }
        return result;
    },
    checkPriceThreshold: function (price) {
        if (afterpayBrand && price) {
            result =  this.getThresholdResult(price);
        }
        return result;
    },
    getThresholdResult: function(price) {
        if (price) {
            var threshold = this.getThresholdAmounts(afterpayBrand);
            this.saveThresholds(afterpayBrand, threshold);
            var paymentMethodName = checkoutUtilities.getPaymentMethodName();
            var paymentMethod;
            var isApplicable;

            if (paymentMethodName) {
                paymentMethod = PaymentMgr.getPaymentMethod(paymentMethodName);
                isApplicable = paymentMethod.isApplicable(session.customer, countryCode, price);

                result.status = isApplicable;

                if (isApplicable) {
                    result.belowThreshold = price.value <= threshold.minAmount;
                    result.aboveThreshold = price.value >= threshold.maxAmount;
                    result.minThresholdAmount = threshold.minAmount;
                    result.maxThresholdAmount = threshold.maxAmount;
                }
            }
        }

        return result;
    }
};

module.exports = thresholdUtilities;
