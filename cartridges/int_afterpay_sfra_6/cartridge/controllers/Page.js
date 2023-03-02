'use strict';

var server = require('server');

var Page = module.superModule;
server.extend(Page);

server.append(
    'SetLocale',
    function (req, res, next) {
        var apBrandUtilities = require('*/cartridge/scripts/util/afterpayUtilities').brandUtilities;

        apBrandUtilities.initBrand(req.querystring.code);

        return next();
    }
);

module.exports = server.exports();
