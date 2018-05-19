/*
Stuff To Do:

collect multistream data and pass to popup, display multistream data in popup
- collect recordings data and pass to popup, display recordings data in popup
figure out how private mode works, do I need to show the secret url?
change the invite streamer icon
fix the font to be only needed icons
- maybe move recordings button to bar?
tell global.js to update when popup is opened
- create and hook up invite modal to accept streamer name

*/

let picartoClientID = "fAIxSd5o2CkpTdMv"
let redirectURI = "https://clarvel.github.io/PicartoNotificationCenter/"
let popupHTML = "chrome-extension://cmnfbkpodnopafgnlicpjjnpcgdlclde/popup.html"

let picartoURL = "https://oauth.picarto.tv/authorize?redirect_uri="+redirectURI+"&response_type=token&scope=readpub readpriv write&state=OAuth2Implicit&client_id="+picartoClientID
let tokenRegex = RegExp("[&#]access_token=(.+?)(?:&|$)")
let picartoToken = ""
let liveCount = 0
let inviteCount = 0
let updater = undefined
let notificationBlocker = undefined
let ding = new Audio('audio/ding.ogg')

let streams = {}
let multiData = {}
let recordings = {}
let messages = {}
let userData = {}


// default settings, should be updated to saved settings. if changed, edit options.js too
let defaults = {
	"updateTime" : 600000,
	"picartobar" : true,
	"notifications" : true,
	"alert" : true,
	"streamer" : false,
	"premium" : false,
	"curate" : true,
	"automark" : true,
	"records" : true,
	"delrecords" : false,
	"updatemulti" : false
}
let settings = {}

function addMessage(msg){
	console.log(msg)
	if(msg in messages){
		messages[msg] += 1;
	}else{
		messages[msg] = 0;
	}
	chrome.runtime.sendMessage({"msg":"addMessage","data":[msg, messages[msg]]})
	if (settings["alert"] == true) {
		ding.play()
	}
	chrome.browserAction.setBadgeBackgroundColor({"color":"#b53f30"})
}

function _request(url_, type, data={}, success=()=>{}, error=addMessage){
	if(!navigator.onLine){ // don't make requests if the service is offline
		error("Internet Offline")
		return
	}
	let xhttp = new XMLHttpRequest();
	// xhttp.onerror = error // TODO useless?
	xhttp.onreadystatechange = ()=>{
		if (xhttp.readyState == 4){
			if(xhttp.status == 200){
				let fetched = xhttp.response
				try {fetched = JSON.parse(xhttp.response);}catch(e){} // TODO simplify?
				//console.log(xhttp.response)
				success(fetched)
			}else if(xhttp.status > 0){
				if(xhttp.responseText.length > 0 && xhttp.status >= 400 && xhttp.status < 500){ // because 502 error text is bad
					error("Error "+xhttp.status+": " +xhttp.responseText)
					return
				}
				//error("Network Error: "+xhttp.status)
				return
			}
			// -1 status code I guess?
			//error("Network Error")
		}
	}
	// encode in URL because picarto API does not accept body content
	let keys = Object.keys(data)
	if(keys.length > 0){
		let encoded = keys.map(key=>key+'='+data[key]).join('&')
		xhttp.open(type, url_+'?'+encoded)
	}else{
		xhttp.open(type, url_)
	}
	xhttp.setRequestHeader("Authorization", picartoToken)
	//xhttp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded")
	xhttp.send();
}

function get(url_, success=undefined, error=undefined){
	_request(url_, "GET", undefined, success, error)
}
function post(url_, data=undefined, success=undefined, error=undefined){
	_request(url_, "POST", data, success, error)
}

function createNotification(title, message, channel, id=channel){
	if(settings["notifications"]){
		console.log("Creating notification for " + id)
		chrome.notifications.clear(id, ()=>{})
		chrome.notifications.create(id, {
			type: "basic",
			iconUrl: "https://picarto.tv/user_data/usrimg/"+channel.toLowerCase()+"/dsdefault.jpg",
			title: title,
			message: message
		}, (id) => {return id;}); // callback required for chrome < 42
	}
}

