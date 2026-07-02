(async function loadPartials() {
  const BASE = window.location.pathname.includes('/admin/') ? '../' : '';

  async function loadPartial(elId, path) {
    const el = document.getElementById(elId);
    if (!el) return;
    const res = await fetch(BASE + path);
    const html = await res.text();
    const wrap = document.createElement('div');
    wrap.innerHTML = html;
    const scripts = [...wrap.querySelectorAll('script')];
    scripts.forEach(s => s.remove());
    el.innerHTML = wrap.innerHTML;
    scripts.forEach(s => {
      const ns = document.createElement('script');
      ns.textContent = s.textContent;
      document.body.appendChild(ns);
    });
  }

  try {
    await Promise.all([
      loadPartial('siteHeader', 'partials/header.html'),
      loadPartial('siteFooter', 'partials/footer.html'),
    ]);

    renderAuthNav('authNav');
    loadNotificationBell('notifBell');
    highlightNav();
    initMobileNav();
    initGlobalSearch();
    loadDailyVerse();
  } catch (e) { console.error('Partial load failed:', e); }
})();

function highlightNav() {
  const page = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.main-nav a').forEach(a => {
    if ((a.getAttribute('href') || '').split('/').pop() === page) a.classList.add('active');
  });
}

function initMobileNav() {
  const toggle = document.getElementById('navToggle');
  const nav = document.getElementById('mainNav');
  if (toggle && nav) toggle.addEventListener('click', () => nav.classList.toggle('open'));
}

function initGlobalSearch() {
  const input = document.getElementById('globalSearch');
  const results = document.getElementById('searchResults');
  if (!input || !results) return;

  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (q.length < 2) { results.classList.remove('open'); results.innerHTML = ''; return; }
    timer = setTimeout(async () => {
      try {
        const data = await Api.search(q, 4);
        let html = '';
        const cats = { sermons: 'Sermon', events: 'Event', posts: 'Devotional', ministries: 'Ministry', announcements: 'News' };
        const links = {
          sermons: 'sermons.html', events: 'events.html', posts: 'blog.html',
          ministries: 'ministries.html', announcements: 'index.html',
        };
        let found = false;
        Object.keys(data.results).forEach(cat => {
          data.results[cat].forEach(item => {
            found = true;
            html += `<div class="search-result-item" onclick="window.location='${links[cat]}'">
              <div class="sr-type">${cats[cat]}</div>
              <div class="sr-title">${escHtml(item.title || item.name || '')}</div>
            </div>`;
          });
        });
        results.innerHTML = found ? html : '<div class="search-result-item">No results found.</div>';
        results.classList.add('open');
      } catch {}
    }, 300);
  });

  document.addEventListener('click', e => {
    if (!input.contains(e.target) && !results.contains(e.target)) results.classList.remove('open');
  });
}

async function loadDailyVerse() {
  const el = document.getElementById('dailyVerse');
  if (!el) return;
  try {
    const { data } = await Api.bible.today();
    el.innerHTML = `<div class="daily-verse">"${escHtml(data.text)}" — <strong>${escHtml(data.reference)}</strong> (${escHtml(data.translation)})</div>`;
  } catch {}
}
