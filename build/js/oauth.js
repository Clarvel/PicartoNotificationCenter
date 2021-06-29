
import {EncodeDataURL, EncodeQuery} from "./utils.js"
import {Browser} from "./browser.js"
import {Timeout} from "./timeout.js"

export class OAuth2{
	static GetCharCodeModifier(val){ // gets modifier to convert 0-66 numbers to ASCii char code ranges
		if(val < 38){
			if(val > 11) return 53
			if(val > 1) return 46
			return 45
		}
		if(val < 65){
			if (val > 38) return 58
			return 57
		}
		return 61
	}

	static ModifyCharCode(char){return char + OAuth2.GetCharCodeModifier(char)} // add modifier toget ASCII char code ranges

	static GenerateCode(){
		console.log("Generating Code")
		let arr = new Uint8Array(1)
		window.crypto.getRandomValues(arr)
		arr = new Uint8Array(Math.round(43 + arr[0]/3)) // 43-128 characters long
		window.crypto.getRandomValues(arr)

		return String.fromCharCode(...arr.map(a => OAuth2.ModifyCharCode(Math.floor(a * 66 / 256))))  // convert range form 0-255 to 0-66
	}

	static GenerateChallenge(verifier){
		return crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)).then((hashed)=>{
			return btoa(String.fromCharCode.apply(null, new Uint8Array(hashed))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
		})
	}

	constructor(clientID, clientSecret, redirectURI){
		this._codeRegex = RegExp("code=(.+?)(?:&|$)") // const
		this._storageKey = "tokenKeySetting" // const

		this._clientID = clientID
		this._clientSecret = clientSecret
		this._redirectURI = redirectURI
	}

	// tries to get refresh token data from storage and utilize that to refresh access.
	Load(){
		return this._LoadSaved().then((data)=>{
			//console.log("Trying to load access from save")
			return this._RefreshAccessToken(undefined, undefined, data)
		}, (e)=>{
			console.log("Failed to load access from save:", e)
			throw e
		})
	}

	get Token(){
		//if(this._token == null){throw new Error("Invalid token")}
		return this._token
	}

	get IsValidated(){
		return this._token != null;
	}

	Invalidate(deleteStorage = true){
		this._token = undefined
		if(this._tokenRefresher != null){
			this._tokenRefresher.Clear()
		}
		return deleteStorage ? Browser.RemoveStorage(false, this._storageKey) : Promise.resolve()
	}

	_LoadSaved(){
		return Browser.GetStorage(false, this._storageKey).then((data)=>{
			//GetStorage(false).remove(this._storageKey) // clear out the storage
			return data[this._storageKey]
		})
	}

	_Save(token){
		return Browser.SetStorage(false, {[this._storageKey]:token}) // can I obfuscate this somehow?
	}

	_refreshAccessFailure(err){
		this._token = undefined
		this._processingRefresh = false
		console.warn(err)
		throw err
	}

	// do not set refreshToken unless you are refreshing the tokens
	_RefreshAccessToken(code, verifier, refreshToken = undefined){
		console.log("Processing Access status: ", this._processingRefresh)
		if(this._processingRefresh)
			return Promise.reject("Still processing access token refresh")
		this._processingRefresh = true
		let payload = null
		if(refreshToken != null){
			payload = {
				"grant_type":"refresh_token",
				"refresh_token":refreshToken,
				"client_id":this._clientID,
				"client_secret":this._clientSecret,
			}
			console.log("Refreshing Access", payload)
		}else{
			payload = {
				"grant_type":"authorization_code",
				"client_id":this._clientID,
				"client_secret":this._clientSecret, // TODO remove once PKCE extension is supported
				"redirect_uri":this._redirectURI,
				"code":code,
				"code_verifier":verifier,
			}
			console.log("Requesting Access", payload)
		}

		return fetch("https://oauth.picarto.tv/token", {
			"method":"POST",
			"body":EncodeQuery(payload),
			"headers":{
				"Content-Type": "application/x-www-form-urlencoded",
			  },
		}).then((response)=>{
			if(response.ok){
				return response.json().catch(()=>{return {}}) // response text is "OK"
			}
			// any error here invalidates the code
			return this.Invalidate().finally(()=>{
				return response.json().then((data)=>{
					console.log(response, data)
					throw Error(`Token Retrieval Failed (${response["status"]} ${data["error"]}): ${data["error_description"]}`)
				})
			})
		}).then((data)=>{
			console.log("Parsing Access")
			console.log(data)
			this._token = data["token_type"] + " " + data["access_token"]
			let expires = (data["expires_in"] - 60) * 1000 // expires_in is in seconds, and the ms equivalent is > u32int max
			console.log(data["expires_in"], expires > 2147483647 ? 2147483647 : expires, Date.now())
			if(this._tokenRefresher){
				this._tokenRefresher.Clear()
			}
			this._tokenRefresher = new Timeout(()=>{
				return this._RefreshAccessToken(code, verifier, data["refresh_token"]).catch((err)=>{
					console.warn(err)
					return this.Refresh()
				})
			}, expires > 2147483647 ? 2147483647 : expires) 
			return this._Save(data["refresh_token"]) // save the token for use in case of interruption of service
		}, (err)=>{
			console.log(this._token, this._processingRefresh)
			this._token = undefined
			console.log(err)
			throw err
		}).finally(()=>{
			this._processingRefresh = false
		})
	}

	Refresh(){ // TODO make this into a promise
		console.log(Date.now())
		if(this._tokenRefresher == null){ // nothing to refresh
			console.warn("No active token to refresh")
			return
		}
		this._tokenRefresher.Invoke()
	}

	InitOAuth(interactive=false, scopes = []){
		console.log("Initiating OAuth")

		let verifier = OAuth2.GenerateCode()
		return OAuth2.GenerateChallenge(verifier).then((challenge)=>{
			/* explicit
			https://oauth.picarto.tv/authorize?
			response_type=code&
			client_id=uFuecjyoLl0Crn3t&
			redirect_uri=https%3A%2F%2Fapi.picarto.tv%2Fapi%2Foauth2-callback&
			scope=readpub&
			state=VGh1IEFwciAwMSAyMDIxIDA4OjIyOjM0IEdNVC0wNTAwIChDZW50cmFsIERheWxpZ2h0IFRpbWUp
			*/

			/* implicit
			https://oauth.picarto.tv/authorize?
			response_type=token&
			client_id=uFuecjyoLl0Crn3t&
			redirect_uri=https%3A%2F%2Fapi.picarto.tv%2Fapi%2Foauth2-callback&
			scope=readpub%20write&
			state=VGh1IEFwciAwMSAyMDIxIDA4OjI2OjI3IEdNVC0wNTAwIChDZW50cmFsIERheWxpZ2h0IFRpbWUp
			*/
			let payload = {
				"redirect_uri":this._redirectURI,
				"response_type":"code", // or "token" for implicit flow
				"scope":scopes.join(' '), //used to be '+'
				"state":verifier,
				"client_id":this._clientID,
				"code_challenge":challenge,
				"code_challenge_method":"S256",
			}
			let encodedURL = EncodeDataURL("https://oauth.picarto.tv/authorize", payload)

			if(this._processingOAuth)
				return Promise.reject("Still processing OAuth")
			this._processingOAuth = true
			return Browser.LaunchWebAuthFlow(encodedURL, interactive /*|| !this.IsValidated*/).then((redirect_uri)=>{
				console.log("Parsing Redirect from OAuth:", redirect_uri)
				let parsed = this._codeRegex.exec(redirect_uri) // find the code string used to verify
				if(parsed){
					console.log("Discovered Access Code: " + parsed[1])

					return this._RefreshAccessToken(parsed[1], verifier)
				}
				throw Error("OAuth2 failed to parse an access token")
			}).catch((err)=>{
				console.log(err)
				return this.Invalidate().finally(()=>{throw err})
			}).finally(()=>{
				this._processingOAuth = false
			})
		})
	}
}

/* 401 {message:"Unauthenticated."} */

/* EXPLICIT POST to /token 
form data:
	grant_type: authorization_code
	code: 
	client_id: 
	client_secret: 
	redirect_uri: https://api.picarto.tv/api/oauth2-callback

response:
{
	"token_type":"Bearer",
	"expires_in":360000,
	"access_token":"",
	"refresh_token":""
}
*/
/* GET to /user/notifications
header:
	authorization: "Bearer " + access_token
response:
	[{notification},{notification},...]
*/

/* IMPLICIT
https://oauth.picarto.tv/authorize?client_id=&redirect_uri=https%3A%2F%2Fapi.picarto.tv%2Fapi%2Foauth2-callback&response_type=token&scope=readpub%20readpriv%20write&state=

*/