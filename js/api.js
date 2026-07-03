/**
 * Gwikonge PEFA Church — Frontend API client.
 *
 * API_BASE_URL resolution order:
 *   1. window.PEFA_API_BASE_URL, if some page sets it before this script loads.
 *   2. Production backend (https://bukukia-backend.onrender.com/api) — the default,
 *      so the deployed site always talks to the deployed backend.
 *   3. Falls back to http://localhost:5000/api ONLY when this file is itself being
 *      served from localhost/127.0.0.1 (i.e. a developer running the frontend locally
 *      with `npx serve .` / `python -m http.server`), so local development still works
 *      without any manual edits.
 */
const PEFA_PRODUCTION_API_URL = 'https://bukukia-backend.onrender.com/api';
const PEFA_LOCAL_API_URL = 'http://localhost:5000/api';
const API_BASE_URL = window.PEFA_API_BASE_URL || (
  ['localhost', '127.0.0.1'].includes(window.location.hostname)
    ? PEFA_LOCAL_API_URL
    : PEFA_PRODUCTION_API_URL
);
// Origin only (no /api suffix) — used for building links to uploaded files, e.g. library.html.
const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

// ---- Auth ----
const Auth = {
  TOKEN_KEY: 'pefa_token',
  USER_KEY: 'pefa_user',
  getToken() { return localStorage.getItem(this.TOKEN_KEY); },
  getUser() { try { return JSON.parse(localStorage.getItem(this.USER_KEY)); } catch { return null; } },
  setSession(token, user) {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  },
  clearSession() { localStorage.removeItem(this.TOKEN_KEY); localStorage.removeItem(this.USER_KEY); },
  isLoggedIn() { return !!this.getToken(); },
  hasRole(...roles) { const u = this.getUser(); return u && roles.includes(u.role); },
  isAtLeast(minRole) {
    const rank = { member: 0, leader: 1, pastor: 2, admin: 3, super_admin: 4 };
    const u = this.getUser();
    return u && (rank[u.role] ?? -1) >= (rank[minRole] ?? 99);
  },
  isStaff() { return this.isAtLeast('leader'); },
  isAdmin() { return this.isAtLeast('admin'); },
};

