/* Picarto Notifier by Matthew Russell
This chrome extension collects picarto notifications periodically and notifies
the user via the extension icon and displaying an optional notification.

This extension requires access to read the user's notifications


https://docs.picarto.tv/api/
https://developer.chrome.com/apps/app_identity#non
https://developer.chrome.com/apps/identity#method-launchWebAuthFlow
https://developer.chrome.com/apps/identity#method-getRedirectURL
*/

let picartoClientID = "GET_YOUR_OWN_@_https://oauth.picarto.tv/clients"

let redirectURI = chrome.identity.getRedirectURL("picarto") // "https://docs.picarto.tv/api/o2c.html"

let picartoURL = "https://oauth.picarto.tv/authorize?response_type=token&redirect_uri="+
	redirectURI+
	"&realm=your-realms&scope=readpub%20readpriv%20%20&state=OAuth2Implicit&client_id="+
	picartoClientID

function oauth(){
	chrome.identity.launchWebAuthFlow({'url': picartoURL,'interactive': true}, (redirect_url) => {
		//TODO: Extract token from redirect_url here
		console.log(redirect_url)
		//console.log(chrome.runtime.lastError)
	})
}


console.log(picartoURL)
oauth()
