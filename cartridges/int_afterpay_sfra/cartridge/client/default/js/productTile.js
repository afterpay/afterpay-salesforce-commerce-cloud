'use strict';

var processInclude = require('base/util');

$(document).ready(function () {
    processInclude(require('base/productTile'));
    // Uncomment for wishlist plugin
    //processInclude(require('./product/wishlistHeart'));
    processInclude(require('./checkout/expressCheckout'));
});
