import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  withCredentials: true, // send session cookie on every request
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url || '';
    // Don't auto-redirect for auth endpoints (login/forgot pages handle their own errors)
    const isAuthEndpoint = url.includes('/admin/auth/login')
      || url.includes('/admin/auth/verify-login-otp')
      || url.includes('/admin/auth/forgot-password')
      || url.includes('/admin/auth/verify-reset-otp')
      || url.includes('/admin/auth/reset-password')
      || url.includes('/admin/auth/me');

    if (err.response?.status === 401 && !isAuthEndpoint) {
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;