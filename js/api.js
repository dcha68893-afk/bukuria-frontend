/**
 * Gwikonge PEFA Church — Frontend API client.
 * Centralizes all calls to the backend REST API + auth/token handling.
 * Set API_BASE_URL below to your deployed backend URL before going live.
 */
const API_BASE_URL = (window.PEFA_API_BASE_URL) || 'http://localhost:5000/api';

const Auth = {
  TOKEN_KEY: 'pefa_token',
  USER_KEY: 'pefa_user',

  getToken() { return localStorage.getItem(this.TOKEN_KEY); },
  getUser() {
    const raw = localStorage.getItem(this.USER_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  setSession(token, user) {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  },
  clearSession() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  },
  isLoggedIn() { return !!this.getToken(); },
  hasRole(...roles) {
    const u = this.getUser();
    return u && roles.includes(u.role);
  },
};

async function apiRequest(path, { method = 'GET', body, auth = false, isForm = false } = {}) {
  const headers = {};
  if (!isForm) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = Auth.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  });

  let data;
  try { data = await res.json(); } catch (e) { data = {}; }

  if (!res.ok) {
    const message = data.message || (data.errors && data.errors[0] && data.errors[0].msg) || 'Something went wrong. Please try again.';
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

// Thin wrapper namespaces mirroring backend modules
const Api = {
  auth: {
    register: (payload) => apiRequest('/auth/register', { method: 'POST', body: payload }),
    login: (payload) => apiRequest('/auth/login', { method: 'POST', body: payload }),
    me: () => apiRequest('/auth/me', { auth: true }),
    updateMe: (payload) => apiRequest('/auth/me', { method: 'PUT', body: payload, auth: true }),
    changePassword: (payload) => apiRequest('/auth/change-password', { method: 'PUT', body: payload, auth: true }),
  },
  ministries: {
    list: (qs = '') => apiRequest(`/ministries${qs}`),
    get: (id) => apiRequest(`/ministries/${id}`),
    create: (p) => apiRequest('/ministries', { method: 'POST', body: p, auth: true }),
    update: (id, p) => apiRequest(`/ministries/${id}`, { method: 'PUT', body: p, auth: true }),
    remove: (id) => apiRequest(`/ministries/${id}`, { method: 'DELETE', auth: true }),
  },
  sermons: {
    list: (qs = '') => apiRequest(`/sermons${qs}`),
    get: (id) => apiRequest(`/sermons/${id}`),
    create: (p) => apiRequest('/sermons', { method: 'POST', body: p, auth: true }),
    update: (id, p) => apiRequest(`/sermons/${id}`, { method: 'PUT', body: p, auth: true }),
    remove: (id) => apiRequest(`/sermons/${id}`, { method: 'DELETE', auth: true }),
    view: (id) => apiRequest(`/sermons/${id}/view`, { method: 'POST' }),
    download: (id) => apiRequest(`/sermons/${id}/download`, { method: 'POST' }),
  },
  events: {
    list: (qs = '') => apiRequest(`/events${qs}`),
    get: (id) => apiRequest(`/events/${id}`),
    create: (p) => apiRequest('/events', { method: 'POST', body: p, auth: true }),
    update: (id, p) => apiRequest(`/events/${id}`, { method: 'PUT', body: p, auth: true }),
    remove: (id) => apiRequest(`/events/${id}`, { method: 'DELETE', auth: true }),
    register: (id, p) => apiRequest(`/events/${id}/register`, { method: 'POST', body: p, auth: Auth.isLoggedIn() }),
    registrations: (id) => apiRequest(`/events/${id}/registrations`, { auth: true }),
  },
  announcements: {
    list: (qs = '') => apiRequest(`/announcements${qs}`),
    create: (p) => apiRequest('/announcements', { method: 'POST', body: p, auth: true }),
    update: (id, p) => apiRequest(`/announcements/${id}`, { method: 'PUT', body: p, auth: true }),
    remove: (id) => apiRequest(`/announcements/${id}`, { method: 'DELETE', auth: true }),
  },
  prayer: {
    submit: (p) => apiRequest('/prayer-requests', { method: 'POST', body: p, auth: Auth.isLoggedIn() }),
    wall: () => apiRequest('/prayer-requests/wall'),
    list: (qs = '') => apiRequest(`/prayer-requests${qs}`, { auth: true }),
    update: (id, p) => apiRequest(`/prayer-requests/${id}`, { method: 'PUT', body: p, auth: true }),
    remove: (id) => apiRequest(`/prayer-requests/${id}`, { method: 'DELETE', auth: true }),
  },
  donations: {
    create: (p) => apiRequest('/donations', { method: 'POST', body: p, auth: Auth.isLoggedIn() }),
    myHistory: () => apiRequest('/donations/my-history', { auth: true }),
    receipt: (id) => apiRequest(`/donations/${id}/receipt`, { auth: true }),
    list: (qs = '') => apiRequest(`/donations${qs}`, { auth: true }),
    confirm: (id, p) => apiRequest(`/donations/${id}/confirm`, { method: 'POST', body: p, auth: true }),
  },
  testimonials: {
    list: (qs = '') => apiRequest(`/testimonials${qs}`),
    create: (p) => apiRequest('/testimonials', { method: 'POST', body: p, auth: true }),
    update: (id, p) => apiRequest(`/testimonials/${id}`, { method: 'PUT', body: p, auth: true }),
    remove: (id) => apiRequest(`/testimonials/${id}`, { method: 'DELETE', auth: true }),
  },
  gallery: {
    list: (qs = '') => apiRequest(`/gallery${qs}`),
    create: (p) => apiRequest('/gallery', { method: 'POST', body: p, auth: true }),
    remove: (id) => apiRequest(`/gallery/${id}`, { method: 'DELETE', auth: true }),
  },
  blog: {
    list: (qs = '') => apiRequest(`/blog${qs}`),
    get: (id) => apiRequest(`/blog/${id}`),
    create: (p) => apiRequest('/blog', { method: 'POST', body: p, auth: true }),
    update: (id, p) => apiRequest(`/blog/${id}`, { method: 'PUT', body: p, auth: true }),
    remove: (id) => apiRequest(`/blog/${id}`, { method: 'DELETE', auth: true }),
  },
  livestreams: {
    list: (qs = '') => apiRequest(`/livestreams${qs}`),
    create: (p) => apiRequest('/livestreams', { method: 'POST', body: p, auth: true }),
    update: (id, p) => apiRequest(`/livestreams/${id}`, { method: 'PUT', body: p, auth: true }),
  },
  contact: {
    submit: (p) => apiRequest('/contact', { method: 'POST', body: p }),
    list: () => apiRequest('/contact', { auth: true }),
    markRead: (id) => apiRequest(`/contact/${id}/read`, { method: 'PUT', auth: true }),
    remove: (id) => apiRequest(`/contact/${id}`, { method: 'DELETE', auth: true }),
  },
  volunteers: {
    submit: (p) => apiRequest('/volunteers', { method: 'POST', body: p, auth: Auth.isLoggedIn() }),
    list: (qs = '') => apiRequest(`/volunteers${qs}`, { auth: true }),
    update: (id, p) => apiRequest(`/volunteers/${id}`, { method: 'PUT', body: p, auth: true }),
  },
  newsletter: {
    subscribe: (p) => apiRequest('/newsletter/subscribe', { method: 'POST', body: p }),
    unsubscribe: (p) => apiRequest('/newsletter/unsubscribe', { method: 'POST', body: p }),
    list: () => apiRequest('/newsletter', { auth: true }),
  },
  members: {
    list: (qs = '') => apiRequest(`/members${qs}`, { auth: true }),
    get: (id) => apiRequest(`/members/${id}`, { auth: true }),
    update: (id, p) => apiRequest(`/members/${id}`, { method: 'PUT', body: p, auth: true }),
    remove: (id) => apiRequest(`/members/${id}`, { method: 'DELETE', auth: true }),
    myDashboard: () => apiRequest('/members/me/dashboard', { auth: true }),
  },
  attendance: {
    checkIn: (p) => apiRequest('/attendance/check-in', { method: 'POST', body: p, auth: true }),
    record: (p) => apiRequest('/attendance', { method: 'POST', body: p, auth: true }),
    list: (qs = '') => apiRequest(`/attendance${qs}`, { auth: true }),
  },
  dashboard: {
    stats: () => apiRequest('/dashboard/stats', { auth: true }),
  },
  upload: {
    file: (formData) => apiRequest('/upload', { method: 'POST', body: formData, auth: true, isForm: true }),
    profile: (formData) => apiRequest('/upload/profile', { method: 'POST', body: formData, auth: true, isForm: true }),
  },
};

// ---- Small shared UI helpers ----
function showAlert(container, message, type = 'error') {
  if (!container) return;
  container.innerHTML = `<div class="alert alert-${type === 'error' ? 'error' : type}">${message}</div>`;
}
function clearAlert(container) { if (container) container.innerHTML = ''; }

function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' });
}
function fmtDateTime(d) {
  if (!d) return '';
  return new Date(d).toLocaleString('en-KE', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtMoney(n, currency = 'KES') {
  return `${currency} ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
}

// Render the shared site header's auth-aware links (Login / My Account / Logout)
function renderAuthNav(elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  if (Auth.isLoggedIn()) {
    const user = Auth.getUser();
    const isAdmin = ['admin', 'super_admin', 'pastor', 'leader'].includes(user.role);
    el.innerHTML = `
      <a href="dashboard.html">Hi, ${user.firstName}</a>
      ${isAdmin ? '<a href="admin/index.html">Admin</a>' : ''}
      <a href="#" id="logoutLink">Logout</a>
    `;
    document.getElementById('logoutLink').addEventListener('click', (e) => {
      e.preventDefault();
      Auth.clearSession();
      window.location.href = 'index.html';
    });
  } else {
    el.innerHTML = `<a href="login.html">Login</a> <a href="register.html" class="btn btn-primary btn-sm">Join Us</a>`;
  }
}
