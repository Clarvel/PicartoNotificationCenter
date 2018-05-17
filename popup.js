let _div = document.createElement("div")
function sanitize(text){
	_div.textContent = text
	return _div.textContent
}

function createNotificationHTML (name, unread=true, canInvite=false) {
	return `<div data-id=`+name+` class="notification livestream`+
	(unread?``:` read`)+
	`"><img class="avatar" src="https://picarto.tv/user_data/usrimg/`+
	name.toLowerCase()+
	`/dsdefault.jpg"><span class="message">`+
	name+
	`</span>`+
	(canInvite?`<span class="icon" title="Invite to MultiStream">&#xe814;</span>`:``)+
	`<span class="icon markRead" title="Mark as Read"></span></div>`
}

function createInviteHTML(name, type){
	let text = ``
	let title = ``
	switch (type) {
		case "invite":
			text = `Invite from `+name+`</span><span class="icon" title="Accept">&#xe812;`
			title = `Decline`
			break
		case "attend":
			text = `Streaming with `+name
			title = `Leave Session`
			break
		case "send":
			text = `Invited `+name
			title = `Revoke Invite`
			break
		case "hosting":
			text = name + ` Accepted`
			title = `Remove from Session`
			break
		default:
			throw new Exception("Invite function received unexpected type: "+type)
	}
	return `<div class="invite notification" data-name="`+name+
		`"><img class="avatar" src="https://picarto.tv/user_data/usrimg/`+
		name.toLowerCase()+`/dsdefault.jpg"><span class="message">`+text+
		`</span><span class="icon markRead" title="`+title+`"></span></div>`
} 

function createMsgHTML(data){//  text, count){
	let html = ""
	let id = 0
	for(let text in data){
		let count = data[text]
		html += `<div class="notification"><span class="message"`+(count>0?` data-count=`+count:'')+
		` id="`+text+ // TODO test 'text' script injection?
		`"></span><span class="icon dismiss" title="Dismiss"></span></div>`
	}
	msgBoxElem.innerHTML = html
	for(let a in data){
		document.getElementById(a).textContent = a
	}
}

function recordingsHTML(data){
	let html = ""
	let startID = counterID = 0
	let unreadCount = 0
	for(let a in data){
		let note = data[a]
		let unread = note["unread"]
		html = `<div class="notification livestream`+(unread?``:` read`)+`" data-id="`+
		a+`"><img class="avatar" src="https://picarto.tv/user_data/usrimg/`+
		note["channel"].toLowerCase()+`/dsdefault.jpg"><span class="message" id="r`+ counterID++ +`"></span>`+
		`<span class="icon markRead" title="Mark as Read"></span></div>`+html

		if(unread){unreadCount+=1;}
	}
	recordingsElem.innerHTML = html
	for(let a in data){
		document.getElementById('r'+startID++).textContent = data[a]["channel"]+" - "+ new Date(data[a]["timestamp"]).toString()
	}
	return unreadCount;
}


