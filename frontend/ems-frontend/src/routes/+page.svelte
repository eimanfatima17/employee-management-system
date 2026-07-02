<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { authStore } from '$lib/stores/auth.store.js';
  import { get } from 'svelte/store';

  onMount(() => {
    const { token } = get(authStore);
    if (token) {
      goto('/dashboard', { replaceState: true });
    } else {
      goto('/login', { replaceState: true });
    }
  });
</script>

<div></div>
