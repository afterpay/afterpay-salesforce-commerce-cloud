'use strict';
/* global $ */
var processInclude = require('base/util');
function createCashAppToken(){
    var cashappProcessUrl;
    if($('.cashapppay-tab').hasClass('active')){
        if($('.form-control.email').val()){
            var cashAppUrl =$('#cashApp-url-createtoken').val() + "?customerEmail=" + $('.form-control.email').val();
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
            cashappProcessUrl = $('#cashApp-url-handleerror').val()  + '?error=cashapppay.error.emailmissing';
            window.location.href = cashappProcessUrl;
        }
    }
}

$(document).ready(function () {
    let cashappelem = document.querySelector('.cashapppay-tab');
    if (cashappelem && window.MutationObserver) {
        $('.data-checkout-stage[data-checkout-stage=payment] button.submit-payment').css('display','block');
        $('#cash-app-pay').css('display','none');
        var observer = new MutationObserver(function (mutations) {
            if($('.cashapppay-tab').hasClass('active')){
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
