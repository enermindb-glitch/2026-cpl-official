/* ==========================================================
   card.js — client-side player card generator + QR code.
   Requires html2canvas and qrcode.js (loaded via CDN in player.html).
   Everything runs in the browser from data already on the page —
   no server round-trip at generation time.
   ========================================================== */

/**
 * Renders a downloadable QR card into #playerCardTemplate + wires up
 * #download-card-btn. Originally player-only; now generic so referees,
 * CPL officials, and team contacts each get their own labeled card.
 *
 * `entity` is whatever row object the caller has (a Player_Profiles row,
 * a Referees row, an Officials row, a Team_Registrations row, ...).
 * `options` lets the caller tell card.js how to read/label that row
 * without card.js needing to know every tab's column names:
 *   - typeLabel: shown instead of "Player" QR verify label (default 'Player')
 *   - name:      display name (default entity.Player || entity.Name || entity.Team)
 *   - subtitle:  line under the name (default entity.Team || entity.Role || '')
 *   - photoUrl:  (default entity['Photo URL'] || entity['Logo URL'])
 *   - idNumber:  the identifier encoded in the QR / shown in place of a
 *                CPL number (default entity.CPL_Number). Referees/officials
 *                don't have one of these yet — see BACKEND-TODO.md.
 */
function initCardGenerator(entity, options = {}) {
  const template = document.getElementById('playerCardTemplate');

  const typeLabel = options.typeLabel || 'Player';
  const name = options.name || entity.Player || entity.Name || entity.Team || '';
  const subtitle = options.subtitle !== undefined ? options.subtitle : (entity.Team || entity.Role || '');
  const photoUrl = options.photoUrl !== undefined ? options.photoUrl : (entity['Photo URL'] || entity['Logo URL'] || '');
  const idNumber = options.idNumber !== undefined ? options.idNumber : entity.CPL_Number;

  template.innerHTML = `
    <div class="cardTop">
      ${photoUrl
        ? `<img class="cardPhoto" src="${cplEscape(photoUrl)}" crossorigin="anonymous" alt="">`
        : ''}
      <div>
        <div style="font-family:'IBM Plex Mono',monospace;font-size:0.68rem;letter-spacing:0.06em;text-transform:uppercase;color:var(--gold);">${cplEscape(typeLabel)}</div>
        <div style="font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:1.2rem;">${cplEscape(name)}</div>
        ${subtitle ? `<div style="color:var(--muted);font-size:0.85rem;">${cplEscape(subtitle)}</div>` : ''}
        <div class="cpl-number">${cplEscape(idNumber || 'Pending')}</div>
      </div>
    </div>
    <div class="cardQr" id="cardQrHolder"></div>
    <div style="text-align:center;font-family:'IBM Plex Mono',monospace;font-size:0.7rem;color:var(--muted);margin-top:8px;">
      Season ${CPL_CONFIG.SEASON}
    </div>`;

  const qrHolder = document.getElementById('cardQrHolder');
  if (idNumber && typeof QRCode !== 'undefined') {
    const verifyUrl = `${window.location.origin}${window.location.pathname.replace(/(player|my-profile)\.html/, 'verify.html')}?cpl=${encodeURIComponent(idNumber)}`;
    new QRCode(qrHolder, { text: verifyUrl, width: 96, height: 96 });
  } else {
    qrHolder.innerHTML = `<p class="empty" style="text-align:center;">QR code available once a ${cplEscape(typeLabel)} ID is assigned.</p>`;
  }

  const downloadBtn = document.getElementById('download-card-btn');
  downloadBtn.addEventListener('click', async () => {
    if (typeof html2canvas === 'undefined') {
      alert('Card generator library failed to load — check your connection and try again.');
      return;
    }
    downloadBtn.disabled = true;
    downloadBtn.textContent = 'Generating…';
    try {
      const canvas = await html2canvas(template, { backgroundColor: '#0B1B2B', scale: 2 });
      const link = document.createElement('a');
      link.download = `${idNumber || name}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      downloadBtn.disabled = false;
      downloadBtn.textContent = 'Download My Card';
    }
  });
}
