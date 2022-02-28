'use strict';

var server = require('server');

var checkoutServices = module.superModule;
server.extend(checkoutServices);

var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');

/**
 *  Handle Ajax payment (and billing) form submit
 */
server.prepend(
    'SubmitPayment',
    server.middleware.https,
    csrfProtection.validateAjaxRequest,
    function (req, res, next) {
        var data = res.getViewData();
        var BasketMgr = require('dw/order/BasketMgr');
        var currentBasket = BasketMgr.getCurrentOrNewBasket();
        var paymentForm = server.forms.getForm('billing');
        var paymentMethodID = paymentForm.paymentMethod.value;
        var AfterpaySession = require('*/cartridge/scripts/util/afterpaySession');

        if (paymentMethodID !== 'AFTERPAY' && paymentMethodID !== 'CLEARPAY') {
            // For express checkout, it's possible there was a Afterpay payment method in the basket,
            // so remove it if a non-Afterpay payment method was selected
            require('~/cartridge/scripts/checkout/afterpayRefArchCheckoutHelpers').removeAfterpayPayments(currentBasket);
            AfterpaySession.clearSession();
            next();
            return;
        }

        if (data && data.csrfError) {
            res.json();
            this.emit('route:Complete', req, res);
            return;
        }

        var billingFormErrors = {};
        var viewData = {};
        var formFieldErrors = [];
        // verify billing form data
        billingFormErrors = COHelpers.validateBillingForm(paymentForm.addressFields);
        var contactInfoFormErrors = COHelpers.validateFields(paymentForm.contactInfoFields);

        if (Object.keys(contactInfoFormErrors).length) {
            formFieldErrors.push(contactInfoFormErrors);
        } else {
            viewData.email = {
                value: paymentForm.contactInfoFields.email.value
            };

            viewData.phone = { value: paymentForm.contactInfoFields.phone.value };
        }
        if (Object.keys(billingFormErrors).length) {
            // respond with form data and errors
            formFieldErrors.push(billingFormErrors);
        }
        if (formFieldErrors.length) {
            // respond with form data and errors
            res.json({
                form: paymentForm,
                fieldErrors: formFieldErrors,
                serverErrors: [],
                error: true
            });
            this.emit('route:Complete', req, res);
            return;
        }

        viewData.address = {
            firstName: { value: paymentForm.addressFields.firstName.value },
            lastName: { value: paymentForm.addressFields.lastName.value },
            address1: { value: paymentForm.addressFields.address1.value },
            address2: { value: paymentForm.addressFields.address2.value },
            city: { value: paymentForm.addressFields.city.value },
            postalCode: { value: paymentForm.addressFields.postalCode.value },
            countryCode: { value: paymentForm.addressFields.country.value }
        };
        if (Object.prototype.hasOwnProperty
            .call(paymentForm.addressFields, 'states')) {
            viewData.address.stateCode =
                { value: paymentForm.addressFields.states.stateCode.value };
        }
        viewData.paymentMethod = {
            value: paymentForm.paymentMethod.value,
            htmlName: paymentForm.paymentMethod.value
        };

        res.setViewData(viewData);

        var HookMgr = require('dw/system/HookMgr');
        var Resource = require('dw/web/Resource');
        var PaymentMgr = require('dw/order/PaymentMgr');
        var Transaction = require('dw/system/Transaction');
        var AccountModel = require('*/cartridge/models/account');
        var OrderModel = require('*/cartridge/models/order');
        var URLUtils = require('dw/web/URLUtils');
        var Locale = require('dw/util/Locale');
        var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');
        var hooksHelper = require('*/cartridge/scripts/helpers/hooks');
        var billingData = res.getViewData();
        if (!currentBasket) {
            delete billingData.paymentInformation;
            res.json({
                error: true,
                cartError: true,
                fieldErrors: [],
                serverErrors: [],
                redirectUrl: URLUtils.url('Cart-Show').toString()
            });
            this.emit('route:Complete', req, res);
            return;
        }
        var billingAddress = currentBasket.billingAddress;
        var billingForm = server.forms.getForm('billing');
        paymentMethodID = billingData.paymentMethod.value;
        Transaction.wrap(function () {
            if (!billingAddress) {
                billingAddress = currentBasket.createBillingAddress();
            }
            billingAddress.setFirstName(billingData.address.firstName.value);
            billingAddress.setLastName(billingData.address.lastName.value);
            billingAddress.setAddress1(billingData.address.address1.value);
            billingAddress.setAddress2(billingData.address.address2.value);
            billingAddress.setCity(billingData.address.city.value);
            billingAddress.setPostalCode(billingData.address.postalCode.value);
            if (Object.prototype.hasOwnProperty.call(billingData.address, 'stateCode')) {
                billingAddress.setStateCode(billingData.address.stateCode.value);
            }
            billingAddress.setCountryCode(billingData.address.countryCode.value);
            if (paymentMethodID === 'AFTERPAY' || paymentMethodID === 'CLEARPAY') {
                billingAddress.setPhone(billingData.phone.value);
                currentBasket.setCustomerEmail(billingData.email.value);
            }
        });
        // if there is no selected payment option and balance is greater than zero
        if (!paymentMethodID && currentBasket.totalGrossPrice.value > 0) {
            var noPaymentMethod = {};
            noPaymentMethod[billingData.paymentMethod.htmlName] =
                Resource.msg('error.no.selected.payment.method', 'creditCard', null);
            delete billingData.paymentInformation;
            res.json({
                form: billingForm,
                fieldErrors: [noPaymentMethod],
                serverErrors: [],
                error: true
            });
            return;
        }
        // check to make sure there is a payment processor
        if (!PaymentMgr.getPaymentMethod(paymentMethodID).paymentProcessor) {
            throw new Error(Resource.msg(
                'error.payment.processor.missing',
                'checkout',
                null
            ));
        }
        var processor = PaymentMgr.getPaymentMethod(paymentMethodID).getPaymentProcessor();
        var processorResult = null;
        if (HookMgr.hasHook('app.payment.processor.' + processor.ID.toLowerCase())) {
            processorResult = HookMgr.callHook('app.payment.processor.' + processor.ID.toLowerCase(),
                'Handle',
                currentBasket,
                billingData.paymentInformation
            );
        } else {
            processorResult = HookMgr.callHook('app.payment.processor.default', 'Handle');
        }

        if (processorResult.error) {
            delete billingData.paymentInformation;
            res.json({
                form: billingForm,
                fieldErrors: processorResult.fieldErrors,
                serverErrors: processorResult.serverErrors,
                error: true
            });
            this.emit('route:Complete', req, res);
            return;
        }
        // Calculate the basket
        Transaction.wrap(function () {
            basketCalculationHelpers.calculateTotals(currentBasket);
        });
        // Re-calculate the payments.
        var calculatedPaymentTransaction = COHelpers.calculatePaymentTransaction(
            currentBasket
        );
        if (calculatedPaymentTransaction.error) {
            res.json({
                form: paymentForm,
                fieldErrors: [],
                serverErrors: [Resource.msg('error.technical', 'checkout', null)],
                error: true
            });
            return;
        }
        var usingMultiShipping = req.session.privacyCache.get('usingMultiShipping');
        if (usingMultiShipping === true && currentBasket.shipments.length < 2) {
            req.session.privacyCache.set('usingMultiShipping', false);
            usingMultiShipping = false;
        }
        if (paymentMethodID === 'AFTERPAY' || paymentMethodID === 'CLEARPAY') {
            hooksHelper('app.customer.subscription', 'subscribeTo', [paymentForm.subscribe.checked, billingForm.contactInfoFields.email.htmlValue], function () {});
        }
        var currentLocale = Locale.getLocale(req.locale.id);
        var basketModel = new OrderModel(
            currentBasket,
            { usingMultiShipping: usingMultiShipping, countryCode: currentLocale.country, containerView: 'basket' }
        );
        var accountModel = new AccountModel(req.currentCustomer);
        var renderedStoredPaymentInstrument = COHelpers.getRenderedPaymentInstruments(
            req,
            accountModel
        );
        delete billingData.paymentInformation;
        res.json({
            renderedPaymentInstruments: renderedStoredPaymentInstrument,
            customer: accountModel,
            order: basketModel,
            form: billingForm,
            afterpayEnabled: true,
            error: false
        });

        if (paymentMethodID === 'AFTERPAY' || paymentMethodID === 'CLEARPAY') {
            this.emit('route:Complete', req, res);
        }
    }
);

module.exports = server.exports();
