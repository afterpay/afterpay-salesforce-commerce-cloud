'use strict';

var server = require('server');
var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var LogUtils = require('*/cartridge/scripts/util/afterpayLogUtils');
var Logger = LogUtils.getLogger('AfterpayRedirect');
var apCheckoutUtilities = require('*/cartridge/scripts/util/afterpayUtilities').checkoutUtilities;
var apBrandUtilities = require('*/cartridge/scripts/util/afterpayUtilities').brandUtilities;

/* API Includes */
var OrderMgr = require('dw/order/OrderMgr');
var URLUtils = require('dw/web/URLUtils');
var Transaction = require('dw/system/Transaction');
var Resource = require('dw/web/Resource');
var BasketMgr = require('dw/order/BasketMgr');

/**
 * redirects to Afterpay payment page after generating valid token
 */
server.get('PrepareRedirect', server.middleware.https, function (req, res, next) {
    var afterPayToken = decodeURIComponent(req.querystring.afterpayToken);
    var errorMessage = req.querystring.errorMessage;
    var errorCode = req.querystring.errorCode;
    var invalidEmailError = Resource.msg('afterpay.email.invalid.response', 'afterpay', null);

    var apBrand = apBrandUtilities.getBrand();
    var scriptURL = apBrandUtilities.getBrandSettings().javaScriptUrl;
    var countryCodeValue = apBrandUtilities.getCountryCode();

    if ((afterPayToken !== 'undefined') && countryCodeValue) {
        res.render('checkout/afterpayRedirect', {
            apBrand: apBrand,
            apJavascriptURL: scriptURL,
            apToken: afterPayToken,
            countryCode: countryCodeValue
        });
    } else {
        var tokenErrorMessage;

        if (invalidEmailError.equals(errorMessage)) {
            tokenErrorMessage = require('*/cartridge/scripts/util/afterpayErrors').getErrorResponses('TOKEN_ERROR');
        } else {
            tokenErrorMessage = require('*/cartridge/scripts/util/afterpayErrors').getErrorResponses(errorCode);
        }
        Logger.error('Error while generating Token: ' + tokenErrorMessage);

        res.redirect(URLUtils.url('Checkout-Begin', 'stage', 'payment', 'afterpayErrorMessage',
            require('*/cartridge/scripts/util/afterpayErrors').getErrorResponses(errorCode, true)));
    }
    next();
});

/** saves afterpay payment method in payment instrument */
server.post('IsAfterpay',
    server.middleware.https,
    csrfProtection.validateAjaxRequest,
    function (req, res, next) {
        var paymentMethodName = apCheckoutUtilities.getPaymentMethodName();
        var apBrand = apBrandUtilities.getBrand();
        var currentBasket = BasketMgr.getCurrentBasket();
        var paymentInstexists = false;
        var afterpayInstruments = currentBasket.getPaymentInstruments(paymentMethodName);
        var paymentInstruments = currentBasket.getPaymentInstruments();

        if (afterpayInstruments.length > 0 && afterpayInstruments.length === paymentInstruments.length) {
            paymentInstexists = true;
        } else {
            Transaction.wrap(function () {
                currentBasket.createPaymentInstrument(
                    paymentMethodName, currentBasket.totalGrossPrice
                );
            });
            paymentInstexists = true;
        }

        res.json({
            isAfterpay: paymentInstexists,
            resource: {
                pleaseWait: Resource.msg('redirect.message', apBrand, null),
                redirectMessage: Resource.msg('redirect.notification', apBrand, null)
            }
        });
        return next();
    });

