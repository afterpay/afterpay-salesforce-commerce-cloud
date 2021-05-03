'use strict';

var server = require('server');

/**
 *  Retrieve Afterpay Terms and conditions page
 */

server.get('ShowTerms',
	server.middleware.https,
	function (req, res, next) {
    res.render('util/afterpayTerms');
    next();
});

module.exports = server.exports();
