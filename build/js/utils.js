/**
 * @param {number} num 
 * @param {number} min 
 * @param {number} max 
 */
export function Clamp(num, min, max){return Math.min(max, Math.max(min, num))}

/**
 * @param {object} obj 
 */
export function IsEmpty(obj){return Object.keys(obj).length === 0}

/**
 * @param {string} str 
 * @param  {...string} inputs 
 */
export function FormatString(str, ...inputs){
	return str.replace(/{(\d+)}/g, (match, number)=>{ 
		return inputs[number] != null ? inputs[number] : match
	})
}

/**
 * @param {object} data 
 */
export function EncodeQuery(data){
	let keys = Object.keys(data)
	return keys.length === 0 ? '' : keys.map(key=>key+'='+data[key]).join('&')
}

/**
 * @param {string} url_ 
 * @param {object} data 
 */
export function EncodeDataURL(url_, data){
	let query = EncodeQuery(data)
	return !query ? url_ : url_+'?'+query
}