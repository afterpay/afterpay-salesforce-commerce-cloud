const { expect } = require("chai");

exports.user = {
    email: 'tim@abcdef.com',
    password: 'test!2345'
}

exports.accountAddress1 = {
    firstname: 'Tim',
    lastname: 'User',
    address1: '1500 Sherburne Hills Rd',
    state: 'CA',
    city: 'Danville',
    zipcode: '94506',
    phone: '4152222226'
};

exports.accountAddress3 = {
    firstname: 'Tim',
    lastname: 'User',
    address1: '2628 Waiwai Loop',
    state: 'HI',
    city: 'Honolulu',
    zipcode: '96819',
    phone: '4152222227'
}

exports.store2 = {
    firstname: 'Super Electronics',
    lastname: '',
    address1: '110 Smith St',
    city: 'Providence',
    state: 'RI',
    zipcode: '02903'
}

// Does a search from the search bar and clicks on the first item in the
// result list returned
exports.navigateToItem = async (page, searchTerm) => {
    let searchInput = await page.waitForSelector('.search input[name="q"]');
    await searchInput.type(searchTerm);
    await page.keyboard.press('Enter');
    let pdpLink = await page.waitForSelector('.pdp-link a');
    await pdpLink.click();
}

exports.selectStore = async (page, zipcode, storeValue) => {
    let selectStoreButton = await page.waitForSelector('button.btn-get-in-store-inventory');
    await selectStoreButton.click();

    let zipcodeInput = await page.waitForSelector('input#store-postal-code');
    await zipcodeInput.type(zipcode);

    let searchButton = await page.waitForSelector('button.btn-storelocator-search');
    await searchButton.click();

    let radioButton = await page.waitForSelector('input[type="radio"][value="' + storeValue + '"]');
    await radioButton.click();

    let selectStoreButton2 = await page.waitForSelector('button.select-store:not([disabled])');
    await selectStoreButton2.click();
}
exports.getGrandTotalFromCart = async (page) => {
    await page.waitForSelector('.grand-total');
    const grandTotal = await page.$eval('.grand-total', e => e.innerText);
    let found = grandTotal.match(/\$([0-9\.]+)/);
    return found[1];
}

exports.getGrandTotalFromCheckout = async (page) => {
    await page.waitForSelector('.grand-total-sum');
    const grandTotal = await page.$eval('.grand-total-sum', e => e.innerText);
    let found = grandTotal.match(/\$([0-9\.]+)/);
    return found[1];
}

exports.verifyShippingAddressOnShippingPage = async (page, address) => {
    const firstname = await page.$eval('#shippingFirstNamedefault', e => e.value);
    expect(firstname).to.equal(address.firstname);
    const lastname = await page.$eval('#shippingLastNamedefault', e => e.value);
    expect(lastname).to.equal(address.lastname);
    const address1 = await page.$eval('#shippingAddressOnedefault', e => e.value);
    expect(address1).to.equal(address.address1);
    const city = await page.$eval('#shippingAddressCitydefault', e => e.value);
    expect(city).to.equal(address.city);
    const state = await page.$eval('#shippingStatedefault', e => e.value);
    expect(state).to.equal(address.state);
    const zipcode = await page.$eval('#shippingZipCodedefault', e => e.value);
    expect(zipcode).to.equal(address.zipcode);
}

exports.verifyShippingAddressOnThankYouPage = async (page, address, storepickup = false) => {
    const firstname = await page.$eval('div.shipping .firstName', e => { return e.innerHTML });
    const lastname = await page.$eval('div.shipping .lastName', e => { return e.innerHTML });
    const address1 = await page.$eval('div.shipping .address1', e => { return e.innerHTML });
    const state1 = await page.$eval('div.shipping .stateCode', e => { return e.innerHTML });
    const zipcode = await page.$eval('div.shipping .postalCode', e => { return e.innerHTML });

    if (storepickup) {
        let storename = firstname.trim() + " " + lastname.trim();
        expect(storename.trim()).to.equal(address.firstname);
    }
    else {
        expect(firstname.trim()).to.equal(address.firstname);
        expect(lastname.trim()).to.equal(address.lastname);
    }
    expect(address1.trim()).to.equal(address.address1);
    expect(state1.trim()).to.equal(address.state);
    expect(zipcode.trim()).to.equal(address.zipcode);
}

exports.verifyBillingAddressOnThankYouPage = async (page, address, storepickup = false) => {
    const firstname = await page.$eval('div.billing .firstName', e => { return e.innerHTML });
    const lastname = await page.$eval('div.billing .lastName', e => { return e.innerHTML });
    const address1 = await page.$eval('div.billing .address1', e => { return e.innerHTML });
    const state1 = await page.$eval('div.billing .stateCode', e => { return e.innerHTML });
    const zipcode = await page.$eval('div.billing .postalCode', e => { return e.innerHTML });

    if (storepickup) {
        let storename = firstname.trim() + " " + lastname.trim();
        expect(storename.trim()).to.equal(address.firstname);
    }
    else {
        expect(firstname.trim()).to.equal(address.firstname);
        expect(lastname.trim()).to.equal(address.lastname);
    }
    expect(address1.trim()).to.equal(address.address1);
    expect(state1.trim()).to.equal(address.state);
    expect(zipcode.trim()).to.equal(address.zipcode);
}

exports.verifyStorePickupAddressInPopup = async (popup, address) => {
    const storeName = await popup.$eval('shipping-address div.shipping-address__body div:nth-child(1) span:nth-child(1)', e => {return e.innerText});
    const storeAddress = await popup.$eval('shipping-address div.shipping-address__body div:nth-child(1) span:nth-child(2)', e => {return e.innerText});

    let city = '';
    let state = '';
    let zipcode = '';
    let address1 = '';

    let found = storeAddress.match(/(.*),\s*(\S+)\s+(\S+)\s+([0-9]+)/);
    if (found) {
        address1 = found[1];
        city = found[2];
        state = found[3];
        zipcode = found[4];
    }
    // parse
    expect(storeName.trim()).to.equal(address.firstname);
    expect(address1.trim()).to.equal(address.address1);
    expect(city.trim()).to.equal(address.city);
    expect(state.trim()).to.equal(address.state);
    expect(zipcode.trim()).to.equal(address.zipcode);
}

exports.popupLogin = async (popup, email, password) => {
    const emailField = await popup.waitForSelector('input[name="email"]');
    await emailField.type(email);

    await popup.click('button[type="submit"]');
    await popup.waitForTimeout(500)
    const pwField = await popup.$('input[name="password"]');
    await pwField.type(password);
    await popup.waitForTimeout(500)

    // press submit button after pw entered
    const confirmButton = await popup.waitForSelector('button[automation_id="button-submit"]');
    await confirmButton.click();
}

exports.popupCountNumberShipOptions = async (popup) => {
    // Count the number of shipping options on the EC popup.
    let numShipOptions = (await popup.$$('div > label input[type="radio"]')).length;
    return numShipOptions;
}

exports.popupClickOnShippingOption = async (popup, index) => {
    // Click on the first shipping option
    await popup.waitForSelector('div > label:nth-child(' + index + ') input[type="radio"]');
    await popup.$eval('div > label:nth-child(' + index + ') input[type="radio"]', e => e.click());
}

exports.popupGetTotalPrice = async (popup) => {
    // Grab the price
    await popup.waitForSelector('div.ng-binding');
    const priceText1 = await popup.$eval('div.ng-binding', el => { return el.innerHTML });
    //console.log("Price: ", priceText1);

    let found = priceText1.match(/\$([0-9\.]+)/);
    return found[1];
}

