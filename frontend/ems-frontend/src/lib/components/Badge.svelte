<script>
  export let type = 'default' 
  export let label = ''
</script>

<span class="badge badge-{type}">{label || $$slots.default ? '' : type}</span>
{#if $$slots.default}<span class="badge badge-{type}"><slot /></span>{/if}

