var assert = require('chai').assert;
var request = require('request-promise');
var config = require('../it.config');

describe('Saves afterpay payment method', function () {
    this.timeout(10000);
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
	        cookieString = cookieJar.getCookieString(myRequest.url);
	    })
	    .then(function () {
	        var cookie = request.cookie(cookieString);
	        cookieJar.setCookie(cookie, myRequest.url);
	
	        return request(myRequest);
	    });
    });
    
    it('should save afterpay payment method in payment instrument', function () {
        myRequest.url = config.baseUrl + '/AfterpayRedirect-IsAfterpay?' +
	        myRequest.csrf.tokenName + '=' +
	        myRequest.csrf.token;

        request(myRequest, function (error, response) {
        	assert.equal(response.statusCode, 200, 'Expected request statusCode to be 200');
        	
        	var bodyAsJson = JSON.parse(response.body);

            assert.isTrue(bodyAsJson.isAfterpay);
        });
    });
});