function sendStreamNotification(streamerName){
	createNotification("Currently streaming on Picarto:", streamerName, streamerName)
	if (settings["alert"]) {
		ding.play();
	}
}

function updateBadge(){
	//console.log("Updating Badge")
	let badgetext = "";
	let badgetooltip = "";

	if (liveCount > 0) {
		badgetext = liveCount.toString()
		badgetooltip = badgetext+" pe"+(liveCount>1?"ople":"rson")+" streaming"
	}
	if (inviteCount > 0) {
		if(badgetext.length > 0){
			badgetext += ", "
			badgetooltip += "\n"
		}
		let a = inviteCount.toString()
		badgetext += a
		badgetooltip += a+" invite"+(inviteCount>1?"s":"")
	}
	chrome.browserAction.setBadgeText({"text": badgetext})
	chrome.browserAction.setTitle({"title": badgetooltip})
}

function markRead(note){
	note["unread"] = false
	post("https://api.picarto.tv/v1/user/notifications/"+note["uuid"]+"/read")
}

function delNotification(uuid){
	if(settings["curate"]){
		console.log("Deleting "+uuid)
		post("https://api.picarto.tv/v1/user/notifications/"+uuid+"/delete")
	}else{
		post("https://api.picarto.tv/v1/user/notifications/"+uuid+"/read")
	}
}

// helper function for update() below. don't use elsewhere
// only called if both required api calls complete successfully
function _testOnline(streamingNotes, onlineStreams){
	liveCount = 0
	let old = streams
	streams = {}

	// compare a list of online streams against the keys of streamers I follow to determine who is online
	for(let a in onlineStreams){
		let name = onlineStreams[a]["name"]
		if(name in streamingNotes){ // if b exists the stream I got a notification for is online
			let note = streamingNotes[name]
			note["online"] = true
			if(note["unread"]){
				liveCount += 1
				if(name in old){ // if previous record, test if should delete old record
					if(old[name]["timestamp"] < note["timestamp"]){
						console.log("Deleting old stream: " + name)
						delNotification(old[name]["uuid"])
					}
				}else{ // if not in old, its a new stream! (I already tested against incoming streams) yay!
					sendStreamNotification(name)
				}
			}
		}
	}

	// one final pruning of offline streams because I don't care about them
	for(let a in streamingNotes){
		let note = streamingNotes[a]
		if(note["online"]){
			streams[a] = note
		}else{
			console.log("Deleting offline stream: " + note["channel"])
			delNotification(note["uuid"])
			//delete streamingNotes[a]
		}
	}
	updateBadge()
}

// main update function
function update(cb=undefined) {
	console.log("Updating...")
	let onlineStreams = []
	let streamingNotes = {}

	let _a = 2
	let _b = 3
	let decrementB = ()=>{_b -= 1;if(_b <= 0){if(cb != null){cb();}}}
	let decrementA = ()=>{_a -= 1;if(_a <= 0){_testOnline(streamingNotes, onlineStreams);decrementB();}}

	get("https://api.picarto.tv/v1/online?adult=true&gaming=true", (data)=>{
		onlineStreams = data
		decrementA()
	})

	get("https://api.picarto.tv/v1/user/notifications", (data)=>{
		recordings = {}
		for(let a in data){ // should be in chronological order
			let note = data[a]
			let name = note["channel"]

			switch(note["type"]){
				case "multiInvite": // ignore these in favor of API
				case "multiRemove": // ignore these in favor of API
					break;
				case "follow":
					if(note["unread"]){
						createNotification(name, "has followed you!", name, " F"+name)
					}
					delNotification(streams[name]["uuid"])
					break;
				case "live":
					note["online"] = false // stream is offline until proven otherwise, in testOnline

					if(name in streamingNotes && streamingNotes[name]["timestamp"] < note["timestamp"]){ // if there's a previous incoming notification remove the old one
						console.log("Deleting replaced stream: "+name)
						delNotification(streamingNotes[name]["uuid"])
					}
					streamingNotes[name] = note
					break;
				case "recordingCreate":
					if((settings["curate"] && !settings["records"]) || (!note["unread"] && settings["delrecords"])){
						delNotification(note["uuid"])
					}else if(settings["records"]){ // only populate if wanting to view
						recordings[note["uuid"]] = note
					}
					break;
				default: // unknown notification type, alert me
					alert(type)
					console.log(data)
					break;
			}
		}
		decrementA()
	})
	
	get("https://api.picarto.tv/v1/user/multistream", (data)=>{
		for(let a in data["incoming"]){ // for all new invites, create notification
			let d = data["incoming"][a]["user_id"]
			let match = false
			for(let b in multiData["incoming"]){
				if(multiData["incoming"][b]["user_id"] == d){
					match = true
					break;
				}
			}
			if(!match){
				let name = data["incoming"][a]["name"]
				createNotification("New Multi-Stream Invite from:", name, name, " I"+d)
			}
		}

		multiData = data

		inviteCount = multiData["incoming"].length;
		updateBadge();
		decrementB();
	})

	get("https://api.picarto.tv/v1/user", (data)=>{
		userData = data["channel_details"]
		userData["premium"] = (userData["account_type"] == "premium")
		userData["streaming"] = (settings["streamer"] || userData["online"])
		userData["commission"] = userData["commissions"] // because typo?
		
		//userData["commissions"] = data["commissions"]
		//userData["gaming"] = data["gaming"]
		//userData["adult"] = data["adult"]
		//userData["private"] = data["private"]
		//userData["recordings"] = data["recordings"]
		//userData["online"] = data["online"]
		decrementB();
	})
}

