'use strict';

var server = require('server');

var Tile = module.superModule;
server.extend(Tile);

server.append('Show', function (req, res, next) {
    var productTileParams = res.getViewData();
    var priceContext;

    priceContext = require('*/cartridge/scripts/util/getTemplateSpecificWidget').getWidgetData(
        productTileParams.product,
        'plp-afterpay-message',
        req.session.currency.currencyCode,
        req.locale.id
    );

    res.setViewData(priceContext);
    next();
});

module.exports = server.exports();
