function createAfterpayWidget () {
    if(typeof AfterPay != "undefined"){
        window.afterpayWidget = new AfterPay.Widgets.PaymentSchedule({
            token: $('#afterpay-token').val(),
            amount: { amount: $('#afterpay-widget-amount').val(), currency: $('#afterpay-widget-currency').val() },
            target: '#afterpay-widget-container',
            locale: $('#afterpay-widget-locale').val().replace("_", "-"), 
            onReady: function (event) {
                console.log("onReady() called. event=", event);
                afterpayWidget.update({
                    amount: { amount: $('#afterpay-widget-amount').val(), currency: $('#afterpay-widget-currency').val() },
                });
                $('.afterpay-widget-hideuntilready').css("visibility", "visible");
            // Fires when the widget is ready to accept updates.  
            },
            onChange: function (event) {
                console.log("onChange() called. event=", event.data);
                if (!event.data.isValid) {
                    let widgetErrorUrl = $('#afterpay-express-url-widgeterror').val() + "?error=" + encodeURIComponent(event.data.error);
                    console.log("Error with Afterpay Widget: " + event.data.error);
                    window.location.assign(widgetErrorUrl);
                    // Need to clear the session
                }
            // Fires after each update and on any other state changes.
            // See "Getting the widget's state" for more details.
            },
            onError: function (event) {
                console.log("onError() called. event=", event);
                var errorUrl = $('#afterpay-express-url-cancelorder').val();
                $(location).attr('href', errorUrl);
            // See "Handling widget errors" for more details.
            },
        })
    }
}

function priceUpdate() {
    afterpayWidget.update({
        amount: { amount: $('#afterpay-widget-amount').val(), currency: $('#afterpay-widget-currency').val() },
    });
}

function checkCartAndUpdateWidget() {
    let getCartStatusUrl = $('#afterpay-express-url-cartstatus').val();
    $.ajax({
        type: 'GET',
        url: getCartStatusUrl,
        success: function(res) {
            afterpayWidget.update({
                amount: { amount: res.cartTotalAmount.toString(), currency: res.cartTotalCurrency },
            });
        },
        error: function(){
            console.log("Afterpay Express cart status request failure.");
        }
    });
}
