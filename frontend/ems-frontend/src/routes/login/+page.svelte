<script>
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { authStore } from '$lib/stores/auth.store.js';
  import { login } from '$lib/api/auth.js';
  import { get } from 'svelte/store';

  let email         = '';
  let password      = '';
  let loading       = false;
  let error         = '';
  let showPass      = false;
  let isDark        = true;
  let passwordInput;

  onMount(() => {
    const saved = localStorage.getItem('ems-theme');
    isDark = saved !== 'light';
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    const { token } = get(authStore);
    if (token) goto('/dashboard', { replaceState: true });

    setTimeout(() => {
      email    = '';
      password = '';
    }, 100);
  });

  function toggleTheme() {
    isDark = !isDark;
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('ems-theme', isDark ? 'dark' : 'light');
  }

  async function handleLogin() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) { error = 'Please fill in all fields.'; return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) { error = 'Please enter a valid email address.'; return; }

    loading = true;
    error   = '';

    try {
      const data = await login(trimmedEmail, password);
      if (!data?.token) { error = 'Login failed: invalid server response. Please try again.'; return; }

      authStore.set({
        user:         data.user         ?? null,
        token:        data.token,
        refreshToken: data.refreshToken ?? null,
      });

      goto('/dashboard', { replaceState: true });
    } catch (err) {
      error = err.response?.data?.message || 'Login failed. Check your credentials and try again.';
    } finally {
      loading = false;
    }
  }

  function onKeydown(e) {
    if (e.key === 'Enter' && !loading) handleLogin();
  }

  function togglePass() {
    showPass = !showPass;
    if (passwordInput) {
      passwordInput.type = showPass ? 'text' : 'password';
    }
  }
</script>

<svelte:head><title>EMS — Login</title></svelte:head>

<div class="login-page">

  <div class="login-bg-orbs">
    <div class="login-bg-orb login-bg-orb-1"></div>
    <div class="login-bg-orb login-bg-orb-2"></div>
    <div class="login-bg-orb login-bg-orb-3"></div>
  </div>
  <div class="login-bg-dots"></div>

  <div class="login-left">
    <div class="login-left-brand">
      <div class="login-brand-icon">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10"/>
        </svg>
      </div>
      <div>
        <div class="login-brand-name">EMS</div>
        <div class="login-brand-sub">Employee Management System</div>
      </div>
    </div>

    <div class="login-left-middle">
      <div class="login-tagline">Manage your<br/>workforce smarter.</div>
      <p class="login-tagline-sub">Everything you need to run HR operations — employees, attendance, salary, and more.</p>

      <div class="login-features">
        <div class="login-feature">
          <div class="login-feature-icon">👥</div>
          <div>
            <div class="login-feature-title">Employee Management</div>
            <div class="login-feature-desc">Manage all employee info with ease</div>
          </div>
        </div>
        <div class="login-feature">
          <div class="login-feature-icon">🕒</div>
          <div>
            <div class="login-feature-title">Smart Attendance</div>
            <div class="login-feature-desc">Track attendance and leaves efficiently</div>
          </div>
        </div>
        <div class="login-feature">
          <div class="login-feature-icon">📊</div>
          <div>
            <div class="login-feature-title">Salary & Reports</div>
            <div class="login-feature-desc">Auto-calculate payroll with deductions</div>
          </div>
        </div>
      </div>
    </div>

    <div class="login-left-footer">
      <div class="login-dots">
        <div class="login-dot active"></div>
        <div class="login-dot"></div>
        <div class="login-dot"></div>
      </div>
    </div>
  </div>

  <div class="login-right">
    <button class="login-theme-btn" on:click={toggleTheme} title="Toggle theme">
      {#if isDark}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
      {:else}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
      {/if}
    </button>

    <div class="login-right-inner">
      <h1 class="login-title">Welcome back</h1>
      <p class="login-subtitle">Sign in to your EMS dashboard</p>

      {#if error}
        <div class="alert alert-error" role="alert" style="margin-bottom:20px">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          {error}
        </div>
      {/if}

      <div class="login-form">
        <div style="display:none" aria-hidden="true">
          <input type="email" tabindex="-1" />
          <input type="password" tabindex="-1" />
        </div>

        <div class="field">
          <label for="email">Email Address</label>
          <div class="input-icon-wrap">
            <span class="input-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            </span>
            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              bind:value={email}
              on:keydown={onKeydown}
              disabled={loading}
              autocomplete="off"
              class="with-icon"
            />
          </div>
        </div>

        <div class="field">
          <label for="password">Password</label>
          <div class="input-icon-wrap">
            <span class="input-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </span>

            <input
              id="password"
              type="password"
              placeholder="••••••••"
              bind:value={password}
              bind:this={passwordInput}
              on:keydown={onKeydown}
              disabled={loading}
              autocomplete="new-password"
              style="padding-left: 40px; padding-right: 44px;"
            />

            <button
              type="button"
              class="toggle-pass"
              on:click={togglePass}
              tabindex="-1"
              aria-label={showPass ? 'Hide password' : 'Show password'}
            >
              {#if showPass}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              {:else}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              {/if}
            </button>
          </div>
        </div>

        <button class="btn btn-primary btn-full" on:click={handleLogin} disabled={loading}>
          {#if loading}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation:spin 1s linear infinite"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            Signing in…
          {:else}
            Sign In
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          {/if}
        </button>
      </div>

      <div class="login-contact-note">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        Don't have access? Contact your system administrator to get an account.
      </div>
    </div>
  </div>
</div>

<style>
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

  .input-icon-wrap { position: relative; }

  .input-icon {
    position: absolute;
    left: 13px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-muted);
    display: flex;
    pointer-events: none;
  }

  input.with-icon { padding-left: 40px; }

  .login-contact-note {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 24px;
    padding: 12px 16px;
    background: var(--input-bg);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    font-size: 12.5px;
    color: var(--text-muted);
    line-height: 1.5;
  }
</style>