'use strict';

var Site = require('dw/system/Site');
var Resource = require('dw/web/Resource');

var afterpayUpdateOrderService = module.superModule;

afterpayUpdateOrderService.sendConfirmationEmail = function (order, containerView) {
    var OrderModel = require('*/cartridge/models/order');
    var emailHelpers = require('*/cartridge/scripts/helpers/emailHelpers');
    var brandUtilities = require('*/cartridge/scripts/util/afterpayUtilities').brandUtilities;

    var orderModel = new OrderModel(order, {
        containerView: containerView || 'basket',
        countryCode: brandUtilities.getCountryCode()
    });

    var orderObject = { order: orderModel };

    var emailObj = {
        to: order.customerEmail,
        subject: Resource.msg('subject.order.confirmation.email', 'order', null),
        from: Site.current.getCustomPreferenceValue('customerServiceEmail') || 'no-reply@salesforce.com',
        type: emailHelpers.emailTypes.orderConfirmation
    };

    emailHelpers.sendEmail(emailObj, 'checkout/confirmation/confirmationEmail', orderObject);
};

module.exports = afterpayUpdateOrderService;
