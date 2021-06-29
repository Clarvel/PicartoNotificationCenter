import {FormatString} from "./utils.js"
import {Browser} from "./browser.js"

export class BadgeController{
	constructor(language){
		this._language = language

		this._liveCount = 0
		this._inviteCount = 0
		this._popupHTML = ""
		this._listeners = []

		this.OnClicked(()=>{this._OnBadgeclicked()})
	}

	Load(){
		return Browser.GetPopup({}, (html)=>{
			this._popupHTML = html
		})
	}

	get LiveCount(){return this._liveCount}
	set LiveCount(value){this._liveCount = value}

	get InviteCount(){return this._inviteCount}
	set InviteCount(value){this._inviteCount = value}

	UpdateBadge(){
		let texts = []
		let tooltips = []

		if(this._liveCount > 0){
			texts.push(this._liveCount.toString())
		}
		tooltips.push(this._liveCount == 1 ? "badgeStreamingSingle" : "badgeStreamingPlural")
		if(this._inviteCount > 0){
			texts.push(this._inviteCount.toString())
			tooltips.push(this._inviteCount == 1 ? "badgeInvitesSingle" : "badgeInvitesPlural")
		}
		return this._language.Get(tooltips).then((data)=>{
			BadgeController.SetBadge(texts.join(", "), data.map((t,i)=>FormatString(t,texts[i])).join("\n"))
		})
	}

	static SetBadge(text, tooltip){
		Browser.SetBadgeText(text)
		Browser.SetBadgeTitle(tooltip)
	}

	_OnBadgeclicked(){
		for(let a in this._listeners){
			setTimeout(this._listeners[a], 0)
		}
	}

	OnBadgeClicked(func){this._listeners.push(func)}

	DisablePopup(){
		this.EnablePopup("")
	}

	EnablePopup(html=this._popupHTML){
		Browser.SetPopup(html)
	}

	OnClicked(func){
		Browser.OnBadgeClicked(func)
	}
}