function update(){
	chrome.runtime.sendMessage({"msg":"getUpdate"}, (data)=>{
		console.log(data)

		let numLive = Object.keys(data["streams"]).length
		headerElem.textContent = numLive+' Pe'+(numLive==1?"rson":"ople") + " Streaming"+(numLive>0?':':'')
		let streaming = data["userdata"]["streaming"]
		if(streaming){// set buttons
			dashboardElem.style.removeProperty("display") // display it
			for(let a in buttonElems){
				if(data["userdata"][a]){
					buttonElems[a].classList.add("toggled")
				}
			}
			if(data["userdata"]["premium"]){
				premiumFlags.style.removeProperty("display")
			}
		}
		streaming = streaming && data["userdata"]["premium"] // set canInvite
		if(streaming){
			inviteButtonElem.style.removeProperty("display")
		}

		// load streams
		let html = ""
		for(let a in data["streams"]){
			html += createNotificationHTML(a, data["streams"][a]["unread"], streaming)
		}
		streamsElem.innerHTML = html
		// load invites
		html = ""
		for(let a in data["multidata"]["incoming"]){
			html += createInviteHTML(a)
		}
		invitesElem.innerHTML = html
		// load messages
		createMsgHTML(data["messages"])
		
		if(Object.keys(data["recordings"]).length > 0){
			recordingElem.style.removeProperty("display")
			let recordingsCount = recordingsHTML(data["recordings"]) // also makes the html
			if(recordingsCount > 0){
				recordingElem.dataset.count = recordingsCount
			}else{
				delete recordingElem.dataset.count
			}
		}else{
			//recordingElem.remove()
		}
	})
}
// because I'm lazy and don't want to manually set all these
function onFocus(elem){
	if(elem.title == "Accept"){
		elem.parentElement.classList.toggle("accept");
	}else if(elem.title == "Decline"){
		elem.parentElement.classList.toggle("decline");
	}else if(elem.title == "Mark as Read" || elem.title == "Dismiss"){
		elem.parentElement.classList.toggle("mark");
	}
}
// because I'm lazy and don't want to manually set all these
function onClick(elem){
	if(elem.title == "Accept"){// accept multi invite
		chrome.runtime.sendMessage({"msg":"acceptInvite", "data":elem.parentElement.dataset.name})
		// TODO what to do wth the element
	}else if(elem.title == "Decline"){// decline multi invite
		chrome.runtime.sendMessage({"msg":"declineInvite", "data":elem.parentElement.dataset.name})
		elem.parentElement.remove()
	}else if(elem.title.startsWith("Toggle")){ // all three toggle buttons
		elem.classList.add("loading");
		chrome.runtime.sendMessage({"msg":"toggleStreamFlag","data":elem.id})
	}else if(elem.id == "private" || elem.id == "recordings"){
		elem.classList.add("loading")
		chrome.runtime.sendMessage({"msg":"togglePremiumFlag","data":elem.id})
	}else if(elem.title == "Dismiss"){ // delete error message
		chrome.runtime.sendMessage({"msg":"deleteMessage", "data":elem.dataset.id})
		elem.parentElement.remove()
	}else if(elem.title == "Leave Session"){ // leave multistream
		chrome.runtime.sendMessage({"msg":"leaveStream", "data":elem.parentElement.dataset.name})
		elem.parentElement.remove()
	}else if(elem.title == "Revoke Invite"){ // remove invite
		chrome.runtime.sendMessage({"msg":"revokeInvite", "data":elem.parentElement.dataset.name})
		elem.parentElement.remove()
	}else if(elem.title == "Remove from Session"){ // kick from stream you're hosting
		chrome.runtime.sendMessage({"msg":"kickStreamer", "data":elem.parentElement.dataset.name})
		elem.parentElement.remove()
	}else if(elem.id == "invite"){
		modalElem.style.opacity = "1"
		delete modalElem.style.removeProperty("pointer-events")
		modalElems["invitemodal"].style.display = ""
	}else if(elem.id == "seerecordings"){
		modalElem.style.opacity = "1"
		delete modalElem.style.removeProperty("pointer-events")
		modalElems["recordingsmodal"].style.display = ""
		document.body.style.minHeight = 150 // ensure we can see all of it
	}else if(elem == inviteButton){
		sendNamedInvite(inviteeElem.value)
		inviteeElem.value = ""
	}else if(elem == modalElem || elem.id == "closemodal"){
		modalElem.style.opacity = "0"
		modalElem.style.pointerEvents = "none"
		for(let a in modalElems){
			modalElems[a].style.display = "none"
		}
	}else if(elem.id == "markrecordsread"){
		for(let a=recordingsElem.children.length-1; a >= 0; a--){
			let note = recordingsElem.children[a]
			if(!note.classList.contains("read")){
				chrome.runtime.sendMessage({"msg":"markRecordingRead", "data":note.dataset.id})
			}
			note.classList.add("read")
			note.lastChild.classList.add("hidden")
		}
		delete recordingElem.dataset.count
	}
}

function clickInStreamsElem(elem, parent){
	if(elem.title == "Invite to MultiStream"){
		sendNamedInvite(parent.dataset.id)
		// TODO pending status?
		return;
	}
	if(elem.title != "Mark as Read"){
		chrome.runtime.sendMessage({"msg":"viewStream", "data":parent.dataset.id})
	}
	chrome.runtime.sendMessage({"msg":"markStreamRead", "data":parent.dataset.id})
	parent.classList.add("read");
	parent.lastChild.classList.add("hidden")
}

