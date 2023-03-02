function initAfterpay(settings) {
    settings = settings || {};
    var commenceDelay = settings.commenceDelay || 0;

    var pickupflag = settings.pickupflag || false;

    var target = settings.target || '#afterpay-express-button';

    var productIdSelector = settings.productIdSelector || null;
    var productQuantitySelector = settings.productQuantitySelector || null;
    var afterpayCreateTokenErrorMessage = '';
    AfterPay.initializeForPopup({
        countryCode: $('#afterpay-express-countrycode').val(),
        pickup: pickupflag,
        buyNow: $('#afterpay-express-buynow').val() === 'true',
        shippingOptionRequired: $('#afterpay-express-shipping-option-required').val() === 'true',
        onCommenceCheckout: function (actions) {
            var getShippingOptionUrl = $('#afterpay-express-url-shippingrequired').val();
            if (getShippingOptionUrl) {
                $.ajax({
                    url: getShippingOptionUrl,
                    method: 'GET',
                    success: function (data) {
                        if (data.shipmentType) {
                            if (data.shipmentType == 'SplitShipment' || data.shipmentType == 'MultiplePickup') {
                                AfterPay.shippingOptionRequired = false;
                            }
                        }

                        var afterpayExpressTokenUrl = $('#afterpay-express-url-createtoken').val() + '?s_url=' + encodeURIComponent(window.location.href);
                        // This is to support Afterpay Express from product details page. Add product to cart and checkout.
                        if (productIdSelector && productQuantitySelector) {
                            var p_elem = document.querySelector(productIdSelector);
                            var q_elem = document.querySelector(productQuantitySelector);
                            afterpayExpressTokenUrl += '&cartAction=add&pid=' + (p_elem.innerText || '') + '&Quantity=' + (q_elem.value || '');
                        }            

                        var currentLocation = window.location.href;
                        sleep(commenceDelay).then(() => {
                            $.ajax({
                                type: 'GET',
                                url: afterpayExpressTokenUrl,
                                success: function (res) {
                                    if (res.status == 'SUCCESS') {
                                        var afterpaytoken = res.token.apToken;
                                        actions.resolve(afterpaytoken);
                                    } else {
                                        alert(res.error);
                                        actions.reject(AfterPay.CONSTANTS.SERVICE_UNAVAILABLE);
                                    }
                                },
                                error: function () {
                                    alert('Afterpay payment failed.');
                                }
                            });
                        });
                        
                    },
                    error: function () {
                        alert('Afterpay payment failed.');
                    }
                });
            }
        },
        // NOTE: onShippingAddressChange only needed if shippingOptionRequired is true
        onShippingAddressChange: function (data, actions) {
            var shippingMetthodsUrl = $('#afterpay-express-url-getshippingmethods').val();
            $.ajax({
                type: 'POST',
                url: shippingMetthodsUrl,
                data: {
                    countryCode: data.countryCode,
                    postcode: data.postcode,
                    state: data.state,
                    suburb: data.suburb,
                    address1: data.address1,
                    address2: data.address2,
                    area2: data.area2,
                    name: data.name,
                    phoneNumber: data.phoneNumber
                },
                success: function (response) {
                        // Need to handle case where address is unsupported/invalid
                    if (!response.shipmethods || response.shipmethods.length == 0) {
                        actions.reject(AfterPay.CONSTANTS.SHIPPING_ADDRESS_UNSUPPORTED);
                    } else {
                        actions.resolve(response.shipmethods);
                    }
                },
                error: function () {
                    alert('Afterpay payment failed.');
                }
            });
        },
        onComplete: function (event) {
            if (event.data.status == 'SUCCESS') {
                var afterpayExpressProcessUrl = $('#afterpay-express-url-processorder').val() + '?orderToken=' + event.data.orderToken + '&merchantReference=' + event.data.merchantReference;
                $(location).attr('href', afterpayExpressProcessUrl);
            } else {
                var errorUrl = $('#afterpay-express-url-cancelorder').val() + '?orderToken=' + event.data.orderToken + '&merchantReference=' + event.data.merchantReference;
                $(location).attr('href', errorUrl);
            }
        },
        target: target || '#afterpay-express-button'
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Reinitialize the Afterpay popup by first doing an ajax
// call to the server to determine eligibility for Afterpay Express
// and calling initAfterpay with the setting
function reinitializeAfterpayPopup() {
    var getCartStatusUrl = $('#afterpay-express-url-cartstatus').val();
    $.ajax({
        type: 'GET',
        url: getCartStatusUrl,
        success: function (res) {
            var instorepickup = res.instorepickup;
            initAfterpay(instorepickup);
        },
        error: function () {
            alert('Afterpay payment failed.');
        }
    });
}

/**
 * Listens for changes in the home delivery vs in-store pickup radio button toggle.
 * Once any toggle happens, we want to wait for the "loading" widget to disappear
 * and then call reinitializeAfterpayPopup().
 *
 * The "loading" is controlled by the existence of the "loading" class on
 * .item-delivery-options, so wait for that to disappear.
 */
function initializeDeliveryOptionChangeListener() {
    var elements = document.querySelectorAll('.delivery-option');
    for (var i = 0; i < elements.length; i++) {
        elements[i].addEventListener('change', function () {
            var loadingElement = document.querySelector('.item-delivery-options');
            var observer = new MutationObserver(function (entries) {
                if (!document.querySelector('.item-delivery-options.loading')) {
                    reinitializeAfterpayPopup();
                    observer.disconnect();
                }
            });
            observer.observe(loadingElement, { attributeFilter: ['class'] });
        });
    }
}

