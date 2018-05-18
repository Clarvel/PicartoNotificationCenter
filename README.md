# Picarto Notification Center
The Unofficial Notification Center for Picarto.tv

This extension will:
- track and sort your notifications
- alert you when streamers you follow come online
- Provide tools for streamers to control their Streaming Mode
- Display MultiStream information and controls in an easy to use format
- Collect saved Recordings into their own list

This extension requires you to login and authorize it through Picarto.tv's OAuth2 system. It will NOT save username or password information.

## How to Setup for personal Persistent Access:
### Register the extension with Picarto:
1. Create a Picarto client for the extension [here](https://oauth.picarto.tv/clients), and note the `Client ID` and the `Persistent Access Token`.
3. Open the `build/js/global.js` file and replace the `picartoClientID` with the `Client ID` from step 1.
4. In the `build/js/global.js` file, replace the `picartoToken` with `Bearer ACCESS_TOKEN_HERE`, where `ACCESS_TOKEN_HERE` is the `Persistent Access Token` from step 1.


## How to Setup for Publishing and OAuth2:
### Upload the Extension to Google Web Store without publishing:
1. Compress the items in `build` to `.zip` format.
2. Create a new listing [here](https://chrome.google.com/webstore/developer/dashboard) and upload the compressed extension.
3. Click on `More info` for that extension and note down the `Item ID` and `Public Key`.
4. In the `build/manifest.json` file, replace the `"key"` value with the `Public Key` from step 2. This ensures that the `Item ID` value never changes.

### Create the redirect Website:
1. Create a blank GitHub website (or other TLS Certified Domain that you control), and note down the url.
2. In the `build/js/global.js` file, replace the `redirectURI` value with the url from step 1.
3. have the redirect website redirect to `https://GOOGLE_ITEM_ID.chromiumapp.org/picarto` but replace the `GOOGLE_ITEM_ID` with the `Item ID` noted in the first section. Make sure to include the incoming url's hash values, see `docs/index.html` for an example of how to do this.

### Register the extension with Picarto:
1. Create a Picarto client for the extension [here](https://oauth.picarto.tv/clients), and note the `Client ID`.
2. Add the url from the previous section to `Redirect URIs` for the Picarto Client.
3. Open the `build/js/global.js` file and replace the `picartoClientID` with the `Client ID` from step 1.
4. Finally, update the `version` in `build/manifest.json`, compress the items in `build` once more, and upload the updated compressed extension to the google dashboard.