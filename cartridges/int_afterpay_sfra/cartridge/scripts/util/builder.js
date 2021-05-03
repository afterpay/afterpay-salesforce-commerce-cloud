'use strict';
(function () {
    /**
     *  builder class to build all request params
     */
    var Builder = function () {};

    var log = function (name) {
        return 'Abstract method "' + name + '" must be override';
    };

    Builder.prototype.buildRequest = function () {
        throw new Error(log('buildRequest'));
    };

    Builder.prototype.get = function () {
        throw new Error(log('get'));
    };

    module.exports = Builder;
}());
