<script>
import { createEventDispatcher } from 'svelte';
const dispatch = createEventDispatcher();

export let fieldName = ''

function deleteField(field){
    dispatch("delete_field", {fieldName: fieldName})
}

</script>

<!-- ###################### -->
<div class="field">
    <p>{fieldName}</p>
    <button on:click={deleteField}>Delete</button>
</div>

<!-- ###################### -->

<style>
.field {
    display: grid;
    grid-template-columns: 200px 100px;
    grid-gap: 10px;
}

p{
    font-size: 20px;
    /* border-style: solid; */
    background-color: azure;
    margin: 0px;
    padding: 3px;
    /* border-width: 1px; */
    /* border-color:black; */
    /* padding: 5px; */
}
</style>