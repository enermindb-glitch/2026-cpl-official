/* ==========================================================
   admin.js — Chuka Premier League admin dashboard.

   Auth model (matches auth.js's player-login pattern, kept in its own
   sessionStorage namespace so an admin and a player can be signed in
   at the same time in different tabs):
   - Admin signs in with email + password on this page.
   - Credentials are checked server-side (Apps Script) against a salted
     hash stored in the "Admin_Users" tab — see apps-script/code.gs and
     apps-script/SETUP-ADMIN.md for the one-time setup that creates that
     row. Nothing here ever hardcodes the real password.
   - Like the player session, there's no server-side session token: the
     browser resends email+password (from sessionStorage) on every write
     so the backend can re-verify before making any change. Good enough
     for a small league site over HTTPS — see README "Known, intentional
     limits".

   This page intentionally is NOT linked from the public nav (layout.js).
   Only people who have the /admin.html URL can even see the login form.
   ========================================================== */

function cplAdminSaveSession(email, password, name) {
  sessionStorage.setItem('cpl_admin_email', email || '');
  sessionStorage.setItem('cpl_admin_password', password || '');
  sessionStorage.setItem('cpl_admin_name', name || '');
}
function cplAdminGetSession() {
  return {
    email: sessionStorage.getItem('cpl_admin_email') || '',
    password: sessionStorage.getItem('cpl_admin_password') || '',
    name: sessionStorage.getItem('cpl_admin_name') || ''
  };
}
function cplAdminLogout() {
  sessionStorage.removeItem('cpl_admin_email');
  sessionStorage.removeItem('cpl_admin_password');
  sessionStorage.removeItem('cpl_admin_name');
  window.location.reload();
}

async function initAdminPage() {
  const root = document.getElementById('admin-root');
  const session = cplAdminGetSession();

  if (!session.email) {
    renderAdminLogin(root);
  } else {
    renderAdminDashboard(root, session);
  }
}

function renderAdminLogin(root) {
  root.innerHTML = `
    <div class="panel" style="max-width:420px;margin:0 auto;">
      <span class="eyebrow">Admin Sign In</span>
      <form id="admin-login-form">
        <label for="admin-email">Email</label>
        <input id="admin-email" type="email" required autocomplete="email">
        <label for="admin-password">Password</label>
        <input id="admin-password" type="password" required autocomplete="current-password">
        <button type="submit" id="admin-login-submit">Sign In</button>
        <div class="msg" id="admin-login-msg"></div>
      </form>
    </div>`;

  const form = document.getElementById('admin-login-form');
  const msg = document.getElementById('admin-login-msg');
  const btn = document.getElementById('admin-login-submit');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('admin-email').value.trim();
    const password = document.getElementById('admin-password').value;
    btn.disabled = true;
    btn.textContent = 'Signing in…';
    try {
      const res = await CPL.post({ action: 'adminLogin', email, password });
      if (res && res.ok) {
        cplAdminSaveSession(res.email || email, password, res.name || '');
        initAdminPage();
      } else {
        cplShowMsg(msg, (res && res.error) || 'Sign in failed.', 'err');
      }
    } catch (err) {
      cplShowMsg(msg, 'Could not reach the server. Check your connection and try again.', 'err');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Sign In';
    }
  });
}

function renderAdminDashboard(root, session) {
  root.innerHTML = `
    <div class="panel" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
      <div>
        <span class="eyebrow">Signed in</span>
        <strong>${cplEscape(session.name || session.email)}</strong>
      </div>
      <button class="btn secondary" id="admin-logout-btn" style="margin:0;">Sign out</button>
    </div>

    <div class="tabs">
      <button data-tab="approvals" class="active">Approvals</button>
      <button data-tab="standings">Standings</button>
      <button data-tab="fixtures">Fixtures &amp; Results</button>
      <button data-tab="playerstats">Player Stats</button>
      <button data-tab="gallery">Gallery</button>
      <button data-tab="teamgallery">Team Galleries</button>
      <button data-tab="equipment">Equipment</button>
      <button data-tab="documents">Documents</button>
      <button data-tab="season">Season &amp; Links</button>
      <button data-tab="transfers">Transfers</button>
      <button data-tab="transferrequests">Transfer Requests</button>
      <button data-tab="news">News</button>
      <button data-tab="account">Account</button>
    </div>

    <div class="tab-panel active" id="tab-approvals"></div>
    <div class="tab-panel" id="tab-standings"></div>
    <div class="tab-panel" id="tab-fixtures"></div>
    <div class="tab-panel" id="tab-playerstats"></div>
    <div class="tab-panel" id="tab-gallery"></div>
    <div class="tab-panel" id="tab-teamgallery"></div>
    <div class="tab-panel" id="tab-equipment"></div>
    <div class="tab-panel" id="tab-documents"></div>
    <div class="tab-panel" id="tab-season"></div>
    <div class="tab-panel" id="tab-transfers"></div>
    <div class="tab-panel" id="tab-transferrequests"></div>
    <div class="tab-panel" id="tab-news"></div>
    <div class="tab-panel" id="tab-account"></div>
  `;

  document.getElementById('admin-logout-btn').addEventListener('click', cplAdminLogout);

  const tabButtons = Array.from(document.querySelectorAll('.tabs button'));
  const panels = {
    approvals: document.getElementById('tab-approvals'),
    standings: document.getElementById('tab-standings'),
    fixtures: document.getElementById('tab-fixtures'),
    playerstats: document.getElementById('tab-playerstats'),
    gallery: document.getElementById('tab-gallery'),
    teamgallery: document.getElementById('tab-teamgallery'),
    equipment: document.getElementById('tab-equipment'),
    documents: document.getElementById('tab-documents'),
    season: document.getElementById('tab-season'),
    transfers: document.getElementById('tab-transfers'),
    transferrequests: document.getElementById('tab-transferrequests'),
    news: document.getElementById('tab-news'),
    account: document.getElementById('tab-account')
  };

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      Object.values(panels).forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      panels[btn.dataset.tab].classList.add('active');
    });
  });

  renderApprovalsPanel(panels.approvals, session);
  renderStandingsAdminPanel(panels.standings, session);
  renderFixturesAdminPanel(panels.fixtures, session);
  renderPlayerStatsAdminPanel(panels.playerstats, session);
  renderGalleryAdminPanel(panels.gallery, session);
  renderTeamGalleryAdminPanel(panels.teamgallery, session);
  renderEquipmentAdminPanel(panels.equipment, session);
  renderDocumentsPanel(panels.documents, session);
  renderSeasonPanel(panels.season, session);
  renderTransfersPanel(panels.transfers, session);
  renderTransferRequestsAdminPanel(panels.transferrequests, session);
  renderNewsPanel(panels.news, session);
  renderAccountPanel(panels.account, session);
}

// ---------------------------------------------------------------------
// Shared helpers for the generic admin-managed tabs (Standings,
// Fixtures, Results, Game_Gallery, Equipment) — all go through the
// adminListRows/adminSaveRow/adminDeleteRow/adminUploadMedia actions
// added to code.gs, whitelisted server-side to just these tabs.
// ---------------------------------------------------------------------

async function cplAdminListRows(tab, session) {
  const res = await CPL.post({ action: 'adminListRows', email: session.email, password: session.password, tab });
  if (!res || !res.ok) throw new Error((res && res.error) || ('Could not load ' + tab + '.'));
  return res.rows;
}

async function cplAdminSaveRow(tab, row, data, session) {
  const res = await CPL.post({ action: 'adminSaveRow', email: session.email, password: session.password, tab, row: row || '', data });
  if (!res || !res.ok) throw new Error((res && res.error) || 'Could not save.');
  return res;
}

async function cplAdminDeleteRow(tab, row, session) {
  const res = await CPL.post({ action: 'adminDeleteRow', email: session.email, password: session.password, tab, row });
  if (!res || !res.ok) throw new Error((res && res.error) || 'Could not delete.');
  return res;
}

/** HTML for a "paste a URL OR upload a file" image field with a live
 * preview — used for fixture posters and gallery media. */
function cplImageFieldHtml(prefix, label, currentUrl) {
  return `
    <label for="${prefix}-url">${label}</label>
    <input id="${prefix}-url" type="text" placeholder="Paste an image URL…" value="${cplEscape(currentUrl || '')}">
    <input id="${prefix}-file" type="file" accept="image/*" style="margin-top:6px;">
    <div id="${prefix}-preview" style="margin-top:8px;">${currentUrl ? cplImgPreviewHtml(currentUrl) : ''}</div>`;
}

function cplImgPreviewHtml(src) {
  return `<img src="${cplEscape(src)}" alt="" style="max-width:160px;max-height:120px;object-fit:cover;border:1px solid var(--line);border-radius:var(--radius);">`;
}

/** Wires up the live preview (typed URL or freshly-picked file) for a
 * field built with cplImageFieldHtml. */
function cplWireImagePreview(prefix) {
  const urlInput = document.getElementById(`${prefix}-url`);
  const fileInput = document.getElementById(`${prefix}-file`);
  const preview = document.getElementById(`${prefix}-preview`);
  urlInput.addEventListener('input', () => {
    if (!fileInput.files[0]) preview.innerHTML = urlInput.value.trim() ? cplImgPreviewHtml(urlInput.value.trim()) : '';
  });
  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { preview.innerHTML = cplImgPreviewHtml(reader.result); };
    reader.readAsDataURL(file);
  });
}

/** Resolves the final URL for an image field: if a file was picked it's
 * uploaded to Drive first (via adminUploadMedia) and that URL wins;
 * otherwise whatever was typed in the URL box is used as-is. */
