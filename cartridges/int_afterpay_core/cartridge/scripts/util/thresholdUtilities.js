var Transaction = require('dw/system/Transaction');

var AfterpaySitePreferencesUtilities = require('~/cartridge/scripts/util/AfterpayUtilities').getSitePreferencesUtilities();
var configurationService = require('~/cartridge/scripts/logic/services/AfterpayConfigurationService');
var LogUtils = require('~/cartridge/scripts/util/LogUtils');
var Logger = LogUtils.getLogger('ThresholdUtilities');

var ThresholdUtilities = {
  setThresholdInSession: function() {
    var minThresholdAmount = AfterpaySitePreferencesUtilities.getMinThresholdAmount();
    var maxThresholdAmount = AfterpaySitePreferencesUtilities.getMaxThresholdAmount();
    if (
      minThresholdAmount != null &&
      maxThresholdAmount != null &&
      minThresholdAmount - maxThresholdAmount != 0.0
    ) {
      Transaction.begin();
      session.custom.afterPayIsRangeAvailable = true;
      session.custom.afterPayMinAmount = minThresholdAmount;
      session.custom.afterPayMaxAmount = maxThresholdAmount;
      Transaction.commit();
    } else {
      configurationService.init();
      configurationService.generateRequest();
      var thresholdResponse;
      try {
        thresholdResponse = configurationService.getResponse();
        Logger.debug(
          'service response to get the threshold amount :' +
            JSON.stringify(thresholdResponse)
        );
      } catch (e) {
        Logger.debug(
          'Exception occured to set the threshold amount in session :' + e
        );
        return {
          error: true,
        };
      }

      if (
        thresholdResponse &&
        parseFloat(thresholdResponse.minimumAmount.amount, 10) -
          parseFloat(thresholdResponse.maximumAmount.amount, 10) !=
          0.0
      ) {
        Transaction.begin();
        session.custom.afterPayIsRangeAvailable = true;
        session.custom.afterPayMinAmount = parseFloat(
          thresholdResponse.minimumAmount.amount,
          10
        );
        session.custom.afterPayMaxAmount = parseFloat(
          thresholdResponse.maximumAmount.amount,
          10
        );
        Transaction.commit();
      }
    }
  },
  getThreshold: function() {
    return {
      isRangeAvailable: session.custom.afterPayIsRangeAvailable || false,
      minAmount: session.custom.afterPayMinAmount || 0.0,
      maxAmount: session.custom.afterPayMaxAmount || 0.0,
    };
  },
};

module.exports = ThresholdUtilities;
