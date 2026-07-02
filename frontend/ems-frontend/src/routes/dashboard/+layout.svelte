<script>
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { authStore } from '$lib/stores/auth.store.js';
  import { logout as logoutApi } from '$lib/api/auth.js';

  let guardChecked = false;
  let isDark = true;

  onMount(() => {
    const saved = localStorage.getItem('ems-theme');
    isDark = saved !== 'light';
    applyTheme(isDark);

    const { token } = get(authStore);
    if (!token) {
      goto('/login', { replaceState: true });
      return;
    }
    guardChecked = true;

    const unsubscribe = authStore.subscribe(($auth) => {
      if (guardChecked && !$auth.token) {
        goto('/login', { replaceState: true });
      }
    });
    return () => unsubscribe();
  });

  function applyTheme(dark) {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('ems-theme', dark ? 'dark' : 'light');
  }

  function toggleTheme() {
    isDark = !isDark;
    applyTheme(isDark);
  }

  $: user = $authStore.user;
  $: isAdminOrHr = ['admin', 'hr'].includes(user?.role);

  async function logout() {
    const { refreshToken } = get(authStore);
    try {
      if (refreshToken) await logoutApi(refreshToken);
    } catch {
    } finally {
      authStore.logout();
      goto('/login', { replaceState: true });
    }
  }

  const allNavLinks = [
    { href: '/dashboard',            label: 'Overview',   icon: 'grid',   roles: ['admin', 'hr', 'employee'] },
    { href: '/dashboard/employees',  label: 'Employees',  icon: 'users',  roles: ['admin', 'hr', 'employee'] },
    { href: '/dashboard/attendance', label: 'Attendance', icon: 'clock',  roles: ['admin', 'hr', 'employee'] },
    { href: '/dashboard/salary',     label: 'Salary',     icon: 'dollar', roles: ['admin', 'hr', 'employee'] },
  ];

  $: navLinks = allNavLinks.filter(l => !user?.role || l.roles.includes(user.role));

  $: currentPath = $page.url.pathname;

  function isActive(href) {
    if (href === '/dashboard') return currentPath === '/dashboard';
    return currentPath.startsWith(href);
  }

  const icons = {
    grid:   `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
    users:  `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    clock:  `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    dollar: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
  };
</script>

{#if guardChecked}
<div class="bg-orbs">
  <div class="bg-orb bg-orb-1"></div>
  <div class="bg-orb bg-orb-2"></div>
  <div class="bg-orb bg-orb-3"></div>
</div>
<div class="bg-dots"></div>
<div class="app-shell">
  <aside class="sidebar">
    <div class="sidebar-logo">
      <div class="logo-mark">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10"/>
        </svg>
      </div>
      <div>
        <div class="logo-name">EMS</div>
        <div class="logo-sub">Management Portal</div>
      </div>
    </div>

    <nav class="sidebar-nav">
      <div class="nav-section-label">MAIN</div>
      {#each navLinks as link}
        <a href={link.href} class="nav-link {isActive(link.href) ? 'active' : ''}">
          <span class="nav-icon">{@html icons[link.icon]}</span>
          <span class="nav-label">{link.label}</span>
          {#if isActive(link.href)}<span class="nav-dot"></span>{/if}
        </a>
      {/each}
    </nav>

    <div class="sidebar-bottom">
      {#if user?.role}
        <div class="role-indicator role-{user.role}">
          <span class="role-dot"></span>
          <span>{user.role.toUpperCase()}</span>
        </div>
      {/if}

      <button class="theme-toggle" on:click={toggleTheme}>
        {#if isDark}
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          <span>Light Mode</span>
        {:else}
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          <span>Dark Mode</span>
        {/if}
      </button>

      <div class="user-card">
        <div class="user-avatar">
          {(user?.name?.[0] || user?.email?.[0] || 'A').toUpperCase()}
        </div>
        <div class="user-info">
          <div class="user-name">{user?.name || user?.email || 'Admin'}</div>
          <div class="user-role">{user?.role || 'admin'}</div>
        </div>
        <button class="logout-btn" on:click={logout} title="Logout">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        </button>
      </div>
    </div>
  </aside>

  <main class="main-content">
    <slot />
  </main>
</div>
{/if}

<style>
  .app-shell { display: flex; min-height: 100vh; }

  .sidebar {
    position: fixed; left: 0; top: 0; bottom: 0;
    width: var(--sidebar-width);
    background: var(--sidebar-bg);
    border-right: 1px solid var(--border-color);
    display: flex; flex-direction: column;
    z-index: 100; overflow-y: auto;
    transition: background 0.3s ease;
  }

  .sidebar-logo {
    padding: 22px 18px 18px; border-bottom: 1px solid var(--border-color);
    display: flex; align-items: center; gap: 12px; flex-shrink: 0;
  }

  .logo-mark {
    width: 40px; height: 40px; border-radius: 12px;
    background: linear-gradient(135deg, #7c3aed, #3b82f6);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 0 20px rgba(124,58,237,0.4); flex-shrink: 0;
  }

  .logo-name { font-weight: 800; font-size: 16px; color: var(--text-primary); letter-spacing: 0.5px; }
  .logo-sub { font-size: 10px; color: var(--text-muted); letter-spacing: 0.5px; margin-top: 1px; }

  .sidebar-nav { flex: 1; padding: 16px 12px; display: flex; flex-direction: column; gap: 2px; }

  .nav-section-label {
    font-size: 10px; font-weight: 700; color: var(--text-muted);
    letter-spacing: 1.2px; padding: 0 10px; margin: 8px 0 10px;
  }

  .nav-link {
    display: flex; align-items: center; gap: 12px;
    padding: 11px 14px; border-radius: 12px;
    color: var(--text-secondary); text-decoration: none;
    transition: all 0.2s ease; font-size: 13.5px; font-weight: 500;
    position: relative; border: 1px solid transparent;
  }

  .nav-link:hover { background: var(--nav-hover); color: var(--text-primary); }

  .nav-link.active {
    background: linear-gradient(135deg, rgba(124,58,237,0.18), rgba(59,130,246,0.12));
    color: #a78bfa; border-color: rgba(124,58,237,0.2); font-weight: 600;
  }

  .nav-icon { display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .nav-label { flex: 1; }

  .nav-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: #a78bfa; box-shadow: 0 0 8px rgba(167,139,250,0.6);
  }

  .sidebar-bottom {
    padding: 12px; border-top: 1px solid var(--border-color);
    display: flex; flex-direction: column; gap: 8px;
  }

  .role-indicator {
    display: flex; align-items: center; gap: 8px;
    padding: 6px 14px; border-radius: 8px;
    font-size: 10px; font-weight: 700; letter-spacing: 1px;
    background: var(--input-bg);
  }

  .role-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }

  .role-admin .role-dot { background: #f87171; }
  .role-hr .role-dot { background: #60a5fa; }
  .role-employee .role-dot { background: #34d399; }

  .role-admin { color: #f87171; }
  .role-hr { color: #60a5fa; }
  .role-employee { color: #34d399; }

  .theme-toggle {
    display: flex; align-items: center; gap: 10px;
    width: 100%; padding: 10px 14px; border-radius: 12px;
    background: var(--nav-hover); border: 1px solid var(--border-color);
    color: var(--text-secondary); font-size: 12px; font-weight: 500;
    cursor: pointer; transition: all 0.2s ease; font-family: inherit;
  }

  .theme-toggle:hover { color: var(--text-primary); border-color: rgba(124,58,237,0.4); }

  .user-card {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 12px; border-radius: 14px;
    background: var(--card-bg); border: 1px solid var(--border-color);
  }

  .user-avatar {
    width: 36px; height: 36px; border-radius: 50%;
    background: linear-gradient(135deg, #7c3aed, #3b82f6);
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 13px; color: white; flex-shrink: 0;
  }

  .user-info { flex: 1; min-width: 0; }

  .user-name {
    font-weight: 600; font-size: 12.5px; color: var(--text-primary);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }

  .user-role { font-size: 11px; color: var(--text-muted); text-transform: capitalize; }

  .logout-btn {
    background: none; border: none; color: var(--text-muted);
    cursor: pointer; padding: 5px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.2s ease; flex-shrink: 0;
  }

  .logout-btn:hover { color: #ef4444; background: rgba(239,68,68,0.1); }

  .main-content {
    margin-left: var(--sidebar-width); flex: 1; min-width: 0;
    padding: 28px 32px; background: var(--bg-main); min-height: 100vh;
    transition: background 0.3s ease;
  }

  @media (max-width: 900px) {
    .sidebar { position: static; width: 100%; height: auto; }
    .main-content { margin-left: 0; padding: 20px 16px; }
    .app-shell { flex-direction: column; }
  }
</style>
