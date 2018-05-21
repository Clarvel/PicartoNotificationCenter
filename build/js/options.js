/*
javascript for options page. settings defaults are actually stored in global.js
this just handles the options.html interface with the local storage
*/
if(chrome){browser = chrome}

let messageTimer = 3000

let saveStatusElem = null
let purgeStatusElem = null
let streameronlyElem = null
let elems = {}

// sets a temporary text content message for the specified elem
function set_message (elem, text) {
	elem.textContent = text
	setTimeout(() => {elem.textContent = ""}, messageTimer)
}

// sends update to browser runtime for this extension
// edits the data packet with 'message' so you may need to make a copy before
// calling this
function send_update () {
	browser.runtime.sendMessage({"msg":"settingsUpdated"});
}
// returns true if no errors on accessing storage
// otherwise returns false
// also sets temporary status message
function test_no_storage_err(statusElem, successMsg){
	let err = browser.runtime.lastError
	if(err){
		set_message(statusElem, err)
		return false;
	}
	set_message(statusElem, successMsg)
	return true;
}

// sets html elements based on data input
function set_elements(data){
	for(let a in data){
		let elem = elems[a]
		if(elem.type === "checkbox"){
			elem.checked = data[a]
		}else{
			elem.value = data[a]
		}
	}
}

// save settings to local storage
function save_options() {
	let settings = {}
	for(let a in elems){
		let elem = elems[a]
		if(elem.type === "checkbox"){
			settings[a] = elem.checked
		}else{
			settings[a] = elem.value
		}
	}
	browser.storage.local.set(settings, () => {
		if(test_no_storage_err(saveStatusElem, "Options saved.")){
			send_update()
		}
	})
}

function purge_options() {
	browser.storage.local.clear(() => {
		if(test_no_storage_err(purgeStatusElem, "Settings storage cleared!")){
			browser.runtime.sendMessage({"msg":"getDefaults"}, (data)=>{
				set_elements(data)
				send_update()
			})
		}
	})
}
function checkStreamerOnly(val){
	if(val){
		streameronlyElem.classList.remove("disabled")
	}else{
		streameronlyElem.classList.add("disabled")
	}
}

window.onload = ()=>{
	saveStatusElem = document.getElementById("status")
	purgeStatusElem = document.getElementById("purgestatus")
	streameronlyElem = document.getElementById("streameronly")

	document.getElementById("save").addEventListener('click', save_options)
	document.getElementById("purge").addEventListener('click', purge_options)

	browser.runtime.sendMessage({"msg":"getSettings"}, (data)=>{
		for(let a in data){
			elems[a] = document.getElementById(a)
		}
		set_elements(data)

		elems["streamer"].addEventListener("click", (evt)=>{checkStreamerOnly(evt.target.checked)})
		checkStreamerOnly(elems["streamer"].checked)
	})
}
