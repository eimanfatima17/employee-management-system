import api from './axios.js';

export async function getEmployees({ page = 1, limit = 20, search = '', department = '' } = {}) {
  const params = { page, limit };
  if (search) params.search = search;
  if (department) params.department = department;
  const res = await api.get('/employees', { params });
  return res.data;
}

export async function getEmployeeById(id) {
  const res = await api.get(`/employees/${id}`);
  return res.data;
}

export async function createEmployee(data) {
  const res = await api.post('/employees', data);
  return res.data;
}

export async function updateEmployee(id, data) {
  const res = await api.put(`/employees/${id}`, data);
  return res.data;
}

export async function deleteEmployee(id) {
  const res = await api.delete(`/employees/${id}`);
  return res.data;
}

export async function deactivateEmployee(id) {
  const res = await api.patch(`/employees/${id}/deactivate`);
  return res.data;
}

export async function activateEmployee(id) {
  const res = await api.patch(`/employees/${id}/activate`);
  return res.data;
}
