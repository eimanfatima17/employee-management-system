import api from './axios.js';

export async function getDashboardStats() {
  const res = await api.get('/dashboard/stats');
  return res.data;
}

export async function getAttendanceTrends(months = 6) {
  const res = await api.get('/dashboard/attendance-trends', { params: { months } });
  return res.data;
}

export async function getMonthlyPayroll(months = 6) {
  const res = await api.get('/dashboard/monthly-payroll', { params: { months } });
  return res.data;
}

export async function getDepartmentStats() {
  const res = await api.get('/dashboard/department-stats');
  return res.data;
}
