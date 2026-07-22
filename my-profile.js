/* ==========================================================
   my-profile.js — /my-profile.html
   Generic, single sign-in destination for ALL FOUR account types:
   player, team (contact), referee, official. Renders the right card
   for whichever type is signed in, shows a Pending banner if the
   listing hasn't been activated yet, and (players only) the existing
   bio/photo edit panel from profile-edit.js.

   Each type is looked up from its public CSV tab by matching the
   signed-in email — same tabs the public listing pages already read,
   so nothing here needs new backend reads. Referees/Officials store a
   single free-text "Contact" field (phone OR email), so the match
   there is best-effort: exact email match first, falling back to
   name match against the session. See BACKEND-TODO.md for a cleaner
   fix (backend returning a stable row key from `login`).
   ========================================================== */

async function initMyProfilePage() {
  const root = document.getElementById('my-profile-root');
  const session = cplGetSession();

  if (!session.email) {
    root.innerHTML = `
      <div class="panel" style="text-align:center;">
        <span class="eyebrow">Not Signed In</span>
        <h1>My Profile</h1>
        <p>Sign in to see your player card, team status, or referee/official listing — whichever account you registered.</p>
        <a class="btn" href="login.html?redirect=my-profile.html">Sign In</a>
      </div>`;
    return;
  }

  const type = (session.accountType || 'player').toLowerCase();
  try {
    if (type === 'team') await renderTeamProfile(root, session);
    else if (type === 'referee') await renderRefereeOrOfficialProfile(root, session, 'Referees', 'Referee');
    else if (type === 'official') await renderRefereeOrOfficialProfile(root, session, 'Officials', 'Official');
    else await renderPlayerProfile(root, session);
  } catch (err) {
    console.error(err);
    root.innerHTML = `<p class="empty">Could not load your profile. ${cplEscape(err.message)}</p>`;
  }
}

function pendingBanner(status) {
  if ((status || '').trim().toLowerCase() !== 'pending') return '';
  return `<div class="banner-pending">Your listing is still <strong>Pending</strong> admin approval — only you can see it right now. It'll go public once activated.</div>`;
}

async function renderPlayerProfile(root, session) {
  const profiles = await CPL.get('Player_Profiles');
  const player = profiles.find(p => (p.Email || '').toLowerCase() === session.email.toLowerCase());
  if (!player) {
    root.innerHTML = `<p class="empty">We couldn't find a player profile for ${cplEscape(session.email)}. If you just registered, an admin needs to activate it first.</p>`;
    return;
  }

  root.innerHTML = `
    ${pendingBanner(player.Status)}
    <div class="panel player-header">
      ${player['Photo URL']
        ? `<img class="photo" src="${cplEscape(player['Photo URL'])}" alt="${cplEscape(player.Player)}">`
        : `<div class="avatar-fallback">${cplEscape((player.Player || '?').slice(0, 2).toUpperCase())}</div>`}
      <div class="meta">
        <span class="profile-hub-type">Player</span>
        <h1>${cplEscape(player.Player)}</h1>
        <p>${cplEscape(player.Team)} ${player.Position ? '&middot; ' + cplEscape(player.Position) : ''}</p>
        <p class="cpl-number">${cplEscape(player.CPL_Number || 'Pending assignment')}</p>
      </div>
    </div>

    <div class="panel">
      <span class="eyebrow">Player Card</span>
      <div id="playerCardTemplate"></div>
      <button id="download-card-btn">Download My Card</button>
    </div>

    <div class="panel" id="player-edit-panel"></div>

    <p style="text-align:center;"><a href="player.html?id=${encodeURIComponent(player.CPL_Number || player.Player)}">View public profile page &rarr;</a></p>
  `;

  initCardGenerator(player);
  initProfileEdit(document.getElementById('player-edit-panel'), player.Bio);
}

