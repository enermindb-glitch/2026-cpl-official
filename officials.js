/* ==========================================================
   officials.js — /officials.html
   Card-grid layout (matching players-directory): photo circle +
   name + role + contact info.
   ========================================================== */

let CPL_ALL_OFFICIALS = [];

async function initOfficialsPage() {
  const root = document.getElementById('officials-grid');
  root.innerHTML = '<p class="loading">Loading officials…</p>';
  try {
    const rows = await CPL.get('Officials');
    // Hide anyone still awaiting admin activation. Rows with no Status at
    // all (older entries, added before this column existed) stay visible.
    CPL_ALL_OFFICIALS = rows.filter(r => (r.Status || '').trim().toLowerCase() !== 'pending');
    renderOfficialsGrid(CPL_ALL_OFFICIALS);
    document.getElementById('officials-search').addEventListener('input', (e) => {
      const term = e.target.value.trim().toLowerCase();
      renderOfficialsGrid(CPL_ALL_OFFICIALS.filter(r => (r.Name || '').toLowerCase().includes(term)));
    });
  } catch (err) {
    console.error(err);
    root.innerHTML = `<p class="empty">Could not load officials. ${cplEscape(err.message)}</p>`;
  }
}

function renderOfficialsGrid(rows) {
  const root = document.getElementById('officials-grid');
  if (!rows.length) {
    root.innerHTML = '<p class="empty">No officials found.</p>';
    return;
  }
  root.innerHTML = rows.map(r => `
    <div class="card">
      ${r['Photo URL']
        ? `<img class="thumb" style="border-radius:50%;" src="${cplEscape(r['Photo URL'])}" alt="">`
        : `<div class="thumb" style="border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--gold);">${cplEscape((r.Name || '?').slice(0, 1))}</div>`}
      <h3>${cplEscape(r.Name)}</h3>
      <p>${cplEscape(r.Role || 'Official')}</p>
      ${r.Contact ? `<p style="font-family:'IBM Plex Mono',monospace;font-size:0.78rem;color:var(--muted);word-break:break-word;">${cplEscape(r.Contact)}</p>` : ''}
    </div>`).join('');
}
