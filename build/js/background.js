
import {Language} from "./lang.js"
import {SyncSaveable} from "./saveable.js"
import {Settings, EnumSetting, RangeSetting, BoolSetting} from "./settings.js"
import {OAuth2} from "./oauth.js"
import {PicartoData, PicartoAPI, PicartoUserData} from "./picarto.js"
import {BadgeController} from "./badge.js"
import {NotificationsController} from "./notifications.js"
import {Communication} from "./communication.js"
import {Browser} from "./browser.js"
import {Promisify} from "./utils.js"
import {OBS_background, OBS_unread} from "./obfuscator.js"

class BackgroundCommunicator extends Communication{
	constructor(settings, picartoData){
		super(OBS_background)
		this._settings = settings
		this._picartoData = picartoData
	}

	ProcessMessage(type, data){
		//console.log(type, data)
		switch(type){
			case "SetSettings":
				this._settings.FromJSON(data)
				return forceUpdate() // because some settings depend on user data when displayed
			case "ResetSettings":
				this._settings.ResetAll()
				return this._settings.ToJSON()
			case "GetSettings":
				return this._settings.ToJSON()
			case "GetLanguage":
				return this._settings.language.ToJSON() // TODO better way to pick out setting?
			case "GetData":
				return this._picartoData.ToJSON(this._settings.records.Value)
			case "GetUserData":
				return this._picartoData.UserData
			case "ForceUpdate":
				return forceUpdate()
			case "MarkStreamRead":
				picartoData.Streams[data][OBS_unread] = false // TODO sync?
				updateBadge()
				return true
			case "MarkRecordingRead":
				picartoData.Recordings[data][OBS_unread] = false // TODO sync?
				return true
			case "ViewStream":
				Browser.OpenInNewTab(PicartoAPI.GetChannelURL(data)) // windows cant be serialized
				return true
			case "ViewRecording":
				Browser.OpenInNewTab(picartoData.Recordings[data]["uri"])
				return true
			case "LogoutRequest":
				oauth.Invalidate()
				picartoData.Reset()
				return SetBadgeToLoginState()
			case "LoginRequest":
				return OnLoginRequest().catch(console.warn())
			case "MarkRecordingRead":
			case "DeleteRecording":
			case "TogglePrivateState":
				return picartoAPI.TogglePrivateState(!data["value"]).then(console.log)
			case "ToggleRecordingsState":
				return picartoAPI.ToggleRecordingState(!data["value"]).then(console.log)
			case "ToggleStreamFlag":
				let value = !picartoData.UserData[data]
				return picartoAPI.ToggleStreamFlag(data, value).then(()=>{
					picartoData.UserData[data] = value
					communication.SendMessage("SetStreamFlag", {"flag":data,"value":value}, ["options", "popup"])
				})
			case "RejectInvite":
			case "AcceptInvite":
			case "SendInvite":
			default:
			console.group("Unknown Message sent to background worker")
			console.warn(type)
			console.log(data)
			console.groupEnd()
		}
	}
}

let sync = new SyncSaveable("sync", false, "syncDataSetting", true)
let settings = new Settings({
	language:new EnumSetting({
		"en":"englishOption",
	}, "en", "languageSetting", true),
	streamer:new BoolSetting(false, "streamerSetting"),
	premium:new BoolSetting(false, "premiumSetting"), // TODO set to disabled/hidden before release!
	updateinterval:new EnumSetting({
		  10000:"10s",
		  30000:"30s",
		  60000: "1m",
		 300000: "5m",
		 600000:"10m",
		 900000:"15m",
		1800000:"30m",
		2700000:"45m",
		3600000: "1h",
	}, 600000, "updateIntervalSetting"),
	picartobar:new BoolSetting(false, "picartoBarSetting", true),
	notifications:new BoolSetting(true, "notificationsSetting"),
	volume:new RangeSetting(0, 100, 100, "volumeSetting"),
	showadult:new BoolSetting(false, "showAdultSetting"),
	showgaming:new BoolSetting(true, "showGamingSetting"),
	records:new BoolSetting(false, "recordsSetting", true),
	automark:new BoolSetting(true, "autoMarkSetting"),
	autodelread:new BoolSetting(false, "autoDelReadSetting", true),
	curate:new BoolSetting(false, "curateSetting", true), // TODO when delete notifications is fixed, enable and default to true
	updateMulti:new BoolSetting(false, "updateMultiSetting", true),
}, sync)

