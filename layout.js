/* ==========================================================
   layout.js — shared header/nav + footer, injected on every page.
   Each HTML page just needs:
     <div id="site-header"></div>  ... page content ...  <div id="site-footer"></div>
   and a call to mountLayout('this-page.html') on load.
   ========================================================== */
const CPL_NAV = [
  ['index.html', 'Home'],
  ['league-a.html', 'League A'],
  ['league-b.html', 'League B'],
  ['players.html', 'Players'],
  ['referees.html', 'Referees'],
  ['officials.html', 'Officials'],
  ['news.html', 'News'],
  ['gallery.html', 'Gallery'],
  ['equipment.html', 'Equipment'],
  ['transfers.html', 'Transfers'],
  ['register.html', 'Register'],
  ['enquiries.html', 'Enquiries'],
  ['about.html', 'About'],
  ['my-profile.html', 'My Profile'],
  ['login.html', 'Login']
];
function renderHeader(active) {
  const links = CPL_NAV.map(([href, label]) => {
    const current = href === active ? ' aria-current="page"' : '';
    return `<a href="${href}"${current}>${label}</a>`;
  }).join('');
  return `
    <header class="site">
      <a href="index.html" class="logo-link" aria-label="Chuka Premier League home">
        <img class="logo" src="${CPL_CONFIG.LOGO_URL}" alt="CPL logo" onerror="this.closest('.logo-link').style.display='none'">
      </a>
      <div class="brand">
        <strong>Chuka Premier League</strong>
        <span>Season ${CPL_CONFIG.SEASON}</span>
      </div>
      <button type="button" class="nav-toggle" id="cpl-nav-toggle" aria-expanded="false" aria-controls="cpl-nav" aria-label="Toggle menu">
        <span></span><span></span><span></span>
      </button>
      <nav id="cpl-nav">${links}</nav>
      <div class="nav-scrim" id="cpl-nav-scrim"></div>
    </header>`;
}

/** Wires up the hamburger button on small screens: toggles the nav open/
 * closed, closes on link tap, outside tap, or Escape. Safe to call after
 * every mountLayout() — does nothing if the toggle isn't in the DOM. */
function cplInitNavToggle() {
  const toggle = document.getElementById('cpl-nav-toggle');
  const nav = document.getElementById('cpl-nav');
  const scrim = document.getElementById('cpl-nav-scrim');
  if (!toggle || !nav) return;

  const closeNav = () => {
    nav.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('nav-open');
  };
  const openNav = () => {
    nav.classList.add('open');
    toggle.setAttribute('aria-expanded', 'true');
    document.body.classList.add('nav-open');
  };

  toggle.addEventListener('click', () => {
    if (nav.classList.contains('open')) closeNav(); else openNav();
  });
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', closeNav));
  if (scrim) scrim.addEventListener('click', closeNav);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeNav(); });
}
function renderFooter() {
  return `<footer>&copy; ${new Date().getFullYear()} Chuka Premier League &middot; data managed via Google Sheets</footer>`;
}
function mountLayout(active) {
  const headerEl = document.getElementById('site-header');
  const footerEl = document.getElementById('site-footer');
  if (headerEl) headerEl.outerHTML = renderHeader(active);
  if (footerEl) footerEl.outerHTML = renderFooter();
  cplInitNavToggle();
  cplInitOfflineBanner();
  cplRegisterServiceWorker();
}

/** Registers sw.js from every page (not just the homepage) so offline
 * support works no matter which page a visitor lands on first — a
 * service worker's scope covers the whole origin once registered, but
 * it has to actually be registered at least once per browser first. */
function cplRegisterServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => {
      console.warn('SW registration failed:', err);
    });
  });
}

/** Shows a small banner whenever the browser reports itself offline, or
 * once CPL.get() has had to fall back to a locally-cached copy of Sheet
 * data because a live fetch failed (see data.js). Checked on load and
 * again periodically, since data.js sets window.CPL_OFFLINE
 * asynchronously (after a page's own data calls run), not before
 * mountLayout() executes. */
function cplInitOfflineBanner() {
  let banner = document.getElementById('cpl-offline-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'cpl-offline-banner';
    banner.style.cssText = 'display:none;background:#3a2a00;color:#ffd873;text-align:center;padding:8px 12px;font-size:0.85rem;';
    const header = document.querySelector('header.site');
    if (header && header.parentNode) header.parentNode.insertBefore(banner, header.nextSibling);
  }

  const render = () => {
    if (!navigator.onLine) {
      banner.textContent = "You're offline — showing the last data that was loaded on this device.";
      banner.style.display = 'block';
    } else if (window.CPL_OFFLINE) {
      const since = window.CPL_OFFLINE_SINCE ? new Date(window.CPL_OFFLINE_SINCE).toLocaleString() : '';
      banner.textContent = `Couldn't reach live data just now — showing a saved copy${since ? ' from ' + since : ''}.`;
      banner.style.display = 'block';
    } else {
      banner.style.display = 'none';
    }
  };

  window.addEventListener('online', render);
  window.addEventListener('offline', render);
  render();
  // window.CPL_OFFLINE is set later, after a page's own data.js calls
  // finish — re-check for a few seconds after load to catch that.
  let checks = 0;
  const interval = setInterval(() => {
    render();
    if (++checks > 10) clearInterval(interval);
  }, 500);
}