async function cplResolveImageField(prefix, session) {
  const fileInput = document.getElementById(`${prefix}-file`);
  const urlInput = document.getElementById(`${prefix}-url`);
  const file = fileInput.files[0];
  if (file) {
    const fileBase64 = await cplFileToBase64(file);
    const res = await CPL.post({
      action: 'adminUploadMedia', email: session.email, password: session.password,
      fileBase64, fileNameHint: file.name
    });
    if (!res || !res.ok) throw new Error((res && res.error) || 'Image upload failed.');
    return res.url;
  }
  return urlInput.value.trim();
}

function cplClearImageField(prefix) {
  document.getElementById(`${prefix}-url`).value = '';
  document.getElementById(`${prefix}-file`).value = '';
  document.getElementById(`${prefix}-preview`).innerHTML = '';
}

// ---------------------------------------------------------------------
// Standings — edit team stats directly, per league
// ---------------------------------------------------------------------

const STANDINGS_ADMIN_FIELDS = ['Played', 'W', 'D', 'L', 'GF', 'GA', 'GD', 'Clean Sheets', 'Points'];

function renderStandingsAdminPanel(el, session) {
  el.innerHTML = `
    <div class="panel">
      <span class="eyebrow">League Table</span>
      <p>Edit a team's stats and press Save on that row. Team names must match <code>Teams_A</code>/<code>Teams_B</code> exactly to link up correctly elsewhere on the site.</p>
      <p>Approving a team registration under the <strong>Approvals</strong> tab automatically adds it (with all-zero stats) to its league's table below. Use the button below to catch up any team that was approved before this, or added straight to <code>Teams_A</code>/<code>Teams_B</code> by hand.</p>
      <button class="btn secondary" id="standings-sync-btn" style="margin:0 0 12px 0;">Sync Teams from Registrations</button>
      <div class="msg" id="standings-sync-msg"></div>
      <div class="tabs" style="margin-bottom:0;">
        <button data-league="A" class="active">League A</button>
        <button data-league="B">League B</button>
      </div>
    </div>
    <div id="standings-admin-list"><p class="loading">Loading standings…</p></div>
  `;

  let currentLeague = 'A';
  const buttons = Array.from(el.querySelectorAll('[data-league]'));
  buttons.forEach(b => b.addEventListener('click', () => {
    buttons.forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    currentLeague = b.dataset.league;
    loadStandingsAdminList(currentLeague, session);
  }));

  document.getElementById('standings-sync-btn').addEventListener('click', async () => {
    const msg = document.getElementById('standings-sync-msg');
    const btn = document.getElementById('standings-sync-btn');
    btn.disabled = true;
    btn.textContent = 'Syncing…';
    try {
      const res = await CPL.post({ action: 'adminSyncStandings', email: session.email, password: session.password });
      if (res && res.ok) {
        cplShowMsg(msg, res.added ? `Added ${res.added} missing team row(s).` : 'Everything was already in sync.', 'ok');
        delete CPL._cache['Standings_A'];
        delete CPL._cache['Standings_B'];
        loadStandingsAdminList(currentLeague, session);
      } else {
        cplShowMsg(msg, (res && res.error) || 'Could not sync standings.', 'err');
      }
    } catch (err) {
      cplShowMsg(msg, 'Network error — please try again.', 'err');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Sync Teams from Registrations';
    }
  });

  loadStandingsAdminList(currentLeague, session);
}

async function loadStandingsAdminList(league, session) {
  const container = document.getElementById('standings-admin-list');
  container.innerHTML = '<div class="panel"><p class="loading">Loading…</p></div>';
  const tab = 'Standings_' + league;
  try {
    const rows = await cplAdminListRows(tab, session);
    container.innerHTML = `
      <div class="panel">
        <span class="eyebrow">Standings — League ${league}</span>
        <table class="data">
          <thead><tr><th>Team</th>${STANDINGS_ADMIN_FIELDS.map(f => `<th class="num">${cplEscape(f)}</th>`).join('')}<th></th></tr></thead>
          <tbody>
            ${rows.map((r, i) => `
              <tr>
                <td>${cplEscape(r.Team)}</td>
                ${STANDINGS_ADMIN_FIELDS.map(f => `<td><input type="number" data-field="${f}" value="${cplEscape(r[f] || 0)}" style="width:60px;"></td>`).join('')}
                <td style="white-space:nowrap;">
                  <button class="btn secondary standings-save-btn" data-idx="${i}" style="margin:0 6px 0 0;padding:8px 12px;">Save</button>
                  <button class="btn secondary standings-delete-btn" data-idx="${i}" style="margin:0;padding:8px 12px;">Delete</button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
        <button id="standings-add-btn" class="btn secondary" style="margin-top:16px;">+ Add Team Row</button>
        <div class="msg" id="standings-msg"></div>
      </div>`;

    container.querySelectorAll('.standings-save-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const row = rows[Number(btn.dataset.idx)];
        const tr = btn.closest('tr');
        const data = { Team: row.Team };
        STANDINGS_ADMIN_FIELDS.forEach(f => { data[f] = tr.querySelector(`[data-field="${f}"]`).value || 0; });
        const msg = document.getElementById('standings-msg');
        try {
          await cplAdminSaveRow(tab, row.__row, data, session);
          delete CPL._cache[tab];
          cplShowMsg(msg, `Saved ${row.Team}.`, 'ok');
        } catch (err) {
          cplShowMsg(msg, err.message || 'Could not save.', 'err');
        }
      });
    });

    container.querySelectorAll('.standings-delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const row = rows[Number(btn.dataset.idx)];
        if (!confirm(`Remove "${row.Team}" from the table?`)) return;
        try {
          await cplAdminDeleteRow(tab, row.__row, session);
          delete CPL._cache[tab];
          loadStandingsAdminList(league, session);
        } catch (err) {
          alert(err.message);
        }
      });
    });

    document.getElementById('standings-add-btn').addEventListener('click', async () => {
      const teamName = prompt(`Team name (must match Teams_${league} exactly):`);
      if (!teamName || !teamName.trim()) return;
      const data = { Team: teamName.trim() };
      STANDINGS_ADMIN_FIELDS.forEach(f => { data[f] = 0; });
      try {
        await cplAdminSaveRow(tab, '', data, session);
        delete CPL._cache[tab];
        loadStandingsAdminList(league, session);
      } catch (err) {
        alert(err.message);
      }
    });
  } catch (err) {
    console.error(err);
    container.innerHTML = `<div class="panel"><p class="empty">Could not load standings. ${cplEscape(err.message)}</p></div>`;
  }
}

// ---------------------------------------------------------------------
// Player Stats — goals / assists / clean sheets / cards, per player
// ---------------------------------------------------------------------

const PLAYERSTATS_ADMIN_FIELDS = ['Goals', 'Assists', 'Clean Sheets', 'Yellow', 'Red'];

function renderPlayerStatsAdminPanel(el, session) {
  el.innerHTML = `
    <div class="panel">
      <span class="eyebrow">Player Stats / Scoring</span>
      <p>Goals, assists, clean sheets, and cards per player — this feeds Top Scorers / Top Clean Sheets on the League A/B pages. Edit a row and press Save, or add a new player row below.</p>
      <div class="tabs" style="margin-bottom:0;">
        <button data-league="A" class="active">League A</button>
        <button data-league="B">League B</button>
      </div>
    </div>
    <div id="playerstats-admin-list"><p class="loading">Loading player stats…</p></div>
  `;

  let currentLeague = 'A';
  const buttons = Array.from(el.querySelectorAll('[data-league]'));
  buttons.forEach(b => b.addEventListener('click', () => {
    buttons.forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    currentLeague = b.dataset.league;
    loadPlayerStatsAdminList(currentLeague, session);
  }));

  loadPlayerStatsAdminList(currentLeague, session);
}

async function loadPlayerStatsAdminList(league, session) {
  const container = document.getElementById('playerstats-admin-list');
  container.innerHTML = '<div class="panel"><p class="loading">Loading…</p></div>';
  const tab = 'PlayerStats_' + league;
  try {
    const rows = await cplAdminListRows(tab, session);
    container.innerHTML = `
      <div class="panel">
        <span class="eyebrow">Player Stats — League ${league}</span>
        <table class="data">
          <thead><tr><th>Player</th><th>Team</th>${PLAYERSTATS_ADMIN_FIELDS.map(f => `<th class="num">${cplEscape(f)}</th>`).join('')}<th></th></tr></thead>
          <tbody>
            ${rows.map((r, i) => `
              <tr>
                <td>${cplEscape(r.Player)}</td>
                <td>${cplEscape(r.Team)}</td>
                ${PLAYERSTATS_ADMIN_FIELDS.map(f => `<td><input type="number" data-field="${f}" value="${cplEscape(r[f] || 0)}" style="width:60px;"></td>`).join('')}
                <td style="white-space:nowrap;">
                  <button class="btn secondary ps-save-btn" data-idx="${i}" style="margin:0 6px 0 0;padding:8px 12px;">Save</button>
                  <button class="btn secondary ps-delete-btn" data-idx="${i}" style="margin:0;padding:8px 12px;">Delete</button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
        <button id="playerstats-add-btn" class="btn secondary" style="margin-top:16px;">+ Add Player Row</button>
        <div class="msg" id="playerstats-msg"></div>
      </div>`;

    container.querySelectorAll('.ps-save-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const row = rows[Number(btn.dataset.idx)];
        const tr = btn.closest('tr');
        const data = { Player: row.Player, Team: row.Team };
        PLAYERSTATS_ADMIN_FIELDS.forEach(f => { data[f] = tr.querySelector(`[data-field="${f}"]`).value || 0; });
        const msg = document.getElementById('playerstats-msg');
        try {
          await cplAdminSaveRow(tab, row.__row, data, session);
          delete CPL._cache[tab];
          cplShowMsg(msg, `Saved ${row.Player}.`, 'ok');
        } catch (err) {
          cplShowMsg(msg, err.message || 'Could not save.', 'err');
        }
      });
    });

    container.querySelectorAll('.ps-delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const row = rows[Number(btn.dataset.idx)];
        if (!confirm(`Remove "${row.Player}" from Player Stats?`)) return;
        try {
          await cplAdminDeleteRow(tab, row.__row, session);
          delete CPL._cache[tab];
          loadPlayerStatsAdminList(league, session);
        } catch (err) {
          alert(err.message);
        }
      });
    });

    document.getElementById('playerstats-add-btn').addEventListener('click', async () => {
      const playerName = prompt('Player name (must match Player_Profiles exactly):');
      if (!playerName || !playerName.trim()) return;
      const teamName = prompt('Team name:');
      if (teamName === null) return;
      const data = { Player: playerName.trim(), Team: (teamName || '').trim() };
      PLAYERSTATS_ADMIN_FIELDS.forEach(f => { data[f] = 0; });
      try {
        await cplAdminSaveRow(tab, '', data, session);
        delete CPL._cache[tab];
        loadPlayerStatsAdminList(league, session);
      } catch (err) {
        alert(err.message);
      }
    });
  } catch (err) {
    console.error(err);
    container.innerHTML = `<div class="panel"><p class="empty">Could not load player stats. ${cplEscape(err.message)}</p></div>`;
  }
}

