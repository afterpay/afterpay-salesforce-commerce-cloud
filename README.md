# Afterpay PayLater for Salesforce Commerce Cloud

These are internal docs for the cartridge and describe how to set up the cartridge and the development environment.

## Useful links:
[Salesforce Documentation for SFRA and SiteGenesis](https://documentation.b2c.commercecloud.salesforce.com/DOC3/index.jsp)

[Video demo of Express Checkout feature on SiteGenesis (made on 4/2/2021)](https://www.dropbox.com/s/xxs8jc9d9v2f7l7/express_checkout_sitegenesis.mp4?dl=0)

Detailed installation instructions have been started, but are incomplete and may be out of date.
These are works in progress (as of 4/6/2021):

[SFRA detailed installation](https://docs.google.com/document/d/112_ojOh6GGUct4y4MPyTKgnt74WylJgDL5vZckyPXqU/edit?usp=sharing)

[SiteGenesis detailed installation](https://docs.google.com/document/d/1LuYW6rL-k4Hp_3dmCsuqrnNvxioWf2cpkjaakHJ5j-g/edit?usp=sharing)

## Setting Up Development Environment
Install VSCode and install the Prophet extension. This is used to upload files to the SFCC sandbox. The remote debugging feature is also quite necessary for doing development.

## SFRA
### Installing SFRA (base)
The easiest way to install SFRA is to use an archive supplied by Salesforce on the sandbox, which is what we're doing below:

1. Log in to Business Manager using your Salesforce Commerce Cloud credentials
2. In **Administration > Site Development > Site Import & Export**, there should be **Storefront Reference Architecture Demo Sites**. Select that and click **Import**.
3. You'll be given an option of installing the **Storefront Reference Architecture base**, or **Storefront Reference Architecture base + All Optional Features**. For our purposes, we should pick the latter, since we want to make sure the Afterpay cartridge works with the common optional cartridges. Leave the code deployment directory the default, but keep in mind we will need to use this when creating the dw.json file for the Afterpay cartridge.
4. The site import may take up to 15-20 min.
5. Make sure the SFRA install works. If you've downloaded **storefront-reference-architecture/** from Salesforce github, put a valid dw.json in the top-level directory. You can run the integration tests using:
```
$ cd storefront-reference-architecture
$ npm run test:integration
```
All tests should pass

6. If you'll be making changes to the SFRA base cartridge for testing/debugging, download the cartridge directories to your local machine after doing the install. **Administration > Site Development > Code Deployment** , then click on the code version for the SFRA install, and there will be a **Download** button in the box near the top of the page. After downloading, you can then place a **dw.json** file at the top-level directory, make changes to the code, and upload to the server via VSCode/Prophet.

### Integrating Afterpay Cartridge and Setting Up Development Environment
1. Make sure SFRA base is installed
2. Clone this package
3. Clone the SFRA package from: (https://github.com/SalesforceCommerceCloud/storefront-reference-architecture) . You will need to have valid Salesforce Commerce Cloud credentials to do this. Even if you used the built-in archive on the sandbox to install SFRA, you will still need to download this in order to build client-side resources.
4. Place the Afterpay package and the SFRA package in the same directory. Alternatively, you can edit the **package.json** in the Afterpay package to point to the location where the SFRA package is.
```
  "paths": {
    "base": "../storefront-reference-architecture/cartridges/app_storefront_base/"
  },
```
5. Install SFRA dependencies
```
$ cd storefront-reference-architecture/
$ npm install
```

6. Build Afterpay client-side JS and SCSS resources. There should be no errors. If you are seeing errors, please downgrade your node version. I am currently using 6.14.11 . The build does not work with the most recent node 14.x .
```
$ cd paylater-sfcc/
$ npm install
$ npm run compile:js
$ npm run compile:scss
```
7. Create a **dw.json** file in **paylater-sfcc/dw.json** . This should contain the name of the SFCC server and login credentials. The **code-version** should be the code version "directory" that the SFRA base is currently installed in. You'll also need to mark the code version as the active code version in Business Manager - **Administration > Site Develoment > Code Deployment**. Keep in mind that if a cartridge with the same name already exists on the server in the same deployment location, it will get erased and overwritten.
```json
{
    "hostname": "zzgn-001.sandbox.us01.dx.commercecloud.salesforce.com",
    "username": "eric.chu@afterpay.com",
    "password": "yourpwd",
    "code-version": "version_to_upload_to"
}
```
8. Upload the Afterpay cartridge using UX Studio, VSCode with Prophet extension, or `npm run uploadCartridge`. I'm primarily using VSCode with Prophet during development. The specific cartridge directory for SFRA is **int_afterpay_sfra**. You will also need to upload **bm_afterpay** for the Business Manager.
9. Use the installation guide in **documentation/** for instructions on how to properly integrate the Afterpay cartridge.
10. After integrating the Afterpay cartridge, run the integration tests from the **storefront-reference-architecture/** as detailed below, to make sure the base SFRA store functionality still works.
```
$ cd storefront-reference-architecture/
$ npm run test:integration
```
11. Run Afterpay integration tests. There are tests for the following configurations: (deferred shipping/no BuyNow), (integrated shipping/no BuyNow), (integrated shipping/BuyNow). You will first have to configure the settings in Business Manager and then run the approriate test.
```
$ cd paylater-sfcc/

$ npm run test:integration:sfra-deferred-nonbuynow
 -or-
$ npm run test:integration:sfra-integrated-nonbuynow
 -or-
$ npm run test:integration:sfra-deferred-buynow
```
The tests are currently not running in headless mode, so you can visually verify that an express checkout order is being done.


## SiteGenesis Controllers
### Installing SiteGenesis (base)
The easiest way to install SiteGenesis is to use an archive supplied by Salesforce on the sandbox, which is what we're doing below:

1. Log in to Business Manager using your Salesforce Commerce Cloud credentials
2. In Administration > Site Development > Site Import & Export, there should be SiteGenesis Demo Site. Select that and click "Import".
3. The site import may take up to 15-20 min.
4. If you'll be making changes to the SFRA base cartridge for testing/debugging, download the cartridge directories to your local machine after doing the install. Administration > Site Development > Code Deployment , then click on the code version for the SFRA install, and there will be a Download button in the box near the top of the page. After downloading, you can then place a dw.json file at the top-level directory, make changes to the code, and upload to the server via VSCode/Prophet.
5. Verify that the install worked by manually going to the SiteGenesis storefront and making sure things work

### Integrating Afterpay Cartridge and Setting Up Development Environment
1. Clone this package
2. Clone the SiteGenesis package from: https://github.com/SalesforceCommerceCloud/sitegenesis . You will need to have valid Salesforce Commerce Cloud credentials to do this.
3. Make edits to SiteGenesis base files as described in the installation guide for Afterpay cartridge.
4. Upload the modified SiteGenesis base files to the sandbox using VSCode/Prophet
5. Upload the Afterpay cartridge (**int_afterpay_controllers**, **int_afterpay_core**)
6. Setup the cartridge as described in the installation docs.
7. Run Afterpay integration tests. There are tests for the following configurations: (deferred shipping/no BuyNow), (integrated shipping/no BuyNow), (integrated shipping/BuyNow). You will first have to configure the settings in Business Manager and then run the approriate test.
```
$ cd paylater-sfcc/

$ npm run test:integration:sg-deferred-nonbuynow
 -or-
$ npm run test:integration:sg-integrated-nonbuynow
 -or-
$ npm run test:integration:sg-deferred-buynow
```
The tests are currently not running in headless mode, so you can visually verify that an express checkout order is being done.

# Running SiteGenesis and SFRA on the same sandbox
SiteGenesis and SFRA seem to run fine on the same sandbox. They each have their own virtual host on the server and don't conflict. Some of the global configuration metadata are shared, but the settings are not.

- Put SFRA (app_storefront_base) and SiteGenesis (app_storefront_controllers, app_storefront_core) in the same Code Version. In Business Manager, switch the site to RefArch for SFRA, or SiteGenesis for SiteGenesis, and do the appropriate integration steps.



