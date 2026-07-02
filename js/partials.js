/**
 * partials.js — injects shared header + footer into every page.
 * Uses JS template strings instead of fetch() so the site works
 * when opened from disk (file://), a static server, or a CDN.
 */
(function injectPartials() {
  // ── Detect if we are inside the /admin/ sub-folder ──────────────────────
  const isAdmin = window.location.pathname.replace(/\\/g, '/').includes('/admin/');
  const ROOT    = isAdmin ? '../' : '';   // relative path back to site root

  // ── Build nav links (admin pages prefix with ROOT) ───────────────────────
  function href(page) { return ROOT + page; }

  // ════════════════════════════════════════════════════════════════════════
  //  HEADER
  // ════════════════════════════════════════════════════════════════════════
  const headerHTML = `
<header class="site-header">
  <div class="container header-inner">
    <a href="${href('index.html')}" class="site-logo">✝ Gwikonge PEFA</a>

    <button class="nav-toggle" id="navToggle" aria-label="Toggle navigation">☰</button>

    <nav class="main-nav" id="mainNav">
      <a href="${href('index.html')}">Home</a>
      <a href="${href('about.html')}">About</a>
      <a href="${href('ministries.html')}">Ministries</a>
      <a href="${href('sermons.html')}">Sermons</a>
      <a href="${href('livestream.html')}">🔴 Live</a>
      <a href="${href('events.html')}">Events</a>
      <a href="${href('blog.html')}">Devotionals</a>
      <a href="${href('bible-resources.html')}">Bible</a>
      <a href="${href('gallery.html')}">Gallery</a>
      <a href="${href('prayer.html')}">Prayer</a>
      <a href="${href('bookings.html')}">Bookings</a>
      <a href="${href('cell-groups.html')}">Cell Groups</a>
      <a href="${href('give.html')}" class="nav-give">Give</a>
      <a href="${href('contact.html')}">Contact</a>
    </nav>

    <div class="header-right">
      <!-- Global search -->
      <div class="search-bar">
        <input type="text" id="globalSearch" placeholder="Search…" autocomplete="off" aria-label="Search">
        <div class="search-results" id="searchResults"></div>
      </div>
      <!-- Notification bell (shown when logged in) -->
      <div id="notifBell"></div>
      <!-- Auth links -->
      <div class="auth-nav" id="authNav"></div>
      <!-- Language switcher -->
      <div class="lang-switcher" style="display:flex;gap:.3rem;">
        <button class="lang-btn" data-lang="en" title="English">EN</button>
        <button class="lang-btn" data-lang="sw" title="Kiswahili">SW</button>
      </div>
    </div>
  </div>
</header>`;

  // ════════════════════════════════════════════════════════════════════════
  //  FOOTER
  // ════════════════════════════════════════════════════════════════════════
  const footerHTML = `
<footer class="site-footer">
  <div class="container footer-grid">
    <div>
      <h3 class="footer-logo">✝ Gwikonge PEFA Church</h3>
      <p>Proclaiming Christ · Making Disciples · Transforming Lives</p>
      <div class="social-links" style="margin-top:.8rem;display:flex;gap:.8rem;">
        <a href="#" aria-label="Facebook">Facebook</a>
        <a href="#" aria-label="YouTube">YouTube</a>
        <a href="#" aria-label="WhatsApp">WhatsApp</a>
      </div>
    </div>
    <div>
      <h4>Quick Links</h4>
      <a href="${href('about.html')}">About Us</a>
      <a href="${href('ministries.html')}">Ministries</a>
      <a href="${href('events.html')}">Events</a>
      <a href="${href('sermons.html')}">Sermons</a>
      <a href="${href('volunteer.html')}">Volunteer</a>
      <a href="${href('library.html')}">Document Library</a>
    </div>
    <div>
      <h4>Get Involved</h4>
      <a href="${href('give.html')}">Give Online</a>
      <a href="${href('prayer.html')}">Prayer Requests</a>
      <a href="${href('bookings.html')}">Book a Service</a>
      <a href="${href('cell-groups.html')}">Cell Groups</a>
      <a href="${href('testimonials.html')}">Testimonials</a>
      <a href="${href('register.html')}">Become a Member</a>
    </div>
    <div>
      <h4>Newsletter</h4>
      <p style="font-size:.88rem;margin-bottom:.6rem;">Get weekly updates and event reminders.</p>
      <form id="footerNewsletterForm">
        <div style="display:flex;gap:.4rem;">
          <input type="email" id="footerEmail" placeholder="Your email" required
            style="flex:1;padding:.45rem .6rem;border-radius:var(--radius);border:none;font-size:.85rem;">
          <button class="btn btn-secondary btn-sm" type="submit">Join</button>
        </div>
        <p id="footerNewsletterMsg" style="font-size:.8rem;margin-top:.4rem;min-height:1.2em;"></p>
      </form>
      <p style="font-size:.8rem;margin-top:.8rem;">
        📞 +254 700 000 000<br>
        ✉ info@gwikongepefa.org<br>
        🕒 Mon–Fri, 9 AM – 5 PM
      </p>
    </div>
  </div>
  <div class="footer-bottom">
    <span>&copy; <span id="footerYear"></span> Gwikonge PEFA Church. All rights reserved.</span>
    <span style="display:flex;gap:1rem;font-size:.82rem;">
      <a href="${href('index.html')}">Privacy Policy</a>
      <a href="${href('contact.html')}">Contact</a>
      <a href="${href('admin/index.html')}">Admin</a>
    </span>
  </div>
</footer>`;

  // ════════════════════════════════════════════════════════════════════════
  //  INJECT INTO PAGE
  // ════════════════════════════════════════════════════════════════════════
  const headerEl = document.getElementById('siteHeader');
  const footerEl = document.getElementById('siteFooter');
  if (headerEl) headerEl.innerHTML = headerHTML;
  if (footerEl) footerEl.innerHTML = footerHTML;

  // ── Footer year ──────────────────────────────────────────────────────────
  const yearEl = document.getElementById('footerYear');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ── Footer newsletter form ───────────────────────────────────────────────
  const fnf = document.getElementById('footerNewsletterForm');
  if (fnf) {
    fnf.addEventListener('submit', async e => {
      e.preventDefault();
      const msg = document.getElementById('footerNewsletterMsg');
      try {
        await Api.newsletter.subscribe({ email: document.getElementById('footerEmail').value });
        msg.textContent = '✅ Subscribed! Thank you.';
        fnf.reset();
      } catch (err) {
        msg.textContent = '❌ ' + err.message;
      }
    });
  }

  // ── Auth nav (Login/Logout/name) ─────────────────────────────────────────
  renderAuthNav('authNav');

  // ── Notification bell ────────────────────────────────────────────────────
  loadNotificationBell('notifBell');

  // ── Highlight active nav link ────────────────────────────────────────────
  highlightNav();

  // ── Mobile hamburger ─────────────────────────────────────────────────────
  initMobileNav();

  // ── Global search ────────────────────────────────────────────────────────
  initGlobalSearch();

  // ── Daily verse strip (only on pages that include <div id="dailyVerse">) ─
  loadDailyVerse();

  // ── Language switcher ────────────────────────────────────────────────────
  if (typeof i18n !== 'undefined') {
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.addEventListener('click', () => i18n.setLanguage(btn.dataset.lang));
      if (btn.dataset.lang === i18n.getLanguage()) btn.classList.add('active');
    });
  }
})();

