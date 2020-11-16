<script>
import {db} from './firestore.js'
import User from './User.svelte'
let users = []
let email = ''
let name = ''


db.collection('users').onSnapshot(data => {
    users = data.docs
})

function addUser(){
    db.collection('users').add({email, name})
    // Firebase will automatically map to relevant names !!
	email = ''
	name = ''

}
</script>

<!-- ###################### -->

<div class="user">
    <form on:submit|preventDefault={addUser}>
		<input type="text" bind:value={email}>
		<input type="text" bind:value={name}>
		<button>Add</button>
    </form>
</div>


<div>
{#each users as user}
    <User id={user.id} user={user.data()} />
{/each}
</div>

<!-- ###################### -->

<style>
.user form {
    display: grid;
    grid-template-columns: 6fr 6fr 2fr 2fr;
    grid-gap: 10px;
}
</style>