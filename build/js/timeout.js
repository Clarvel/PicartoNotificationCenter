

export class Timeout{
	/**
	 * 
	 * @param {function} func 
	 * @param {number} delay 
	 */
	constructor(func, delay){
		this._id = setTimeout(func, delay);
		this._func = func;
	}

	Clear(){
		clearTimeout(this._id)
	}
	
	Invoke(){
		this.Clear()
		return this._func()
	}
}