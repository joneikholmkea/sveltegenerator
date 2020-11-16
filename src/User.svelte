<script>
import {db} from './firestore.js'
export let id = ''
export let user = {}

function deleteUser(){
    db.collection('users').doc(id).delete()
}

function updateUser(){
    db.collection('users').doc(id).update(user)
}

</script>

<div id="user">
	<input type="text" bind:value="{user.email}">
	<input type="text" bind:value="{user.name}">
	<button on:click={deleteUser}>Delete</button>
	<button on:click={updateUser}>Update</button>
</div>

<!-- ###################### -->

<style>
#user {
    display: grid;
    grid-template-columns: 4fr 4fr 3fr 3fr;
    grid-gap: 10px;
}
</style>
