'use strict';
/* global $ */
var processInclude = require('base/util');
/**
 * Gets Widget HTML from AfterPay API
 * @param {string} updatedProductID - product ID
 * @param {number} updatedProductPrice - product price
 * @param {string} className - HTML class name
 * @param {jquery} $productContainer - DOM container for product
 */
function getWidget(updatedProductID, updatedProductPrice, className, $productContainer) {
    var getUpdatedWidgetUrl = $('.updated-widget').val();
    var queryString = '?productID=' + updatedProductID + '&updatedProductPrice=' + updatedProductPrice + '&className=' + className;
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
        }
    });
}

$(document).ready(function () {
    processInclude(require('./afterpay/afterpayContent'));

    var cartTotal;

    $(document).ajaxStart(function () {
        if (!$('.afterpay-widget').hasClass('loading')) {
            $('.afterpay-widget').addClass('loading');

            if ($('.afterpay-widget .cart-afterpay-message').length) {
                cartTotal = $('.grand-total').text();
            }
        }
    });

    $(document).ajaxComplete(function () {
        var newCartTotal = $('.grand-total').text();

        if ($('.afterpay-widget').hasClass('loading')) {
            $('.afterpay-widget').removeClass('loading');

            if ($('.afterpay-widget .cart-afterpay-message').length && cartTotal !== newCartTotal) {
                getWidget(null, null, 'cart-afterpay-message');
            }

            if ($('.afterpay-widget .pdp-afterpay-message').length) {
                var productID = $('.product-id').text();
                var productPrice = $('.prices-add-to-cart-actions .prices .price .sales .value').attr('content');
                var productContainer = $('.product-detail');

                getWidget(productID, productPrice, 'pdp-afterpay-message', productContainer);
            }
        }
    });
});
