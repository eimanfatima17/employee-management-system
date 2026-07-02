<script>
  import Modal from './Modal.svelte'
  import { createEventDispatcher } from 'svelte'
  const dispatch = createEventDispatcher()

  export let open = false
  export let title = 'Confirm'
  export let message = 'Are you sure?'
  export let confirmLabel = 'Confirm'
  export let danger = false
  export let loading = false
  export let error = ''
</script>

<Modal {open} {title} size="sm" on:close={() => dispatch('cancel')}>
  <div class="cd-body">
    {#if error}
      <div class="alert alert-error">{error}</div>
    {/if}
    <p class="cd-msg">{message}</p>
  </div>
  <div class="cd-actions">
    <button class="btn btn-secondary" disabled={loading} on:click={() => dispatch('cancel')}>Cancel</button>
    <button
      class="btn {danger ? 'btn-danger' : 'btn-primary'}"
      disabled={loading}
      on:click={() => dispatch('confirm')}
    >
      {loading ? 'Processing…' : confirmLabel}
    </button>
  </div>
</Modal>
