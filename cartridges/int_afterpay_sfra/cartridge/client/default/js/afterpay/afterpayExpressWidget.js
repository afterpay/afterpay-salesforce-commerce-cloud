'use strict';

/**
 * Updates the afterpay express checkout widget with the total value
 * which should be located in the element '.grand-total-sum'
 * This also updates the checkout widget for non-express-checkout orders
 */
function updateExpressWidget() {
    var currency = $('#afterpay-widget-currency').val();
    var grandTotalSum = $('.grand-total-sum').text();

    // eslint-disable-next-line no-useless-escape
    grandTotalSum = Number(grandTotalSum.replace(/[^0-9\.-]+/g, '')).toString();
    $('#afterpay-widget-amount').val(grandTotalSum);
    $('#afterpay-widget-currency').val(currency);
    if ('afterpayWidget' in window) {
        afterpayWidget.update({
            amount: { amount: grandTotalSum, currency: currency }
        });
    }
}

module.exports.updateExpressWidget = updateExpressWidget;
