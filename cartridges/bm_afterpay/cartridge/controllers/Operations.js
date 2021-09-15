'use strict';
/* global request */

/**
 * redirects to specific actions
 * */
function performAction() {
    var action = request.httpParameterMap.action.value;
    var orderNo = request.httpParameterMap.orderno.value;
    var amount = request.httpParameterMap.amount.value;
    var transActions = require('*/cartridge/scripts/transActions');
    var result;

    switch (action) {
        case 'refund':
            result = transActions.refund(orderNo, amount);
            break;
        default:
            result = { status: false, error: true };
    }

    var r = require('~/cartridge/scripts/util/response');
    r.renderJSON(result);

    return;
}

/*
 * Exposed web methods
 */
performAction.public = true;

exports.Action = performAction;
