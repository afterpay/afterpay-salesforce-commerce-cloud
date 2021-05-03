'use strict';

var BasketMgr = require('dw/order/BasketMgr');

/**
 * Validate afterpay form fields
 * @param {Object} form - the form object with pre-validated form fields
 * @returns {Object} the names of the invalid form fields
 */
function validateAfterpay(form) {
    var result = {};
    var currentBasket = BasketMgr.getCurrentBasket();

    if (!form.paymentMethod.value) {
        if (currentBasket.totalGrossPrice.value > 0) {
            result[form.paymentMethod.htmlName] =
                Resource.msg('error.no.selected.payment.method', 'creditCard', null);
        }

        return result;
    }

    return module.superModule.validateFields(form);
}

module.exports = module.superModule;
module.exports.validateAfterpay = validateAfterpay;