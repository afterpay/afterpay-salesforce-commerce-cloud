'use strict';
var ArrayList = require('dw/util/ArrayList');
var collections = require('*/cartridge/scripts/util/collections');

var LogUtils = require('*/cartridge/scripts/util/afterpayLogUtils');
var Logger = LogUtils.getLogger('AfterpayTokenConflict');

/**
 * removes bundled items
 * @param {Object} basket - basket
 * @returns {Object} - product list
 */
function removeBundledItems(basket) {
    var filteredProductsList = [];

    collections.forEach(basket.productLineItems, function (item) {
        var product = item.product;
        var bundledProduct = product && product.bundled ? product.bundled : false;
        var optionalProduct = item.optionProductLineItem ? item.optionProductLineItem : false;
        if (!bundledProduct && !optionalProduct) {
            filteredProductsList.push(item);
        }
    });
    return filteredProductsList;
}

/**
* validates the generated token to avoid duplication for the same order
* @param {Object} basket - basket
* @param {string} token - token
* @returns {boolean} - product present or not
*/
function checkTokenConflict(basket, token) {
    var productPresent = false;
    var tokenValidate;
    var apItemsArray;
    var apItemsList;
    var productLineItems;
    var apProductLineItem;
    var productLineItem;
    var productSku;
    var apProductSku;
    try {
        tokenValidate = require('*/cartridge/scripts/util/getOrderToken').validateOrderToken(token);
    } catch (exception) {
        Logger.error('Exception to getOrders service: ' + exception);
        return {
            error: true,
            errorMessage: exception
        };
    }
    productLineItems = removeBundledItems(basket);
    productLineItems = new ArrayList(productLineItems);
    productLineItems = productLineItems.iterator();
    apItemsArray = new ArrayList(tokenValidate.items);
    apItemsList = apItemsArray.iterator();
    while (productLineItems.hasNext() || apItemsList.hasNext()) {
        productLineItem = productLineItems.hasNext() ? productLineItems.next() : '';
        apProductLineItem = apItemsList.hasNext() ? apItemsList.next() : '';
        productSku = productLineItem.productID ? productLineItem.productID : '';
        apProductSku = apProductLineItem.sku ? apProductLineItem.sku.toString() : '';
        if (productSku === apProductSku) {
            if (productLineItem.quantity.value === apProductLineItem.quantity) {
                productPresent = true;
            } else {
                productPresent = false;
            }
        } else {
            productPresent = false;
        }
    }
    return productPresent;
}

module.exports = {
    checkTokenConflict: checkTokenConflict,
    removeBundledItems: removeBundledItems
};
