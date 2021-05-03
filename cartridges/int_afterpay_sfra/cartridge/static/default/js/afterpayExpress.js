function initAfterpay(settings) {
    settings = settings || {};
    let commenceDelay = settings.commenceDelay || 0;

    let pickupflag = settings.pickupflag || false;

    let target = settings.target || "#afterpay-express-button";

    let productIdSelector = settings.productIdSelector || null;
    let productQuantitySelector = settings.productQuantitySelector || null;
    let afterpayCreateTokenErrorMessage = '';
    AfterPay.initializeForPopup({
        countryCode: $('#afterpay-express-countrycode').val(),
        pickup: pickupflag,
        buyNow: $('#afterpay-express-buynow').val() === "true",
        shippingOptionRequired: $('#afterpay-express-shipping-option-required').val() === "true",
        onCommenceCheckout: function(actions) {
            console.log('onCommenceCheckout(). Actions=', actions);
            var afterpayExpressTokenUrl = $('#afterpay-express-url-createtoken').val() + "?s_url=" + encodeURIComponent(window.location.href);
            // This is to support Afterpay Express from product details page. Add product to cart and checkout.
            if (productIdSelector && productQuantitySelector) {
                let p_elem = document.querySelector(productIdSelector);
                let q_elem = document.querySelector(productQuantitySelector);
                afterpayExpressTokenUrl += "&cartAction=add&pid=" + (p_elem.innerText || "") + "&Quantity=" + (q_elem.value || "");
            }

            //var afterpayExpressTokenUrl = $('#afterpay-express-url-createtoken').val() + "?s_url=" + encodeURIComponent(window.location.href + "&format=ajax&Quantity=1&cartAction=add&pid=640188017003");
            console.log("onCommenceCheckout(). TokenUrl: ", afterpayExpressTokenUrl);
            var currentLocation = window.location.href;
            sleep(commenceDelay).then(() => {
                $.ajax({
                    type: 'GET',
                    url: afterpayExpressTokenUrl,
                    success: function(res) {
                        if (res.status == 'SUCCESS') {
                            console.log("Result of CreateToken: ", res);
                            //var afterpaytoken = res.response.afterpaytoken;
                            var afterpaytoken = res.token.apToken;
                            console.log("Got token from afterpay: ", afterpaytoken);
                            actions.resolve(afterpaytoken);
                        }
                        else {
                            alert(res.error);
                            console.log("Afterpay Express Checkout: Token Creation Failure: ", res.error);
                            actions.reject(AfterPay.CONSTANTS.SERVICE_UNAVAILABLE);
                        }
                    },
                    error: function(){
                        console.log("Afterpay Express Checkout: request failure.");
                    }
                });
            });
        },
        // NOTE: onShippingAddressChange only needed if shippingOptionRequired is true
        onShippingAddressChange: function(data, actions) {
            console.log("onShippingAddressChange called. data=",data);
            if (data.countryCode && data.countryCode !== "US") {
                actions.reject(AfterPay.CONSTANTS.SHIPPING_ADDRESS_UNSUPPORTED);
            } else {
                var shippingMetthodsUrl = $('#afterpay-express-url-getshippingmethods').val();
                console.log("Calling this to get shipping methods: " + shippingMetthodsUrl);
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
                    success: function(response) {
                        console.log("shipping method computed successfully. Returning data to Afterpay portal via resolve. shippingMethods=", response);
                        // Need to handle case where address is unsupported/invalid
                        if (!response.shipmethods || response.shipmethods.length == 0) {
                            actions.reject(AfterPay.CONSTANTS.SHIPPING_ADDRESS_UNSUPPORTED);
                        }
                        else {
                            actions.resolve(response.shipmethods);
                        }
                    },
                    error: function(){
                        console.log('Afterpay Express Checkout: failure in get shipping methods');
                    }
                });
            }
        },
        onComplete: function(event) {
            if (event.data.status == "SUCCESS") {
                console.log("onComplete called with SUCCESS");
                console.log(event.data);
                var afterpayExpressProcessUrl = $('#afterpay-express-url-processorder').val() + "?orderToken=" + event.data.orderToken + "&merchantReference=" + event.data.merchantReference;
                $(location).attr('href', afterpayExpressProcessUrl);
            } else {
                console.log("onComplete failed");
                console.log(event.data);
                var errorUrl = $('#afterpay-express-url-cancelorder').val() + "?orderToken=" + event.data.orderToken + "&merchantReference=" + event.data.merchantReference;
                $(location).attr('href', errorUrl);    
            }
        },
        target: target ? target : "#afterpay-express-button"
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
        success: function(res) {
            var instorepickup = res.instorepickup;
            console.log("Instorepickup setting: ", instorepickup);
            initAfterpay(instorepickup);
        },
        error: function(){
            console.log("Afterpay Express cart status request failure.");
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
    let elements = document.querySelectorAll(".delivery-option");
    for (var i = 0; i < elements.length; i++) {
        elements[i].addEventListener("change", function() {
            let loadingElement = document.querySelector(".item-delivery-options");
            let observer = new MutationObserver(function(entries) {
                if (!document.querySelector(".item-delivery-options.loading")) {
                    reinitializeAfterpayPopup();                    
                    observer.disconnect();
                }
            });
            observer.observe(loadingElement, {attributeFilter: ['class']});
        });
    }
}