function clickInRecordingsElem(elem, parent){
	if(elem.title != "Mark as Read"){
		//chrome.runtime.sendMessage({"msg":"viewRecording", "data":parent.dataset.id})
	}
	chrome.runtime.sendMessage({"msg":"markRecordingRead", "data":parent.dataset.id})
	if(!parent.classList.contains("read") && recordingElem.dataset.count){
		let val = recordingElem.dataset.count - 1
		if(val > 0){
			recordingElem.dataset.count = val
		}else{
			delete recordingElem.dataset.count
		}
	}
	parent.classList.add("read");
	parent.lastChild.classList.add("hidden")
}

function sendNamedInvite(name){
	chrome.runtime.sendMessage({"msg":"inviteNameToMulti", "data":name})
}

// because I want error messages to show immediately
chrome.runtime.onMessage.addListener((request, sender, sendResponse)=>{
	switch (request["msg"]) {
		case "addMessage":
			let elem = document.getElementById(request["data"][0])
			if(elem){
				elem.dataset.count = request["data"][1]
			}else{
				console.log(request["data"])
				let html = createMsgHTML(...request["data"])
				msgBoxElem.innerHTML += html
			}
			break;
		case "setPremiumFlag":
		case "setStreamFlag":
			let elemF = buttonElems[request["data"]["key"]]
			if(request["data"]["value"]){
				elemF.classList.add("toggled")
			}else{
				elemF.classList.remove("toggled")
			}
			elemF.classList.remove("loading")
			break
		default:
			console.group("Unknown request sent to popup.js")
			console.log(sender)
			console.log(request)
			console.groupEnd()
	}
})


let headerElem = null;
let streamsElem = null;
let invitesElem = null;
let inviteButtonElem = null
let msgBoxElem = null;
let dashboardElem = null;
let recordingElem = null;
let buttonElems = {};
let modalElem = null;
let modalElems = {};
let inviteeElem = null;
let inviteButton = null;
let cancelButton = null;
let recordingsElem = null;
let premiumFlags = null;

window.onload = ()=>{
	headerElem = document.getElementById("header")
	streamsElem = document.getElementById("streamslist")
	invitesElem = document.getElementById("multilist")
	inviteButtonElem = document.getElementById("invite")
	msgBoxElem = document.getElementById("msgslist")
	dashboardElem = document.getElementById("dashboard")
	recordingElem = document.getElementById("seerecordings")
	buttonElems["commission"] = document.getElementById("commission")
	buttonElems["gaming"] = document.getElementById("gaming")
	buttonElems["adult"] = document.getElementById("adult")
	buttonElems["recordings"] = document.getElementById("recordings")
	buttonElems["private"] = document.getElementById("private")
	modalElem = document.getElementById("modal")
	modalElems["invitemodal"] = document.getElementById("invitemodal")
	modalElems["recordingsmodal"] = document.getElementById("recordingsmodal")
	inviteeElem = document.getElementById("invitee")
	inviteButton = document.getElementById("invitebutton")
	cancelButton = document.getElementById("cancelbutton")
	recordingsElem = document.getElementById("recordingslist")
	premiumFlags = document.getElementById("premiumflags")

	inviteeElem.addEventListener("keypress", (evt)=>{if(evt.key === "Enter"){
		sendNamedInvite(inviteeElem.value);
		inviteeElem.value = "";
	}})


	update()

	document.addEventListener("click", (e)=>{
		let parents = e.composedPath();
		console.log(streamsElem)
		console.log(parents)
		console.log(parents.includes(streamsElem))
		if(parents.includes(streamsElem)){
			clickInStreamsElem(e.target, parents[parents.indexOf(streamsElem)-1])
		}else if(parents.includes(recordingsElem)){
			clickInRecordingsElem(e.target, parents[parents.indexOf(recordingsElem)-1])
		}else{
			onClick(e.target)
		}
	})
	document.addEventListener("mouseover", (e)=>{onFocus(e.target)})
	document.addEventListener("mouseout", (e)=>{onFocus(e.target)})
}
