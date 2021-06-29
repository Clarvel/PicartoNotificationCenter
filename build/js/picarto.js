
import {OAuth2} from "./oauth.js"
import {EncodeDataURL} from "./utils.js"

export class PicartoData{
	constructor(){
		this.UserData
		this.Reset()
	}

	ToJSON(sendRecordings=false){
		return {
			"streams":this.Streams, 
			"recordings":sendRecordings ? this.Recordings : null,
			"multidata":this.MultiData, 
			"messages":this.Messages,
			"userdata":this.UserData, 
		}
	}

	Reset(){
		this.Streams = {} 
		this.Recordings = {}
		this.MultiData = {}
		this.Messages = {} // ???
		/**
		 * @type {PicartoUserData}
		 */
		this.UserData = null
		this.Follows = {} // TODO unhandled
	}
}

export class PicartoUserData{
	/**
	 * 
	 * @param {string} name 
	 * @param {string} avatar 
	 * @param {boolean} premium 
	 * @param {boolean} streaming 
	 * @param {boolean} commission 
	 * @param {boolean} adult 
	 * @param {boolean} recordings 
	 * @param {boolean} private 
	 * @param {boolean} gaming 
	 * @param {string} private_message 
	 */
	constructor(name, avatar, premium, streaming, commission, adult, recordings, isprivate, gaming, private_message){
		this.name = name
		this.avatar = avatar
		this.premium = premium
		this.streaming = streaming
		this.commission = commission
		this.adult = adult
		this.recordings = recordings
		this.private = isprivate
		this.gaming = gaming
		this.private_message = private_message
	}
}

/*export class Person{
	constructor(obj){
		this._name = obj["name"]
		this._id = obj["user_id"]
		this._online = obj["online"] || false
	}
	get Name(){return this._name}
	get ID(){return this._id}
	get Online(){return this._online}
	set Online(val){this._online = val}
}*/

/*export class Notification{
	constructor(aboutObj, read=false){
		this._content = aboutObj
		this._read = read
	}
	get Content(){return this._content}
	get Read(){return this._read}
	set Read(val){this._read = val}
}*/

export class PicartoAPI{
	/**
	 * 
	 * @param {OAuth2} oauth 
	 */
	constructor(oauth){
		this._oauth = oauth
	}
	/**
	 * 
	 * @param {string} channel 
	 */
	//static GetImageURLForChannel(channel){return "https://picarto.tv/user_data/usrimg/"+channel.toLowerCase()+"/dsdefault.jpg"}

	/**
	 * 
	 * @param {string} path 
	 * @returns 
	 */
	static GetAPIURI(path){return "https://api.picarto.tv/api/v1/"+path}

	/**
	 * 
	 * @param {string} channel 
	 * @returns 
	 */
	static GetChannelURL(channel){return "https://picarto.tv/"+channel}

	/**
	 * 
	 * @param {string} uri 
	 * @param {string} type 
	 * @param {*} payload 
	 * @returns 
	 */
	_Request(uri, type, payload={}){
		let token = this._oauth.Token
		if(token == null){
			return Promise.reject("Invalid Token")
		}
		return fetch(EncodeDataURL(uri, payload), {
			"method":type,
			"headers":{"Authorization":token}
		})/*.catch((err)=>{
			// catch fetch-specific errors, make SURE they're logged
			console.warn(err)
			throw err
		})*/.then((response)=>{
			if(response.ok){
				return response.json().catch(()=>{return {}}) // response text is "OK"
			}
			//console.log(response["status"], response)

			// this should really happen in background.js
			/*if(response["status"] === 403){
				this._oauth.Refresh()
			}*/

			return response.text().then((text)=>{
				let error = new Error(`Data Retrieval Failed (${response["status"]}): ${text}`)
				error.status = response["status"]
				throw error
			})
		})
	}

	POST(uri, payload=undefined){return this._Request(uri, "POST", payload)}

	GET(uri){return this._Request(uri, "GET")}

	GetUserData(){return this.GET(PicartoAPI.GetAPIURI("user"))}

	GetNotifications(){return this.GET(PicartoAPI.GetAPIURI("user/notifications"))} // depreciate this for all but recordings

	MarkNotificationRead(uuid){return this.POST(PicartoAPI.GetAPIURI(`user/notifications/${uuid}/read`))}

	DeleteNotification(uuid){return this.POST(PicartoAPI.GetAPIURI(`user/notifications/${uuid}/delete`))}

	//GetOnlineStreams(showAdult, showGaming){return this.GET(OAuth2.EncodeURL(PicartoAPI.GetAPIURI("online"), {"adult":showAdult, "gaming":showGaming}))} // depreciate this

	GetMultistreamData(){return this.GET(PicartoAPI.GetAPIURI("user/multistream"))}

	AcceptMultistreamInvite(channelID){return this.POST(PicartoAPI.GetAPIURI("user/multistream/accept"), {"channel_id":channelID})}

	DeclineMultistreamInvite(channelID){return this.POST(PicartoAPI.GetAPIURI("user/multistream/decline"), {"channel_id":channelID})}

	SendMultistreamInvite(channelID){return this.POST(PicartoAPI.GetAPIURI("user/multistream/invite"), {"channel_id":channelID})}

	RevokeMultistreamInvite(channelID){return this.POST(PicartoAPI.GetAPIURI("user/multistream/remove"), {"channel_id":channelID})}

	GetChannelIDFromName(channelName){return this.GET(PicartoAPI.GetAPIURI("channel/name/"+channelName)).then(data=>data["user_id"])}

	ToggleStreamFlag(flag, enable){return this.POST(PicartoAPI.GetAPIURI("user/streamflags/"+flag), {"enable":enable})}

	GetFollowing(pageNum=0, prioritizeOnline=true){return this.GET(EncodeDataURL(PicartoAPI.GetAPIURI("user/following"), {"page":pageNum, "priority_online":prioritizeOnline}))} // may want to use this over notifications data

	GetSubscriptions(pageNum=0, prioritizeOnline=true){return this.GET(EncodeDataURL(PicartoAPI.GetAPIURI("user/subscriptions"), {"page":pageNum, "priority_online":prioritizeOnline}))} // may want to use this over notifications data

	// get private token(private_key) from api/user data
	TogglePrivateStream(enable){return this.POST(PicartoAPI.GetAPIURI("user/private/state"), {"enable":enable})} // enable = true generates new token regardless of state

	SetPrivatetoken(token){return this.POST(PicartoAPI.GetAPIURI("user/private/token"), {"token":token})}

	SetPrivateStreamMessage(message){return this.POST(PicartoAPI.GetAPIURI("user/private/message"), {"message":message})}

	ToggleRecordingState(enable){return this.POST(PicartoAPI.GetAPIURI("user/recordings/state"), {"enable":enable})}
}