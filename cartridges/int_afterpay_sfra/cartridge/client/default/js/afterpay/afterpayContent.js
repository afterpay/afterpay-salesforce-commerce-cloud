'use strict';

var afterpay;

/**
 * Populates afterpay popup modal
 * @param {jquery} e - jquery element
 */
function openAfterpayModal(e) {
    e.preventDefault();

    var url = $(this).prop('href');

    $.get(url, function (data) {
        if ($('#afterpayModal').length) {
            $('#afterpayModal').remove();
        }
        /* eslint-disable operator-linebreak */
        var htmlString = '<!-- Modal -->' +
            '<div class="modal fade afterpayModal" id="afterpayModal" role="dialog">' +
            '<div class="modal-dialog quick-view-dialog">' +
            '<!-- Modal content-->' +
            '<div class="modal-content">' +
            '<div class="modal-header">' +
            '    <button type="button" class="close-afterpay pull-right" data-dismiss="modal">' +
            '        <span class="close-button">&times;</span>' +
            '    </button>' +
            '</div>' +
            '<div class="modal-body">' + data + '</div>' +
            '</div>' +
            '</div>' +
            '</div>';
        /* eslint-enable operator-linebreak */
        $('body').append(htmlString);
        $('body').addClass('modal-open');
        $('#afterpayModal').addClass('show');

        $('#overview-container-circles img').on('load', function () {
            afterpay.popupVerticalCenter();
        });
    });
}

afterpay = {
    init: function () {
        $('div[itemid="#product"], .product-detail, .cart-page, .tab-content').on('click', '.afterpay-link a', openAfterpayModal);

        $('body').on('click', '#afterpayModal .modal-header button', function () {
            $('#afterpayModal').remove();
            $('body').removeClass('modal-open');
        });
    }
};

module.exports = afterpay;
