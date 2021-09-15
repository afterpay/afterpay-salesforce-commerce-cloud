function initAfterpay(settings) {
    settings = settings || {};
    let commenceDelay = settings.commenceDelay || 0;

    let pickupflag = settings.pickupflag || false;

    let target = settings.target || '#afterpay-express-button';

    let productIdSelector = settings.productIdSelector || null;
    let productQuantitySelector = settings.productQuantitySelector || null;
    AfterPay.initializeForPopup({
        countryCode: $('#afterpay-express-countrycode').val(),
        pickup: pickupflag,
        buyNow: $('#afterpay-express-buynow').val() === 'true',
        shippingOptionRequired: $('#afterpay-express-shipping-option-required').val() === 'true',
        onCommenceCheckout: function (actions) {
            var afterpayExpressTokenUrl = $('#afterpay-express-url-createtoken').val() + '?s_url=' + encodeURIComponent(window.location.href);
            // This is to support Afterpay Express from product details page. Add product to cart and checkout.
            if (productIdSelector && productQuantitySelector) {
                let p_elem = document.querySelector(productIdSelector);
                let q_elem = document.querySelector(productQuantitySelector);
                afterpayExpressTokenUrl += '&cartAction=add&pid=' + (p_elem.value || '') + '&Quantity=' + (q_elem.value || '');
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
                            afterpayCreateTokenErrorMessage = res.error;
                            alert(res.error);
                            console.log('Afterpay Express Checkout: Token Creation Failure: ', res.error);
                            actions.reject(AfterPay.CONSTANTS.SERVICE_UNAVAILABLE);
                        }
                    },
                    error: function () {
                        console.log('Afterpay Express Checkout: request failure.');
                    }
                });
            });
        },
        // NOTE: onShippingAddressChange only needed if shippingOptionRequired is true
        onShippingAddressChange: function (data, actions) {

            var shippingMetthodsUrl = $('#afterpay-express-url-getshippingmethods').val();
            $.ajax({
                type: 'POST',
                url: shippingMetthodsUrl,
                dataType: 'json',
                contentType: 'application/json',
                data: JSON.stringify({
                    countryCode: data.countryCode,
                    postcode: data.postcode,
                    state: data.state,
                    suburb: data.suburb,
                    address1: data.address1,
                    address2: data.address2,
                    area2: data.area2,
                    name: data.name,
                    phoneNumber: data.phoneNumber
                }),
                success: function (response) {
                    if (response.length == 0) {
                        actions.reject(AfterPay.CONSTANTS.SHIPPING_ADDRESS_UNSUPPORTED);
                    } else {
                        actions.resolve(response);
                    }
                },
                error: function () {
                    console.log('Afterpay Express Checkout: failure in get shipping methods');
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
    let getCartStatusUrl = $('#afterpay-express-url-cartstatus').val();
    $.ajax({
        type: 'GET',
        url: getCartStatusUrl,
        success: function (res) {
            var instorepickup = res.instorepickup;
            initAfterpay({ pickupflag: instorepickup });
        },
        error: function () {
            console.log('Afterpay Express cart status request failure.');
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
    let elements = document.querySelectorAll('.delivery-option');
    for (var i = 0; i < elements.length; i++) {
        elements[i].addEventListener('change', function () {
            if ('MutationObserver' in window) {
                let loadingElement = document.querySelector('.item-delivery-options');
                let observer = new MutationObserver(function (entries) {
                    if (!document.querySelector('.item-delivery-options.loading')) {
                        reinitializeAfterpayPopup();
                        observer.disconnect();
                    }
                });
                observer.observe(loadingElement, { attributeFilter: ['class'] });
            } else {
                // If no MutationObserver support, just use timer to poll state
                var checkLoading = setInterval(function () {
                    if (!document.querySelector('.item-delivery-options.loading')) {
                        reinitializeAfterpayPopup();
                        clearInterval(checkLoading);
                    }
                }, 500);
            }
        });
    }
}
