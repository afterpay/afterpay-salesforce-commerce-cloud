'use strict';

/**
 * Creates checkout for CashApp
 */
function createCashAppToken() {
    var cashappProcessUrl;
    if ($('.cashapppay-tab').hasClass('active')) {
        var customerEmail = $('.form-control.email').val() ? $('.form-control.email').val() : $('.order-summary-email').text();
        if (customerEmail) {
            var cashAppUrl = $('#cashApp-url-createtoken').val() + '?customerEmail=' + customerEmail;
            $.ajax({
                type: 'GET',
                url: cashAppUrl,
                success: function (res) {
                    if (res.status == 'SUCCESS') {
                        var afterpaytoken = res.token.apToken;
                        initCashAppPay(afterpaytoken);
                    } else {
                        cashappProcessUrl = $('#cashApp-url-handleresponse').val() + '?status=FAILED';
                        window.location.href = cashappProcessUrl;
                    }
                },
                error: function () {
                    cashappProcessUrl = $('#cashApp-url-handleerror').val() + '?error=cashapppay.error.token';
                    window.location.href = cashappProcessUrl;
                }
            });
        } else {
            cashappProcessUrl = $('#cashApp-url-handleerror').val() + '?error=cashapppay.error.emailmissing';
            window.location.href = cashappProcessUrl;
        }
    }
}

$(document).ready(function () {
    var cashappelem = document.querySelector('.cashapppay-tab');
    if (cashappelem && window.MutationObserver) {
        var observer = new MutationObserver(function () {
            $('.data-checkout-stage[data-checkout-stage=payment] button.submit-payment').css('display', 'block');
            $('#cash-app-pay').css('display', 'none');
            if ($('.cashapppay-tab').hasClass('active')) {
                $.spinner().start();
                createCashAppToken();
            }
        });
        observer.observe(cashappelem, { attributes: true });
    }

    $('body').on('checkout:updateCheckoutView', function () {
        createCashAppToken();
    });
});
