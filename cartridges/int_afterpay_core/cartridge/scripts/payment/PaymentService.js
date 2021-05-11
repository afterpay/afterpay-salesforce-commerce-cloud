importPackage(dw.io);
importPackage(dw.net);
importPackage(dw.object);
importPackage(dw.svc);
importPackage(dw.system);
importPackage(dw.util);
importPackage(dw.web);

var AfterpayApiContext = require("~/cartridge/scripts/context/AfterpayApiContext");
var AfterpayHttpService = require("~/cartridge/scripts/logic/services/AfterpayHttpService.ds");
var sitePreferences = require("~/cartridge/scripts/util/AfterpayUtilities.js").getSitePreferencesUtilities();
var ctrlCartridgeName = sitePreferences.getControllerCartridgeName();
var Class 		= require(ctrlCartridgeName + '/cartridge/scripts/util/Class').Class;

var PaymentService = Class.extend({

	 _requestUrl : null,

	init : function() {
        this.afterpayHttpService = new AfterpayHttpService();
        this.afterpayApiContext = new AfterpayApiContext();
    },

    generateRequest : function(token: String, paymentID : String) {
    	var param = !empty(token) ? "token:" + token : paymentID;	
        this._requestUrl = StringUtils.format(this.afterpayApiContext.getFlowApiUrls().get("getPayment"), param);
    },

    getResponse : function () {
        var response = this.afterpayHttpService.call(this._requestUrl, "GET_PAYMENT", { requestMethod: 'GET' });
        return response;
    }
});


module.exports = new PaymentService();