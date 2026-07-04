// ---- Auth guard: blocks page before anything renders ----
if (!Auth.isLoggedIn() || !Auth.isStaff()) {
  window.location.href = '../login.html';
}

const user = Auth.getUser();
document.getElementById('adminUserName').textContent = user.firstName + ' ' + user.lastName;
document.getElementById('adminUserRole').textContent = user.role.replace(/_/g, ' ');
document.getElementById('adminLogout').addEventListener('click', e => {
  e.preventDefault(); Auth.clearSession(); window.location.href = '../index.html';
});

const viewContainer = document.getElementById('viewContainer');
const viewTitle    = document.getElementById('viewTitle');
const globalAlert  = document.getElementById('globalAlert');

// ---- Role-scoped navigation: hide sections the current role can't act on. ----
// Leaders see People / Events & Care / Ministries / Gallery / Testimonials — the
// areas where they actually have permission to do something. Pastor+ see everything.
document.querySelectorAll('#adminNav a[data-view]').forEach(a => {
  const minRole = a.dataset.minrole;
  if (minRole && !Auth.isAtLeast(minRole)) a.remove();
});
// Hide any nav-group heading left with no links under it.
document.querySelectorAll('#adminNav .nav-group').forEach(heading => {
  let el = heading.nextElementSibling, hasLinks = false;
  while (el && !el.classList.contains('nav-group')) {
    if (el.matches('a[data-view]')) hasLinks = true;
    el = el.nextElementSibling;
  }
  if (!hasLinks) heading.style.display = 'none';
});

// ---- Finer-grained hiding for granular job titles ----
// The data-minrole filtering above only knows the coarse tier (leader/pastor/
// admin/super_admin), so e.g. a Finance Manager and a Media Director — both
// tier 'admin' — currently see the exact same nav. This pass additionally
// hides items tagged data-permission="..." (comma-separated; any-of) that
// the signed-in user's specific job title doesn't actually have, so a
// Finance Manager stops seeing "Live Streams" and a Media Director stops
// seeing "Donations". Runs only for accounts with a roleTitle assigned —
// a plain admin/pastor/etc keeps seeing everything, same as before.
// (Non-blocking: if it fails, the wider tier-based nav from above still
// stands, and the backend still enforces the real permission either way.)
if (user.roleTitle && user.role !== 'super_admin') {
  Api.roles.list().then(({ data }) => {
    const roleInfo = data.roles.find(r => r.title === user.roleTitle);
    const perms = roleInfo ? roleInfo.permissions : [];
    document.querySelectorAll('#adminNav a[data-permission]').forEach(a => {
      const needed = a.dataset.permission.split(',');
      if (!needed.some(p => perms.includes(p))) a.remove();
    });
    document.querySelectorAll('#adminNav .nav-group').forEach(heading => {
      let el = heading.nextElementSibling, hasLinks = false;
      while (el && !el.classList.contains('nav-group')) {
        if (el.matches('a[data-view]')) hasLinks = true;
        el = el.nextElementSibling;
      }
      heading.style.display = hasLinks ? '' : 'none';
    });
  }).catch(() => {}); // fail-open to the tier-based nav; backend still enforces permissions
}

document.querySelectorAll('#adminNav a[data-view]').forEach(a => {
  a.addEventListener('click', () => {
    document.querySelectorAll('#adminNav a').forEach(x => x.classList.remove('active'));
    a.classList.add('active');
    viewTitle.textContent = a.textContent.trim();
    clearAlert(globalAlert);
    renderView(a.dataset.view);
  });
});

function flash(msg, type = 'success') {
  showAlert(globalAlert, msg, type);
  setTimeout(() => clearAlert(globalAlert), 4000);
}

async function renderView(view) {
  viewContainer.innerHTML = '<p style="color:var(--gray);">Loading…</p>';
  try {
    const map = {
      overview:     renderOverview,
      members:      renderMembers,
      attendance:   renderAttendance,
      cellgroups:   renderCellGroups,
      choir:        () => renderCrud(choirCfg),
      volunteers:   renderVolunteers,
      volschedules: renderVolSchedules,
      sermons:      () => renderCrud(sermonCfg),
      livestreams:  () => renderCrud(livestreamCfg),
      ministries:   () => renderCrud(ministryCfg),
      events:       renderEvents,
      bookings:     renderBookings,
      prayer:       renderPrayer,
      announcements:() => renderCrud(announcementCfg),
      blog:         () => renderCrud(blogCfg),
      gallery:      renderGallery,
      leadership:   () => renderCrud(leadershipCfg),
      bibleverses:  () => renderCrud(bibleVerseCfg),
      library:      () => renderCrud(libraryCfg),
      donations:    renderDonations,
      inventory:    () => renderCrud(inventoryCfg),
      contact:      renderContact,
      newsletter:   renderNewsletter,
      broadcast:    renderBroadcast,
      qrgen:        renderQRGen,
      testimonials: renderTestimonials,
      projects:     () => renderCrud(projectCfg),
      ministrytasks:renderMinistryTasks,
      workflows:    renderWorkflows,
      roles:        renderRoles,
      auditlog:     renderAuditLog,
      deletedmembers: renderDeletedMembers,
    };
    if (map[view]) await map[view]();
    else viewContainer.innerHTML = '<p>View not found.</p>';
  } catch (err) {
    viewContainer.innerHTML = `<div class="alert alert-error">${escHtml(err.message)}</div>`;
    console.error(err);
  }
}

// ========================== OVERVIEW ==========================
async function renderOverview() {
  const { data: s } = await Api.dashboard.stats();
  viewContainer.innerHTML = `
    <h2 class="section-title">Dashboard Overview</h2>
    <div class="stat-grid">
      ${sc(s.totalMembers,      '👥 Total Members')}
      ${sc(s.totalSermons,      '🎙 Sermons')}
      ${sc(s.upcomingEvents,    '📅 Upcoming Events')}
      ${sc(s.pendingPrayers,    '🙏 New Prayer Requests')}
      ${sc(s.unreadMessages,    '✉ Unread Messages')}
      ${sc(s.pendingVolunteers, '🤝 Pending Volunteers')}
      ${sc(s.newsletterSubs,    '📧 Subscribers')}
      ${sc(fmtMoney(s.givingThisMonth), '💛 Giving This Month')}
      ${sc(fmtMoney(s.totalGiving),     '💛 All-Time Giving')}
    </div>

    <div class="grid grid-2" style="margin-top:1.5rem;gap:1.5rem;">
      <div style="background:#fff;border-radius:var(--radius);padding:1.2rem;box-shadow:var(--shadow);">
        <h3 style="margin-bottom:.8rem;">Quick Actions</h3>
        <div style="display:flex;flex-direction:column;gap:.5rem;">
          <button class="btn btn-primary  btn-sm" onclick="renderView('sermons')">+ Add Sermon</button>
          <button class="btn btn-outline  btn-sm" onclick="renderView('events')">+ Add Event</button>
          <button class="btn btn-outline  btn-sm" onclick="renderView('announcements')">+ Announcement</button>
          <button class="btn btn-outline  btn-sm" onclick="renderView('broadcast')">📣 Send Notification to All</button>
          <button class="btn btn-outline  btn-sm" onclick="renderView('qrgen')">📱 Generate Attendance QR</button>
        </div>
      </div>

      <div style="background:#fff;border-radius:var(--radius);padding:1.2rem;box-shadow:var(--shadow);">
        <h3 style="margin-bottom:.8rem;">Role Permission Matrix</h3>
        <table style="width:100%;font-size:.78rem;border-collapse:collapse;">
          <tr style="background:var(--gray-light);">
            <th style="padding:.4rem .5rem;text-align:left;">Permission</th>
            <th>member</th><th>leader</th><th>pastor</th><th>admin</th><th>super_admin</th>
          </tr>
          ${pm('View public content',       '✅','✅','✅','✅','✅')}
          ${pm('Submit prayer / give',      '✅','✅','✅','✅','✅')}
          ${pm('Join cell groups',          '✅','✅','✅','✅','✅')}
          ${pm('Manage cell groups',        '❌','✅','✅','✅','✅')}
          ${pm('Manage events/gallery',     '❌','✅','✅','✅','✅')}
          ${pm('Publish sermons/blog',      '❌','❌','✅','✅','✅')}
          ${pm('Confirm bookings',          '❌','✅','✅','✅','✅')}
          ${pm('View donation reports',     '❌','❌','❌','✅','✅')}
          ${pm('Manage members/roles',      '❌','❌','❌','✅','✅')}
          ${pm('Assign admin roles',        '❌','❌','❌','❌','✅')}
          ${pm('Delete members',            '❌','❌','❌','❌','✅')}
        </table>
      </div>
    </div>`;
}
function sc(n, label) {
  return `<div class="stat-card"><div class="num">${n}</div><div class="label">${label}</div></div>`;
}
function pm(action, ...cols) {
  return `<tr><td style="padding:.3rem .5rem;">${action}</td>${cols.map(c => `<td style="text-align:center;">${c}</td>`).join('')}</tr>`;
}

