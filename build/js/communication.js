import {OBS_background} from "./obfuscator.js"
import {Browser} from "./browser.js"

export class Message{
	constructor(type, data, target){
		this.type = type
		this.data = data
		this.target = target
	}
}

export class Communication{
	/**
	 * 
	 * @param {string} name 
	 */
	constructor(name){
		this._name = name
		Browser.OnMessage(x=>this._ProcessMessage(x))
	}

	/**
	 * 
	 * @param {Message} response 
	 */
	_ProcessMessage(response){
		if(response.target.length > 0 && !response.target.includes(this._name))
			return
		//console.log("Received:", response)
		return this.ProcessMessage(response.type, response.data)
	}

	/**
	 * 
	 * @param {string} type
	 * @param {*} data
	 * @param {Array<string>} target
	 */
	SendMessage(type, data, target=[]){
		//console.log("Sending:", type, data, target)
		let reply = Browser.SendMessage(new Message(type, data, target))
		//console.log(reply)
		return reply
	}

	/**
	 * 
	 * @param {strine} type 
	 * @param {*} data 
	 */
	ProcessMessage(type, data){console.log(type, data)} // overrideable dummy function
}

export class BackgroundCommunication extends Communication{ // tanks to background
	/**
	 * 
	 * @param {string} type 
	 * @param {*} data 
	 */
	SendMessage(type, data){
		return super.SendMessage(type, data, [OBS_background])
	}
}
