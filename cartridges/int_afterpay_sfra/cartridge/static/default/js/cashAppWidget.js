function initCashAppPay(afterpaytoken) {
    let commenceDelay = 0;
    if(typeof AfterPay != "undefined"){
        var cashappProcessUrl;
        $('.data-checkout-stage[data-checkout-stage=payment] button.submit-payment').css('display','none');
        var cashAppPayOptions = {
            button: {
              size: 'medium', // "medium" | "small"
              width: 'full', // "full" | "static"
              theme: 'dark', // "dark" | "light"
              shape: 'semiround' // "round" | "semiround"
            },
            redirectUrl: window.location.href,
            onComplete: function(event) {
                $.spinner().start();
                if(event.data){
                    cashappProcessUrl = $('#cashApp-url-handleresponse').val() + '?orderToken=' + event.data.orderToken + '&status=' + event.data.status;
                    window.location.href = cashappProcessUrl;
                }
                
            },
            eventListeners: {
               "CUSTOMER_REQUEST_DECLINED": () => {
                    cashappProcessUrl = $('#cashApp-url-handleresponse').val() + '?status=DECLINED';
                    window.location.href = cashappProcessUrl;
                },
                "CUSTOMER_REQUEST_FAILED": () => {
                    cashappProcessUrl = $('#cashApp-url-handleresponse').val() + '?status=FAILED';
                    window.location.href = cashappProcessUrl;
                }
            }
        }
    }
    sleep(commenceDelay).then(() => {
        $('#cash-app-pay').css('display','block');
        $.spinner().stop();
        AfterPay.initializeForCashAppPay({countryCode: "US", token: afterpaytoken, cashAppPayOptions});
    });
    
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