function _toggleFlag(apiurl, key, cb){
	let newVal = !userData[key] // temporary variable because its not set until post returns
	post(apiurl, {"enable":newVal}, (data)=>{
		userData[key] = newVal
		cb({"key":key,"value":newVal})
	}, (data)=>{
		cb({"key":key,"value":userData[key]})
		addMessage(data)
	})
}
function clearOldUpdater(){
	if(updater){clearInterval(updater)}
}
function forceUpdate(cb=undefined){
	clearOldUpdater()
	updater = setInterval(update, settings["updateTime"])
	update(cb)
}
// called when settings update
function updateSettings(){
	chrome.storage.local.get(settings, (data)=>{
		// set from saved data
		settings = data
		
		// hide Picarto official notification bar
		if(settings["picartobar"]){
			console.log("Hiding official Picarto bar");
			notificationBlocker = chrome.webRequest.onBeforeRequest.addListener(() => {
				return {cancel: true};},{
				"urls" : ["*://*.picarto.tv/js/realtime_notifications.min.js"],
				"types" : ["script"]},["blocking"]
			)
		}else if(notificationBlocker != undefined){
			chrome.webRequest.onBeforeRequest.removeListener(notificationBlocker)
		}
	})
}

function oauth(interactive = false){
	chrome.identity.launchWebAuthFlow({'url': picartoURL,'interactive': interactive}, (redirect_url) => {
		let parsed = tokenRegex.exec(redirect_url)
		if(parsed){
			picartoToken = "Bearer " + parsed[1]
			chrome.browserAction.setPopup({"popup":popupHTML})
			chrome.browserAction.setBadgeBackgroundColor({"color":[0,0,0,0]})
			forceUpdate()
		}else{ // fail state
			picartoToken = ""
			console.group("OAuth2 Failed:")
			console.log(redirect_url)
			console.log(parsed)
			console.groupEnd()

		}
	})
}

function CollectData(){
	return {"streams":streams, "multidata":multiData, "userdata":userData, "messages":messages, "recordings":recordings,"settings":settings}
}

settings = defaults // set settings initially to defaults
updateSettings() // update settings with stored data and update functions
//chrome.browserAction.setBadgeBackgroundColor({"color":[0,0,0,0]})
if(picartoToken == ""){
	chrome.browserAction.setBadgeText({"text": "Login"})
	chrome.browserAction.setTitle({"title": "Login to Picarto"})
	chrome.browserAction.setPopup({"popup":""})
	chrome.browserAction.onClicked.addListener(()=>{oauth(true)}) // oauth resets the popup html
}

