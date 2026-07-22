/* ==========================================================
   transfers.js — /transfers.html
   Reads the "Transfers" tab (admin-managed from admin.html).
   Expected columns: Date, Player, From Team, To Team, League, Note.
   ========================================================== */

let CPL_ALL_TRANSFERS = [];

async function initTransfersPage() {
  const root = document.getElementById('transfers-list');
  root.innerHTML = '<p class="loading">Loading transfer announcements…</p>';
  try {
    const rows = await CPL.get('Transfers');
    CPL_ALL_TRANSFERS = [...rows].sort((a, b) => cplParseDate(b.Date) - cplParseDate(a.Date));
    populateTransferFilter(CPL_ALL_TRANSFERS);
    renderTransfers(filterTransfers());
    document.getElementById('transfers-league-filter').addEventListener('change', () => renderTransfers(filterTransfers()));
    document.getElementById('transfers-team-filter').addEventListener('change', () => renderTransfers(filterTransfers()));
  } catch (err) {
    console.error(err);
    root.innerHTML = `<p class="empty">Could not load transfer announcements. ${cplEscape(err.message)}</p>`;
  }
}

function populateTransferFilter(rows) {
  const teamSelect = document.getElementById('transfers-team-filter');
  const teams = [...new Set(rows.flatMap(r => [r['From Team'], r['To Team']]))].filter(Boolean).sort();
  teams.forEach(t => teamSelect.appendChild(cplEl(`<option value="${cplEscape(t)}">${cplEscape(t)}</option>`)));
}

function filterTransfers() {
  const league = document.getElementById('transfers-league-filter').value;
  const team = document.getElementById('transfers-team-filter').value;
  return CPL_ALL_TRANSFERS.filter(r => {
    if (league && (r.League || '').trim() !== league) return false;
    if (team && r['From Team'] !== team && r['To Team'] !== team) return false;
    return true;
  });
}

function renderTransfers(rows) {
  const root = document.getElementById('transfers-list');
  if (!rows.length) {
    root.innerHTML = '<p class="empty">No transfer announcements yet.</p>';
    return;
  }
  root.innerHTML = rows.map(r => `
    <div class="panel" style="padding:18px 20px;">
      <span class="eyebrow">${cplEscape(r.Date)}${r.League ? ' &middot; League ' + cplEscape(r.League) : ''}</span>
      <h3 style="margin-bottom:6px;">${cplEscape(r.Player)}</h3>
      <p style="margin-bottom:${r.Note ? '10px' : '0'};">
        <strong>${cplEscape(r['From Team'] || 'Free Agent')}</strong>
        <span style="color:var(--muted);"> &rarr; </span>
        <strong>${cplEscape(r['To Team'] || 'Unattached')}</strong>
      </p>
      ${r.Note ? `<p>${cplEscape(r.Note)}</p>` : ''}
    </div>`).join('');
}
