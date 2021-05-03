'use strict';
/* global $ */

// Updates the afterpay express checkout widget with the total value
// which should be located in the element '.grand-total-sum'
// This also updates the checkout widget for non-express-checkout orders
function updateExpressWidget() {
var grandTotalSum = $('.grand-total-sum').text();
    console.log("Updating express widget. Grandtotal=", grandTotalSum);
    grandTotalSum = grandTotalSum.replace(/\$/g, '');
    var currency = $('#afterpay-widget-currency').val();
    if ("afterpayWidget" in window) {
        afterpayWidget.update({
            amount: { amount: grandTotalSum, currency: currency },
        });

        $('#afterpay-widget-amount').val(grandTotalSum);
        $('#afterpay-widget-currency').val(currency);
    }
}

module.exports.updateExpressWidget = updateExpressWidget;