// ========================== MEMBERS ==========================
async function renderMembers() {
  const { data } = await Api.members.list('?limit=200');
  const canEdit  = Auth.isAdmin();
  const isSuperAdmin = Auth.hasRole('super_admin');
  const canAssignMinistry = Auth.isAtLeast('pastor'); // pastors+ decide who leads which ministry
  let ministries = [];
  if (canAssignMinistry) {
    try { ministries = (await Api.ministries.list('?limit=100')).data; } catch {}
  }
  // Granular job titles (Finance Manager, Camera Operator, etc) — see
  // config/permissions.js on the backend. Only fetched for admins, since
  // assigning one is an admin-only action; a pastor still just sees the tier.
  let roleTitles = [];
  if (canEdit) {
    try { roleTitles = (await Api.roles.list()).data.roles; } catch {}
  }

  viewContainer.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:.6rem;">
      <h2 class="section-title">Members Directory (${data.length})</h2>
      <input id="memberSearch" type="text" placeholder="Search name / email…"
        style="padding:.4rem .8rem;border:1px solid var(--gray-light);border-radius:var(--radius);">
    </div>
    <div style="overflow-x:auto;">
    <table class="data-table" id="memberTable">
      <thead><tr>
        <th>Name</th><th>Email</th><th>Phone</th>
        <th>Role</th>${canEdit ? '<th>Job Title</th>' : ''}${canAssignMinistry ? '<th>Ministry (if leader)</th>' : ''}<th>Membership</th><th>Joined</th>
        <th>Actions</th>
      </tr></thead>
      <tbody>
      ${data.map(m => `
        <tr>
          <td>${escHtml(m.firstName)} ${escHtml(m.lastName)}</td>
          <td style="font-size:.85rem;">${escHtml(m.email)}</td>
          <td style="font-size:.85rem;">${escHtml(m.phone || '')}</td>
          <td>
            ${canEdit
              ? `<select class="roleSelect" data-id="${m.id}"
                  ${m.id === user.id ? 'disabled title="Cannot change your own role"' : ''}>
                  ${['member','leader','pastor','admin','super_admin'].map(r =>
                    `<option value="${r}"
                      ${m.role === r ? 'selected' : ''}
                      ${!isSuperAdmin && ['admin','super_admin'].includes(r) ? 'disabled' : ''}>
                      ${r}
                    </option>`).join('')}
                </select>`
              : `<span class="badge badge-new">${m.role}</span>`}
          </td>
          ${canEdit ? `<td>
              <select class="roleTitleSelect" data-id="${m.id}"
                ${m.id === user.id ? 'disabled title="Cannot change your own job title"' : ''}>
                <option value="">— no specific title —</option>
                ${roleTitles.map(rt =>
                  `<option value="${rt.title}"
                    ${m.roleTitle === rt.title ? 'selected' : ''}
                    ${!isSuperAdmin && ['admin','super_admin'].includes(rt.tier) ? 'disabled' : ''}>
                    ${rt.label} (${rt.tier})
                  </option>`).join('')}
              </select>
            </td>` : ''}
          ${canAssignMinistry ? `<td>
              ${(m.role === 'leader' || m.roleTitle)
                ? `<select class="ministrySelect" data-id="${m.id}">
                    <option value="">— none —</option>
                    ${ministries.map(mn => `<option value="${mn.id}" ${m.ministryId===mn.id?'selected':''}>${escHtml(mn.name)}</option>`).join('')}
                  </select>`
                : `<span style="color:var(--gray);font-size:.82rem;">n/a</span>`}
            </td>` : ''}
          <td>
            ${canEdit
              ? `<select class="statusSelect" data-id="${m.id}">
                  ${['visitor','member','active','inactive','transferred'].map(s =>
                    `<option value="${s}" ${m.membershipStatus === s ? 'selected' : ''}>${s}</option>`).join('')}
                </select>`
              : escHtml(m.membershipStatus || '')}
          </td>
          <td style="font-size:.85rem;">${fmtDate(m.membershipDate || m.createdAt)}</td>
          <td style="white-space:nowrap;">
            <button class="btn btn-sm btn-outline" onclick="viewMemberProfile('${m.id}')">Profile</button>
            ${canEdit
              ? `<button class="btn btn-sm btn-danger"
                  onclick="deleteMember('${m.id}','${escHtml(m.firstName)} ${escHtml(m.lastName)}')">
                  Remove
                </button>`
              : ''}
          </td>
        </tr>`).join('')}
      </tbody>
    </table></div>`;

  // Live table search
  document.getElementById('memberSearch').addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('#memberTable tbody tr').forEach(tr => {
      tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  });

  if (canEdit) {
    document.querySelectorAll('.roleSelect').forEach(sel => {
      sel.addEventListener('change', async () => {
        try {
          await Api.members.update(sel.dataset.id, { role: sel.value });
          flash('Role updated.');
          renderMembers(); // ministry dropdown only shows for role === 'leader', so refresh
        } catch (e) { flash(e.message, 'error'); }
      });
    });
    document.querySelectorAll('.roleTitleSelect').forEach(sel => {
      sel.addEventListener('change', async () => {
        try {
          // Sending '' clears the title server-side (roleTitle: null); the
          // tier (role) stays whatever it currently is in that case, since
          // clearing a title doesn't imply demoting someone — set role
          // separately if that's also intended.
          await Api.members.update(sel.dataset.id, { roleTitle: sel.value || null });
          flash('Job title updated. Their access now follows that title\'s permission set.');
          renderMembers();
        } catch (e) { flash(e.message, 'error'); }
      });
    });
    document.querySelectorAll('.statusSelect').forEach(sel => {
      sel.addEventListener('change', async () => {
        try {
          await Api.members.update(sel.dataset.id, { membershipStatus: sel.value });
          flash('Status updated.');
        } catch (e) { flash(e.message, 'error'); }
      });
    });
  }
  if (canAssignMinistry) {
    document.querySelectorAll('.ministrySelect').forEach(sel => {
      sel.addEventListener('change', async () => {
        try {
          await Api.members.update(sel.dataset.id, { ministryId: sel.value || null });
          flash('Ministry assignment updated. This leader can now manage that ministry\'s events and page.');
        } catch (e) { flash(e.message, 'error'); }
      });
    });
  }
}

async function deleteMember(id, name) {
  // Backend enforces the real rule (super_admin + senior_pastor specifically,
  // via DELETE_MEMBERS — see config/permissions.js); this is just a rough
  // client-side approximation so obviously-ineligible roles don't even see
  // the option attempt something the server will reject anyway.
  if (!Auth.isAtLeast('pastor')) { flash('You do not have permission to remove members.', 'error'); return; }
  if (!confirm(`Remove "${name}"? This is recoverable by a super admin afterward, but treat it as serious.`)) return;
  try { await Api.members.remove(id); flash('Member removed.'); renderMembers(); }
  catch (e) { flash(e.message, 'error'); }
}

// Lightweight self-contained modal — no dependency on any specific view's
// DOM structure, so it can be triggered from anywhere (e.g. the Members
// table's "Profile" button).
function showModal(title, bodyHtml) {
  const existing = document.getElementById('appModalOverlay');
  if (existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.id = 'appModalOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1000;display:flex;align-items:center;justify-content:center;padding:1rem;';
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:var(--radius,8px);max-width:700px;width:100%;max-height:85vh;overflow-y:auto;padding:1.5rem;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
        <h2 class="section-title" style="margin:0;">${title}</h2>
        <button class="btn btn-sm btn-outline" onclick="document.getElementById('appModalOverlay').remove()">Close</button>
      </div>
      ${bodyHtml}
    </div>`;
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

async function viewMemberProfile(id) {
  showModal('Member Profile', '<p>Loading…</p>');
  try {
    const { data: p } = await Api.membersExtras.profile(id);
    const body = document.querySelector('#appModalOverlay > div');
    body.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
        <h2 class="section-title" style="margin:0;">${escHtml(p.firstName)} ${escHtml(p.lastName)}</h2>
        <button class="btn btn-sm btn-outline" onclick="document.getElementById('appModalOverlay').remove()">Close</button>
      </div>
      <p class="card-meta">${escHtml(p.email)} ${p.phone ? '· ' + escHtml(p.phone) : ''}</p>
      <p class="card-meta">Status: ${escHtml(p.membershipStatus || '—')} &nbsp;|&nbsp; Ministry: ${p.ministry ? escHtml(p.ministry.name) : '—'} &nbsp;|&nbsp; Cell Group: ${p.cellGroup ? escHtml(p.cellGroup.name) : '—'}</p>
      <div class="grid grid-2" style="margin-top:1rem;gap:1rem;">
        <div class="card"><div class="card-body">
          <h3>Attendance</h3>
          <p class="card-meta">${p.attendance.total} record(s) on file</p>
          <ul style="font-size:.85rem;max-height:120px;overflow-y:auto;">
            ${p.attendance.recent.slice(0,10).map(a => `<li>${fmtDate(a.serviceDate)}</li>`).join('') || '<li style="color:var(--gray);">None yet</li>'}
          </ul>
        </div></div>
        <div class="card"><div class="card-body">
          <h3>Giving</h3>
          <p class="card-meta">${fmtMoney(p.giving.totalAllTime)} all-time across ${p.giving.count} gift(s)</p>
          <ul style="font-size:.85rem;max-height:120px;overflow-y:auto;">
            ${p.giving.recent.slice(0,10).map(d => `<li>${fmtDate(d.createdAt)} — ${fmtMoney(d.amount)} (${escHtml(d.type)})</li>`).join('') || '<li style="color:var(--gray);">None yet</li>'}
          </ul>
        </div></div>
        <div class="card"><div class="card-body">
          <h3>Volunteering</h3>
          <p class="card-meta">${p.volunteering.shiftsCompleted} shift(s) completed</p>
        </div></div>
        <div class="card"><div class="card-body">
          <h3>Discipleship</h3>
          <p class="card-meta">Stage: ${escHtml(p.discipleshipStage || '—')}</p>
          <p class="card-meta">Courses: ${(p.coursesCompleted || []).join(', ') || '—'}</p>
        </div></div>
      </div>`;
  } catch (e) {
    const body = document.querySelector('#appModalOverlay > div');
    if (body) body.innerHTML = `<p>Could not load profile: ${escHtml(e.message)}</p>`;
  }
}

// ========================== ATTENDANCE ==========================
async function renderAttendance() {
  const { data } = await Api.attendance.list('?limit=100');
  viewContainer.innerHTML = `
    <h2 class="section-title">Attendance Records</h2>
    <form id="attForm" class="app-form wide" style="margin-bottom:1.5rem;">
      <div id="attAlert"></div>
      <div class="form-row">
        <div class="form-group"><label>Member User ID</label>
          <input name="userId" placeholder="Paste member's UUID" required></div>
        <div class="form-group"><label>Service Date</label>
          <input type="date" name="serviceDate" required></div>
        <div class="form-group"><label>Method</label>
          <select name="checkedInVia">
            <option value="manual">Manual</option>
            <option value="qr">QR Code</option>
          </select>
        </div>
      </div>
      <button class="btn btn-primary btn-sm" type="submit">Record Attendance</button>
    </form>
    <div style="overflow-x:auto;">
    <table class="data-table">
      <thead><tr><th>Member</th><th>Service Date</th><th>Check-in Method</th><th>Recorded</th></tr></thead>
      <tbody>
      ${data.map(a => `<tr>
        <td>${a.User ? escHtml(a.User.firstName + ' ' + a.User.lastName) : a.userId}</td>
        <td>${fmtDate(a.serviceDate)}</td>
        <td><span class="badge badge-new">${a.checkedInVia}</span></td>
        <td style="font-size:.82rem;">${fmtDate(a.createdAt)}</td>
      </tr>`).join('')}
      </tbody>
    </table></div>`;

  document.getElementById('attForm').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target;
    const alertBox = document.getElementById('attAlert');
    try {
      await Api.attendance.record({
        userId: f.userId.value,
        serviceDate: f.serviceDate.value,
        checkedInVia: f.checkedInVia.value,
      });
      flash('Attendance recorded.'); renderAttendance();
    } catch (err) { showAlert(alertBox, err.message); }
  });
}

// ========================== CELL GROUPS ==========================
async function renderCellGroups() {
  if (!Auth.isAtLeast('leader')) { viewContainer.innerHTML = '<p>Leader access required.</p>'; return; }
  const { data } = await Api.cellGroups.list();
  viewContainer.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
      <h2 class="section-title">Cell Groups (${data.length})</h2>
      ${Auth.isAtLeast('pastor') ? '<button class="btn btn-primary btn-sm" onclick="openCGForm()">+ New Group</button>' : ''}
    </div>
    <div id="cgFormWrap"></div>
    <div class="grid grid-2">
    ${data.map(g => `
      <div class="card"><div class="card-body">
        <h3>${escHtml(g.name)}</h3>
        <p class="card-meta">📍 ${escHtml(g.area || '')} &nbsp;|&nbsp; 👤 ${escHtml(g.leaderName || 'TBA')}</p>
        <p class="card-meta">🕒 ${escHtml(g.meetingDay || '')} ${escHtml(g.meetingTime || '')} — ${escHtml(g.venue || '')}</p>
        <p style="font-size:.88rem;">${escHtml(g.description || '')}</p>
        <div style="display:flex;gap:.5rem;margin-top:.6rem;">
          ${Auth.isAtLeast('leader')
            ? `<button class="btn btn-sm btn-outline" onclick='openCGForm(${JSON.stringify(g).replace(/'/g,"&#39;")})'>Edit</button>`
            : ''}
          ${Auth.isAdmin()
            ? `<button class="btn btn-sm btn-danger" onclick="deleteCG('${g.id}')">Delete</button>`
            : ''}
          <button class="btn btn-sm btn-outline" onclick="viewCGMembers('${g.id}','${escHtml(g.name)}')">View Members</button>
          ${Auth.isAtLeast('leader')
            ? `<button class="btn btn-sm btn-outline" onclick="viewCGReports('${g.id}','${escHtml(g.name)}')">Reports & Growth</button>`
            : ''}
        </div>
      </div></div>`).join('')}
    </div>
    <div id="cgMembersWrap" style="margin-top:1.5rem;"></div>`;
}

function openCGForm(g = null) {
  document.getElementById('cgFormWrap').innerHTML = `
    <form id="cgForm" class="app-form wide" style="margin-bottom:1.5rem;">
      <h3>${g ? 'Edit' : 'New'} Cell Group</h3>
      <div id="cgAlert"></div>
      <div class="form-row">
        <div class="form-group"><label>Group Name *</label><input name="name" required value="${escHtml(g?.name||'')}"></div>
        <div class="form-group"><label>Area / Zone</label><input name="area" value="${escHtml(g?.area||'')}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Leader Name</label><input name="leaderName" value="${escHtml(g?.leaderName||'')}"></div>
        <div class="form-group"><label>Meeting Day</label><input name="meetingDay" placeholder="e.g. Thursday" value="${escHtml(g?.meetingDay||'')}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Meeting Time</label><input name="meetingTime" placeholder="e.g. 6:00 PM" value="${escHtml(g?.meetingTime||'')}"></div>
        <div class="form-group"><label>Venue</label><input name="venue" value="${escHtml(g?.venue||'')}"></div>
      </div>
      <div class="form-group"><label>Description</label><textarea name="description">${escHtml(g?.description||'')}</textarea></div>
      <div style="display:flex;gap:.5rem;">
        <button class="btn btn-primary" type="submit">${g ? 'Save Changes' : 'Create Group'}</button>
        <button class="btn btn-outline" type="button" onclick="document.getElementById('cgFormWrap').innerHTML=''">Cancel</button>
      </div>
    </form>`;

  document.getElementById('cgForm').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target;
    const payload = {
      name: f.name.value, area: f.area.value, leaderName: f.leaderName.value,
      meetingDay: f.meetingDay.value, meetingTime: f.meetingTime.value,
      venue: f.venue.value, description: f.description.value,
    };
    try {
      g ? await Api.cellGroups.update(g.id, payload) : await Api.cellGroups.create(payload);
      flash('Cell group saved.'); renderCellGroups();
    } catch (err) { showAlert(document.getElementById('cgAlert'), err.message); }
  });
}

