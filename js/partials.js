/**
 * Loads shared header/footer partials into any page containing
 * <div id="siteHeader"></div> and <div id="siteFooter"></div>.
 */
(async function loadPartials() {
  const headerEl = document.getElementById('siteHeader');
  const footerEl = document.getElementById('siteFooter');
  try {
    if (headerEl) {
      const res = await fetch('partials/header.html');
      headerEl.innerHTML = await res.text();
      renderAuthNav('authNav');
      highlightActiveNav();
    }
    if (footerEl) {
      const res = await fetch('partials/footer.html');
      const html = await res.text();
      // Footer partial includes its own <script> tag; injecting via innerHTML won't execute it,
      // so we split it out and eval separately.
      const temp = document.createElement('div');
      temp.innerHTML = html;
      const scripts = temp.querySelectorAll('script');
      scripts.forEach((s) => s.remove());
      footerEl.innerHTML = temp.innerHTML;
      scripts.forEach((s) => {
        const newScript = document.createElement('script');
        newScript.textContent = s.textContent;
        document.body.appendChild(newScript);
      });
    }
  } catch (err) {
    console.error('Failed to load page partials:', err);
  }
})();

function highlightActiveNav() {
  const current = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.main-nav a').forEach((a) => {
    if (a.getAttribute('href') === current) a.style.fontWeight = '700';
  });
}
