/**/
import {BackgroundCommunication} from "./communication.js"
import {Language} from "./lang.js"
import {FormatString} from "./utils.js"
import {PicartoAPI} from "./picarto.js"
import {Browser} from "./browser.js"


class PopupCommunicator extends BackgroundCommunication{
	constructor(){super("popup")}

	ProcessMessage(type, data){
		switch(type){
			case "AddMessage":
			// TODO
				break;
			case "SetPrivateState":
			case "SetRecordingState":
			case "SetStreamFlag":
				let classList = flagElems[data["flag"]].classList
				classList.toggle("toggled", data["value"])
				classList.remove("loading")
				break
			//case "UpdateData":
			//	UpdateData(data)
			//	break
			default:
				console.group("Unknown Message sent to popup page")
				console.warn(type)
				console.log(data)
				console.groupEnd()
		}
	}
}

let popupHeaderElem = null
let headerElems = {}

let streamsListElem = null
let multistreamListElem = null
let messagesListElem = null
let recordingsModalListElem = null

let inviteStreamerButtonElem = null
let viewRecordingsButtonElem = null
let settingsButtonElem = null
let inviteModalInvitebuttonElem = null
let markAllRecordingsReadElem = null
let closeModalButtonElem = null

let flagElems = {}

let modalElem = null
let modalElems = {}

let inviteModalInputElem = null
let streamerFlagsElem = null
let premiumFlagsElem = null

let streamingTemplate = null
let recordingTemplate = null
let multiTemplate = null
let messageTemplate = null

let tooltips = {}

let language = null
let communication = new PopupCommunicator()

function UpdateData(data) {
	console.log(data)
	let userdata = data["userdata"]
	function PopulateContainer(i, e, k){
		e.classList.toggle("read", !i["unread"])
		e.dataset.id = k
		e.dataset.name = i["name"]
	}
	function PopulateList(data, template, container, applyElem, applyContainer=PopulateContainer){
		container.textContent = ""
		for(let index in data){
			let item = data[index]
			let elem = document.importNode(template, true)
			applyElem(item, elem, index)
			elem = elem.querySelector(".notification")
			applyContainer(item, elem, index)
			container.appendChild(elem)
		}
	}
	PopulateList(data["streams"], streamingTemplate, streamsListElem, (i, e)=>{
		e.querySelector("img.avatar").src = i["avatar"]
		e.querySelector(".message").textContent = i["name"]
	})
	PopulateList(data["recordings"], recordingTemplate, recordingsModalListElem, (i, e)=>{
		e.querySelector("img.avatar").src = PicartoAPI.GetImageURLForChannel(i["channel"]) // TODO move this to background process
		e.querySelector(".message").textContent = i["channel"] + "\n" + new Date(i["timestamp"]).toLocaleString()
	})
	PopulateList(data["messages"], messageTemplate, messagesListElem, console.log, console.log)
	//PopulateList(data["multidata"], multiTemplate, multistreamListElem, ()=>{}, ()=>{})

	streamerFlagsElem.classList.toggle("hidden", !userdata["streaming"])
	premiumFlagsElem.classList.toggle("hidden", !userdata["premium"])
	streamsListElem.querySelectorAll(".invitebutton").forEach((elem)=>{elem.classList.toggle("removed", !(userdata["streaming"] && userdata["premium"]))})
	if(data["recordings"]){
		viewRecordingsButtonElem.dataset.count = Object.keys(data["recordings"]).length
	}else{
		viewRecordingsButtonElem.removeAttribute("data-count")
	}
	Object.keys(flagElems).forEach((key)=>{flagElems[key].classList.toggle("toggled", userdata[key])})
	UpdateLanguage(Object.keys(data["streams"]).length)
	language.Get(["sendinviteTooltip", "markreadTooltip"]).then((text)=>{
		console.log(text)
		document.querySelectorAll(".invitebutton").forEach((elem)=>{elem.title = text[0]})
		document.querySelectorAll(".markread").forEach((elem)=>{elem.title = text[1]})
	})
}

