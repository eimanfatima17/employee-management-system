<script>
  import { onMount } from 'svelte';
  import { authStore } from '$lib/stores/auth.store.js';
  import {
    getEmployees, createEmployee, updateEmployee,
    deleteEmployee, deactivateEmployee, activateEmployee,
  } from '$lib/api/employees.js';
  import {
    formatCurrency, formatDate, formatDateTime,
    timeAgo, validateEmail, dailyWageDisplay, currentMonthYear,
  } from '$lib/utils/helpers.js';
  import Pagination from '$lib/components/Pagination.svelte';
  import Toast from '$lib/components/Toast.svelte';
  import ConfirmModal from '$lib/components/ConfirmModal.svelte';

  const { month: currentMonth, year: currentYear } = currentMonthYear();

  $: isAdminOrHr = ['admin', 'hr'].includes($authStore.user?.role);
  $: isAdmin = $authStore.user?.role === 'admin';
  $: isEmployee = $authStore.user?.role === 'employee';

  let employees = [];
  let loading = true;
  let error = '';
  let meta = { total: 0, page: 1, limit: 5, totalPages: 1 };

  let searchQuery = '';
  let deptFilter = '';
  let searchTimer;

  function debouncedSearch() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => loadEmployees(1), 400);
  }

  let toastMsg = ''; let toastType = 'success'; let toastShow = false;
  function showToast(msg, type = 'success') { toastMsg = msg; toastType = type; toastShow = true; }

  async function loadEmployees(page = meta.page) {
    loading = true; error = '';
    try {
      const res = await getEmployees({ page, limit: meta.limit, search: searchQuery.trim(), department: deptFilter.trim() });
      employees = res.data || [];
      meta = res.meta || meta;
    } catch (err) {
      error = err.response?.data?.message || 'Failed to load employees.';
    } finally {
      loading = false;
    }
  }

  onMount(() => loadEmployees(1));

  let drawerEmp = null;
  function openDrawer(emp) { drawerEmp = emp; }
  function closeDrawer() { drawerEmp = null; }

  let showModal = false;
  let modalMode = 'create';
  let formLoading = false;
  let formError = '';
  let selectedEmp = null;

  function emptyForm() {
    return { name: '', email: '', password: '', position: '', department: '', salary: '', role: '' };
  }
  let form = emptyForm();

  function openCreate() {
    form = emptyForm(); formError = ''; modalMode = 'create'; selectedEmp = null; showModal = true;
  }

  function openEdit(emp) {
    selectedEmp = emp;
    form = {
      name: emp.name || '', email: emp.email || '', password: '',
      position: emp.position || '', department: emp.department || '',
      salary: emp.salary ?? '', role: emp.role || 'employee',
    };
    formError = ''; modalMode = 'edit'; showModal = true;
  }

  function closeModal() { showModal = false; }

  function validateForm() {
    if (!form.name.trim()) return 'Name is required.';
    if (!form.email.trim()) return 'Email is required.';
    if (!validateEmail(form.email)) return 'Please enter a valid email.';
    if (modalMode === 'create') {
      if (!form.password) return 'Password is required.';
      if (form.password.length < 8) return 'Password must be at least 8 characters.';
    } else if (form.password && form.password.length < 8) {
      return 'New password must be at least 8 characters.';
    }
    if (form.salary !== '' && (isNaN(form.salary) || Number(form.salary) < 0)) return 'Enter a valid salary.';
    return null;
  }

  async function handleSubmit() {
    const err = validateForm();
    if (err) { formError = err; return; }
    formLoading = true; formError = '';
    try {
      const salaryVal = form.salary !== '' ? Number(form.salary) : 25000;
      if (modalMode === 'create') {
        await createEmployee({ ...form, salary: salaryVal });
        showToast('Employee created successfully!');
      } else {
        const payload = { ...form, salary: salaryVal };
        if (!payload.password?.trim()) delete payload.password;
        delete payload.email;
        await updateEmployee(selectedEmp.id, payload);
        showToast('Employee updated successfully!');
      }
      closeModal();
      await loadEmployees();
    } catch (err) {
      formError = err.response?.data?.message || 'Failed to save employee.';
    } finally {
      formLoading = false;
    }
  }

  let showDelete = false;
  let deleteTarget = null;
  let deleteLoading = false;

  function confirmDelete(emp) { deleteTarget = emp; showDelete = true; }

  async function handleDelete() {
    if (!deleteTarget) return;
    deleteLoading = true;
    try {
      await deleteEmployee(deleteTarget.id);
      showToast(`${deleteTarget.name} deleted successfully.`);
      showDelete = false; deleteTarget = null;
      await loadEmployees();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete.', 'error');
    } finally {
      deleteLoading = false;
    }
  }

  let deactivateTarget = null;
  let showDeactivate = false;
  let deactivateLoading = false;

  function confirmDeactivate(emp) { deactivateTarget = emp; showDeactivate = true; }

  async function handleDeactivate() {
    if (!deactivateTarget) return;
    deactivateLoading = true;
    try {
      await deactivateEmployee(deactivateTarget.id);
      showToast(`${deactivateTarget.name} deactivated.`);
      showDeactivate = false; deactivateTarget = null;
      await loadEmployees();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to deactivate.', 'error');
    } finally {
      deactivateLoading = false;
    }
  }

  let activateTarget = null;
  let showActivate = false;
  let activateLoading = false;

  function confirmActivate(emp) { activateTarget = emp; showActivate = true; }

  async function handleActivate() {
    if (!activateTarget) return;
    activateLoading = true;
    try {
      await activateEmployee(activateTarget.id);
      showToast(`${activateTarget.name} activated successfully.`);
      showActivate = false; activateTarget = null;
      await loadEmployees();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to activate.', 'error');
    } finally {
      activateLoading = false;
    }
  }

  function handleKeydown(e) {
    if (e.key === 'Escape') {
      closeModal(); closeDrawer();
      showDelete = false; showDeactivate = false; showActivate = false;
    }
  }
