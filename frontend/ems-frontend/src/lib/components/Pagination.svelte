<script>
  import { paginationRange } from '$lib/utils/helpers.js'

  export let page        = 1
  export let totalPages  = 1
  export let onPageChange = (p) => {}

  $: pages = paginationRange(page, totalPages)
</script>

{#if totalPages > 1}
  <div class="pagination">
    <button
      class="page-btn"
      disabled={page <= 1}
      on:click={() => onPageChange(page - 1)}
    >‹ Prev</button>

    {#each pages as p}
      {#if p === '…'}
        <span class="page-ellipsis">…</span>
      {:else}
        <button
          class="page-btn"
          class:active={p === page}
          on:click={() => onPageChange(p)}
        >{p}</button>
      {/if}
    {/each}

    <button
      class="page-btn"
      disabled={page >= totalPages}
      on:click={() => onPageChange(page + 1)}
    >Next ›</button>
  </div>
{/if}