// ---------------------------------------------------------------------
// Fixtures & Results — add fixtures, enter scores, poster images
// ---------------------------------------------------------------------

function renderFixturesAdminPanel(el, session) {
  el.innerHTML = `
    <div class="panel">
      <span class="eyebrow">Fixtures &amp; Results</span>
      <p>Enter a score on a fixture and it automatically writes the matching row in Results_A/B (matched by Matchday + Home + Away — the same convention the public site already uses). Choose League A or League B above before adding a fixture — that's what decides whether it's written to Fixtures_A or Fixtures_B. Assign a referee from the dropdown (only approved referees show up there) — Save works even if you only change the referee.</p>
      <div class="tabs" style="margin-bottom:0;">
        <button data-league="A" class="active">League A</button>
        <button data-league="B">League B</button>
      </div>
    </div>
    <div class="panel">
      <span class="eyebrow">Add Fixture</span>
      <label for="fx-matchday">Matchday</label>
      <input id="fx-matchday" type="text" placeholder="e.g. MD3">
      <label for="fx-date">Date</label>
      <input id="fx-date" type="text" placeholder="YYYY-MM-DD" value="${new Date().toISOString().slice(0, 10)}">
      <label for="fx-home">Home Team</label>
      <select id="fx-home"></select>
      <label for="fx-away">Away Team</label>
      <select id="fx-away"></select>
      <label for="fx-referee">Referee <span class="opt">(optional)</span></label>
      <select id="fx-referee"><option value="">— Unassigned —</option></select>
      <label for="fx-status">Status</label>
      <select id="fx-status">
        <option value="Scheduled">Scheduled</option>
        <option value="Postponed">Postponed</option>
        <option value="Cancelled">Cancelled</option>
      </select>
      ${cplImageFieldHtml('fx-poster', 'Poster Image (optional)', '')}
      <button id="fx-add-btn" style="margin-top:12px;">Add Fixture</button>
      <div class="msg" id="fx-add-msg"></div>
    </div>
    <div id="fixtures-admin-list"><p class="loading">Loading fixtures…</p></div>
  `;
  cplWireImagePreview('fx-poster');

  let currentLeague = 'A';
  const buttons = Array.from(el.querySelectorAll('[data-league]'));
  buttons.forEach(b => b.addEventListener('click', () => {
    buttons.forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    currentLeague = b.dataset.league;
    loadTeamOptions(currentLeague);
    loadRefereeOptions();
    loadFixturesAdminList(currentLeague, session);
  }));

  async function loadRefereeOptions() {
    const sel = document.getElementById('fx-referee');
    const current = sel.value;
    sel.innerHTML = '<option value="">— Unassigned —</option>';
    try {
      const referees = await CPL.get('Referees');
      referees
        .filter(r => (r.Status || '').trim().toLowerCase() !== 'pending')
        .sort((a, b) => (a.Name || '').localeCompare(b.Name || ''))
        .forEach(r => sel.appendChild(cplEl(`<option value="${cplEscape(r.Name)}">${cplEscape(r.Name)}</option>`)));
      if (current) sel.value = current;
    } catch (err) {
      console.error(err);
    }
  }

  async function loadTeamOptions(league) {
    const homeSel = document.getElementById('fx-home');
    const awaySel = document.getElementById('fx-away');
    homeSel.innerHTML = '';
    awaySel.innerHTML = '';
    try {
      // A team can end up "known to the league" three different ways in
      // this dashboard, and all three used to need a separate manual
      // step before it would show up here — which is exactly the "I
      // added a team but Fixtures still says none yet" bug:
      //   1. Teams_A/B — the curated tab (hand-edited in the Sheet).
      //   2. Team_Registrations — a self-serve registration, once approved.
      //   3. Standings_A/B — added via the Standings tab's "+ Add Team
      //      Row" button, which is the *only* team-adding control this
      //      dashboard actually exposes today. A team added there alone
      //      (very common) never appeared in Teams_A/B or
      //      Team_Registrations, so it silently never showed up here.
      // Merge all three so any team an admin has added anywhere is
      // selectable immediately. Force a fresh fetch (bypass CPL's
      // in-memory cache) so a team approved/added moments earlier in
      // this same session shows up right away instead of needing a
      // full page reload.
      delete CPL._cache['Teams_' + league];
      delete CPL._cache['Team_Registrations'];
      delete CPL._cache['Standings_' + league];
      const [teams, regTeams, standings] = await Promise.all([
        CPL.get('Teams_' + league), CPL.get('Team_Registrations'), CPL.get('Standings_' + league)
      ]);
      const names = new Set();
      teams.forEach(t => { if (t.Name) names.add(t.Name.trim()); });
      standings.forEach(s => { if (s.Team) names.add(s.Team.trim()); });
      regTeams.forEach(r => {
        if ((r.Status || '').trim().toLowerCase() === 'pending') return;
        if ((r.League || '').trim().toUpperCase() !== league) return;
        if (r.Team) names.add(r.Team.trim());
      });
      Array.from(names).sort((a, b) => a.localeCompare(b)).forEach(name => {
        homeSel.appendChild(cplEl(`<option value="${cplEscape(name)}">${cplEscape(name)}</option>`));
        awaySel.appendChild(cplEl(`<option value="${cplEscape(name)}">${cplEscape(name)}</option>`));
      });
      if (!names.size) {
        homeSel.appendChild(cplEl(`<option value="">No teams yet for League ${cplEscape(league)}</option>`));
        awaySel.appendChild(cplEl(`<option value="">No teams yet for League ${cplEscape(league)}</option>`));
        cplShowMsg(document.getElementById('fx-add-msg'),
          `No teams found for League ${league} yet — add one via Standings ("+ Add Team Row"), approve a team registration for League ${league}, or add it to Teams_${league} in the Sheet.`, 'err');
      }
    } catch (err) {
      console.error(err);
    }
  }

  document.getElementById('fx-add-btn').addEventListener('click', async () => {
    const msg = document.getElementById('fx-add-msg');
    const matchday = document.getElementById('fx-matchday').value.trim();
    const date = document.getElementById('fx-date').value.trim();
    const home = document.getElementById('fx-home').value;
    const away = document.getElementById('fx-away').value;
    if (!matchday || !date || !home || !away) {
      cplShowMsg(msg, 'Matchday, date, home and away teams are required.', 'err');
      return;
    }
    if (home === away) {
      cplShowMsg(msg, 'Home and away teams must be different.', 'err');
      return;
    }
    const btn = document.getElementById('fx-add-btn');
    btn.disabled = true;
    btn.textContent = 'Adding…';
    try {
      const posterUrl = await cplResolveImageField('fx-poster', session);
      await cplAdminSaveRow('Fixtures_' + currentLeague, '', {
        Matchday: matchday, Date: date, Home: home, Away: away,
        Referee: document.getElementById('fx-referee').value,
        Status: document.getElementById('fx-status').value, 'Poster URL': posterUrl
      }, session);
      cplShowMsg(msg, 'Fixture added.', 'ok');
      document.getElementById('fx-matchday').value = '';
      document.getElementById('fx-referee').value = '';
      cplClearImageField('fx-poster');
      delete CPL._cache['Fixtures_' + currentLeague];
      loadFixturesAdminList(currentLeague, session);
    } catch (err) {
      cplShowMsg(msg, err.message || 'Could not add fixture.', 'err');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Add Fixture';
    }
  });

  loadTeamOptions(currentLeague);
  loadRefereeOptions();
  loadFixturesAdminList(currentLeague, session);
}

