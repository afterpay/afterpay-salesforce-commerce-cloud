/**
*
* Controller to show the Afterpay terms and conditions
*/

'use strict';
/* Global variables */
var sitePreferences = require('*/cartridge/scripts/util/afterpayUtilities.js').getSitePreferencesUtilities();
var ctrlCartridgeName = sitePreferences.getControllerCartridgeName();

/* API Includes */
var app = require(ctrlCartridgeName + '/cartridge/scripts/app');
var guard = require(ctrlCartridgeName + '/cartridge/scripts/guard');


/**
 * Redirects to the Afterpay terms and conditions widget
 */
function showTerms() {
    app.getView().render('product/components/afterpayterms');
}


/* Web exposed methods */

/** Displays the afterpay terms and conditions pop up.
 * @see {@link module:controllers/AfterpayTerms~showTerms} */
exports.ShowTerms = guard.ensure(['get'], showTerms);
