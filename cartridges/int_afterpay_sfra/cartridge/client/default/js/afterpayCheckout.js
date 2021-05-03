'use strict';
/* global $ */
var processInclude = require('base/util');

$(document).ready(function () {
    //processInclude(require('./afterpay/afterpayContent'));
    processInclude(require('./afterpay/customCheckout'));
});