async function loadFixturesAdminList(league, session) {
  const container = document.getElementById('fixtures-admin-list');
  container.innerHTML = '<div class="panel"><p class="loading">Loading…</p></div>';
  const fxTab = 'Fixtures_' + league;
  const resTab = 'Results_' + league;
  try {
    const [fixtures, results, referees] = await Promise.all([
      cplAdminListRows(fxTab, session),
      cplAdminListRows(resTab, session),
      CPL.get('Referees')
    ]);
    const sorted = [...fixtures].sort((a, b) => cplParseDate(a.Date) - cplParseDate(b.Date));
    const resultByRef = {};
    results.forEach(r => { resultByRef[r['Fixture Ref']] = r; });
    const activeReferees = referees
      .filter(r => (r.Status || '').trim().toLowerCase() !== 'pending')
      .sort((a, b) => (a.Name || '').localeCompare(b.Name || ''));
    const refereeOptionsHtml = current => `<option value="">— Unassigned —</option>${activeReferees.map(r =>
      `<option value="${cplEscape(r.Name)}" ${r.Name === current ? 'selected' : ''}>${cplEscape(r.Name)}</option>`).join('')}`;

    container.innerHTML = `
      <div class="panel">
        <span class="eyebrow">Fixtures — League ${league}</span>
        <table class="data">
          <thead><tr><th>MD</th><th>Date</th><th>Home</th><th>Away</th><th>Home G</th><th>Away G</th><th>Referee</th><th>Status</th><th>Poster</th><th></th></tr></thead>
          <tbody>
            ${sorted.map((f, i) => {
              const ref = `${f.Matchday}-${f.Home}-${f.Away}`;
              const result = resultByRef[ref];
              return `
              <tr>
                <td>${cplEscape(f.Matchday)}</td>
                <td>${cplEscape(f.Date)}</td>
                <td>${cplEscape(f.Home)}</td>
                <td>${cplEscape(f.Away)}</td>
                <td><input type="number" class="fx-hg" style="width:56px;" value="${cplEscape(result ? result['Home Goals'] : '')}"></td>
                <td><input type="number" class="fx-ag" style="width:56px;" value="${cplEscape(result ? result['Away Goals'] : '')}"></td>
                <td><select class="fx-referee" style="min-width:120px;">${refereeOptionsHtml(f.Referee || '')}</select></td>
                <td>${cplEscape(f.Status || 'Scheduled')}</td>
                <td>${f['Poster URL'] ? `<img src="${cplEscape(f['Poster URL'])}" alt="" style="width:36px;height:36px;object-fit:cover;border:1px solid var(--line);">` : '—'}</td>
                <td style="white-space:nowrap;">
                  <button class="btn secondary fx-save-score-btn" data-idx="${i}" style="margin:0 6px 6px 0;padding:8px 12px;">Save</button>
                  <button class="btn secondary fx-delete-btn" data-idx="${i}" style="margin:0;padding:8px 12px;">Delete</button>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
        <div class="msg" id="fixtures-list-msg"></div>
      </div>`;

    container.querySelectorAll('.fx-save-score-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const f = sorted[Number(btn.dataset.idx)];
        const tr = btn.closest('tr');
        const hg = tr.querySelector('.fx-hg').value;
        const ag = tr.querySelector('.fx-ag').value;
        const refereeVal = tr.querySelector('.fx-referee').value;
        const ref = `${f.Matchday}-${f.Home}-${f.Away}`;
        const existing = resultByRef[ref];
        const msg = document.getElementById('fixtures-list-msg');
        try {
          if (hg !== '' && ag !== '') {
            await cplAdminSaveRow(resTab, existing ? existing.__row : '', {
              'Fixture Ref': ref, 'Home Goals': hg, 'Away Goals': ag
            }, session);
          }
          await cplAdminSaveRow(fxTab, f.__row, {
            Referee: refereeVal,
            Status: (hg !== '' && ag !== '') ? 'Played' : (f.Status || 'Scheduled')
          }, session);
          delete CPL._cache[fxTab];
          delete CPL._cache[resTab];
          cplShowMsg(msg, 'Saved.', 'ok');
          loadFixturesAdminList(league, session);
        } catch (err) {
          cplShowMsg(msg, err.message || 'Could not save.', 'err');
        }
      });
    });

    container.querySelectorAll('.fx-delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const f = sorted[Number(btn.dataset.idx)];
        if (!confirm(`Delete fixture ${f.Home} vs ${f.Away} (${f.Matchday})? This also removes its result, if any.`)) return;
        try {
          const ref = `${f.Matchday}-${f.Home}-${f.Away}`;
          const existing = resultByRef[ref];
          if (existing) await cplAdminDeleteRow(resTab, existing.__row, session);
          await cplAdminDeleteRow(fxTab, f.__row, session);
          delete CPL._cache[fxTab];
          delete CPL._cache[resTab];
          loadFixturesAdminList(league, session);
        } catch (err) {
          alert(err.message);
        }
      });
    });
  } catch (err) {
    console.error(err);
    container.innerHTML = `<div class="panel"><p class="empty">Could not load fixtures. ${cplEscape(err.message)}</p></div>`;
  }
}

// ---------------------------------------------------------------------
// Gallery — add/remove match photos & videos, with thumbnails
// ---------------------------------------------------------------------

function renderGalleryAdminPanel(el, session) {
  el.innerHTML = `
    <div class="panel">
      <span class="eyebrow">Add Gallery Media</span>
      <label for="gal-matchday">Matchday</label>
      <input id="gal-matchday" type="text" placeholder="e.g. MD3">
      <label for="gal-home">Home Team</label>
      <input id="gal-home" type="text">
      <label for="gal-away">Away Team</label>
      <input id="gal-away" type="text">
      <label for="gal-date">Date</label>
      <input id="gal-date" type="text" placeholder="YYYY-MM-DD" value="${new Date().toISOString().slice(0, 10)}">
      <label for="gal-league">League</label>
      <select id="gal-league"><option value="A">A</option><option value="B">B</option></select>
      <label for="gal-type">Media Type</label>
      <select id="gal-type"><option value="Image">Image</option><option value="Video">Video</option></select>
      ${cplImageFieldHtml('gal-media', 'Image (leave blank and use a video link instead, if Video)', '')}
      <label for="gal-caption">Caption <span class="opt">(optional)</span></label>
      <input id="gal-caption" type="text">
      <button id="gal-add-btn">Add to Gallery</button>
      <div class="msg" id="gal-add-msg"></div>
    </div>
    <div id="gallery-admin-list"><p class="loading">Loading gallery…</p></div>
  `;
  cplWireImagePreview('gal-media');

  document.getElementById('gal-add-btn').addEventListener('click', async () => {
    const msg = document.getElementById('gal-add-msg');
    const matchday = document.getElementById('gal-matchday').value.trim();
    const home = document.getElementById('gal-home').value.trim();
    const away = document.getElementById('gal-away').value.trim();
    if (!matchday || !home || !away) {
      cplShowMsg(msg, 'Matchday, home and away teams are required.', 'err');
      return;
    }
    const btn = document.getElementById('gal-add-btn');
    btn.disabled = true;
    btn.textContent = 'Adding…';
    try {
      const mediaUrl = await cplResolveImageField('gal-media', session);
      if (!mediaUrl) throw new Error('Choose an image, or paste a media URL for a video.');
      await cplAdminSaveRow('Game_Gallery', '', {
        Matchday: matchday, Home: home, Away: away,
        Date: document.getElementById('gal-date').value.trim(),
        League: document.getElementById('gal-league').value,
        'Media Type': document.getElementById('gal-type').value,
        'Media URL': mediaUrl,
        Caption: document.getElementById('gal-caption').value.trim()
      }, session);
      cplShowMsg(msg, 'Added.', 'ok');
      ['gal-matchday', 'gal-home', 'gal-away', 'gal-caption'].forEach(id => { document.getElementById(id).value = ''; });
      cplClearImageField('gal-media');
      delete CPL._cache['Game_Gallery'];
      loadGalleryAdminList(session);
    } catch (err) {
      cplShowMsg(msg, err.message || 'Could not add.', 'err');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Add to Gallery';
    }
  });

  loadGalleryAdminList(session);
}

async function loadGalleryAdminList(session) {
  const container = document.getElementById('gallery-admin-list');
  try {
    const rows = await cplAdminListRows('Game_Gallery', session);
    if (!rows.length) {
      container.innerHTML = '<div class="panel"><p class="empty">No media yet.</p></div>';
      return;
    }
    const sorted = [...rows].sort((a, b) => cplParseDate(b.Date) - cplParseDate(a.Date));
    container.innerHTML = `
      <div class="panel">
        <span class="eyebrow">Gallery Items</span>
        <div class="card-grid">
          ${sorted.map((r, i) => `
            <div class="card">
              ${r['Media Type'] === 'Video'
                ? `<div class="empty">Video</div>`
                : `<img class="thumb" style="width:100%;height:120px;object-fit:cover;" src="${cplEscape(r['Media URL'])}" alt="">`}
              <p>${cplEscape(r.Home)} vs ${cplEscape(r.Away)} &middot; ${cplEscape(r.Matchday)}</p>
              <p style="color:var(--muted);">${cplEscape(r.Caption || '')}</p>
              <button class="btn secondary gal-delete-btn" data-idx="${i}" style="margin-top:8px;padding:8px 12px;">Delete</button>
            </div>`).join('')}
        </div>
      </div>`;
    container.querySelectorAll('.gal-delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const row = sorted[Number(btn.dataset.idx)];
        if (!confirm('Delete this gallery item?')) return;
        try {
          await cplAdminDeleteRow('Game_Gallery', row.__row, session);
          delete CPL._cache['Game_Gallery'];
          loadGalleryAdminList(session);
        } catch (err) {
          alert(err.message);
        }
      });
    });
  } catch (err) {
    console.error(err);
    container.innerHTML = `<div class="panel"><p class="empty">Could not load gallery. ${cplEscape(err.message)}</p></div>`;
  }
}

// ---------------------------------------------------------------------
// Team Galleries — moderation view of the photos teams upload themselves
// from their My Profile page (see my-profile.js). Admin can only delete
// here (teams add their own); nothing to "add" from this side.
// ---------------------------------------------------------------------

function renderTeamGalleryAdminPanel(el, session) {
  el.innerHTML = `
    <div class="panel">
      <span class="eyebrow">Team Galleries</span>
      <p>Photos teams have uploaded to their own gallery from their My Profile page. Remove anything inappropriate or off-topic — teams can also delete their own uploads themselves.</p>
      <button class="btn secondary" id="teamgal-refresh" style="margin-top:0;">Refresh</button>
    </div>
    <div id="team-gallery-admin-list"><p class="loading">Loading…</p></div>
  `;
  document.getElementById('teamgal-refresh').addEventListener('click', () => loadTeamGalleryAdminList(session));
  loadTeamGalleryAdminList(session);
}

async function loadTeamGalleryAdminList(session) {
  const container = document.getElementById('team-gallery-admin-list');
  try {
    const rows = await cplAdminListRows('Team_Gallery', session);
    if (!rows.length) {
      container.innerHTML = '<div class="panel"><p class="empty">No team-uploaded photos yet.</p></div>';
      return;
    }
    const sorted = [...rows].sort((a, b) => cplParseDate(b.Date) - cplParseDate(a.Date));
    container.innerHTML = `
      <div class="panel">
        <span class="eyebrow">Uploads</span>
        <div class="card-grid">
          ${sorted.map((r, i) => `
            <div class="card">
              <img class="thumb" style="width:100%;height:120px;object-fit:cover;" src="${cplEscape(r['Media URL'])}" alt="">
              <p><strong>${cplEscape(r.Team)}</strong> &middot; League ${cplEscape(r.League || '')}</p>
              <p style="color:var(--muted);">${cplEscape(r.Caption || '')}</p>
              <p style="color:var(--muted);font-size:0.8rem;">By ${cplEscape(r['Uploaded By'] || 'team')} &middot; ${cplEscape(r.Date)}</p>
              <button class="btn secondary teamgal-delete-btn" data-idx="${i}" style="margin-top:8px;padding:8px 12px;">Delete</button>
            </div>`).join('')}
        </div>
      </div>`;
    container.querySelectorAll('.teamgal-delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const row = sorted[Number(btn.dataset.idx)];
        if (!confirm(`Delete this photo from ${row.Team}'s gallery?`)) return;
        try {
          await cplAdminDeleteRow('Team_Gallery', row.__row, session);
          delete CPL._cache['Team_Gallery'];
          loadTeamGalleryAdminList(session);
        } catch (err) {
          alert(err.message);
        }
      });
    });
  } catch (err) {
    console.error(err);
    container.innerHTML = `<div class="panel"><p class="empty">Could not load team galleries. ${cplEscape(err.message)}</p></div>`;
  }
}

