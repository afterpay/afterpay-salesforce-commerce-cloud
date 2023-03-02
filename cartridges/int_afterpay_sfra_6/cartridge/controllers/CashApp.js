'use strict';

var server = require('server');
var parsePrice = require('~/cartridge/scripts/util/parsePriceAfterpay.js');
var URLUtils = require('dw/web/URLUtils');
var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
var AfterpayCOHelpers = require('*/cartridge/scripts/checkout/afterpayCheckoutHelpers');
var AfterpayRefArchCOHelpers = require('~/cartridge/scripts/checkout/afterpayRefArchCheckoutHelpers');
var Resource = require('dw/web/Resource');
var AfterpaySession = require('*/cartridge/scripts/util/afterpaySession');
var ValidationHelpers = require('*/cartridge/scripts/helpers/basketValidationHelpers');
var BasketMgr = require('dw/order/BasketMgr');
var OrderMgr = require('dw/order/OrderMgr');
var Money = require('dw/value/Money');
var Transaction = require('dw/system/Transaction');
var apCheckoutUtilities = require('*/cartridge/scripts/util/afterpayUtilities').checkoutUtilities;
var apBrandUtilities = require('*/cartridge/scripts/util/afterpayUtilities').brandUtilities;
var thresholdUtilities = require('*/cartridge/scripts/util/thresholdUtilities');
var paymentMethodName = apCheckoutUtilities.getPaymentMethodName(true);

/**
 * on error redirects to the cart page
 * @param {Object} res - response
 * @param {Object} next - next
 * @param {Object} err - error
 * @returns {Object} - next
 */
function returnJsonError(res, next, err) {
    res.json({
        status: 'FAILURE',
        error: err,
        redirectUrl: URLUtils.url('Cart-Show').toString()
    });
    return next();
}

server.get('redirectToErrorDisplay', server.middleware.https, function (req, res, next) {
    var errorMessage = req.querystring.error;
    res.redirect(URLUtils.url('Checkout-Begin', 'stage', 'payment', 'afterpayErrorMessage', Resource.msg(errorMessage, 'afterpay', null)));
    next();
});

server.get('CreateToken', server.middleware.https, function (req, res, next) {
    var OrderModel = require('*/cartridge/models/order');
    var Locale = require('dw/util/Locale');
    var currentBasket = BasketMgr.getCurrentBasket();
    var currentLocale = Locale.getLocale(req.locale.id);
    var customerEmail = req.querystring.customerEmail;

    var basketModel = null;

    var validatedProducts = ValidationHelpers.validateProducts(currentBasket);
    if (validatedProducts.error) {
        return returnJsonError(res, next, 'Problem with basket');
    }

    Transaction.wrap(function () {
        currentBasket.setCustomerEmail(customerEmail);
    });

    COHelpers.recalculateBasket(currentBasket);

    basketModel = new OrderModel(
        currentBasket,
        { usingMultiShipping: false, countryCode: currentLocale.country, containerView: 'basket' }
    );

    var grandTotal = parsePrice(basketModel.totals.grandTotal);
    var checkoutPrice = new Money(grandTotal, currentBasket.currencyCode);
    var isWithinThreshold = thresholdUtilities.checkThreshold(checkoutPrice);
    if (!isWithinThreshold.status) {
        return returnJsonError(res, next, Resource.msg('cashapppay.error.invalidamount', 'afterpay', null));
    }
    // Create the payment instrument
    Transaction.wrap(function () {
        AfterpayRefArchCOHelpers.removeAllNonGiftCertificatePayments(currentBasket);
        currentBasket.createPaymentInstrument(paymentMethodName, checkoutPrice);
    });

    var afterPayTokenResponse = require('*/cartridge/scripts/checkout/afterpayGetToken').getToken(currentBasket, true);
    if (afterPayTokenResponse.error) {
        return returnJsonError(res, next, Resource.msg('apierror.flow.default', 'afterpay', null));
    }
    var orderToken = afterPayTokenResponse.apToken;
    if (!orderToken) {
        return returnJsonError(res, next, Resource.msg('apierror.flow.default', 'afterpay', null));
    }
    AfterpaySession.newSession(orderToken);
    AfterpaySession.setItemsChecksum(AfterpayCOHelpers.computeBasketProductLineItemChecksum(currentBasket));
    res.json({ status: 'SUCCESS', token: afterPayTokenResponse });
    return next();
});

