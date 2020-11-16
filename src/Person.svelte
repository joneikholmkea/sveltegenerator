
<script>
import {db} from './firestore.js'
export let id = ''
export let person = {}

function deletePerson(){
    db.collection('persons').doc(id).delete()
}

function updatePerson(){
    db.collection('persons').doc(id).update(person)
}

</script>

<div class="person">
	<input type="text" bind:value="{person.name}">
	<input type="text" bind:value="{person.email}">
	<button on:click={deletePerson}>Delete</button>
	<button on:click={updatePerson}>Update</button>
</div>

<!-- ###################### -->

<style>
.person {
    display: grid;
    grid-template-columns: 6fr 6fr 2fr 2fr;
    grid-gap: 10px;
}
</style>
