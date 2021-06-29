
import {PicartoAPI} from "./picarto.js"
import {Browser} from "./browser.js"

export class NotificationsController{
	static modSeparator = '_'
	static followMod = 'F'
	static inviteMod = 'I'

	constructor(language){
		this._language = language

		this._onInvite = []
		this._onFavorite = []
		this._onNotification = []

		Browser.OnNotificationClicked((data)=>{this._OnNotificationClicked(data)})
	}

	CreateNotification(title, message, channel, iconUrl="", modifier=' '){
		let id = modifier + NotificationsController.modSeparator + channel
		console.log("Creating Notification for " + id)
		Browser.ClearNotification(id)
		Browser.CreateNotification(id, title, message, iconUrl)
	}

	CreateStreamNotification(channelName, iconUrl=""){
		this._language.Get("streamingNotification").then(text=>this.CreateNotification(channelName, text, channelName, iconUrl))
		//if(settings.alert.Value){
		//	this._sound.play()
		//}
	}

	CreateFollowedNotification(channelName, iconUrl=""){
		this._language.Get("followedNotification").then(text=>this.CreateNotification(channelName, text, channelName, iconUrl, NotificationsController.followMod))
	}

	CreateMultistreamInviteNotification(channelName, iconUrl=""){
		this._language.Get("multiInviteNotification").then(text=>this.CreateNotification(channelName, text, channelName, iconUrl, NotificationsController.inviteMod))
	}

	_OnNotificationClicked(notificationID){ // TODO hook up this functionality elsewhere
		let index = notificationID.indexOf(NotificationsController.modSeparator)
		let modifier = notificationID.slice(0, index)
		let channel = notificationID.slice(index + 1)

		if(modifier == NotificationsController.followMod){
			//this._picartoAPI.AcceptMultistreamInvite(channel)
			//UI.OpenPicartoStream(channel)
			NotificationsController._InvokeListeners(this._onInvite, channel)
		}else if(modifier == NotificationsController.inviteMod){
			// TODO acknowlege the follow?
			NotificationsController._InvokeListeners(this._onFavorite, channel)
		}else{
			//UI.OpenPicartoStream(notificationID)
			//if(settings.automark.Value){
			//	this._liveCount -= 1
			//	this.UpdateBadge()
			//}
			NotificationsController._InvokeListeners(this._onNotification, channel)
		}
		Browser.ClearNotification(notificationID)
	}

	static _InvokeListeners(listeners, data){
		for(let a in listeners){
			setTimeout(listeners[a], 0, data)
		}
	}

	OnNotificationClicked(func){this._onNotification.push(func)}
	OnInviteClicked(func){this._onInvite.push(func)}
	OnFavoriteClicked(func){this._onFavorite.push(func)}
}