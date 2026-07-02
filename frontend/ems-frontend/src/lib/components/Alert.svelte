<script>
  export let type = 'error'  
  export let message = ''
  export let dismissible = false

  import { createEventDispatcher } from 'svelte'
  const dispatch = createEventDispatcher()

  const icons = { error: '✖', success: '✔', info: 'ℹ', warn: '⚠' }
</script>

{#if message}
  <div class="alert alert-{type}" role={type === 'error' ? 'alert' : 'status'}>
    <span class="alert-icon">{icons[type]}</span>
    <span>{message}</span>
    {#if dismissible}
      <button class="alert-dismiss" on:click={() => dispatch('dismiss')}>✕</button>
    {/if}
  </div>
{/if}

