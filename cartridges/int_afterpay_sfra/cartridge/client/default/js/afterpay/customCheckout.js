'use strict';

var afterpayRedirect = require('../afterpay/afterpayRedirect');
//var afterpayOrigWidget = require('../afterpay/afterpayWidget');
var afterpayExpressWidget = require('../afterpay/afterpayExpressWidget');
var baseCheckout = require('base/checkout/checkout');


// Hide all states
function hideAllStates() {
    $('.ap-checkout-ship').addClass('afterpay-hide');

    $('.ap-checkout-pay-tab-ecf').addClass('afterpay-hide');
    $('.ap-checkout-pay-tab-noecf').addClass('afterpay-hide');
    $('.ap-checkout-pay-notab-ecf').addClass('afterpay-hide');
    $('.ap-checkout-pay-notab-noecf').addClass('afterpay-hide');

    // An afterpay payment instrument at placeorder screen should always be
    // express checkout since the non-express-checkout skips the placeorder screen
    // entirely.
    $('.ap-checkout-po-ecf').addClass('afterpay-hide');
    $('.ap-checkout-po-noecf').addClass('afterpay-hide');
}

// Handle changes between different checkout stages
function handleStateChange() {
    let cm_elem = document.querySelector('#checkout-main');
    let stage = cm_elem.getAttribute('data-checkout-stage');

    let ec_finalize = false;
    if ($('#afterpay-express-checkout-finalize').length > 0 && $('#afterpay-express-checkout-finalize').val() === "true") {
        ec_finalize = true;
    }

    // Always do removeClass after addClass in case same element has multiple classes
    if (stage === "shipping") {
        hideAllStates();
        console.log("Unhiding: ap-checkout-ship");
        $('.ap-checkout-ship').removeClass('afterpay-hide');
    }
    else if (stage === "payment") {
        let isAfterpayTab = $('.afterpay_pbi-tab').hasClass('active');
        hideAllStates();
        if (isAfterpayTab) {
            if (ec_finalize) {
                console.log("Unhiding: ap-checkout-pay-tab-ecf");
                $('.ap-checkout-pay-tab-ecf').removeClass('afterpay-hide');
            }
            else {
                console.log("Unhiding: ap-checkout-pay-tab-noecf");
                $('.ap-checkout-pay-tab-noecf').removeClass('afterpay-hide');
            }
        }
        else {
            if (ec_finalize) {
                console.log("Unhiding: ap-checkout-pay-notab-ecf");
                $('.ap-checkout-pay-notab-ecf').removeClass('afterpay-hide');
            }
            else {
                console.log("Unhiding: ap-checkout-pay-notab-noecf");
                $('.ap-checkout-pay-notab-noecf').removeClass('afterpay-hide');                
            }
        }
    }
    else if (stage === "placeOrder") {
        let isAfterpayPayment = $('#afterpay-payment-shown').length;

        hideAllStates();
        if (isAfterpayPayment) {
            console.log("Unhiding: ap-checkout-po-ecf");
            $('.ap-checkout-po-ecf').removeClass('afterpay-hide');
        }
        else {
            console.log("Unhiding: ap-checkout-po-noecf");
            // If there's no Afterpay payment on the placeOrder stage, just cancel express checkout finalize flow
            $('#afterpay-express-checkout-finalize').val(false);
            $('.ap-checkout-po-noecf').removeClass('afterpay-hide');

        }
    }
}


var exports = {
    initialize: function () {
        $(document).ready(function () {
            afterpayRedirect.selectPaymentMethod();

            $(document).ajaxComplete(function () {
                afterpayRedirect.selectPaymentMethod();
            });

            // do afterpay redirect method if the original submit button is clicked
            // with afterpay as payment type
            $('button.submit-payment').on('click', function (e) {
                var isAfterpayTab = $('.afterpay_pbi-tab').hasClass('active');

                if (isAfterpayTab) {
                    e.stopPropagation();
                    afterpayRedirect.generalValidation();
                }
            });

            // update the widget with correct amounts on initial page load
            afterpayExpressWidget.updateExpressWidget();

            // Call handleStage when page is loaded/reloaded
            handleStateChange();

            let cm_elem = document.querySelector('#checkout-main');            
            // Call handleStage with new stage whenever we detect the stage change
            // SFRA base changes attributes on #checkout-main to indicate stage of checkout flow changes
            if (window.MutationObserver) {
                var observer = new MutationObserver(function(mutations) {
                    for (let mutation of mutations) {
                        if (mutation.type === 'attributes') {
                            handleStateChange();
                        }
                    }
                });
                observer.observe(cm_elem, { attributes: true });
            }

            // Call handleStage with new stage whenever afterpay payment tab is pressed
            let tabelem = document.querySelector('.afterpay_pbi-tab');
            if (window.MutationObserver) {
                var observer = new MutationObserver(function(mutations) {
                    handleStateChange();
                });
                observer.observe(tabelem, { attributes: true });
            }


            if (typeof createAfterpayWidget === "function") {
                console.log("Calling createAfterpayWidget");
                createAfterpayWidget();
            }

            // Handle place-order button click
            $("#afterpay-placeorder-button").on('click', function() {
                console.log("Placeorder clicked");
                if(typeof afterpayWidget !== 'undefined') {
                    let url = $("#afterpay-express-url-finalize").val();
                    let checksum = afterpayWidget.paymentScheduleChecksum;
                    window.location.href= url + "?checksum=" + checksum;
                }
            });

            // if express checkout finalization flow, then select the afterpay payment
            // tab by default
            if (($('#afterpay-express-checkout-finalize').val() === "true") &&
                (parseFloat($('#afterpay-widget-amount').val()) > 0.0)) {
                $('.afterpay_pbi-content').addClass('active');
                $('.afterpay_pbi-tab').addClass('active');
                $('.credit-card-content').removeClass('active');
                $('.credit-card-tab').removeClass('active');
            }
        });
    },
    updateCheckoutView: function () {
        $('body').on('checkout:updateCheckoutView', function () {
            // Refresh checkout Afterpay Widget
            //afterpayOrigWidget.getWidget(null, null, 'checkout-afterpay-message');
            // Refresh Afterpay Express Checkout Widget
            afterpayExpressWidget.updateExpressWidget();
        });
    }
};

module.exports = exports;
