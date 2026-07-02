<script>
  export let message = ''
  export let type    = 'success'
  export let visible = false 

  let timer
  $: if (visible) {
    clearTimeout(timer)
    timer = setTimeout(() => { visible = false }, 4000)
  }
</script>

{#if visible && message}
  <div class="toast toast-{type}" role={type === 'error' ? 'alert' : 'status'}>
    <span class="toast-icon">
      {#if type === 'success'}✓{:else if type === 'error'}✕{:else}ℹ{/if}
    </span>
    {message}
  </div>
{/if}