let language =  new Language("background")
let picartoData = new PicartoData()
let oauth = new OAuth2("CLIENT_ID", "CLIENT_SECRET", "https://clarvel.github.io/PicartoNotificationCenter/")
let picartoAPI = new PicartoAPI(oauth)
let badge = new BadgeController(language)
let notifications = new NotificationsController(language)
let communication = new BackgroundCommunicator(settings, picartoData)
let audio = new Audio("../audio/ding.ogg")

let updateInterval = undefined
let notificationBlocker = undefined
let updater = null

function clearOldUpdater(){
	if(updater != null){clearInterval(updater)}
}

function forceUpdate(){ // forces update to happen and resets the update interval
	clearOldUpdater()
	updateInterval = setInterval(Update, settings.updateinterval.Value)
	return Update().then(() => {
		return communication.SendMessage("Update").catch((err) => {
			console.warn("Failed to send update ping:", err)
		})
	})
}

function Update(){
	console.log("Updating...")

	if(!oauth.IsValidated){
		console.warn("Not validated, pausing update loop")
		clearOldUpdater()
		return;
	}

	function parsePaged(endpoint, pageNum=1){
		return endpoint(pageNum).then((data)=>{
			if(!Array.isArray(data) || data.length === 0)
				return []

			for(let index in data){
				if(!data[index]["online"]) // paged data is sorted via online first. if we hit a not-online sub, we've hit the end
					return data.slice(0, index)
			}
			return parsePaged(endpoint, pageNum+1).then(data.concat) // recur through all pages
		})
	}
	function parseMultistreams(data){
		for(let a in data["incoming"]){ // for all new invites, create notification
			let user_id = data["incoming"][a]["user_id"]
			if(!picartoData.MultiData["incoming"].find(streamer=>streamer["user_id"] == user_id)){
				NotificationsController.createMultiStreamNotification(data["incoming"][a]["name"], data["incoming"][a]["avatar"])
			}
		}
		picartoData.MultiData = data
		badge.InviteCount = data["incoming"].length
		return badge.UpdateBadge()
	}

	function parseUserData(data){
		let details = data["channel_details"]
		picartoData.UserData = new PicartoUserData(
			details["name"], 
			details["avatar"], 
			settings.premium.Value || details["account_type"] === "premium",
			settings.streamer.Value || details["online"],
			details["commissions"], // because typo?
			details["adult"],
			details["recordings"],
			details["private"],
			details["gaming"],
			details["private"],
			details["private_message"], // TODO unused?
		)
	}

	/*function parseNotifications(data){
		let oldFollows = picartoData.Follows
		picartoData.Follows = {}
		picartoData.Recordings = settings.records.Value ? {} : null

		for(let a in data){ // should be in chronological order
			let note = data[a]

			switch(note["type"]){
				case "follow":
					if(note[OBS_unread] && !(note["uuid"] in oldFollows)){
						notifications.CreateFollowedNotification(note["channel"], note["avatar"])
						console.log(note["channel"] + " followed you!")
					}
					picartoData.Follows[note["uuid"]] = note
					break;		
				case "recordingCreate":
					if(picartoData.Recordings){ // if want to track records
						picartoData.Recordings[note["uuid"]] = note
						break;
					}
				default:
					if(settings.curate.Value){
						picartoAPI.DeleteNotification(note["uuid"])
					}
					break;
			}
		}
	}*/

	function parseLive(online){
		let old = picartoData.Streams
		picartoData.Streams = {}

		for(let stream of online.flat()){
			let userID = stream["user_id"]

			if(userID in picartoData.Streams) // if already processed
				continue

			let streamData = {
				"name" : stream["name"],
				"avatar" : stream["avatar"],
			}
				
			if(userID in old){ // carry over unread status
				streamData[OBS_unread] = old[userID][OBS_unread]
			}else{
				notifications.CreateStreamNotification(stream["name"], stream["avatar"])
				streamData[OBS_unread] = true
			}

			picartoData.Streams[userID] = streamData
		}
		updateBadge()
	}

	var updates = [
		Promise.all([
			parsePaged(data=>picartoAPI.GetSubscriptions(data)),
			parsePaged(data=>picartoAPI.GetFollowing(data)),
		]).then(parseLive)
	]
	if(settings.streamer.Value){
		updates.push(picartoAPI.GetMultistreamData().then(parseMultistreams)) // used to get multistream info
		updates.push(picartoAPI.GetUserData().then(parseUserData)) // used to get self-stream info
	}

	return Promise.all([
		//picartoAPI.GetNotifications().then(parseNotifications),
		picartoAPI.GetUserData().then(parseUserData), // TODO only do this periodically?
		picartoAPI.GetMultistreamData().then(parseMultistreams),
		
	]).catch((err)=>{
		if(err.status != null){
			if(err.status === 403){
				oauth.Refresh() // todo re-run update on promise resolve
				// should be able to remove "processing access token refresh" lock in oauth.js after?
				return
			}else if(err.status === 524){
				// TODO lengthen ping timer until fixed
			}
		}
		console.warn(err)
	})
}

