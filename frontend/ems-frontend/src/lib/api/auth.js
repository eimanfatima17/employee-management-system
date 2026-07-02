import api from './axios.js';

export async function login(email, password) {
  const res = await api.post('/auth/login', { email, password });
  return res.data;
}

export async function logout(refreshToken) {
  const res = await api.post('/auth/logout', { token: refreshToken });
  return res.data;
}