function UpdateLanguage(streamingCount){
	console.log(streamingCount)
	function GetText(textKey){
		return language.Get(textKey).then((text)=>{
			if(text == null){throw Error(`[${textKey}] key missing from loaded language`)}
			return text
		}).catch(console.error)
	}
	function LoadTextToContent(textKey, elem){return GetText(textKey).then((text)=>{elem.textContent=text})}
	function LoadTextToTooltip(textKey, elem){return GetText(textKey).then((text)=>{elem.title=text})}

	GetText(streamingCount === 1 ? "popupHeaderSingle" : "popupHeaderMultiple").then((text)=>{
		popupHeaderElem.textContent = FormatString(text, streamingCount)
	})
	for(let key in headerElems){
		LoadTextToContent(key+"Header", headerElems[key])
	}
	for(let key in tooltips){
		LoadTextToTooltip(key+"Tooltip", tooltips[key])
	}
}

function sendNamedInvite(name){
	communication.SendMessage("inviteNameToMulti", name)
}

function closeModal(){
	console.log(modalElem, modalElems)
	modalElem.classList.add("removed")
	for(let a in modalElems){
		modalElems[a].classList.add("removed")
	}
}

function openModal(modalID){
	console.log(modalID)
	modalElem.classList.remove("removed")
	modalElems[modalID].classList.remove("removed")
}