async function deleteCG(id) {
  if (!confirm('Delete this cell group?')) return;
  try { await Api.cellGroups.remove(id); flash('Deleted.'); renderCellGroups(); }
  catch (e) { flash(e.message, 'error'); }
}

async function viewCGMembers(id, name) {
  const wrap = document.getElementById('cgMembersWrap');
  try {
    const { data } = await Api.cellGroups.members(id);
    wrap.innerHTML = `<h3>${escHtml(name)} — Members (${data.length})</h3>
      <table class="data-table"><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Joined</th></tr></thead>
      <tbody>${data.map(m => `<tr>
        <td>${m.user ? escHtml(m.user.firstName+' '+m.user.lastName) : '—'}</td>
        <td>${m.user ? escHtml(m.user.email) : ''}</td>
        <td>${m.user ? escHtml(m.user.phone||'') : ''}</td>
        <td>${fmtDate(m.joinedAt)}</td>
      </tr>`).join('')}</tbody></table>`;
  } catch (e) { wrap.innerHTML = `<p>Could not load members: ${e.message}</p>`; }
}

// Weekly reports (attendance + Bible study notes) and growth chart for one
// cell group — server enforces that a plain leader can only ever load/submit
// against their OWN group (see routes/cellgroups.routes.js); this UI doesn't
// duplicate that check, it just surfaces whatever the API allows.
async function viewCGReports(id, name) {
  const wrap = document.getElementById('cgMembersWrap');
  wrap.innerHTML = '<p>Loading…</p>';
  try {
    const [reportsRes, growthRes] = await Promise.all([Api.cellGroupExtras.reports(id), Api.cellGroupExtras.growth(id)]);
    const reports = reportsRes.data;
    const growth = growthRes.data;

    wrap.innerHTML = `
      <h3>${escHtml(name)} — Weekly Reports & Growth</h3>
      <div class="grid grid-2" style="align-items:start;">
        <div>
          <button class="btn btn-primary btn-sm" onclick="openCGReportForm('${id}','${escHtml(name)}')">+ Submit This Week's Report</button>
          <div id="cgReportFormWrap"></div>
          <table class="data-table" style="margin-top:.8rem;">
            <thead><tr><th>Date</th><th>Attend.</th><th>Visitors</th><th>Bible Study Topic</th></tr></thead>
            <tbody>${reports.length ? reports.map(r => `
              <tr>
                <td>${fmtDate(r.meetingDate)}</td>
                <td>${r.attendanceCount}</td>
                <td>${r.visitorsCount || 0}</td>
                <td>${escHtml(r.bibleStudyTopic || '—')}</td>
              </tr>`).join('') : '<tr><td colspan="4" style="text-align:center;color:var(--gray);">No reports submitted yet.</td></tr>'}</tbody>
          </table>
        </div>
        <div>
          <p class="card-meta">Current members: <strong>${growth.currentMemberCount}</strong></p>
          <p class="card-meta" style="margin-top:.5rem;">Attendance trend (last 12 months)</p>
          <div id="cgGrowthChart"></div>
        </div>
      </div>`;

    if (growth.attendanceTrend.length) {
      renderMiniBarChart(
        document.getElementById('cgGrowthChart'),
        growth.attendanceTrend.map(r => fmtDate(r.meetingDate)),
        growth.attendanceTrend.map(r => r.attendance)
      );
    } else {
      document.getElementById('cgGrowthChart').innerHTML = '<p style="color:var(--gray);font-size:.85rem;">No reports yet to chart.</p>';
    }
  } catch (e) { wrap.innerHTML = `<p>Could not load reports: ${e.message}</p>`; }
}

// Small dependency-free bar chart (no charting library is loaded in this
// admin panel) — plain divs with heights proportional to the max value.
// Good enough for a quick trend glance; not a replacement for a real
// charting library if richer visuals are wanted later.
function renderMiniBarChart(container, labels, values) {
  const max = Math.max(...values, 1);
  container.innerHTML = `
    <div style="display:flex;align-items:flex-end;gap:4px;height:120px;border-bottom:1px solid var(--gray-light);padding-bottom:2px;">
      ${values.map((v, i) => `
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;" title="${escHtml(labels[i])}: ${v}">
          <div style="width:100%;background:var(--primary,#4f46e5);border-radius:2px 2px 0 0;height:${Math.max((v / max) * 100, 3)}%;"></div>
        </div>`).join('')}
    </div>
    <div style="display:flex;gap:4px;margin-top:4px;">
      ${labels.map(l => `<div style="flex:1;font-size:.65rem;color:var(--gray);text-align:center;overflow:hidden;white-space:nowrap;">${escHtml(l)}</div>`).join('')}
    </div>`;
}

function openCGReportForm(cellGroupId, name) {
  document.getElementById('cgReportFormWrap').innerHTML = `
    <form id="cgReportForm" class="app-form" style="margin-top:.8rem;">
      <div id="cgReportAlert"></div>
      <div class="form-group"><label>Meeting Date</label><input type="date" name="meetingDate" required></div>
      <div class="form-row">
        <div class="form-group"><label>Attendance</label><input type="number" name="attendanceCount" min="0" required></div>
        <div class="form-group"><label>Visitors</label><input type="number" name="visitorsCount" min="0" value="0"></div>
      </div>
      <div class="form-group"><label>Bible Study Topic</label><input name="bibleStudyTopic"></div>
      <div class="form-group"><label>Bible Study Notes</label><textarea name="bibleStudyNotes"></textarea></div>
      <div class="form-group"><label>Prayer Requests Summary</label><textarea name="prayerRequestsSummary" placeholder="Themes discussed, not individual private requests"></textarea></div>
      <button class="btn btn-primary btn-sm" type="submit">Save Report</button>
    </form>`;
  document.getElementById('cgReportForm').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target;
    const payload = {
      meetingDate: f.meetingDate.value,
      attendanceCount: Number(f.attendanceCount.value),
      visitorsCount: Number(f.visitorsCount.value || 0),
      bibleStudyTopic: f.bibleStudyTopic.value,
      bibleStudyNotes: f.bibleStudyNotes.value,
      prayerRequestsSummary: f.prayerRequestsSummary.value,
    };
    try {
      await Api.cellGroupExtras.submitReport(cellGroupId, payload);
      flash('Report saved.');
      viewCGReports(cellGroupId, name);
    } catch (err) { showAlert(document.getElementById('cgReportAlert'), err.message); }
  });
}

// ========================== VOLUNTEERS ==========================
async function renderVolunteers() {
  const { data } = await Api.volunteers.list();
  viewContainer.innerHTML = `
    <h2 class="section-title">Volunteer Applications (${data.length})</h2>
    <table class="data-table">
      <thead><tr><th>Name</th><th>Email</th><th>Ministry Interest</th><th>Availability</th><th>Status</th></tr></thead>
      <tbody>
      ${data.map(v => `<tr>
        <td>${escHtml(v.fullName)}</td>
        <td style="font-size:.85rem;">${escHtml(v.email)}</td>
        <td>${escHtml(v.ministryInterest || '')}</td>
        <td style="font-size:.82rem;">${escHtml(v.availability || '')}</td>
        <td>
          <select class="volStatus" data-id="${v.id}">
            ${['pending','approved','declined'].map(s =>
              `<option value="${s}" ${v.status===s?'selected':''}>${s}</option>`).join('')}
          </select>
        </td>
      </tr>`).join('')}
      </tbody>
    </table>`;

  document.querySelectorAll('.volStatus').forEach(sel => {
    sel.addEventListener('change', async () => {
      try { await Api.volunteers.update(sel.dataset.id, { status: sel.value }); flash('Status updated.'); }
      catch (e) { flash(e.message, 'error'); }
    });
  });
}

