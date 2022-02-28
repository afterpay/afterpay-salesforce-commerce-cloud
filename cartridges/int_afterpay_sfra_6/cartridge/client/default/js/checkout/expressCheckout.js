$(document).ajaxComplete(function () {
    if ($('.minicart #afterpay-express-button').length > 0) {
        let cnt = 0;
        let sid = setInterval(function () {
            if (typeof initAfterpay === 'function' && typeof AfterPay !== 'undefined') {
                clearInterval(sid);
                initAfterpay({ pickupflag: $('#afterpay-express-storepickup').val() === 'true' });
            }
            if (cnt === 10) {
                clearInterval(sid);
            }
            ++cnt;
        }, 500);
    }
});
