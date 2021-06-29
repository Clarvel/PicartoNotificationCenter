/*
javascript for options page. settings defaults are actually stored in global.js
this just handles the options.html interface with the local storage
*/
import {Language} from "./lang.js"
import {BackgroundCommunication} from "./communication.js"

class WelcomeCommunicator extends BackgroundCommunication{
	constructor(){super("welcome")}

	ProcessMessage(type, data){
		switch(type){
            case "SetLanguage":
				language.Set(data["value"])
                return LoadData()
            case "Login":
                if(data){ // if logged in, no need to have the welcome screen
                    window.close()
                }
                break;
			default:
				console.group("Unknown Message sent to welcome page")
				console.warn(type)
				console.log(data)
				console.groupEnd()
		}
	}
}

let welcomeText = null
let disclaimerText = null
let postScriptText = null
let loginButton = null

let language = null

let communication = new WelcomeCommunicator()

function LoadTextToElem(textKey, htmlElem){
    return language.Get(textKey).then((text)=>{
        if(text == null){throw Error(`[${textKey}] key missing from loaded language`)}
        htmlElem.textContent = text
    }).catch(console.error)
}

function LoadData(){
    return Promise.all([
	    LoadTextToElem("welcome", welcomeText),
	    LoadTextToElem("disclaimer", disclaimerText),
		LoadTextToElem("postScript", postScriptText),
	    LoadTextToElem("loginButton", loginButton)
    ])
}

function Login(){
	return communication.SendMessage("LoginRequest")
}

window.onload = ()=>{
	welcomeText = document.getElementById("welcome")
	disclaimerText = document.getElementById("disclaimer")
	postScriptText = document.getElementById("postScript")

	loginButton = document.getElementById("loginButton")

	loginButton.addEventListener('click', Login)

	language = new Language("welcome")

	communication.SendMessage("GetLanguage").then((data)=>{
        language.Set(data["value"])
        return LoadData();
    })
}