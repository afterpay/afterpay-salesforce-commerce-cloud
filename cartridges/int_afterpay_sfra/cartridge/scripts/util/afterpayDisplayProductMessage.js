 
var Money = require("dw/value/Money");
var Web = require("dw/web/Resource");
var URLUtils = require("dw/web/URLUtils");
var AfterpayUtilities = require("~/cartridge/scripts/util/AfterpayUtilities.js");
var threshold = require("~/cartridge/scripts/util/ThresholdUtilities.js").getThreshold();

const sourcePage = {
	PDP: 0,
	PLP: 1,
	CART: 2,
	CHECKOUT: 3
};

var AfterpayDisplayProductMessage = {
    getMessage : function (sourcepage, price : dw.value.Money) {
        if (empty(sourcepage) || empty(price)) {
            return null;
        }

        if (isDisplayMessage(sourcepage)) {
            return getMessage(price);
        }
    },

    getPDPMessage : function (price : dw.value.Money) {
        return this.getMessage(sourcePage.PDP, Number(price));
    },

    getPLPMessage : function (price : dw.value.Money) {
        return this.getMessage(sourcePage.PLP, Number(price));
    },
    
	getCartMessage: function (price: dw.value.Money) {
		return this.getMessage(sourcePage.CART, Number(price));
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

var isDisplayMessage = function (sourcepage) {

    var sitePreferenceUtilities = AfterpayUtilities.getSitePreferencesUtilities();
    var displayPreference = null;

	if (sourcepage === sourcePage.PDP && sitePreferenceUtilities.isDisplayPdpInfo()) {
		displayPreference = true;
	}
	else if (sourcepage === sourcePage.PLP && sitePreferenceUtilities.isDisplayPlpInfo()) {
		displayPreference = true;
	}
	else if (sourcepage === sourcePage.CART || sourcepage === sourcePage.CHECKOUT) {
		// for cart and checkout, just set to true
		displayPreference = true;
	}

    return !empty(displayPreference) ? displayPreference : false;
};

var getMessage = function (price : dw.value.Money) {
    var price4 = getPrice(price);
	var calculatedPrice = dw.util.StringUtils.formatMoney(price4);
	return calculatedPrice;
};

var getPrice = function (price : dw.value.Money) {
    return new dw.value.Money(Math.round((price / 4) * 100) / 100, dw.system.Site.getCurrent().getDefaultCurrency());
};


var isThresholdAmountApplicable = function (price : dw.value.Money) {
	var isApplicable = false;
	
	if(threshold.isRangeAvailable && price >= threshold.minAmount && price <= threshold.maxAmount){
		isApplicable = true;
	}
	
	return isApplicable;
};

module.exports = AfterpayDisplayProductMessage;