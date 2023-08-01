'use strict';

var processInclude = require('base/util');
/**
 * Gets Widget HTML from AfterPay API
 * @param {string} updatedProductID - product ID
 * @param {number} updatedPrice - product price
 * @param {string} className - HTML class name
 * @param {jquery} $productContainer - DOM container for product
 */
function getWidget(updatedProductID, updatedPrice, className, $productContainer) {
    var getUpdatedWidgetUrl = $('.updated-widget').val();
    var queryString = '?productID=' + updatedProductID + '&updatedPrice=' + updatedPrice + '&className=' + className;
    $.ajax({
        url: getUpdatedWidgetUrl + queryString,
        method: 'GET',
        success: function (data) {
            if (data.updatedWidget) {
                if (typeof $productContainer !== 'undefined') {
                    $productContainer.find('.afterpay-widget').html(data.updatedWidget);
                    $productContainer.find('.afterpay-widget').show();
                } else if (typeof $productContainer === 'undefined') {
                    $('.afterpay-widget').html(data.updatedWidget);
                    $('.afterpay-widget').show();
                }
            }
            $('#afterpay-express-pdp-button').toggleClass('afterpay-hide', !data.apApplicable);
        }
    });
}

/**
 * @description Update widget for PDP specifically
 */
function updatePpdWidget() {
    var productID = $('.product-id').text();
    var productPrice = $('.prices-add-to-cart-actions .prices .price .sales .value').attr('content');
    var productContainer = $('.product-detail');

    getWidget(productID, productPrice, 'pdp-afterpay-message', productContainer);
}

/**
 * @description Update Pickup Store
 */
function updateStorePickupState() {
    var getCartStatusUrl = $('#afterpay-express-url-cartstatus').val();
    if (getCartStatusUrl) {
        $.ajax({
            url: getCartStatusUrl,
            method: 'GET',
            success: function (data) {
                if (data.instorepickup) {
                    $('#afterpay-express-storepickup').val(data.instorepickup.toString());
                    initAfterpay({ pickupflag: data.instorepickup });
                }

                $('#afterpay-express-button').toggleClass('afterpay-hide', !data.apApplicable);
            }
        });
    }
}

$(document).ready(function () {
    processInclude(require('./afterpay/afterpayContent'));

    var cartTotal = '';

    $('body').on('product:afterAttributeSelect', function () {
        updatePpdWidget();
    });

    $(document).ajaxStart(function () {
        if (!$('.afterpay-widget').hasClass('loading')) {
            $('.afterpay-widget').addClass('loading');

            if ($('.afterpay-widget .cart-afterpay-message').length) {
                cartTotal = $('.grand-total').text();
            }
        }

        if (!$('#afterpay-express-url-cartstatus').hasClass('loading')) {
            $('#afterpay-express-url-cartstatus').addClass('loading');
        }
    });

    $('#afterpay-continue-finalize-button').on('click', function () {
        window.location.href = $('#afterpayurl-continuefinalize').val();
    });

    if (typeof initAfterpay === 'function') {
        if ($('#afterpay-express-pdp-button').length > 0) {
            initAfterpay({ pickupflag: 'false', commenceDelay: 200, target: '#afterpay-express-pdp-button' });
        }

        if ($('#afterpay-express-button').length > 0) {
            initAfterpay({ pickupflag: $('#afterpay-express-storepickup').val() === 'true' });
        }
    }

    $(document).ajaxComplete(function () {
        var newCartTotal = $('.grand-total').text();

        if ($('.afterpay-widget').hasClass('loading')) {
            $('.afterpay-widget').removeClass('loading');

            if ($('.afterpay-widget').length && cartTotal !== newCartTotal) {
                getWidget(null, null, 'cart-afterpay-message');
            }
        }

        // make sure we call initAfterpay after the minicart loads so checkout click will work
        if ($('.minicart #afterpay-express-button').length > 0) {
            var cnt = 0;
            var sid = setInterval(function () {
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

        // On pdp page, if a store is selected, disable buy now express checkout button.
        if ($('.store-name').length > 0) {
            $('#afterpay-express-pdp-button').addClass('afterpay-hide');
        }

        if ($('.cart-page').length > 0) {
            // Just put a loading class on the url input so this does not get called recursively
            if ($('#afterpay-express-url-cartstatus').hasClass('loading')) {
                updateStorePickupState();
                $('#afterpay-express-url-cartstatus').removeClass('loading');
            }
        }

        if ($('div').hasClass('popover popover-bottom show')) {
            if ($('#afterpay-express-url-cartstatus').hasClass('loading')) {
                updateStorePickupState();
                $('#afterpay-express-url-cartstatus').removeClass('loading');
            }
        }
    });

    // initialize
});
