'use strict';

/**
 * Controller for AfterPay payment
 *
 */

var LogUtils = require('~/cartridge/scripts/util/LogUtils');
var log = LogUtils.getLogger("Operations");

/**
 * redirects to specific actions
 * */
function performAction(){
	var action = request.httpParameterMap.action.value,
		orderNo = request.httpParameterMap.orderno.value,
		amount = request.httpParameterMap.amount.value,
		bulkCompleteArray = request.httpParameterMap.bulkComplete.value,
		transActions = require("~/cartridge/scripts/TransActions"),
		result;
	
	switch(action){
		case "refund":
			result = transActions.refund(orderNo, amount);
			break;
	}
	
	response.getWriter().println(JSON.stringify(result));
}

/*
 * Exposed web methods
 */
performAction.public = true;

exports.Action = performAction;
