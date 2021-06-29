
import {Browser} from "./browser.js"
import {CBVariable, Variable} from "./cbvariable.js"


export class Saveable extends CBVariable{
	/**
	 * sets saveable to default values
	 * @param {string} key 
	 * @param {Variable} value 
	 */
	constructor(key, value){
		super(value)
		this._key = key
	}

	/**
	 * loads data from storage, should only be called once after constructing
	 * @returns {Promise} 
	 */
	Load(sync=false){
		return Browser.GetStorage(sync, this._key).then(data=>this.SetValue(data[this._key]))
	}

	/**
	 * sets value and optionally saves the value somewhere
	 * @param {Variable} value 
	 * @returns {Promise}
	 */
	SetValue(value, save=true, sync=false){
		super.SetValue(value).then(wasChanged=>{
			if(wasChanged && save){
				return Browser.SetStorage(sync, {[this._key]: this._value})
			}
		})
	}

	/**
	 * gets the key associated with this savable variable
	 */
	get Key(){return this._key}
}

export class SyncSaveable extends Saveable{
	/**
	 * @param {string} key 
	 * @param {Variable} value 
	 * @param {string} description 
	 */
	constructor(key, value, description, disabled=false){
		super(key, value)
		this._default = value
		this._description = description
		this._disabled = disabled
	}

	Load(){return super.Load(false)} // overrides load function to disable trying to sync

	/**
	 * @param {Variable} value 
	 */
	SetValue(value, save=true){return super.SetValue(value, save, false)} // overrides setValye func to disable trying to sync

	/**
	 *  not actual description, rather is string key to description
	 */
	get Description(){return this._description}

	get Disabled(){return this._disabled}

	/**
	 * @returns {Promise}
	 */
	Reset(){
		return Promise.allSettled([
			Browser.RemoveStorage(false, this._key), 
			this.SetValue(this._default, false)
		])
	}

	ToJSON(){return {"value":this.Value, "description":this.Description, "disabled":this.Disabled}}
}