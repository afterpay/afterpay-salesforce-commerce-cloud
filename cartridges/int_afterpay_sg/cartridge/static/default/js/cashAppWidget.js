function initCashAppPay(afterpaytoken) {
    let commenceDelay = 0;
    if(typeof AfterPay != "undefined"){
        $('.data-checkout-stage[data-checkout-stage=payment] button.submit-payment').css('display','none');
        var cashAppPayOptions = {
            button: {
              size: 'medium', // "medium" | "small"
              width: 'full', // "full" | "static"
              theme: 'dark', // "dark" | "light"
              shape: 'semiround' // "round" | "semiround"
            }, 
            onComplete: function(event) {
                if(event.data){
                    var cashappProcessUrl = $('#cashApp-url-handleresponse').val() + '?orderToken=' + event.data.orderToken + '&status=' + event.data.status;
                    window.location.href = cashappProcessUrl;
                }
                
            },
            eventListeners: {
                "CUSTOMER_REQUEST_DECLINED": () => {
                    var cashappProcessUrl = $('#cashApp-url-handleresponse').val() + '?status=DECLINED';
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
        $('#cash-app-pay').css('display','block')
        AfterPay.initializeForCashAppPay({countryCode: "US", token: afterpaytoken, cashAppPayOptions});
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

$(document).ready(function () {
    if($('#cashApp-token').val()!= 'undefined' && $('#cashApp-token').val().length != 0){
        var cashAppToken = $('#cashApp-token').val();
        initCashAppPay(cashAppToken);
    }
});
