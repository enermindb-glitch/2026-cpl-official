/* ==========================================================
   verify.js — /verify.html?cpl=CPL-2026-0001
   Read-only QR scan destination. Goes through the Apps Script
   endpoint (not the public CSV) so only photo/name/team/status
   are ever exposed — never email, bio, or anything else.
   ========================================================== */

async function initVerifyPage() {
  const cplNumber = cplQs('cpl');
  const root = document.getElementById('verify-root');

  if (!cplNumber) {
    root.innerHTML = '<p class="empty">No CPL number provided. <a href="players.html">Search the players directory instead &rarr;</a></p>';
    return;
  }

  root.innerHTML = '<p class="loading">Verifying…</p>';

  try {
    const result = await CPL.post({ action: 'verifyCpl', cplNumber });

    if (!result.ok) {
      root.innerHTML = `
        <div class="panel" style="text-align:center;">
          <span class="pill warn">Not Found</span>
          <h1>Not a valid CPL number</h1>
          <p>${cplEscape(result.error || '')}</p>
          <p style="margin-top:16px;"><a href="players.html">Search the players directory instead &rarr;</a></p>
        </div>`;
      return;
    }

    // `subtitle` is the generic field (team for a player, "Referee"/role
    // for referees & officials); `team` is kept as a fallback for a
    // backend that hasn't been updated to send `subtitle` yet.
    const subtitle = result.subtitle || result.team || '';
    root.innerHTML = `
      <div class="panel" style="text-align:center;">
        ${result.photoUrl
          ? `<img class="photo" style="margin:0 auto 16px;display:block;" src="${cplEscape(result.photoUrl)}" alt="">`
          : `<div class="avatar-fallback" style="margin:0 auto 16px;">${cplEscape((result.name || '?').slice(0, 2).toUpperCase())}</div>`}
        <h1>${cplEscape(result.name)}</h1>
        ${subtitle ? `<p>${cplEscape(subtitle)}</p>` : ''}
        <span class="pill ok">${cplEscape(result.status)}</span>
        <p class="cpl-number" style="margin-top:16px;">${cplEscape(cplNumber)}</p>
        <p style="margin-top:16px;"><a href="players.html?search=${encodeURIComponent(result.name || '')}">Find ${result.name ? 'more players like this' : 'this player'} in the directory &rarr;</a></p>
      </div>`;
  } catch (err) {
    console.error(err);
    root.innerHTML = `<p class="empty">Could not verify right now. ${cplEscape(err.message)}</p>`;
  }
}
