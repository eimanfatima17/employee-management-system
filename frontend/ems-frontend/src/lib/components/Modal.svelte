
<script>
  import { createEventDispatcher } from 'svelte'
  const dispatch = createEventDispatcher()

  export let open = false
  export let title = ''
  export let size = 'md'   

  function close() { dispatch('close') }

  function onKeydown(e) {
    if (e.key === 'Escape' && open) close()
  }
</script>

<svelte:window on:keydown={onKeydown} />

{#if open}
  <div class="modal-backdrop">
    <button class="modal-bg-btn" on:click={close} aria-label="Close" tabindex="-1"></button>
    <div class="modal modal-{size}" role="dialog" aria-modal="true">
      <div class="modal-header">
        <h3 class="modal-title">{title}</h3>
        <button class="modal-close" on:click={close} aria-label="Close">✕</button>
      </div>
      <slot />
    </div>
  </div>
{/if}