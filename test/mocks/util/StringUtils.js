'use strict';

function format(format, args) {
    var formattedString = format + args;	
	return formattedString;	
}

function formatMoney(args) {
    var formattedString = args;	
	return formattedString;	
}

module.exports = {
    format: format,
    formatMoney:formatMoney
};