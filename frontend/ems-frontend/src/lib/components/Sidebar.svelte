<script>
  import { page } from '$app/stores';

  const mainNav = [
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/dashboard/employees', label: 'Employees', icon: '👥' },
    { href: '/dashboard/attendance', label: 'Attendance', icon: '🕒' },
    { href: '/dashboard/salary', label: 'Salaries', icon: '💰' },
  ];

  const systemNav = [
    { href: '#', label: 'Departments', icon: '🏢' },
    { href: '#', label: 'Performance', icon: '🚀' },
    { href: '#', label: 'Reports', icon: '📄' },
    { href: '#', label: 'Settings', icon: '⚙️' },
  ];

  $: currentPath = $page.url.pathname;

  function isActive(href) {
    if (href === '/dashboard') return currentPath === '/dashboard';
    return href !== '#' && currentPath.startsWith(href);
  }
</script>

<aside class="sidebar">
  <!-- Logo -->
  <div class="logo-wrap">
    <div class="logo-icon">
      <svg
        width="20"
        height="20"
        fill="none"
        viewBox="0 0 24 24"
        stroke="white"
        stroke-width="2.5"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10"
        />
      </svg>
    </div>

    <div>
      <div class="logo-title">EMS</div>
      <div class="logo-sub">Employee Management</div>
    </div>
  </div>

  <!-- Navigation -->
  <nav class="nav-area">
    <div class="section-label">MAIN</div>

    {#each mainNav as item}
      <a
        href={item.href}
        class="nav-item {isActive(item.href) ? 'active' : ''}"
      >
        <span class="nav-icon">{item.icon}</span>
        {item.label}
      </a>
    {/each}

    <div class="section-label">SYSTEM</div>

    {#each systemNav as item}
      <a
        href={item.href}
        class="nav-item {isActive(item.href) ? 'active' : ''}"
      >
        <span class="nav-icon">{item.icon}</span>
        {item.label}
      </a>
    {/each}
  </nav>

  <!-- Upgrade -->
  <div class="upgrade-card">
    <div style="font-size:22px;margin-bottom:8px">👑</div>

    <div
      style="font-weight:700;font-size:14px;color:white;margin-bottom:4px"
    >
      Upgrade to Pro
    </div>

    <div
      style="font-size:11px;color:var(--text-secondary);margin-bottom:12px;line-height:1.5"
    >
      Unlock advanced analytics and more features.
    </div>

    <button class="btn-primary" style="width:100%;padding:9px">
      Upgrade Now
    </button>
  </div>
</aside>

<style>
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    width: var(--sidebar-width);
    background: rgba(5, 8, 22, 0.85);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border-right: 1px solid rgba(255, 255, 255, 0.07);
    display: flex;
    flex-direction: column;
    z-index: 100;
    overflow-y: auto;
  }

  .logo-wrap {
    padding: 20px 16px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .logo-icon {
    width: 38px;
    height: 38px;
    border-radius: 12px;
    background: linear-gradient(135deg, #9333ea, #3b82f6);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 15px rgba(147, 51, 234, 0.5);
    flex-shrink: 0;
  }

  .logo-title {
    font-weight: 800;
    font-size: 15px;
    color: white;
    letter-spacing: 0.3px;
  }

  .logo-sub {
    font-size: 10px;
    color: var(--text-muted);
    letter-spacing: 0.5px;
  }

  .nav-area {
    flex: 1;
    padding: 12px 10px;
  }

  .section-label {
    font-size: 11px;
    color: var(--text-muted);
    margin: 18px 10px 10px;
    font-weight: 700;
    letter-spacing: 1px;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    border-radius: 12px;
    color: #cbd5e1;
    text-decoration: none;
    transition: all 0.2s ease;
    margin-bottom: 6px;
    font-size: 14px;
    font-weight: 500;
  }

  .nav-item:hover {
    background: rgba(255, 255, 255, 0.06);
    color: white;
  }

  .nav-item.active {
    background: linear-gradient(
      135deg,
      rgba(147, 51, 234, 0.25),
      rgba(59, 130, 246, 0.2)
    );
    color: white;
  }

  .nav-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
  }

  .upgrade-card {
    margin: 14px;
    padding: 16px;
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.08);
  }
</style>