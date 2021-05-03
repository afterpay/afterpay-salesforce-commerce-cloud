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
    timeout: 300000
};


describe('Integrated Non-BuyNow', function () {
    this.timeout(0);
    let page;
    let homeUrl = config.sfraBaseUrl;
    let firstTotalPrice = 0;
    let secondTotalPrice = 0;
    let thirdTotalPrice = 0;

    beforeEach (async function () {
        global.expect = expect;
        global.browser = await puppeteer.launch(opts);
        page = await browser.newPage();
        await page.goto(homeUrl);
    });
    
    afterEach (async function () {
        await page.close();
        browser.close();
        global.browser = globalVariables.browser;
        global.expect = globalVariables.expect;
    })

    it('In-Store pickup - simple working case', async function () {
      await page.waitForSelector('button.affirm');
      await page.click('button.affirm');

      // Add instore item to cart
      await ecUtils.navigateToItem(page, '883360520100M');
      await page.waitForTimeout(2000);
      let sizeSelect = await page.waitForSelector('select.select-size');
      await sizeSelect.type('32');
      await page.waitForTimeout(1000);
      await page.keyboard.press('Enter');
  
      await ecUtils.selectStore(page, '02903', 'store2');
  
      addToCartButton = await page.waitForSelector('button.add-to-cart.btn-primary');
      await addToCartButton.click();
  
      await page.waitForTimeout(2000);
      
      // Click the cart icon
      const minicartLink = await page.waitForSelector('a.minicart-link');
      await minicartLink.click();
  
      await page.waitForTimeout(1000);
  
      let newPagePromise = new Promise(x => page.once('popup', x));
      // Click the Checkout with Afterpay
      const apCheckoutButton = await page.waitForSelector('.afterpay-checkout-button');
      await apCheckoutButton.click();

      let apCheckout = await newPagePromise;
      await ecUtils.popupLogin(apCheckout, ecUtils.user.email, ecUtils.user.password);

      // Click on confirm button when first installment amount is shown

      const gotItButton = await apCheckout.waitForSelector('button[automation_id="button-confirmPaymentUpFront"]');
      await gotItButton.click();

      // Verify EC popup is displaying for instore pickup
      await ecUtils.verifyStorePickupAddressInPopup(apCheckout, ecUtils.store2);

      // Click on the first shipping option
      await ecUtils.popupClickOnShippingOption(apCheckout, 1);
      await page.waitForTimeout(1000)

      const confirmAgreement = await apCheckout.waitForSelector('span.checkbox__tick');
      await confirmAgreement.click();
  
      // Wait for button to not be disabled
      const reviewOrderButton = await apCheckout.waitForSelector('button[automation_id="button-submit"]:not([disabled])');
      await reviewOrderButton.click();
  
      // The popup should be closed now
      await page.waitForSelector('#checkout-main[data-checkout-stage="placeOrder"]');
      
      await ecUtils.verifyShippingAddressOnShippingPage(page, ecUtils.store2);

      await page.waitForTimeout(2000);
      let placeOrderButton = await page.waitForSelector('#afterpay-placeorder-button');
      await placeOrderButton.click();
  
      // Check for the thank you page
      await page.waitForSelector('.order-thank-you-msg');

      // confirm store pickup
      let shippingMethod = await page.$eval('.shipping-method-title', e => e.innerText);
      expect(shippingMethod).to.equal('Store Pickup');

      await ecUtils.verifyShippingAddressOnThankYouPage(page, ecUtils.store2, true);
      await ecUtils.verifyBillingAddressOnThankYouPage(page, ecUtils.store2, true);

    }).timeout(10000);


    it('In-Store pickup 1 - mix home delivery with store pickup', async function () {
      await page.waitForSelector('button.affirm');
      await page.click('button.affirm');

      // Add home delivery item to cart
      await ecUtils.navigateToItem(page, '25589004M');
      await page.waitForTimeout(2000);
      let sizeSelect = await page.waitForSelector('select.select-size');
      await sizeSelect.type('8');
      await page.waitForTimeout(1000);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);

      let addToCartButton = await page.waitForSelector('button.add-to-cart.btn-primary');
      await addToCartButton.click();
      
      // Add instore item to cart
      await ecUtils.navigateToItem(page, '883360520100M');
      await page.waitForTimeout(2000);
      sizeSelect = await page.waitForSelector('select.select-size');
      await sizeSelect.type('32');
      await page.waitForTimeout(1000);
      await page.keyboard.press('Enter');
  
      await ecUtils.selectStore(page, '02903', 'store2');
  
      addToCartButton = await page.waitForSelector('button.add-to-cart.btn-primary');
      await addToCartButton.click();
  
      await page.waitForTimeout(2000);
      
      // Click the cart icon
      const minicartLink = await page.waitForSelector('a.minicart-link');
      await minicartLink.click();
  
      await page.waitForTimeout(1000);
      // Click the Checkout with Afterpay
      const apCheckoutButton = await page.waitForSelector('.afterpay-checkout-button');
      await apCheckoutButton.click();
  
      await page.waitForTimeout(2000);
      await page.waitForSelector('.cart-error-messaging button');
      let errorText = await page.$eval('.cart-error-messaging', x => x.innerText);
      expect(errorText).to.contain('Afterpay Express Checkout unavailable for your cart');
    }).timeout(10000);

    it('In-Store pickup - 2 items pickup up from different stores', async function () {
      await page.waitForSelector('button.affirm');
      await page.click('button.affirm');
      // Add 1 item to the cart
      await ecUtils.navigateToItem(page, '883360520100M');
      await page.waitForTimeout(2000);
      let sizeSelect = await page.waitForSelector('select.select-size');
      await sizeSelect.type('32');
      await page.waitForTimeout(1000);
      await page.keyboard.press('Enter');

      await ecUtils.selectStore(page, '02903', 'store2');

      let addToCartButton = await page.waitForSelector('button.add-to-cart.btn-primary');
      await addToCartButton.click();

      await page.waitForTimeout(2000);
      sizeSelect = await page.waitForSelector('select.select-size');
      await sizeSelect.type('33');
      await page.waitForTimeout(1000);
      await page.keyboard.press('Enter');

      await ecUtils.selectStore(page, '02141', 'store4');
      addToCartButton = await page.waitForSelector('button.add-to-cart.btn-primary');
      await addToCartButton.click();
      
      // Click the cart icon
      const minicartLink = await page.waitForSelector('a.minicart-link');
      await minicartLink.click();

      await page.waitForTimeout(1000);
      // Click the Checkout with Afterpay
      const apCheckoutButton = await page.waitForSelector('.afterpay-checkout-button');
      await apCheckoutButton.click();

      await page.waitForTimeout(2000);
      await page.waitForSelector('.cart-error-messaging button');
      let errorText = await page.$eval('.cart-error-messaging', x => x.innerText);
      expect(errorText).to.contain('Afterpay Express Checkout unavailable for your cart');
    }).timeout(10000);

    it('Express Checkout Finalization Flow. Checks cart checkout and pdp button during finalization flow.', async function () {
      await page.waitForSelector('button.affirm');
      await page.click('button.affirm');

      // Add 1 item to the cart
      await ecUtils.navigateToItem(page, '25589004M');
      await page.waitForTimeout(2000);
      let sizeSelect = await page.waitForSelector('select.select-size');
      await sizeSelect.type('8');
      await page.waitForTimeout(1000);
      await page.keyboard.press('Enter');

      // start express checkout from pdp
      let buyNowButton = await page.waitForSelector('#afterpay-express-pdp-button');
      await buyNowButton.click();

      let newPagePromise = new Promise(x => page.once('popup', x));

      await page.click('#afterpay-express-pdp-button');
      let apCheckout = await newPagePromise;
      await ecUtils.popupLogin(apCheckout, ecUtils.user.email, ecUtils.user.password);

      // Click on confirm button when first installment amount is shown
      let gotItButton = await apCheckout.waitForSelector('button[automation_id="button-confirmPaymentUpFront"]');
      await gotItButton.click();
      await page.waitForTimeout(1000)

      await ecUtils.popupClickOnShippingOption(apCheckout, 1);
      await page.waitForTimeout(1000)

      const confirmAgreement = await apCheckout.waitForSelector('span.checkbox__tick');
      await confirmAgreement.click();

      // Wait for button to not be disabled
      const reviewOrderButton = await apCheckout.waitForSelector('button[automation_id="button-submit"]:not([disabled])');
      await reviewOrderButton.click();

      // The popup should be closed now
      await page.waitForSelector('#checkout-main[data-checkout-stage="placeOrder"]');

      // Click close on the checkout screen
      //const closeButton = await page.waitForSelector('button.close');
      //await closeButton.click();
      let homeButton = await page.waitForSelector('a.logo-home');
      await homeButton.click();

      // Click the cart icon
      const minicartLink = await page.waitForSelector('a.minicart-link');
      await minicartLink.click();

      await page.waitForTimeout(1000);
      // Click the Checkout with Afterpay
      const apCheckoutButton = await page.waitForSelector('.afterpay-checkout-button');
      await apCheckoutButton.click();

      await page.waitForTimeout(1000);
      // Since we are in express checkout finalization flow, should just go back to checkout screen
      let placeOrderButton = await page.waitForSelector('#afterpay-placeorder-button', { visible: true });
      expect(placeOrderButton).to.not.be.null;

      // Go back to home
      homeButton = await page.waitForSelector("a.logo-home");
      await homeButton.click();

      // Add 1 item to the cart
      await ecUtils.navigateToItem(page, '25589004M');
      await page.waitForTimeout(1000);
      sizeSelect = await page.waitForSelector('select.select-size');
      await sizeSelect.type('6');
      await page.waitForTimeout(1000);
      await page.keyboard.press('Enter');

      buyNowButton = await page.waitForSelector('#afterpay-continue-finalize-button');
      disabledStatus = await page.evaluate(x => x.hasAttribute('disabled'), buyNowButton);
      expect(disabledStatus).to.be.false;

      await buyNowButton.click();
      await page.waitForTimeout(1000);

      // check the amounts
      let totalAmount = await ecUtils.getGrandTotalFromCheckout(page);
      expect(totalAmount).to.equal('163.77');

      await page.waitForSelector('#afterpay-payment-shown');

      placeOrderButton = await page.waitForSelector('#afterpay-placeorder-button', { visible: true });
      expect(placeOrderButton).to.not.be.null;
      placeOrderButton.click();

      // Check for the thank you page
      await page.waitForSelector('.order-thank-you-msg');
      await ecUtils.verifyShippingAddressOnThankYouPage(page, ecUtils.accountAddress1);
      await ecUtils.verifyBillingAddressOnThankYouPage(page, ecUtils.accountAddress1);
    }).timeout(10000);

    it('Test PDP button functionality', async function () {
      await page.waitForSelector('button.affirm');
      await page.click('button.affirm');

      await ecUtils.navigateToItem(page, '25589004M');

      await page.waitForSelector('.afterpay-widget-message');
      let messaging = await page.$eval('.afterpay-widget-message', e => e.innerText);
      expect(messaging).to.contain('or 4 payments of $18.50');

      // Make sure Buy Now button is disabled
      await page.waitForTimeout(1000);
      let buyNowButton = await page.waitForSelector('#afterpay-express-pdp-button');
      let disabledStatus = await page.evaluate(x => x.hasAttribute('disabled'), buyNowButton);

      console.log("DS: ", disabledStatus);

      expect(disabledStatus).to.be.true;

      let sizeSelect = await page.waitForSelector('select.select-size');
      await sizeSelect.type('4');
      await page.waitForTimeout(500);
      await page.keyboard.press('Enter');

      disabledStatus = await page.evaluate(x => x.hasAttribute('disabled'), buyNowButton);
      expect(disabledStatus).to.be.false;

      await buyNowButton.click();

      let newPagePromise = new Promise(x => page.once('popup', x));

      await page.click('#afterpay-express-pdp-button');
      let apCheckout = await newPagePromise;
      await ecUtils.popupLogin(apCheckout, ecUtils.user.email, ecUtils.user.password);

      // Click on confirm button when first installment amount is shown

      let gotItButton = await apCheckout.waitForSelector('button[automation_id="button-confirmPaymentUpFront"]');
      await gotItButton.click();
      // Grab the price
      let totalPrice = await ecUtils.popupGetTotalPrice(apCheckout);
      expect(totalPrice).to.equal('83.98');
      apCheckout.close();

      // We should be redirected back to the cart page. The amount will be higher since
      // a default shipping method has been selected
      let grandTotal = await ecUtils.getGrandTotalFromCart(page);
      expect(grandTotal).to.equal('94.48');

      // add the same item again, but size 6
      await ecUtils.navigateToItem(page, '25589004M');
      sizeSelect = await page.waitForSelector('select.select-size');
      await sizeSelect.type('6');
      await page.waitForTimeout(500);
      await page.keyboard.press('Enter');
      buyNowButton = await page.waitForSelector('#afterpay-express-pdp-button');
      disabledStatus = await page.evaluate(x => x.hasAttribute('disabled'), buyNowButton);
      expect(disabledStatus).to.be.false;

      await buyNowButton.click();

      newPagePromise = new Promise(x => page.once('popup', x));
      apCheckout = await newPagePromise;
      await ecUtils.popupLogin(apCheckout, ecUtils.user.email, ecUtils.user.password);

      // Click on confirm button when first installment amount is shown
      gotItButton = await apCheckout.waitForSelector('button[automation_id="button-confirmPaymentUpFront"]');
      await gotItButton.click();

      // sfra base defaults to overnight shipping
      totalPrice = await ecUtils.popupGetTotalPrice(apCheckout);
      expect(totalPrice).to.equal('176.37');
      await apCheckout.close();


      // don't complete the checkout since we just wanted to test the PDP
    }).timeout(10000);

    it('End-to-end test. Checks amounts in EC popup. Checks shipping method changes. Checks merchant site checkout amounts and addresses.', async function () {
      await page.waitForSelector('button.affirm');
      await page.click('button.affirm');

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

      const gotItButton = await apCheckout.waitForSelector('button[automation_id="button-confirmPaymentUpFront"]');
      await gotItButton.click();


      // Click on the first shipping option
      await ecUtils.popupClickOnShippingOption(apCheckout, 1);

      // Give the price time to update
      await page.waitForTimeout(2000)


      // Count the number of shipping options. There should be 3
      let numShipOptions = await ecUtils.popupCountNumberShipOptions(apCheckout);
      expect(numShipOptions).to.equal(3);

      // Grab the price
      firstTotalPrice = await ecUtils.popupGetTotalPrice(apCheckout);
      expect(firstTotalPrice).to.equal('57.74');


      // Click on the second shipping option
      await ecUtils.popupClickOnShippingOption(apCheckout, 2);

      // Give the price time to update
      await page.waitForTimeout(2000)

      // Grab the price
      secondTotalPrice = await ecUtils.popupGetTotalPrice(apCheckout);
      expect(secondTotalPrice).to.equal('61.94');

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

      // Count the number of shipping options. There should be 1
      let numHawaiiShipOptions = await ecUtils.popupCountNumberShipOptions(apCheckout);
      //let numHawaiiShipOptions = (await apCheckout.$$('div > label input[type="radio"]')).length;
      expect(numHawaiiShipOptions).to.equal(1);


      // Select the first option
      await ecUtils.popupClickOnShippingOption(apCheckout, 1);

      // Give the price time to update
      await page.waitForTimeout(2000);

      // Grab the price
      thirdTotalPrice = await ecUtils.popupGetTotalPrice(apCheckout);
      expect(thirdTotalPrice).to.equal('69.29');


      const confirmAgreement = await apCheckout.waitForSelector('span.checkbox__tick');
      await confirmAgreement.click();

      // Wait for button to not be disabled
      const reviewOrderButton = await apCheckout.waitForSelector('button[automation_id="button-submit"]:not([disabled])');
      await reviewOrderButton.click();

      // The popup should be closed now
      await page.waitForSelector('#checkout-main[data-checkout-stage="placeOrder"]');
      const checkoutPriceText = await page.$eval('.grand-total-sum', e => { return e.innerHTML });
      found = checkoutPriceText.match(/\$([0-9\.]+)/);
      expect(found.length).to.be.greaterThan(0);
      let checkoutPrice = found[1];
      expect(checkoutPrice).to.equal(thirdTotalPrice);

      await page.waitForTimeout(3000);

      // Check for the afterpay widget
      //await page.waitForSelector('div[data-testid="ap-amount-due-today"]');
      // Click the place order button
      let placeOrderButton = await page.waitForSelector('#afterpay-placeorder-button');
      await placeOrderButton.click();

      // Check for the thank you page
      await page.waitForSelector('.order-thank-you-msg');
      await ecUtils.verifyShippingAddressOnThankYouPage(page, ecUtils.accountAddress3);
      await ecUtils.verifyBillingAddressOnThankYouPage(page, ecUtils.accountAddress3);
    }).timeout(10000);
});

