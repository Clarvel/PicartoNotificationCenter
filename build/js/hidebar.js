let _debug = !('update_url' in chrome.runtime.getManifest())

function debug(text) {
	if(_debug){console.log(text)}
}

function injectCSS(style) {
	let css = document.createElement('style');
	css.textContent = style;
	document.head.appendChild(css);
}

// get setting from storage
chrome.storage.local.get("picartobar", (item) => {
	// hide Picarto official notification bar via css injection
	// if picartobar is undefined, default to true
	// TODO requires reload of page if setting changed
	let picartobar = item["picartobar"];	
	if (picartobar == undefined || picartobar){
		debug("Hiding official Picarto bar")
		injectCSS("#notificationMenu{display: none !important;}");
	}
});