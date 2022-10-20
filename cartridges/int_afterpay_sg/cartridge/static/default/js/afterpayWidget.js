function createAfterpayWidget() {
  window.afterpayWidget = new AfterPay.Widgets.PaymentSchedule({
    token: $('#afterpay-token').val(),
    target: '#afterpay-widget-container',
    locale: $('#afterpay-widget-locale').val().replace("_", "-"),
    onReady: function (event) {
      afterpayWidget.update({
        amount: {
          amount: $('#afterpay-widget-amount').val(),
          currency: $('#afterpay-widget-currency').val()
        },
      });
      // Fires when the widget is ready to accept updates.
    },
    onChange: function (event) {
      if (!event.data.isValid) {
        let widgetErrorUrl = $('#afterpay-express-url-widgeterror').val() + "?error=" + encodeURIComponent(event.data.error);
        window.location.assign(widgetErrorUrl);
        // Need to clear the session
      }
      // make visible anything that was hidden with .afterpay-widget-hideuntilready
      $('.afterpay-widget-hideuntilready').css("visibility", "visible");
      // Fires after each update and on any other state changes.
      // See "Getting the widget's state" for more details.
    },
    onError: function (event) {
      var errorUrl = $('#afterpay-express-url-cancelorder').val();
      $(location).attr('href', errorUrl);
      // See "Handling widget errors" for more details.
    },
  })
}

function priceUpdate() {
  afterpayWidget.update({
    amount: {
      amount: $('#afterpay-widget-amount').val(),
      currency: $('#afterpay-widget-currency').val()
    },
  });
}

function checkCartAndUpdateWidget() {
  let getCartStatusUrl = $('#afterpay-express-url-cartstatus').val();
  $.ajax({
    type: 'GET',
    url: getCartStatusUrl,
    success: function (res) {
      afterpayWidget.update({
        amount: {
          amount: res.cartTotalAmount.toString(),
          currency: res.cartTotalCurrency
        }
      });
    }
  });
}
