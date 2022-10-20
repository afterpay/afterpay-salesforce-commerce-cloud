'use strict';

var server = require('server');
var parsePrice = require('~/cartridge/scripts/util/parsePriceAfterpay.js');
var Response = require('server/response');
var URLUtils = require('dw/web/URLUtils');
var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
var AfterpayCOHelpers = require('*/cartridge/scripts/checkout/afterpayCheckoutHelpers');
var AfterpayRefArchCOHelpers = require('~/cartridge/scripts/checkout/afterpayRefArchCheckoutHelpers');
var Resource = require('dw/web/Resource');
let AfterpaySession = require('*/cartridge/scripts/util/afterpaySession');
let ValidationHelpers = require('*/cartridge/scripts/helpers/basketValidationHelpers');
var BasketMgr = require('dw/order/BasketMgr');
var LogUtils = require('*/cartridge/scripts/util/afterpayLogUtils');
var Logger = LogUtils.getLogger('CashApp');
var AfterpayShippingHelpers = require('*/cartridge/scripts/checkout/afterpayShippingHelpers');
var OrderMgr = require('dw/order/OrderMgr');
var Order = require('dw/order/Order');
var Money = require('dw/value/Money');
var Transaction = require('dw/system/Transaction');
var {
    brandUtilities: apBrandUtilities,
    checkoutUtilities: apCheckoutUtilities,
    sitePreferencesUtilities: sitePreferences
} = require('*/cartridge/scripts/util/afterpayUtilities');
var thresholdUtilities = require('*/cartridge/scripts/util/thresholdUtilities');
var paymentMethodName = apCheckoutUtilities.getPaymentMethodName(true);

function returnJsonError(res, next, err) {
    res.json({
        status: 'FAILURE',
        error: err,
        redirectUrl: URLUtils.url('Cart-Show').toString()
    });
    return next();
}

server.get('redirectToErrorDisplay',
    server.middleware.https,
    function (req, res, next) {
    var errorMessage = req.querystring.error;
    res.redirect(URLUtils.url('Checkout-Begin', 'stage', 'payment', 'afterpayErrorMessage', Resource.msg(errorMessage, 'afterpay', null)));
    next();
});

server.get('CreateToken',
    server.middleware.https,
    function (req, res, next) {
        var OrderModel = require('*/cartridge/models/order');
        var Locale = require('dw/util/Locale');
        var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');
        var currentBasket = BasketMgr.getCurrentBasket();
        var currentLocale = Locale.getLocale(req.locale.id);

        var basketModel = null;

        var validatedProducts = ValidationHelpers.validateProducts(currentBasket);
        if (validatedProducts.error) {
            return returnJsonError(res, next, 'Problem with basket');
        }

        COHelpers.recalculateBasket(currentBasket);

        basketModel = new OrderModel(
            currentBasket,
            { usingMultiShipping: false, countryCode: currentLocale.country, containerView: 'basket' }
        );

        let grandTotal = parsePrice(basketModel.totals.grandTotal);
        let checkoutPrice = new Money(grandTotal, currentBasket.currencyCode);
        var isWithinThreshold = thresholdUtilities.checkThreshold(checkoutPrice,true);
        if (!isWithinThreshold.status) {
            return returnJsonError(res, next, Resource.msg('cashapppay.error.invalidamount', 'afterpay', null));
        }
        // Create the payment instrument
        Transaction.wrap(function () {
            AfterpayRefArchCOHelpers.removeAllNonGiftCertificatePayments(currentBasket);
            currentBasket.createPaymentInstrument(paymentMethodName, checkoutPrice);
        });

        var afterPayTokenResponse = require('*/cartridge/scripts/checkout/afterpayGetToken').getToken(currentBasket,true);
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
            if(AfterpaySession.isValid()){
                if (itemsChecksum == AfterpaySession.getItemsChecksum()) {
                    basketValid = true;
                }
                AfterpaySession.clearSession();
            }
            if(basketValid){
                var paymentInstrument = currentBasket.getPaymentInstruments(paymentMethodName)[0];
                var paymentTransaction =  paymentInstrument.getPaymentTransaction();
                if(paymentTransaction){
                    let grandTotal = paymentTransaction.amount.value;
                    Transaction.wrap(function () {
                        AfterpayRefArchCOHelpers.removeAllNonGiftCertificatePayments(currentBasket);
                        currentBasket.createPaymentInstrument(paymentMethodName, new Money(grandTotal, currentBasket.currencyCode));
                    });
                }
                
                require('*/cartridge/scripts/checkout/afterpayUpdatePreapprovalStatus').getPreApprovalResult(currentBasket, { status: 'SUCCESS', orderToken: req.querystring.orderToken, isCashAppPay: 'true'});
                var order = COHelpers.createOrder(currentBasket);
                paymentStatusUpdated = require('*/cartridge/scripts/checkout/updatePaymentStatus').handlePaymentStatus(order,true);
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
    var cash_request_id = req.querystring.cash_request_id;
    if(!empty(cash_request_id)){
        var scriptURL = apBrandUtilities.getBrandSettings().javaScriptUrl;
        res.render('checkout/cashAppMobile',{apJavascriptURL: scriptURL})
    } else {
        res.redirect(URLUtils.url('Checkout-Begin', 'stage', 'payment', 'afterpayErrorMessage', Resource.msg('afterpay.api.cancelled', 'afterpay', null)));
    }

    next();
});

module.exports = server.exports();
