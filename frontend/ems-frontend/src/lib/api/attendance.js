import api from './axios.js';

export async function markAttendance(data) {
  const res = await api.post('/attendance', data);
  return res.data;
}

export async function bulkMarkAttendance({ date, entries }) {
  const res = await api.post('/attendance/bulk', { date, entries });
  return res.data;
}

export async function getAttendance(params = {}) {
  const res = await api.get('/attendance', { params });
  return res.data;
}

export async function getAttendanceCalendar({ employee_id, month, year }) {
  const res = await api.get('/attendance/calendar', { params: { employee_id, month, year } });
  return res.data;
}

export async function deleteAttendance(id) {
  const res = await api.delete(`/attendance/${id}`);
  return res.data;
}