server.get('HandleResponse', server.middleware.https, function (req, res, next) {
    var Order = require('dw/order/Order');
    var orderPlacementStatus;
    var paymentStatusUpdated;
    var basketValid = false;
    var paymentStatus = req.querystring.status;
    var currentBasket = BasketMgr.getCurrentBasket();
    switch (paymentStatus) {
        case 'SUCCESS':
            var itemsChecksum = AfterpayCOHelpers.computeBasketProductLineItemChecksum(currentBasket);
            if (AfterpaySession.isValid()) {
                if (itemsChecksum == AfterpaySession.getItemsChecksum()) {
                    basketValid = true;
                }
                AfterpaySession.clearSession();
            }
            if (basketValid) {
                var paymentInstrument = currentBasket.getPaymentInstruments(paymentMethodName)[0];
                var paymentTransaction = paymentInstrument.getPaymentTransaction();
                if (paymentTransaction) {
                    var grandTotal = paymentTransaction.amount.value;
                    Transaction.wrap(function () {
                        AfterpayRefArchCOHelpers.removeAllNonGiftCertificatePayments(currentBasket);
                        currentBasket.createPaymentInstrument(paymentMethodName, new Money(grandTotal, currentBasket.currencyCode));
                    });
                }

                require('*/cartridge/scripts/checkout/afterpayUpdatePreapprovalStatus').getPreApprovalResult(currentBasket, { status: 'SUCCESS', orderToken: req.querystring.orderToken, isCashAppPay: 'true' });
                var order = COHelpers.createOrder(currentBasket);
                paymentStatusUpdated = require('*/cartridge/scripts/checkout/updatePaymentStatus').handlePaymentStatus(order, true);
                if (paymentStatusUpdated.authorized) {
                    Transaction.begin();
                    orderPlacementStatus = OrderMgr.placeOrder(order);
                    Transaction.commit();
                    if (!orderPlacementStatus.error) {
                        Transaction.begin();
                        order.setConfirmationStatus(Order.CONFIRMATION_STATUS_CONFIRMED);
                        order.setExportStatus(Order.EXPORT_STATUS_READY);
                        Transaction.commit();
                        res.render('checkout/confirmOrder', {
                            orderID: order.orderNo,
                            orderToken: order.orderToken,
                            continueUrl: URLUtils.url('Order-Confirm').toString()
                        });
                    } else {
                        Transaction.wrap(function () {
                            OrderMgr.failOrder(order, false);
                        });
                        res.redirect(URLUtils.url('Checkout-Begin', 'stage', 'payment', 'afterpayErrorMessage', Resource.msg('order.submission.error', 'afterpay', null)));
                    }
                } else {
                    Transaction.wrap(function () {
                        OrderMgr.failOrder(order);
                    });
                    res.redirect(URLUtils.url('Checkout-Begin', 'stage', 'payment', 'afterpayErrorMessage', paymentStatusUpdated.AfterpayOrderErrorMessage ? paymentStatusUpdated.AfterpayOrderErrorMessage : Resource.msg('apierror.flow.default', 'afterpay', null)));
                }
            } else {
                res.redirect(URLUtils.url('Checkout-Begin', 'stage', 'payment', 'afterpayErrorMessage', Resource.msg('cashapppay.error.missmatch', 'afterpay', null)));
            }
            break;
        case 'DECLINED':
            res.redirect(URLUtils.url('Checkout-Begin', 'stage', 'payment', 'afterpayErrorMessage', Resource.msg('afterpay.api.declined', 'afterpay', null)));
            break;
        default:
            res.redirect(URLUtils.url('Checkout-Begin', 'stage', 'payment', 'afterpayErrorMessage', Resource.msg('apierror.flow.default', 'afterpay', null)));
    }
    next();
});

server.get('HandleMobileResponse', server.middleware.https, function (req, res, next) {
    var cashRequestId = req.querystring.cash_request_id;
    if (!empty(cashRequestId)) {
        var scriptURL = apBrandUtilities.getBrandSettings().javaScriptUrl;
        res.render('checkout/cashAppMobile', { apJavascriptURL: scriptURL });
    } else {
        res.redirect(URLUtils.url('Checkout-Begin', 'stage', 'payment', 'afterpayErrorMessage', Resource.msg('afterpay.api.cancelled', 'afterpay', null)));
    }

    next();
});

module.exports = server.exports();
