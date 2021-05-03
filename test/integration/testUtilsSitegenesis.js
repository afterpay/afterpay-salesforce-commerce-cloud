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

exports.verifyShippingAddressOnShippingPage = async (page, address) => {
    const firstname = await page.$eval('input#dwfrm_singleshipping_shippingAddress_addressFields_firstName', e => { return e.value });
    const lastname = await page.$eval('input#dwfrm_singleshipping_shippingAddress_addressFields_lastName', e => { return e.value });
    const address1 = await page.$eval('input#dwfrm_singleshipping_shippingAddress_addressFields_address1', e => { return e.value });
    const city = await page.$eval('input#dwfrm_singleshipping_shippingAddress_addressFields_city', e => { return e.value });
    const zipcode = await page.$eval('input#dwfrm_singleshipping_shippingAddress_addressFields_postal', e => { return e.value });
    const state = await page.$eval('select#dwfrm_singleshipping_shippingAddress_addressFields_states_state', e => { return e.value });

    expect(firstname.trim()).to.equal(address.firstname);
    expect(lastname.trim()).to.equal(address.lastname);
    expect(address1.trim()).to.equal(address.address1);
    expect(city.trim()).to.equal(address.city);
    expect(state.trim()).to.equal(address.state);
    expect(zipcode.trim()).to.equal(address.zipcode);
}

exports.verifyShippingAddressOnThankYouPage = async (page, address) => {
    const fullname = await page.$eval('.order-shipment-address .address div:nth-child(1)', e => { return e.innerText });
    const address1 = await page.$eval('.order-shipment-address .address div:nth-child(2)', e => { return e.innerText });
    const citystatezip = await page.$eval('.order-shipment-address .address div:nth-child(3)', e => { return e.innerText });
    const country = await page.$eval('.order-shipment-address .address div:nth-child(4)', e => { return e.innerText });

    let firstname = '';
    let lastname = '';
    let found = fullname.match(/(.*) (.*)/);
    if (found) {
        firstname = found[1];
        lastname = found[2];
    }

    let city = '';
    let state = '';
    let zipcode = '';
    found = citystatezip.match(/(.*), (.*) ([0-9]+)/);
    if (found) {
        city = found[1];
        state = found[2];
        zipcode = found[3];
    }
    console.log("Address1: ", address1);

    expect(address1.trim()).to.equal(address.address1);
    expect(state.trim()).to.equal(address.state);
    expect(firstname.trim()).to.equal(address.firstname);
    expect(lastname.trim()).to.equal(address.lastname);
    expect(zipcode.trim()).to.equal(address.zipcode);
}

exports.verifyBillingAddressOnThankYouPage = async (page, address) => {
    const fullname = await page.$eval('.order-billing .mini-address-name', e => { return e.innerText });
    const fulladdress = await page.$eval('.order-billing .mini-address-location address', e => { return e.innerText });

    let firstname = '';
    let lastname = '';
    let address1 = '';
    let city = '';
    let state = '';
    let zipcode = '';

    let found = fullname.match(/(.*) (.*)/);
    if (found) {
        firstname = found[1];
        lastname = found[2];
    }

    found = fulladdress.match(/^(.*)[\r|\n](.*)[\r|\n](.*)[\r|\n](.*)/);
    if (found) {
        address1 = found[1];
        let found2 = found[2].match(/(.*), (.*) ([0-9]+)/);
        if (found2) {
            city = found2[1];
            state = found2[2];
            zipcode = found2[3];    
        }
    }
    console.log("Billing Address1: ", address1);
    console.log("Full address", fulladdress);

    expect(address1.trim()).to.equal(address.address1);
    expect(state.trim()).to.equal(address.state);
    expect(firstname.trim()).to.equal(address.firstname);
    expect(lastname.trim()).to.equal(address.lastname);
    expect(zipcode.trim()).to.equal(address.zipcode);
}

exports.getMiniBillingAmount = async (page) => {
    await page.waitForSelector('.minibillinginfo-amount');
    const checkoutPriceText = await page.$eval('.minibillinginfo-amount', e => { return e.innerHTML });
    found = checkoutPriceText.match(/\$([0-9\.]+)/);
    return found[1];
}

exports.getOrderValue = async (page) => {
    await page.waitForSelector('.checkout-order-totals .order-value');
    const checkoutPriceText = await page.$eval('.checkout-order-totals .order-value', e => { return e.innerText });
    found = checkoutPriceText.match(/\$([0-9\.]+)/);
    return found[1];
}

exports.selectShippingMethod = async (page, methodValue) => {
    let radio = await page.waitForSelector('input.input-radio[value="' + methodValue + '"]');
    await radio.click();
}

exports.popupLogin = async (popup, email, password) => {
    const emailField = await popup.waitForSelector('input[name="email"]');
    await emailField.type(email);

    await popup.click('button[type="submit"]');
    await popup.waitForTimeout(1500)
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
    // the price can take a moment to update
    await popup.waitForTimeout(500);
    const priceText1 = await popup.$eval('div.ng-binding', el => { return el.innerText });

    let found = priceText1.trim().match(/\$([0-9\.]+)/);
    return found[1];
}
