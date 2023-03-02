/**
 * Creates checkout widget for Afterpay
 */
function createAfterpayWidget() {
    if (typeof AfterPay != 'undefined') {
        window.afterpayWidget = new AfterPay.Widgets.PaymentSchedule({
            token: $('#afterpay-token').val(),
            amount: { amount: $('#afterpay-widget-amount').val(), currency: $('#afterpay-widget-currency').val() },
            target: '#afterpay-widget-container',
            locale: $('#afterpay-widget-locale').val().replace('_', '-'),
            onReady: function () {
                $('.afterpay-widget-hideuntilready').css('visibility', 'visible');
            // Fires when the widget is ready to accept updates.
            },
            onChange: function (event) {
                if (!event.data.isValid) {
                    var widgetErrorUrl = $('#afterpay-express-url-widgeterror').val() + '?error=' + encodeURIComponent(event.data.error);
                    window.location.assign(widgetErrorUrl);
                    // Need to clear the session
                }
            // Fires after each update and on any other state changes.
            // See 'Getting the widget's state' for more details.
            },
            onError: function () {
                var errorUrl = $('#afterpay-express-url-cancelorder').val();
                $(location).attr('href', errorUrl);
            // See 'Handling widget errors' for more details.
            }
        });
    }
}
