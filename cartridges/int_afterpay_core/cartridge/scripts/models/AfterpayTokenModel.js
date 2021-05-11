'use strict';

var sitePreferences = require("~/cartridge/scripts/util/AfterpayUtilities.js").getSitePreferencesUtilities();
var ctrlCartridgeName = sitePreferences.getControllerCartridgeName();
var Class 		= require(ctrlCartridgeName + '/cartridge/scripts/util/Class').Class;

var TokenModel = Class.extend({
	apToken: null
});

module.exports = TokenModel;