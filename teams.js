/* ==========================================================
   teams.js — renders /team.html?team=NAME from Teams_A/B,
   Standings_A/B, PlayerStats_A/B, Player_Profiles, Fixtures_A/B,
   Results_A/B. Figures out which league (A or B) the team is in
   by checking which Teams tab contains it.
   ========================================================== */

async function loadTeamPage() {
  const teamName = cplQs('team');
  const root = document.getElementById('team-root');
  if (!teamName) {
    root.innerHTML = '<p class="empty">No team specified.</p>';
    return;
  }

  try {
    const [teamsA, teamsB, regTeams] = await Promise.all([CPL.get('Teams_A'), CPL.get('Teams_B'), CPL.get('Team_Registrations')]);
    let league = 'A';
    let team = teamsA.find(t => t.Name === teamName);
    if (!team) { team = teamsB.find(t => t.Name === teamName); league = 'B'; }

    // Not in the curated Teams_A/B tab yet (an admin hasn't hand-added
    // it there) — fall back to its approved registration instead of
    // showing "not found". This is the same data used to unblock the
    // Fixtures dropdown, so a newly-approved team gets a working
    // profile page immediately, not just once someone edits the Sheet.
    let isFallbackProfile = false;
    if (!team) {
      const reg = regTeams.find(r =>
        (r.Team || '').trim() === teamName && (r.Status || '').trim().toLowerCase() !== 'pending');
      if (reg) {
        team = { Name: reg.Team, Ground: '', Coach: '', Bio: '', 'Logo URL': reg['Logo URL'] || '' };
        league = (reg.League || 'A').trim().toUpperCase() === 'B' ? 'B' : 'A';
        isFallbackProfile = true;
      }
    }

    if (!team) {
      root.innerHTML = `<p class="empty">Team "${cplEscape(teamName)}" not found.</p>`;
      return;
    }

    const [standings, playerStats, profiles, fixtures, results, teamGallery] = await Promise.all([
      CPL.get(`Standings_${league}`),
      CPL.get(`PlayerStats_${league}`),
      CPL.get('Player_Profiles'),
      CPL.get(`Fixtures_${league}`),
      CPL.get(`Results_${league}`),
      CPL.get('Team_Gallery').catch(() => [])
    ]);

    const teamsRows = league === 'A' ? teamsA : teamsB;
    const standingRow = standings.find(s => s.Team === teamName);
    const squad = profiles.filter(p => p.Team === teamName && (p.Status || '').trim().toLowerCase() !== 'pending');
    const teamFixtures = fixtures.filter(f => f.Home === teamName || f.Away === teamName);
    const teamScorers = playerStats.filter(p => p.Team === teamName);
    const gallery = teamGallery.filter(g => (g.Team || '').trim() === teamName)
      .sort((a, b) => cplParseDate(b.Date) - cplParseDate(a.Date));

    root.innerHTML = `
      <div class="panel player-header">
        ${team['Logo URL']
          ? `<img class="photo" src="${cplEscape(team['Logo URL'])}" alt="${cplEscape(team.Name)} logo">`
          : `<div class="avatar-fallback">${cplEscape(team.Name.slice(0, 2).toUpperCase())}</div>`}
        <div class="meta">
          <span class="eyebrow">League ${league}</span>
          <h1>${cplEscape(team.Name)}</h1>
          <p>${cplEscape(team.Ground || '')} &middot; Coach: ${cplEscape(team.Coach || 'TBC')}</p>
          ${team.Bio ? `<p>${cplEscape(team.Bio)}</p>` : ''}
          ${isFallbackProfile ? '<p style="color:var(--muted);font-size:0.85rem;">Full club profile (ground, coach, bio, crest) coming soon — this team is shown from its registration details for now.</p>' : ''}
        </div>
      </div>

      <div class="panel">
        <span class="eyebrow">Current Standing</span>
        <div id="team-standing-table"></div>
      </div>

      <div class="panel">
        <span class="eyebrow">Squad</span>
        <div class="card-grid" id="team-squad-grid"></div>
      </div>

      <div class="panel">
        <span class="eyebrow">Top Scorer</span>
        <div id="team-top-scorer"></div>
      </div>

      <div class="panel">
        <span class="eyebrow">Fixtures &amp; Results</span>
        <div id="team-fixtures-list"></div>
      </div>

      <div class="panel">
        <span class="eyebrow">Team Gallery</span>
        <div class="card-grid" id="team-gallery-grid"></div>
      </div>`;

    renderStandingsTable(document.getElementById('team-standing-table'), standingRow ? [standingRow] : [], { linkTeams: true, teams: teamsRows, regTeams });
    renderTopList(document.getElementById('team-top-scorer'), teamScorers, 'Goals', { label: 'Goals' });
    renderFixturesList(document.getElementById('team-fixtures-list'), teamFixtures, results, teamsRows);

    const grid = document.getElementById('team-squad-grid');
    grid.innerHTML = squad.length
      ? squad.map(p => `
          <a class="card" href="player.html?id=${encodeURIComponent(p.CPL_Number || p.Player)}">
            ${p['Photo URL']
              ? `<img class="thumb" style="border-radius:50%;" src="${cplEscape(p['Photo URL'])}" alt="">`
              : ''}
            <h3>${cplEscape(p.Player)}</h3>
            <p>${cplEscape(p.Position || '')}</p>
          </a>`).join('')
      : '<p class="empty">No players registered yet.</p>';

    const galleryGrid = document.getElementById('team-gallery-grid');
    galleryGrid.innerHTML = gallery.length
      ? gallery.map(g => `
          <a class="card" href="${cplEscape(g['Media URL'])}" target="_blank" rel="noopener">
            <img class="thumb" style="width:100%;height:140px;object-fit:cover;" src="${cplEscape(g['Media URL'])}" alt="">
            <p>${cplEscape(g.Caption || '')}</p>
          </a>`).join('')
      : '<p class="empty">No photos yet — team contacts can add some from their My Profile page.</p>';

  } catch (err) {
    console.error(err);
    root.innerHTML = `<p class="empty">Could not load team data. ${cplEscape(err.message)}</p>`;
  }
}
