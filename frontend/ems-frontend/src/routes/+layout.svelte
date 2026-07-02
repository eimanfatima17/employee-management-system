<script>
  import '../app.css';
  import { onMount } from 'svelte';

  onMount(() => {
    const saved = localStorage.getItem('ems-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
  });
</script>

<slot />
