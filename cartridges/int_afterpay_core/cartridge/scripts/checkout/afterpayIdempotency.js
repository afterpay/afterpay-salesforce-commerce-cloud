/* global empty */

var Site = require('dw/system/Site');

var LogUtils = require('*/cartridge/scripts/util/afterpayLogUtils');
var Logger = LogUtils.getLogger('AfterpayIdempotency');

/**
 * checks the current timestamp against initial timestamp
 * @param {number} milliseconds - milliseconds
 */
function sleep(milliseconds) {
    var ms = milliseconds * 1000;
    var initialTimestamp = new Date().getTime();
    var checkTimestamp = true;
    var presentTimestamp;

    while (checkTimestamp) {
        presentTimestamp = new Date().getTime();

        if (presentTimestamp - initialTimestamp > ms) {
            checkTimestamp = false;
        }
    }
}

/**
 * Delays the payment retry by 5 secs.
 * @param {Object} Order - Order
 * @param {string} initialStatus - initial status
 * @returns {string} paymentStatus - payment status
 *
 */
function delayPayment(Order, initialStatus) {
    var paymentStatus;

    if (empty(Order) || empty(initialStatus)) {
        Logger.error('Either of the Parameters provided -Order or Paymentstatus or finalPaymentStatus is empty');
        return { error: true };
    }

    for (var i = 0; i < 4; i++) {
        Logger.debug('Payment retry Execution count ' + i + ' -and intial payment status: ' + initialStatus);
        Logger.debug('Before time delay : ' + new Date());

        sleep(Site.getCurrent().getCustomPreferenceValue('apDelayRetry'));
        Logger.debug('After 5 secs time delay : ' + new Date());
        paymentStatus = require('*/cartridge/scripts/checkout/afterpayHandlePaymentOrder').getPaymentStatus(Order, initialStatus);

        if (paymentStatus === 'APPROVED') {
            break;
        }

        Logger.debug('Final Payment Status : ' + paymentStatus);
    }

    return paymentStatus;
}

/*
 * Module exports
 */
module.exports = {
    delayPayment: function (Order, initialStatus) {
        return delayPayment(Order, initialStatus);
    }
};
