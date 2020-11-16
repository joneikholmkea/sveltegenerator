
<script>
import {db} from './firestore.js'
import Person from './Person.svelte'
let persons = []
let name = ''
let email = ''


db.collection('persons').onSnapshot(data => {
    persons = data.docs
})

function addPerson(){
    db.collection('persons').add({name, email})
    // Firebase will automatically map to relevant names !!
	name = ''
	email = ''

}
</script>

<!-- ###################### -->

<div class="person">
    <form on:submit|preventDefault={addPerson}>
		<input type="text" placeholder="name" bind:value={name}>
		<input type="text" placeholder="email" bind:value={email}>
		<button>Add</button>
    </form>
</div>


<div>
{#each persons as person}
    <Person id={person.id} person={person.data()} />
{/each}
</div>

<!-- ###################### -->

<style>
.person form {
    display: grid;
    grid-template-columns: 6fr 6fr 2fr 2fr;
    grid-gap: 10px;
}
</style>