async function renderTeamProfile(root, session) {
  const rows = await CPL.get('Team_Registrations');
  const team = rows.find(r => (r['Contact Email'] || '').toLowerCase() === session.email.toLowerCase());
  if (!team) {
    root.innerHTML = `<p class="empty">We couldn't find a team registration for ${cplEscape(session.email)}.</p>`;
    return;
  }

  root.innerHTML = `
    ${pendingBanner(team.Status)}
    <div class="panel player-header">
      <div class="avatar-fallback">${cplEscape((team.Team || '?').slice(0, 2).toUpperCase())}</div>
      <div class="meta">
        <span class="profile-hub-type">Team Contact</span>
        <h1>${cplEscape(team.Team)}</h1>
        <p>League ${cplEscape(team.League || '')} &middot; Contact: ${cplEscape(team['Contact Name'] || '')}</p>
        <span class="pill ${(team.Status || '').toLowerCase() === 'pending' ? 'warn' : 'ok'}">${cplEscape(team.Status || 'Active')}</span>
      </div>
    </div>

    <div class="panel">
      <span class="eyebrow">Squad</span>
      <p>Your squad — everyone registered under ${cplEscape(team.Team)} — is on your <a href="team.html?team=${encodeURIComponent(team.Team)}">team page</a>. Players join by <a href="register-player.html">registering individually</a> and selecting your team.</p>
    </div>

    ${(team.Status || '').trim().toLowerCase() === 'pending' ? '' : `
    <div class="panel" id="team-gallery-panel"><p class="loading">Loading gallery…</p></div>
    <div class="panel" id="team-incoming-requests-list"><p class="loading">Loading requests for your players…</p></div>
    <div class="panel" id="team-transfer-request-panel"><p class="loading">Loading players…</p></div>
    <div class="panel" id="team-transfer-requests-list"><p class="loading">Loading your requests…</p></div>`}
  `;

  if ((team.Status || '').trim().toLowerCase() !== 'pending') {
    initTeamGalleryPanel(session, team);
    loadMyIncomingTransferRequests(session);
    initTeamTransferRequestPanel(session, team);
    loadMyTransferRequests(session);
  }
}

/** Lets a signed-in team contact upload photos to their own team's
 * gallery (kit launches, training, fan photos, etc.) — shown publicly
 * on the team's page. Separate from the admin-curated matchday Gallery. */
async function initTeamGalleryPanel(session, team) {
  const el = document.getElementById('team-gallery-panel');
  el.innerHTML = `
    <span class="eyebrow">Team Gallery</span>
    <p>Add photos to your team's public gallery on your <a href="team.html?team=${encodeURIComponent(team.Team)}">team page</a>.</p>
    <label for="team-gallery-file">Photo</label>
    <input id="team-gallery-file" type="file" accept="image/*">
    <label for="team-gallery-caption">Caption <span class="opt">(optional)</span></label>
    <input id="team-gallery-caption" type="text" placeholder="e.g. Pre-season training day">
    <button id="team-gallery-upload-btn">Upload Photo</button>
    <div class="msg" id="team-gallery-msg"></div>
    <div class="card-grid" id="team-gallery-current" style="margin-top:16px;"><p class="loading">Loading your photos…</p></div>
  `;

  document.getElementById('team-gallery-upload-btn').addEventListener('click', async () => {
    const msg = document.getElementById('team-gallery-msg');
    const fileInput = document.getElementById('team-gallery-file');
    const file = fileInput.files[0];
    if (!file) { cplShowMsg(msg, 'Choose a photo first.', 'err'); return; }
    const btn = document.getElementById('team-gallery-upload-btn');
    btn.disabled = true;
    btn.textContent = 'Uploading…';
    try {
      const fileBase64 = await cplCompressImage(file, { maxDimension: 1000, quality: 0.85 });
      const res = await CPL.post({
        action: 'teamUploadGalleryImage', email: session.email, password: session.password,
        fileBase64, caption: document.getElementById('team-gallery-caption').value.trim()
      });
      if (res && res.ok) {
        cplShowMsg(msg, 'Photo added to your team gallery.', 'ok');
        fileInput.value = '';
        document.getElementById('team-gallery-caption').value = '';
        delete CPL._cache['Team_Gallery'];
        loadTeamGalleryCurrent(session, team);
      } else {
        cplShowMsg(msg, (res && res.error) || 'Could not upload that photo.', 'err');
      }
    } catch (err) {
      cplShowMsg(msg, err.message || 'Network error — please try again.', 'err');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Upload Photo';
    }
  });

  loadTeamGalleryCurrent(session, team);
}

