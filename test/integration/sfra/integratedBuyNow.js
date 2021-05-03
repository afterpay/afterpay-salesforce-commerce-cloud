var assert = require('chai').assert;
const puppeteer = require('puppeteer');
const { expect } = require('chai');
const _ = require('lodash');
var request = require('request-promise');
var config = require('../it.config');
const globalVariables = _.pick(global, ['browser', 'expect']);
const ecUtils = require('../testUtilsSfra');

// puppeteer options
const opts = {
    headless: false,
    slowMo: 100,
    timeout: 30000
};

var accountAddress1 = {
    firstname: 'Tim',
    lastname: 'User',
    address1: '1500 Sherburne Hills Rd',
    state: 'CA',
    city: 'Danville',
    zipcode: '94506',
    phone: '4152222226'
};

// expose variables
before (async function () {
    global.expect = expect;
    global.browser = await puppeteer.launch(opts);
});
  
// close browser and reset global variables
after (function () {
//    browser.close();
    global.browser = globalVariables.browser;
    global.expect = globalVariables.expect;
});
  
describe('sample test', function () {
    it('should work', async function () {
        console.log(await browser.version());
        expect(true).to.be.true;
    }).timeout(10000);
});


describe('Integrated BuyNow', function () {
    this.timeout(0);
    let page;
    let homeUrl = config.sfraBaseUrl;
    let firstTotalPrice = 0;
    let secondTotalPrice = 0;
    let thirdTotalPrice = 0;


    before (async function () {
        page = await browser.newPage();
        await page.goto(homeUrl);
    });
    
    after (async function () {
        //await page.close();
    })

    /**
     * Buy an item. After express checkout, change the shipping method, thus the cost will change as well.
     */
  it('Main home page', async function () {
    await page.waitForSelector('button.affirm');
    await page.click('button.affirm');
    //await page.waitFor('#electronics-gps-units');
    //await page.click('#electronics-gps-units');
    await page.waitForSelector('a.link');
    await page.click('a.link');
    await page.waitForSelector('#afterpay-express-pdp-button');

    messaging = await page.$eval('.afterpay-widget-message', e => e.innerText);
    expect(messaging).to.contain('or 4 payments of');

    const newPagePromise = new Promise(x => page.once('popup', x));

    await page.click('#afterpay-express-pdp-button');
    const apCheckout = await newPagePromise;
    await ecUtils.popupLogin(apCheckout, ecUtils.user.email, ecUtils.user.password);

    // Click on confirm button when first installment amount is shown
    const gotItButton = await apCheckout.waitForSelector('button[automation_id="button-confirmPaymentUpFront');
    await gotItButton.click();

    // Give the price time to update
    await page.waitForTimeout(2000)

    let numShipOptions = await ecUtils.popupCountNumberShipOptions(apCheckout);
    expect(numShipOptions).to.be.equal(3);

    await ecUtils.popupClickOnShippingOption(apCheckout, 1);

    // Give the price time to update
    await page.waitForTimeout(2000);

    let totalPrice = await ecUtils.popupGetTotalPrice(apCheckout);
    expect(totalPrice).to.equal('57.74');

    await ecUtils.popupClickOnShippingOption(apCheckout, 2);

    // Give the price time to update
    await page.waitForTimeout(2000);

    totalPrice = await ecUtils.popupGetTotalPrice(apCheckout);
    expect(totalPrice).to.equal('61.94');

    // Click the change address button
    const changeAddressButton = await apCheckout.waitForSelector('button[content-key="checkout.action.change"]');
    await changeAddressButton.click();

    // Choose the third address, which is a HI address
    await apCheckout.waitForSelector('div.drawer__body > div[role="button"]:nth-child(3)');
    await page.waitForTimeout(1000)

    const addressOption3 = await apCheckout.waitForSelector('div.drawer__body > div[role="button"]:nth-child(3)');
    //console.log("Option 3: ", addressOption3);
    await addressOption3.click();

    // Wait for new shipping options to appear again:
    await page.waitForTimeout(2000)

    // HI should only have 1 shipping option
    numShipOptions = await ecUtils.popupCountNumberShipOptions(apCheckout);
    expect(numShipOptions).to.be.equal(1);

    // Select first (and only) shipping option
    await ecUtils.popupClickOnShippingOption(apCheckout, 1);
    // Give the price time to update
    await page.waitForTimeout(2000)

    totalPrice = await ecUtils.popupGetTotalPrice(apCheckout);
    expect(totalPrice).to.equal('69.29');


    const confirmAgreement = await apCheckout.waitForSelector('span.checkbox__tick');
    await confirmAgreement.click();

    // Wait for button to not be disabled
    const reviewOrderButton = await apCheckout.waitForSelector('button[automation_id="button-submit"]:not([disabled])');
    await reviewOrderButton.click();

    // Check for the thank you page
    await page.waitForSelector('.order-thank-you-msg');
    await ecUtils.verifyShippingAddressOnThankYouPage(page, ecUtils.accountAddress3);
    await ecUtils.verifyBillingAddressOnThankYouPage(page, ecUtils.accountAddress3);
  }).timeout(10000);
});