// ---------------------------------------------------------------------
// Equipment
// ---------------------------------------------------------------------

function renderEquipmentAdminPanel(el, session) {
  el.innerHTML = `
    <div class="panel">
      <span class="eyebrow">Add Equipment</span>
      <label for="eq-item">Item</label>
      <input id="eq-item" type="text" required>
      <label for="eq-category">Category <span class="opt">(optional)</span></label>
      <input id="eq-category" type="text">
      <label for="eq-sponsor">Sponsor <span class="opt">(optional)</span></label>
      <input id="eq-sponsor" type="text">
      <label for="eq-show" style="display:flex;align-items:center;gap:8px;">
        <input id="eq-show" type="checkbox" checked style="width:auto;margin:0;">Show on site
      </label>
      <button id="eq-add-btn">Add Equipment</button>
      <div class="msg" id="eq-add-msg"></div>
    </div>
    <div id="equipment-admin-list"><p class="loading">Loading equipment…</p></div>
  `;

  document.getElementById('eq-add-btn').addEventListener('click', async () => {
    const msg = document.getElementById('eq-add-msg');
    const item = document.getElementById('eq-item').value.trim();
    if (!item) {
      cplShowMsg(msg, 'Item name is required.', 'err');
      return;
    }
    const btn = document.getElementById('eq-add-btn');
    btn.disabled = true;
    btn.textContent = 'Adding…';
    try {
      await cplAdminSaveRow('Equipment', '', {
        Item: item,
        Category: document.getElementById('eq-category').value.trim(),
        Sponsor: document.getElementById('eq-sponsor').value.trim(),
        'Show on Site (Y/N)': document.getElementById('eq-show').checked ? 'Y' : 'N'
      }, session);
      cplShowMsg(msg, 'Added.', 'ok');
      document.getElementById('eq-item').value = '';
      document.getElementById('eq-category').value = '';
      document.getElementById('eq-sponsor').value = '';
      delete CPL._cache['Equipment'];
      loadEquipmentAdminList(session);
    } catch (err) {
      cplShowMsg(msg, err.message || 'Could not add.', 'err');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Add Equipment';
    }
  });

  loadEquipmentAdminList(session);
}

async function loadEquipmentAdminList(session) {
  const container = document.getElementById('equipment-admin-list');
  try {
    const rows = await cplAdminListRows('Equipment', session);
    if (!rows.length) {
      container.innerHTML = '<div class="panel"><p class="empty">No equipment listed yet.</p></div>';
      return;
    }
    container.innerHTML = `
      <div class="panel">
        <span class="eyebrow">Equipment</span>
        <table class="data">
          <thead><tr><th>Item</th><th>Category</th><th>Sponsor</th><th>Show</th><th></th></tr></thead>
          <tbody>
            ${rows.map((r, i) => `
              <tr>
                <td>${cplEscape(r.Item)}</td>
                <td>${cplEscape(r.Category || '')}</td>
                <td>${cplEscape(r.Sponsor || '')}</td>
                <td>${cplEscape(r['Show on Site (Y/N)'] || '')}</td>
                <td><button class="btn secondary eq-delete-btn" data-idx="${i}" style="margin:0;padding:8px 12px;">Delete</button></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
    container.querySelectorAll('.eq-delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const row = rows[Number(btn.dataset.idx)];
        if (!confirm(`Delete "${row.Item}"?`)) return;
        try {
          await cplAdminDeleteRow('Equipment', row.__row, session);
          delete CPL._cache['Equipment'];
          loadEquipmentAdminList(session);
        } catch (err) {
          alert(err.message);
        }
      });
    });
  } catch (err) {
    console.error(err);
    container.innerHTML = `<div class="panel"><p class="empty">Could not load equipment. ${cplEscape(err.message)}</p></div>`;
  }
}

// ---------------------------------------------------------------------
// Approvals — pending players / teams / referees
// ---------------------------------------------------------------------

async function renderApprovalsPanel(el, session) {
  el.innerHTML = `
    <div class="panel">
      <span class="eyebrow">Pending Registrations</span>
      <p>Approving a <strong>player</strong> sets their status to Paid, which triggers automatic CPL number
      assignment. Approving a <strong>team</strong>, <strong>referee</strong>, or <strong>official</strong> makes
      their listing live. Team approval only affects their registration record — add full team details (logo,
      colors, ground, coach) directly in the <code>Teams_A</code>/<code>Teams_B</code> sheet tabs as before.</p>
      <button class="btn secondary" id="approvals-refresh" style="margin-top:0;">Refresh</button>
    </div>
    <div id="approvals-players"><p class="loading">Loading pending players…</p></div>
    <div id="approvals-teams"><p class="loading">Loading pending teams…</p></div>
    <div id="approvals-referees"><p class="loading">Loading pending referees…</p></div>
    <div id="approvals-officials"><p class="loading">Loading pending officials…</p></div>
  `;

  document.getElementById('approvals-refresh').addEventListener('click', () => {
    delete CPL._cache['Player_Profiles'];
    delete CPL._cache['Team_Registrations'];
    delete CPL._cache['Referees'];
    delete CPL._cache['Officials'];
    loadApprovals();
  });

  async function loadApprovals() {
    await Promise.all([
      loadPendingGroup('approvals-players', 'Player_Profiles', 'Player', session, 'player'),
      loadPendingGroup('approvals-teams', 'Team_Registrations', 'Team', session, 'team'),
      loadPendingGroup('approvals-referees', 'Referees', 'Name', session, 'referee'),
      loadPendingGroup('approvals-officials', 'Officials', 'Name', session, 'official')
    ]);
  }

  loadApprovals();
}

async function loadPendingGroup(containerId, tabName, nameField, session, type) {
  const container = document.getElementById(containerId);
  container.innerHTML = `<div class="panel"><p class="loading">Loading…</p></div>`;
  try {
    // Pulled straight from the Sheet via an authenticated admin action
    // (not the public CSV export) so each row carries a __row sheet
    // reference — approve/reject act on that row number directly instead
    // of re-matching by name/email/contact text, which is what used to
    // make approvals (referees especially) silently fail.
    const res = await CPL.post({ action: 'adminListPending', email: session.email, password: session.password, type });
    if (!res || !res.ok) throw new Error((res && res.error) || 'Could not load pending list.');
    const pending = res.rows;
    const label = { player: 'Pending Players', team: 'Pending Teams', referee: 'Pending Referees', official: 'Pending Officials' }[type];

    if (!pending.length) {
      container.innerHTML = `<div class="panel"><span class="eyebrow">${label}</span><p class="empty">Nothing pending.</p></div>`;
      return;
    }

    container.innerHTML = `
      <div class="panel">
        <span class="eyebrow">${label}</span>
        <table class="data">
          <thead><tr><th>${nameField}</th><th>Details</th><th></th></tr></thead>
          <tbody>
            ${pending.map((r, i) => `
              <tr data-idx="${i}">
                <td>${cplEscape(r[nameField])}</td>
                <td>${cplEscape(adminRowSummary(type, r))}</td>
                <td style="white-space:nowrap;">
                  <button class="btn secondary approve-btn" data-idx="${i}" style="margin:0 6px 0 0;padding:8px 12px;">Approve</button>
                  <button class="btn secondary reject-btn" data-idx="${i}" style="margin:0;padding:8px 12px;">Reject</button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;

    container.querySelectorAll('.approve-btn').forEach(btn => {
      btn.addEventListener('click', () => adminActOnRegistration(type, pending[Number(btn.dataset.idx)], 'approve', session, containerId, tabName, nameField));
    });
    container.querySelectorAll('.reject-btn').forEach(btn => {
      btn.addEventListener('click', () => adminActOnRegistration(type, pending[Number(btn.dataset.idx)], 'reject', session, containerId, tabName, nameField));
    });
  } catch (err) {
    console.error(err);
    container.innerHTML = `<div class="panel"><p class="empty">Could not load "${cplEscape(tabName)}". ${cplEscape(err.message)}</p></div>`;
  }
}

