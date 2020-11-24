export let generateEntityFile = (className, fields, saveFileFunc) => {
    let classN = className.toLowerCase()
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

<div id="${classN}">
${getInputs(className, fields)}\t<button on:click={delete${className}}>Delete</button>
\t<button on:click={update${className}}>Update</button>
</div>

<!-- ###################### -->

<style>
#${classN} {
    display: grid;
    ${getGridTemplateColumns(fields)}
    grid-gap: 10px;
}
</style>
`
console.log(src)
saveFileFunc(src, className+".svelte")
}



function getInputs(className, fields){
    let out = ''
    for(let i=0; i<fields.length; i++){
        out +=  '\t<input type="text" bind:value="{'+className.toLowerCase()+'.'+fields[i]+'}">\n'
    }
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