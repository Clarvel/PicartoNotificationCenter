export class OptionsHandler{
    constructor(language){
        this._language = language
        this._optionElements = {}
        this._optionsContainer = document.getElementById("optionsContainer")

        this._boolTemplate = document.getElementById("boolTemplate").content
        this._selectTemplate = document.getElementById("selectTemplate").content
        this._rangeTemplate = document.getElementById("rangeTemplate").content
    }

    _LoadTextToElem(textKey, htmlElem){
        return this._language.Get(textKey).then((text)=>{
            if(text == null){throw Error(`[${textKey}] key missing from loaded language`)}
            htmlElem.textContent = text
        }).catch(console.error)
    }

    static _ImportTemplate(template){
        let templateElem = document.importNode(template, true)
        return [templateElem, templateElem.querySelector("input, select")]
    }

    _GetCustomElem(setting){
        let value = setting["value"]
        let elem, input = null
        if(Object.keys(setting).includes("options")){
            [elem, input] = OptionsHandler._ImportTemplate(this._selectTemplate)
            for(let b in setting["options"]){
                let option = document.createElement("option")
                this._LoadTextToElem(setting["options"][b], option)
                option.value = b
                input.appendChild(option)
                if(b == value){input.selectedIndex = input.childElementCount-1} // TODO make triple =?
            }
        }else if(Object.keys(setting).includes("range")){
            [elem, input] = OptionsHandler._ImportTemplate(this._rangeTemplate)
            let range = setting["range"]
            input.min = range["min"]
            input.max = range["max"]
            input.value = value
        }else if(typeof value === 'boolean'){ // default to bool setting
            [elem, input] = OptionsHandler._ImportTemplate(this._boolTemplate)
            input.checked = value
        }else{
            throw Error(`Unknown Setting Type: ${setting.description}`)
        }
        return [elem, input]
    }


    LoadJSON(json){
        console.log(json)
        this._optionsContainer.textContent = "" // clear out the container
        this._optionElements = {}

        var streamer = null
        var premium = null
        for(let a in json){
            let setting = json[a]
            let [elem, input] = this._GetCustomElem(setting)
            let containingDiv = elem.querySelector("div")
            this._LoadTextToElem(setting["description"], elem.querySelector("span")) // async promise, don't care about result
            input.disabled = setting["disabled"]
            containingDiv.classList.toggle("disabled", setting["disabled"])
            
            this._optionElements[a] = input

            if(setting["description"] === "streamerSetting"){streamer = input}
            if(setting["description"] === "premiumSetting" && !setting["disabled"]){premium = containingDiv}

            this._optionsContainer.appendChild(elem) // do this last because it leaves an empty docfrag
        }

        if(streamer && premium){
            premium.classList.toggle("disabled", !streamer.checked)
            streamer.addEventListener("change", (evt)=>{
                premium.classList.toggle("disabled", !evt.target.checked)
            })
        }
    }

    GetJSON(){
        let settings = {}
        for(let a in this._optionElements){
            let elem = this._optionElements[a]
            if(elem.type === "checkbox"){
                settings[a] = elem.checked
            }else if(elem.type === "range"){
                let num = parseInt(elem.value, 10)
                settings[a] = num===NaN?elem.value:num			
            }else if(elem.nodeName === "SELECT"){
                settings[a] = elem.options[elem.selectedIndex].value
            }else{
                throw Error("Unknown Element type: " + elem)
            }
        }
        return settings
    }
}