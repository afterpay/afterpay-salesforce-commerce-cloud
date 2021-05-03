var assert = require('chai').assert;
const puppeteer = require('puppeteer');
const { expect } = require('chai');
const _ = require('lodash');
var request = require('request-promise');
var config = require('../it.config');
const globalVariables = _.pick(global, ['browser', 'expect']);
const ecUtils = require('../testUtilsSitegenesis');

// puppeteer options
const opts = {
    headless: false,
    slowMo: 100,
    timeout: 30000
};

// expose variables
before (async function () {
    global.expect = expect;
    global.browser = await puppeteer.launch(opts);
});
  
// close browser and reset global variables
after (function () {
    browser.close();
    global.browser = globalVariables.browser;
    global.expect = globalVariables.expect;
});
  
describe('sample test', function () {
    it('should work', async function () {
        console.log(await browser.version());
        expect(true).to.be.true;
    }).timeout(10000);
});

describe('Deferred Non-BuyNow', function () {
    this.timeout(0);
    let page;
    let homeUrl = config.sgBaseUrl;
    //let homeUrl = "https://zzgn-001.sandbox.us01.dx.commercecloud.salesforce.com/s/SiteGenesis/electronics/televisions/sanyo-dp19648.html";
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

  it('Main home page', async function () {
    let trackingConsentOkButton = await page.waitForSelector('button.ui-widget:nth-child(1)');
    await trackingConsentOkButton.click();

    let searchInput = await page.waitForSelector('input#q');
    await searchInput.type('sanyo dp19648');
    await page.keyboard.press('Enter');

    //await page.waitFor('#electronics-gps-units');
    //await page.click('#electronics-gps-units');
    //await page.waitForSelector('a.link');
    //await page.click('a.link');

    await page.waitForSelector('#afterpay-express-link-button');

    messaging = await page.$eval('.pdp-afterpay-message', e => e.innerText);
    expect(messaging).to.contain('or 4 payments of');

    let addToCartButton = await page.waitForSelector('button#add-to-cart');
    await addToCartButton.click();

    //let cartQuantity = await ecUtils.checkCartQuantity(page);
    // Wait for cart quantity to be 1
    await page.waitForFunction('document.querySelector(".minicart-quantity").innerText.trim() === "1"');

    let miniCartLink = await page.waitForSelector('.mini-cart-link');
    await miniCartLink.click();

    let checkoutButton = await page.waitForSelector('#afterpay-express-button');

    await checkoutButton.click();

    const newPagePromise = new Promise(x => page.once('popup', x));
    const apCheckout = await newPagePromise;
    await ecUtils.popupLogin(apCheckout, ecUtils.user.email, ecUtils.user.password);

    // Price sometime takes a moment to update
    await apCheckout.waitForTimeout(1000);
    // Grab the price
    firstTotalPrice = await ecUtils.popupGetTotalPrice(apCheckout);
    expect(firstTotalPrice).to.equal('261.97');

    // Make sure there are no shipping options presented
    let radioButton = await apCheckout.$('div > label input[type="radio"]');

    expect(radioButton).to.be.null;

    const confirmAgreement = await apCheckout.waitForSelector('span.checkbox__tick');
    await confirmAgreement.click();

    // Wait for button to not be disabled
    const reviewOrderButton = await apCheckout.waitForSelector('button[automation_id="button-submit"]:not([disabled])');
    await reviewOrderButton.click();

    // The popup should be closed now
    await page.waitForSelector('div.step-1.active');
    // Make sure the address we selected in express checkout has been prefilled
    await ecUtils.verifyShippingAddressOnShippingPage(page, ecUtils.accountAddress1);

    // Get initial order value on shipping page
    let orderValue = await ecUtils.getOrderValue(page);
    expect(orderValue).to.equal('261.97');

    let miniBillingAmount = await ecUtils.getMiniBillingAmount(page);
    expect(miniBillingAmount).to.equal('261.97');

    // Change to 2-Day express Shipping
    await ecUtils.selectShippingMethod(page, "002");
    await page.waitForTimeout(2000);

    // Get initial order value on shipping page
    orderValue = await ecUtils.getOrderValue(page);
    expect(orderValue).to.equal('268.27');

    // Make sure the displayed Afterpay payment amount has updated as well
    miniBillingAmount = await ecUtils.getMiniBillingAmount(page);
    expect(miniBillingAmount).to.equal('268.27');

    // Click continue to billing
    let continueToBilling = await page.waitForSelector('form.checkout-shipping button');
    await continueToBilling.click();

    // Make sure Afterpay payment type selected
    let selectedPaymentType = await page.waitForSelector('input[type="radio"][name="dwfrm_billing_paymentMethods_selectedPaymentMethodID"]');
    let selectedPaymentTypeValue = await page.evaluate(x => x.value, selectedPaymentType);
    expect(selectedPaymentTypeValue).to.equal('AFTERPAY_PBI');

    // Make sure amounts on billing page are still the same
    let checkoutPrice = await ecUtils.getOrderValue(page);
    expect(checkoutPrice).to.equal('268.27');

    miniBillingAmount = await ecUtils.getMiniBillingAmount(page);
    expect(miniBillingAmount).to.equal('268.27');

    await page.waitForTimeout(1000);

    // Check for the afterpay widget
    //await page.waitForSelector('div[data-testid="ap-amount-due-today"]');
    // Click the place order button
    let placeOrderButton = await page.waitForSelector('#afterpay-express-placeorder-button');
    await placeOrderButton.click();

    // Check for the thank you page
    await page.waitForSelector('.confirmation-message');
    await ecUtils.verifyShippingAddressOnThankYouPage(page, ecUtils.accountAddress1);
    await ecUtils.verifyBillingAddressOnThankYouPage(page, ecUtils.accountAddress1);
  }).timeout(10000);
});