async function apiRequest(path, { method = 'GET', body, auth = false, isForm = false } = {}) {
  const headers = {};
  if (!isForm) headers['Content-Type'] = 'application/json';
  const token = Auth.getToken();
  if (auth && token) headers['Authorization'] = `Bearer ${token}`;
  // Always try to send token if we have one (for staff visibility on lists)
  if (!auth && token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  });

  let data;
  try { data = await res.json(); } catch { data = {}; }

  if (!res.ok) {
    const message = data.message
      || (data.errors && data.errors[0] && data.errors[0].message)
      || 'Something went wrong. Please try again.';
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

const Api = {
  auth: {
    register: (p) => apiRequest('/auth/register', { method: 'POST', body: p }),
    login: (p) => apiRequest('/auth/login', { method: 'POST', body: p }),
    me: () => apiRequest('/auth/me', { auth: true }),
    updateMe: (p) => apiRequest('/auth/me', { method: 'PUT', body: p, auth: true }),
    changePassword: (p) => apiRequest('/auth/change-password', { method: 'PUT', body: p, auth: true }),
  },
  ministries: {
    list: (qs='') => apiRequest(`/ministries${qs}`),
    get: (id) => apiRequest(`/ministries/${id}`),
    create: (p) => apiRequest('/ministries', { method: 'POST', body: p, auth: true }),
    update: (id,p) => apiRequest(`/ministries/${id}`, { method: 'PUT', body: p, auth: true }),
    remove: (id) => apiRequest(`/ministries/${id}`, { method: 'DELETE', auth: true }),
  },
  sermons: {
    list: (qs='') => apiRequest(`/sermons${qs}`),
    get: (id) => apiRequest(`/sermons/${id}`),
    create: (p) => apiRequest('/sermons', { method: 'POST', body: p, auth: true }),
    update: (id,p) => apiRequest(`/sermons/${id}`, { method: 'PUT', body: p, auth: true }),
    remove: (id) => apiRequest(`/sermons/${id}`, { method: 'DELETE', auth: true }),
    view: (id) => apiRequest(`/sermons/${id}/view`, { method: 'POST' }),
    download: (id) => apiRequest(`/sermons/${id}/download`, { method: 'POST' }),
  },
  events: {
    list: (qs='') => apiRequest(`/events${qs}`),
    get: (id) => apiRequest(`/events/${id}`),
    create: (p) => apiRequest('/events', { method: 'POST', body: p, auth: true }),
    update: (id,p) => apiRequest(`/events/${id}`, { method: 'PUT', body: p, auth: true }),
    remove: (id) => apiRequest(`/events/${id}`, { method: 'DELETE', auth: true }),
    register: (id,p) => apiRequest(`/events/${id}/register`, { method: 'POST', body: p }),
    registrations: (id) => apiRequest(`/events/${id}/registrations`, { auth: true }),
  },
  announcements: {
    list: (qs='') => apiRequest(`/announcements${qs}`),
    create: (p) => apiRequest('/announcements', { method: 'POST', body: p, auth: true }),
    update: (id,p) => apiRequest(`/announcements/${id}`, { method: 'PUT', body: p, auth: true }),
    remove: (id) => apiRequest(`/announcements/${id}`, { method: 'DELETE', auth: true }),
  },
  prayer: {
    submit: (p) => apiRequest('/prayer-requests', { method: 'POST', body: p }),
    wall: () => apiRequest('/prayer-requests/wall'),
    list: (qs='') => apiRequest(`/prayer-requests${qs}`, { auth: true }),
    update: (id,p) => apiRequest(`/prayer-requests/${id}`, { method: 'PUT', body: p, auth: true }),
    remove: (id) => apiRequest(`/prayer-requests/${id}`, { method: 'DELETE', auth: true }),
  },
  donations: {
    create: (p) => apiRequest('/donations', { method: 'POST', body: p }),
    mpesaStatus: (id) => apiRequest(`/donations/${id}/mpesa-status`),
    myHistory: () => apiRequest('/donations/my-history', { auth: true }),
    receipt: (id) => apiRequest(`/donations/${id}/receipt`, { auth: true }),
    list: (qs='') => apiRequest(`/donations${qs}`, { auth: true }),
    confirm: (id,p) => apiRequest(`/donations/${id}/confirm`, { method: 'POST', body: p, auth: true }),
  },
  testimonials: {
    list: (qs='') => apiRequest(`/testimonials${qs}`),
    create: (p) => apiRequest('/testimonials', { method: 'POST', body: p }),
    update: (id,p) => apiRequest(`/testimonials/${id}`, { method: 'PUT', body: p, auth: true }),
    remove: (id) => apiRequest(`/testimonials/${id}`, { method: 'DELETE', auth: true }),
  },
  gallery: {
    list: (qs='') => apiRequest(`/gallery${qs}`),
    create: (p) => apiRequest('/gallery', { method: 'POST', body: p, auth: true }),
    remove: (id) => apiRequest(`/gallery/${id}`, { method: 'DELETE', auth: true }),
  },
  blog: {
    list: (qs='') => apiRequest(`/blog${qs}`),
    get: (id) => apiRequest(`/blog/${id}`),
    create: (p) => apiRequest('/blog', { method: 'POST', body: p, auth: true }),
    update: (id,p) => apiRequest(`/blog/${id}`, { method: 'PUT', body: p, auth: true }),
    remove: (id) => apiRequest(`/blog/${id}`, { method: 'DELETE', auth: true }),
  },
  livestreams: {
    list: (qs='') => apiRequest(`/livestreams${qs}`),
    create: (p) => apiRequest('/livestreams', { method: 'POST', body: p, auth: true }),
    update: (id,p) => apiRequest(`/livestreams/${id}`, { method: 'PUT', body: p, auth: true }),
    remove: (id) => apiRequest(`/livestreams/${id}`, { method: 'DELETE', auth: true }),
  },
  contact: {
    submit: (p) => apiRequest('/contact', { method: 'POST', body: p }),
    list: () => apiRequest('/contact', { auth: true }),
    markRead: (id) => apiRequest(`/contact/${id}/read`, { method: 'PUT', auth: true }),
    remove: (id) => apiRequest(`/contact/${id}`, { method: 'DELETE', auth: true }),
  },
  volunteers: {
    submit: (p) => apiRequest('/volunteers', { method: 'POST', body: p }),
    list: (qs='') => apiRequest(`/volunteers${qs}`, { auth: true }),
    update: (id,p) => apiRequest(`/volunteers/${id}`, { method: 'PUT', body: p, auth: true }),
    schedules: {
      list: (qs='') => apiRequest(`/volunteer-schedules${qs}`, { auth: true }),
      create: (p) => apiRequest('/volunteer-schedules', { method: 'POST', body: p, auth: true }),
      update: (id,p) => apiRequest(`/volunteer-schedules/${id}`, { method: 'PUT', body: p, auth: true }),
    },
  },
  newsletter: {
    subscribe: (p) => apiRequest('/newsletter/subscribe', { method: 'POST', body: p }),
    unsubscribe: (p) => apiRequest('/newsletter/unsubscribe', { method: 'POST', body: p }),
    list: () => apiRequest('/newsletter', { auth: true }),
  },
  members: {
    list: (qs='') => apiRequest(`/members${qs}`, { auth: true }),
    get: (id) => apiRequest(`/members/${id}`, { auth: true }),
    update: (id,p) => apiRequest(`/members/${id}`, { method: 'PUT', body: p, auth: true }),
    remove: (id) => apiRequest(`/members/${id}`, { method: 'DELETE', auth: true }),
    myDashboard: () => apiRequest('/members/me/dashboard', { auth: true }),
  },
  attendance: {
    checkIn: (p) => apiRequest('/attendance/check-in', { method: 'POST', body: p, auth: true }),
    record: (p) => apiRequest('/attendance', { method: 'POST', body: p, auth: true }),
    list: (qs='') => apiRequest(`/attendance${qs}`, { auth: true }),
  },
  notifications: {
    list: () => apiRequest('/notifications', { auth: true }),
    markRead: (id) => apiRequest(`/notifications/${id}/read`, { method: 'PUT', auth: true }),
    markAllRead: () => apiRequest('/notifications/read-all', { method: 'PUT', auth: true }),
    broadcast: (p) => apiRequest('/notifications/broadcast', { method: 'POST', body: p, auth: true }),
  },
  leadership: {
    list: () => apiRequest('/leadership'),
    create: (p) => apiRequest('/leadership', { method: 'POST', body: p, auth: true }),
    update: (id,p) => apiRequest(`/leadership/${id}`, { method: 'PUT', body: p, auth: true }),
    remove: (id) => apiRequest(`/leadership/${id}`, { method: 'DELETE', auth: true }),
  },
  bible: {
    today: () => apiRequest('/bible/today'),
    list: () => apiRequest('/bible'),
  },
  bookings: {
    submit: (p) => apiRequest('/bookings', { method: 'POST', body: p }),
    list: (qs='') => apiRequest(`/bookings${qs}`, { auth: true }),
    update: (id,p) => apiRequest(`/bookings/${id}`, { method: 'PUT', body: p, auth: true }),
    remove: (id) => apiRequest(`/bookings/${id}`, { method: 'DELETE', auth: true }),
  },
  cellGroups: {
    list: () => apiRequest('/cell-groups'),
    join: (id) => apiRequest(`/cell-groups/${id}/join`, { method: 'POST', auth: true }),
    members: (id) => apiRequest(`/cell-groups/${id}/members`, { auth: true }),
    create: (p) => apiRequest('/cell-groups', { method: 'POST', body: p, auth: true }),
    update: (id,p) => apiRequest(`/cell-groups/${id}`, { method: 'PUT', body: p, auth: true }),
    remove: (id) => apiRequest(`/cell-groups/${id}`, { method: 'DELETE', auth: true }),
  },
  choir: {
    list: () => apiRequest('/choir'),
    create: (p) => apiRequest('/choir', { method: 'POST', body: p, auth: true }),
    remove: (id) => apiRequest(`/choir/${id}`, { method: 'DELETE', auth: true }),
  },
  library: {
    list: () => apiRequest('/library'),
    download: (id) => apiRequest(`/library/${id}/download`, { method: 'POST' }),
    create: (p) => apiRequest('/library', { method: 'POST', body: p, auth: true }),
    remove: (id) => apiRequest(`/library/${id}`, { method: 'DELETE', auth: true }),
  },
  inventory: {
    list: (qs='') => apiRequest(`/inventory${qs}`, { auth: true }),
    create: (p) => apiRequest('/inventory', { method: 'POST', body: p, auth: true }),
    update: (id,p) => apiRequest(`/inventory/${id}`, { method: 'PUT', body: p, auth: true }),
    remove: (id) => apiRequest(`/inventory/${id}`, { method: 'DELETE', auth: true }),
  },
  roles: {
    list: () => apiRequest('/roles', { auth: true }),
  },
  projects: {
    list: (qs='') => apiRequest(`/projects${qs}`, { auth: true }),
    get: (id) => apiRequest(`/projects/${id}`, { auth: true }),
    create: (p) => apiRequest('/projects', { method: 'POST', body: p, auth: true }),
    update: (id,p) => apiRequest(`/projects/${id}`, { method: 'PUT', body: p, auth: true }),
    remove: (id) => apiRequest(`/projects/${id}`, { method: 'DELETE', auth: true }),
    addMilestone: (id,p) => apiRequest(`/projects/${id}/milestones`, { method: 'POST', body: p, auth: true }),
    updateMilestone: (id,mid,p) => apiRequest(`/projects/${id}/milestones/${mid}`, { method: 'PUT', body: p, auth: true }),
    removeMilestone: (id,mid) => apiRequest(`/projects/${id}/milestones/${mid}`, { method: 'DELETE', auth: true }),
  },
  ministryTasks: {
    list: (qs='') => apiRequest(`/ministry-tasks${qs}`, { auth: true }),
    create: (p) => apiRequest('/ministry-tasks', { method: 'POST', body: p, auth: true }),
    update: (id,p) => apiRequest(`/ministry-tasks/${id}`, { method: 'PUT', body: p, auth: true }),
    remove: (id) => apiRequest(`/ministry-tasks/${id}`, { method: 'DELETE', auth: true }),
  },
  search: (q, limit=5) => apiRequest(`/search?q=${encodeURIComponent(q)}&limit=${limit}`),
  dashboard: { stats: () => apiRequest('/dashboard/stats', { auth: true }) },
  upload: {
    file: (fd) => apiRequest('/upload', { method: 'POST', body: fd, auth: true, isForm: true }),
    profile: (fd) => apiRequest('/upload/profile', { method: 'POST', body: fd, auth: true, isForm: true }),
  },
  qr: {
    generate: () => apiRequest('/qr/generate', { auth: true }),
    checkIn: (token) => apiRequest('/qr/checkin', { method: 'POST', body: { token }, auth: true }),
  },
};

// ---- Shared UI helpers ----
function showAlert(el, msg, type='error') {
  if (!el) return;
  el.innerHTML = `<div class="alert alert-${type==='error'?'error':type}">${msg}</div>`;
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function clearAlert(el) { if (el) el.innerHTML = ''; }
function fmtDate(d) { if (!d) return ''; return new Date(d).toLocaleDateString('en-KE',{year:'numeric',month:'short',day:'numeric'}); }
function fmtDateTime(d) { if (!d) return ''; return new Date(d).toLocaleString('en-KE',{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}); }
function fmtMoney(n, cur='KES') { return `${cur} ${Number(n||0).toLocaleString('en-KE',{minimumFractionDigits:2})}`; }
function escHtml(s) { return String(s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function renderAuthNav(elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  if (Auth.isLoggedIn()) {
    const u = Auth.getUser();
    el.innerHTML = `
      <a href="dashboard.html" style="font-weight:600;">Hi, ${escHtml(u.firstName)}</a>
      ${Auth.isStaff() ? '<a href="admin/index.html">Admin</a>' : ''}
      <a href="#" id="logoutLink">Logout</a>`;
    document.getElementById('logoutLink').addEventListener('click', (e) => {
      e.preventDefault(); Auth.clearSession(); window.location.href = 'index.html';
    });
  } else {
    el.innerHTML = `<a href="login.html">Login</a>&nbsp;<a href="register.html" class="btn btn-primary btn-sm">Join Us</a>`;
  }
}

async function loadNotificationBell(elId) {
  const el = document.getElementById(elId);
  if (!el || !Auth.isLoggedIn()) return;
  try {
    const { unreadCount } = await Api.notifications.list();
    el.innerHTML = `<a href="dashboard.html#notifications" style="position:relative;text-decoration:none;">
      🔔${unreadCount > 0 ? `<span style="position:absolute;top:-6px;right:-8px;background:var(--accent);color:#fff;border-radius:999px;font-size:.7rem;padding:1px 5px;">${unreadCount}</span>` : ''}
    </a>`;
  } catch {}
}

// ════════════════════════════════════════════════════════════════════════
//  BACK BUTTON + BREADCRUMB HELPERS
// ════════════════════════════════════════════════════════════════════════

/**
 * Navigate back using browser history, or fall back to home.
 */
function goBack() {
  if (window.history.length > 1) {
    window.history.back();
  } else {
    window.location.href = 'index.html';
  }
}

/**
 * Inject a ← Back button into any element with id="backBtn".
 * Call this at the top of each page's <script> block, or it is
 * called automatically by the page-header injection below.
 */
function renderBackButton(containerId = 'backBtn') {
  const el = document.getElementById(containerId);
  if (!el) return;
  // Don't show on home page
  const page = window.location.pathname.split('/').pop();
  if (!page || page === 'index.html') return;
  el.innerHTML = `<button class="back-btn" onclick="goBack()">← Back</button>`;
}

/**
 * Build a simple breadcrumb from the page title and optional parent label.
 * Usage: renderBreadcrumb([{label:'Home',href:'index.html'}, {label:'Sermons'}])
 */
function renderBreadcrumb(items, containerId = 'breadcrumb') {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = '<nav class="breadcrumb" aria-label="Breadcrumb">' +
    items.map((item, i) => {
      const isLast = i === items.length - 1;
      return isLast
        ? `<span>${escHtml(item.label)}</span>`
        : `<a href="${item.href}">${escHtml(item.label)}</a><span>›</span>`;
    }).join('') +
    '</nav>';
}

// Auto-inject back button after DOM loads (for any page that has id="backBtn")
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => renderBackButton());
} else {
  renderBackButton();
}
