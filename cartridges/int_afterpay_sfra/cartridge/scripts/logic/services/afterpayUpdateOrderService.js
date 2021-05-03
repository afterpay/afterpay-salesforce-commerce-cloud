'use strict';
var paymentService = require('*/cartridge/scripts/payment/paymentService');
var afterpayDirectCaptureService = require('*/cartridge/scripts/logic/services/afterpayDirectCapturePaymentService');
var afterpayAuthoriseService = require('*/cartridge/scripts/logic/services/afterpayAuthorisePaymentService');
var afterpaySitePreferencesUtilities = require('*/cartridge/scripts/util/afterpayUtilities');
var PAYMENT_MODE = require('*/cartridge/scripts/util/afterpayConstants').PAYMENT_MODE;
var PAYMENT_STATUS = require('*/cartridge/scripts/util/afterpayConstants').PAYMENT_STATUS;

var Site = require('dw/system/Site');
var Resource = require('dw/web/Resource');
var Order = require('dw/order/Order');
var Transaction = require('dw/system/Transaction');
var OrderMgr = require('dw/order/OrderMgr');

/**
 *  processes all the transaction details related to the payment and order
 */
var UpdateOrderService = {
    handleOrder: function (order, paymentStatus) {
        var authoriseDirectCaptureResult = null;
        if (paymentStatus === PAYMENT_STATUS.DECLINED) {
            authoriseDirectCaptureResult = this.updateDeclinedOrder(order);
        } else if (paymentStatus === PAYMENT_STATUS.FAILED) {
            authoriseDirectCaptureResult = this.updateFailedOrder(order);
        } else if (paymentStatus === PAYMENT_STATUS.APPROVED) {
            authoriseDirectCaptureResult = this.handleApprovalOrder(order);
        } else if (paymentStatus === PAYMENT_STATUS.PENDING) {
            authoriseDirectCaptureResult = this.handlePendingOrder(order);
        }
        return authoriseDirectCaptureResult;
    },

    handleApprovalOrder: function (order) {
        var authoriseDirectCaptureResult = null;
        var authoriseDirectCaptureService = this.getAuthoriseDirectCaptureService(order);
        var requestValues = authoriseDirectCaptureService.generateRequest(this.getToken(order), order.orderNo);
        try {
            authoriseDirectCaptureResult = authoriseDirectCaptureService.getResponse(requestValues.requestUrl, requestValues.requestBody);
        } catch (e) {
            if (e.httpStatusCode === 402) {
                authoriseDirectCaptureResult = { status: PAYMENT_STATUS.DECLINED };
            } else {
                throw e;
            }
        }
        this.updateStatusOrder(order, authoriseDirectCaptureResult);
        return authoriseDirectCaptureResult;
    },

    getAuthoriseDirectCaptureService: function (order) {
        var paymentMode = afterpaySitePreferencesUtilities.checkoutUtilities.getPaymentMode(order);
        if (paymentMode === PAYMENT_MODE.AUTHORISE) {
            return afterpayAuthoriseService;
        }
        return afterpayDirectCaptureService;
    },

    loadPaymentResult: function (order) {
        var paymentID = this.getPaymentID(order);
        var paymentResult = null;
        if (paymentID) {
            var requestUrl = paymentService.generateRequest(null, order.orderNo);
            paymentResult = paymentService.getResponse(requestUrl);
        }
        return paymentResult;
    },

    getPaymentID: function (order) {
        var apPaymentID;
        for (var i = 0; i < order.paymentInstruments.length; i += 1) {
            var paymentInstrument = order.paymentInstruments[i];

            if (paymentInstrument.paymentMethod.equals(PAYMENT_MODE.PAYMENT_METHOD)) {
                var paymentTransaction = paymentInstrument.paymentTransaction;
                apPaymentID = paymentTransaction.custom.apPaymentID;
                break;
            }
        }
        return apPaymentID;
    },

    getToken: function (order) {
        var apToken;
        for (var i = 0; i < order.paymentInstruments.length; i += 1) {
            var paymentInstrument = order.paymentInstruments[i];

            if (paymentInstrument.paymentMethod.equals(PAYMENT_MODE.PAYMENT_METHOD)) {
                var paymentTransaction = paymentInstrument.paymentTransaction;
                apToken = paymentTransaction.custom.apToken;
                break;
            }
        }
        return apToken;
    },

    updateOrder: function (order, status) {
        Transaction.begin();
        order.setStatus(status);
        Transaction.commit();
    },

    updateDeclinedOrder: function (order) {
        this.updateOrder(order, Order.ORDER_STATUS_CANCELLED);
    },

    updateFailedOrder: function (order) {
        this.updateOrder(order, Order.ORDER_STATUS_FAILED);
    },

    updateApprovedOrder: function (order) {
        Transaction.begin();
        order.setPaymentStatus(Order.PAYMENT_STATUS_PAID);
        Transaction.commit();
        this.sendConfirmationEmail(order);
    },

    updateStatusOrder: function (order, authoriseDirectCaptureResult) {
        if (authoriseDirectCaptureResult) {
            if (authoriseDirectCaptureResult.status === PAYMENT_STATUS.DECLINED) {
                this.updateDeclinedOrder(order);
            } else if (authoriseDirectCaptureResult.status === PAYMENT_STATUS.FAILED) {
                this.updateFailedOrder(order);
            } else if (authoriseDirectCaptureResult.status === PAYMENT_STATUS.APPROVED) {
                this.updateApprovedOrder(order);
            } else if (authoriseDirectCaptureResult.status === PAYMENT_STATUS.PENDING) {
                this.updatePendingOrder(order);
            }
        }
    },

    _getOrdersNotPaid: function () {
        var sortString = 'creationDate DESC';
        var queryString = 'paymentStatus = {0} AND custom.apIsAfterpayOrder = true';
        return OrderMgr.searchOrders(queryString, sortString, Order.PAYMENT_STATUS_NOTPAID);
    },

    sendConfirmationEmail: function (order) {
        var OrderModel = require('*/cartridge/models/order');
        var emailHelpers = require('*/cartridge/scripts/helpers/emailHelpers');

        var orderModel = new OrderModel(order, { countryCode: order.getBillingAddress().getCountryCode().value });

        var orderObject = { order: orderModel };

        var emailObj = {
            to: order.customerEmail,
            subject: Resource.msg('subject.order.confirmation.email', 'order', null),
            from: Site.current.getCustomPreferenceValue('customerServiceEmail') || 'no-reply@salesforce.com',
            type: emailHelpers.emailTypes.orderConfirmation
        };

        emailHelpers.sendEmail(emailObj, 'checkout/confirmation/confirmationEmail', orderObject);
    }
};

module.exports = UpdateOrderService;
