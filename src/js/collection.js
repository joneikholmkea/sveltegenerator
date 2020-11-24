export let generateCollectionFile = (className, sortingCBvalue, fields, saveFileFunc)=>{

    let classN = className.toLowerCase()
    let src = `
<script>
import {db} from './firestore.js'
import ${className} from './${className}.svelte'
let ${classN}s = []
${getClassVariables(fields)}

db.collection('${classN}s').orderBy("${fields[0]}").onSnapshot(data => {
    ${classN}s = data.docs
})

function sortByField(field){
    db.collection('${classN}s').orderBy(field).onSnapshot(data => {
        ${classN}s = data.docs
    })
}

function add${className}(){
    db.collection('${classN}s').add({${getFieldListAsString(fields)}})
    // Firebase will automatically map to relevant names !!
${getFieldsToResetAfterAddition(fields)}
}
<\/script>

<!-- ###################### -->
<h2>${className}s</h2>
<br/>
<div id="addSection">
    <form on:submit|preventDefault={add${className}}>
${getInputsForAdd(fields)}\t\t<button>Add</button>
    </form>
</div>

<div>

${getSortForFields(fields, sortingCBvalue)}
{#each ${classN}s as ${classN}}
    <${className} id={${classN}.id} ${classN}={${classN}.data()} />
{/each}
</div>

<!-- ###################### -->

<style>
#sortSection{
    display: grid;
    ${getGridTemplateColumns(fields)}
    grid-gap: 10px;
}

#addSection form{
    display: grid;
    ${getGridTemplateColumnsAddForm(fields)}
    grid-gap: 10px;
}
</style>
`
console.log(src)
saveFileFunc(src, className+"s.svelte")
}

function getClassVariables(fields){
    let out = ''
    for(let i=0; i<fields.length; i++){
        out +=  'let '+ fields[i] +' = \'\'\n'
    }
    return out
}

function getFieldListAsString(fields){
    let out = ''
    for(let i=0; i<fields.length; i++){
        out +=  fields[i] + ', '
    }
    return out.substring(0, out.length - 2);
}


function getFieldsToResetAfterAddition(fields){
    let out = ''
    for(let i=0; i<fields.length; i++){
        out +=  '\t'+fields[i] +' = \'\'\n'
    }
    return out
}

function getInputsForAdd(fields){
    let out = ''
    for(let i=0; i<fields.length; i++){
        out +=  '\t\t<input type="text" placeholder="'+fields[i]+'" bind:value={'+fields[i]+'}>\n'
    }
    return out
}

function getSortForFields(fields, sortingCBvalue){
    if(!sortingCBvalue){ // if user did not select the "sorting" checkbox
        return ''
    }
    let out = '<div id="sortSection">\n'
    for(let i=0; i<fields.length; i++){
        out +=  '\t<a on:click={() => sortByField("'+ fields[i] +'")} href="#" ><h3>' + cap(fields[i]) + '</h3></a>\n'
    }
     for(let i=0; i<2; i++){
        out +=  '\t<div></div>\n'
    }
    out += '</div>'
    return out
}

function getGridTemplateColumnsAddForm(fields){
    let fraction = Math.round(14 / fields.length * 10) / 10  
    let out = 'grid-template-columns: '
    for(let i=0; i<fields.length; i++){
        out += fraction+'fr '
    }
    out += '2fr;'
    return out
}

function getGridTemplateColumns(fields){
    let fraction = Math.round(12 / fields.length * 10) / 10  
    let out = 'grid-template-columns: '
    for(let i=0; i<fields.length; i++){
        out += fraction+'fr '
    }
    out += '2fr 2fr;'
    return out
}

function cap(string){
    return string.charAt(0).toUpperCase() + string.slice(1)
}