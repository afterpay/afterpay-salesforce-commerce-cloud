/**
 *  definitions of  payment status
 */
var PAYMENT_STATUS = {
    APPROVED: 'APPROVED',
    DECLINED: 'DECLINED',
    FAILED: 'FAILED',
    PENDING: 'PENDING',
    SUCCESS: 'SUCCESS',
    UNKNOWN: 'Payment was Declined by Afterpay'
};

/**
 *  definitions of  payment modes
 */
var PAYMENT_MODE = {
    PAYMENT_METHOD: 'AFTERPAY_PBI',
    DIRECT_CAPTURE: 'DIRECT_CAPTURE',
    AUTHORISE: 'AUTHORISE'
};

/**
 *  definitions of  configuration type
 */
var CONFIGURATION_TYPE = {
    PAY_BY_INSTALLMENT: 'PAY_BY_INSTALLMENT'
};

module.exports.PAYMENT_STATUS = PAYMENT_STATUS;
module.exports.PAYMENT_MODE = PAYMENT_MODE;
module.exports.CONFIGURATION_TYPE = CONFIGURATION_TYPE;
