<script>
  import { onMount, onDestroy } from 'svelte';
  import { authStore } from '$lib/stores/auth.store.js';
  import { getSalaries, generateSalary, getSalaryReport, fetchSalarySlipHTML } from '$lib/api/salary.js';
  import { getEmployees } from '$lib/api/employees.js';
  import { formatCurrency, formatDate, formatDateTime, MONTHS, currentMonthYear, monthName } from '$lib/utils/helpers.js';
  import Pagination from '$lib/components/Pagination.svelte';
  import Toast from '$lib/components/Toast.svelte';

  $: isAdminOrHr = ['admin', 'hr'].includes($authStore.user?.role);
  $: isEmployee = $authStore.user?.role === 'employee';

  let toastMsg = ''; let toastType = 'success'; let toastShow = false;
  function showToast(msg, type = 'success') { toastMsg = msg; toastType = type; toastShow = true; }

  let records = [];
  let employees = [];
  let loading = true;
  let generating = false;
  let hasLoaded = false;
  let meta = { total: 0, page: 1, limit: 5, totalPages: 1 };

  let { month, year } = currentMonthYear();
  let filterEmployee = '';

  let showGenModal = false;
  let genMonth = month;
  let genYear = year;
  let genForceConfirm = false;
  let genWarning = null;

  let showDetail = false;
  let detailData = null;
  let detailLoading = false;

  let showSlipModal = false;
  let slipHTML = '';
  let slipLoading = false;

  $: totalNet = records.reduce((s, r) => s + (Number(r.net_salary) || 0), 0);
  $: totalDeduct = records.reduce((s, r) => s + (Number(r.deductions) || 0), 0);

  async function loadSalaries(page = 1) {
    if (year < 2020 || year > 2099) { showToast('Invalid year.', 'error'); return; }
    loading = true; records = [];
    try {
      const params = { month, year, limit: meta.limit, page };
      if (filterEmployee) params.employee_id = filterEmployee;
      const [salRes, empRes] = await Promise.all([
        getSalaries(params),
        isAdminOrHr ? getEmployees({ limit: 500 }) : Promise.resolve({ data: [] }),
      ]);
      records = salRes.data || [];
      meta = salRes.meta || meta;
      employees = empRes.data || [];
      hasLoaded = true;
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load salaries.', 'error');
    } finally {
      loading = false;
    }
  }

  onMount(() => loadSalaries(1));

  function openGenModal() { genMonth = month; genYear = year; genWarning = null; genForceConfirm = false; showGenModal = true; }
  function closeGenModal() { showGenModal = false; genWarning = null; genForceConfirm = false; }

  async function handleGenerate(force = false) {
    if (genYear < 2020 || genYear > 2099) { showToast('Invalid year.', 'error'); return; }
    generating = true;
    const tMonth = genMonth; const tYear = genYear;
    try {
      const res = await generateSalary({ month: tMonth, year: tYear, force });
      closeGenModal();
      month = tMonth; year = tYear;
      await loadSalaries(1);
      const count = Array.isArray(res.data) ? res.data.length : (res.total_employees ?? 0);
      showToast(`Salary generated for ${monthName(tMonth)} ${tYear} — ${count} employee(s).`);
    } catch (err) {
      const data = err.response?.data;
      if (data?.requires_force) {
        genWarning = data.message;
        genForceConfirm = true;
      } else {
        showToast(data?.message || 'Generation failed.', 'error');
      }
    } finally {
      generating = false;
    }
  }

  async function openDetail(rec) {
    showDetail = true; detailLoading = true; detailData = null;
    try {
      const res = await getSalaryReport(rec.employee_id, { month: rec.salary_month, year: rec.salary_year });
      detailData = res.data;
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load report.', 'error');
      showDetail = false;
    } finally {
      detailLoading = false;
    }
  }

  async function openSlip(rec) {
    slipLoading = true; slipHTML = ''; showSlipModal = true;
    try {
      const html = await fetchSalarySlipHTML(rec.employee_id, { month: rec.salary_month, year: rec.salary_year });
      slipHTML = html;
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load salary slip.', 'error');
      showSlipModal = false;
    } finally {
      slipLoading = false;
    }
  }

  function printSlip() {
    const win = window.open('', '_blank');
    win.document.write(slipHTML);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  }

  function downloadSlip(rec) {
    const blob = new Blob([slipHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `salary-slip-EMP${String(rec?.employee_id || '').padStart(4,'0')}-${rec?.salary_year}-${String(rec?.salary_month||'').padStart(2,'0')}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  let slipRec = null;

  function closeDetail() { showDetail = false; detailData = null; }
  function closeSlip() { showSlipModal = false; slipHTML = ''; slipRec = null; }

  function handleKeydown(e) {
    if (e.key === 'Escape') { closeGenModal(); closeDetail(); closeSlip(); }
  }
</script>

<svelte:window on:keydown={handleKeydown}/>
<svelte:head><title>EMS — Salary</title></svelte:head>

<Toast message={toastMsg} type={toastType} bind:visible={toastShow}/>

<div class="page">

  <div class="page-header">
    <div>
      <h2 class="page-title">Salary Report</h2>
      <p class="page-subtitle">{MONTHS[month-1]} {year}</p>
    </div>
    {#if isAdminOrHr}
      <button class="btn btn-primary" on:click={openGenModal} disabled={generating}>
        {generating ? 'Generating…' : 'Generate Salary'}
      </button>
    {/if}
  </div>

  <div class="filter-bar">
    <div class="field">
      <label for="f-month">Month</label>
      <select id="f-month" bind:value={month}>
        {#each MONTHS as m, i}<option value={i+1}>{m}</option>{/each}
      </select>
    </div>
    <div class="field">
      <label for="f-year">Year</label>
      <input id="f-year" type="number" bind:value={year} min="2020" max="2099"/>
    </div>
    {#if isAdminOrHr}
      <div class="field">
        <label for="f-emp">Employee</label>
        <select id="f-emp" bind:value={filterEmployee}>
          <option value="">All Employees</option>
          {#each employees as emp}<option value={emp.id}>EMP-{String(emp.id).padStart(4,'0')} — {emp.name}</option>{/each}
        </select>
      </div>
    {/if}
    <button class="btn btn-secondary" on:click={() => loadSalaries(1)} disabled={loading}>
      {loading ? 'Loading…' : 'Apply Filter'}
    </button>
  </div>

  {#if loading}
    <div class="state-box"><p>Loading salary records…</p></div>
  {:else if !hasLoaded}
    <div class="state-box state-sal-empty">
      <div class="empty-icon">💰</div>
      <div class="empty-body">
        <p class="empty-title">Select a period</p>
        <p class="empty-sub">Choose a month and year above, then click Apply Filter.</p>
      </div>
    </div>
  {:else if records.length === 0}
    <div class="state-box state-sal-empty">
      <div class="empty-icon">📊</div>
      <div class="empty-body">
        <p class="empty-title">No salary records for {MONTHS[month-1]} {year}</p>
        <p class="empty-sub">Generate salaries to calculate and store monthly payroll data.</p>
        {#if isAdminOrHr}
          <button class="btn btn-primary" style="margin-top:14px" on:click={openGenModal}>
            Generate Salary for {MONTHS[month-1]} {year}
          </button>
        {/if}
      </div>
    </div>
  {:else}
    <div class="sal-summary-grid">
      <div class="sal-card">
        <div class="sal-card-label">Total Net Payroll</div>
        <div class="sal-card-val">{formatCurrency(totalNet)}</div>
      </div>
      <div class="sal-card">
        <div class="sal-card-label">Total Deductions</div>
        <div class="sal-card-val deduct">−{formatCurrency(totalDeduct)}</div>
      </div>
      <div class="sal-card">
        <div class="sal-card-label">Employees Paid</div>
        <div class="sal-card-val">{records.length}</div>
      </div>
    </div>

    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Emp ID</th>
            <th>Employee</th>
            <th>Basic Salary</th>
            <th>Present</th>
            <th>Absent</th>
            <th>Leave</th>
            <th>Half Days</th>
            <th>Deductions</th>
            <th>Net Salary</th>
            <th>Generated</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each records as rec (rec.id ?? rec.employee_name)}
            <tr>
              <td class="muted">EMP-{String(rec.emp_id || rec.employee_id).padStart(4,'0')}</td>
              <td>
                <div class="emp-name">{rec.employee_name || '—'}</div>
                <div class="emp-email">{rec.department || ''}</div>
              </td>
              <td>{formatCurrency(rec.basic_salary)}</td>
              <td>{rec.total_present ?? '—'}</td>
              <td>{rec.total_absent ?? '—'}</td>
              <td>{rec.total_leaves ?? '—'}</td>
              <td>{rec.total_half_days ?? '—'}</td>
              <td class="deduct-cell">{(rec.deductions ?? 0) > 0 ? '−' : ''}{formatCurrency(rec.deductions ?? 0)}</td>
              <td class="net-salary">{formatCurrency(rec.net_salary ?? 0)}</td>
              <td class="muted">{formatDate(rec.created_at)}</td>
              <td class="actions">
                <button class="btn-sm" on:click={() => openDetail(rec)}>Details</button>
                <button class="btn-sm btn-secondary" on:click={() => { slipRec = rec; openSlip(rec); }}>Slip</button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={(p) => loadSalaries(p)}/>
  {/if}
</div>

{#if showGenModal}
  <div class="modal-backdrop">
    <button class="modal-backdrop-btn" on:click={closeGenModal} tabindex="-1" aria-label="Close"/>
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="gen-modal-title">
      <div class="modal-header">
        <h3 id="gen-modal-title">Generate Salary</h3>
        <button class="modal-close" on:click={closeGenModal}>✕</button>
      </div>
      <p class="modal-desc">
        Calculates salaries for all active employees. Existing records will be <strong>overwritten</strong>.
        Salary requires attendance to be marked first.
      </p>
      {#if genWarning}
        <div class="alert alert-error" role="alert" style="margin-bottom:16px">
          ⚠️ {genWarning}
        </div>
      {/if}
      <div class="modal-fields">
        <div class="field">
          <label for="gen-month">Month</label>
          <select id="gen-month" bind:value={genMonth} disabled={genForceConfirm}>
            {#each MONTHS as m, i}<option value={i+1}>{m}</option>{/each}
          </select>
        </div>
        <div class="field">
          <label for="gen-year">Year</label>
          <input id="gen-year" type="number" bind:value={genYear} min="2020" max="2099" disabled={genForceConfirm}/>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" on:click={closeGenModal} disabled={generating}>Cancel</button>
        {#if genForceConfirm}
          <button class="btn btn-danger" on:click={() => handleGenerate(true)} disabled={generating}>
            {generating ? 'Generating…' : 'Force Generate Anyway'}
          </button>
        {:else}
          <button class="btn btn-primary" on:click={() => handleGenerate(false)} disabled={generating}>
            {generating ? 'Generating…' : `Generate for ${MONTHS[genMonth-1]} ${genYear}`}
          </button>
        {/if}
      </div>
    </div>
  </div>
{/if}

{#if showDetail}
  <div class="modal-backdrop">
    <button class="modal-backdrop-btn" on:click={closeDetail} tabindex="-1" aria-label="Close"/>
    <div class="modal modal-lg" role="dialog" aria-modal="true">
      <div class="modal-header">
        <h3>Salary Details</h3>
        <button class="modal-close" on:click={closeDetail}>✕</button>
      </div>
      {#if detailLoading}
        <div class="modal-body"><p>Loading…</p></div>
      {:else if detailData}
        <div class="modal-body">
          <div class="slip-header">
            <div>
              <div class="slip-emp">{detailData.employee?.name}</div>
              <div class="slip-sub">EMP-{String(detailData.employee?.id).padStart(4,'0')} · {detailData.employee?.email} · {detailData.employee?.department || '—'}</div>
            </div>
            <div class="slip-period">{monthName(detailData.salary?.salary_month)} {detailData.salary?.salary_year}</div>
          </div>
          {#if detailData.salary}
            <div class="slip-grid">
              <div class="slip-row"><span>Basic Salary</span><span>{formatCurrency(detailData.salary.basic_salary)}</span></div>
              <div class="slip-row"><span>Days Present</span><span>{detailData.salary.total_present}</span></div>
              <div class="slip-row"><span>Days Absent</span><span>{detailData.salary.total_absent}</span></div>
              <div class="slip-row"><span>Leave Days</span><span>{detailData.salary.total_leaves}</span></div>
              <div class="slip-row"><span>Half Days</span><span>{detailData.salary.total_half_days}</span></div>
              <div class="slip-row deduct"><span>Deductions</span><span>−{formatCurrency(detailData.salary.deductions)}</span></div>
              <div class="slip-row net"><span>Net Salary</span><span>{formatCurrency(detailData.salary.net_salary)}</span></div>
            </div>
            <p class="slip-meta">Generated: {formatDateTime(detailData.salary.created_at)} · Updated: {formatDateTime(detailData.salary.updated_at)}</p>
          {:else}
            <p class="muted">Salary not generated for this period yet.</p>
          {/if}
        </div>
      {/if}
      <div class="modal-actions">
        <button class="btn btn-secondary" on:click={closeDetail}>Close</button>
        {#if detailData?.salary}
          <button class="btn btn-primary" on:click={() => { closeDetail(); slipRec = { employee_id: detailData.employee.id, salary_month: detailData.salary.salary_month, salary_year: detailData.salary.salary_year }; openSlip(slipRec); }}>
            View Salary Slip
          </button>
        {/if}
      </div>
    </div>
  </div>
{/if}

{#if showSlipModal}
  <div class="modal-backdrop">
    <button class="modal-backdrop-btn" on:click={closeSlip} tabindex="-1" aria-label="Close"/>
    <div class="modal modal-xl" role="dialog" aria-modal="true">
      <div class="modal-header">
        <h3>Salary Slip</h3>
        <div style="display:flex;gap:8px;align-items:center">
          {#if slipHTML}
            <button class="btn btn-secondary" on:click={printSlip}>🖨️ Print</button>
            <button class="btn btn-primary" on:click={() => downloadSlip(slipRec)}>⬇ Download</button>
          {/if}
          <button class="modal-close" on:click={closeSlip}>✕</button>
        </div>
      </div>
      {#if slipLoading}
        <div class="modal-body" style="text-align:center;padding:40px"><p>Loading salary slip…</p></div>
      {:else if slipHTML}
        <div class="slip-iframe-wrap">
          <iframe title="Salary Slip" srcdoc={slipHTML} style="width:100%;height:600px;border:none;border-radius:8px"></iframe>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .state-sal-empty { flex-direction: column; align-items: center; text-align: center; padding: 52px 24px; }
  .empty-icon { font-size: 44px; opacity: 0.5; margin-bottom: 8px; }
  .empty-body { display: flex; flex-direction: column; align-items: center; }
  .empty-title { margin: 0; font-weight: 700; font-size: 15px; color: var(--text-primary); }
  .empty-sub { margin: 5px 0 0; font-size: 13px; color: var(--text-muted); }
  .slip-iframe-wrap { padding: 0 24px 24px; }
  .modal-xl { max-width: 860px; width: 95vw; }
  .btn-danger {
    background: rgba(220,38,38,0.12);
    color: #dc2626;
    border: 1px solid rgba(220,38,38,0.25);
    padding: 9px 18px;
    border-radius: 10px;
    font-weight: 600;
    font-size: 13.5px;
    cursor: pointer;
    transition: all 0.15s;
  }
  .btn-danger:hover { background: rgba(220,38,38,0.22); }
</style>