// add listener to the desktop notification popups
chrome.notifications.onClicked.addListener((notificationId)=>{
	if(notificationId.charAt(0) == ' '){
		if(notificationId.charAt(1) == 'I'){
			post("https://api.picarto.tv/v1/user/multistream/accept", notificationId.slice(2))
			window.open('https://picarto.tv/' + userData["name"], '_blank');
		}else if(notificationId.charAt(1) == 'F'){
			window.open('https://picarto.tv/' + notificationId.slice(2), '_blank');
		}
	}else{
		window.open('https://picarto.tv/' + notificationId, '_blank');
		if(settings["automark"]){
			markRead(streams[notificationId])
			liveCount -= 1
			updateBadge()
		}
	}
	chrome.notifications.clear(notificationId, ()=>{});
});

// listen for messages from other pages
chrome.runtime.onMessage.addListener((request, sender, sendResponse)=>{
	switch (request["msg"]) {
		case "settingsUpdated":
			updateSettings()
			forceUpdate()
			break;
		case "getSettings":
			sendResponse(settings)
			return true
		case "getDefaults":
			sendResponse(defaults)
			return true
		case "getUpdate":
			// TODO interrupt update loop for up to date info here
			sendResponse(CollectData())
			return true
		case "forceUpdate":
			forceUpdate(()=>{
				chrome.runtime.sendMessage({
					"msg":"update",
					"data":CollectData()
				})
			})
			break
		case "markStreamRead": // does not require popup update
			markRead(streams[request["data"]])
			updateBadge()
			break
		case "viewStream":
			window.open("https://picarto.tv/" + request["data"], '_blank')
			if(settings["automark"]){
				markRead(streams[request["data"]])
				liveCount -= 1
				updateBadge()
			}
			break
		case "viewRecording":
			let rnote = recordings[request["data"]]
			window.open(rnote["uri"], '_blank');
			if(settings["automark"]){
				markRead(rnote)
			}
			break;
		case "markRecordingRead": // does not require popup update
			markRead(recordings[request["data"]])
			break
		case "deleteRecording": // does not require popup update
			let uuid = request["data"]
			delNotification(uuid)
			delete recordings[uuid]
			break
		case "deleteMessage": // does not require popup update
			delete messages[request["data"]]
			if(Object.keys(messages).length <= 0){
				chrome.browserAction.setBadgeBackgroundColor({"color":[0,0,0,0]})
			}
			break
		case "toggleStreamFlag":
			let sKey = request["data"]
			_toggleFlag("https://api.picarto.tv/v1/user/streamflags/"+sKey, sKey, (data)=>{
				chrome.runtime.sendMessage({"msg":"setStreamFlag","data":data})
			})
			break
		case "togglePremiumFlag":
			let pKey = request["data"]
			_toggleFlag("https://api.picarto.tv/v1/user/"+pKey+"/state", pKey, (data)=>{
				chrome.runtime.sendMessage({"msg":"setPremiumFlag","data":data})
			})		
			break
		case "declineInvite":
			post("https://api.picarto.tv/v1/user/multistream/decline", {"channel_id":request["data"]})
			updateBadge()
			break
		case "acceptInvite":
			post("https://api.picarto.tv/v1/user/multistream/accept", {"channel_id":request["data"]})
			// TODO?
			break
		case "inviteNameToMulti":
			if(request["data"] == ""){
				addMessage("Person to Invite cannot be empty")
				return
			}
			get("https://api.picarto.tv/v1/channel/name/"+request["data"], (data)=>{
				post("https://api.picarto.tv/v1/user/multistream/invite", {"channel_id":data["user_id"]}, (data1)=>{
					// TODO success?
					console.log(data1)
				})
			})
			break
		case "revokeInvite":
			// TODO
			break
		case "leaveMulti": // remove self
			post("https://api.picarto.tv/v1/user/multistream/remove", {"channel_id":userData["user_id"]})
			break
		case "kickStreamer": // remove streamer
			post("https://api.picarto.tv/v1/user/multistream/remove", {"channel_id":request["data"]})
			break
		default:
			console.group("Unknown request sent to global.js")
			console.log(sender)
			console.log(request)
			console.groupEnd()
	}
	return false;
});


document.addEventListener("online", ()=>{forceUpdate();})
document.addEventListener("offline", ()=>{clearOldUpdater();})
window.addEventListener("error", (e)=>{console.log(e);addMessage(e);})

