/* eslint no-underscore-dangle: 0 */
/* global empty */
var PaymentService = require('*/cartridge/scripts/payment/paymentService');
var AfterpayDirectCaptureService = require('*/cartridge/scripts/logic/services/afterpayDirectCapturePaymentService.js');
var AfterpayAuthoriseService = require('*/cartridge/scripts/logic/services/afterpayAuthorisePaymentService.js');
var AfterpaySitePreferencesUtilities = require('*/cartridge/scripts/util/afterpayUtilities').getSitePreferencesUtilities();
var Class = require('*/cartridge/scripts/util/class').Class;
var PAYMENT_MODE = require('*/cartridge/scripts/util/afterpayConstants.js').PAYMENT_MODE;
var PAYMENT_STATUS = require('*/cartridge/scripts/util/afterpayConstants.js').PAYMENT_STATUS;
var AfterpayUtilities = require('*/cartridge/scripts/util/afterpayUtilities.js').getAfterpayCheckoutUtilities();
var Transaction = require('dw/system/Transaction');
var LogUtils = require('*/cartridge/scripts/util/afterpayLogUtils');

var Template = require('dw/util/Template');
var Resource = require('dw/web/Resource');
var Mail = require('dw/net/Mail');
var Site = require('dw/system/Site');
var HashMap = require('dw/util/HashMap');
var Order = require('dw/order/Order');
var OrderMgr = require('dw/order/OrderMgr');

/**
 *  processes all the transaction details related to the payment and order
 */
var UpdateOrderService = Class.extend({
    _logger: null,

    init: function () {
        this.paymentService = PaymentService;
        this.afterpaySitePreferencesUtilities = AfterpaySitePreferencesUtilities;
        this.arterpayDirectCaptureService = AfterpayDirectCaptureService;
        this.afterpayAuthoriseService = AfterpayAuthoriseService;
        this._logger = LogUtils.getLogger('RequestTrace');
    },

    checkPaymentStatus: function () {
        var orders = this._getOrdersNotPaid();

        if (orders.count === 0) {
            return false;
        }

        while (orders.hasNext()) {
            var order = orders.next();

            try {
                var paymentResult = this.loadPaymentResult(order);
                if (!empty(paymentResult)) {
                    this.handleOrder(order, paymentResult.status);
                }
            } catch (exception) {
                this._logger.error('Error when update the order ID: {0}. Exception Details:\n{1}', order.orderNo, exception);
            }
        }

        orders.close();

        return true;
    },

    handleOrder: function (order, paymentStatus) {
        if (paymentStatus === PAYMENT_STATUS.DECLINED) {
            this.updateDeclinedOrder(order);
        } else if (paymentStatus === PAYMENT_STATUS.FAILED) {
            this.updateFailedOrder(order);
        } else if (paymentStatus === PAYMENT_STATUS.APPROVED) {
            this.handleApprovalOrder(order);
        } else if (paymentStatus === PAYMENT_STATUS.PENDING) {
            this.handlePendingOrder(order);
        }
    },

    handleApprovalOrder: function (order) {
        var authoriseDirectCaptureResult = null;

        var authoriseDirectCaptureService = this.getAuthoriseDirectCaptureService(order);
        authoriseDirectCaptureService.generateRequest(this.getToken(order), order.orderNo);

        try {
            authoriseDirectCaptureResult = authoriseDirectCaptureService.getResponse();
        } catch (e) {
            if (e.httpStatusCode === 402) {
                authoriseDirectCaptureResult = { status: PAYMENT_STATUS.DECLINED };
            } else {
                throw e;
            }
        }
        this.updateStatusOrder(order, authoriseDirectCaptureResult);
    },

    getAuthoriseDirectCaptureService: function (order) {
        var paymentMode = AfterpayUtilities.getPaymentMode(order);

        if (paymentMode === PAYMENT_MODE.AUTHORISE) {
            return this.afterpayAuthoriseService;
        }

        return this.arterpayDirectCaptureService;
    },

    handlePendingOrder: function () {
        // Do nothing
    },

    loadPaymentResult: function (order) {
        var paymentID = this.getPaymentID(order);
        var paymentResult = null;

        if (!empty(paymentID)) {
            this.paymentService.generateRequest(null, paymentID);
            paymentResult = this.paymentService.getResponse();
        }
        return paymentResult;
    },

    getPaymentID: function (order) {
        return order.getPaymentInstruments(PAYMENT_MODE.PAYMENT_METHOD)[0].getPaymentTransaction().custom.apPaymentID;
    },

    getToken: function (order) {
        return order.getPaymentInstruments(PAYMENT_MODE.PAYMENT_METHOD)[0].getPaymentTransaction().custom.apToken;
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
        this._sendOrderConfirmationMail(order);
    },

    updatePendingOrder: function () {
        // Do nothing
    },

    updateStatusOrder: function (order, authoriseDirectCaptureResult) {
        if (!empty(authoriseDirectCaptureResult)) {
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

    _sendOrderConfirmationMail: function (order) {
        var mailSubject = Resource.msg('order.orderconfirmation-email.001', 'order', null) + ' ' + order.orderNo;

        var template = new Template('mail/orderconfirmationjobschedure.isml');
        var map = new HashMap();

        map.put('MailSubject', mailSubject);
        map.put('Order', order);
        var content = template.render(map);

        var mail = new Mail();
        mail.addTo(order.customerEmail);
        mail.setFrom(Site.getCurrent().getCustomPreferenceValue('customerServiceEmail'));
        mail.setSubject(mailSubject);
        mail.setContent(content);
        mail.send();
    },

    _sendDeclinedMail: function () {}
});

module.exports = UpdateOrderService;
