<script>
  export let show    = false
  export let title   = 'Confirm'
  export let message = 'Are you sure?'
  export let danger  = true
  export let loading = false
  export let onConfirm = () => {}
  export let onCancel  = () => {}

  function handleKeydown(e) {
    if (e.key === 'Escape') onCancel()
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if show}
  <div class="modal-backdrop">
    <button class="modal-backdrop-btn" on:click={onCancel} tabindex="-1" aria-label="Close" />
    <div class="modal modal-sm" role="dialog" aria-modal="true">
      <div class="modal-header">
        <h3>{title}</h3>
        <button class="modal-close" on:click={onCancel}>✕</button>
      </div>
      <div class="modal-body">
        <p>{message}</p>
        <slot />
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" on:click={onCancel} disabled={loading}>Cancel</button>
        <button
          class="btn {danger ? 'btn-danger' : 'btn-primary'}"
          on:click={onConfirm}
          disabled={loading}
        >
          {loading ? 'Please wait…' : 'Confirm'}
        </button>
      </div>
    </div>
  </div>
{/if}