// ========================== VOLUNTEER SCHEDULES ==========================
async function renderVolSchedules() {
  if (!Auth.isAtLeast('leader')) { viewContainer.innerHTML = '<p>Leader access required.</p>'; return; }
  const { data } = await Api.volunteers.schedules.list('?limit=100');
  viewContainer.innerHTML = `
    <h2 class="section-title">Volunteer Schedules</h2>
    <form id="vsForm" class="app-form wide" style="margin-bottom:1.5rem;">
      <div id="vsAlert"></div>
      <div class="form-row">
        <div class="form-group"><label>Volunteer App ID *</label>
          <input name="volunteerId" placeholder="From Volunteers table" required></div>
        <div class="form-group"><label>Member User ID (for notification)</label>
          <input name="userId" placeholder="Optional – paste UUID"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Ministry *</label><input name="ministry" required></div>
        <div class="form-group"><label>Service Date *</label><input type="date" name="serviceDate" required></div>
        <div class="form-group"><label>Role</label><input name="role" placeholder="e.g. Usher, Sound, Kids Teacher"></div>
      </div>
      <button class="btn btn-primary btn-sm" type="submit">Add to Schedule</button>
    </form>
    <table class="data-table">
      <thead><tr><th>Ministry</th><th>Date</th><th>Role</th><th>Status</th></tr></thead>
      <tbody>
      ${data.map(s => `<tr>
        <td>${escHtml(s.ministry)}</td>
        <td>${fmtDate(s.serviceDate)}</td>
        <td>${escHtml(s.role || '—')}</td>
        <td><span class="badge badge-${s.status}">${s.status}</span></td>
      </tr>`).join('')}
      </tbody>
    </table>`;

  document.getElementById('vsForm').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target;
    const alertBox = document.getElementById('vsAlert');
    try {
      await Api.volunteers.schedules.create({
        volunteerId: f.volunteerId.value,
        userId: f.userId.value || null,
        ministry: f.ministry.value,
        serviceDate: f.serviceDate.value,
        role: f.role.value,
      });
      flash('Volunteer scheduled. Member will be notified.'); renderVolSchedules();
    } catch (err) { showAlert(alertBox, err.message); }
  });
}

// ========================== EVENTS ==========================
async function renderEvents() {
  const [{ data }, ministriesRes] = await Promise.all([
    Api.events.list('?limit=100'),
    Api.ministries.list('?limit=100').catch(() => ({ data: [] })),
  ]);
  const ministries = ministriesRes.data || [];
  const ministryName = (id) => ministries.find(m => m.id === id)?.name || 'Church-wide';
  const myMinistryId = user.ministryId;
  const canManage = (ev) => Auth.isAtLeast('pastor') || (user.role === 'leader' && ev.ministryId === myMinistryId);

  viewContainer.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
      <h2 class="section-title">Events (${data.length})</h2>
      <button class="btn btn-primary btn-sm" onclick="openEventForm()">+ New Event</button>
    </div>
    ${user.role === 'leader' && !myMinistryId
      ? `<div class="alert alert-error">You haven't been assigned to a ministry yet — ask your pastor or admin to assign you one before creating events.</div>`
      : ''}
    <div id="evFormWrap"></div>
    <div style="overflow-x:auto;">
    <table class="data-table">
      <thead><tr><th>Title</th><th>Category</th><th>Ministry</th><th>Start</th><th>Location</th><th>Published</th><th>Regs</th><th></th></tr></thead>
      <tbody>
      ${data.map(ev => `<tr>
        <td><strong>${escHtml(ev.title)}</strong></td>
        <td><span class="badge badge-new">${ev.category}</span></td>
        <td style="font-size:.85rem;">${escHtml(ministryName(ev.ministryId))}</td>
        <td style="font-size:.85rem;">${fmtDate(ev.startDate)}</td>
        <td style="font-size:.85rem;">${escHtml(ev.location||'—')}</td>
        <td>${ev.isPublished ? '✅' : '❌'}</td>
        <td>
          ${ev.registrationRequired
            ? `<button class="btn btn-sm btn-outline" onclick="viewEventRegs('${ev.id}')">View</button>`
            : '—'}
        </td>
        <td style="white-space:nowrap;">
          ${canManage(ev)
            ? `<button class="btn btn-sm btn-outline" onclick='openEventForm(${JSON.stringify(ev).replace(/'/g,"&#39;")})'>Edit</button>`
            : `<span style="color:var(--gray);font-size:.8rem;" title="Belongs to another ministry">🔒</span>`}
          ${canManage(ev)
            ? `<button class="btn btn-sm btn-danger" onclick="deleteEvent('${ev.id}')">Del</button>`
            : ''}
        </td>
      </tr>`).join('')}
      </tbody>
    </table></div>
    <div id="regsWrap" style="margin-top:1.5rem;"></div>`;

  window._eventMinistries = ministries; // used by openEventForm
}

function openEventForm(ev = null) {
  const cats = ['conference','crusade','youth','prayer','bible_study','service','other'];
  const ministries = window._eventMinistries || [];
  const isLeader = user.role === 'leader';
  const myMinistryName = ministries.find(m => m.id === user.ministryId)?.name || '(unassigned)';

  document.getElementById('evFormWrap').innerHTML = `
    <form id="evForm" class="app-form wide" style="margin-bottom:1.5rem;">
      <h3>${ev ? 'Edit' : 'New'} Event</h3>
      <div id="evAlert"></div>
      <div class="form-row">
        <div class="form-group"><label>Title *</label>
          <input name="title" required value="${escHtml(ev?.title||'')}"></div>
        <div class="form-group"><label>Category</label>
          <select name="category">${cats.map(c => `<option value="${c}" ${ev?.category===c?'selected':''}>${c.replace('_',' ')}</option>`).join('')}</select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Ministry</label>
          ${isLeader
            ? `<input value="${escHtml(myMinistryName)}" disabled title="Leaders can only create events for their own ministry">`
            : `<select name="ministryId">
                <option value="">Church-wide (no specific ministry)</option>
                ${ministries.map(m => `<option value="${m.id}" ${ev?.ministryId===m.id?'selected':''}>${escHtml(m.name)}</option>`).join('')}
              </select>`}
        </div>
        <div class="form-group"><label>Location</label>
          <input name="location" value="${escHtml(ev?.location||'')}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Start Date/Time *</label>
          <input type="datetime-local" name="startDate" required
            value="${ev?.startDate ? new Date(ev.startDate).toISOString().slice(0,16) : ''}">
        </div>
        <div class="form-group"><label>End Date/Time</label>
          <input type="datetime-local" name="endDate"
            value="${ev?.endDate ? new Date(ev.endDate).toISOString().slice(0,16) : ''}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Capacity (blank = unlimited)</label>
          <input type="number" name="capacity" value="${ev?.capacity||''}"></div>
        <div class="form-group"><label>Cover Image URL</label>
          <input name="image" value="${escHtml(ev?.image||'')}"></div>
      </div>
      <div class="form-group"><label>Description</label>
        <textarea name="description">${escHtml(ev?.description||'')}</textarea></div>
      <div style="display:flex;gap:1.5rem;margin:.6rem 0;">
        <label class="form-check">
          <input type="checkbox" name="registrationRequired" ${ev?.registrationRequired?'checked':''}>
          &nbsp;Requires Registration
        </label>
        <label class="form-check">
          <input type="checkbox" name="isPublished" ${ev?.isPublished!==false?'checked':''}>
          &nbsp;Published (visible to public)
        </label>
      </div>
      <div style="display:flex;gap:.5rem;">
        <button class="btn btn-primary" type="submit" ${isLeader && !user.ministryId ? 'disabled' : ''}>${ev ? 'Save Changes' : 'Create Event'}</button>
        <button class="btn btn-outline" type="button"
          onclick="document.getElementById('evFormWrap').innerHTML=''">Cancel</button>
      </div>
    </form>`;

  document.getElementById('evForm').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target;
    const payload = {
      title: f.title.value, category: f.category.value,
      startDate: f.startDate.value, endDate: f.endDate.value || null,
      location: f.location.value, capacity: f.capacity.value ? Number(f.capacity.value) : null,
      image: f.image.value, description: f.description.value,
      registrationRequired: f.registrationRequired.checked,
      isPublished: f.isPublished.checked,
    };
    if (!isLeader && f.ministryId) payload.ministryId = f.ministryId.value || null;
    // For leaders, ministryId is intentionally omitted — the backend forces it to
    // their own ministry regardless of what's sent.
    try {
      ev ? await Api.events.update(ev.id, payload) : await Api.events.create(payload);
      flash('Event saved.'); renderEvents();
    } catch (err) { showAlert(document.getElementById('evAlert'), err.message); }
  });
}

async function viewEventRegs(id) {
  try {
    const { data } = await Api.events.registrations(id);
    document.getElementById('regsWrap').innerHTML = `
      <h3>Registrations for this event (${data.length})</h3>
      <table class="data-table">
        <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Guests</th><th>Status</th></tr></thead>
        <tbody>${data.map(r => `<tr>
          <td>${escHtml(r.fullName)}</td><td>${escHtml(r.email)}</td>
          <td>${escHtml(r.phone||'')}</td><td>${r.numberOfGuests}</td>
          <td><span class="badge badge-${r.status}">${r.status}</span></td>
        </tr>`).join('')}</tbody>
      </table>`;
  } catch (e) { flash(e.message, 'error'); }
}

async function deleteEvent(id) {
  if (!confirm('Delete this event permanently?')) return;
  try { await Api.events.remove(id); flash('Event deleted.'); renderEvents(); }
  catch (e) { flash(e.message, 'error'); }
}

// ========================== BOOKINGS ==========================
async function renderBookings() {
  const { data } = await Api.bookings.list();
  viewContainer.innerHTML = `
    <h2 class="section-title">Service Bookings (${data.length})</h2>
    <div style="overflow-x:auto;">
    <table class="data-table">
      <thead><tr><th>Type</th><th>Name</th><th>Phone</th><th>Email</th><th>Pref. Date</th><th>Status</th><th>Assigned</th><th>Notes</th></tr></thead>
      <tbody>
      ${data.map(b => `<tr>
        <td><span class="badge badge-new">${b.type.replace(/_/g,' ')}</span></td>
        <td>${escHtml(b.fullName)}</td>
        <td style="font-size:.85rem;">${escHtml(b.phone||'')}</td>
        <td style="font-size:.85rem;">${escHtml(b.email||'')}</td>
        <td style="font-size:.85rem;">${b.preferredDate ? fmtDate(b.preferredDate) : '—'}</td>
        <td>
          <select class="bkStatus" data-id="${b.id}">
            ${['pending','confirmed','completed','cancelled'].map(s =>
              `<option value="${s}" ${b.status===s?'selected':''}>${s}</option>`).join('')}
          </select>
        </td>
        <td>
          <input type="text" class="bkAssign" data-id="${b.id}"
            value="${escHtml(b.assignedTo||'')}"
            placeholder="Pastor name"
            style="border:1px solid var(--gray-light);border-radius:4px;padding:.25rem .4rem;width:110px;font-size:.82rem;">
        </td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="openBookingNote('${b.id}','${escHtml((b.adminNotes||'').replace(/'/g,'\\'+"'"))}')">
            Notes${b.adminNotes ? ' 📝' : ''}
          </button>
        </td>
      </tr>`).join('')}
      </tbody>
    </table></div>
    <div id="bookingNoteWrap" style="margin-top:1rem;"></div>`;

  document.querySelectorAll('.bkStatus').forEach(sel => {
    sel.addEventListener('change', async () => {
      try { await Api.bookings.update(sel.dataset.id, { status: sel.value }); flash('Status updated. Member notified.'); }
      catch (e) { flash(e.message, 'error'); }
    });
  });
  document.querySelectorAll('.bkAssign').forEach(inp => {
    inp.addEventListener('blur', async () => {
      try { await Api.bookings.update(inp.dataset.id, { assignedTo: inp.value }); flash('Assignment saved.'); }
      catch (e) { flash(e.message, 'error'); }
    });
  });
}

