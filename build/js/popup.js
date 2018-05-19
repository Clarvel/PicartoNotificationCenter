/**/

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

function createInviteHTML(data){
	let html = ""
	let startID = countID = 0
	for(let a in data["incoming"]){
		html += `<div class="invite notification" id="i`+countID++ +`"><img class="avatar" id="i`+countID++ +
		`"><span class="message" id="i`+countID++ +
		`"></span><span class="icon accept" title="Accept"></span><span class="icon dismiss" title="Decline"></span></div>`
	}
	for(let a in data["outgoing"]){
		html += `<div class="outgoing notification" id="i`+countID++ +`"><img class="avatar" id="i`+countID++ +
		`"><span class="message" id="i`+countID++ +
		`"></span><span class="icon dismiss" title="Revoke Invite"></span></div>`
	}
	if(data["session"]["host"]["name"] != ""){
		html += `<div class="host notification" id="i`+countID++ +`"><img class="avatar" id="i`+countID++ +
			`"><span class="message" id="i`+countID++ +
			`"></span><span class="icon dismiss" title="Lease Session"></span></div>`
	}
	for(let a in data["session"]["guests"]){
		html += `<div class="guest notification" id="i`+countID++ +`"><img class="avatar" id="i`+countID++ +
		`"><span class="message" id="i`+countID++ +
		`"></span><span class="icon dismiss" title="Kick from Session"></span></div>`
	}
	invitesElem.innerHTML = html
	for(let a in data["incoming"]){
		let name = data["incoming"][a]["name"]
		document.getElementById("i"+startID++).dataset.id = name
		document.getElementById("i"+startID++).src = "https://picarto.tv/user_data/usrimg/"+name.toLowerCase()+"/dsdefault.jpg"
		document.getElementById("i"+startID++).textContent = "Invite from " + name
	}
	for(let a in data["outgoing"]){
		let name = data["outgoing"][a]["name"]
		document.getElementById("i"+startID++).dataset.id = name
		document.getElementById("i"+startID++).src = "https://picarto.tv/user_data/usrimg/"+name.toLowerCase()+"/dsdefault.jpg"
		document.getElementById("i"+startID++).textContent = "Invited " + name
	}
	if(data["session"]["host"]["name"] != ""){
		let name = data["session"]["host"]["name"]
		document.getElementById("i"+startID++).dataset.id = name
		document.getElementById("i"+startID++).src = "https://picarto.tv/user_data/usrimg/"+name.toLowerCase()+"/dsdefault.jpg"
		document.getElementById("i"+startID++).textContent = name + " is Hosting"
	}
	for(let a in data["session"]["guests"]){
		let name = data["session"]["guests"][a]["name"]
		document.getElementById("i"+startID++).dataset.id = name
		document.getElementById("i"+startID++).src = "https://picarto.tv/user_data/usrimg/"+name.toLowerCase()+"/dsdefault.jpg"
		document.getElementById("i"+startID++).textContent = name + " has Joined"
	}
} 

function createMsgHTML(data){
	let html = ""
	let startID = countID = 0
	for(let a in data){
		html += `<div class="notification"><span class="message" id="m`+countID++ +
		`"></span><span class="icon dismiss" title="Dismiss"></span></div>`
	}
	msgBoxElem.innerHTML = html
	for(let a in data){
		let count = data[a]
		let elem = document.getElementById("m"+startID++)
		elem.textContent = a
		if(count > 0){
			elem.dataset.count = count
		}
	}
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
	chrome.runtime.sendMessage({"msg":"getUpdate"}, (data)=>{
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
	if(elem.classList.contains("invitebutton")){
		sendNamedInvite(parent.dataset.id)
		// TODO pending status?
	}else if(elem.classList.contains("markRead")){
		chrome.runtime.sendMessage({"msg":"markStreamRead", "data":parent.dataset.id})
		parent.classList.add("read");
		elem.classList.add("hidden")
	}else{
		// this auto-closes the popup so I don't need to mark it as read here - it will update on next open
		chrome.runtime.sendMessage({"msg":"viewStream", "data":parent.dataset.id})
	}
	
}

function clickInRecordingsElem(elem, parent){
	if(elem.title == "Mark as Read"){
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
		elem.classList.add("hidden")
	}else{
		// this auto-closes the popup so I don't need to mark it as read here - it will update on next open
		chrome.runtime.sendMessage({"msg":"viewRecording", "data":parent.dataset.id})
	}
	
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
