// ---- Auth guard ----
if (!Auth.isLoggedIn() || !Auth.hasRole('admin', 'super_admin', 'pastor', 'leader')) {
  window.location.href = '../login.html';
}

document.getElementById('adminLogout').addEventListener('click', (e) => {
  e.preventDefault();
  Auth.clearSession();
  window.location.href = '../index.html';
});

const viewContainer = document.getElementById('viewContainer');
const alertBox = document.getElementById('alertBox');

document.querySelectorAll('#adminNav a').forEach((a) => {
  a.addEventListener('click', () => {
    document.querySelectorAll('#adminNav a').forEach((x) => x.classList.remove('active'));
    a.classList.add('active');
    clearAlert(alertBox);
    renderView(a.dataset.view);
  });
});

function flash(msg, type = 'success') {
  showAlert(alertBox, msg, type);
  setTimeout(() => clearAlert(alertBox), 3500);
}

async function renderView(view) {
  viewContainer.innerHTML = '<p>Loading…</p>';
  try {
    switch (view) {
      case 'overview': return renderOverview();
      case 'members': return renderMembers();
      case 'sermons': return renderCrud(sermonConfig);
      case 'events': return renderCrud(eventConfig);
      case 'ministries': return renderCrud(ministryConfig);
      case 'announcements': return renderCrud(announcementConfig);
      case 'prayer': return renderPrayer();
      case 'donations': return renderDonations();
      case 'testimonials': return renderTestimonials();
      case 'gallery': return renderCrud(galleryConfig);
      case 'blog': return renderCrud(blogConfig);
      case 'livestreams': return renderCrud(livestreamConfig);
      case 'contact': return renderContact();
      case 'volunteers': return renderVolunteers();
      case 'newsletter': return renderNewsletter();
      case 'attendance': return renderAttendance();
      default: viewContainer.innerHTML = '<p>Not found.</p>';
    }
  } catch (err) {
    viewContainer.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

// ================= OVERVIEW =================
async function renderOverview() {
  const { data } = await Api.dashboard.stats();
  viewContainer.innerHTML = `
    <h2 class="section-title">Overview</h2>
    <div class="stat-grid">
      ${statCard(data.totalMembers, 'Members')}
      ${statCard(data.totalSermons, 'Sermons')}
      ${statCard(data.upcomingEvents, 'Upcoming Events')}
      ${statCard(data.pendingPrayers, 'New Prayer Requests')}
      ${statCard(data.unreadMessages, 'Unread Messages')}
      ${statCard(data.pendingVolunteers, 'Pending Volunteers')}
      ${statCard(data.newsletterSubs, 'Newsletter Subscribers')}
      ${statCard(fmtMoney(data.totalGiving), 'Total Giving (completed)')}
      ${statCard(fmtMoney(data.givingThisMonth), 'Giving This Month')}
    </div>`;
}
function statCard(num, label) {
  return `<div class="stat-card"><div class="num">${num}</div><div class="label">${label}</div></div>`;
}

// ================= MEMBERS =================
async function renderMembers() {
  const { data } = await Api.members.list('?limit=100');
  viewContainer.innerHTML = `
    <h2 class="section-title">Members Directory</h2>
    <table class="data-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th></th></tr></thead>
    <tbody>${data.map((m) => `
      <tr>
        <td>${m.firstName} ${m.lastName}</td>
        <td>${m.email}</td>
        <td>
          <select data-id="${m.id}" class="roleSelect">
            ${['member','leader','pastor','admin','super_admin'].map(r => `<option ${m.role===r?'selected':''} value="${r}">${r}</option>`).join('')}
          </select>
        </td>
        <td>
          <select data-id="${m.id}" class="statusSelect">
            ${['visitor','member','active','inactive','transferred'].map(s => `<option ${m.membershipStatus===s?'selected':''} value="${s}">${s}</option>`).join('')}
          </select>
        </td>
        <td>${fmtDate(m.membershipDate || m.createdAt)}</td>
        <td><button class="btn btn-sm btn-danger" onclick="deleteMember('${m.id}')">Remove</button></td>
      </tr>`).join('')}</tbody></table>`;

  document.querySelectorAll('.roleSelect').forEach((sel) => {
    sel.addEventListener('change', async () => {
      try { await Api.members.update(sel.dataset.id, { role: sel.value }); flash('Role updated.'); }
      catch (e) { flash(e.message, 'error'); }
    });
  });
  document.querySelectorAll('.statusSelect').forEach((sel) => {
    sel.addEventListener('change', async () => {
      try { await Api.members.update(sel.dataset.id, { membershipStatus: sel.value }); flash('Status updated.'); }
      catch (e) { flash(e.message, 'error'); }
    });
  });
}
async function deleteMember(id) {
  if (!confirm('Remove this member? This cannot be undone.')) return;
  try { await Api.members.remove(id); flash('Member removed.'); renderMembers(); }
  catch (e) { flash(e.message, 'error'); }
}

// ================= GENERIC CRUD VIEWS =================
// Each config describes: title, api namespace, table columns, and the create/edit form fields.
const sermonConfig = {
  title: 'Sermons', api: Api.sermons,
  columns: [['title','Title'],['preacher','Preacher'],['sermonDate','Date',fmtDate],['isPublished','Published']],
  fields: [
    ['title','text','Title',true], ['preacher','text','Preacher',true], ['sermonDate','date','Sermon Date',true],
    ['series','text','Series'], ['topic','text','Topic'], ['bibleReferences','text','Bible References'],
    ['videoUrl','text','Video URL'], ['audioUrl','text','Audio URL'], ['thumbnailUrl','text','Thumbnail URL'],
    ['description','textarea','Description'], ['sermonNotes','textarea','Sermon Notes'],
    ['isPublished','checkbox','Published'],
  ],
};
const eventConfig = {
  title: 'Events', api: Api.events,
  columns: [['title','Title'],['category','Category'],['startDate','Start',fmtDateTime],['isPublished','Published']],
  fields: [
    ['title','text','Title',true], ['category','select','Category',true,['conference','crusade','youth','prayer','bible_study','service','other']],
    ['startDate','datetime-local','Start Date/Time',true], ['endDate','datetime-local','End Date/Time'],
    ['location','text','Location'], ['image','text','Image URL'], ['capacity','number','Capacity'],
    ['description','textarea','Description'],
    ['registrationRequired','checkbox','Requires Registration'], ['isPublished','checkbox','Published'],
  ],
};
const ministryConfig = {
  title: 'Ministries', api: Api.ministries,
  columns: [['name','Name'],['leaderName','Leader'],['meetingSchedule','Schedule'],['isActive','Active']],
  fields: [
    ['name','text','Name',true], ['slug','text','Slug (unique, e.g. youth)',true],
    ['leaderName','text','Leader Name'], ['leaderContact','text','Leader Contact'],
    ['meetingSchedule','text','Meeting Schedule'], ['image','text','Image URL'],
    ['description','textarea','Description'], ['isActive','checkbox','Active'],
  ],
};
const announcementConfig = {
  title: 'Announcements', api: Api.announcements,
  columns: [['title','Title'],['type','Type'],['isPinned','Pinned'],['isPublished','Published']],
  fields: [
    ['title','text','Title',true],
    ['type','select','Type',true,['news','pastor_message','bulletin','special']],
    ['image','text','Image URL'], ['content','textarea','Content',true],
    ['isPinned','checkbox','Pinned'], ['isPublished','checkbox','Published'],
  ],
};
const galleryConfig = {
  title: 'Gallery', api: Api.gallery,
  columns: [['title','Title'],['album','Album'],['type','Type']],
  fields: [
    ['title','text','Title'], ['album','text','Album'],
    ['type','select','Type',true,['photo','video']], ['url','text','File URL',true],
    ['thumbnailUrl','text','Thumbnail URL'],
  ],
};
const blogConfig = {
  title: 'Blog / Devotionals', api: Api.blog,
  columns: [['title','Title'],['category','Category'],['publishDate','Date',fmtDate],['isPublished','Published']],
  fields: [
    ['title','text','Title',true], ['slug','text','Slug (unique)',true],
    ['category','select','Category',true,['devotional','bible_study','article','testimony']],
    ['authorName','text','Author'], ['coverImage','text','Cover Image URL'], ['bibleVerse','text','Bible Verse'],
    ['content','textarea','Content',true], ['isPublished','checkbox','Published'],
  ],
};
const livestreamConfig = {
  title: 'Live Streams', api: Api.livestreams,
  columns: [['title','Title'],['status','Status'],['scheduledStart','Scheduled',fmtDateTime]],
  fields: [
    ['title','text','Title',true], ['streamUrl','text','Stream Embed URL',true],
    ['scheduledStart','datetime-local','Scheduled Start',true],
    ['status','select','Status',true,['scheduled','live','ended']],
    ['recordingUrl','text','Recording URL (after stream ends)'],
  ],
};

async function renderCrud(config) {
  const { data } = await config.api.list('?limit=100');
  viewContainer.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <h2 class="section-title">${config.title}</h2>
      <button class="btn btn-primary btn-sm" onclick="openCrudForm('${config.title}')">+ Add New</button>
    </div>
    <div id="crudFormWrap"></div>
    <table class="data-table"><thead><tr>${config.columns.map(c => `<th>${c[1]}</th>`).join('')}<th></th></tr></thead>
    <tbody>${data.map((item) => `
      <tr>
        ${config.columns.map(([key, , fmt]) => `<td>${fmt ? fmt(item[key]) : (typeof item[key] === 'boolean' ? (item[key] ? 'Yes' : 'No') : (item[key] ?? ''))}</td>`).join('')}
        <td style="white-space:nowrap;">
          <button class="btn btn-sm btn-outline" onclick='openCrudForm("${config.title}", ${JSON.stringify(item).replace(/'/g, "&apos;")})'>Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deleteCrudItem('${config.title}','${item.id}')">Delete</button>
        </td>
      </tr>`).join('')}</tbody></table>`;
  window.currentCrudConfig = config;
}

function openCrudForm(title, item = null) {
  const config = window.currentCrudConfig;
  const wrap = document.getElementById('crudFormWrap');
  wrap.innerHTML = `
    <form id="crudForm" class="app-form wide" style="margin-bottom:1.5rem;">
      <h3>${item ? 'Edit' : 'Add'} ${title}</h3>
      <div id="crudFormAlert"></div>
      <div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
        ${config.fields.map(([key, type, label, required, options]) => {
          const val = item ? item[key] : '';
          if (type === 'textarea') return `<div class="form-group" style="grid-column:1/-1;"><label>${label}</label><textarea name="${key}">${val ?? ''}</textarea></div>`;
          if (type === 'select') return `<div class="form-group"><label>${label}</label><select name="${key}">${options.map(o => `<option value="${o}" ${val===o?'selected':''}>${o}</option>`).join('')}</select></div>`;
          if (type === 'checkbox') return `<div class="form-group form-check"><input type="checkbox" name="${key}" id="f_${key}" ${val ? 'checked' : ''}><label for="f_${key}" style="margin:0;">${label}</label></div>`;
          let v = val;
          if (type === 'datetime-local' && val) v = new Date(val).toISOString().slice(0, 16);
          if (type === 'date' && val) v = new Date(val).toISOString().slice(0, 10);
          return `<div class="form-group"><label>${label}</label><input type="${type}" name="${key}" value="${v ?? ''}" ${required ? 'required' : ''}></div>`;
        }).join('')}
      </div>
      <div style="display:flex;gap:.6rem;margin-top:.6rem;">
        <button class="btn btn-primary" type="submit">${item ? 'Save Changes' : 'Create'}</button>
        <button class="btn btn-outline" type="button" onclick="document.getElementById('crudFormWrap').innerHTML=''">Cancel</button>
      </div>
    </form>`;

  document.getElementById('crudForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const payload = {};
    config.fields.forEach(([key, type]) => {
      if (type === 'checkbox') payload[key] = form.elements[key].checked;
      else if (type === 'number') payload[key] = form.elements[key].value ? Number(form.elements[key].value) : null;
      else payload[key] = form.elements[key].value;
    });
    try {
      if (item) await config.api.update(item.id, payload);
      else await config.api.create(payload);
      flash(`${title} saved.`);
      renderCrud(config);
    } catch (err) {
      showAlert(document.getElementById('crudFormAlert'), err.message);
    }
  });
}

async function deleteCrudItem(title, id) {
  if (!confirm(`Delete this ${title.toLowerCase()} entry?`)) return;
  try {
    await window.currentCrudConfig.api.remove(id);
    flash('Deleted.');
    renderCrud(window.currentCrudConfig);
  } catch (err) { flash(err.message, 'error'); }
}

// ================= PRAYER REQUESTS =================
async function renderPrayer() {
  const { data } = await Api.prayer.list();
  viewContainer.innerHTML = `
    <h2 class="section-title">Prayer Requests</h2>
    <table class="data-table"><thead><tr><th>From</th><th>Request</th><th>Urgent</th><th>Status</th><th>Public</th><th>Date</th></tr></thead>
    <tbody>${data.map((p) => `
      <tr>
        <td>${p.isAnonymous ? 'Anonymous' : (p.fullName || '—')}</td>
        <td style="max-width:280px;">${p.request}</td>
        <td>${p.isUrgent ? '⚠️' : ''}</td>
        <td>
          <select data-id="${p.id}" class="prayerStatus">
            ${['new','in_prayer','answered','archived'].map(s => `<option ${p.status===s?'selected':''} value="${s}">${s}</option>`).join('')}
          </select>
        </td>
        <td>${p.isPublicOnWall ? 'Yes' : 'No'}</td>
        <td>${fmtDate(p.createdAt)}</td>
      </tr>`).join('')}</tbody></table>`;

  document.querySelectorAll('.prayerStatus').forEach((sel) => {
    sel.addEventListener('change', async () => {
      try { await Api.prayer.update(sel.dataset.id, { status: sel.value }); flash('Updated.'); }
      catch (e) { flash(e.message, 'error'); }
    });
  });
}

// ================= DONATIONS =================
async function renderDonations() {
  const { data, totalCompleted } = await Api.donations.list();
  viewContainer.innerHTML = `
    <h2 class="section-title">Donation Reports</h2>
    <div class="stat-grid">${statCard(fmtMoney(totalCompleted), 'Total Completed Giving')}</div>
    <table class="data-table"><thead><tr><th>Donor</th><th>Type</th><th>Amount</th><th>Method</th><th>Status</th><th>Date</th><th></th></tr></thead>
    <tbody>${data.map((d) => `
      <tr>
        <td>${d.isAnonymous ? 'Anonymous' : (d.donorName || '—')}</td>
        <td>${d.type}</td>
        <td>${fmtMoney(d.amount, d.currency)}</td>
        <td>${d.method}</td>
        <td><span class="badge badge-${d.status}">${d.status}</span></td>
        <td>${fmtDate(d.createdAt)}</td>
        <td>${d.status === 'pending' ? `<button class="btn btn-sm btn-primary" onclick="confirmDonation('${d.id}')">Mark Paid</button>` : ''}</td>
      </tr>`).join('')}</tbody></table>`;
}
async function confirmDonation(id) {
  try { await Api.donations.confirm(id, {}); flash('Donation confirmed.'); renderDonations(); }
  catch (e) { flash(e.message, 'error'); }
}

// ================= TESTIMONIALS =================
async function renderTestimonials() {
  const { data } = await Api.testimonials.list('?limit=100');
  viewContainer.innerHTML = `
    <h2 class="section-title">Testimonials</h2>
    <table class="data-table"><thead><tr><th>Name</th><th>Content</th><th>Approved</th><th></th></tr></thead>
    <tbody>${data.map((t) => `
      <tr>
        <td>${t.fullName}</td>
        <td style="max-width:320px;">${t.content}</td>
        <td>${t.isApproved ? 'Yes' : 'No'}</td>
        <td>
          ${!t.isApproved ? `<button class="btn btn-sm btn-primary" onclick="approveTestimonial('${t.id}')">Approve</button>` : ''}
          <button class="btn btn-sm btn-danger" onclick="deleteTestimonial('${t.id}')">Delete</button>
        </td>
      </tr>`).join('')}</tbody></table>`;
}
async function approveTestimonial(id) {
  try { await Api.testimonials.update(id, { isApproved: true }); flash('Approved.'); renderTestimonials(); }
  catch (e) { flash(e.message, 'error'); }
}
async function deleteTestimonial(id) {
  if (!confirm('Delete this testimonial?')) return;
  try { await Api.testimonials.remove(id); flash('Deleted.'); renderTestimonials(); }
  catch (e) { flash(e.message, 'error'); }
}

// ================= CONTACT MESSAGES =================
async function renderContact() {
  const { data } = await Api.contact.list();
  viewContainer.innerHTML = `
    <h2 class="section-title">Contact Messages</h2>
    <table class="data-table"><thead><tr><th>Name</th><th>Email</th><th>Subject</th><th>Message</th><th>Read</th><th></th></tr></thead>
    <tbody>${data.map((m) => `
      <tr>
        <td>${m.name}</td><td>${m.email}</td><td>${m.subject || ''}</td>
        <td style="max-width:280px;">${m.message}</td>
        <td>${m.isRead ? 'Yes' : 'No'}</td>
        <td>
          ${!m.isRead ? `<button class="btn btn-sm btn-outline" onclick="markRead('${m.id}')">Mark Read</button>` : ''}
          <button class="btn btn-sm btn-danger" onclick="deleteMessage('${m.id}')">Delete</button>
        </td>
      </tr>`).join('')}</tbody></table>`;
}
async function markRead(id) {
  try { await Api.contact.markRead(id); flash('Marked read.'); renderContact(); }
  catch (e) { flash(e.message, 'error'); }
}
async function deleteMessage(id) {
  if (!confirm('Delete this message?')) return;
  try { await Api.contact.remove(id); flash('Deleted.'); renderContact(); }
  catch (e) { flash(e.message, 'error'); }
}

// ================= VOLUNTEERS =================
async function renderVolunteers() {
  const { data } = await Api.volunteers.list();
  viewContainer.innerHTML = `
    <h2 class="section-title">Volunteers</h2>
    <table class="data-table"><thead><tr><th>Name</th><th>Email</th><th>Ministry</th><th>Status</th></tr></thead>
    <tbody>${data.map((v) => `
      <tr>
        <td>${v.fullName}</td><td>${v.email}</td><td>${v.ministryInterest || ''}</td>
        <td>
          <select data-id="${v.id}" class="volStatus">
            ${['pending','approved','declined'].map(s => `<option ${v.status===s?'selected':''} value="${s}">${s}</option>`).join('')}
          </select>
        </td>
      </tr>`).join('')}</tbody></table>`;

  document.querySelectorAll('.volStatus').forEach((sel) => {
    sel.addEventListener('change', async () => {
      try { await Api.volunteers.update(sel.dataset.id, { status: sel.value }); flash('Updated.'); }
      catch (e) { flash(e.message, 'error'); }
    });
  });
}

// ================= NEWSLETTER =================
async function renderNewsletter() {
  const { data, total } = await Api.newsletter.list();
  viewContainer.innerHTML = `
    <h2 class="section-title">Newsletter Subscribers (${total})</h2>
    <table class="data-table"><thead><tr><th>Email</th><th>Name</th><th>Subscribed</th></tr></thead>
    <tbody>${data.map((s) => `<tr><td>${s.email}</td><td>${s.name || ''}</td><td>${fmtDate(s.createdAt)}</td></tr>`).join('')}</tbody></table>`;
}

// ================= ATTENDANCE =================
async function renderAttendance() {
  const { data } = await Api.attendance.list();
  viewContainer.innerHTML = `
    <h2 class="section-title">Attendance Records</h2>
    <form id="attForm" class="app-form wide" style="margin-bottom:1.5rem;">
      <div id="attAlert"></div>
      <div class="form-row" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;">
        <div class="form-group"><label>Member User ID</label><input type="text" name="userId" required></div>
        <div class="form-group"><label>Service Date</label><input type="date" name="serviceDate" required></div>
        <div class="form-group"><label>Method</label><select name="checkedInVia"><option value="manual">Manual</option><option value="qr">QR Code</option></select></div>
      </div>
      <button class="btn btn-primary btn-sm" type="submit">Record Attendance</button>
      <p style="font-size:.8rem;color:var(--gray);margin-top:.4rem;">Tip: find a member's User ID on the Members tab (visible via API response) — QR-based self check-in is also available to logged-in members from their dashboard.</p>
    </form>
    <table class="data-table"><thead><tr><th>Member</th><th>Service Date</th><th>Method</th></tr></thead>
    <tbody>${data.map((a) => `<tr><td>${a.User ? a.User.firstName + ' ' + a.User.lastName : a.userId}</td><td>${fmtDate(a.serviceDate)}</td><td>${a.checkedInVia}</td></tr>`).join('')}</tbody></table>`;

  document.getElementById('attForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    try {
      await Api.attendance.record({
        userId: form.elements.userId.value,
        serviceDate: form.elements.serviceDate.value,
        checkedInVia: form.elements.checkedInVia.value,
      });
      flash('Attendance recorded.');
      renderAttendance();
    } catch (err) { showAlert(document.getElementById('attAlert'), err.message); }
  });
}

// Initial view
renderView('overview');
