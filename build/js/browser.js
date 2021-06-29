import {IsEmpty} from "./utils.js"

//var browser = browser || chrome // used if browser is null/empty

//let notificationBlocker = null // used with togglePicartoBar, this is cheating but I need the refrence so I know what to remove
let lastState = ""

export class Browser{
	/**
	 * @param {string} url
	 */
	static OpenInNewTab(url){
		return window.open(url, '_blank')
	}

	/**
	 * @param {object} data
	 * @returns {Promise<object>} response
	 */
	static SendMessage(data){
		console.log(data)
		return browser.runtime.sendMessage(data).catch((err)=>{
			console.warn(err, data)
			if(err.message !== "Could not establish connection. Receiving end does not exist.")
				throw Error(err["message"])
		})
	}

	/**
	 * @callback MessageHandler
	 * @param {object} response
	 * @returns {*} reply
	 */

	/**
	 * @param {MessageHandler} func 
	 * @returns {number} listener index number
	 */
	static OnMessage(func){
		return browser.runtime.onMessage.addListener((response, sender, sendResponse)=>{
			try{
				sendResponse(func(response))// TODO handle with Promise instead of sendResponse, once chrome enables it
				return true
			}catch(e){
				console.warn(e)
			}
			return false
		})
	}

	/**
	 * @callback ActiveStateChangedHandler
	 * @param {boolean} isActive 
	 */

	/**
	 * @param {ActiveStateChangedHandler} func
	 * @returns {number} listener index number
	 */
	static OnActiveStateChanged(func){
		return browser.idle.onStateChanged.addListener((state)=>{ // possible states are ["locked", "idle", "active"]
			if(state !== lastState && state !== "idle"){ // don't care about "idle" state
				lastState = state
				return func(state === "active") // func input will be true for "active", false for anything else (locked)
			}
		})
	}


	/*static TogglePicartoBar(value){
		if(value){
			console.log("Hiding official Picarto bar")
			notificationBlocker = browser.webRequest.onBeforeRequest.addListener(()=>{
				return {"cancel":true}
			},{
				"urls":["*://*.picarto.tv/js/realtime_notifications.min.js"],
				"types":["script"]
			},["blocking"])
		}else if(notificationBlocker != null){
			browser.webRequest.onBeforeRequest.removeListener(notificationBlocker)
		}
	}*/

	/**
	 * @param {Array<string>|string} keys 
	 * @returns {Promise<object>}
	 */
	static GetStorage(keys){
		return browser.storage.local.get(keys).then((data)=>{
			if(data == null || IsEmpty(data))
				throw new Error(`No storage data found for [${typeof keys === 'string' ? keys : keys.toString()}]`)
			return data
		})
	}

	/**
	 * @param {object} data 
	 * @returns {Promise}
	 */
	static SetStorage(data){return browser.storage.local.set(data)}

	/**
	 * @param {Array<string>|string} keys 
	 * @returns {Promise}
	 */
	static RemoveStorage(keys){return browser.storage.local.remove(keys)}

	/**
	 * @callback NotificationClickedHandler
	 * @param {string} notificationId 
	 */

	/**
	 * @param {NotificationClickedHandler} func
	 * @returns {number} listener index number
	 */
	static OnNotificationClicked(func){
		return browser.notifications.onClicked.addListener(func)
	}

	/**
	 * @param {string} notificationId 
	 * @returns {Promise} 
	 */
	static ClearNotification(notificationId){
		return browser.notifications.clear(notificationId).then(response=>{if(!response) throw new Error(`Failed to clear notification ${notificationId}`)})
	}

	/**
	 * @param {string} id if empty, will be generated
	 * @param {string} title 
	 * @param {string} message 
	 * @param {string} iconUrl 
	 * @returns {Promise<string>} response will be the notification id
	 */
	static CreateNotification(id, title, message, iconUrl=""){
		return browser.notifications.create(id, {
			"type":"basic",
			"iconUrl":iconUrl,
			"title":title,
			"message":message,
		})
	}

	/**
	 * @param {string} encodedURL 
	 * @param {boolean} interactive 
	 * @returns {Promise<string>} redirect uri
	 */
	static LaunchWebAuthFlow(encodedURL, interactive){
		return browser.identity.launchWebAuthFlow({
			"url":encodedURL,
			"interactive":interactive
		})
	}

	/**
	 * @callback BadgeClickedHandler
	 * @param {object} tab tab that was active when badge was clicked
	 */

	/**
	 * @param {BadgeClickedHandler} func
	 * @returns {number} listener index number
	 */
	static OnBadgeClicked(func){
		return browser.browserAction.onClicked.addListener(func)
	}

	/**
	 * @returns {Promise<string>} fully qualified url to the popup
	 */
	static GetPopup(){
		return browser.browserAction.getPopup({})
	}

	/**
	 * setting url to empty string disables the popup page
	 * @param {string} url fully qualified url or empty string
	 */
	static SetPopup(url){
		browser.browserAction.setPopup({"popup":url})
	}

	/**
	 * @param {string} text 
	 */
	static SetBadgeText(text){
		browser.browserAction.setBadgeText({"text":text})
	}

	/**
	 * @param {string} text 
	 */
	static SetBadgeTitle(text){
		browser.browserAction.setTitle({"title":text})
	}

	/**
	 * @returns {Promise}
	 */
	static OpenOptionsPage(){
		return browser.runtime.openOptionsPage()
	}

	/**
	 * @typedef {object} InstalledResponse
	 * @property {string} id
	 * @property {string} previousVersion
	 * @property {boolean} temporary
	 * @property {string} reason one of ["install", "update", "browser_update", "shared_module_update"]
	 */

	/**
	 * @returns {Promise<InstalledResponse>}
	 */
	static OnInstalled(){
		return new Promise((resolve, reject)=>{
			browser.runtime.onInstalled.addListener(resolve)
		})
	}
}
