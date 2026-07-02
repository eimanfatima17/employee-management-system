<script>
  import { createEventDispatcher } from 'svelte'
  const dispatch = createEventDispatcher()

  export let value = ''
  export let placeholder = 'Search…'
  export let debounceMs = 350

  let timer
  function handleInput(e) {
    value = e.target.value
    clearTimeout(timer)
    timer = setTimeout(() => dispatch('search', value), debounceMs)
  }

  function clear() {
    value = ''
    dispatch('search', '')
  }
</script>

<div class="search-wrap">
  <span class="search-icon">🔍</span>
  <input
    class="search-input"
    type="text"
    {placeholder}
    {value}
    on:input={handleInput}
  />
  {#if value}
    <button class="search-clear" on:click={clear} aria-label="Clear search">✕</button>
  {/if}
</div>