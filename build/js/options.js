/*
javascript for options page. settings defaults are actually stored in global.js
this just handles the options.html interface with the local storage
*/
import {Language} from "./lang.js"
import {BackgroundCommunication} from "./communication.js"
import {FormatString} from "./utils.js"
import {OptionsHandler} from "./optionsHTMLHandler.js"

class OptionsCommunicator extends BackgroundCommunication{
	constructor(){super("options")}

	ProcessMessage(type, data){
		switch(type){
			case "SetSettings":
				optionsHandler.LoadJSON(data)
				break
			case "SetLanguage":
				language.Set(data["value"])
				this.SendMessage("GetSettings").then(optionsHandler.LoadJSON).catch(console.warn)
				break
			case "Update":
				this.SendMessage("GetUserData").then(SetUsername).catch(console.warn)
				break;
			case "Login":
				// update on login
				break;
			default:
				console.group("Unknown Message sent to options page")
				console.warn(type)
				console.log(data)
				console.groupEnd()
		}
	}
}

let messageTimer = 5000

let usernameElem = null
let saveStatusElem = null
let resetStatusElem = null

let saveButton = null
let resetButton = null
let logoutButton = null

let language = null
let communication = new OptionsCommunicator()
let optionsHandler = null;

let loggedIn = false

// sets a temporary text content message for the specified elem
function SetMessage(elem, text){
	elem.textContent = text
	setTimeout(() => {elem.textContent = ""}, messageTimer)
}

function SetSettings(data){return communication.SendMessage("SetSettings", data)}
function ResetSettings(){return communication.SendMessage("ResetSettings")}
function Logout(){
	let message = loggedIn ? "LogoutRequest" : "LoginRequest"
	SetUsername()
	return communication.SendMessage(message)
}

function SaveOptions(){
	language.Get("savingSettings").then(text=>SetMessage(saveStatusElem, text))
	SetSettings(optionsHandler.GetJSON()).then(()=>{
		language.Get("savedSettings").then(text=>SetMessage(saveStatusElem, text))
	}, (err)=>{
		console.warn(err)
		language.Get("saveError").then(text=>SetMessage(saveStatusElem, text))
	})
}

function ResetOptions(){
	language.Get("resettingSettings").then(text=>SetMessage(resetStatusElem, text))
	ResetSettings().then((data)=>{
		optionsHandler.LoadJSON(data)
		language.Get("resetSettings").then(text=>SetMessage(resetStatusElem, text))
	}, (err)=>{
		console.warn(err)
		language.Get("resetError").then(text=>SetMessage(resetStatusElem, text))
	})
}

function SetUsername(data = null){
	if(data != null && data["name"]){
		loggedIn = true
		language.Get("LogoutInstructions").then(text=>usernameElem.textContent = FormatString(text, data["name"]))
		language.Get("LogoutButton").then(text=>logoutButton.textContent = text)
	}else{
		loggedIn = false
		language.Get("LoginInstructions").then(text=>usernameElem.textContent = text)
		language.Get("LoginButton").then(text=>logoutButton.textContent = text)
	}
}


window.onload = ()=>{
	saveStatusElem = document.getElementById("saveStatus")
	resetStatusElem = document.getElementById("resetStatus")
	usernameElem = document.getElementById("usernameElement")

	saveButton = document.getElementById("saveButton")
	resetButton = document.getElementById("resetButton")
	logoutButton = document.getElementById("logoutButton")

	saveButton.addEventListener('click', SaveOptions)
	resetButton.addEventListener('click', ResetOptions)
	logoutButton.addEventListener('click', Logout)

	language = new Language("options")
	optionsHandler = new OptionsHandler(language)

	Promise.all([
		communication.SendMessage("GetLanguage").then((data)=>{language.Set(data["value"])}),
		communication.SendMessage("GetSettings").then(data=>optionsHandler.LoadJSON(data)),
		communication.SendMessage("GetUserData").then(SetUsername)
	]).catch(console.error)
}
