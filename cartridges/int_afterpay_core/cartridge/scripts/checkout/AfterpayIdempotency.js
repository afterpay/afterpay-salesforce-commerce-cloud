'use strict';
/* global empty */
var Site = require('dw/system/Site');

var LogUtils = require('*/cartridge/scripts/util/afterpayLogUtils');
var Logger = LogUtils.getLogger('afterpayIdempotency');

/**
* checks the current timestamp against initial timestamp
* @param {number} milliseconds - timestamp
*/
function sleep(milliseconds) {
    var adjustedMilliseconds = milliseconds * 1000;
    var initialTimestamp = new Date().getTime();
    var checkTimestamp;
    var presentTimestamp;

    checkTimestamp = true;
    while (checkTimestamp) {
        presentTimestamp = new Date().getTime();
        if (presentTimestamp - initialTimestamp > adjustedMilliseconds) {
            checkTimestamp = false;
        }
    }
}

/**
* Delays the payment retry by 5 secs.
* @param {Object} Order - order
* @param {number} initialStatus - initial status
* @returns {number} - payment status
*/
function delayPayment(Order, initialStatus, expressCheckoutModel) {
    var paymentStatus;
    if (empty(Order) || empty(initialStatus)) {
        Logger.error('Either of the Parameters provided -Order or Paymentstatus or finalPaymentStatus is empty');
        return { error: true };
    }
    for (var i = 0; i < 4; i++) {
        Logger.debug('Payment retry Execution count ' + i + ' -and intial payment status :' + initialStatus);
        Logger.debug('Before time delay : ' + new Date());
        sleep(Site.getCurrent().getCustomPreferenceValue('apDelayRetry'));
        Logger.debug('After 5 secs time delay : ' + new Date());
        paymentStatus = require('*/cartridge/scripts/checkout/afterpayHandlePaymentOrder').getPaymentStatus(Order, initialStatus, expressCheckoutModel);
        if (paymentStatus === 'APPROVED') {
            break;
        }
        Logger.debug('Final Payment Status : ' + paymentStatus);
    }
    return paymentStatus;
}

module.exports.delayPayment = delayPayment;
