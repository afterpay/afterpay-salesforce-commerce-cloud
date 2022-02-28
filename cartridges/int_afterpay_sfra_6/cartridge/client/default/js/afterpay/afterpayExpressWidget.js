'use strict';
/* global $ */

// Updates the afterpay express checkout widget with the total value
// which should be located in the element '.grand-total-sum'
// This also updates the checkout widget for non-express-checkout orders
function updateExpressWidget() {
    var currency = $('#afterpay-widget-currency').val();
    var grandTotalSum = $('.grand-total-sum').text();
    if (currency === 'EUR') {
        $('.afterpay-widget').removeClass('afterpay-hide');
        if($("afterpay-placement").length != 0){
            $('afterpay-placement').attr('data-amount',grandTotalSum);
        }
        grandTotalSum = '0.00';
    } else if ($('.afterpay-widget').hasClass('afterpay-placement') && $('.afterpay-placement').hasAttribute('data-amount')) {
        grandTotalSum = $('.afterpay-placement').attr('data-amount');
    } else {
        grandTotalSum = Number(grandTotalSum.replace(/[^0-9\.-]+/g, '')).toString();
    }

    if ('afterpayWidget' in window) {
        afterpayWidget.update({
            amount: { amount: grandTotalSum, currency: currency }
        });

        $('#afterpay-widget-amount').val(grandTotalSum);
        $('#afterpay-widget-currency').val(currency);
    }
}

module.exports.updateExpressWidget = updateExpressWidget;