function openBookingNote(id, existing) {
  const wrap = document.getElementById('bookingNoteWrap');
  wrap.innerHTML = `
    <div class="app-form wide">
      <h4>Admin Notes</h4>
      <textarea id="bnText" style="width:100%;min-height:80px;">${escHtml(existing)}</textarea>
      <div style="display:flex;gap:.5rem;margin-top:.5rem;">
        <button class="btn btn-primary btn-sm" onclick="saveBookingNote('${id}')">Save</button>
        <button class="btn btn-outline btn-sm" onclick="document.getElementById('bookingNoteWrap').innerHTML=''">Close</button>
      </div>
    </div>`;
}

async function saveBookingNote(id) {
  try {
    await Api.bookings.update(id, { adminNotes: document.getElementById('bnText').value });
    flash('Note saved.'); document.getElementById('bookingNoteWrap').innerHTML = '';
  } catch (e) { flash(e.message, 'error'); }
}

// ========================== PRAYER ==========================
async function renderPrayer() {
  const { data } = await Api.prayer.list();
  const urgent = data.filter(p => p.isUrgent);
  viewContainer.innerHTML = `
    <h2 class="section-title">Prayer Requests (${data.length})</h2>
    ${urgent.length ? `<div class="alert alert-error">⚠️ ${urgent.length} URGENT request(s) need attention</div>` : ''}
    <table class="data-table">
      <thead><tr><th>From</th><th>Request</th><th>Urgent</th><th>Status</th><th>Public</th><th>Submitted</th></tr></thead>
      <tbody>
      ${data.map(p => `<tr style="background:${p.isUrgent?'#fff8f0':''};">
        <td>${p.isAnonymous ? '<em style="color:var(--gray);">Anonymous</em>' : escHtml(p.fullName||'Unknown')}</td>
        <td style="max-width:260px;font-size:.85rem;">${escHtml(p.request)}</td>
        <td>${p.isUrgent ? '<span style="color:var(--accent);font-weight:700;">⚠️</span>' : ''}</td>
        <td>
          <select class="prStatus" data-id="${p.id}">
            ${['new','in_prayer','answered','archived'].map(s =>
              `<option value="${s}" ${p.status===s?'selected':''}>${s.replace('_',' ')}</option>`).join('')}
          </select>
        </td>
        <td>${p.isPublicOnWall ? '✅' : '—'}</td>
        <td style="font-size:.82rem;">${fmtDate(p.createdAt)}</td>
      </tr>`).join('')}
      </tbody>
    </table>`;

  document.querySelectorAll('.prStatus').forEach(sel => {
    sel.addEventListener('change', async () => {
      try {
        await Api.prayer.update(sel.dataset.id, { status: sel.value });
        flash('Updated. Member notified if registered.');
      } catch (e) { flash(e.message, 'error'); }
    });
  });
}

// ========================== GALLERY ==========================
async function renderGallery() {
  const { data } = await Api.gallery.list('?limit=100');
  viewContainer.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
      <h2 class="section-title">Gallery (${data.length} items)</h2>
      <button class="btn btn-primary btn-sm" onclick="openGalleryForm()">+ Add Item</button>
    </div>
    <div id="galFormWrap"></div>
    <div class="grid grid-3">
    ${data.map(g => `
      <div class="card">
        ${g.type === 'video'
          ? `<video src="${g.url}" style="width:100%;height:140px;object-fit:cover;background:#000;"></video>`
          : `<img src="${g.url}" style="height:140px;object-fit:cover;width:100%;" alt="${escHtml(g.title||'')}" onerror="this.src='https://placehold.co/400x140?text=Image';">`}
        <div class="card-body">
          <strong>${escHtml(g.title||'Untitled')}</strong>
          <p class="card-meta">${escHtml(g.album||'')} · ${g.type}</p>
          <button class="btn btn-sm btn-danger" onclick="deleteGallery('${g.id}')">Delete</button>
        </div>
      </div>`).join('')}
    </div>`;
}

function openGalleryForm() {
  document.getElementById('galFormWrap').innerHTML = `
    <form id="galForm" class="app-form wide" style="margin-bottom:1.5rem;">
      <h3>Add Gallery Item</h3>
      <div id="galAlert"></div>
      <div class="form-row">
        <div class="form-group"><label>Title</label><input name="title"></div>
        <div class="form-group"><label>Album</label><input name="album" placeholder="e.g. Easter 2024"></div>
        <div class="form-group"><label>Type</label>
          <select name="type"><option value="photo">Photo</option><option value="video">Video</option></select>
        </div>
      </div>
      <div class="form-group"><label>File URL *</label>
        <input name="url" required placeholder="https://… (upload via /api/upload first)"></div>
      <div style="display:flex;gap:.5rem;">
        <button class="btn btn-primary" type="submit">Add</button>
        <button class="btn btn-outline" type="button"
          onclick="document.getElementById('galFormWrap').innerHTML=''">Cancel</button>
      </div>
    </form>`;

  document.getElementById('galForm').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target;
    try {
      await Api.gallery.create({ title:f.title.value, album:f.album.value, type:f.type.value, url:f.url.value });
      flash('Added to gallery.'); renderGallery();
    } catch (err) { showAlert(document.getElementById('galAlert'), err.message); }
  });
}

async function deleteGallery(id) {
  if (!confirm('Delete this gallery item?')) return;
  try { await Api.gallery.remove(id); flash('Deleted.'); renderGallery(); }
  catch (e) { flash(e.message, 'error'); }
}

// ========================== DONATIONS ==========================
async function renderDonations() {
  if (!Auth.isAdmin()) {
    viewContainer.innerHTML = '<p class="alert alert-error">Admin access required to view donation reports.</p>';
    return;
  }
  const { data, totalCompleted } = await Api.donations.list();
  viewContainer.innerHTML = `
    <h2 class="section-title">Donation Reports</h2>
    <div class="stat-grid">
      ${sc(data.length, 'Total Records')}
      ${sc(data.filter(d=>d.status==='completed').length, 'Completed')}
      ${sc(data.filter(d=>d.status==='pending').length, 'Pending')}
      ${sc(fmtMoney(totalCompleted), '💛 Total Collected')}
    </div>
    <div style="overflow-x:auto;">
    <table class="data-table">
      <thead><tr><th>Date</th><th>Donor</th><th>Type</th><th>Amount</th><th>Method</th><th>Receipt/Ref</th><th>Status</th><th></th></tr></thead>
      <tbody>
      ${data.map(d => `<tr>
        <td style="font-size:.82rem;">${fmtDate(d.createdAt)}</td>
        <td>${d.isAnonymous ? '<em>Anonymous</em>' : escHtml(d.donorName||'—')}</td>
        <td>${d.type}</td>
        <td><strong>${fmtMoney(d.amount, d.currency)}</strong></td>
        <td>${d.method}</td>
        <td style="font-size:.78rem;">${escHtml(d.receiptNumber||d.transactionRef||'—')}</td>
        <td><span class="badge badge-${d.status}">${d.status}</span></td>
        <td>
          ${d.status==='pending'
            ? `<button class="btn btn-sm btn-primary" onclick="confirmDonation('${d.id}')">Confirm</button>`
            : ''}
        </td>
      </tr>`).join('')}
      </tbody>
    </table></div>`;
}

async function confirmDonation(id) {
  const ref = prompt('Enter M-Pesa/transaction reference (optional):');
  try {
    await Api.donations.confirm(id, { transactionRef: ref || '' });
    flash('✅ Donation confirmed. Member receipt notification sent.'); renderDonations();
  } catch (e) { flash(e.message, 'error'); }
}

// ========================== CONTACT ==========================
async function renderContact() {
  const { data } = await Api.contact.list();
  viewContainer.innerHTML = `
    <h2 class="section-title">Contact Messages (${data.filter(m=>!m.isRead).length} unread)</h2>
    <table class="data-table">
      <thead><tr><th>Date</th><th>Name</th><th>Email</th><th>Subject</th><th>Message</th><th></th></tr></thead>
      <tbody>
      ${data.map(m => `<tr style="background:${m.isRead?'#fff':'#f0f7f0'};">
        <td style="font-size:.82rem;">${fmtDate(m.createdAt)}</td>
        <td>${escHtml(m.name)}</td>
        <td style="font-size:.82rem;">${escHtml(m.email)}</td>
        <td>${escHtml(m.subject||'—')}</td>
        <td style="max-width:240px;font-size:.85rem;">${escHtml((m.message||'').slice(0,100))}…</td>
        <td style="white-space:nowrap;">
          ${!m.isRead ? `<button class="btn btn-sm btn-outline" onclick="markContactRead('${m.id}')">✓ Read</button> ` : ''}
          <button class="btn btn-sm btn-danger" onclick="deleteContact('${m.id}')">Delete</button>
        </td>
      </tr>`).join('')}
      </tbody>
    </table>`;
}

async function markContactRead(id) {
  try { await Api.contact.markRead(id); flash('Marked as read.'); renderContact(); }
  catch (e) { flash(e.message, 'error'); }
}
async function deleteContact(id) {
  if (!confirm('Delete this message?')) return;
  try { await Api.contact.remove(id); flash('Deleted.'); renderContact(); }
  catch (e) { flash(e.message, 'error'); }
}

// ========================== NEWSLETTER ==========================
async function renderNewsletter() {
  const { data, total } = await Api.newsletter.list();
  viewContainer.innerHTML = `
    <h2 class="section-title">Newsletter Subscribers (${total} active)</h2>
    <table class="data-table">
      <thead><tr><th>Email</th><th>Name</th><th>Subscribed</th></tr></thead>
      <tbody>
      ${data.map(s => `<tr>
        <td>${escHtml(s.email)}</td>
        <td>${escHtml(s.name||'')}</td>
        <td style="font-size:.85rem;">${fmtDate(s.createdAt)}</td>
      </tr>`).join('')}
      </tbody>
    </table>`;
}

// ========================== BROADCAST ==========================
async function renderBroadcast() {
  if (!Auth.isAtLeast('pastor')) {
    viewContainer.innerHTML = '<p class="alert alert-error">Pastor or higher access required.</p>';
    return;
  }
  viewContainer.innerHTML = `
    <h2 class="section-title">Send Notification to Members</h2>
    <p style="margin-bottom:1.2rem;color:var(--gray);">
      This will create an in-app notification for each matching member
      AND send them an email (if SMTP is configured).
    </p>
    <form id="broadcastForm" class="app-form">
      <div id="broadcastAlert"></div>
      <div class="form-group"><label>Notification Title *</label><input id="bcTitle" required></div>
      <div class="form-group"><label>Message *</label><textarea id="bcMessage" required></textarea></div>
      <div class="form-row">
        <div class="form-group"><label>Type</label>
          <select id="bcType">
            <option value="announcement">Announcement</option>
            <option value="event_reminder">Event Reminder</option>
            <option value="general">General</option>
          </select>
        </div>
        <div class="form-group"><label>Send to Role (blank = all active members)</label>
          <select id="bcRole">
            <option value="">All Members</option>
            <option value="member">Members only</option>
            <option value="leader">Leaders & above</option>
            <option value="pastor">Pastors & above</option>
          </select>
        </div>
      </div>
      <div class="form-group"><label>Deep-Link URL (optional, e.g. /events.html)</label>
        <input id="bcLink" placeholder="/events.html"></div>
      <button class="btn btn-primary btn-block" type="submit">📣 Send to All</button>
    </form>`;

  document.getElementById('broadcastForm').addEventListener('submit', async e => {
    e.preventDefault();
    const alertBox = document.getElementById('broadcastAlert');
    try {
      const res = await Api.notifications.broadcast({
        title:      document.getElementById('bcTitle').value,
        message:    document.getElementById('bcMessage').value,
        type:       document.getElementById('bcType').value,
        targetRole: document.getElementById('bcRole').value || undefined,
        link:       document.getElementById('bcLink').value || undefined,
      });
      showAlert(alertBox, '✅ ' + res.message, 'success');
      e.target.reset();
    } catch (err) { showAlert(alertBox, err.message); }
  });
}

// ========================== QR CODE GENERATOR ==========================
async function renderQRGen() {
  viewContainer.innerHTML = `
    <h2 class="section-title">QR Code — Attendance Check-In</h2>
    <p>Generate a QR code for today's service. Display it at the entrance on a screen or printed sheet.
      Members scan it on their phones (while logged in) to record attendance automatically.</p>
    <button class="btn btn-primary" id="genQRBtn" style="margin:1rem 0;">Generate Today's QR Code</button>
    <div id="qrResult"></div>
    <p style="margin-top:1rem;font-size:.85rem;color:var(--gray);">
      ⏱ Valid for 8 hours from generation. Each member can only check in once per service date.
    </p>`;

  document.getElementById('genQRBtn').addEventListener('click', async () => {
    const wrap = document.getElementById('qrResult');
    wrap.innerHTML = '<p>Generating…</p>';
    try {
      const { checkInUrl, serviceDate } = await Api.qr.generate();

      // Load QRCode.js from CDN
      if (!window.QRCode) {
        await new Promise((res, rej) => {
          const s = document.createElement('script');
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
          s.onload = res; s.onerror = rej;
          document.head.appendChild(s);
        });
      }

      wrap.innerHTML = `
        <div style="text-align:center;padding:2rem;background:#fff;border-radius:var(--radius);
          box-shadow:var(--shadow);max-width:340px;margin:1rem auto;">
          <p style="font-weight:700;font-size:1.1rem;margin-bottom:1rem;">
            📅 Service Date: ${serviceDate}
          </p>
          <div id="qrCanvas" style="display:inline-block;"></div>
          <p style="font-size:.75rem;color:var(--gray);margin-top:.8rem;word-break:break-all;">${checkInUrl}</p>
          <div style="display:flex;gap:.5rem;justify-content:center;margin-top:1rem;">
            <button class="btn btn-outline btn-sm" onclick="window.print()">🖨 Print</button>
            <a class="btn btn-outline btn-sm" href="${checkInUrl}" target="_blank">Test Link</a>
          </div>
        </div>`;

      new QRCode(document.getElementById('qrCanvas'), {
        text: checkInUrl, width: 220, height: 220,
        colorDark: '#1a5c36', colorLight: '#ffffff',
      });
    } catch (e) {
      wrap.innerHTML = `<div class="alert alert-error">${escHtml(e.message)}</div>`;
    }
  });
}

// ========================== TESTIMONIALS ==========================
async function renderTestimonials() {
  const { data } = await Api.testimonials.list('?limit=100');
  viewContainer.innerHTML = `
    <h2 class="section-title">Testimonials (${data.length} total, ${data.filter(t=>!t.isApproved).length} pending)</h2>
    <table class="data-table">
      <thead><tr><th>Name</th><th>Testimony (preview)</th><th>Video?</th><th>Status</th><th></th></tr></thead>
      <tbody>
      ${data.map(t => `<tr style="background:${t.isApproved?'#fff':'#fffbf0'};">
        <td>${escHtml(t.fullName)}</td>
        <td style="max-width:320px;font-size:.85rem;">"${escHtml((t.content||'').slice(0,120))}…"</td>
        <td>${t.videoUrl ? '🎥' : '—'}</td>
        <td>${t.isApproved ? '<span class="badge badge-completed">Approved</span>' : '<span class="badge badge-pending">Pending</span>'}</td>
        <td style="white-space:nowrap;">
          ${!t.isApproved ? `<button class="btn btn-sm btn-primary" onclick="approveTestimonial('${t.id}')">✅ Approve</button> ` : ''}
          <button class="btn btn-sm btn-danger" onclick="deleteTestimonial('${t.id}')">Delete</button>
        </td>
      </tr>`).join('')}
      </tbody>
    </table>`;
}

async function approveTestimonial(id) {
  try { await Api.testimonials.update(id, { isApproved: true }); flash('Testimonial approved and is now public.'); renderTestimonials(); }
  catch (e) { flash(e.message, 'error'); }
}
async function deleteTestimonial(id) {
  if (!confirm('Delete this testimonial?')) return;
  try { await Api.testimonials.remove(id); flash('Deleted.'); renderTestimonials(); }
  catch (e) { flash(e.message, 'error'); }
}

// ========================== WORKFLOW REQUESTS ==========================
async function renderWorkflows() {
  const [templatesRes, requestsRes] = await Promise.all([
    Api.workflowTemplates.list(),
    Api.workflowRequests.list('?pendingForMe=true'),
  ]);
  const templates = templatesRes.data;
  const pending = requestsRes.data;

  viewContainer.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:.6rem;">
      <h2 class="section-title">Workflow Requests</h2>
      <select id="wfViewFilter" style="padding:.4rem .6rem;border:1px solid var(--gray-light);border-radius:var(--radius);">
        <option value="pending">Awaiting my action (${pending.length})</option>
        <option value="all">All requests</option>
      </select>
    </div>
    <p style="color:var(--gray);font-size:.82rem;margin-bottom:.8rem;">
      Each request moves through the steps defined by its workflow template (e.g. Baptism Request: Secretary → Pastor).
      You'll only see requests here where the current step matches your role/permission.
    </p>
    <div id="wfList"></div>`;

  async function loadRequests(mode) {
    const list = document.getElementById('wfList');
    list.innerHTML = '<p>Loading…</p>';
    const { data } = mode === 'all' ? await Api.workflowRequests.list() : { data: pending };
    if (!data.length) {
      list.innerHTML = '<p style="color:var(--gray);">Nothing here right now.</p>';
      return;
    }
    list.innerHTML = data.map(r => `
      <div class="card" style="margin-bottom:.8rem;"><div class="card-body">
        <div style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:.5rem;">
          <div>
            <h3>${escHtml(r.template.name)}</h3>
            <p class="card-meta">For: ${escHtml(r.subject.firstName)} ${escHtml(r.subject.lastName)} &nbsp;|&nbsp;
              Submitted by: ${escHtml(r.submittedBy.firstName)} ${escHtml(r.submittedBy.lastName)}</p>
            <p class="card-meta">Status: <span class="badge ${r.status === 'completed' ? 'badge-completed' : r.status === 'rejected' ? 'badge-declined' : 'badge-pending'}">${r.status}</span>
              ${r.status === 'in_progress' ? ` — current step: <strong>${escHtml(r.template.steps[r.currentStep]?.name || '')}</strong>` : ''}</p>
          </div>
          ${r.status === 'in_progress' ? `
            <div style="display:flex;gap:.5rem;">
              <button class="btn btn-sm btn-primary" onclick="advanceWorkflow('${r.id}','approved','${mode}')">Approve</button>
              <button class="btn btn-sm btn-danger" onclick="advanceWorkflow('${r.id}','rejected','${mode}')">Reject</button>
            </div>` : ''}
        </div>
        ${r.history.length ? `
          <details style="margin-top:.6rem;"><summary style="cursor:pointer;font-size:.85rem;color:var(--gray);">History (${r.history.length})</summary>
            <ul style="font-size:.85rem;margin-top:.4rem;">
              ${r.history.map(h => `<li>${escHtml(h.stepName)} — ${h.decision} by ${escHtml(h.actedBy.firstName)} ${escHtml(h.actedBy.lastName)}${h.notes ? ': ' + escHtml(h.notes) : ''}</li>`).join('')}
            </ul>
          </details>` : ''}
      </div></div>`).join('');
  }

  document.getElementById('wfViewFilter').addEventListener('change', (e) => loadRequests(e.target.value));
  loadRequests('pending');

  window.advanceWorkflow = async function advanceWorkflow(id, decision, mode) {
    const notes = decision === 'rejected' ? prompt('Reason for rejecting (optional):') || '' : '';
    try {
      await Api.workflowRequests.advance(id, { decision, notes });
      flash(`Request ${decision}.`);
      renderWorkflows();
    } catch (e) { flash(e.message, 'error'); }
  };
}

