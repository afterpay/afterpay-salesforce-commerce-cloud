'use strict';
/* global $ */
function onPageLoad() {
    var cashappProcessUrl;
    var cashAppPayListenerOptions = { 
        onComplete: function(event) {
            if (event.data) {
                cashappProcessUrl = $('#cashApp-url-handleresponse').val() + '?orderToken=' + event.data.orderToken + '&status=' + event.data.status;
                window.location.href = cashappProcessUrl;
            }
        },
        /* Optional event listeners for merchants to track customer behavior and listen for transaction events in the lifecycle */
        eventListeners: {
            "CUSTOMER_REQUEST_DECLINED": () => {
                cashappProcessUrl = $('#cashApp-url-handleresponse').val() + '?status=DECLINED';
                window.location.href = cashappProcessUrl;
            },
             "CUSTOMER_REQUEST_FAILED": () =>  {
                cashappProcessUrl = $('#cashApp-url-handleresponse').val() + '?status=FAILED';
                window.location.href = cashappProcessUrl;
            }
        }
    }
    if (AfterPay != 'undefined') {
        $(".loader-image").fadeOut("slow");
        AfterPay.initializeCashAppPayListeners({countryCode: "US", cashAppPayListenerOptions});
    }
}

window.onload = function () {
    $(".loader-image").fadeOut("slow");
    onPageLoad();
};