function adminRowSummary(type, r) {
  if (type === 'player') return `${r.Team || ''} · ${r.Position || ''} · ${r.Email || ''}`;
  if (type === 'team') return `League ${r.League || ''} · ${r['Contact Name'] || ''} · ${r['Contact Email'] || ''}`;
  if (type === 'official') return r.Role || '';
  return r.Contact || '';
}

async function adminActOnRegistration(type, row, decision, session, containerId, tabName, nameField) {
  try {
    const res = await CPL.post({
      action: 'adminReviewRegistration',
      email: session.email,
      password: session.password,
      type, decision, row: row.__row
    });
    if (res && res.ok) {
      delete CPL._cache[tabName];
      loadPendingGroup(containerId, tabName, nameField, session, type);
    } else {
      alert((res && res.error) || 'Something went wrong.');
    }
  } catch (err) {
    alert('Network error — please try again.');
  }
}

// ---------------------------------------------------------------------
// Documents — shared files shown on the homepage
// ---------------------------------------------------------------------

function renderDocumentsPanel(el, session) {
  el.innerHTML = `
    <div class="panel">
      <span class="eyebrow">Share a Document</span>
      <p>Uploads go to Google Drive and appear as a download card on the homepage.</p>
      <label for="doc-title">Title</label>
      <input id="doc-title" type="text" required>
      <label for="doc-desc">Description <span class="opt">(optional)</span></label>
      <input id="doc-desc" type="text">
      <label for="doc-category">Category <span class="opt">(optional, e.g. "Rules", "Fixtures PDF")</span></label>
      <input id="doc-category" type="text">
      <label for="doc-file">File</label>
      <input id="doc-file" type="file">
      <button id="doc-upload-btn">Upload Document</button>
      <div class="msg" id="doc-upload-msg"></div>
    </div>
    <div id="documents-list"><p class="loading">Loading documents…</p></div>
  `;

  document.getElementById('doc-upload-btn').addEventListener('click', async () => {
    const msg = document.getElementById('doc-upload-msg');
    const title = document.getElementById('doc-title').value.trim();
    const fileInput = document.getElementById('doc-file');
    const file = fileInput.files[0];
    if (!title || !file) {
      cplShowMsg(msg, 'Please provide a title and choose a file.', 'err');
      return;
    }
    const btn = document.getElementById('doc-upload-btn');
    btn.disabled = true;
    btn.textContent = 'Uploading…';
    try {
      const fileBase64 = await cplFileToBase64(file);
      const res = await CPL.post({
        action: 'uploadDocument',
        email: session.email,
        password: session.password,
        title,
        description: document.getElementById('doc-desc').value.trim(),
        category: document.getElementById('doc-category').value.trim(),
        fileName: file.name,
        fileBase64
      });
      if (res && res.ok) {
        cplShowMsg(msg, 'Document uploaded.', 'ok');
        document.getElementById('doc-title').value = '';
        document.getElementById('doc-desc').value = '';
        document.getElementById('doc-category').value = '';
        fileInput.value = '';
        delete CPL._cache['Documents'];
        loadDocumentsList(session);
      } else {
        cplShowMsg(msg, (res && res.error) || 'Upload failed.', 'err');
      }
    } catch (err) {
      cplShowMsg(msg, err.message || 'Could not process/upload that file.', 'err');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Upload Document';
    }
  });

  loadDocumentsList(session);
}

async function loadDocumentsList(session) {
  const container = document.getElementById('documents-list');
  try {
    const docs = await CPL.get('Documents');
    if (!docs.length) {
      container.innerHTML = '<div class="panel"><p class="empty">No documents shared yet.</p></div>';
      return;
    }
    container.innerHTML = `
      <div class="panel">
        <span class="eyebrow">Shared Documents</span>
        <table class="data">
          <thead><tr><th>Title</th><th>Category</th><th></th><th></th></tr></thead>
          <tbody>
            ${docs.map((d, i) => `
              <tr>
                <td>${cplEscape(d.Title)}</td>
                <td>${cplEscape(d.Category || '')}</td>
                <td><a class="btn secondary" style="margin:0;padding:8px 12px;" href="${cplEscape(d['File URL'])}" target="_blank" rel="noopener">Open</a></td>
                <td><button class="btn secondary doc-delete-btn" data-idx="${i}" style="margin:0;padding:8px 12px;">Delete</button></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
    container.querySelectorAll('.doc-delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const doc = docs[Number(btn.dataset.idx)];
        if (!confirm(`Delete "${doc.Title}"?`)) return;
        try {
          const res = await CPL.post({
            action: 'deleteDocument', email: session.email, password: session.password,
            key: { title: doc.Title, fileUrl: doc['File URL'] }
          });
          if (res && res.ok) {
            delete CPL._cache['Documents'];
            loadDocumentsList(session);
          } else {
            alert((res && res.error) || 'Could not delete.');
          }
        } catch (err) {
          alert('Network error — please try again.');
        }
      });
    });
  } catch (err) {
    console.error(err);
    container.innerHTML = `<div class="panel"><p class="empty">Could not load documents. ${cplEscape(err.message)}</p></div>`;
  }
}

// ---------------------------------------------------------------------
// Season & registration links
// ---------------------------------------------------------------------

async function renderSeasonPanel(el, session) {
  el.innerHTML = `<div class="panel"><p class="loading">Loading season config…</p></div>`;
  const cfg = await cplGetConfig();
  const base = window.location.href.replace(/admin\.html.*$/, '');

  el.innerHTML = `
    <div class="panel">
      <span class="eyebrow">Season Settings</span>
      <label for="season-name">Season Label <span class="opt">(shown in the header, e.g. "2027")</span></label>
      <input id="season-name" type="text" value="${cplEscape(cfg.SEASON || CPL_CONFIG.SEASON)}">

      <label for="season-player-open">Player Registration</label>
      <select id="season-player-open">
        <option value="Y" ${(cfg.PLAYER_REG_OPEN || 'Y') === 'Y' ? 'selected' : ''}>Open</option>
        <option value="N" ${(cfg.PLAYER_REG_OPEN || 'Y') === 'N' ? 'selected' : ''}>Closed</option>
      </select>

      <label for="season-team-open">Team Registration</label>
      <select id="season-team-open">
        <option value="Y" ${(cfg.TEAM_REG_OPEN || 'Y') === 'Y' ? 'selected' : ''}>Open</option>
        <option value="N" ${(cfg.TEAM_REG_OPEN || 'Y') === 'N' ? 'selected' : ''}>Closed</option>
      </select>

      <label for="season-referee-open">Referee Registration</label>
      <select id="season-referee-open">
        <option value="Y" ${(cfg.REFEREE_REG_OPEN || 'Y') === 'Y' ? 'selected' : ''}>Open</option>
        <option value="N" ${(cfg.REFEREE_REG_OPEN || 'Y') === 'N' ? 'selected' : ''}>Closed</option>
      </select>

      <label for="season-official-open">CPL Official Registration</label>
      <select id="season-official-open">
        <option value="Y" ${(cfg.OFFICIAL_REG_OPEN || 'Y') === 'Y' ? 'selected' : ''}>Open</option>
        <option value="N" ${(cfg.OFFICIAL_REG_OPEN || 'Y') === 'N' ? 'selected' : ''}>Closed</option>
      </select>

      <label for="season-payment-phone">M-Pesa Payment Number <span class="opt">(shown on the player/team registration pages)</span></label>
      <input id="season-payment-phone" type="text" value="${cplEscape(cfg.PAYMENT_PHONE || CPL_CONFIG.PAYMENT_PHONE_FALLBACK)}">

      <button id="season-save-btn">Save Season Settings</button>
      <div class="msg" id="season-msg"></div>
      <p style="margin-top:16px;">Starting a brand-new season with fresh standings/fixtures? Duplicate the Standings/Fixtures/Results/PlayerStats/Teams sheet tabs (e.g. copy "Standings_A" to keep a full history) before resetting them for the new season — this dashboard only controls the switches above, not the match-data tabs.</p>
    </div>

    <div class="panel">
      <span class="eyebrow">Registration Links to Share</span>
      <p>Copy these and share them (WhatsApp, posters, socials) for the current season. They automatically respect the Open/Closed switches above.</p>
      <label>Player Registration</label>
      <input type="text" readonly value="${cplEscape(base)}register-player.html">
      <label>Team Registration</label>
      <input type="text" readonly value="${cplEscape(base)}register-team.html">
      <label>Referee Registration</label>
      <input type="text" readonly value="${cplEscape(base)}register-referee.html">
      <label>CPL Official Registration</label>
      <input type="text" readonly value="${cplEscape(base)}register-official.html">
    </div>
  `;

  document.getElementById('season-save-btn').addEventListener('click', async () => {
    const msg = document.getElementById('season-msg');
    const btn = document.getElementById('season-save-btn');
    btn.disabled = true;
    btn.textContent = 'Saving…';
    try {
      const res = await CPL.post({
        action: 'updateConfig',
        email: session.email,
        password: session.password,
        config: {
          SEASON: document.getElementById('season-name').value.trim(),
          PLAYER_REG_OPEN: document.getElementById('season-player-open').value,
          TEAM_REG_OPEN: document.getElementById('season-team-open').value,
          REFEREE_REG_OPEN: document.getElementById('season-referee-open').value,
          OFFICIAL_REG_OPEN: document.getElementById('season-official-open').value,
          PAYMENT_PHONE: document.getElementById('season-payment-phone').value.trim()
        }
      });
      if (res && res.ok) {
        delete CPL._cache['Config'];
        cplShowMsg(msg, 'Saved.', 'ok');
      } else {
        cplShowMsg(msg, (res && res.error) || 'Could not save.', 'err');
      }
    } catch (err) {
      cplShowMsg(msg, 'Network error — please try again.', 'err');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save Season Settings';
    }
  });
}