async function loadTeamGalleryCurrent(session, team) {
  const grid = document.getElementById('team-gallery-current');
  try {
    delete CPL._cache['Team_Gallery'];
    const all = await CPL.get('Team_Gallery');
    const mine = all.filter(g => (g.Team || '').trim() === team.Team);
    grid.innerHTML = mine.length
      ? mine.map(g => `
          <div class="card">
            <img class="thumb" style="width:100%;height:110px;object-fit:cover;" src="${cplEscape(g['Media URL'])}" alt="">
            <p>${cplEscape(g.Caption || '')}</p>
          </div>`).join('')
      : '<p class="empty">No photos yet — upload your first one above.</p>';
  } catch (err) {
    console.error(err);
    grid.innerHTML = `<p class="empty">Could not load your gallery. ${cplEscape(err.message)}</p>`;
  }
}

/** Requests aimed at players currently on THIS team — the releasing
 * team has to approve/reject before anything reaches the admin. */
async function loadMyIncomingTransferRequests(session) {
  const el = document.getElementById('team-incoming-requests-list');
  try {
    const res = await CPL.post({ action: 'myIncomingTransferRequests', email: session.email, password: session.password });
    if (!res || !res.ok) throw new Error((res && res.error) || 'Could not load requests.');
    const rows = res.rows || [];
    const pending = rows.filter(r => (r['Team Decision'] || 'Pending').trim().toLowerCase() === 'pending');
    const decided = rows.filter(r => (r['Team Decision'] || 'Pending').trim().toLowerCase() !== 'pending');

    if (!rows.length) {
      el.innerHTML = `<span class="eyebrow">Requests For Your Players</span><p class="empty">No other team has requested one of your players yet.</p>`;
      return;
    }

    el.innerHTML = `
      <span class="eyebrow">Requests For Your Players</span>
      <p>Another team wants to sign one of your players — approve to release them (this generates a transfer document and sends it to the admin for final sign-off) or reject to keep them, no admin needed either way.</p>
      ${pending.length ? `
      <table class="data">
        <thead><tr><th>Date</th><th>Player</th><th>Requested by</th><th>Note</th><th></th></tr></thead>
        <tbody>
          ${pending.map((r, i) => `
            <tr>
              <td>${cplEscape(r.Date)}</td>
              <td>${cplEscape(r.Player)}</td>
              <td>${cplEscape(r['To Team'] || '')}</td>
              <td>${cplEscape(r.Note || '')}</td>
              <td style="white-space:nowrap;">
                <button class="btn secondary team-incoming-approve-btn" data-idx="${i}" style="margin:0 6px 0 0;padding:8px 12px;">Approve Release</button>
                <button class="btn secondary team-incoming-reject-btn" data-idx="${i}" style="margin:0;padding:8px 12px;">Reject</button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>` : '<p class="empty">Nothing pending your decision.</p>'}
      <div class="msg" id="team-incoming-msg"></div>
      ${decided.length ? `
      <table class="data" style="margin-top:16px;">
        <thead><tr><th>Date</th><th>Player</th><th>Requested by</th><th>Your decision</th><th>Document</th></tr></thead>
        <tbody>
          ${decided.map(r => `
            <tr>
              <td>${cplEscape(r.Date)}</td>
              <td>${cplEscape(r.Player)}</td>
              <td>${cplEscape(r['To Team'] || '')}</td>
              <td>${cplEscape(r['Team Decision'] || '')}</td>
              <td>${r['Document URL'] ? `<a href="${cplEscape(r['Document URL'])}" target="_blank" rel="noopener">View</a>` : '—'}</td>
            </tr>`).join('')}
        </tbody>
      </table>` : ''}
    `;

    el.querySelectorAll('.team-incoming-approve-btn').forEach(btn => {
      btn.addEventListener('click', () => actOnIncomingTransferRequest(pending[Number(btn.dataset.idx)], 'approve', session));
    });
    el.querySelectorAll('.team-incoming-reject-btn').forEach(btn => {
      btn.addEventListener('click', () => actOnIncomingTransferRequest(pending[Number(btn.dataset.idx)], 'reject', session));
    });
  } catch (err) {
    console.error(err);
    el.innerHTML = `<span class="eyebrow">Requests For Your Players</span><p class="empty">Could not load requests. ${cplEscape(err.message)}</p>`;
  }
}

async function actOnIncomingTransferRequest(row, decision, session) {
  const msg = document.getElementById('team-incoming-msg');
  if (decision === 'approve' && !confirm(`Approve releasing ${row.Player} to "${row['To Team']}"? This generates a transfer document and sends the request to the admin for final approval — the player doesn't move yet.`)) return;
  if (decision === 'reject' && !confirm(`Reject the request for ${row.Player}? This closes it out — no admin review needed.`)) return;
  try {
    const res = await CPL.post({
      action: 'teamReviewTransferRequest', email: session.email, password: session.password,
      row: row.__row, decision
    });
    if (res && res.ok) {
      if (msg) cplShowMsg(msg, decision === 'approve' ? 'Release approved — sent to the admin for final sign-off.' : 'Request rejected.', 'ok');
      loadMyIncomingTransferRequests(session);
    } else {
      alert((res && res.error) || 'Something went wrong.');
    }
  } catch (err) {
    alert('Network error — please try again.');
  }
}

/** Lets a signed-in team contact request to sign a player who's
 * currently on another team. Nothing moves until an admin approves it
 * from the dashboard's Transfer Requests tab (see BACKEND-TODO.md /
 * apps-script/code.gs's requestTransfer action). */
async function initTeamTransferRequestPanel(session, team) {
  const el = document.getElementById('team-transfer-request-panel');
  try {
    const profiles = await CPL.get('Player_Profiles');
    const eligible = profiles
      .filter(p => (p.Status || '').trim().toLowerCase() !== 'pending')
      .filter(p => (p.Team || '').trim().toLowerCase() !== (team.Team || '').trim().toLowerCase())
      .sort((a, b) => (a.Player || '').localeCompare(b.Player || ''));

    el.innerHTML = `
      <span class="eyebrow">Request a Transfer</span>
      <p>Want to sign a player currently on another team? Pick them below and submit — their current team has to approve the release first, then an admin gives final sign-off. Nothing moves until both have said yes.</p>
      ${eligible.length ? `
      <label for="team-transfer-player">Player</label>
      <select id="team-transfer-player">
        ${eligible.map(p => `<option value="${cplEscape(p.Email)}">${cplEscape(p.Player)} — ${cplEscape(p.Team)}</option>`).join('')}
      </select>
      <label for="team-transfer-note">Note <span class="opt">(optional, seen by the admin)</span></label>
      <textarea id="team-transfer-note" placeholder="e.g. Agreed with the player, awaiting release."></textarea>
      <button id="team-transfer-submit">Send Transfer Request</button>
      <div class="msg" id="team-transfer-msg"></div>` : '<p class="empty">No players on other teams to request right now.</p>'}
    `;

    const submitBtn = document.getElementById('team-transfer-submit');
    if (submitBtn) {
      submitBtn.addEventListener('click', async () => {
        const msg = document.getElementById('team-transfer-msg');
        const playerEmail = document.getElementById('team-transfer-player').value;
        const note = document.getElementById('team-transfer-note').value.trim();
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending…';
        try {
          const res = await CPL.post({
            action: 'requestTransfer', email: session.email, password: session.password,
            playerEmail, note
          });
          if (res && res.ok) {
            cplShowMsg(msg, 'Transfer request sent — an admin will review it.', 'ok');
            document.getElementById('team-transfer-note').value = '';
            loadMyTransferRequests(session);
          } else {
            cplShowMsg(msg, (res && res.error) || 'Could not send that request.', 'err');
          }
        } catch (err) {
          cplShowMsg(msg, 'Network error — please try again.', 'err');
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Send Transfer Request';
        }
      });
    }
  } catch (err) {
    console.error(err);
    el.innerHTML = `<p class="empty">Could not load players. ${cplEscape(err.message)}</p>`;
  }
}

async function loadMyTransferRequests(session) {
  const el = document.getElementById('team-transfer-requests-list');
  try {
    const res = await CPL.post({ action: 'myTransferRequests', email: session.email, password: session.password });
    if (!res || !res.ok) throw new Error((res && res.error) || 'Could not load your requests.');
    const rows = res.rows || [];

    if (!rows.length) {
      el.innerHTML = `<span class="eyebrow">My Transfer Requests</span><p class="empty">You haven't sent any transfer requests yet.</p>`;
      return;
    }

    const pillFor = status => {
      const s = (status || '').trim().toLowerCase();
      const cls = s === 'approved' ? 'ok' : s === 'rejected' ? 'warn' : 'neutral';
      return `<span class="pill ${cls}">${cplEscape(status || 'Pending')}</span>`;
    };

    el.innerHTML = `
      <span class="eyebrow">My Transfer Requests</span>
      <table class="data">
        <thead><tr><th>Date</th><th>Player</th><th>From</th><th>Their Decision</th><th>Document</th><th>Final Status</th></tr></thead>
        <tbody>
          ${rows.map(r => `
            <tr>
              <td>${cplEscape(r.Date)}</td>
              <td>${cplEscape(r.Player)}</td>
              <td>${cplEscape(r['From Team'] || '')}</td>
              <td>${pillFor(r['Team Decision'] || 'Pending')}</td>
              <td>${r['Document URL'] ? `<a href="${cplEscape(r['Document URL'])}" target="_blank" rel="noopener">View</a>` : '—'}</td>
              <td>${pillFor(r.Status)}</td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  } catch (err) {
    console.error(err);
    el.innerHTML = `<span class="eyebrow">My Transfer Requests</span><p class="empty">Could not load your requests. ${cplEscape(err.message)}</p>`;
  }
}

async function renderRefereeOrOfficialProfile(root, session, tabName, typeLabel) {
  const rows = await CPL.get(tabName);
  const emailLower = session.email.toLowerCase();
  let person = rows.find(r => (r.Contact || '').toLowerCase() === emailLower);
  if (!person && session.name) {
    person = rows.find(r => (r.Name || '').toLowerCase() === session.name.toLowerCase());
  }
  if (!person) {
    root.innerHTML = `<p class="empty">We couldn't find a ${cplEscape(typeLabel.toLowerCase())} listing matching your sign-in. If you just registered, an admin needs to activate it first.</p>`;
    return;
  }

  root.innerHTML = `
    ${pendingBanner(person.Status)}
    <div class="panel player-header">
      ${person['Photo URL']
        ? `<img class="photo" src="${cplEscape(person['Photo URL'])}" alt="${cplEscape(person.Name)}">`
        : `<div class="avatar-fallback">${cplEscape((person.Name || '?').slice(0, 2).toUpperCase())}</div>`}
      <div class="meta">
        <span class="profile-hub-type">${cplEscape(typeLabel)}</span>
        <h1>${cplEscape(person.Name)}</h1>
        <p>${cplEscape(person.Role || typeLabel)}</p>
      </div>
    </div>

    <div class="panel">
      <span class="eyebrow">${cplEscape(typeLabel)} Card</span>
      <div id="playerCardTemplate"></div>
      <button id="download-card-btn">Download My Card</button>
      <p style="font-size:0.78rem;color:var(--muted);margin-top:10px;">QR verification for ${cplEscape(typeLabel.toLowerCase())}s needs a small backend addition — see BACKEND-TODO.md. The card still downloads with your photo and name.</p>
    </div>
  `;

  initCardGenerator(person, { typeLabel, name: person.Name, subtitle: person.Role || typeLabel, idNumber: person.CPL_Number || '' });
}
