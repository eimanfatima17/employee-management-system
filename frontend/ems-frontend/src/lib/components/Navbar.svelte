<script>
  export let title = 'Dashboard';

  const today = new Date();

  const dateStr = today.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
</script>

<header class="navbar">
  <div class="navbar-left">
    <div>
      <h1 class="page-title">{title}</h1>
      <p class="page-date">{dateStr}</p>
    </div>

    <div class="search-wrap">
      <svg
        width="15"
        height="15"
        fill="none"
        viewBox="0 0 24 24"
        stroke="var(--text-muted)"
        stroke-width="2"
        style="flex-shrink:0"
      >
        <circle cx="11" cy="11" r="8" />
        <path stroke-linecap="round" d="m21 21-4.35-4.35" />
      </svg>

      <input
        class="search-bar"
        placeholder="Search anything..."
      />

      <span class="shortcut-key">
        ⌘K
      </span>
    </div>
  </div>

  <div class="navbar-right">
    <button class="icon-btn" title="Toggle theme">
      <svg
        width="17"
        height="17"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="1.8"
      >
        <circle cx="12" cy="12" r="5" />
        <path
          stroke-linecap="round"
          d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
        />
      </svg>
    </button>

    <button class="icon-btn notif-btn" title="Notifications">
      <svg
        width="17"
        height="17"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="1.8"
      >
        <path
          stroke-linecap="round"
          d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"
        />
      </svg>

      <span class="notif-badge">3</span>
    </button>

    <div class="user-card">
      <div class="avatar">A</div>

      <div>
        <div class="user-name">Admin User</div>
        <div class="user-role">Administrator</div>
      </div>

      <svg
        width="14"
        height="14"
        fill="none"
        viewBox="0 0 24 24"
        stroke="var(--text-muted)"
        stroke-width="2"
      >
        <path stroke-linecap="round" d="m6 9 6 6 6-6" />
      </svg>
    </div>
  </div>
</header>

<style>
  .navbar {
    height: 72px;
    background: rgba(5, 8, 22, 0.8);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.07);

    display: flex;
    align-items: center;
    justify-content: space-between;

    padding: 0 24px;

    position: sticky;
    top: 0;
    z-index: 50;
  }

  .navbar-left {
    display: flex;
    align-items: center;
    gap: 24px;
  }

  .page-title {
    margin: 0;
    font-size: 22px;
    font-weight: 700;
    color: white;
  }

  .page-date {
    margin: 2px 0 0;
    font-size: 12px;
    color: var(--text-muted);
  }

  .search-wrap {
    display: flex;
    align-items: center;
    gap: 10px;

    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);

    border-radius: 12px;
    padding: 9px 14px;

    width: 300px;
  }

  .search-bar {
    border: none;
    background: transparent;
    flex: 1;
    padding: 0;
    outline: none;
    color: var(--text-primary);
  }

  .shortcut-key {
    font-size: 11px;
    color: var(--text-muted);

    background: rgba(255, 255, 255, 0.06);

    padding: 2px 7px;

    border-radius: 5px;

    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .navbar-right {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .icon-btn {
    width: 36px;
    height: 36px;

    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);

    border-radius: 10px;

    display: flex;
    align-items: center;
    justify-content: center;

    color: var(--text-secondary);

    cursor: pointer;

    transition: all 0.2s ease;
  }

  .icon-btn:hover {
    background: rgba(255, 255, 255, 0.08);

    color: var(--text-primary);

    border-color: rgba(255, 255, 255, 0.12);
  }

  .notif-btn {
    position: relative;
  }

  .notif-badge {
    position: absolute;
    top: -5px;
    right: -5px;

    width: 18px;
    height: 18px;

    border-radius: 50%;

    background: #ef4444;
    color: white;

    display: flex;
    align-items: center;
    justify-content: center;

    font-size: 10px;
    font-weight: 700;
  }

  .user-card {
    display: flex;
    align-items: center;
    gap: 10px;

    cursor: pointer;

    padding: 6px 10px;

    border-radius: 12px;

    border: 1px solid rgba(255, 255, 255, 0.08);

    background: rgba(255, 255, 255, 0.04);

    transition: all 0.2s ease;
  }

  .user-card:hover {
    background: rgba(255, 255, 255, 0.07);
  }

  .avatar {
    width: 32px;
    height: 32px;

    border-radius: 50%;

    background: linear-gradient(135deg, #9333ea, #3b82f6);

    display: flex;
    align-items: center;
    justify-content: center;

    font-weight: 700;
    font-size: 12px;

    color: white;

    flex-shrink: 0;
  }

  .user-name {
    font-size: 13px;
    font-weight: 600;

    color: var(--text-primary);

    line-height: 1.2;
  }

  .user-role {
    font-size: 10px;
    color: var(--text-muted);
  }
</style>