/* ==========================================================
   players-directory.js — /players.html
   Loads Player_Profiles + Teams_A/B once, then filters/searches
   entirely client-side (no re-fetching per keystroke).
   ========================================================== */

let CPL_ALL_PLAYERS = [];
let CPL_TEAM_LEAGUE = {}; // team name -> 'A' | 'B'

async function initPlayersDirectory() {
  const grid = document.getElementById('players-grid');
  grid.innerHTML = '<p class="loading">Loading players…</p>';

  try {
    const [profiles, teamsA, teamsB] = await Promise.all([
      CPL.get('Player_Profiles'), CPL.get('Teams_A'), CPL.get('Teams_B')
    ]);
    teamsA.forEach(t => { CPL_TEAM_LEAGUE[t.Name] = 'A'; });
    teamsB.forEach(t => { CPL_TEAM_LEAGUE[t.Name] = 'B'; });
    // Hide anyone still awaiting admin activation from the public
    // directory. Rows with no Status at all (older entries, added before
    // this column existed) stay visible — same convention as
    // referees.js/officials.js.
    CPL_ALL_PLAYERS = profiles.filter(p => (p.Status || '').trim().toLowerCase() !== 'pending');

    populateTeamFilter(profiles);

    const presetSearch = cplQs('search');
    if (presetSearch) document.getElementById('players-search').value = presetSearch;

    renderPlayersGrid(filterPlayers());

    document.getElementById('players-search').addEventListener('input', () => renderPlayersGrid(filterPlayers()));
    document.getElementById('players-league-filter').addEventListener('change', () => renderPlayersGrid(filterPlayers()));
    document.getElementById('players-team-filter').addEventListener('change', () => renderPlayersGrid(filterPlayers()));
    document.getElementById('players-position-filter').addEventListener('change', () => renderPlayersGrid(filterPlayers()));
  } catch (err) {
    console.error(err);
    grid.innerHTML = `<p class="empty">Could not load players. ${cplEscape(err.message)}</p>`;
  }
}

function populateTeamFilter(profiles) {
  const teamSelect = document.getElementById('players-team-filter');
  const teams = [...new Set(profiles.map(p => p.Team))].filter(Boolean).sort();
  teams.forEach(t => teamSelect.appendChild(cplEl(`<option value="${cplEscape(t)}">${cplEscape(t)}</option>`)));

  const posSelect = document.getElementById('players-position-filter');
  const positions = [...new Set(profiles.map(p => p.Position))].filter(Boolean).sort();
  positions.forEach(p => posSelect.appendChild(cplEl(`<option value="${cplEscape(p)}">${cplEscape(p)}</option>`)));
}

function filterPlayers() {
  const term = document.getElementById('players-search').value.trim().toLowerCase();
  const league = document.getElementById('players-league-filter').value;
  const team = document.getElementById('players-team-filter').value;
  const position = document.getElementById('players-position-filter').value;

  return CPL_ALL_PLAYERS.filter(p => {
    if (term) {
      const hay = `${p.Player} ${p.Team} ${p.CPL_Number}`.toLowerCase();
      if (!hay.includes(term)) return false;
    }
    if (league && CPL_TEAM_LEAGUE[p.Team] !== league) return false;
    if (team && p.Team !== team) return false;
    if (position && p.Position !== position) return false;
    return true;
  });
}

function renderPlayersGrid(players) {
  const grid = document.getElementById('players-grid');
  if (!players.length) {
    grid.innerHTML = '<p class="empty">No players match your search.</p>';
    return;
  }
  grid.innerHTML = players.map(p => `
    <a class="card" href="player.html?id=${encodeURIComponent(p.CPL_Number || p.Player)}">
      ${p['Photo URL']
        ? `<img class="thumb" style="border-radius:50%;" src="${cplEscape(p['Photo URL'])}" alt="">`
        : `<div class="thumb" style="border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--gold);">${cplEscape((p.Player || '?').slice(0, 1))}</div>`}
      <h3>${cplEscape(p.Player)}</h3>
      <p>${cplEscape(p.Team)} ${p.Position ? '&middot; ' + cplEscape(p.Position) : ''}</p>
      <p style="font-family:'IBM Plex Mono',monospace;font-size:0.72rem;color:var(--gold);margin-top:6px;">${cplEscape(p.CPL_Number || 'Pending')}</p>
    </a>`).join('');
}