// ════════════════════════════════════════════════════════════════════════
//  HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════════════════

function highlightNav() {
  const page = window.location.pathname.replace(/\\/g, '/').split('/').pop() || 'index.html';
  document.querySelectorAll('.main-nav a').forEach(a => {
    a.classList.toggle('active', (a.getAttribute('href') || '').split('/').pop() === page);
  });
}

function initMobileNav() {
  const toggle = document.getElementById('navToggle');
  const nav    = document.getElementById('mainNav');
  if (!toggle || !nav) return;
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open);
  });
  // Close when a link is tapped on mobile
  nav.querySelectorAll('a').forEach(a =>
    a.addEventListener('click', () => nav.classList.remove('open')));
}

function initGlobalSearch() {
  const input   = document.getElementById('globalSearch');
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
        const cats  = { sermons:'Sermon', events:'Event', posts:'Devotional', ministries:'Ministry', announcements:'News' };
        const pages = {
          sermons:'sermons.html', events:'events.html', posts:'blog.html',
          ministries:'ministries.html', announcements:'index.html',
        };
        const isAdmin = window.location.pathname.replace(/\\/g,'/').includes('/admin/');
        const ROOT = isAdmin ? '../' : '';
        let html = '';
        let found = false;
        Object.keys(data.results).forEach(cat => {
          data.results[cat].forEach(item => {
            found = true;
            html += `<div class="search-result-item" onclick="window.location='${ROOT}${pages[cat]}'">
              <div class="sr-type">${cats[cat]}</div>
              <div class="sr-title">${escHtml(item.title || item.name || '')}</div>
            </div>`;
          });
        });
        results.innerHTML = found ? html : '<div class="search-result-item" style="color:var(--gray);">No results found.</div>';
        results.classList.add('open');
      } catch { /* search fails gracefully */ }
    }, 320);
  });

  document.addEventListener('click', e => {
    if (!input.contains(e.target) && !results.contains(e.target))
      results.classList.remove('open');
  });
}

async function loadDailyVerse() {
  const el = document.getElementById('dailyVerse');
  if (!el) return;
  try {
    const { data } = await Api.bible.today();
    el.innerHTML = `<div class="daily-verse">"${escHtml(data.text)}" — <strong>${escHtml(data.reference)}</strong> (${escHtml(data.translation)})</div>`;
  } catch { /* verse strip stays empty if API not reachable */ }
}