// ========================== AUDIT LOG ==========================
async function renderAuditLog() {
  const { data } = await Api.auditLogs.list('?limit=100');
  viewContainer.innerHTML = `
    <h2 class="section-title">Audit Log</h2>
    <p style="color:var(--gray);font-size:.82rem;margin-bottom:1rem;">
      A read-only record of who changed or removed what. This list can't be edited from here — that's the point of an audit trail.
    </p>
    <div style="overflow-x:auto;">
    <table class="data-table">
      <thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Entity</th></tr></thead>
      <tbody>${data.length ? data.map(l => `
        <tr>
          <td style="font-size:.82rem;white-space:nowrap;">${fmtDate(l.createdAt)}</td>
          <td>${l.actor ? escHtml(l.actor.firstName + ' ' + l.actor.lastName) : 'System'}</td>
          <td><code>${escHtml(l.action)}</code></td>
          <td style="font-size:.82rem;">${escHtml(l.entityType)}${l.entityId ? ' #' + l.entityId.slice(0, 8) : ''}</td>
        </tr>`).join('') : '<tr><td colspan="4" style="text-align:center;color:var(--gray);">No activity recorded yet.</td></tr>'}</tbody>
    </table></div>`;
}

// ========================== DELETED MEMBERS (super_admin only) ==========================
async function renderDeletedMembers() {
  const { data } = await Api.membersExtras.deleted();
  viewContainer.innerHTML = `
    <h2 class="section-title">Deleted Members (${data.length})</h2>
    <p style="color:var(--gray);font-size:.82rem;margin-bottom:1rem;">
      Removing a member is a soft-delete — their record is kept, just hidden from the normal directory. Restore reactivates their account and login.
    </p>
    <table class="data-table">
      <thead><tr><th>Name</th><th>Email</th><th>Deleted At</th><th></th></tr></thead>
      <tbody>${data.length ? data.map(m => `
        <tr>
          <td>${escHtml(m.firstName)} ${escHtml(m.lastName)}</td>
          <td style="font-size:.85rem;">${escHtml(m.email)}</td>
          <td style="font-size:.85rem;">${fmtDate(m.deletedAt)}</td>
          <td><button class="btn btn-sm btn-primary" onclick="restoreMember('${m.id}')">Restore</button></td>
        </tr>`).join('') : '<tr><td colspan="4" style="text-align:center;color:var(--gray);">No deleted members.</td></tr>'}</tbody>
    </table>`;
}

async function restoreMember(id) {
  if (!confirm('Restore this member\'s account?')) return;
  try {
    await Api.membersExtras.restore(id);
    flash('Member restored.');
    renderDeletedMembers();
  } catch (e) { flash(e.message, 'error'); }
}

