<script>
import Field from './Field.svelte'
import { saveAs } from 'file-saver';
import {generateCollectionFile} from './js/collection.js'
import {generateEntityFile} from './js/entity.js'
let fields = ["name", "email"]
let field = 'Name'
let className = 'Person'
let sortingCBvalue = false;
let searchChecked = false;
let searchField = ''
let classMessage = ''
let fieldMessage = ''

function addField(){
    if (verifyField()){
        fields.push(field)
        fields = fields
        console.log("added field " + field)
        field = ''
        fieldMessage = ''
    }
}

function verifyClass(){
    if (/\s/.test(className)) {
        classMessage = "Found white space in class name"
    }else if(className.length == 0){
        classMessage = "Class name must be at least 1 character"
    }else{
        classMessage = ''
    }
}

function verifyField(){
 if (/\s/.test(field)) {
        fieldMessage = "Found white space in field name"
        return false
    }else if(field.length == 0){
        fieldMessage = " Field name must be at least 1 character"
        return false
    }
    fieldMessage = '' 
    return true
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

function publishFile(content, filename){
    var blob = new Blob([content], {type: "text/plain;charset=utf-8"});
    window.saveAs(blob, filename);
}

function searchToggle(){
     if(searchChecked){ // reset the value, if checkbox was un-checked
         searchField = ''
     }else if(searchField == ''){
         searchField = fields[0]
     }
}


</script>

<!-- ###################### -->
<div id="step0" class="steps">
    <h2>Step 0</h2>
    <p>If you don't have a Svelte project already, do the following:</p>
    <ul>
    <li>download and install <a href="https://nodejs.org/en/download/">Node.js</a></li>
    <li> download and unzip <a href="https://www.dropbox.com/s/wbco7n4j835x49x/svelte-app.zip?dl=1">this starter project</a> to <i>myFolder</i></li>
    <li> open a terminal at <i>myFolder</i> and type:
        <ul class="sourcecode">
            <li>npm install + ENTER</li>
            <li>npm run dev + ENTER</li>
        </ul>
    </li>
    <li>now open a browser, and go to localhost:5000, and see if it works</li>
    <li>create a <a href="https://firebase.google.com/docs/web/setup">Firebase project</a> </li>
    <li>add this <a href="https://www.dropbox.com/s/2afem5lbt5w020y/firestore.js?dl=1">firestore.js</a> file to your src folder, and add your Firebase values to it.</li>
    <li>again in terminal at <i>myFolder</i>, type:
    <ul class="sourcecode">
        <li>npm install firebase</li>
    </ul>
    </li>
    <li>for hosting your application, consider <a href="https://www.netlify.com/">Netlify.com</a></li>
    </ul>
</div>
<br/>
<div class="steps">
    <h2>Step 1</h2>
    <p>Enter a class name (e.g. User, Student, Animal): </p>
    <div id="nameofclass">
            <input type="text" bind:value={className} on:input={() => verifyClass()}>
            <span class="feedback">{classMessage}</span>
    </div>
    <p>Add fields, (e.g. name, e-mail, address): </p>
    <div id="addField">
        <form on:submit|preventDefault={addField}>
            <input type="text" bind:value={field} on:input={() => verifyField()}>
            <button>Add field</button>
            <span class="feedback">{fieldMessage}</span>
        </form>
    </div>

    <div id="users">
    {#each fields as f}
        <Field fieldName = {f} on:delete_field={deleteField} />
    {/each}
    </div>
    <br/>
    <div id="sortingDIV">
        <span>Add sorting to all fields:&nbsp;&nbsp;&nbsp;</span>
        <input id="sortingCB" type="checkbox" bind:checked={sortingCBvalue} />
    </div>
    <br/>
     <div id="searchDIV">
        <span>Add search to <strong>one</strong> field:&nbsp;&nbsp;&nbsp;</span>
        <input id="searchCB" type="checkbox" bind:checked={searchChecked} on:click={searchToggle} />
        {#if searchChecked}
            <select id="selectSort" bind:value={searchField} >
                {#each fields as field}
                    <option>{field}</option>
                {/each}
            </select>
        {/if}
    </div>
    <br/>
</div>
<br/>
<div class="steps">
    <h2>Step 2</h2>
    {#if classMessage == ''}
    <p>Download these 2 files, and move them into the <i>src</i> folder of your Svelte project</p>
    <button on:click={() => generateEntityFile(className, fields, publishFile)}>
    Download {className}.svelte
    </button><br/>
    <button on:click={() => generateCollectionFile(className, sortingCBvalue, fields, searchField, publishFile)}>
    Download {className}s.svelte
    </button>
    {:else}
    <h3>Add a legal class name to continue</h3>
    {/if}
</div>
<br/>
<div id="step2" class="steps">
    <h2>Step 3</h2>
    <p>Add the following line between &lt;script&gt &lt/script&gt tags in your App.svelte file:</p>
    <p class="sourcecode">import {className}s from './{className}s.svelte'</p>
</div>
<br/>
<div id="step3" class="steps">
    <h2>Step 4</h2>
    <p>Add the following line to your App.svelte file (outside the &lt;script&gt &lt/script&gt tags) :</p>
    <p class="sourcecode">&lt;{className}s/&gt</p>
</div>
<!-- ###################### -->
<style>
.sourcecode {
    font-family: Consolas,monaco,monospace;
}

.steps {
    padding-left: 10px;
    border-style: solid;
    border-width: 1px;
     border-color:black;
}

#sortingCB, #searchCB{
    transform : scale(2); 
}
#sortingDIV{
    margin-bottom: 10px;
    
}
.feedback{
    color: red
}


</style>