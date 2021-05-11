'use strict';

var sitePreferences = require("~/cartridge/scripts/util/AfterpayUtilities").getSitePreferencesUtilities();
var Class = require('~/cartridge/scripts/util/Class').Class;

var PreapprovalModel = Class.extend({
	apToken: null,
	status : null
});

module.exports = PreapprovalModel;