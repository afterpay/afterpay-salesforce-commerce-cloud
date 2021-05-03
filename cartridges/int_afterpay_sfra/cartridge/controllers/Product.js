'use strict';
/* global empty */

var server = require('server');

var Product = module.superModule;
server.extend(Product);


/**
* prepends Product-Show method to show afterpay widget
*/
server.append('Show', function (req, res, next) {
    var sitePreferences = require('*/cartridge/scripts/util/afterpayUtilities').sitePreferencesUtilities;
    var afterpayEnable = sitePreferences.isAfterpayEnabled();

    if (afterpayEnable) {
        require('*/cartridge/scripts/util/afterpayCallThreshold.js').setThreshold();
    }
    var productTileParams = res.getViewData();
    var priceContext;
    priceContext = require('*/cartridge/scripts/util/getTemplateSpecificWidget').getWidgetData(productTileParams.product, 'pdp-afterpay-message');
    res.setViewData(priceContext);
    next();
});

/**
* appends Product-Variation method to to retrieve the selected variation
*/
server.append('Variation', function (req, res, next) {
    var params = req.querystring;
    var variationSelected = false;
    if (params.variables && !empty(params.variables.color.value)) {
        variationSelected = true;
    }
    res.json({
        variationSelected: variationSelected
    });

    next();
});


module.exports = server.exports();
