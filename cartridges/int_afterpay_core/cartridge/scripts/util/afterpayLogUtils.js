'use strict';

/*
*    Creates custom log file for the cartridge
*/

// API Includes
var Logger = require('dw/system/Logger');
var Resource = require('dw/web/Resource');

// Global Variables
var defaultLogFilePrefix = Resource.msg('log.filename', 'afterpay', null);

var LoggerUtils = {};

/**
 * Generic method for logging
 * @param {string} category - log category
 * @returns {Object} - Logger
 */
LoggerUtils.getLogger = function (category) {
    if (category) {
        return Logger.getLogger(defaultLogFilePrefix, category);
    }
    return Logger.getLogger(defaultLogFilePrefix);
};

module.exports = LoggerUtils;
