'use strict';

/**
 * Updates Checkout Widget HTML
 */
function updateCheckoutWidget() {
    var getUpdatedWidgetUrl = $('.checkout-widget').val();
    $.ajax({
        url: getUpdatedWidgetUrl,
        method: 'GET',
        success: function (data) {
            if (data.updatedWidget) {
                $('.afterpay-checkout-widget').html(data.updatedWidget);
                $('.afterpay-checkout-widget').show();
            }
        },
        error: function () {
            $('.afterpay-checkout-widget').hide();
        }
    });
}

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
    updateCheckoutWidget();
}

module.exports.updateExpressWidget = updateExpressWidget;
