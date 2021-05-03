var ArrayList = require('dw/util/ArrayList');
var LogUtils = require('*/cartridge/scripts/util/afterpayLogUtils');
var Logger = LogUtils.getLogger('AfterpayTokenConflict');

/**
 *  validates the generated token to avoid duplication for the same order
 *  @param {Object} basket - basket
 *  @param {string} token - token
 *  @returns {boolean} productPresent - product Present or not
 */
function checkTokenConflict(basket, token) {
    var productPresent = false;
    var tokenValidate;
    var apItemsArray;
    var apItemsList;
    var apProductLineItem;
    var productLineItem;
    var productSku;
    var apProductSku;
    var productLineItems = basket.getAllProductLineItems().iterator();

    try {
        tokenValidate = require('*/cartridge/scripts/util/getOrderToken').validateOrderToken(token);
    } catch (exception) {
        Logger.error('Exception to getOrders service: ' + exception);

        return {
            error: true,
            errorMessage: exception
        };
    }

    apItemsArray = new ArrayList();
    apItemsArray.add(tokenValidate.items);
    apItemsList = apItemsArray.iterator();

    while (productLineItems.hasNext() || apItemsList.hasNext()) {
        productLineItem = productLineItems.hasNext() ? productLineItems.next() : '';
        apProductLineItem = apItemsList.hasNext() ? apItemsList.next() : '';
        productSku = productLineItem.productID ? productLineItem.productID : '';
        apProductSku = apProductLineItem.sku ? apProductLineItem.sku.toString() : '';

        if (productSku === apProductSku) {
            if (productLineItem.quantityValue === apProductLineItem.quantity) {
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

/*
 * Module exports
 */
module.exports = {
    checkTokenConflict: function (Basket, token) {
        return checkTokenConflict(Basket, token);
    }
};
