import api from './axios.js';

export async function generateSalary({ month, year, force = false }) {
  const res = await api.post('/salary/generate', { month, year, force });
  return res.data;
}

export async function getSalaries(params = {}) {
  const res = await api.get('/salary', { params });
  return res.data;
}

export async function getSalaryReport(id, { month, year }) {
  const res = await api.get(`/salary/report/${id}`, { params: { month, year } });
  return res.data;
}

export async function fetchSalarySlipHTML(id, { month, year }) {
  const res = await api.get(`/salary/pdf/${id}`, {
    params: { month, year },
    responseType: 'text',
  });
  return res.data;
}