function updateBadge(){
	badge.LiveCount = Object.values(picartoData.Streams).filter(x=>x[OBS_unread]).length // todo base on unread
	badge.UpdateBadge()
}

// called to start OAuth flow
function SetBadgeToLoginState(){
	console.log("starting oauth")
	badge.DisablePopup()
	language.Get(["badgeLogin", "badgeLoginTip"]).then((data)=>{
		audio.play()
		BadgeController.SetBadge(data[0], data[1])
	})
}

// called when receiving success from OAuth
function OnOauthSuccess(){
	console.log("OAuth Flow Complete")
	badge.EnablePopup()
	return Promise.all([
		communication.SendMessage("Login", true, ["options", "welcome"]),
		forceUpdate()
	])
}

function OnLoginRequest(){
	return oauth.InitOAuth(true, settings.streamer.Value ? ["readpub", "readpriv", "write"] : ["readpub", "readpriv"]).then(OnOauthSuccess, (err)=>{
		communication.SendMessage("Login", false, ["options", "welcome"])
		throw err
	})
}

settings.language.OnChanged((value)=>{return language.Set(value)})
settings.volume.OnChanged((value)=>{audio.volume = value / 100; return Promise.resolve()})
settings.picartobar.OnChanged((value)=>{return Browser.TogglePicartoBar(value)})
settings.streamer.OnChanged((value)=>{
	if(oauth.IsValidated){
		oauth.Invalidate(false) // invalidate but don't delete storage, is needed on init
		picartoData.Reset()
		SetBadgeToLoginState()
		return communication.SendMessage("Update")
	}
})

notifications.OnNotificationClicked((data)=>{Browser.OpenInNewTab(PicartoAPI.GetChannelURL(data))})
notifications.OnInviteClicked((data)=>{Browser.OpenInNewTab(PicartoAPI.GetChannelURL(data))})
notifications.OnFavoriteClicked((data)=>{Browser.OpenInNewTab(PicartoAPI.GetChannelURL(data))})

Browser.OnActiveStateChanged((isActive)=>{
	if(isActive){
		console.log("Activating")
		forceUpdate().catch(console.warn)
	}else{
		console.log("Deactivating")
		clearOldUpdater()
	}
})

// functionality to start oauth, is overridden only when popup is enabled
badge.OnClicked(()=>{OnLoginRequest().catch(console.warn)})

window.addEventListener("online", ()=>{console.log("Came Online");forceUpdate().catch(console.warn)})
window.addEventListener("offline", ()=>{console.log("Went Offline");clearOldUpdater()})
window.addEventListener("error", console.error)

let installedPromise = Promisify(Browser.OnInstalled)
window.onload = ()=>{
	Promise.all([
		badge.Load(),
		sync.Load().catch(console.warn).finally(()=>{ // suppress rejects here, missing settings shouldnt interrupt startup
			return settings.Load().catch(console.warn)
		}),
	]).finally(()=>{
		let oauthPromise = oauth.Load() // suppress reject below, reject is used in return promise
		// open welcome screen if new install, or there's no validated oauth
		// don't care when this executes
		Promise.all([installedPromise, oauthPromise.catch(console.warn)]).then((arr)=>{
			console.log(arr, oauth.IsValidated)
			if(arr[0].reason === "install" || !oauth.IsValidated){
				Browser.OpenInNewTab("/html/welcome.html")
			}
			installedPromise = undefined;
		}, console.warn)
		return oauthPromise.then(OnOauthSuccess, SetBadgeToLoginState)
	}, console.error)
}









