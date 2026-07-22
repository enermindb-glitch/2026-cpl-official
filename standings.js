/* ==========================================================
   standings.js — league table + top scorers / top clean sheets.
   Used by league-a.html, league-b.html, team.html, index.html.
   ========================================================== */

const STANDINGS_COLS = [
  ['Played', 'Played', 'num'],
  ['W', 'W', 'num'],
  ['D', 'D', 'num'],
  ['L', 'L', 'num'],
  ['GF', 'GF', 'num'],
  ['GA', 'GA', 'num'],
  ['GD', 'GD', 'num'],
  ['Clean Sheets', 'CS', 'num'],
  ['Points', 'Pts', 'num']
];

/** Builds a { teamName: logoUrl } lookup, preferring the curated
 * Teams_A/B tab but falling back to the logo a team uploaded at
 * registration time (Team_Registrations) if Teams_A/B doesn't have one
 * yet — so a new team's crest shows up in standings right away instead
 * of only after an admin manually copies it into Teams_A/B. */
function cplTeamLogoMap(teamsRows, regTeamsRows) {
  const map = {};
  (regTeamsRows || []).forEach(r => { if (r.Team && r['Logo URL']) map[r.Team] = r['Logo URL']; });
  (teamsRows || []).forEach(t => { if (t.Name && t['Logo URL']) map[t.Name] = t['Logo URL']; });
  return map;
}

function cplTeamCellHtml(teamName, logoMap, linkTeams) {
  const logo = logoMap && logoMap[teamName];
  const crest = logo
    ? `<img class="standings-logo" src="${cplEscape(logo)}" alt="" loading="lazy">`
    : `<span class="standings-logo standings-logo--fallback">${cplEscape((teamName || '?').slice(0, 2).toUpperCase())}</span>`;
  const label = linkTeams
    ? `<a href="team.html?team=${encodeURIComponent(teamName)}">${cplEscape(teamName)}</a>`
    : cplEscape(teamName);
  return `<span class="standings-team">${crest}${label}</span>`;
}

/** rows: Standings_A/B objects. opts.teams: Teams_A/B rows, used to show
 * each team's crest next to its name. opts.regTeams: Team_Registrations
 * rows, used as a fallback crest source (see cplTeamLogoMap). Renders
 * into containerEl. */
function renderStandingsTable(containerEl, rows, opts = {}) {
  const sorted = [...rows].sort((a, b) => (Number(b.Points) || 0) - (Number(a.Points) || 0));
  const logoMap = cplTeamLogoMap(opts.teams, opts.regTeams);

  const head = `<tr><th>#</th><th>Team</th>${STANDINGS_COLS.map(c => `<th class="${c[2]}">${c[1]}</th>`).join('')}</tr>`;

  const body = sorted.map((r, i) => {
    const topRow = i === 0 ? ' top-row' : '';
    const teamCell = cplTeamCellHtml(r.Team, logoMap, opts.linkTeams);
    const cells = STANDINGS_COLS.map(c => `<td class="${c[2]}">${cplEscape(r[c[0]] || '0')}</td>`).join('');
    return `<tr class="${topRow.trim()}"><td class="num">${i + 1}</td><td>${teamCell}</td>${cells}</tr>`;
  }).join('');

  containerEl.innerHTML = `<table class="data"><thead>${head}</thead><tbody>${body || '<tr><td colspan="11" class="empty">No standings yet.</td></tr>'}</tbody></table>`;
}

/**
 * Compact "Team + Points" standings widget with a crest per team and a
 * "See All" button linking to the full league table. Used on the
 * homepage so a visitor gets the gist of both tables without the full
 * column set.
 * rows: Standings_A/B objects. teamsRows: Teams_A/B rows (for crests).
 * opts.limit: how many teams to show (default 5).
 * opts.seeAllHref: link for the "See All" button.
 * opts.regTeams: Team_Registrations rows, used as a fallback crest
 * source for teams not yet added to Teams_A/B (see cplTeamLogoMap).
 */
function renderStandingsPreview(containerEl, rows, teamsRows, opts = {}) {
  const limit = opts.limit || 5;
  const sorted = [...rows].sort((a, b) => (Number(b.Points) || 0) - (Number(a.Points) || 0));
  const shown = sorted.slice(0, limit);
  const logoMap = cplTeamLogoMap(teamsRows, opts.regTeams);

  if (!shown.length) {
    containerEl.innerHTML = '<p class="empty">No standings yet.</p>';
    return;
  }

  const rowsHtml = shown.map((r, i) => `
    <li class="standings-preview-row${i === 0 ? ' top-row' : ''}">
      <span class="standings-preview-rank">${i + 1}</span>
      ${cplTeamCellHtml(r.Team, logoMap, true)}
      <span class="standings-preview-pts">${cplEscape(r.Points || '0')} pts</span>
    </li>`).join('');

  containerEl.innerHTML = `
    <ul class="standings-preview-list">${rowsHtml}</ul>
    ${opts.seeAllHref ? `<a class="btn secondary" href="${cplEscape(opts.seeAllHref)}" style="margin-top:12px;">See All</a>` : ''}`;
}

/** Renders a "Top N" list (scorers or clean sheets) from PlayerStats rows. */
function renderTopList(containerEl, rows, statField, opts = {}) {
  const limit = opts.limit || 5;
  const sorted = [...rows]
    .filter(r => Number(r[statField]) > 0)
    .sort((a, b) => (Number(b[statField]) || 0) - (Number(a[statField]) || 0))
    .slice(0, limit);

  if (!sorted.length) {
    containerEl.innerHTML = '<p class="empty">No data yet.</p>';
    return;
  }

  const rowsHtml = sorted.map((r, i) => `
    <tr class="${i === 0 ? 'top-row' : ''}">
      <td class="num">${i + 1}</td>
      <td><a href="players.html?search=${encodeURIComponent(r.Player)}">${cplEscape(r.Player)}</a></td>
      <td>${cplEscape(r.Team)}</td>
      <td class="num">${cplEscape(r[statField])}</td>
    </tr>`).join('');

  containerEl.innerHTML = `
    <table class="data">
      <thead><tr><th>#</th><th>Player</th><th>Team</th><th class="num">${opts.label || statField}</th></tr></thead>
      <tbody>${rowsHtml}</tbody>
    </table>`;
}
