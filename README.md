# Picarto Notification Center
The Unofficial Notification Center for Picarto.tv

This extension will:
- track and sort your notifications
- alert you when streamers you follow come online
- Provide tools for streamers to control their Streaming Mode
- Display MultiStream information and controls in an easy to use format

This extension requires you to login and authorize it through Picarto.tv's OAuth2 system. It will NOT save username or password information.

## How to Setup for personal Persistent Access:
### Register the extension with Picarto:
1. Create a Picarto client for the extension [here](https://oauth.picarto.tv/), and note the `Client ID` and the `Client Secret`.
2. Add the url `https://clarvel.github.io/PicartoNotificationCenter/` to `Redirect URIs` for the Picarto Client.
3. Open the `build/js/background.js` file and replace the `CLIENT_ID` with the `CLIENT_SECRET` from step 1 (line 115).

### Registering a redirect site (optional):
If the extension ID changes, you will need to create your own redirect site with the correct extension ID.
1. Look for the loaded extension [here](chrome://extensions/), and note the `ID`.
2. Create a Github webpage that redirects to that extension hostname. See `docs/index.html` for an example.
3. Add the url of that github webpage to `Redirect URIs` for the Picarto Client as described in the earlier section.