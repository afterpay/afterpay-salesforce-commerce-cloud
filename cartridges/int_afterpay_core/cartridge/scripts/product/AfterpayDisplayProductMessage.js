
var Money = require("dw/value/Money");
var Web = require("dw/web/Resource");
var URLUtils = require("dw/web/URLUtils");
var AfterpayUtilities = require("~/cartridge/scripts/util/AfterpayUtilities.js");
var threshold = require("~/cartridge/scripts/util/ThresholdUtilities.js").getThreshold();

var AfterpayDisplayProductMessage = {
    getMessage : function (isPDPPage, price : dw.value.Money) {
        if (empty(isPDPPage) || empty(price) || !(price instanceof dw.value.Money)) {
            return null;
        }

        if (isDisplayMessage(isPDPPage)) {
            return getMessage(price);
        }
    },

    getPDPMessage : function (price : dw.value.Money) {
        return this.getMessage(true, price);
    },

    getPLPMessage : function (price : dw.value.Money) {
        return this.getMessage(false, price);
    },
    
    getThresholdRange : function (price : dw.value.Money) {
    	
    	if(price < threshold.minAmount)
		{
			return {
				belowThreshold : true,
				minAmount : threshold.minAmount,
				maxAmount : threshold.maxAmount
			};
		}
		else if(price >= threshold.minAmount && price <= threshold.maxAmount){
			return {
				withInThreshold : true
			};
		}
		else if(price > threshold.maxAmount){
			return {
				aboveThreshold : true,
				minAmount : threshold.minAmount,
				maxAmount : threshold.maxAmount
			};
		}
	}
};

var isDisplayMessage = function (isPDPPage : Boolean) {

    var sitePreferenceUtilities = AfterpayUtilities.getSitePreferencesUtilities();
    var displayPreference = null;

    displayPreference = isPDPPage ? sitePreferenceUtilities.isDisplayPdpInfo() : sitePreferenceUtilities.isDisplayPlpInfo();

    return !empty(displayPreference) ? displayPreference : false;
};

var getMessage = function (price : dw.value.Money) {
    var price4 = getPrice(price);
	var calculatedPrice = dw.util.StringUtils.formatMoney(price4)
	return calculatedPrice;
};

var getPrice = function (price : dw.value.Money) {
    return new dw.value.Money(Math.ceil(price.divide(4).value * 100) / 100, price.getCurrencyCode());
};


var isThresholdAmountApplicable = function (price : dw.value.Money) {
	var isApplicable = false;
	
	if(threshold.isRangeAvailable && price.value >= threshold.minAmount && price.value <= threshold.maxAmount){
		isApplicable = true;
	}
	
	return isApplicable;
};

module.exports = AfterpayDisplayProductMessage;