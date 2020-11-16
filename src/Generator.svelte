<script>
import User from './User.svelte'
import Field from './Field.svelte'
import { saveAs } from 'file-saver';
let fields = ["name", "email"]
let field = 'Name'
let className = 'User'
let button1Text = 'Download file: '+className+'.svelte'
let button2Text = 'Download file: '+className+'s.svelte'


function addNameOfClass(){
        console.log("saved class " + className)
        button1Text = 'Download file: '+className+'.svelte'
        button2Text = 'Download file: '+className+'s.svelte'
}

function addField(){
    fields.push(field)
    fields = fields
    console.log("added field " + field)
}


function publishFile(content, filename){
    var blob = new Blob([content], {type: "text/plain;charset=utf-8"});
    window.saveAs(blob, filename);
}

function deleteField(field){
    console.log("delete a field..." + field.detail.fieldName)
    let index = -1;
    for(let i=0; i<fields.length;i++){
        if(fields[i] == field.detail.fieldName){
            console.log("found it !! at pos " + i)
            index = i
        }
    }
    if(index >= 0){
        fields.splice(index,1)
        fields = fields
    }
}

function generateCollectionFile(){
    let classN = className.toLowerCase()
    let src = `
<script>
import {db} from './firestore.js'
import ${className} from './${className}.svelte'
let ${classN}s = []
${getClassVariables()}

db.collection('${classN}s').onSnapshot(data => {
    ${classN}s = data.docs
})

function add${className}(){
    db.collection('${classN}s').add({${getFieldListAsString()}})
    // Firebase will automatically map to relevant names !!
${getFieldsToResetAfterAddition()}
}
<\/script>

<!-- ###################### -->

<div class="${classN}">
    <form on:submit|preventDefault={add${className}}>
${getInputsForAdd()}\t\t<button>Add</button>
    </form>
</div>


<div>
{#each ${classN}s as ${classN}}
    <${className} id={${classN}.id} ${classN}={${classN}.data()} />
{/each}
</div>

<!-- ###################### -->

<style>
.${classN} form {
    display: grid;
    ${getGridTemplateColumns()}
    grid-gap: 10px;
}
</style>
`
console.log(src)
publishFile(src, className+"s.svelte")
}

function generateEntityFile(){
    let classN = className.toLowerCase()
    let inputs = getInputs()
    let src = `
<script>
import {db} from './firestore.js'
export let id = ''
export let ${classN} = {}

function delete${className}(){
    db.collection('${classN}s').doc(id).delete()
}

function update${className}(){
    db.collection('${classN}s').doc(id).update(${classN})
}

<\/script>

<div class="${classN}">
${inputs}\t<button on:click={delete${className}}>Delete</button>
\t<button on:click={update${className}}>Update</button>
</div>

<!-- ###################### -->

<style>
.${classN} {
    display: grid;
    ${getGridTemplateColumns()}
    grid-gap: 10px;
}
</style>
`
console.log(src)
publishFile(src, className+".svelte")
}


function getFieldListAsString(){
    let out = ''
    for(let i=0; i<fields.length; i++){
        out +=  fields[i] + ', '
    }

    return out.substring(0, out.length - 2);
}

function getClassVariables(){
    let out = ''
    for(let i=0; i<fields.length; i++){
        out +=  'let '+ fields[i] +' = \'\'\n'
    }
    return out
}


function getInputs(){
    let out = ''
    for(let i=0; i<fields.length; i++){
        out +=  '\t<input type="text" bind:value="{'+className.toLowerCase()+'.'+fields[i]+'}">\n'
    }
    return out
}

function getInputsForAdd(){
    let out = ''
    for(let i=0; i<fields.length; i++){
        out +=  '\t\t<input type="text" placeholder="'+fields[i]+'" bind:value={'+fields[i]+'}>\n'
    }
    return out
}

function getFieldsToResetAfterAddition(){
    let out = ''
    for(let i=0; i<fields.length; i++){
        out +=  '\t'+fields[i] +' = \'\'\n'
    }
    return out
}




function getButtons(){
    let out = ''
    for(let i=0; i<fields.length; i++){
        out +=  '<input type="text" bind:value="{'+className.toLowerCase()+'.'+fields[i]+'}">\n'
    }
    return out
}

function getGridTemplateColumns(){
    let fraction = 12 / fields.length
    let out = 'grid-template-columns: '
    for(let i=0; i<fields.length; i++){
        out += fraction+'fr '
    }
    out += '2fr 2fr;'
    return out
}

</script>

<!-- ###################### -->

<div id="nameofclass">
    <form on:submit|preventDefault={addNameOfClass}>
        <input type="text" bind:value={className}>
        <button>Save Class name</button>
    </form>
</div>
<div id="addField">
    <form on:submit|preventDefault={addField}>
        <input type="text" bind:value={field}>
        <button>Add field</button>
    </form>
</div>

<div id="users">
{#each fields as f}
    <Field fieldName = {f} on:delete_field={deleteField} />
{/each}
</div>
<br/>
<button on:click={generateEntityFile}>
{button1Text}
</button><br/>
<button on:click={generateCollectionFile}>
{button2Text}
</button>
<!-- ###################### -->
