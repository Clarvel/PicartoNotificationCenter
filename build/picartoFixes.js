/* // hide picarto bar
if(chrome){browser = chrome}

function injectCSS(style) {
	let css = document.createElement('style');
	css.textContent = style;
	document.head.appendChild(css);
}

// get setting from storage
browser.storage.sync.get("picartobar", (item) => {
	// hide Picarto official notification bar via css injection
	// if picartobar is undefined, default to true
	// TODO requires reload of page if setting changed
	let picartobar = item["picartobar"];	
	if (picartobar == undefined || picartobar){
		console.log("Hiding official Picarto bar")
		injectCSS("#notificationMenu{display: none !important;}");
	}
});
*/

/* // remove warning page
chrome.webRequest.onBeforeRequest.addListener(
  function(details) {
  
    url = new URL(details.url)

    return {
      redirectUrl:
        url.searchParams.get("go")
    };
  },
  {
    urls: [
      "*://picarto.tv/site/referrer*",
    ],
    types: [
      "main_frame",
      "sub_frame",
      "stylesheet",
      "script",
      "image",
      "object",
      "xmlhttprequest",
      "other"
    ]
  },
  ["blocking"]
);
*/