'use strict';

var server = require('server');
var cache = require('*/cartridge/scripts/middleware/cache');
var apBrandUtilities = require('*/cartridge/scripts/util/afterpayUtilities').brandUtilities;
var thresholdUtilities = require('*/cartridge/scripts/util/thresholdUtilities');
var Page = module.superModule;
server.extend(Page);

server.append(
    'SetLocale',
    function (req, res, next) {
        apBrandUtilities.initBrand(request.locale);
        var brand = apBrandUtilities.getBrand();
        thresholdUtilities.getThresholdAmounts(brand);

        return next();
    }
);

server.append(
    'Include',
    server.middleware.include,
    cache.applyDefaultCache,
    function (req, res, next) {
        apBrandUtilities.initBrand(request.locale);
        var brand = apBrandUtilities.getBrand();
        thresholdUtilities.getThresholdAmounts(brand);

        return next();
    }
);

module.exports = server.exports();