// ---------------------------------------------------------------------
// Transfers
// ---------------------------------------------------------------------

function renderTransfersPanel(el, session) {
  el.innerHTML = `
    <div class="panel">
      <span class="eyebrow">Announce a Transfer</span>
      <label for="tr-date">Date</label>
      <input id="tr-date" type="text" placeholder="YYYY-MM-DD" value="${new Date().toISOString().slice(0, 10)}">
      <label for="tr-player">Player</label>
      <input id="tr-player" type="text" required>
      <label for="tr-from">From Team <span class="opt">(leave blank if a new/free agent)</span></label>
      <input id="tr-from" type="text">
      <label for="tr-to">To Team</label>
      <input id="tr-to" type="text" required>
      <label for="tr-league">League</label>
      <select id="tr-league">
        <option value="">Unspecified</option>
        <option value="A">League A</option>
        <option value="B">League B</option>
      </select>
      <label for="tr-note">Note <span class="opt">(optional)</span></label>
      <textarea id="tr-note"></textarea>
      <button id="tr-save-btn">Post Transfer</button>
      <div class="msg" id="tr-msg"></div>
    </div>
    <div id="transfers-admin-list"><p class="loading">Loading transfers…</p></div>
  `;

  document.getElementById('tr-save-btn').addEventListener('click', async () => {
    const msg = document.getElementById('tr-msg');
    const player = document.getElementById('tr-player').value.trim();
    const to = document.getElementById('tr-to').value.trim();
    if (!player || !to) {
      cplShowMsg(msg, 'Player and destination team are required.', 'err');
      return;
    }
    const btn = document.getElementById('tr-save-btn');
    btn.disabled = true;
    btn.textContent = 'Posting…';
    try {
      const res = await CPL.post({
        action: 'createTransfer',
        email: session.email,
        password: session.password,
        date: document.getElementById('tr-date').value.trim(),
        player,
        fromTeam: document.getElementById('tr-from').value.trim(),
        toTeam: to,
        league: document.getElementById('tr-league').value,
        note: document.getElementById('tr-note').value.trim()
      });
      if (res && res.ok) {
        cplShowMsg(msg, 'Transfer posted.', 'ok');
        document.getElementById('tr-player').value = '';
        document.getElementById('tr-from').value = '';
        document.getElementById('tr-to').value = '';
        document.getElementById('tr-note').value = '';
        delete CPL._cache['Transfers'];
        loadTransfersAdminList(session);
      } else {
        cplShowMsg(msg, (res && res.error) || 'Could not post transfer.', 'err');
      }
    } catch (err) {
      cplShowMsg(msg, 'Network error — please try again.', 'err');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Post Transfer';
    }
  });

  loadTransfersAdminList(session);
}

async function loadTransfersAdminList(session) {
  const container = document.getElementById('transfers-admin-list');
  try {
    const rows = await CPL.get('Transfers');
    const sorted = [...rows].sort((a, b) => cplParseDate(b.Date) - cplParseDate(a.Date));
    if (!sorted.length) {
      container.innerHTML = '<div class="panel"><p class="empty">No transfers yet.</p></div>';
      return;
    }
    container.innerHTML = `
      <div class="panel">
        <span class="eyebrow">Posted Transfers</span>
        <table class="data">
          <thead><tr><th>Date</th><th>Player</th><th>Move</th><th></th></tr></thead>
          <tbody>
            ${sorted.map((r, i) => `
              <tr>
                <td>${cplEscape(r.Date)}</td>
                <td>${cplEscape(r.Player)}</td>
                <td>${cplEscape(r['From Team'] || 'Free Agent')} &rarr; ${cplEscape(r['To Team'] || '')}</td>
                <td><button class="btn secondary tr-delete-btn" data-idx="${i}" style="margin:0;padding:8px 12px;">Delete</button></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
    container.querySelectorAll('.tr-delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const row = sorted[Number(btn.dataset.idx)];
        if (!confirm(`Delete transfer for ${row.Player}?`)) return;
        try {
          const res = await CPL.post({
            action: 'deleteTransfer', email: session.email, password: session.password,
            key: { date: row.Date, player: row.Player, fromTeam: row['From Team'], toTeam: row['To Team'] }
          });
          if (res && res.ok) {
            delete CPL._cache['Transfers'];
            loadTransfersAdminList(session);
          } else {
            alert((res && res.error) || 'Could not delete.');
          }
        } catch (err) {
          alert('Network error — please try again.');
        }
      });
    });
  } catch (err) {
    console.error(err);
    container.innerHTML = `<div class="panel"><p class="empty">Could not load transfers. ${cplEscape(err.message)}</p></div>`;
  }
}

// ---------------------------------------------------------------------
// Transfer Requests — teams request to sign a player from another team
// (see my-profile.js's team view); nothing moves until approved here.
// Approving updates the player's Team in Player_Profiles and posts a
// row to the public Transfers log above; rejecting just closes it out.
// ---------------------------------------------------------------------

function renderTransferRequestsAdminPanel(el, session) {
  el.innerHTML = `
    <div class="panel">
      <span class="eyebrow">Transfer Requests</span>
      <p>A team requests to sign a player currently on another team from their <strong>My Profile</strong> page. That player's current team has to approve the release first (also from My Profile) — approving generates a transfer document automatically. Only once that's done does a request land here for your final decision: approving moves the player to the requesting team and posts it to the public Transfers log; rejecting just closes the request. Nothing changes on either team until you decide.</p>
      <button class="btn secondary" id="tr-req-refresh" style="margin-top:0;">Refresh</button>
    </div>
    <div id="transfer-requests-list"><p class="loading">Loading transfer requests…</p></div>
  `;

  document.getElementById('tr-req-refresh').addEventListener('click', () => loadTransferRequestsAdminList(session));
  loadTransferRequestsAdminList(session);
}