// ========================== ROLES & PERMISSIONS ==========================
async function renderRoles() {
  const { data } = await Api.roles.list();
  const { roles, permissions } = data;
  const permKeys = Object.values(permissions);
  const permLabel = (p) => p.replace(/_/g, ' ');

  viewContainer.innerHTML = `
    <h2 class="section-title">Roles & Permissions (${roles.length} job titles)</h2>
    <p style="color:var(--gray);font-size:.88rem;margin-bottom:1rem;">
      This is the live permission matrix from the backend (config/permissions.js) — not editable here.
      To assign someone a job title, go to <a href="#" onclick="document.querySelector('[data-view=members]').click();return false;">Members</a>
      and set their "Job Title" column. Each title also carries a base access tier
      (member/leader/pastor/admin/super_admin) shown in parentheses.
    </p>
    <div style="overflow-x:auto;max-height:70vh;">
    <table class="data-table" style="font-size:.78rem;">
      <thead><tr style="position:sticky;top:0;background:#fff;">
        <th style="text-align:left;min-width:160px;">Role</th>
        ${permKeys.map(p => `<th style="writing-mode:vertical-rl;text-orientation:mixed;padding:.4rem .3rem;font-weight:500;">${permLabel(p)}</th>`).join('')}
      </tr></thead>
      <tbody>
      ${roles.map(r => `
        <tr>
          <td style="white-space:nowrap;font-weight:600;">${escHtml(r.label)}<br><span style="font-weight:400;color:var(--gray);font-size:.75rem;">${r.tier}</span></td>
          ${permKeys.map(p => `<td style="text-align:center;">${r.permissions.includes(p) ? '✅' : ''}</td>`).join('')}
        </tr>`).join('')}
      </tbody>
    </table></div>`;
}

