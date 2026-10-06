import axios from 'axios';

const apiClient = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || '/api' });
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('hustlehub_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
apiClient.interceptors.response.use((response) => response, (error) => {
  if (error.response?.status === 401 && !['/auth/login', '/auth/register'].includes(error.config?.url)) {
    window.dispatchEvent(new Event('hustlehub:unauthorized'));
  }
  return Promise.reject(error);
});
export function getErrorMessage(error) {
  const data = error.response?.data;
  if (Array.isArray(data?.errors) && data.errors.length) return [...new Set(data.errors.map((e) => e.message))].join(' ');
  if (data?.message) return data.message;
  if (error.request) return 'Could not reach the server. Please try again.';
  return 'Something went wrong. Please try again.';
}
export default apiClient;