window.onload = ()=>{
	popupHeaderElem = document.getElementById("popupHeader")
	streamsListElem = document.getElementById("streamsList")
	streamerFlagsElem = document.getElementById("streamerFlags")
	inviteStreamerButtonElem = document.getElementById("inviteStreamerButton")
	premiumFlagsElem = document.getElementById("premiumFlags")
	flagElems["private"] = document.getElementById("privateToggle")
	flagElems["recordings"] = document.getElementById("recordingsToggle")
	flagElems["gaming"] = document.getElementById("gamingToggle")
	flagElems["adult"] = document.getElementById("adultToggle")
	flagElems["commission"] = document.getElementById("commissionToggle")
	multistreamListElem = document.getElementById("multistreamList")
	messagesListElem = document.getElementById("messagesList")
	viewRecordingsButtonElem = document.getElementById("viewRecordingsButton")
	settingsButtonElem = document.getElementById("settingsButton")
	modalElem = document.getElementById("modal")
	modalElems["invite"] = document.getElementById("inviteModal")
	headerElems["invite"] = document.getElementById("inviteModalHeader")
	inviteModalInputElem = document.getElementById("inviteModalInput")
	inviteModalInvitebuttonElem = document.getElementById("inviteModalInvitebutton")
	modalElems["recordings"] = document.getElementById("recordingsModal")
	headerElems["recordings"] = document.getElementById("recordingsModalHeader")
	recordingsModalListElem = document.getElementById("recordingsModalList")
	markAllRecordingsReadElem = document.getElementById("markAllRecordingsRead")
	closeModalButtonElem = document.getElementById("closeModalButton")

	streamingTemplate = document.getElementById("streamingTemplate").content
	recordingTemplate = document.getElementById("recordingTemplate").content
	multiTemplate = document.getElementById("multiTemplate").content
	messageTemplate = document.getElementById("messageTemplate").content

	tooltips["inviteStreamer"] = inviteStreamerButtonElem
	tooltips["seerecordings"] = viewRecordingsButtonElem
	tooltips["settings"] = settingsButtonElem
	tooltips["inviteStreamer"] = inviteStreamerButtonElem
	tooltips["markrecordsread"] = markAllRecordingsReadElem
	tooltips["closemodalbutton"] = closeModalButtonElem
	for(let a in flagElems){
		tooltips[a] = flagElems[a]
	}

	inviteModalInputElem.addEventListener("keypress", (evt)=>{
		if(evt.key === "Enter"){
			sendNamedInvite(inviteModalInputElem.value)
			inviteModalInputElem.value = ""
		}
	})


	document.addEventListener("click", (e)=>{
		let elem = e.target
		let parents = e.composedPath()
		let parent = elem.closest(".notification") || elem.parentNode

		if(parents.includes(streamsListElem)){ // click in streams elem
			if(elem.classList.contains("invitebutton")){
				sendNamedInvite(parent.dataset.id)
				// TODO pending status?
			}else if(elem.classList.contains("markread")){
				communication.SendMessage("MarkStreamRead", parent.dataset.id)
				parent.classList.add("read");
				elem.classList.add("hidden")
			}else{
				// this auto-closes the popup so I don't need to mark it as read here - it will update on next open
				console.log(elem, parents, parent, parent.dataset.name)
				communication.SendMessage("ViewStream", parent.dataset.name)
			}
		}else if(parents.includes(recordingsModalListElem)){ // click in recordings elem
			if(elem.classList.contains("markread")){
				communication.SendMessage("MarkRecordingRead", parent.dataset.id)
				if(!parent.classList.contains("read") && viewRecordingsButtonElem.dataset.count){
					let val = viewRecordingsButtonElem.dataset.count - 1
					if(val > 0){
						viewRecordingsButtonElem.dataset.count = val
					}else{
						delete viewRecordingsButtonElem.dataset.count
					}
				}
				parent.classList.add("read");
				elem.classList.add("hidden")
			}else{
				// this auto-closes the popup so I don't need to mark it as read here - it will update on next open
				communication.SendMessage("ViewRecording", parent.dataset.id)
			}
		}else if(parents.includes(messagesListElem)){
			if(elem.classList.contains("dismiss")){
				communication.SendMessage("DeleteMessage", parent.dataset.id)
				parent.remove()
			}
		}else{ // on click somehwere else
			if(elem.classList.contains("dismiss")){
				if(parent.classList.contains("host")){
					communication.SendMessage("LeaveMulti", parent.dataset.id)
				}else if(parent.classList.contains("guest")){
					communication.SendMessage("KickStreamer", parent.dataset.id)
				}else if(parent.classList.contains("outgoing")){
					communication.SendMessage("RevokeInvite", parent.dataset.id)
				}else if(parent.classList.contains("invite")){
					communication.SendMessage("DeclineInvite", parent.dataset.id)
				}else if(elem == closeModalButtonElem){
					console.log(elem)
					closeModal()
				}
			}else if(elem.classList.contains("accept")){
				communication.SendMessage("AcceptInvite", parent.dataset.id)
			}else if(Object.values(flagElems).includes(elem)){
				elem.classList.add("loading");
				communication.SendMessage(
					(elem == flagElems["private"] || elem == flagElems["recordings"])?"TogglePremiumState":"ToggleStreamFlag", 
					Object.keys(flagElems).find(k => flagElems[k] === elem)
				)
			}else if(elem == inviteStreamerButtonElem){
				openModal("invite")
			}else if(elem == viewRecordingsButtonElem){
				openModal("recordings")
				document.body.style.minHeight = 150 // ensure we can see all of it
			}else if(elem == inviteModalInvitebuttonElem){
				sendNamedInvite(inviteModalInputElem.value)
				inviteModalInputElem.value = ""
			}else if(elem == modalElem){
				closeModal()
			}else if(elem.id == "markrecordsread"){
				let records = recordingsModalListElem.children
				for(let a=records.length-1; a >= 0; a--){
					let note = records[a]
					if(!note.classList.contains("read")){
						communication.SendMessage("MarkRecordingRead", note.dataset.id)
					}
					note.classList.add("read")
					note.lastChild.classList.add("hidden")
				}
				delete viewRecordingsButtonElem.dataset.count
			}else if(elem == settingsButtonElem){
				if (chrome.runtime.openOptionsPage) {
					chrome.runtime.openOptionsPage()
				}else{
					Browser.OpenOptionsPage()
				}
			}
		}
	})

	// because I'm lazy and don't want to manually set all these, is a hack for CSS selectors not having :has yet
	function onFocus(elem){
		let parent = elem.closest(".notification")
		if(parent){
			if(elem.classList.contains("accept")){
				parent.classList.toggle("colorizeAccept");
			}else if(elem.classList.contains("dismiss")){
				parent.classList.toggle("colorizeDecline");
			}else if(elem.classList.contains("markread")){
				parent.classList.toggle("mark");
			}
		}
	}
	document.addEventListener("mouseover", (e)=>{onFocus(e.target)})
	document.addEventListener("mouseout", (e)=>{onFocus(e.target)})

	language = new Language("popup")

	Promise.all([
		communication.SendMessage("GetLanguage").then((data)=>{language.Set(data["value"])}),
		communication.SendMessage("GetSettings").then(),
		communication.SendMessage("GetData").then(UpdateData),
	]).catch(console.error)
}