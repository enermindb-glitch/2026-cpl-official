/* ==========================================================
   fixtures.js — fixtures & results list, with team logos pulled
   from Teams_A/Teams_B and optional match poster thumbnails.

   Convention: a row in Results_A/B is matched to its Fixtures_A/B row
   by "Fixture Ref", which should be entered identically in both tabs,
   e.g. "MD3-Chuka Rangers-Igoji United". Keeping this as a single
   plain-text key (rather than a row number) means the admin can enter
   it in any order and it still lines up.
   ========================================================== */

function fixtureRef(fixtureRow) {
  return `${fixtureRow.Matchday}-${fixtureRow.Home}-${fixtureRow.Away}`;
}

function teamLogoLookup(teamsRows) {
  const map = {};
  teamsRows.forEach(t => { map[t.Name] = t['Logo URL']; });
  return name => map[name] || '';
}

/**
 * Renders a fixtures/results list.
 * fixturesRows: Fixtures_A/B rows (optionally pre-filtered to one team)
 * resultsRows: Results_A/B rows
 * teamsRows: Teams_A/B rows (for logos)
 */
function renderFixturesList(containerEl, fixturesRows, resultsRows, teamsRows) {
  const logoFor = teamLogoLookup(teamsRows);
  const resultsByRef = {};
  resultsRows.forEach(r => { resultsByRef[r['Fixture Ref']] = r; });

  const sorted = [...fixturesRows].sort((a, b) => cplParseDate(a.Date) - cplParseDate(b.Date));

  if (!sorted.length) {
    containerEl.innerHTML = '<p class="empty">No fixtures scheduled yet.</p>';
    return;
  }

  containerEl.innerHTML = sorted.map(f => {
    const ref = fixtureRef(f);
    const result = resultsByRef[ref];
    const scoreLine = result
      ? `<strong>${cplEscape(result['Home Goals'])} &ndash; ${cplEscape(result['Away Goals'])}</strong>`
      : `<span class="pill neutral">${cplEscape(f.Status || 'Scheduled')}</span>`;

    const homeLogo = logoFor(f.Home);
    const awayLogo = logoFor(f.Away);
    const poster = f['Poster URL']
      ? `<a href="${cplEscape(f['Poster URL'])}" target="_blank" rel="noopener" title="Match poster">
           <img src="${cplEscape(f['Poster URL'])}" alt="Match poster" style="width:40px;height:40px;object-fit:cover;border:1px solid var(--line);">
         </a>`
      : '';

    return `
      <div class="panel" style="padding:16px 20px;margin-bottom:12px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
        <span class="pill neutral" style="min-width:70px;text-align:center;">${cplEscape(f.Matchday)}</span>
        <span style="font-family:'IBM Plex Mono',monospace;font-size:0.78rem;color:var(--muted);min-width:90px;">${cplEscape(f.Date)}</span>
        <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:220px;justify-content:center;">
          ${homeLogo ? `<img src="${cplEscape(homeLogo)}" alt="" style="width:28px;height:28px;object-fit:contain;">` : ''}
          <span>${cplEscape(f.Home)}</span>
          <span style="color:var(--muted);">vs</span>
          <span>${cplEscape(f.Away)}</span>
          ${awayLogo ? `<img src="${cplEscape(awayLogo)}" alt="" style="width:28px;height:28px;object-fit:contain;">` : ''}
        </div>
        <div style="min-width:80px;text-align:center;">${scoreLine}</div>
        ${f.Referee ? `<span style="font-size:0.78rem;color:var(--muted);">Referee: ${cplEscape(f.Referee)}</span>` : ''}
        ${poster}
      </div>`;
  }).join('');
}
