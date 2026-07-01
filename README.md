# Gwikonge PEFA Church — Frontend

Static HTML/CSS/JS frontend (no build step required) that consumes the backend REST API.

## Structure

```
frontend/
├── index.html, about.html, ministries.html, sermons.html, events.html,
│   livestream.html, blog.html, gallery.html, prayer.html, give.html,
│   contact.html, testimonials.html, volunteer.html, login.html,
│   register.html, dashboard.html   ← public + member pages
├── admin/
│   ├── index.html, admin.js        ← admin dashboard (all 25 modules)
├── partials/
│   ├── header.html, footer.html    ← shared nav, injected at runtime
├── css/
│   ├── style.css                   ← original site design system (colors, base styles)
│   └── app.css                     ← additions for forms, cards, dashboards, admin UI
├── js/
│   ├── api.js                      ← API client + auth/session handling (EDIT THIS FIRST)
│   └── partials.js                 ← injects header/footer into each page
└── uploads/                        ← not used directly; files are served from the backend
```

## Configure the API URL

Open `js/api.js` and change:

```js
const API_BASE_URL = (window.PEFA_API_BASE_URL) || 'http://localhost:5000/api';
```

For production, set `window.PEFA_API_BASE_URL` before `api.js` loads (e.g. add a small inline `<script>` in each page's `<head>`), or just edit the fallback URL directly to your deployed backend, e.g. `https://api.gwikongepefa.org/api`.

## Running locally

This is plain static HTML — serve it with any static file server (it must be served over HTTP, not opened via `file://`, because the header/footer partials are loaded via `fetch`):

```bash
cd frontend
npx serve .
# or
python3 -m http.server 5500
```

Then visit `http://localhost:5500`. Make sure the backend is running on the URL configured in `js/api.js` (default `http://localhost:5000`), and that the backend's `CLIENT_URL` env var includes your frontend's origin (CORS).

## Admin dashboard

Log in with an `admin`, `super_admin`, `pastor`, or `leader` account at `/login.html` — you'll be redirected to `/admin/index.html` automatically. The first super admin is created by the backend's `npm run seed` command (`admin@gwikongepefa.org` / `ChangeMe123!` — change immediately).

## What's wired up vs. stubbed

**Fully wired to the API:** Home, About, Ministries, Sermons (search/view/download tracking), Events (browse + registration), Live Streaming (live/scheduled/recorded with countdown), Prayer Requests (private + public wall), Giving (records donation intent — see backend README for payment gateway hookup), Contact, Volunteer signup, Newsletter signup, Testimonials, Gallery, Blog/Devotionals, member registration/login/profile/password, member dashboard (event registrations, giving history, attendance, self check-in), and a full admin dashboard covering members, content moderation, donation reports, and attendance.

**Intentionally left as next steps** (flagged in code/comments, not silently missing): live chat during streams, push/SMS notifications, multi-language toggle, QR-code *scanning* hardware/camera integration (check-in API endpoint exists, scanning UI does not), AI chatbot, and the "advanced" CMS items (baptism/wedding/funeral booking, counseling appointments, choir/music scheduling, inventory management, digital document library). These can be added as new Sequelize models + routes + admin tabs following the same pattern as the existing modules.

## Security reminders before going live

- Add CAPTCHA (hCaptcha/reCAPTCHA) to the contact, prayer request, volunteer, and newsletter forms.
- Serve everything over HTTPS.
- Change the seeded admin password immediately.
- Restrict `CLIENT_URL` on the backend to your real domain(s) only.
