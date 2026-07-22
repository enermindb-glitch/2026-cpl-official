/* ==========================================================
   equipment.js — /equipment.html
   Only shows rows where "Show on Site (Y/N)" is Y — everything
   else (internal quantities/conditions/assignments) stays private.
   ========================================================== */

async function initEquipmentPage() {
  const root = document.getElementById('equipment-grid');
  root.innerHTML = '<p class="loading">Loading equipment…</p>';
  try {
    const rows = await CPL.get('Equipment');
    const visible = rows.filter(r => (r['Show on Site (Y/N)'] || '').trim().toUpperCase() === 'Y');

    if (!visible.length) {
      root.innerHTML = '<p class="empty">Nothing to show yet.</p>';
      return;
    }

    root.innerHTML = visible.map(r => `
      <div class="card">
        <h3>${cplEscape(r.Item)}</h3>
        <p>${cplEscape(r.Category || '')}</p>
        ${r.Sponsor ? `<p class="pill ok" style="margin-top:8px;">Sponsored by ${cplEscape(r.Sponsor)}</p>` : ''}
      </div>`).join('');
  } catch (err) {
    console.error(err);
    root.innerHTML = `<p class="empty">Could not load equipment. ${cplEscape(err.message)}</p>`;
  }
}