async function loadTransferRequestsAdminList(session) {
  const container = document.getElementById('transfer-requests-list');
  container.innerHTML = '<div class="panel"><p class="loading">Loading…</p></div>';
  try {
    const res = await CPL.post({ action: 'adminListTransferRequests', email: session.email, password: session.password });
    if (!res || !res.ok) throw new Error((res && res.error) || 'Could not load transfer requests.');
    const rows = res.rows || [];

    const teamDecisionOf = r => (r['Team Decision'] || 'Pending').trim().toLowerCase();
    const statusOf = r => (r.Status || 'Pending').trim().toLowerCase();

    // Three buckets: still waiting on the releasing team, ready for the
    // admin's own decision (team already approved + a document exists),
    // and everything already decided (either team-rejected or admin-decided).
    const awaitingTeam = rows.filter(r => statusOf(r) === 'pending' && teamDecisionOf(r) === 'pending');
    const readyForAdmin = rows.filter(r => statusOf(r) === 'pending' && teamDecisionOf(r) === 'approved');
    const decided = rows.filter(r => statusOf(r) !== 'pending' || teamDecisionOf(r) === 'rejected');

    const pill = (text, kind) => `<span class="pill ${kind}">${cplEscape(text)}</span>`;
    const statusPill = status => {
      const s = (status || '').trim().toLowerCase();
      return pill(status || 'Pending', s === 'approved' ? 'ok' : s === 'rejected' ? 'warn' : 'neutral');
    };

    container.innerHTML = `
      <div class="panel">
        <span class="eyebrow">Awaiting Releasing Team</span>
        <p>These are waiting on the player's current team to approve or reject the release — nothing for you to do yet.</p>
        ${awaitingTeam.length ? `
        <table class="data">
          <thead><tr><th>Date</th><th>Player</th><th>Move</th><th>League</th><th>Note</th></tr></thead>
          <tbody>
            ${awaitingTeam.map(r => `
              <tr>
                <td>${cplEscape(r.Date)}</td>
                <td>${cplEscape(r.Player)}</td>
                <td>${cplEscape(r['From Team'] || '')} &rarr; ${cplEscape(r['To Team'] || '')}</td>
                <td>${cplEscape(r.League || '')}</td>
                <td>${cplEscape(r.Note || '')}</td>
              </tr>`).join('')}
          </tbody>
        </table>` : '<p class="empty">Nothing waiting on a team right now.</p>'}
      </div>
      <div class="panel">
        <span class="eyebrow">Ready For Your Decision</span>
        ${readyForAdmin.length ? `
        <table class="data">
          <thead><tr><th>Date</th><th>Player</th><th>Move</th><th>League</th><th>Document</th><th></th></tr></thead>
          <tbody>
            ${readyForAdmin.map((r, i) => `
              <tr>
                <td>${cplEscape(r.Date)}</td>
                <td>${cplEscape(r.Player)}</td>
                <td>${cplEscape(r['From Team'] || '')} &rarr; ${cplEscape(r['To Team'] || '')}</td>
                <td>${cplEscape(r.League || '')}</td>
                <td>${r['Document URL'] ? `<a href="${cplEscape(r['Document URL'])}" target="_blank" rel="noopener">View document</a>` : '—'}</td>
                <td style="white-space:nowrap;">
                  <button class="btn secondary tr-req-approve-btn" data-idx="${i}" style="margin:0 6px 0 0;padding:8px 12px;">Approve</button>
                  <button class="btn secondary tr-req-reject-btn" data-idx="${i}" style="margin:0;padding:8px 12px;">Reject</button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>` : '<p class="empty">Nothing ready for your review right now.</p>'}
        <div class="msg" id="tr-req-msg"></div>
      </div>
      <div class="panel">
        <span class="eyebrow">Past Requests</span>
        ${decided.length ? `
        <table class="data">
          <thead><tr><th>Date</th><th>Player</th><th>Move</th><th>Team Decision</th><th>Final Status</th><th>Document</th></tr></thead>
          <tbody>
            ${decided.map(r => `
              <tr>
                <td>${cplEscape(r.Date)}</td>
                <td>${cplEscape(r.Player)}</td>
                <td>${cplEscape(r['From Team'] || '')} &rarr; ${cplEscape(r['To Team'] || '')}</td>
                <td>${statusPill(r['Team Decision'])}</td>
                <td>${statusPill(r.Status)}</td>
                <td>${r['Document URL'] ? `<a href="${cplEscape(r['Document URL'])}" target="_blank" rel="noopener">View</a>` : '—'}</td>
              </tr>`).join('')}
          </tbody>
        </table>` : '<p class="empty">No decided requests yet.</p>'}
      </div>`;

    container.querySelectorAll('.tr-req-approve-btn').forEach(btn => {
      btn.addEventListener('click', () => adminActOnTransferRequest(readyForAdmin[Number(btn.dataset.idx)], 'approve', session));
    });
    container.querySelectorAll('.tr-req-reject-btn').forEach(btn => {
      btn.addEventListener('click', () => adminActOnTransferRequest(readyForAdmin[Number(btn.dataset.idx)], 'reject', session));
    });
  } catch (err) {
    console.error(err);
    container.innerHTML = `<div class="panel"><p class="empty">Could not load transfer requests. ${cplEscape(err.message)}</p></div>`;
  }
}

async function adminActOnTransferRequest(row, decision, session) {
  if (decision === 'approve' && !confirm(`Move ${row.Player} from "${row['From Team']}" to "${row['To Team']}"?`)) return;
  try {
    const res = await CPL.post({
      action: 'adminReviewTransferRequest', email: session.email, password: session.password,
      row: row.__row, decision
    });
    if (res && res.ok) {
      delete CPL._cache['Player_Profiles'];
      delete CPL._cache['Transfers'];
      loadTransferRequestsAdminList(session);
    } else {
      alert((res && res.error) || 'Something went wrong.');
    }
  } catch (err) {
    alert('Network error — please try again.');
  }
}

// ---------------------------------------------------------------------
// News (bonus — lets the admin post/remove homepage news without
// touching the Sheet directly)
// ---------------------------------------------------------------------

function renderNewsPanel(el, session) {
  el.innerHTML = `
    <div class="panel">
      <span class="eyebrow">Post News</span>
      <label for="news-date">Date</label>
      <input id="news-date" type="text" placeholder="YYYY-MM-DD" value="${new Date().toISOString().slice(0, 10)}">
      <label for="news-title">Title</label>
      <input id="news-title" type="text" required>
      <label for="news-league-tag">League Tag <span class="opt">(optional)</span></label>
      <input id="news-league-tag" type="text" placeholder="A / B / General">
      <label for="news-image">Image URL <span class="opt">(optional)</span></label>
      <input id="news-image" type="text">
      <label for="news-body">Body</label>
      <textarea id="news-body" required></textarea>
      <button id="news-save-btn">Post News</button>
      <div class="msg" id="news-msg"></div>
    </div>
    <div id="news-admin-list"><p class="loading">Loading news…</p></div>
  `;

  document.getElementById('news-save-btn').addEventListener('click', async () => {
    const msg = document.getElementById('news-msg');
    const title = document.getElementById('news-title').value.trim();
    const body = document.getElementById('news-body').value.trim();
    if (!title || !body) {
      cplShowMsg(msg, 'Title and body are required.', 'err');
      return;
    }
    const btn = document.getElementById('news-save-btn');
    btn.disabled = true;
    btn.textContent = 'Posting…';
    try {
      const res = await CPL.post({
        action: 'createNews',
        email: session.email,
        password: session.password,
        date: document.getElementById('news-date').value.trim(),
        title,
        body,
        leagueTag: document.getElementById('news-league-tag').value.trim(),
        imageUrl: document.getElementById('news-image').value.trim()
      });
      if (res && res.ok) {
        cplShowMsg(msg, 'Posted.', 'ok');
        document.getElementById('news-title').value = '';
        document.getElementById('news-body').value = '';
        document.getElementById('news-league-tag').value = '';
        document.getElementById('news-image').value = '';
        delete CPL._cache['News'];
        loadNewsAdminList(session);
      } else {
        cplShowMsg(msg, (res && res.error) || 'Could not post.', 'err');
      }
    } catch (err) {
      cplShowMsg(msg, 'Network error — please try again.', 'err');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Post News';
    }
  });

  loadNewsAdminList(session);
}

async function loadNewsAdminList(session) {
  const container = document.getElementById('news-admin-list');
  try {
    const rows = await CPL.get('News');
    const sorted = [...rows].sort((a, b) => cplParseDate(b.Date) - cplParseDate(a.Date));
    if (!sorted.length) {
      container.innerHTML = '<div class="panel"><p class="empty">No news yet.</p></div>';
      return;
    }
    container.innerHTML = `
      <div class="panel">
        <span class="eyebrow">Posted News</span>
        <table class="data">
          <thead><tr><th>Date</th><th>Title</th><th></th></tr></thead>
          <tbody>
            ${sorted.map((r, i) => `
              <tr>
                <td>${cplEscape(r.Date)}</td>
                <td>${cplEscape(r.Title)}</td>
                <td><button class="btn secondary news-delete-btn" data-idx="${i}" style="margin:0;padding:8px 12px;">Delete</button></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
    container.querySelectorAll('.news-delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const row = sorted[Number(btn.dataset.idx)];
        if (!confirm(`Delete "${row.Title}"?`)) return;
        try {
          const res = await CPL.post({
            action: 'deleteNews', email: session.email, password: session.password,
            key: { date: row.Date, title: row.Title }
          });
          if (res && res.ok) {
            delete CPL._cache['News'];
            loadNewsAdminList(session);
          } else {
            alert((res && res.error) || 'Could not delete.');
          }
        } catch (err) {
          alert('Network error — please try again.');
        }
      });
    });
  } catch (err) {
    console.error(err);
    container.innerHTML = `<div class="panel"><p class="empty">Could not load news. ${cplEscape(err.message)}</p></div>`;
  }
}

// ---------------------------------------------------------------------
// Account — change the admin's own password
// ---------------------------------------------------------------------

function renderAccountPanel(el, session) {
  el.innerHTML = `
    <div class="panel">
      <span class="eyebrow">Change Admin Password</span>
      <p>Do this once after the initial setup so the password isn't just the one used to seed the account.</p>
      <label for="acct-current">Current Password</label>
      <input id="acct-current" type="password">
      <label for="acct-new">New Password <span class="opt">(min 8 characters)</span></label>
      <input id="acct-new" type="password" minlength="8">
      <button id="acct-save-btn">Update Password</button>
      <div class="msg" id="acct-msg"></div>
    </div>
    <div class="panel">
      <span class="eyebrow">Direct Sheet Access</span>
      <p>Standings, fixtures, results, player stats/scoring, gallery, and equipment can all be managed from the tabs above. The Sheet is still there underneath everything if you ever need to fix something by hand (e.g. bulk edits, or the richer <code>Teams_A</code>/<code>Teams_B</code> profiles — ground, coach, bio — which aren't covered by this dashboard yet).</p>
      <a class="btn secondary" target="_blank" rel="noopener"
         href="https://docs.google.com/spreadsheets/d/${cplEscape(CPL_CONFIG.SHEET_ID)}/edit">Open Google Sheet</a>
    </div>
  `;

  document.getElementById('acct-save-btn').addEventListener('click', async () => {
    const msg = document.getElementById('acct-msg');
    const current = document.getElementById('acct-current').value;
    const next = document.getElementById('acct-new').value;
    if (!current || !next || next.length < 8) {
      cplShowMsg(msg, 'Enter your current password and a new one (8+ characters).', 'err');
      return;
    }
    const btn = document.getElementById('acct-save-btn');
    btn.disabled = true;
    btn.textContent = 'Updating…';
    try {
      const res = await CPL.post({
        action: 'adminChangePassword',
        email: session.email,
        password: current,
        newPassword: next
      });
      if (res && res.ok) {
        cplAdminSaveSession(session.email, next, session.name);
        cplShowMsg(msg, 'Password updated.', 'ok');
        document.getElementById('acct-current').value = '';
        document.getElementById('acct-new').value = '';
      } else {
        cplShowMsg(msg, (res && res.error) || 'Could not update password.', 'err');
      }
    } catch (err) {
      cplShowMsg(msg, 'Network error — please try again.', 'err');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Update Password';
    }
  });
}
