export class CBVariable{
	/**
	 * @typedef {number|string|boolean} Variable
	 */

	/**
	 * @param {Variable} value 
	 */
	constructor(value){
		this._value = value
		this._onChanged = []
	}

	/**
	 * returns whether the value was changed or not
	 * @param {Variable} value 
	 */
	async SetValue(value){
		if(value === this._value){
			return false
		}
		this._value = value
		await this.InvokeChanged()
		return true
	}

	/**
	 * Asynchronously invoke all OnChanged methods
	 * automatically called when value is set
	 */
	async InvokeChanged(){
		await Promise.all(this._onChanged.map(func => func(this._value)))
	}

	get Value(){return this._value}

	/**
	 * @callback CBVariableCallback
	 * @param {Variable} value
	 */

	/** 
	 * adds func to list of callbacks to call when the value changes
	 * @param {CBVariableCallback} func
	 * @returns listener index number
	 */
	OnChanged(func){
		return this._onChanged.push(func)
	}
}