/** processes request and retrieves token */
server.post('Redirect',
    server.middleware.https,
    csrfProtection.validateAjaxRequest,
    function (req, res, next) {
        var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');
        var hooksHelper = require('*/cartridge/scripts/helpers/hooks');
        var currentBasket = BasketMgr.getCurrentBasket();
        if (!currentBasket) {
            res.json({
                error: true,
                cartError: true,
                fieldErrors: [],
                serverErrors: [],
                cartUrl: URLUtils.url('Cart-Show').toString()
            });
            return next();
        }

        if (req.session.privacyCache.get('fraudDetectionStatus')) {
            res.json({
                error: true,
                cartError: true,
                cartUrl: URLUtils.url('Error-ErrorCode', 'err', '01').toString(),
                errorMessage: Resource.msg('error.technical', 'checkout', null)
            });
            return next();
        }
        var validationOrderStatus = hooksHelper('app.validate.order', 'validateOrder', currentBasket, require('*/cartridge/scripts/hooks/validateOrder').validateOrder);
        if (validationOrderStatus.error) {
            res.json({
                error: true,
                errorMessage: validationOrderStatus.message
            });
            return next();
        }

        // Check to make sure there is a shipping address
        if (currentBasket.defaultShipment.shippingAddress === null) {
            res.json({
                error: true,
                errorStage: {
                    stage: 'shipping',
                    step: 'address'
                },
                errorMessage: Resource.msg('error.no.shipping.address', 'checkout', null)
            });
            return next();
        }

        // Check to make sure billing address exists
        if (!currentBasket.billingAddress) {
            res.json({
                error: true,
                errorStage: {
                    stage: 'payment',
                    step: 'billingAddress'
                },
                errorMessage: Resource.msg('error.no.billing.address', 'checkout', null)
            });
            return next();
        }

        // Calculate the basket
        Transaction.wrap(function () {
            basketCalculationHelpers.calculateTotals(currentBasket);
        });

        // Re-validates existing payment instruments
        var validPayment = COHelpers.validatePayment(req, currentBasket);
        if (validPayment.error) {
            res.json({
                error: true,
                errorStage: {
                    stage: 'payment',
                    step: 'paymentInstrument'
                },
                errorMessage: Resource.msg('error.payment.not.valid', 'checkout', null)
            });
            return next();
        }

        // Re-calculate the payments.
        var calculatedPaymentTransactionTotal = COHelpers.calculatePaymentTransaction(currentBasket);
        if (calculatedPaymentTransactionTotal.error) {
            res.json({
                error: true,
                errorMessage: Resource.msg('error.technical', 'checkout', null)
            });
            return next();
        }
        var redirectUrl = URLUtils.https('AfterpayRedirect-PrepareRedirect').toString();
        var afterPayTokenResponse = require('*/cartridge/scripts/checkout/afterpayGetToken').getToken(currentBasket);
        var countryCode = currentBasket.billingAddress.countryCode ? currentBasket.billingAddress.countryCode.value.toUpperCase() : '';
        res.json({
            error: false,
            redirectTokenResponse: afterPayTokenResponse,
            countryCode: countryCode,
            redirectUrl: redirectUrl
        });
        return next();
    });

/**
* processes the response returned by afterpay once the payment is done
*/
server.get('HandleResponse', server.middleware.https, function (req, res, next) {
    var Order = require('dw/order/Order');
    var productExists;
    var orderPlacementStatus;
    var paymentStatusUpdated;
    var paymentStatus = req.querystring.status;
    var currentBasket = BasketMgr.getCurrentBasket();
    switch (paymentStatus) {
        case 'SUCCESS':
            productExists = require('*/cartridge/scripts/checkout/afterpayTokenConflict').checkTokenConflict(currentBasket, req.querystring.orderToken);
            require('*/cartridge/scripts/checkout/afterpayUpdatePreapprovalStatus').getPreApprovalResult(currentBasket, req.querystring);
            if (!productExists || productExists.error) {
                res.redirect(URLUtils.url('Checkout-Begin', 'stage', 'payment', 'afterpayErrorMessage', Resource.msg('apierror.flow.invalid', 'afterpay', null)));
            } else {
                var order = COHelpers.createOrder(currentBasket);
                paymentStatusUpdated = require('*/cartridge/scripts/checkout/updatePaymentStatus').handlePaymentStatus(order);
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
            }
            break;
        case 'CANCELLED':
            res.redirect(URLUtils.url('Checkout-Begin', 'stage', 'payment', 'afterpayErrorMessage', Resource.msg('afterpay.api.cancelled', 'afterpay', null)));
            break;
        default:
            res.redirect(URLUtils.url('Checkout-Begin', 'stage', 'payment', 'afterpayErrorMessage', Resource.msg('apierror.flow.default', 'afterpay', null)));
    }
    next();
});

module.exports = server.exports();