// ========================== MINISTRY TASKS ==========================
async function renderMinistryTasks() {
  const [ministriesRes, membersRes] = await Promise.all([
    Api.ministries.list('?limit=100'),
    Api.members.list('?limit=200').catch(() => ({ data: [] })), // leader-tier can read, but fail soft either way
  ]);
  const ministries = ministriesRes.data;
  const members = membersRes.data;
  // A plain leader-tier user is scoped server-side to their own ministry;
  // default the filter to that ministry so they're not staring at a 403 by
  // picking the wrong one. Pastor+ defaults to "all".
  const defaultMinistryId = !Auth.isAtLeast('pastor') && user.ministryId ? user.ministryId : '';

  async function loadTasks(ministryId) {
    const qs = ministryId ? `?ministryId=${ministryId}` : '';
    const { data } = await Api.ministryTasks.list(qs);
    const tbody = document.getElementById('taskTableBody');
    tbody.innerHTML = data.length ? data.map(t => `
      <tr>
        <td>${escHtml(t.title)}</td>
        <td style="font-size:.85rem;">${escHtml(ministries.find(m => m.id === t.ministryId)?.name || '')}</td>
        <td style="font-size:.85rem;">${t.assignedTo ? escHtml(t.assignedTo.firstName + ' ' + t.assignedTo.lastName) : '—'}</td>
        <td style="font-size:.85rem;">${fmtDate(t.serviceDate)}</td>
        <td>
          <select class="taskStatusSelect" data-id="${t.id}">
            ${['pending','in_progress','completed'].map(s => `<option value="${s}" ${t.status===s?'selected':''}>${s.replace('_',' ')}</option>`).join('')}
          </select>
        </td>
        <td><button class="btn btn-sm btn-danger" onclick="deleteMinistryTask('${t.id}','${ministryId||''}')">Delete</button></td>
      </tr>`).join('') : `<tr><td colspan="6" style="text-align:center;color:var(--gray);padding:1rem;">No tasks yet.</td></tr>`;

    tbody.querySelectorAll('.taskStatusSelect').forEach(sel => {
      sel.addEventListener('change', async () => {
        try {
          // Backend allows a task's assignee to update just `status` even
          // without full manage permission — so this same control works for
          // both a ministry leader and the volunteer a task is assigned to.
          await Api.ministryTasks.update(sel.dataset.id, { status: sel.value });
          flash('Task status updated.');
        } catch (e) { flash(e.message, 'error'); sel.value = sel.dataset.prev || sel.value; }
      });
    });
  }

  viewContainer.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:.6rem;">
      <h2 class="section-title">Ministry Tasks</h2>
      <div style="display:flex;gap:.6rem;align-items:center;">
        <select id="taskMinistryFilter" style="padding:.4rem .6rem;border:1px solid var(--gray-light);border-radius:var(--radius);">
          <option value="">All ministries</option>
          ${ministries.map(m => `<option value="${m.id}" ${defaultMinistryId===m.id?'selected':''}>${escHtml(m.name)}</option>`).join('')}
        </select>
        <button class="btn btn-primary btn-sm" onclick="openTaskForm()">+ Add Task</button>
      </div>
    </div>
    <p style="color:var(--gray);font-size:.82rem;margin-bottom:.8rem;">
      Only ministry leads (and up) can create or reassign tasks. A task's assignee can always mark their own task's status,
      even without that permission — e.g. a camera operator can tick "Camera Setup" done without being able to create new tasks.
    </p>
    <div id="taskFormWrap"></div>
    <div style="overflow-x:auto;">
    <table class="data-table">
      <thead><tr><th>Title</th><th>Ministry</th><th>Assigned To</th><th>Service Date</th><th>Status</th><th></th></tr></thead>
      <tbody id="taskTableBody"><tr><td colspan="6">Loading…</td></tr></tbody>
    </table></div>`;

  document.getElementById('taskMinistryFilter').addEventListener('change', (e) => loadTasks(e.target.value));

  window.openTaskForm = function openTaskForm() {
    document.getElementById('taskFormWrap').innerHTML = `
      <form id="taskForm" class="app-form wide" style="margin-bottom:1.5rem;">
        <h3>Add Ministry Task</h3>
        <div id="taskAlert"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
          <div class="form-group"><label>Title</label><input type="text" name="title" required></div>
          <div class="form-group"><label>Ministry</label>
            <select name="ministryId" required>
              <option value="">— select —</option>
              ${ministries.map(m => `<option value="${m.id}" ${defaultMinistryId===m.id?'selected':''}>${escHtml(m.name)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group"><label>Assign To</label>
            <select name="assignedToUserId">
              <option value="">— unassigned —</option>
              ${members.map(m => `<option value="${m.id}">${escHtml(m.firstName)} ${escHtml(m.lastName)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group"><label>Service Date</label><input type="date" name="serviceDate"></div>
          <div class="form-group" style="grid-column:1/-1;"><label>Notes</label><textarea name="notes"></textarea></div>
        </div>
        <div style="display:flex;gap:.6rem;margin-top:.8rem;">
          <button class="btn btn-primary" type="submit">Create Task</button>
          <button class="btn btn-outline" type="button" onclick="document.getElementById('taskFormWrap').innerHTML=''">Cancel</button>
        </div>
      </form>`;
    document.getElementById('taskForm').addEventListener('submit', async e => {
      e.preventDefault();
      const f = e.target;
      const payload = {
        title: f.elements.title.value,
        ministryId: f.elements.ministryId.value,
        assignedToUserId: f.elements.assignedToUserId.value || null,
        serviceDate: f.elements.serviceDate.value || null,
        notes: f.elements.notes.value || null,
      };
      try {
        await Api.ministryTasks.create(payload);
        flash('Task created.');
        document.getElementById('taskFormWrap').innerHTML = '';
        loadTasks(document.getElementById('taskMinistryFilter').value);
      } catch (err) { showAlert(document.getElementById('taskAlert'), err.message); }
    });
  };

  loadTasks(defaultMinistryId);
}

async function deleteMinistryTask(id, ministryId) {
  if (!confirm('Delete this task?')) return;
  try {
    await Api.ministryTasks.remove(id);
    flash('Task deleted.');
    renderMinistryTasks();
  } catch (e) { flash(e.message, 'error'); }
}

// ========================== GENERIC CRUD FACTORY ==========================
// Each config: { title, api, columns: [[key,label,fmtFn?]], fields: [{k,type,label,req?,options?}] }
const sermonCfg = {
  title: 'Sermons', api: Api.sermons,
  columns: [['title','Title'],['preacher','Preacher'],['sermonDate','Date',fmtDate],['isPublished','Live?',v=>v?'✅':'❌']],
  fields: [
    {k:'title',type:'text',label:'Title',req:true},
    {k:'preacher',type:'text',label:'Preacher',req:true},
    {k:'sermonDate',type:'date',label:'Sermon Date',req:true},
    {k:'series',type:'text',label:'Series'}, {k:'topic',type:'text',label:'Topic'},
    {k:'bibleReferences',type:'text',label:'Bible References'},
    {k:'videoUrl',type:'text',label:'Video URL (YouTube embed or direct)'},
    {k:'audioUrl',type:'text',label:'Audio URL'},
    {k:'thumbnailUrl',type:'text',label:'Thumbnail URL'},
    {k:'description',type:'textarea',label:'Description'},
    {k:'sermonNotes',type:'textarea',label:'Sermon Notes'},
    {k:'isPublished',type:'checkbox',label:'Published (visible to public)'},
  ],
};
const ministryCfg = {
  title: 'Ministries', api: Api.ministries,
  columns: [['name','Name'],['leaderName','Leader'],['meetingSchedule','Schedule'],['isActive','Active',v=>v?'✅':'❌']],
  fields: [
    {k:'name',type:'text',label:'Name',req:true},
    {k:'slug',type:'text',label:'URL Slug (unique, no spaces)',req:true},
    {k:'leaderName',type:'text',label:'Leader Name'},
    {k:'leaderContact',type:'text',label:'Leader Contact'},
    {k:'meetingSchedule',type:'text',label:'Meeting Schedule'},
    {k:'image',type:'text',label:'Image URL'},
    {k:'description',type:'textarea',label:'Description'},
    {k:'isActive',type:'checkbox',label:'Active'},
  ],
  // Only pastors+ can create new ministries; a leader may only edit the one they lead.
  canCreate: () => Auth.isAtLeast('pastor'),
  canEditItem: (item) => Auth.isAtLeast('pastor') || item.id === user.ministryId,
};
const announcementCfg = {
  title: 'Announcements', api: Api.announcements,
  columns: [['title','Title'],['type','Type'],['isPinned','Pinned',v=>v?'📌':''],['isPublished','Live?',v=>v?'✅':'❌']],
  fields: [
    {k:'title',type:'text',label:'Title',req:true},
    {k:'type',type:'select',label:'Type',options:['news','pastor_message','bulletin','special']},
    {k:'content',type:'textarea',label:'Content',req:true},
    {k:'image',type:'text',label:'Image URL'},
    {k:'isPinned',type:'checkbox',label:'Pin to top'},
    {k:'isPublished',type:'checkbox',label:'Published'},
  ],
};
const blogCfg = {
  title: 'Blog / Devotionals', api: Api.blog,
  columns: [['title','Title'],['category','Category'],['authorName','Author'],['isPublished','Live?',v=>v?'✅':'❌']],
  fields: [
    {k:'title',type:'text',label:'Title',req:true},
    {k:'slug',type:'text',label:'URL Slug (unique)',req:true},
    {k:'category',type:'select',label:'Category',options:['devotional','bible_study','article','testimony']},
    {k:'authorName',type:'text',label:'Author Name'},
    {k:'bibleVerse',type:'text',label:'Key Bible Verse'},
    {k:'coverImage',type:'text',label:'Cover Image URL'},
    {k:'content',type:'textarea',label:'Content (HTML or plain text)',req:true},
    {k:'isPublished',type:'checkbox',label:'Published'},
  ],
};
const livestreamCfg = {
  title: 'Live Streams', api: Api.livestreams,
  columns: [['title','Title'],['status','Status'],['scheduledStart','Scheduled',fmtDateTime]],
  fields: [
    {k:'title',type:'text',label:'Title',req:true},
    {k:'streamUrl',type:'text',label:'Stream Embed URL (YouTube/Facebook embed)',req:true},
    {k:'scheduledStart',type:'datetime-local',label:'Scheduled Start',req:true},
    {k:'status',type:'select',label:'Status',options:['scheduled','live','ended']},
    {k:'recordingUrl',type:'text',label:'Recording URL (after stream ends)'},
  ],
};
const leadershipCfg = {
  title: 'Leadership Team', api: Api.leadership,
  columns: [['fullName','Name'],['title','Title'],['displayOrder','Order'],['isActive','Active',v=>v?'✅':'❌']],
  fields: [
    {k:'fullName',type:'text',label:'Full Name',req:true},
    {k:'title',type:'text',label:'Title (e.g. Senior Pastor)',req:true},
    {k:'bio',type:'textarea',label:'Short Bio'},
    {k:'photo',type:'text',label:'Photo URL'},
    {k:'email',type:'text',label:'Email'},
    {k:'phone',type:'text',label:'Phone'},
    {k:'servingSince',type:'date',label:'Serving Since (years-serving is calculated automatically)'},
    {k:'skills',type:'taglist',label:'Skills'},
    {k:'responsibilities',type:'taglist',label:'Responsibilities'},
    {k:'acceptsAppointments',type:'checkbox',label:'Accept "Book Appointment" requests from members'},
    {k:'displayOrder',type:'number',label:'Display Order (lower = first)'},
    {k:'isActive',type:'checkbox',label:'Active / Show on website'},
  ],
};
const bibleVerseCfg = {
  title: 'Daily Bible Verses', api: Api.bible,
  columns: [['reference','Reference'],['translation','Translation'],['isActive','Active',v=>v?'✅':'❌']],
  fields: [
    {k:'reference',type:'text',label:'Reference (e.g. John 3:16)',req:true},
    {k:'text',type:'textarea',label:'Verse Text',req:true},
    {k:'translation',type:'text',label:'Translation (e.g. NIV, KJV, SUV)'},
    {k:'isActive',type:'checkbox',label:'Include in rotation'},
  ],
};
const libraryCfg = {
  title: 'Document Library', api: Api.library,
  columns: [['title','Title'],['category','Category'],['isPublic','Public',v=>v?'✅':'🔒'],['downloadCount','Downloads']],
  fields: [
    {k:'title',type:'text',label:'Title',req:true},
    {k:'category',type:'select',label:'Category',options:['constitution','minutes','sermon_notes','bible_study','policy','forms','other']},
    {k:'description',type:'textarea',label:'Description'},
    {k:'fileUrl',type:'text',label:'File URL (upload via /api/upload first)',req:true},
    {k:'fileType',type:'text',label:'File Type (e.g. pdf, docx)'},
    {k:'isPublic',type:'checkbox',label:'Publicly visible (unchecked = members only)'},
  ],
};
const choirCfg = {
  title: 'Choir Members', api: Api.choir,
  columns: [['fullName','Name'],['voicePart','Voice Part'],['instruments','Instruments'],['isActive','Active',v=>v?'✅':'❌']],
  fields: [
    {k:'fullName',type:'text',label:'Full Name',req:true},
    {k:'email',type:'text',label:'Email'},
    {k:'phone',type:'text',label:'Phone'},
    {k:'voicePart',type:'select',label:'Voice Part',options:['soprano','alto','tenor','bass','other']},
    {k:'instruments',type:'text',label:'Instruments played'},
    {k:'isActive',type:'checkbox',label:'Active member'},
  ],
};
const inventoryCfg = {
  title: 'Inventory', api: Api.inventory,
  columns: [['name','Item'],['category','Category'],['quantity','Qty'],['condition','Condition'],['location','Location']],
  fields: [
    {k:'name',type:'text',label:'Item Name',req:true},
    {k:'category',type:'text',label:'Category (e.g. Audio Equipment, Furniture)'},
    {k:'quantity',type:'number',label:'Quantity'},
    {k:'description',type:'textarea',label:'Description'},
    {k:'condition',type:'select',label:'Condition',options:['excellent','good','fair','poor','needs_repair']},
    {k:'location',type:'text',label:'Storage Location'},
    {k:'serialNumber',type:'text',label:'Serial / Asset Number'},
    {k:'purchaseDate',type:'date',label:'Purchase Date'},
    {k:'purchaseValue',type:'number',label:'Purchase Value (KES)'},
    {k:'notes',type:'textarea',label:'Notes / Maintenance Log'},
  ],
};
const projectCfg = {
  title: 'Projects', api: Api.projects,
  columns: [
    ['title','Title'],
    ['status','Status'],
    ['budget','Budget', v => fmtMoney(v)],
    ['completedPercent','Complete', v => `${v || 0}%`],
    ['responsibleParty','Responsible'],
  ],
  fields: [
    {k:'title',type:'text',label:'Title',req:true},
    {k:'description',type:'textarea',label:'Description'},
    {k:'responsibleParty',type:'text',label:'Responsible Party (e.g. Building Committee)'},
    {k:'budget',type:'number',label:'Budget (KES)'},
    {k:'amountSpent',type:'number',label:'Amount Spent So Far (KES)'},
    {k:'completedPercent',type:'number',label:'Percent Complete (0–100)'},
    {k:'status',type:'select',label:'Status',options:['planning','in_progress','on_hold','completed','cancelled']},
    {k:'startDate',type:'date',label:'Start Date'},
    {k:'targetEndDate',type:'date',label:'Target End Date'},
  ],
  // Everyone with access to the Projects nav item is pastor-tier+ already
  // (see data-minrole="pastor" in index.html); MANAGE_PROJECTS is enforced
  // server-side on top of that for granular roles like church_secretary.
  canCreate: () => Auth.isAtLeast('pastor'),
};

// Shared current config state
let _cfg = null;

async function renderCrud(config) {
  _cfg = config;
  const { data } = await config.api.list('?limit=200');
  const canCreate = config.canCreate ? config.canCreate() : true;
  const canEditItem = config.canEditItem || (() => true);
  viewContainer.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
      <h2 class="section-title">${config.title} (${data.length})</h2>
      ${canCreate ? `<button class="btn btn-primary btn-sm" onclick="openCrudForm()">+ Add New</button>` : ''}
    </div>
    <div id="crudFormWrap"></div>
    <div style="overflow-x:auto;">
    <table class="data-table">
      <thead><tr>
        ${config.columns.map(c => `<th>${c[1]}</th>`).join('')}
        <th></th>
      </tr></thead>
      <tbody>
      ${data.map(item => `<tr>
        ${config.columns.map(([key,,fmt]) =>
          `<td>${fmt
            ? fmt(item[key])
            : (typeof item[key] === 'boolean'
                ? (item[key] ? '✅' : '❌')
                : escHtml(String(item[key] ?? '')))
          }</td>`).join('')}
        <td style="white-space:nowrap;">
          ${canEditItem(item)
            ? `<button class="btn btn-sm btn-outline"
                onclick='openCrudForm(${JSON.stringify(item).replace(/'/g,"&#39;")})'>Edit</button>
              <button class="btn btn-sm btn-danger"
                onclick="deleteCrudItem('${item.id}')">Delete</button>`
            : `<span style="color:var(--gray);font-size:.8rem;" title="Not your ministry">🔒</span>`}
        </td>
      </tr>`).join('')}
      </tbody>
    </table></div>`;
}

function openCrudForm(item = null) {
  const config = _cfg;
  document.getElementById('crudFormWrap').innerHTML = `
    <form id="crudForm" class="app-form wide" style="margin-bottom:1.5rem;">
      <h3>${item ? 'Edit' : 'Add'} ${config.title.replace(/\s.*$/,'')}</h3>
      <div id="crudAlert"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
        ${config.fields.map(f => {
          const v = item ? (item[f.k] ?? '') : '';
          if (f.type === 'textarea')
            return `<div class="form-group" style="grid-column:1/-1;">
              <label>${f.label}</label>
              <textarea name="${f.k}" ${f.req?'required':''}>${escHtml(String(v))}</textarea>
            </div>`;
          if (f.type === 'select')
            return `<div class="form-group"><label>${f.label}</label>
              <select name="${f.k}">${(f.options||[]).map(o =>
                `<option value="${o}" ${v===o?'selected':''}>${o.replace(/_/g,' ')}</option>`).join('')}
              </select></div>`;
          if (f.type === 'checkbox')
            return `<div class="form-group form-check">
              <input type="checkbox" name="${f.k}" id="cfi_${f.k}" ${v?'checked':''}>
              <label for="cfi_${f.k}" style="margin:0;">${f.label}</label>
            </div>`;
          if (f.type === 'taglist') {
            const display = Array.isArray(v) ? v.join(', ') : String(v || '');
            return `<div class="form-group" style="grid-column:1/-1;">
              <label>${f.label} <span style="font-weight:400;color:var(--gray);font-size:.8rem;">(comma-separated)</span></label>
              <input name="${f.k}" value="${escHtml(display)}" placeholder="e.g. Preaching, Leadership Training, Counselling">
            </div>`;
          }
          let dv = v;
          if (f.type === 'datetime-local' && v) dv = new Date(v).toISOString().slice(0,16);
          if (f.type === 'date' && v) dv = new Date(v).toISOString().slice(0,10);
          return `<div class="form-group"><label>${f.label}</label>
            <input type="${f.type||'text'}" name="${f.k}" value="${escHtml(String(dv))}"
              ${f.req?'required':''}></div>`;
        }).join('')}
      </div>
      <div style="display:flex;gap:.6rem;margin-top:.8rem;">
        <button class="btn btn-primary" type="submit">${item ? 'Save Changes' : 'Create'}</button>
        <button class="btn btn-outline" type="button"
          onclick="document.getElementById('crudFormWrap').innerHTML=''">Cancel</button>
      </div>
    </form>`;

  document.getElementById('crudForm').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target;
    const payload = {};
    config.fields.forEach(fd => {
      if (fd.type === 'checkbox') payload[fd.k] = f.elements[fd.k].checked;
      else if (fd.type === 'number') payload[fd.k] = f.elements[fd.k].value ? Number(f.elements[fd.k].value) : null;
      else if (fd.type === 'taglist') payload[fd.k] = f.elements[fd.k].value.split(',').map(s => s.trim()).filter(Boolean);
      else payload[fd.k] = f.elements[fd.k].value;
    });
    try {
      item ? await config.api.update(item.id, payload) : await config.api.create(payload);
      flash(`${config.title} saved successfully.`);
      renderCrud(config);
    } catch (err) { showAlert(document.getElementById('crudAlert'), err.message); }
  });
}

async function deleteCrudItem(id) {
  if (!confirm('Delete this item? This cannot be undone.')) return;
  try { await _cfg.api.remove(id); flash('Deleted.'); renderCrud(_cfg); }
  catch (err) { flash(err.message, 'error'); }
}

// ========================== BOOT ==========================
renderView('overview');
