if(chrome){browser = chrome}

function createNotificationHTML(data) {
	let html = ""
	let startID = counterID = 0
	for(let a in data){
		html += `<div class="notification livestream`+(data[a]["unread"]?``:` read`)+`" id="n`+counterID++ +
		`"><img class="avatar" id="n`+counterID++ +`"><span class="message" id="n`+counterID++ +
		`"></span><span class="icon invitebutton" title="Invite to MultiStream"></span><span class="icon markRead" title="Mark as Read"></span></div>`
	}
	streamsElem.innerHTML = html
	for(let a in data){
		document.getElementById("n"+startID++).dataset.id = a
		document.getElementById("n"+startID++).src = "https://picarto.tv/user_data/usrimg/"+a.toLowerCase()+"/dsdefault.jpg"
		document.getElementById("n"+startID++).textContent = a
	}
}
let inviteData = [
	{
		"class":"guest", 
		"buttons":`<span class="icon dismiss" title="Kick from Session"></span>`,
		"text": "%s has Joined"
	},{
		"class":"host", 
		"buttons":`<span class="icon dismiss" title="Lease Session"></span></span>`,
		"text": "%s is Hosting"
	},{
		"class":"outgoing", 
		"buttons":`<span class="icon dismiss" title="Revoke Invite"></span>`,
		"text": "Invited %s"
	},{
		"class":"invite", 
		"buttons":`<span class="icon accept" title="Accept"></span><span class="icon dismiss" title="Decline"></span>`,
		"text": "Invite from %s"
	}
]
function createInviteHTML(data){
	if(data == null || Object.keys(data).length == 0){return}
	console.log(data)
	let html = ""
	let startID = countID = 0
	let host = data["session"]["host"]
	let datas = [data["session"]["guests"],host["name"]==""?[]:[host],data["outgoing"],data["incoming"]]
	for(let a=datas.length-1;a>=0;a--){
		let id = inviteData[a]
		for(let b=datas[a].length-1;b>=0;b--){
			html += `<div class="`+id["class"]+` notification" id="i`+
			countID++ +`"><img class="avatar" id="i`+countID++ +
			`"><span class="message" id="i`+countID++ +`"></span>`+
			id["buttons"]+`</div>`
		}
	}
	invitesElem.innerHTML = html
	for(let a=datas.length-1;a>=0;a--){
		let id = inviteData[a]
		for(let b=datas[a].length-1;b>=0;b--){
			let name = datas[a][b]["name"]
			document.getElementById("i"+startID++).dataset.id = name
			document.getElementById("i"+startID++).src = "https://picarto.tv/user_data/usrimg/"+name.toLowerCase()+"/dsdefault.jpg"
			document.getElementById("i"+startID++).textContent = id["text"].replace("%s", name)
		}
	}
}

function createMsgHTML(data){
	let html = ""
	let startID = countID = 0
	for(let a in data){
		html += `<div class="notification" id="m`+countID++ +`"><span class="message" id="m`+countID++ +
		`"></span><span class="icon dismiss" title="Dismiss"></span></div>`
	}
	msgBoxElem.innerHTML = html
	for(let a in data){
		let count = data[a]
		document.getElementById("m"+startID++).dataset.id = a
		let elem = document.getElementById("m"+startID++)
		elem.textContent = a
		elem.id = a
		if(count > 0){
			elem.dataset.count = count
		}
	}
}
function addMsgHTML(text){
	msgBoxElem.innerHTML += `<div class="notification"><span class="message" id="am1"></span><span class="icon dismiss" title="Dismiss"></span></div>`
	let elem = document.getElementById("am1")
	elem.textContent = text
	elem.id = text
	elem.parentElement.dataset.id = text
}

function recordingsHTML(data){
	let html = ""
	let startID = countID = 0
	let unreadCount = 0
	for(let a in data){
		let unread = data[a]["unread"]
		html = `<div class="notification livestream`+(unread?``:` read`)+`" id="r`+
		countID++ +`"><img class="avatar" id="r`+countID++ +`"><span class="message" id="r`+ countID++ +`"></span>`+
		`<span class="icon markRead" title="Mark as Read"></span></div>`+html // load html invertedly to sort by most recent

		if(unread){unreadCount+=1;}
	}
	recordingsElem.innerHTML = html
	for(let a in data){
		document.getElementById('r'+startID++).dataset.id = a
		document.getElementById("r"+startID++).src = "https://picarto.tv/user_data/usrimg/"+data[a]["channel"].toLowerCase()+"/dsdefault.jpg"
		document.getElementById('r'+startID++).textContent = data[a]["channel"]+" - "+ new Date(data[a]["timestamp"]).toString()
	}
	return unreadCount;
}


function update(){
	browser.runtime.sendMessage({"msg":"getUpdate"}, (data)=>{
		console.log(data)
		// load header
		let numLive = Object.keys(data["streams"]).length
		headerElem.textContent = numLive+' Pe'+(numLive==1?"rson":"ople") + " Streaming"+(numLive>0?':':'')
		// load streams
		createNotificationHTML(data["streams"])
		// load invites
		createInviteHTML(data["multidata"])
		// load messages
		createMsgHTML(data["messages"])
		// load recordings
		if(data["recordings"] != null){
			recordingElem.style.removeProperty("display")
			let recordingsCount = recordingsHTML(data["recordings"]) // also makes the html
			if(recordingsCount > 0){
				recordingElem.dataset.count = recordingsCount
			}else{
				delete recordingElem.dataset.count
			}
		}
		// load dashboard
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
		if(!streaming){
			let elems = document.getElementsByClassName("invitebutton")
			for(let a=elems.length-1;a>=0;a-=1){
				elems[a].classList.add("hidden")
			}
		}
	})
}
// because I'm lazy and don't want to manually set all these
function onFocus(elem){
	if(elem.title == "Accept"){
		elem.parentElement.classList.toggle("colorizeAccept");
	}else if(elem.title == "Decline"){
		elem.parentElement.classList.toggle("colorizeDecline");
	}else if(elem.title == "Mark as Read" || elem.title == "Dismiss"){
		elem.parentElement.classList.toggle("mark");
	}
}

