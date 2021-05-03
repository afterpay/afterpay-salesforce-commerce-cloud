var assert = require('chai').assert;
var request = require('request-promise');
var config = require('../it.config');

describe('Retrieves the selected variation flag', function () {
    this.timeout(5000);
    
    var myRequest = {
        url: config.baseUrl + '/Product-Variation?dwvar_25688608M_color=JJ2RRXX&pid=25688608M&quantity=1',
        method: 'GET',
        resolveWithFullResponse: true
    };
    
    it('should retrieve the flag true if variation is selected', function () {
        request(myRequest, function (error, response) {
        	assert.equal(response.statusCode, 200, 'Expected request statusCode to be 200');
        	var bodyAsJson = JSON.parse(response.body);
            assert.isTrue(bodyAsJson.variationSelected);
        });
    });
});
