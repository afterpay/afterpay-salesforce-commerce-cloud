var assert = require('chai').assert;
var request = require('request-promise');
var expect = require('chai').expect;
var config = require('../it.config');

describe('Handles payment and billing form submission', function () {
	this.timeout(15000);
    var cookieJar = request.jar();
    
    var myRequest = {
        url: '',
        method: 'POST',
        rejectUnauthorized: false,
        resolveWithFullResponse: true,
        jar: cookieJar,
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        },
        csrf: {
        	tokenName: '',
        	token: ''
        }
    };
    before(function () {
    	myRequest.url = config.baseUrl + '/CSRF-Generate';
        myRequest.form = {};
        return request(myRequest)
        .then(function (csrfResponse) {
        	var csrfJsonResponse = JSON.parse(csrfResponse.body);
        	myRequest.csrf.tokenName = csrfJsonResponse.csrf.tokenName;
        	myRequest.csrf.token = csrfJsonResponse.csrf.token;
        	myRequest.url = config.baseUrl + '/Cart-AddProduct';
            myRequest.form = {
                pid: '701644257958M',
                quantity: 1
            };
            return request(myRequest);
        })
        .then(function () {
        	myRequest.url = config.baseUrl + '/CheckoutShippingServices-UpdateShippingMethodsList';
            myRequest.form = {
                stateCode: 'SA',
                postalCode: '2055'
            };
            return request(myRequest);
        })
        .then(function () {
            myRequest.url = config.baseUrl + '/CheckoutShippingServices-SubmitShipping?' +
            	myRequest.csrf.tokenName + '=' +
            	myRequest.csrf.token;
            it(myRequest.url, function(){});
            myRequest.form = {
                dwfrm_shipping_shippingAddress_addressFields_firstName: 'John',
                dwfrm_shipping_shippingAddress_addressFields_lastName: 'Smith',
                dwfrm_shipping_shippingAddress_addressFields_address1: '10 main St',
                dwfrm_shipping_shippingAddress_addressFields_country: 'au',
                dwfrm_shipping_shippingAddress_addressFields_states_stateCode: 'SA',
                dwfrm_shipping_shippingAddress_addressFields_city: 'Sydney',
                dwfrm_shipping_shippingAddress_addressFields_postalCode: '2055',
                dwfrm_shipping_shippingAddress_addressFields_phone: '0261486630',
                dwfrm_shipping_shippingAddress_shippingMethodID: 'AU01'
            };
            return request(myRequest);
        });
    });
    
    it('should handle payment and billing form submission', function () {
    	myRequest.url = config.baseUrl + '/CheckoutServices-SubmitPayment?' +
	    	myRequest.csrf.tokenName + '=' +
	    	myRequest.csrf.token;
	    it(myRequest.url, function(){});
	    myRequest.form = {
	        dwfrm_billing_addressFields_firstName: 'John',
	        dwfrm_billing_addressFields_lastName: 'Smith',
	        dwfrm_billing_addressFields_address1: '10 main St',
	        dwfrm_billing_addressFields_address2: '',
	        dwfrm_billing_addressFields_country: 'au',
	        dwfrm_billing_addressFields_states_stateCode: 'SA',
	        dwfrm_billing_addressFields_city: 'Sydney',
	        dwfrm_billing_addressFields_postalCode: '2055',
	        dwfrm_billing_paymentMethod: 'AFTERPAY_PBI',
	        dwfrm_billing_contactInfoFields_email: 'blahblah@gmail.com',
	        dwfrm_billing_afterpayFields_afterpayEmail: 'blahblah@gmail.com',
	        dwfrm_billing_addressFields_phone: '0261486630',
	        dwfrm_billing_contactInfoFields_phone: '0261486630'
	    };
        return request(myRequest, function (error, response) {
        	assert.equal(response.statusCode, 200, 'Expected request statusCode to be 200');
        	var bodyAsJson = JSON.parse(response.body);
        	expect(bodyAsJson).to.be.boolean;
        });
    });
});
