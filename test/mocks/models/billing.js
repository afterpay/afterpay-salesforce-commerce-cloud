'use strict';

var proxyquire = require('proxyquire').noCallThru().noPreserveCache();

function proxyModel() {
    return proxyquire('../../../../storefront-reference-architecture-master/cartridges/app_storefront_base/cartridge/models/billing', {});
}

module.exports = proxyModel();
