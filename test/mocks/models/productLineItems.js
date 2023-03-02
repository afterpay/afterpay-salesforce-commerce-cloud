'use strict';

var proxyquire = require('proxyquire').noCallThru().noPreserveCache();
var collections = require('../util/collections');
var urlUtilsMock = require('../dw/web/URLUtils');
var resourceMock = require('../dw/web/Resource');

function proxyModel() {
    return proxyquire('../../../../storefront-reference-architecture-master/cartridges/app_storefront_base/cartridge/models/productLineItems', {
        '*/cartridge/scripts/util/collections': collections,
        '*/cartridge/scripts/factories/product': {
            get: function () {
                return { bonusProducts: null, bonusProductLineItemUUID: null };
            }
        },
        'dw/web/URLUtils': urlUtilsMock,
        'dw/web/Resource': resourceMock
    });
}

module.exports = proxyModel();
