'use strict';
var assert = require('chai').assert;
var expect = require('chai').expect;
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();
var sinon = require('sinon');
const OrderMgr = require('../../../../mocks/dw/order/OrderMgr');
var OrderMock = require('../../../../mocks/models/order');
var dwOrder = require('../../../../mocks/dw/order/Order');

var order = new OrderMock();

var Order = new dwOrder();
Order = {
    setPaymentStatus: function (paymentStatus) {
        
    },
    getPaymentInstruments: function (paymentMethod) {
        return [
            {
                getPaymentTransaction: function () {
                    return {
                        transactionID: '11148651345',
                        amount: {value: 100},
                        custom: {
                            apInitialStatus: "approved",
                            apToken: "012abcdef232"
                        }
                    }
                }
            }
        ]
    }
};

var transaction = {
    wrap: function (callBack) {
        return callBack.call();
    },
    begin: function () {
    },
    commit: function () {
    }
};

var customLogger = {
    getLogger: function () {
        return Logger;
    }
};

var statusMock = {};

var Logger = {
    debug: function () {
    },
    error: function () {
    }
};

var afterpayUtilities = {
    checkoutUtilities: {
        getPaymentMethodName: function () {
            return 'AFTERPAY';
        }
    }
};

var apSession = {
    isValid: function () {
        return true;
    },
    getToken: function () {
        return 'M2QwZTQxZDJmOTYyMjc';
    },
    clearSession: function () {
    },

}

var ecPaymentHelpers = {
    createExpressCheckoutModelFromOrderAndSession: function () {
        var expressCheckoutModelObject = {
            apExpressCheckout: false,
            apExpressCheckoutChecksum: '',
            apTempShippingAddressChanged: false,
            apTempBasketItemsChanged: false,
            apTempCheckoutAmountChanged: null
        };
        return expressCheckoutModelObject;
    }
}

beforeEach(function () {
    if (Logger.debug.restore) {
        Logger.debug.restore();
    }
});

describe('updatePaymentStatus', function () {

    describe('#handlePaymentStatus', function () {

        var updatePaymentStatus = proxyquire('../../../../../cartridges/int_afterpay_sfra/cartridge/scripts/checkout/updatePaymentStatus.js', {
            'dw/system/Transaction': transaction,
            'dw/order/Order': Order,
            'dw/order/OrderMgr': OrderMgr,
            'dw/system/Status': statusMock,
            '*/cartridge/scripts/util/afterpaySession': apSession,
            'dw/web/Resource': {
                msg: function () {
                    return 'someString';
                }
            },
            '*/cartridge/scripts/util/afterpayLogUtils': customLogger,
            '*/cartridge/scripts/util/afterpayUtilities': afterpayUtilities,
            '*/cartridge/scripts/payment/expressCheckoutPaymentHelpers': ecPaymentHelpers,
            '*/cartridge/scripts/checkout/afterpayHandlePaymentOrder': {
                getPaymentStatus: function () {
                    return {
                        finalPaymentStatus: 'some status'
                    };
                }
            },
            '*/cartridge/scripts/checkout/afterpayIdempotency': {
                DelayPayment: function () {
                    return {
                        paymentStatus: 'some status'
                    };
                }
            }
        });
        Order.ORDER_STATUS_CREATED = 0;
        order.orderNo = '1234567';
        order.status = {};

        order = {
            paymentInstruments: [
                {
                    paymentMethod: {
                        equals: function (value) {
                            return value === 'AFTERPAY';
                        },
                        value: 'AFTERPAY'
                    },
                    paymentTransaction: {
                        transactionID: '11148651345',
                        amount: {value: 100},
                        custom: {
                            apInitialStatus: "approved"
                        }
                    }
                }
            ],
            getPaymentInstruments: function (paymentMethod) {
                return [
                    {
                        getPaymentTransaction: function () {
                            return {
                                transactionID: '11148651345',
                                amount: {value: 100},
                                custom: {
                                    apInitialStatus: "approved",
                                    apToken: "012abcdef232"
                                }
                            }
                        }
                    }
                ]
            }
        };
        
        it('when service is unavailable', function () {
            var result = updatePaymentStatus.handlePaymentStatus(order);
            expect(result).to.be.object;
        });
    });
});

