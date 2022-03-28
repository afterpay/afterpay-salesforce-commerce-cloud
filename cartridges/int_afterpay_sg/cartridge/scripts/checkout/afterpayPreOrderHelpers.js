var afterpayPreOrderTools = {
    getCartSubtotal: function (basket) {
      return basket.getAdjustedMerchandizeTotalNetPrice();
    }
}

module.exports = afterpayPreOrderTools;