function openModal(modalID){
	modalElem.style.opacity = 1
	modalElem.style.removeProperty("pointer-events")
	modalElems[modalID].style.display = ""
}
function closeModal(){
	modalElem.style.opacity = 0
	modalElem.style.pointerEvents = "none"
	for(let a in modalElems){
		modalElems[a].style.display = "none"
	}
}
function onClick(elem){
	if(elem.classList.contains("dismiss")){
		if(elem.parentElement.classList.contains("host")){
			browser.runtime.sendMessage({"msg":"leaveMulti", "data":elem.parentElement.dataset.id})
		}else if(elem.parentElement.classList.contains("guest")){
			browser.runtime.sendMessage({"msg":"kickStreamer", "data":elem.parentElement.dataset.id})
		}else if(elem.parentElement.classList.contains("outgoing")){
			browser.runtime.sendMessage({"msg":"revokeInvite", "data":elem.parentElement.dataset.id})
		}else if(elem.parentElement.classList.contains("invite")){
			browser.runtime.sendMessage({"msg":"declineInvite", "data":elem.parentElement.dataset.id})
		}else if(elem.id = "closemodal"){
			closeModal()
		}
	}else if(elem.classList.contains("accept")){
		browser.runtime.sendMessage({"msg":"acceptInvite", "data":elem.parentElement.dataset.id})
	}else if(elem.parentElement.id == "premiumflags"){
		elem.classList.add("loading")
		browser.runtime.sendMessage({"msg":"togglePremiumFlag","data":elem.id})
	}else if(elem.parentElement.id == "streamflags"){
		elem.classList.add("loading");
		browser.runtime.sendMessage({"msg":"toggleStreamFlag","data":elem.id})
	}else if(elem == inviteButtonElem){
		openModal("invitemodal")
	}else if(elem == recordingElem){
		openModal("recordingsmodal")
		document.body.style.minHeight = 150 // ensure we can see all of it
	}else if(elem == inviteButton){
		sendNamedInvite(inviteeElem.value)
		inviteeElem.value = ""
	}else if(elem == modalElem){
		closeModal()
	}else if(elem.id == "markrecordsread"){
		let records = recordingsElem.children
		for(let a=records.length-1; a >= 0; a--){
			let note = records[a]
			if(!note.classList.contains("read")){
				browser.runtime.sendMessage({"msg":"markRecordingRead", "data":note.dataset.id})
			}
			note.classList.add("read")
			note.lastChild.classList.add("hidden")
		}
		delete recordingElem.dataset.count
	}
}

function clickInStreamsElem(elem, parent){
	if(elem.classList.contains("invitebutton")){
		sendNamedInvite(parent.dataset.id)
		// TODO pending status?
	}else if(elem.classList.contains("markRead")){
		browser.runtime.sendMessage({"msg":"markStreamRead", "data":parent.dataset.id})
		parent.classList.add("read");
		elem.classList.add("hidden")
	}else{
		// this auto-closes the popup so I don't need to mark it as read here - it will update on next open
		browser.runtime.sendMessage({"msg":"viewStream", "data":parent.dataset.id})
	}
}

function clickInRecordingsElem(elem, parent){
	if(elem.title == "Mark as Read"){
		browser.runtime.sendMessage({"msg":"markRecordingRead", "data":parent.dataset.id})
		if(!parent.classList.contains("read") && recordingElem.dataset.count){
			let val = recordingElem.dataset.count - 1
			if(val > 0){
				recordingElem.dataset.count = val
			}else{
				delete recordingElem.dataset.count
			}
		}
		parent.classList.add("read");
		elem.classList.add("hidden")
	}else{
		// this auto-closes the popup so I don't need to mark it as read here - it will update on next open
		browser.runtime.sendMessage({"msg":"viewRecording", "data":parent.dataset.id})
	}
}

function sendNamedInvite(name){
	browser.runtime.sendMessage({"msg":"inviteNameToMulti", "data":name})
}

// because I want error messages to show immediately
browser.runtime.onMessage.addListener((request, sender, sendResponse)=>{
	switch (request["msg"]) {
		case "addMessage":
			let elem = document.getElementById(request["data"][0])
			if(elem){
				elem.dataset.count = request["data"][1]
			}else{
				addMsgHTML(request["data"][0])
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
		}else if(parents.includes(msgBoxElem)){
			let elem = e.target
			if(elem.classList.contains("dismiss")){
				browser.runtime.sendMessage({"msg":"deleteMessage", "data":elem.parentElement.dataset.id})
				elem.parentElement.remove()
			}
		}else{
			onClick(e.target)
		}
	})
	document.addEventListener("mouseover", (e)=>{onFocus(e.target)})
	document.addEventListener("mouseout", (e)=>{onFocus(e.target)})
}
