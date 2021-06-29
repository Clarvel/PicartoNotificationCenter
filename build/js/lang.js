export class Language{
	/**
	 * lazy constructor, doesn't grab initial language files until needed
	 * @param {string} folder name in the `../lang` folder containing language specific json files
	 */
	constructor(folder){
		this._folder = folder
	}

	_Update(){
		if(this._langType == null){
			throw Error("No language setting set.")
		}

		return fetch(`../lang/${this._folder}/${this._langType}.json`).then(r=>r.json().then((json)=>{
			this._dictionary = json
		}))
	}

	_Get(key){
		return this._dictionary[key]
	}

	_EnsureDictionaryFetched(){
		if(this._dictionary != null){
			return Promise.resolve()
		}
		if(this._promise == null){
			this._promise = this._Update().finally(()=>this._promise = null)
		}
		return this._promise
	}

	/**
	 * @param {string} value language type to use. when set, will reset the dictionary until the data is requested again
	 */
	Set(value){
		//console.log("setting lang to "+value)
		if(this._langType == null || this._langType != value){
			this._langType = value
			this._dictionary = null
		}
		//console.log(`lang set to ` + this._langType)
	}

	/**
	 * @param {string|Array<string>} keys 
	 * @returns {Promise<string|Array<string>} in order of received keys
	 */
	Get(keys){ // returns a promise with the requisite keys
		return this._EnsureDictionaryFetched().then(()=>{
			//console.log(keys, dict, Array.isArray(keys))
			return Array.isArray(keys) ? keys.map(key=>this._Get(key)) : this._Get(keys)
		})
	}
}