</script>

<svelte:window on:keydown={handleKeydown}/>
<svelte:head><title>EMS — Employees</title></svelte:head>

<Toast message={toastMsg} type={toastType} bind:visible={toastShow}/>

<div class="page">

  <div class="page-header">
    <div>
      <h2 class="page-title">Employees</h2>
      <p class="page-subtitle">
        {#if isEmployee}Your employee profile{:else}{meta.total} member{meta.total !== 1 ? 's' : ''} registered{/if}
      </p>
    </div>
    {#if isAdminOrHr}
      <button class="btn btn-primary" on:click={openCreate}>+ Add Employee</button>
    {/if}
  </div>

  {#if error}
    <div class="alert alert-error" role="alert">{error}</div>
  {/if}

  {#if !isEmployee}
    <div class="filter-bar">
      <div class="field search-field">
        <input placeholder="Search name, email, position, or Employee ID…" bind:value={searchQuery} on:input={debouncedSearch}/>
      </div>
      <div class="field">
        <input placeholder="Filter by department" bind:value={deptFilter} on:input={debouncedSearch}/>
      </div>
      <button class="btn btn-secondary" on:click={() => loadEmployees(1)} disabled={loading}>
        {loading ? 'Loading…' : 'Search'}
      </button>
    </div>
  {/if}

  {#if loading}
    <div class="state-box"><p>Loading employees…</p></div>
  {:else if employees.length === 0}
    <div class="state-box">
      <p>{searchQuery || deptFilter ? 'No employees match your search.' : 'No employees yet. Click + Add Employee to start.'}</p>
    </div>
  {:else}
    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Emp ID</th>
            <th>Employee</th>
            <th>Department / Position</th>
            {#if !isEmployee}
              <th>Salary</th>
              <th>Daily Wage</th>
              <th>Role</th>
            {/if}
            <th>Status</th>
            {#if !isEmployee}
              <th>Last Login</th>
              <th>Joined</th>
            {/if}
            {#if isAdminOrHr}<th>Actions</th>{/if}
          </tr>
        </thead>
        <tbody>
          {#each employees as emp (emp.id)}
            <tr class:inactive-row={!emp.is_active}>
              <td class="muted">EMP-{String(emp.id).padStart(4,'0')}</td>
              <td>
                <button class="emp-cell-btn" on:click={() => openDrawer(emp)}>
                  <div class="emp-avatar" class:avatar-inactive={!emp.is_active}>
                    {(emp.name?.[0] || emp.email?.[0] || '?').toUpperCase()}
                  </div>
                  <div>
                    <div class="emp-name">{emp.name || '—'}</div>
                    <div class="emp-email">{emp.email}</div>
                  </div>
                </button>
              </td>
              <td>
                <div class="emp-name">{emp.department || '—'}</div>
                <div class="emp-email">{emp.position || '—'}</div>
              </td>
              {#if !isEmployee}
                <td>{formatCurrency(emp.salary)}</td>
                <td class="muted">{dailyWageDisplay(emp.salary, currentYear, currentMonth)}</td>
                <td><span class="role-badge role-{emp.role}">{emp.role}</span></td>
              {/if}
              <td>
                <span class="badge {emp.is_active ? 'badge-present' : 'badge-absent'}">
                  {emp.is_active ? 'Active' : 'Inactive'}
                </span>
              </td>
              {#if !isEmployee}
                <td class="muted">{timeAgo(emp.last_login)}</td>
                <td class="muted">{formatDate(emp.created_at)}</td>
              {/if}
              {#if isAdminOrHr}
                <td class="actions">
                  <button class="btn-sm" on:click={() => openEdit(emp)}>Edit</button>
                  {#if isAdmin && emp.is_active}
                    <button class="btn-sm btn-warn" on:click={() => confirmDeactivate(emp)}>Deactivate</button>
                  {/if}
                  {#if isAdmin && !emp.is_active}
                    <button class="btn-sm btn-success" on:click={() => confirmActivate(emp)}>Activate</button>
                  {/if}
                  {#if isAdmin}
                    <button class="btn-sm btn-danger" on:click={() => confirmDelete(emp)}>Delete</button>
                  {/if}
                </td>
              {/if}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    {#if !isEmployee}
      <Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={(p) => loadEmployees(p)}/>
    {/if}
  {/if}
</div>

{#if drawerEmp}
  <div class="modal-backdrop">
    <button class="modal-backdrop-btn" on:click={closeDrawer} tabindex="-1" aria-label="Close"/>
    <div class="modal modal-lg" role="dialog" aria-modal="true">
      <div class="modal-header">
        <h3>Employee Details</h3>
        <button class="modal-close" on:click={closeDrawer}>✕</button>
      </div>
      <div class="modal-body">
        <div class="detail-grid">
          <div class="detail-avatar">{(drawerEmp.name?.[0] || '?').toUpperCase()}</div>
          <div class="detail-info">
            <h4 class="detail-name">{drawerEmp.name}</h4>
            <p class="detail-sub">{drawerEmp.email}</p>
          </div>
        </div>
        <div class="detail-fields">
          <div class="detail-field"><span>Employee ID</span><span>EMP-{String(drawerEmp.id).padStart(4,'0')}</span></div>
          <div class="detail-field"><span>Role</span><span class="role-badge role-{drawerEmp.role}">{drawerEmp.role}</span></div>
          <div class="detail-field"><span>Status</span>
            <span class="badge {drawerEmp.is_active ? 'badge-present' : 'badge-absent'}">
              {drawerEmp.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div class="detail-field"><span>Department</span><span>{drawerEmp.department || '—'}</span></div>
          <div class="detail-field"><span>Position</span><span>{drawerEmp.position || '—'}</span></div>
          {#if !isEmployee}
            <div class="detail-field"><span>Basic Salary</span><span>{formatCurrency(drawerEmp.salary)}</span></div>
            <div class="detail-field"><span>Daily Wage</span><span>{dailyWageDisplay(drawerEmp.salary, currentYear, currentMonth)}</span></div>
          {/if}
          <div class="detail-field"><span>Joined</span><span>{formatDate(drawerEmp.created_at)}</span></div>
          <div class="detail-field"><span>Last Updated</span><span>{formatDate(drawerEmp.updated_at)}</span></div>
          {#if !isEmployee}
            <div class="detail-field"><span>Last Login</span><span>{formatDateTime(drawerEmp.last_login)}</span></div>
          {/if}
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" on:click={closeDrawer}>Close</button>
        {#if isAdminOrHr}
          <button class="btn btn-primary" on:click={() => { closeDrawer(); openEdit(drawerEmp); }}>Edit Employee</button>
        {/if}
      </div>
    </div>
  </div>
{/if}

{#if showModal}
  <div class="modal-backdrop">
    <button class="modal-backdrop-btn" on:click={closeModal} tabindex="-1" aria-label="Close"/>
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="emp-modal-title">
      <div class="modal-header">
        <h3 id="emp-modal-title">{modalMode === 'create' ? 'Add Employee' : `Edit Employee — EMP-${String(selectedEmp?.id||0).padStart(4,'0')}`}</h3>
        <button class="modal-close" on:click={closeModal}>✕</button>
      </div>
      {#if formError}
        <div class="alert alert-error" role="alert">{formError}</div>
      {/if}
      <div class="modal-body">
        <div class="form-row">
          <div class="field">
            <label for="m-name">Full Name *</label>
            <input id="m-name" placeholder=" " bind:value={form.name}/>
          </div>
          <div class="field">
            <label for="m-role">Select Role</label>
            <select id="m-role" bind:value={form.role} disabled={!isAdmin}>
              <option value="employee">Employee</option>
              <option value="hr">HR</option>
              {#if isAdmin}<option value="admin">Admin</option>{/if}
            </select>
          </div>
        </div>

        <div class="field">
          <label for="m-email">Email Address *</label>
          <input id="m-email" type="email" placeholder=" "autocomplete="off"
            bind:value={form.email} disabled={modalMode === 'edit'}/>
        </div>

        <div class="field">
          <label for="m-pass">Password {modalMode === 'edit' ? '(leave blank to keep)' : '*'}</label>
          <input id="m-pass" type="password" placeholder="Min 8 characters"
                        autocomplete="new-password" bind:value={form.password}/>
        </div>

        <div class="form-row">
          <div class="field">
            <label for="m-dept">Department</label>
            <input id="m-dept" placeholder=" " bind:value={form.department}/>
          </div>
          <div class="field">
            <label for="m-pos">Position</label>
            <input id="m-pos" placeholder=" " bind:value={form.position}/>
          </div>
        </div>

        <div class="field">
          <label for="m-sal">Base Salary (PKR)</label>
          <input id="m-sal" type="number" min="0" placeholder=" " bind:value={form.salary}/>
          {#if form.salary !== '' && Number(form.salary) > 0}
            <small class="field-hint">Daily wage: {dailyWageDisplay(Number(form.salary), currentYear, currentMonth)}</small>
          {/if}
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" on:click={closeModal} disabled={formLoading}>Cancel</button>
        <button class="btn btn-primary" on:click={handleSubmit} disabled={formLoading}>
          {formLoading ? 'Saving…' : 'Save Employee'}
        </button>
      </div>
    </div>
  </div>
{/if}

<ConfirmModal
  show={showDelete}
  title="Delete Employee"
  message="Permanently delete {deleteTarget?.name} (EMP-{String(deleteTarget?.id||0).padStart(4,'0')})? This will remove all their data. This action cannot be undone."
  loading={deleteLoading}
  onConfirm={handleDelete}
  onCancel={() => { showDelete = false; deleteTarget = null; }}
/>

<ConfirmModal
  show={showDeactivate}
  title="Deactivate Account"
  message="This will revoke login access for {deactivateTarget?.name}. Their records remain intact and can be reactivated."
  loading={deactivateLoading}
  danger={false}
  onConfirm={handleDeactivate}
  onCancel={() => { showDeactivate = false; deactivateTarget = null; }}
/>

<ConfirmModal
  show={showActivate}
  title="Activate Account"
  message="This will restore login access for {activateTarget?.name}."
  loading={activateLoading}
  danger={false}
  onConfirm={handleActivate}
  onCancel={() => { showActivate = false; activateTarget = null; }}
/>

<style>
  .btn-success {
    background: rgba(5,150,105,0.15); color: var(--accent-green);
    border: 1px solid rgba(5,150,105,0.25); font-size: 11.5px;
    padding: 5px 10px; border-radius: 8px; cursor: pointer;
    font-weight: 600; transition: all 0.15s ease; white-space: nowrap;
  }
  .btn-success:hover { background: rgba(5,150,105,0.25); }
</style>
