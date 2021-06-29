
import {Browser} from "./browser.js"
import {CBVariable} from "./cbvariable.js"
import {Clamp} from "./utils.js"

// classes for the settings used to display options to the user
// SetValue should be called through Settings instead of through individual Setting classes
// description is a language key, not actual description
export class Setting extends CBVariable{
	constructor(value, description, disabled=false){
		super(value)
		this._default = value
		this._description = description
		this._disabled = disabled
	}

	//set Key(key){if(this._key==null){this._key = key}}

	get Description(){return this._description}

	get Disabled(){return this._disabled}

	Reset(){return this.SetValue(this._default)}

	ToJSON(){return {"value":this.Value, "description":this.Description, "disabled":this.Disabled}}
}

export class BoolSetting extends Setting{SetValue(value){return super.SetValue(value == true)}}

// TODO make this set value based on selected option, should remove a layer of depth
export class EnumSetting extends Setting{
	// options is a list of values, and the language key for those values
	// code should only care about the Value key, not the language key its associated to unless its being displayed
	constructor(options, value, description, disabled=false){
		if(!options.hasOwnProperty(value)){
			throw Error(`${value} is not a valid default value for ${this.name}`)
		}
		super(value, description, disabled)
		this._options = options
	}

	SetValue(value){
		if(this._options.hasOwnProperty(value)){
			return super.SetValue(value)
		}else{
			throw Error(`${value} is not a valid value for ${this.description}`)
		}
	}

	get Values(){return Object.keys(this._options)}

	// options are stored as [value, text] pairs because javascript doesn't have good enum support
	get Options(){return this._options}

	ToJSON(){
		let dict = super.ToJSON()
		dict["options"] = this.Options
		return dict
	}
}

export class RangeSetting extends Setting{
	constructor(min, max, value, description, disabled=false){
		super(Clamp(value, min, max), description, disabled)
		this._min = min
		this._max = max
	}
	
	SetValue(value){
		return super.SetValue(Clamp(value, this._min, this._max))
	}

	ToJSON(){
		let dict = super.ToJSON()
		dict["range"] = {"min":this._min, "max":this._max}
		return dict
	}
}

export class Settings{
	// syncSetting is a special setting defining how to sync that browser's data. it is always saved locally, if it exists
	constructor(settings, syncSetting=undefined){ // input a dict of Setting objects
		this._sync = syncSetting
		this._keys = Object.keys(settings)

		let syncKey = syncSetting != null ? this._sync.Key : ""
		for(let a in this._keys){
			let key = this._keys[a]
			if(key in this || key == syncKey){throw Error(`Invalid key for Settings object: ${key}`)}
			this[key] = settings[key]
		}

		Browser.OnStorageChanged((data)=>{ // does not update the actual local storage
			for(let key in data){
				console.log(this, data, key)
				if(!key in this){throw Error(`Invalid key for Settings object: ${key}`)}
				this[key].SetValue(data[key])
			}
		})
	}

	get Sync(){return this._sync != null && this._sync.Value}

	// called once after constructing settings, to load up saved settings
	Load(){
		return Browser.GetStorage(this.Sync, this._keys).then((data)=>{
			console.log("Applying Settings:", this._keys, data)
			for(let a in this._keys){
				let key = this._keys[a]
				if(!(key in data) || !this[key].SetValue(data[key])){
					console.log(`${this[key].constructor.name}(${this[key].Description}) did not change from loaded data, executing initialization callbacks`)
					this[key].InvokeChanged() // force callback on initialization if value didn't change
				}
			}
		}, (err)=>{
			for(let a in this._keys){
				let key = this._keys[a]
				console.log(`${this[key].constructor.name}(${this[key].Description}) did not change from loaded data, executing initialization callbacks`)
				this[key].InvokeChanged() // force callback on initialization if value didn't change
			}
		})
	}

	ResetAll(){
		console.log("Resetting Settings")
		this._sync.Reset()
		for(let a in this._keys){
			this[this._keys[a]].Reset()
		}
		return Browser.RemoveStorage(this.Sync, this._keys)
	}

	ToJSON(){
		let settings = {}
		if(this._sync != null){
			settings[this._sync.Key] = this._sync.ToJSON()
		}
		for(let a in this._keys){
			let key = this._keys[a]
			settings[key] = this[key].ToJSON()
		}
		console.log(settings)
		return settings
	}

	// sets settings data to new values and saves new results
	FromJSON(data){
		if(this._sync != null && this._sync.Key in data){
			this._sync.SetValue(data[this._sync.Key])
		}
		let settings = {}
		for(let a in data){
			if(this._keys.includes(a)){
				if(this[a].SetValue(data[a])){ // returns true if value was changed
					settings[a] = this[a].Value
				}
			}
		}
		return Browser.SetStorage(this.Sync, settings)
	}
}