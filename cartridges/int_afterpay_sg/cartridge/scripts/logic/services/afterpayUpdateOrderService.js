'use strict';

var Site = require('dw/system/Site');
var Resource = require('dw/web/Resource');
var Template = require('dw/util/Template');
var HashMap = require('dw/util/HashMap');
var Mail = require('dw/net/Mail');

var afterpayUpdateOrderService = module.superModule;

afterpayUpdateOrderService.sendConfirmationEmail = function (order) {
    var mailSubject = Resource.msg('order.orderconfirmation-email.001', 'order', null) + ' ' + order.orderNo;

    var template = new Template('mail/orderconfirmationjobschedure');
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
};

module.exports = afterpayUpdateOrderService;
