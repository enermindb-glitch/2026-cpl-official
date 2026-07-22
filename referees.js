/* ==========================================================
   referees.js — /referees.html
   Card-grid layout (matching players-directory): photo circle +
   name + matches officiated. Full Contact (phone/email) is never
   shown on this public page — it's admin-only (see admin.js).
   ========================================================== */

let CPL_ALL_REFEREES = [];

async function initRefereesPage() {
  const root = document.getElementById('referees-grid');
  root.innerHTML = '<p class="loading">Loading referees…</p>';
  try {
    const rows = await CPL.get('Referees');
    // Hide anyone still awaiting admin activation. Rows with no Status at
    // all (older entries, added before this column existed) stay visible.
    CPL_ALL_REFEREES = rows.filter(r => (r.Status || '').trim().toLowerCase() !== 'pending');
    renderRefereesGrid(CPL_ALL_REFEREES);
    document.getElementById('referees-search').addEventListener('input', (e) => {
      const term = e.target.value.trim().toLowerCase();
      renderRefereesGrid(CPL_ALL_REFEREES.filter(r => (r.Name || '').toLowerCase().includes(term)));
    });
  } catch (err) {
    console.error(err);
    root.innerHTML = `<p class="empty">Could not load referees. ${cplEscape(err.message)}</p>`;
  }
}

function renderRefereesGrid(rows) {
  const root = document.getElementById('referees-grid');
  if (!rows.length) {
    root.innerHTML = '<p class="empty">No referees found.</p>';
    return;
  }
  root.innerHTML = rows.map(r => `
    <div class="card">
      ${r['Photo URL']
        ? `<img class="thumb" style="border-radius:50%;" src="${cplEscape(r['Photo URL'])}" alt="">`
        : `<div class="thumb" style="border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--gold);">${cplEscape((r.Name || '?').slice(0, 1))}</div>`}
      <h3>${cplEscape(r.Name)}</h3>
      <p>Referee</p>
      <p style="font-family:'IBM Plex Mono',monospace;font-size:0.72rem;color:var(--gold);margin-top:6px;">${cplEscape(r['Matches Officiated'] || '0')} matches officiated</p>
    </div>`).join('');
}
