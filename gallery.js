/* ==========================================================
   gallery.js — /gallery.html
   Groups Game_Gallery rows by fixture (Matchday + Home + Away + Date),
   newest first, with League/Team filters.
   ========================================================== */

let CPL_ALL_GALLERY = [];

async function initGalleryPage() {
  const root = document.getElementById('gallery-groups');
  root.innerHTML = '<p class="loading">Loading gallery…</p>';
  try {
    CPL_ALL_GALLERY = await CPL.get('Game_Gallery');
    populateGalleryFilters(CPL_ALL_GALLERY);
    renderGalleryGroups(filterGallery());

    document.getElementById('gallery-league-filter').addEventListener('change', () => renderGalleryGroups(filterGallery()));
    document.getElementById('gallery-team-filter').addEventListener('change', () => renderGalleryGroups(filterGallery()));
  } catch (err) {
    console.error(err);
    root.innerHTML = `<p class="empty">Could not load gallery. ${cplEscape(err.message)}</p>`;
  }
}

function populateGalleryFilters(rows) {
  const teamSelect = document.getElementById('gallery-team-filter');
  const teams = [...new Set(rows.flatMap(r => [r.Home, r.Away]))].filter(Boolean).sort();
  teams.forEach(t => teamSelect.appendChild(cplEl(`<option value="${cplEscape(t)}">${cplEscape(t)}</option>`)));
}

function filterGallery() {
  const league = document.getElementById('gallery-league-filter').value;
  const team = document.getElementById('gallery-team-filter').value;
  return CPL_ALL_GALLERY.filter(r => {
    if (league && r.League !== league) return false;
    if (team && r.Home !== team && r.Away !== team) return false;
    return true;
  });
}

function renderGalleryGroups(rows) {
  const root = document.getElementById('gallery-groups');
  if (!rows.length) {
    root.innerHTML = '<p class="empty">No media yet.</p>';
    return;
  }

  const groups = {};
  rows.forEach(r => {
    const key = `${r.Matchday}|${r.Home}|${r.Away}|${r.Date}`;
    if (!groups[key]) groups[key] = { meta: r, items: [] };
    groups[key].items.push(r);
  });

  const sortedGroups = Object.values(groups).sort((a, b) => cplParseDate(b.meta.Date) - cplParseDate(a.meta.Date));

  root.innerHTML = sortedGroups.map(g => `
    <div class="panel">
      <span class="eyebrow">${cplEscape(g.meta.Matchday)} &middot; ${cplEscape(g.meta.Date)}</span>
      <h3>${cplEscape(g.meta.Home)} vs ${cplEscape(g.meta.Away)}</h3>
      <div class="card-grid">
        ${g.items.map(item => item['Media Type'] === 'Video'
          ? `<div class="card"><div class="empty">Video</div><a href="${cplEscape(item['Media URL'])}" target="_blank" rel="noopener">Watch video</a><p>${cplEscape(item.Caption || '')}</p></div>`
          : `<a class="card" href="${cplEscape(item['Media URL'])}" target="_blank" rel="noopener">
               <img class="thumb" style="width:100%;height:140px;" src="${cplEscape(item['Media URL'])}" alt="">
               <p>${cplEscape(item.Caption || '')}</p>
             </a>`
        ).join('')}
      </div>
    </div>`).join('');
}
