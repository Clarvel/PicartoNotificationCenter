**Get the Picarto Client ID**:

1. Visit `https://oauth.picarto.tv/clients`, create a client, and note the clientID.
2. Open the `global.js` file and replace `“GET_YOUR_OWN_@_https://oauth.picarto.tv/clients”` with the clientID string you noted down in step 1.

**Load the extension**:

1. Visit `chrome://extensions` in your browser (or open up the Chrome menu by clicking the icon to the far right of the Omnibox:  The menu's icon is three horizontal bars. and select Extensions under the More Tools menu to get to the same place).
2. Ensure that the Developer mode checkbox in the top right-hand corner is checked.
3. Click Load unpacked extension… to pop up a file-selection dialog.
4. Navigate to the directory in which your extension files live, and select it.

Alternatively, you can drag and drop the directory where your extension files live onto `chrome://extensions` in your browser to load it.

If the extension is valid, it'll be loaded up and active right away! If it's invalid, an error message will be displayed at the top of the page. Correct the error, and try again.

Once the extension has loaded it should imediately direct you to the picarto Oauth2 sign in.

**Inspecting the Output**:

To inspect the javascript, go to `chrome://extensions` in your browser, navigate to the `Picarto Notifier` extension, and click on the link in `inspect views: background page`

From this console you can call the function `oauth()` to try the oauth process again.

