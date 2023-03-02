'use strict';

/* global jQuery, Resources, Urls */

var j = jQuery.noConflict();

var trans = {
    init: function () {
        if (j('.afterpay-module .operations-holder').length) {
            this.transOperationsEvents();
        }
    },
    transOperationsEvents: function () {
        j('.operations-holder button').on('click', function () {
            var button = j(this);
            var buttonLabel = button.text();
            var action = 'refund';
            var orderno = j('input[name=orderno]').val();
            var amount = j('input[name=amount]').val();
            var url;
            var postData;

            j('.operations-holder .error').text('');
            url = Urls.operationActions;
            postData = {
                action: action,
                orderno: orderno,
                amount: amount
            };

            button.prop('disabled', true);
            button.text(Resources.TRANSACTION_PROCESSING);

            j.post(url, postData, function (result) {
                button.prop('disabled', false);
                button.text(buttonLabel);

                if (result && result.status) {
                    alert(Resources.TRANSACTION_SUCCESS); // eslint-disable-line
                    window.location.reload();
                } else {
                    alert(Resources.TRANSACTION_FAILED + result.error); // eslint-disable-line
                }
            });
        });
    }
};

// initialize app
j(document).ready(function () {
    trans.init();
});
