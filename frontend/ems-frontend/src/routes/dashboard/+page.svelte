<script>
  import { onMount } from 'svelte';
  import { getDashboardStats, getAttendanceTrends, getMonthlyPayroll, getDepartmentStats } from '$lib/api/dashboard.js';
  import { getEmployees } from '$lib/api/employees.js';
  import { getSalaries } from '$lib/api/salary.js';
  import { getAttendance } from '$lib/api/attendance.js';
  import { formatCurrency, MONTHS, currentMonthYear } from '$lib/utils/helpers.js';
  import { authStore } from '$lib/stores/auth.store.js';

  let stats = null;
  let recentEmployees = [];
  let attendanceTrends = [];
  let payrollTrends = [];
  let deptStats = [];
  let mySalaries = [];
  let myAttendance = [];
  let loading = true;
  let error = '';

  $: user = $authStore.user;
  $: displayName = user?.name || user?.email || 'User';
  $: isAdminOrHr = ['admin', 'hr'].includes(user?.role);
  $: isEmployee = user?.role === 'employee';

  const { month, year } = currentMonthYear();

  onMount(async () => {
    try {
      if (isEmployee) {
        const [salRes, attRes] = await Promise.all([
          getSalaries({ month, year, limit: 3 }).catch(() => ({ data: [] })),
          getAttendance({ month, year, limit: 10 }).catch(() => ({ data: [] })),
        ]);
        mySalaries = salRes.data || [];
        myAttendance = attRes.data || [];
      } else {
        const [statsRes, empRes, trendsRes, payrollRes, deptRes] = await Promise.all([
          getDashboardStats().catch(() => null),
          getEmployees({ page: 1, limit: 6 }).catch(() => ({ data: [] })),
          getAttendanceTrends(6).catch(() => null),
          getMonthlyPayroll(6).catch(() => null),
          getDepartmentStats().catch(() => null),
        ]);
        stats = statsRes?.data ?? statsRes ?? {};
        recentEmployees = empRes?.data || [];
        attendanceTrends = trendsRes?.data || [];
        payrollTrends = payrollRes?.data || [];
        deptStats = deptRes?.data || [];
      }
    } catch (err) {
      error = err?.response?.data?.message || 'Failed to load dashboard.';
    } finally {
      loading = false;
    }
  });

  const statCards = (s) => [
    {
      label: 'Total Employees',
      value: s?.totalEmployees ?? 0,
      sub: `${s?.activeEmployees ?? 0} active`,
      color: 'purple',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    },
    {
      label: 'Present Today',
      value: s?.todayPresent ?? 0,
      sub: 'checked in today',
      color: 'green',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    },
    {
      label: 'Total Payroll',
      value: formatCurrency(s?.totalSalaryPaid ?? 0),
      sub: 'all time net paid',
      color: 'orange',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
    },
    {
      label: 'Attendance Rate',
      value: s?.totalEmployees ? Math.round(((s?.todayPresent ?? 0) / s.totalEmployees) * 100) + '%' : '—',
      sub: 'present today',
      color: 'blue',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    },
  ];

  const chartW = 520;
  const chartH = 160;
  const padL = 48;
  const padR = 16;
  const padT = 12;
  const padB = 32;
  const innerW = chartW - padL - padR;
  const innerH = chartH - padT - padB;

  function buildLineChart(data, key) {
    if (!data || data.length === 0) return null;
    const vals = data.map(d => Number(d[key]) || 0);
    const maxV = Math.max(...vals, 1);
    const pts = vals.map((v, i) => {
      const x = padL + (i / Math.max(vals.length - 1, 1)) * innerW;
      const y = padT + innerH - (v / maxV) * innerH;
      return { x, y, v, label: data[i]?.label || data[i]?.month || '' };
    });
    const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const area = `${path} L ${pts[pts.length - 1].x} ${padT + innerH} L ${pts[0].x} ${padT + innerH} Z`;
    const yTicks = [0, maxV * 0.5, maxV].map(v => ({
      v,
      y: padT + innerH - (v / maxV) * innerH,
    }));
    return { pts, path, area, yTicks };
  }

  $: attChart = buildLineChart(attendanceTrends, 'present');
  $: payChart = buildLineChart(payrollTrends, 'total_payroll');

  function deptBarChart(data) {
    if (!data || data.length === 0) return null;
    const max = Math.max(...data.map(d => d.employee_count || 0), 1);
    return data.slice(0, 6).map((d, i) => ({
      name: d.department || `Dept ${i + 1}`,
      count: d.employee_count || 0,
      pct: ((d.employee_count || 0) / max) * 100,
    }));
  }

  $: deptBars = deptBarChart(deptStats);

  function attStatusColor(status) {
    const map = { present: 'badge-present', absent: 'badge-absent', leave: 'badge-leave', half_day: 'badge-half' };
    return map[status] || 'badge-default';
  }

  function formatStatus(s) {
    if (!s) return '—';
    if (s === 'half_day') return 'Half Day';
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function formatAttDate(dateStr) {
    if (!dateStr) return '—';
    const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
  }
</script>

<svelte:head><title>EMS — Dashboard</title></svelte:head>

<div class="page">
  <div class="page-header">
    <div>
      <h2 class="page-title">Dashboard</h2>
      <p class="page-subtitle">
        Welcome back, <strong style="color:var(--text-primary)">{displayName}</strong>
        {#if isEmployee}— here's your activity overview.{:else}— here's what's happening today.{/if}
      </p>
    </div>
    {#if isAdminOrHr}
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <a href="/dashboard/attendance" class="btn btn-secondary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          Attendance
        </a>
        <a href="/dashboard/employees" class="btn btn-primary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="23" y1="11" x2="17" y2="11"/><line x1="20" y1="8" x2="20" y2="14"/></svg>
          Add Employee
        </a>
      </div>
    {/if}
  </div>

  {#if error}
    <div class="alert alert-error" role="alert">{error}</div>

  {:else if loading}
    <div class="stat-grid">
      {#each [1,2,3,4] as _}
        <div class="stat-card" style="opacity:0.45">
          <div style="height:36px;width:36px;background:var(--input-bg);border-radius:10px;margin-bottom:14px"></div>
          <div style="height:11px;width:80px;background:var(--input-bg);border-radius:6px;margin-bottom:10px"></div>
          <div style="height:28px;width:60px;background:var(--input-bg);border-radius:8px"></div>
        </div>
      {/each}
    </div>

  {:else if isEmployee}
    <div class="emp-dash-grid">
      <div class="emp-dash-card">
        <div class="emp-card-title">My Salary — {MONTHS[month - 1]} {year}</div>
        {#if mySalaries.length === 0}
          <div class="emp-empty">No salary record for this month yet.</div>
        {:else}
          {#each mySalaries as s}
            <div class="sal-row">
              <span class="sal-label">Basic Salary</span>
              <span class="sal-val positive">{formatCurrency(s.basic_salary)}</span>
            </div>
            <div class="sal-row">
              <span class="sal-label">Deductions</span>
              <span class="sal-val negative">− {formatCurrency(s.deductions)}</span>
            </div>
            <div class="sal-row sal-net">
              <span class="sal-label">Net Salary</span>
              <span class="sal-val">{formatCurrency(s.net_salary)}</span>
            </div>
          {/each}
        {/if}
        <a href="/dashboard/salary" class="btn btn-secondary btn-sm" style="margin-top:16px">View All Salary →</a>
      </div>

      <div class="emp-dash-card">
        <div class="emp-card-title">My Attendance — {MONTHS[month - 1]} {year}</div>
        {#if myAttendance.length === 0}
          <div class="emp-empty">No attendance records for this month yet.</div>
        {:else}
          <div class="att-mini-list">
            {#each myAttendance.slice(0, 8) as rec}
              <div class="att-mini-row">
                <span class="att-mini-date">{formatAttDate(rec.date)}</span>
                <span class="badge badge-{rec.status === 'half_day' ? 'half' : rec.status}">{formatStatus(rec.status)}</span>
                <span class="att-mini-time">{rec.check_in ? rec.check_in + (rec.check_out ? ' – ' + rec.check_out : '') : '—'}</span>
              </div>
            {/each}
          </div>
        {/if}
        <a href="/dashboard/attendance" class="btn btn-secondary btn-sm" style="margin-top:16px">View All Attendance →</a>
      </div>
    </div>

  {:else}
    <div class="stat-grid">
      {#each statCards(stats) as card, i}
        <div class="stat-card {card.color} animate-fade-up stagger-{i+1}">
          <div class="stat-icon {card.color}">{@html card.icon}</div>
          <div class="stat-label">{card.label}</div>
          <div class="stat-value">{card.value}</div>
          {#if card.sub}<div class="stat-sub">{card.sub}</div>{/if}
        </div>
      {/each}
    </div>

    <div class="charts-grid">
      <div class="chart-card animate-fade-up stagger-2">
        <div class="chart-header">
          <div>
            <div class="chart-title">Attendance Trend</div>
            <div class="chart-subtitle">Present employees — last 6 months</div>
          </div>
          <a href="/dashboard/attendance" class="btn btn-secondary btn-sm">View →</a>
        </div>
        {#if attChart}
          <svg viewBox="0 0 {chartW} {chartH}" class="chart-svg" preserveAspectRatio="none">
            <defs>
              <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#34d399" stop-opacity="0.25"/>
                <stop offset="100%" stop-color="#34d399" stop-opacity="0"/>
              </linearGradient>
            </defs>
            {#each attChart.yTicks as tick}
              <line x1={padL} y1={tick.y} x2={chartW - padR} y2={tick.y} stroke="var(--table-border)" stroke-width="1"/>
              <text x={padL - 6} y={tick.y + 4} fill="var(--text-muted)" font-size="9" text-anchor="end">{Math.round(tick.v)}</text>
            {/each}
            <path d={attChart.area} fill="url(#attGrad)"/>
            <path d={attChart.path} fill="none" stroke="#34d399" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            {#each attChart.pts as pt}
              <circle cx={pt.x} cy={pt.y} r="4" fill="#34d399" stroke="var(--card-bg-solid)" stroke-width="2"/>
              <text x={pt.x} y={padT + innerH + 18} fill="var(--text-muted)" font-size="9" text-anchor="middle">{pt.label}</text>
            {/each}
          </svg>
        {:else}
          <div class="chart-empty">
            <p>No trend data yet — mark attendance to see trends</p>
          </div>
        {/if}
      </div>

      <div class="chart-card animate-fade-up stagger-3">
        <div class="chart-header">
          <div>
            <div class="chart-title">Payroll Trend</div>
            <div class="chart-subtitle">Monthly net payout — last 6 months</div>
          </div>
          <a href="/dashboard/salary" class="btn btn-secondary btn-sm">View →</a>
        </div>
        {#if payChart}
          <svg viewBox="0 0 {chartW} {chartH}" class="chart-svg" preserveAspectRatio="none">
            <defs>
              <linearGradient id="payGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#a78bfa" stop-opacity="0.25"/>
                <stop offset="100%" stop-color="#a78bfa" stop-opacity="0"/>
              </linearGradient>
            </defs>
            {#each payChart.yTicks as tick}
              <line x1={padL} y1={tick.y} x2={chartW - padR} y2={tick.y} stroke="var(--table-border)" stroke-width="1"/>
              <text x={padL - 6} y={tick.y + 4} fill="var(--text-muted)" font-size="9" text-anchor="end">{Math.round(tick.v / 1000)}k</text>
            {/each}
            <path d={payChart.area} fill="url(#payGrad)"/>
            <path d={payChart.path} fill="none" stroke="#a78bfa" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            {#each payChart.pts as pt}
              <circle cx={pt.x} cy={pt.y} r="4" fill="#a78bfa" stroke="var(--card-bg-solid)" stroke-width="2"/>
              <text x={pt.x} y={padT + innerH + 18} fill="var(--text-muted)" font-size="9" text-anchor="middle">{pt.label}</text>
            {/each}
          </svg>
        {:else}
          <div class="chart-empty">
            <p>Generate salary to see payroll trends</p>
          </div>
        {/if}
      </div>
    </div>

    {#if deptBars && deptBars.length > 0}
      <div class="chart-card animate-fade-up stagger-4">
        <div class="chart-header">
          <div>
            <div class="chart-title">Department Distribution</div>
            <div class="chart-subtitle">Headcount per department</div>
          </div>
        </div>
        <div class="dept-bars">
          {#each deptBars as dept, i}
            <div class="dept-row">
              <div class="dept-name">{dept.name}</div>
              <div class="dept-bar-track">
                <div class="dept-bar-fill" style="width:{dept.pct}%;animation-delay:{i * 0.07}s"></div>
              </div>
              <div class="dept-count">{dept.count}</div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <div class="section-header">
      <h3 class="section-title">Recent Employees</h3>
      <a class="btn btn-secondary btn-sm" href="/dashboard/employees">View All →</a>
    </div>

    {#if recentEmployees.length === 0}
      <div class="state-box state-empty">
        <div class="empty-icon">👥</div>
        <div class="empty-body">
          <p class="empty-title">No employees yet</p>
          <p class="empty-sub">Start by adding your first employee to the system.</p>
          <a href="/dashboard/employees" class="btn btn-primary" style="margin-top:14px;width:fit-content">
            Add First Employee
          </a>
        </div>
      </div>
    {:else}
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Department</th>
              <th>Position</th>
              <th>Salary</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {#each recentEmployees as emp (emp.id)}
              <tr>
                <td>
                  <div style="display:flex;align-items:center;gap:10px">
                    <div class="avatar-placeholder" style="width:34px;height:34px;font-size:12px">
                      {(emp.name?.[0] || emp.email?.[0] || '?').toUpperCase()}
                    </div>
                    <div>
                      <div class="emp-name">{emp.name || '—'}</div>
                      <div class="emp-email">{emp.email}</div>
                    </div>
                  </div>
                </td>
                <td>{emp.department || '—'}</td>
                <td>{emp.position || '—'}</td>
                <td style="font-weight:600">{formatCurrency(emp.salary)}</td>
                <td>
                  <span class="badge {emp.is_active ? 'badge-present' : 'badge-absent'}">
                    {emp.is_active ? '● Active' : '● Inactive'}
                  </span>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  {/if}
</div>

<style>
  .stat-sub { font-size: 11.5px; color: var(--text-muted); margin-top: 4px; font-weight: 500; }

  .charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

  @media (max-width: 860px) { .charts-grid { grid-template-columns: 1fr; } }

  .chart-card {
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 18px;
    padding: 20px 22px 16px;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    box-shadow: var(--shadow-card);
    transition: background 0.3s ease, border-color 0.3s ease;
    margin-bottom: 16px;
  }

  .chart-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 18px; }

  .chart-title { font-size: 14px; font-weight: 700; color: var(--text-primary); }
  .chart-subtitle { font-size: 11.5px; color: var(--text-muted); margin-top: 2px; }

  .chart-svg { width: 100%; height: 160px; display: block; overflow: visible; }

  .chart-empty { height: 160px; display: flex; align-items: center; justify-content: center; color: var(--text-muted); font-size: 12.5px; text-align: center; }
  .chart-empty p { margin: 0; }

  .dept-bars { display: flex; flex-direction: column; gap: 12px; }
  .dept-row { display: flex; align-items: center; gap: 12px; }

  .dept-name { width: 120px; font-size: 12.5px; color: var(--text-secondary); font-weight: 500; flex-shrink: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  .dept-bar-track { flex: 1; height: 8px; background: var(--input-bg); border-radius: 8px; overflow: hidden; border: 1px solid var(--border-color); }

  .dept-bar-fill { height: 100%; background: linear-gradient(90deg, #7c3aed, #60a5fa); border-radius: 8px; animation: bar-grow 0.6s ease both; }

  @keyframes bar-grow { from { width: 0 !important; } to {} }

  .dept-count { width: 28px; text-align: right; font-size: 12.5px; font-weight: 700; color: var(--text-primary); flex-shrink: 0; }

  .state-empty { flex-direction: column; align-items: center; text-align: center; padding: 48px 24px; }
  .empty-icon { font-size: 44px; opacity: 0.5; margin-bottom: 8px; }
  .empty-body { display: flex; flex-direction: column; align-items: center; }
  .empty-title { margin: 0; font-weight: 700; font-size: 15px; color: var(--text-primary); }
  .empty-sub { margin: 5px 0 0; font-size: 13px; color: var(--text-muted); }

  .emp-dash-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

  @media (max-width: 700px) { .emp-dash-grid { grid-template-columns: 1fr; } }

  .emp-dash-card {
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 18px;
    padding: 22px 24px;
    display: flex;
    flex-direction: column;
    box-shadow: var(--shadow-card);
  }

  .emp-card-title { font-size: 14px; font-weight: 700; color: var(--text-primary); margin-bottom: 16px; }

  .emp-empty { font-size: 13px; color: var(--text-muted); text-align: center; padding: 20px 0; }

  .sal-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--table-border); }

  .sal-net { font-weight: 700; border-top: 2px solid var(--border-color); border-bottom: none; margin-top: 4px; padding-top: 12px; }

  .sal-label { font-size: 13px; color: var(--text-secondary); }

  .sal-val { font-size: 13px; font-weight: 600; color: var(--text-primary); }
  .sal-val.positive { color: var(--accent-green); }
  .sal-val.negative { color: var(--accent-red); }

  .att-mini-list { display: flex; flex-direction: column; gap: 8px; }

  .att-mini-row { display: flex; align-items: center; gap: 12px; padding: 6px 0; border-bottom: 1px solid var(--table-border); }

  .att-mini-date { font-size: 12px; color: var(--text-secondary); font-weight: 600; width: 52px; flex-shrink: 0; }

  .att-mini-time { font-size: 11.5px; color: var(--text-muted); margin-left: auto; }
</style>