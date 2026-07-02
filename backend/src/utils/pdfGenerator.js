const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

export const generateSalarySlipHTML = ({ employee, salary, attendance, month, year }) => {
  const fmt = (n) => parseFloat(n || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 });

  let sundays = 0;
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    if (new Date(year, month - 1, d).getDay() === 0) sundays++;
  }
  const workingDays = daysInMonth - sundays;
  const effectiveDays = parseFloat((parseFloat(salary.total_present || 0) + parseFloat(salary.total_half_days || 0) * 0.5).toFixed(2));

  const statusColor = {
    present: '#16a34a', absent: '#dc2626', leave: '#d97706',
    half_day: '#7c3aed', not_marked: '#9ca3af',
  };

  const attRows = attendance.map((a) => {
    const raw = a.date instanceof Date ? a.date : new Date(a.date);
    const d = !isNaN(raw.getTime())
      ? `${raw.getUTCFullYear()}-${String(raw.getUTCMonth() + 1).padStart(2, '0')}-${String(raw.getUTCDate()).padStart(2, '0')}`
      : String(a.date).slice(0, 10);
    const color = statusColor[a.status] || '#374151';
    return `<tr>
      <td>${d}</td>
      <td style="color:${color};font-weight:600;text-transform:capitalize">${a.status.replace('_', ' ')}</td>
      <td>${a.check_in || '-'}</td>
      <td>${a.check_out || '-'}</td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Salary Slip — ${employee.name} — ${MONTH_NAMES[month]} ${year}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',Arial,sans-serif;background:#f3f4f6;color:#111827;padding:24px}
    .slip{max-width:780px;margin:0 auto;background:#fff;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,.1);overflow:hidden}
    .header{background:linear-gradient(135deg,#1e40af,#3b82f6);color:#fff;padding:28px 32px;display:flex;justify-content:space-between;align-items:flex-start}
    .company-name{font-size:22px;font-weight:700;letter-spacing:.5px}
    .company-sub{font-size:13px;opacity:.8;margin-top:4px}
    .slip-title{text-align:right}
    .slip-title h2{font-size:20px;font-weight:600}
    .slip-title p{font-size:13px;opacity:.85;margin-top:4px}
    .body{padding:28px 32px}
    .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 24px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:18px;margin-bottom:24px}
    .info-item label{font-size:11px;text-transform:uppercase;color:#6b7280;letter-spacing:.5px}
    .info-item p{font-size:14px;font-weight:600;margin-top:2px}
    h3{font-size:15px;font-weight:700;color:#1e40af;border-bottom:2px solid #dbeafe;padding-bottom:6px;margin-bottom:14px}
    .salary-table{width:100%;border-collapse:collapse;margin-bottom:24px;font-size:14px}
    .salary-table th,.salary-table td{padding:10px 14px;text-align:left}
    .salary-table thead th{background:#eff6ff;color:#1e40af;font-weight:600}
    .salary-table tbody tr:nth-child(even){background:#f9fafb}
    .salary-table .amount{text-align:right;font-weight:600}
    .salary-table .positive{color:#16a34a}
    .salary-table .negative{color:#dc2626}
    .net-row{background:#1e40af!important;color:#fff}
    .net-row td{font-size:15px;font-weight:700}
    .att-table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px}
    .att-table th{background:#eff6ff;color:#1e40af;padding:8px 12px;font-weight:600;text-align:left;white-space:nowrap}
    .att-table td{padding:7px 12px;border-bottom:1px solid #f3f4f6;white-space:nowrap}
    .att-table td:first-child,.att-table th:first-child{min-width:110px}
    .att-table tbody tr:hover{background:#f9fafb}
    .summary-badges{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px}
    .badge{padding:6px 16px;border-radius:99px;font-size:13px;font-weight:600}
    .badge-present{background:#dcfce7;color:#16a34a}
    .badge-absent{background:#fee2e2;color:#dc2626}
    .badge-leave{background:#fef3c7;color:#d97706}
    .badge-halfday{background:#ede9fe;color:#7c3aed}
    .footer{background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;font-size:12px;color:#6b7280;text-align:center}
    @media print{body{background:#fff;padding:0}.slip{box-shadow:none;border-radius:0}.no-print{display:none}}
  </style>
</head>
<body>
<div class="slip">
  <div class="header">
    <div>
      <div class="company-name">EMS — Employee Management</div>
      <div class="company-sub">Human Resources Department</div>
    </div>
    <div class="slip-title">
      <h2>Salary Slip</h2>
      <p>${MONTH_NAMES[month]} ${year}</p>
    </div>
  </div>

  <div class="body">
    <div class="info-grid">
      <div class="info-item"><label>Employee ID</label><p>EMP-${String(employee.id).padStart(4,'0')}</p></div>
      <div class="info-item"><label>Employee Name</label><p>${employee.name}</p></div>
      <div class="info-item"><label>Email</label><p>${employee.email}</p></div>
      <div class="info-item"><label>Department</label><p>${employee.department || '—'}</p></div>
      <div class="info-item"><label>Position</label><p>${employee.position || '—'}</p></div>
      <div class="info-item"><label>Pay Period</label><p>${MONTH_NAMES[month]} ${year}</p></div>
    </div>

    <h3>Salary Breakdown</h3>
    <table class="salary-table">
      <thead><tr><th>Description</th><th class="amount">Amount (PKR)</th></tr></thead>
      <tbody>
        <tr><td>Basic Salary <small style="color:#6b7280">(full month)</small></td><td class="amount positive">${fmt(salary.basic_salary)}</td></tr>
        <tr><td>Working Days in Month</td><td class="amount">${workingDays} days</td></tr>
        <tr><td>Days Worked <small style="color:#6b7280">(${salary.total_present} present + ${salary.total_half_days} half-day)</small></td><td class="amount">${effectiveDays} days</td></tr>
        <tr>
          <td>Deductions <small style="color:#6b7280">(${workingDays - effectiveDays} unpaid days)</small></td>
          <td class="amount negative">− ${fmt(salary.deductions)}</td>
        </tr>
        <tr class="net-row"><td>Net Salary</td><td class="amount">PKR ${fmt(salary.net_salary)}</td></tr>
      </tbody>
    </table>

    <h3>Attendance Summary</h3>
    <div class="summary-badges">
      <span class="badge badge-present">✓ Present: ${salary.total_present}</span>
      <span class="badge badge-absent">✗ Absent: ${salary.total_absent}</span>
      <span class="badge badge-leave">⏸ Leave: ${salary.total_leaves}</span>
      <span class="badge badge-halfday">½ Half-day: ${salary.total_half_days}</span>
    </div>

    ${attendance.length > 0 ? `
    <table class="att-table">
      <thead><tr><th>Date</th><th>Status</th><th>Check In</th><th>Check Out</th></tr></thead>
      <tbody>${attRows}</tbody>
    </table>` : '<p style="color:#6b7280;font-size:13px;margin-bottom:20px">No attendance records for this period.</p>'}

    <div class="no-print" style="text-align:center;margin-top:8px">
      <button onclick="window.print()" style="background:#1e40af;color:#fff;border:none;padding:10px 28px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer">
        🖨️ Print / Save as PDF
      </button>
    </div>
  </div>

  <div class="footer">
    This is a system-generated salary slip. Generated on ${new Date().toLocaleDateString('en-PK', { dateStyle: 'long' })}.
  </div>
</div>
</body>
</html>`;
};