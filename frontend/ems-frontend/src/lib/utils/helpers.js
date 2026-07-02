export function formatCurrency(amount) {
  if (amount == null || isNaN(Number(amount))) return '—';
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const s = typeof dateStr === 'string' ? dateStr : new Date(dateStr).toISOString();
  const [year, month, day] = s.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC',
  });
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleString('en-US', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Karachi',
  });
}

export function formatMonthYear(year, month) {
  if (!year || !month) return '—';
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-US', {
    month: 'long', year: 'numeric', timeZone: 'UTC',
  });
}

export function timeAgo(dateStr) {
  if (!dateStr) return 'Never';
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);
  if (days > 0)  return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0)  return `${mins}m ago`;
  return 'Just now';
}

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function monthName(num) {
  return MONTHS[(num - 1) % 12];
}

export function getYearOptions() {
  const current = new Date().getFullYear();
  const years = [];
  for (let y = current + 1; y >= 2020; y--) years.push(y);
  return years;
}

export function currentMonthYear() {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

export function statusBadgeClass(status) {
  const map = {
    present:  'badge-present',
    absent:   'badge-absent',
    leave:    'badge-leave',
    half_day: 'badge-half',
  };
  return map[status] || 'badge-default';
}

export function formatStatus(status) {
  if (!status) return '—';
  if (status === 'half_day') return 'Half Day';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function roleBadgeClass(role) {
  const map = { admin: 'role-admin', hr: 'role-hr', employee: 'role-employee' };
  return map[role] || 'role-employee';
}

export function getWorkingDays(year, month) {
  let sundays = 0;
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    if (new Date(year, month - 1, d).getDay() === 0) sundays++;
  }
  return daysInMonth - sundays;
}

export function computeDailyWage(salary, year, month) {
  if (!salary || !year || !month) return 0;
  const workingDays = getWorkingDays(year, month);
  return parseFloat(salary) / workingDays;
}

export function dailyWageDisplay(salary, year, month) {
  if (!salary) return '—';
  if (year && month) {
    return formatCurrency(computeDailyWage(salary, year, month));
  }
  return formatCurrency(parseFloat(salary) / 26);
}

export function calculateSalary({ basicSalary, present = 0, halfDays = 0, year, month }) {
  const workingDays   = getWorkingDays(year, month);
  const dailyWage     = parseFloat(basicSalary) / workingDays;
  const effectiveDays = parseFloat((present + halfDays * 0.5).toFixed(2));
  const netSalary     = parseFloat((effectiveDays * dailyWage).toFixed(2));
  const deductions    = parseFloat((basicSalary - netSalary).toFixed(2));

  return {
    workingDays,
    effectiveDays,
    deductions,
    netSalary,
  };
}

export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validateTime(t) {
  if (!t) return true;
  return /^\d{2}:\d{2}$/.test(t);
}

export function paginationRange(currentPage, totalPages, delta = 2) {
  const range = [];
  const left  = Math.max(1, currentPage - delta);
  const right = Math.min(totalPages, currentPage + delta);

  for (let i = left; i <= right; i++) range.push(i);

  if (range[0] > 2)        range.unshift(1, '…');
  else if (range[0] === 2) range.unshift(1);

  if (range[range.length - 1] < totalPages - 1)      range.push('…', totalPages);
  else if (range[range.length - 1] === totalPages - 1) range.push(totalPages);

  return range;
}