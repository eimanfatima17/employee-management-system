<script>
  import { onMount } from 'svelte';
  import { authStore } from '$lib/stores/auth.store.js';
  import {
    getAttendance, markAttendance, bulkMarkAttendance,
    getAttendanceCalendar, deleteAttendance,
  } from '$lib/api/attendance.js';
  import { getEmployees } from '$lib/api/employees.js';
  import { formatDate, MONTHS, currentMonthYear, formatStatus } from '$lib/utils/helpers.js';
  import Pagination from '$lib/components/Pagination.svelte';
  import Toast from '$lib/components/Toast.svelte';
  import ConfirmModal from '$lib/components/ConfirmModal.svelte';

  $: isAdminOrHr = ['admin', 'hr'].includes($authStore.user?.role);
  $: isAdmin = $authStore.user?.role === 'admin';

  let viewMode = 'list';

  let toastMsg = '';
  let toastType = 'success';
  let toastShow = false;
  function showToast(msg, type = 'success') { toastMsg = msg; toastType = type; toastShow = true; }

  let { month, year } = currentMonthYear();
  let filterEmployee = '';
  let filterDate = '';
  let searchQuery = '';

  let records = [];
  let employees = [];
  let loading = true;
  let error = '';
  let meta = { total: 0, page: 1, limit: 20, totalPages: 1 };

  let calendarMonth = month;
  let calendarYear = year;
  let calendarData = null;
  let calendarLoading = false;
  let calendarEmp = '';

  let bulkDate = new Date().toISOString().split('T')[0];
  let bulkEntries = [];
  let bulkLoading = false;

  let showModal = false;
  let formLoading = false;
  let formError = '';

  function emptyForm() {
    return {
      employee_id: '',
      date: new Date().toISOString().split('T')[0],
      status: '',
      check_in: '',
      check_out: '',
    };
  }
  let form = emptyForm();

  let deleteTarget = null;
  let showDelete = false;
  let deleteLoading = false;

  async function loadData(page = 1) {
    if (year < 2020 || year > 2099) { error = 'Invalid year range.'; return; }
    loading = true;
    error = '';
    records = [];
    try {
      const params = { month, year, limit: meta.limit, page };
      if (filterEmployee) params.employee_id = filterEmployee;
      const [attRes, empRes] = await Promise.all([
        getAttendance(params),
        getEmployees({ limit: 500 }),
      ]);
      records = attRes.data || [];
      meta = attRes.meta || meta;
      employees = empRes.data || [];
    } catch (err) {
      error = err.response?.data?.message || 'Failed to load attendance.';
    } finally {
      loading = false;
    }
  }

  async function loadCalendar() {
    if (!calendarEmp) { calendarData = null; return; }
    calendarLoading = true;
    try {
      const res = await getAttendanceCalendar({ employee_id: calendarEmp, month: calendarMonth, year: calendarYear });
      calendarData = res;
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load calendar.', 'error');
    } finally {
      calendarLoading = false;
    }
  }

  async function ensureEmployees() {
    if (employees.length === 0) {
      try {
        const empRes = await getEmployees({ limit: 500 });
        employees = empRes.data || [];
      } catch {
        employees = [];
      }
    }
  }

  function initBulk() {
    bulkEntries = employees.map(e => ({
      employee_id: e.id,
      name: e.name,
      status: '',
      check_in: '',
      check_out: '',
    }));
  }

  async function switchView(v) {
    viewMode = v;
    if (v === 'list') loadData(1);
    if (v === 'calendar') {
      await ensureEmployees();
      if (calendarEmp) loadCalendar();
    }
    if (v === 'bulk') {
      await ensureEmployees();
      initBulk();
    }
  }

  onMount(() => loadData(1));

  function openForm() {
    form = emptyForm();
    formError = '';
    showModal = true;
  }

  function closeModal() { showModal = false; }

  async function handleMark() {
    if (!form.employee_id || !form.date || !form.status) {
      formError = 'Employee, date and status are required.';
      return;
    }
    if (form.check_in && form.check_out && form.check_out < form.check_in) {
      formError = 'Check-out cannot be before check-in.';
      return;
    }
    formLoading = true;
    formError = '';
    try {
      const payload = { employee_id: parseInt(form.employee_id), date: form.date, status: form.status };
      if (form.check_in.trim()) payload.check_in = form.check_in;
      if (form.check_out.trim()) payload.check_out = form.check_out;
      await markAttendance(payload);
      showToast('Attendance marked successfully!');
      closeModal();
      if (viewMode === 'list') await loadData(meta.page);
    } catch (err) {
      formError = err.response?.data?.message || 'Failed to mark attendance.';
    } finally {
      formLoading = false;
    }
  }

  async function handleBulkSubmit() {
    const filled = bulkEntries.filter(e => e.status !== '');
    if (filled.length === 0) {
      showToast('Please set a status for at least one employee.', 'error');
      return;
    }
    const entries = filled.map(e => ({
      employee_id: e.employee_id,
      status: e.status,
      ...(e.check_in ? { check_in: e.check_in } : {}),
      ...(e.check_out ? { check_out: e.check_out } : {}),
    }));
    bulkLoading = true;
    try {
      const res = await bulkMarkAttendance({ date: bulkDate, entries });
      const saved = res.data || [];
      const savedMap = {};
      for (const r of saved) savedMap[r.employee_id] = r;
      bulkEntries = bulkEntries.map(e => savedMap[e.employee_id] ? { ...e, _saved: true } : e);
      showToast(`Attendance saved for ${saved.length || entries.length} employees.`);
    } catch (err) {
      showToast(err.response?.data?.message || 'Bulk attendance failed.', 'error');
    } finally {
      bulkLoading = false;
    }
  }

  async function handleDeleteAttendance() {
    deleteLoading = true;
    try {
      await deleteAttendance(deleteTarget.id);
      showToast('Record deleted.');
      showDelete = false;
      deleteTarget = null;
      await loadData(meta.page);
    } catch (err) {
      showToast(err.response?.data?.message || 'Delete failed.', 'error');
    } finally {
      deleteLoading = false;
    }
  }

  function exportCSV() {
    if (records.length === 0) return;
    const headers = ['Employee', 'Department', 'Date', 'Status', 'Check In', 'Check Out'];
    const rows = records.map(r => [
      r.employee_name || '',
      r.department || '',
      r.date ? r.date.slice(0, 10) : '',
      r.status || '',
      r.check_in || '',
      r.check_out || '',
    ]);
    const csv = [headers, ...rows].map(row => row.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${MONTHS[month - 1]}-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  $: summary = {
    present: records.filter(r => r.status === 'present').length,
    absent: records.filter(r => r.status === 'absent').length,
    leave: records.filter(r => r.status === 'leave').length,
    half_day: records.filter(r => r.status === 'half_day').length,
  };

  $: filteredRecords = (() => {
    let r = records;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      r = r.filter(rec =>
        (rec.employee_name || '').toLowerCase().includes(q) ||
        (rec.department || '').toLowerCase().includes(q) ||
        String(rec.employee_id).includes(q) ||
        `emp-${String(rec.employee_id).padStart(4, '0')}`.includes(q)
      );
    }
    if (filterDate) {
      r = r.filter(rec => {
        const d = rec.date instanceof Date ? rec.date.toISOString().slice(0, 10) : String(rec.date).slice(0, 10);
        return d === filterDate;
      });
    }
    return r;
  })();

  function isSunday(dateStr) {
    if (!dateStr) return false;
    const [y, m, d] = dateStr.split('-').map(Number); return new Date(y, m - 1, d).getDay() === 0;
  }

  function blockSunday(e) {
    if (isSunday(e.target.value)) {
      showToast('Sundays cannot be selected for attendance.', 'error');
      e.target.value = '';
      const field = e.target.id;
      if (field === 'a-date') form.date = '';
      else if (field === 'bulk-date') bulkDate = '';
      else if (field === 'att-date') filterDate = '';
    }
  }

  function handleKeydown(e) {
    if (e.key === 'Escape') closeModal();
  }
</script>

<svelte:window on:keydown={handleKeydown}/>
<svelte:head><title>EMS — Attendance</title></svelte:head>

<Toast message={toastMsg} type={toastType} bind:visible={toastShow}/>

<div class="page">

  <div class="page-header">
    <div>
      <h2 class="page-title">Attendance</h2>
      <p class="page-subtitle">Track and manage employee attendance — {MONTHS[month - 1]} {year}</p>
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      {#if records.length > 0 && viewMode === 'list'}
        <button class="btn btn-secondary" on:click={exportCSV}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export CSV
        </button>
      {/if}
      {#if isAdminOrHr}
        <button class="btn btn-primary" on:click={openForm}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Mark Attendance
        </button>
      {/if}
    </div>
  </div>

  <div class="view-tabs">
    <button class="tab-btn" class:active={viewMode === 'list'} on:click={() => switchView('list')}>List View</button>
    <button class="tab-btn" class:active={viewMode === 'calendar'} on:click={() => switchView('calendar')}>Calendar View</button>
    {#if isAdminOrHr}
      <button class="tab-btn" class:active={viewMode === 'bulk'} on:click={() => switchView('bulk')}>Bulk Mark</button>
    {/if}
  </div>

  {#if viewMode === 'list'}
    <div class="filter-bar">
      <div class="field">
        <label for="att-month">Month</label>
        <select id="att-month" bind:value={month}>
          {#each MONTHS as m, i}<option value={i + 1}>{m}</option>{/each}
        </select>
      </div>
      <div class="field">
        <label for="att-year">Year</label>
        <input id="att-year" type="number" bind:value={year} min="2020" max="2099"/>
      </div>
      <div class="field">
        <label for="att-date">Date</label>
        <input id="att-date" type="date" bind:value={filterDate} on:change={blockSunday}/>
      </div>
      {#if isAdminOrHr}
        <div class="field">
          <label for="att-emp">Employee</label>
          <select id="att-emp" bind:value={filterEmployee}>
            <option value="">All Employees</option>
            {#each employees as emp}<option value={emp.id}>{emp.name}</option>{/each}
          </select>
        </div>
      {/if}
      <div class="field search-field">
        <label for="att-search">Search</label>
        <input id="att-search" type="text" placeholder="Name or department…" bind:value={searchQuery}/>
      </div>
      <button class="btn btn-secondary" style="align-self:flex-end" on:click={() => { filterDate = ''; loadData(1); }} disabled={loading}>
        {loading ? 'Loading…' : 'Apply'}
      </button>
    </div>
  {:else if viewMode === 'calendar'}
    <div class="filter-bar">
      <div class="field">
        <label for="cal-month">Month</label>
        <select id="cal-month" bind:value={calendarMonth}>
          {#each MONTHS as m, i}<option value={i + 1}>{m}</option>{/each}
        </select>
      </div>
      <div class="field">
        <label for="cal-year">Year</label>
        <input id="cal-year" type="number" bind:value={calendarYear} min="2020" max="2099"/>
      </div>
      <div class="field">
        <label for="cal-emp">Employee *</label>
        <select id="cal-emp" bind:value={calendarEmp}>
          <option value="">Select employee</option>
          {#each employees as emp}<option value={emp.id}>{emp.name}</option>{/each}
        </select>
      </div>
      <button class="btn btn-secondary" style="align-self:flex-end" on:click={loadCalendar} disabled={calendarLoading}>
        {calendarLoading ? 'Loading…' : 'Load Calendar'}
      </button>
    </div>
  {/if}

  {#if viewMode === 'list'}

    {#if !loading && records.length > 0}
      <div class="att-stat-grid">
        <div class="att-stat-card present">
          <div class="att-stat-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div class="att-stat-val">{summary.present}</div>
          <div class="att-stat-label">Present</div>
        </div>
        <div class="att-stat-card absent">
          <div class="att-stat-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          </div>
          <div class="att-stat-val">{summary.absent}</div>
          <div class="att-stat-label">Absent</div>
        </div>
        <div class="att-stat-card leave">
          <div class="att-stat-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </div>
          <div class="att-stat-val">{summary.leave}</div>
          <div class="att-stat-label">On Leave</div>
        </div>
        <div class="att-stat-card half">
          <div class="att-stat-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 0 20"/></svg>
          </div>
          <div class="att-stat-val">{summary.half_day}</div>
          <div class="att-stat-label">Half Day</div>
        </div>
      </div>
    {/if}

    {#if loading}
      <div class="state-box"><p>Loading attendance records…</p></div>
    {:else if filteredRecords.length === 0}
      <div class="state-box state-empty">
        <div class="empty-icon">📅</div>
        <div class="empty-body">
          <p class="empty-title">No attendance records</p>
          <p class="empty-sub">
            {searchQuery || filterDate ? 'No results match your filters.' : `No records found for ${MONTHS[month - 1]} ${year}.`}
          </p>
          {#if isAdminOrHr && !searchQuery && !filterDate}
            <button class="btn btn-primary" style="margin-top:14px" on:click={openForm}>Mark Attendance</button>
          {/if}
        </div>
      </div>
    {:else}
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Department</th>
              <th>Date</th>
              <th>Day</th>
              <th>Status</th>
              <th>Check In</th>
              <th>Check Out</th>
              {#if isAdmin}<th>Actions</th>{/if}
            </tr>
          </thead>
          <tbody>
            {#each filteredRecords as rec (rec.id)}
              <tr>
                <td>
                  <div style="display:flex;align-items:center;gap:9px">
                    <div class="avatar-placeholder" style="width:30px;height:30px;font-size:11px;flex-shrink:0">
                      {(rec.employee_name?.[0] || '?').toUpperCase()}
                    </div>
                    {rec.employee_name || '—'}
                  </div>
                </td>
                <td>{rec.department || '—'}</td>
                <td>{formatDate(rec.date)}</td>
                <td class="muted">{rec.date ? (() => { const [y,m,d] = rec.date.slice(0,10).split('-').map(Number); return new Date(y, m-1, d).toLocaleDateString('en-US', { weekday: 'short' }); })() : '—'}</td>
                <td>
                  <span class="badge badge-{rec.status === 'half_day' ? 'half' : rec.status}">
                    {formatStatus(rec.status)}
                  </span>
                </td>
                <td>{rec.check_in || '—'}</td>
                <td>{rec.check_out || '—'}</td>
                {#if isAdmin}
                  <td>
                    <button class="btn btn-sm btn-danger"
                      on:click={() => { deleteTarget = rec; showDelete = true; }}>Delete</button>
                  </td>
                {/if}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={(p) => loadData(p)}/>
    {/if}
  {/if}

  {#if viewMode === 'calendar'}
    {#if !calendarEmp}
      <div class="state-box state-empty">
        <div class="empty-icon">🗓️</div>
        <div class="empty-body">
          <p class="empty-title">Select an employee</p>
          <p class="empty-sub">Choose an employee above to view their monthly attendance calendar.</p>
        </div>
      </div>
    {:else if calendarLoading}
      <div class="state-box"><p>Loading calendar…</p></div>
    {:else if calendarData}
      <div class="cal-summary">
        <span class="cal-stat cal-present">✓ Present: {calendarData.summary?.present ?? 0}</span>
        <span class="cal-stat cal-absent">✗ Absent: {calendarData.summary?.absent ?? 0}</span>
        <span class="cal-stat cal-leave">◎ Leave: {calendarData.summary?.leave ?? 0}</span>
        <span class="cal-stat cal-half">½ Half Day: {calendarData.summary?.half_day ?? 0}</span>
      </div>
      <div class="calendar-grid">
        {#each ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'] as day}
          <div class="cal-header">{day}</div>
        {/each}
        {#each Array(new Date(calendarYear, calendarMonth - 1, 1).getDay()) as _}
          <div class="cal-empty"></div>
        {/each}
        {#each calendarData.calendar as cell}
          <div class="cal-cell"
            title="{formatStatus(cell.status)}{cell.check_in ? ' | In: ' + cell.check_in : ''}{cell.check_out ? ' | Out: ' + cell.check_out : ''}">
            <div class="cal-day-num">{cell.day}</div>
            <div class="cal-day-label">{cell.weekday}</div>
            {#if cell.status !== 'not_marked'}
              <div class="cal-status">{formatStatus(cell.status)}</div>
              {#if cell.check_in}<div class="cal-time">↑ {cell.check_in}</div>{/if}
              {#if cell.check_out}<div class="cal-time">↓ {cell.check_out}</div>{/if}
            {:else}
              <div class="cal-unmarked">—</div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  {/if}

  {#if viewMode === 'bulk'}
    <div class="filter-bar">
      <div class="field">
        <label for="bulk-date">Date *</label>
        <input id="bulk-date" type="date" bind:value={bulkDate} on:change={(e) => { blockSunday(e); bulkEntries = bulkEntries.map(en => ({ ...en, _saved: false })); }}
          max={new Date().toISOString().split('T')[0]}/>
      </div>
      <button class="btn btn-secondary" style="align-self:flex-end" on:click={initBulk}>Reset</button>
    </div>

    {#if bulkEntries.length === 0}
      <div class="state-box state-empty">
        <div class="empty-icon">📋</div>
        <div class="empty-body">
          <p class="empty-title">No employees loaded</p>
          <p class="empty-sub">No active employees found. Add employees first.</p>
        </div>
      </div>
    {:else}
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Status</th>
              <th>Check In</th>
              <th>Check Out</th>
            </tr>
          </thead>
          <tbody>
            {#each bulkEntries as entry (entry.employee_id)}
              <tr class:saved-row={entry._saved}>
                <td>
                  <div style="display:flex;align-items:center;gap:9px">
                    <div class="avatar-placeholder" style="width:30px;height:30px;font-size:11px;flex-shrink:0">
                      {(entry.name?.[0] || '?').toUpperCase()}
                    </div>
                    {entry.name}
                    {#if entry._saved}<span class="saved-tick">✓</span>{/if}
                  </div>
                </td>
                <td>
                  <select bind:value={entry.status}>
                    <option value="">— Select —</option>
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="leave">Leave</option>
                    <option value="half_day">Half Day</option>
                  </select>
                </td>
                <td><input type="time" bind:value={entry.check_in}/></td>
                <td><input type="time" bind:value={entry.check_out}/></td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <div class="bulk-footer">
        <button class="btn btn-primary" on:click={handleBulkSubmit} disabled={bulkLoading}>
          {#if bulkLoading}
            Saving…
          {:else if bulkEntries.some(e => e._saved)}
            Saved {bulkEntries.filter(e => e._saved).length} / {bulkEntries.length} Employees ✓
          {:else}
            Save Attendance for {bulkEntries.filter(e => e.status).length} / {bulkEntries.length} Employees
          {/if}
        </button>
      </div>
    {/if}
  {/if}

</div>

{#if showModal}
  <div class="modal-backdrop">
    <button class="modal-backdrop-btn" on:click={closeModal} tabindex="-1" aria-label="Close"/>
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="att-modal-title">
      <div class="modal-header">
        <h3 id="att-modal-title">Mark Attendance</h3>
        <button class="modal-close" on:click={closeModal}>✕</button>
      </div>
      {#if formError}
        <div class="alert alert-error" role="alert" style="margin-bottom:16px">{formError}</div>
      {/if}
      <div class="modal-body">
        <div class="field">
          <label for="a-emp">Employee *</label>
          <select id="a-emp" bind:value={form.employee_id}>
            <option value="" disabled>Select an employee</option>
            {#each employees as emp}<option value={emp.id}>{emp.name}</option>{/each}
          </select>
        </div>
        <div class="form-row">
          <div class="field">
            <label for="a-date">Date *</label>
            <input id="a-date" type="date" bind:value={form.date} on:change={blockSunday}
              max={new Date().toISOString().split('T')[0]}/>
          </div>
          <div class="field">
            <label for="a-status">Status *</label>
            <select id="a-status" bind:value={form.status}>
              <option value="" disabled>Select status</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="leave">Leave</option>
              <option value="half_day">Half Day</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="field">
            <label for="a-ci">Check In</label>
            <input id="a-ci" type="time" bind:value={form.check_in}/>
          </div>
          <div class="field">
            <label for="a-co">Check Out</label>
            <input id="a-co" type="time" bind:value={form.check_out}/>
          </div>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" on:click={closeModal} disabled={formLoading}>Cancel</button>
        <button class="btn btn-primary" on:click={handleMark} disabled={formLoading}>
          {formLoading ? 'Saving…' : 'Mark Attendance'}
        </button>
      </div>
    </div>
  </div>
{/if}

<ConfirmModal
  show={showDelete}
  title="Delete Record"
  message="Delete attendance record for {deleteTarget?.employee_name} on {formatDate(deleteTarget?.date)}?"
  loading={deleteLoading}
  onConfirm={handleDeleteAttendance}
  onCancel={() => { showDelete = false; deleteTarget = null; }}
/>

<style>
  .search-field { min-width: 200px; }
  .saved-row { background: rgba(5,150,105,0.06) !important; }
  .saved-tick { color: var(--accent-green, #059669); font-weight: 700; font-size: 13px; margin-left: 4px; }

  .att-stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }

  @media (max-width: 700px) { .att-stat-grid { grid-template-columns: repeat(2, 1fr); } }

  .att-stat-card {
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    padding: 18px 16px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    box-shadow: var(--shadow-card);
    transition: transform 0.2s ease;
  }

  .att-stat-card:hover { transform: translateY(-2px); }

  .att-stat-icon {
    width: 36px; height: 36px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center; margin-bottom: 4px;
  }

  .att-stat-card.present .att-stat-icon { background: rgba(5,150,105,0.15); color: var(--accent-green); }
  .att-stat-card.absent  .att-stat-icon { background: rgba(220,38,38,0.12); color: var(--accent-red); }
  .att-stat-card.leave   .att-stat-icon { background: rgba(37,99,235,0.12); color: var(--accent-blue); }
  .att-stat-card.half    .att-stat-icon { background: rgba(217,119,6,0.12); color: var(--accent-yellow); }

  .att-stat-val { font-size: 26px; font-weight: 800; color: var(--text-primary); letter-spacing: -0.02em; line-height: 1; }
  .att-stat-label { font-size: 11.5px; color: var(--text-secondary); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }

  .state-empty { flex-direction: column; align-items: center; text-align: center; padding: 52px 24px; }
  .empty-icon { font-size: 44px; opacity: 0.5; margin-bottom: 8px; }
  .empty-body { display: flex; flex-direction: column; align-items: center; }
  .empty-title { margin: 0; font-weight: 700; font-size: 15px; color: var(--text-primary); }
  .empty-sub { margin: 5px 0 0; font-size: 13px; color: var(--text-muted); }
</style>