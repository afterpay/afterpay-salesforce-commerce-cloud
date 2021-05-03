'use strict';

var afterpayRedirect = require('../afterpay/afterpayRedirect');
var afterpayWidget = require('../afterpay/afterpayWidget');

var exports = {
    initialize: function () {
        $(document).ready(function () {
            afterpayRedirect.selectPaymentMethod();

            $(document).ajaxComplete(function () {
                afterpayRedirect.selectPaymentMethod();
            });

            $('button.submit-payment').on('click', function (e) {
                var isAfterpayTab = $('.afterpay_pbi-tab').hasClass('active');

                if (isAfterpayTab) {
                    e.stopPropagation();
                    afterpayRedirect.generalValidation();
                }
            });
        });
    },
    updateCheckoutView: function () {
        $('body').on('checkout:updateCheckoutView', function () {
            // Refresh checkout Afterpay Widget
            afterpayWidget.getWidget(null, null, 'checkout-afterpay-message');
        });
    }
};

module.exports = exports;
