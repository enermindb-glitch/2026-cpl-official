/**
 * registrations.js
 * -----------------------------------------------------------------------
 * Chuka Premier League — public registration forms.
 *
 * Handles the three self-serve forms (player / team / referee). Each one
 * posts straight to its own Apps Script action and lands as a "Pending"
 * row for the admin to review — nothing here writes Status: Paid/Active,
 * that's an admin-only edit in the Sheet (see code.gs onEdit trigger).
 *
 * Depends on CPL.post(payload) from data.js (payload must include an
 * "action" field) and cplEscape() for safe message rendering.
 */

// ---------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------

function cplSetSubmitting(button, isSubmitting, idleLabel) {
  button.disabled = isSubmitting;
  button.textContent = isSubmitting ? 'Submitting…' : idleLabel;
}

function cplShowMessage(container, text, kind) {
  // kind: 'success' | 'error'
  container.innerHTML = `<p class="message message--${kind === 'error' ? 'error' : 'success'}">${cplEscape(text)}</p>`;
  container.hidden = false;
}

function cplClearMessage(container) {
  container.hidden = true;
  container.innerHTML = '';
}

function cplRequiredFieldsFilled(form, fieldNames) {
  for (const name of fieldNames) {
    const el = form.elements[name];
    if (!el || !String(el.value || '').trim()) return name;
  }
  return null;
}

/**
 * Checks the Config tab (see data.js → cplGetConfig) for a registration
 * on/off switch the admin dashboard controls. If the tab is missing, or
 * the key isn't set, registration defaults to OPEN so this never breaks a
 * site that hasn't set up the Config tab yet.
 * Returns true (form stays usable) or false (form gets locked + a message
 * is shown, and the caller should stop initializing that form).
 */
async function cplGateRegistrationForm(form, msgContainer, configKey, closedMessage) {
  const cfg = await cplGetConfig();
  const flag = (cfg[configKey] || 'Y').trim().toUpperCase();
  if (flag === 'N') {
    Array.from(form.elements).forEach(el => { el.disabled = true; });
    cplShowMessage(msgContainer, closedMessage, 'error');
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------
// Player registration
// ---------------------------------------------------------------------

function initPlayerRegisterForm() {
  const form = document.getElementById('player-register-form');
  const msg = document.getElementById('player-register-message');
  const submitBtn = document.getElementById('player-register-submit');
  if (!form) return;

  cplGateRegistrationForm(
    form, msg, 'PLAYER_REG_OPEN',
    'Player registration is currently closed for this season. Check back soon, or ask on the Enquiries page.'
  ).then(open => { if (!open) return; });

  cplFillPaymentPhone('pf-payment-phone');

  // Populate the team dropdown from Team_Registrations — this site keeps
  // all team data in that one tab rather than separate Teams_A / Teams_B
  // tabs, so a new player picks from teams that have been submitted and
  // are not still sitting as "Pending" (same convention referees.js uses:
  // rows with no Status at all stay visible, for older entries).
  //
  // The Team list is filtered by the League select right above it, so a
  // player only ever sees teams registered in the league they picked
  // instead of one long list mixing League A and League B together.
  const leagueSelect = form.elements['League'];
  const teamSelect = form.elements['Team'];
  let teamsByLeague = {};

  function populateTeamsForLeague(league) {
    teamSelect.innerHTML = '';
    const list = teamsByLeague[league] || [];

    if (!list.length) {
      teamSelect.disabled = true;
      const note = document.createElement('option');
      note.value = '';
      note.textContent = 'No approved teams in this league yet — contact admin';
      teamSelect.appendChild(note);
      return;
    }

    teamSelect.disabled = false;
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.disabled = true;
    placeholder.selected = true;
    placeholder.textContent = 'Select your team…';
    teamSelect.appendChild(placeholder);

    list.forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      teamSelect.appendChild(opt);
    });
  }

  leagueSelect.addEventListener('change', () => populateTeamsForLeague(leagueSelect.value));

  (async function loadTeams() {
    try {
      const rows = await CPL.get('Team_Registrations');
      const approved = rows.filter(r => (r.Status || '').trim().toLowerCase() !== 'pending');

      const seen = new Set();
      const byLeague = {};
      approved.forEach(r => {
        const name = (r['Team'] || '').trim();
        const league = (r['League'] || '').trim().toUpperCase();
        const key = league + '|' + name;
        if (!name || !league || seen.has(key)) return;
        seen.add(key);
        (byLeague[league] = byLeague[league] || []).push(name);
      });
      Object.keys(byLeague).forEach(l => byLeague[l].sort((a, b) => a.localeCompare(b)));

      teamsByLeague = byLeague;
      if (leagueSelect.value) populateTeamsForLeague(leagueSelect.value);
    } catch (err) {
      // The real reason (bad SHEET_ID, sheet not shared, missing tab,
      // etc.) is in err.message — log it so it's visible in the browser
      // console instead of only showing a generic note.
      console.error('Could not load Team_Registrations for registration form:', err);
      teamSelect.innerHTML = '';
      const note = document.createElement('option');
      note.value = '';
      note.textContent = 'Could not load team list — see browser console for details';
      teamSelect.appendChild(note);
    }
  })();

  // Live preview for the optional photo upload
  const photoInput = form.elements['Photo'];
  const photoPreview = document.getElementById('pf-photo-preview');
  if (photoInput && photoPreview) {
    photoInput.addEventListener('change', () => {
      const file = photoInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => { photoPreview.src = reader.result; photoPreview.style.display = 'block'; };
      reader.readAsDataURL(file);
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    cplClearMessage(msg);

    const missing = cplRequiredFieldsFilled(form, ['Player', 'League', 'Team', 'Email', 'Position', 'Password', 'Payment Ref']);
    if (missing) {
      cplShowMessage(msg, `Please fill in "${missing}" before submitting.`, 'error');
      return;
    }

    const password = form.elements['Password'].value;
    if (password.length < 8) {
      cplShowMessage(msg, 'Password must be at least 8 characters.', 'error');
      return;
    }

    const payload = {
      action: 'registerPlayer',
      name: form.elements['Player'].value.trim(),
      team: form.elements['Team'].value,
      email: form.elements['Email'].value.trim(),
      position: form.elements['Position'].value,
      password: password,
      paymentRef: form.elements['Payment Ref'].value.trim(),
    };

    // Photo is optional at registration time — compress it client-side
    // (see cplCompressImage in data.js) before sending so it uploads fast.
    if (photoInput && photoInput.files[0]) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Processing photo…';
      try {
        payload.photoBase64 = await cplCompressImage(photoInput.files[0], { maxDimension: 800, quality: 0.85 });
      } catch (err) {
        cplShowMessage(msg, err.message || 'Could not process that photo.', 'error');
        cplSetSubmitting(submitBtn, false, 'Register');
        return;
      }
    }

    cplSetSubmitting(submitBtn, true, 'Register');
    try {
      const res = await CPL.post(payload);
      if (res && res.ok) {
        form.reset();
        if (photoPreview) photoPreview.style.display = 'none';
        let base = 'Registration received. Your CPL number and profile will be activated once your payment is confirmed by an admin.';
        if (res.cplNumber) base = `Registration received — your CPL number is ${res.cplNumber}. Your profile will be activated once your payment is confirmed by an admin.`;
        cplShowMessage(msg, res.warning ? base + res.warning : base, 'success');
      } else {
        cplShowMessage(msg, (res && res.error) || 'Something went wrong submitting your registration. Please try again.', 'error');
      }
    } catch (err) {
      console.error(err);
      cplShowMessage(msg, 'Could not reach the server. Check your connection and try again.', 'error');
    } finally {
      cplSetSubmitting(submitBtn, false, 'Register');
    }
  });
}

// ---------------------------------------------------------------------
// Team registration
// ---------------------------------------------------------------------

function initTeamRegisterForm() {
  const form = document.getElementById('team-register-form');
  const msg = document.getElementById('team-register-message');
  const submitBtn = document.getElementById('team-register-submit');
  if (!form) return;

  cplGateRegistrationForm(
    form, msg, 'TEAM_REG_OPEN',
    'Team registration is currently closed for this season. Check back soon, or ask on the Enquiries page.'
  ).then(open => { if (!open) return; });

  cplFillPaymentPhone('tf-payment-phone');

  const logoInput = form.elements['Logo'];
  const logoPreview = document.getElementById('tf-logo-preview');
  if (logoInput && logoPreview) {
    logoInput.addEventListener('change', () => {
      const file = logoInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => { logoPreview.src = reader.result; logoPreview.style.display = 'block'; };
      reader.readAsDataURL(file);
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    cplClearMessage(msg);

    const missing = cplRequiredFieldsFilled(form, [
      'Team', 'League', 'Contact Name', 'Contact Email', 'Contact Phone', 'Password', 'Payment Ref',
    ]);
    if (missing) {
      cplShowMessage(msg, `Please fill in "${missing}" before submitting.`, 'error');
      return;
    }

    const teamPassword = form.elements['Password'].value;
    if (teamPassword.length < 8) {
      cplShowMessage(msg, 'Password must be at least 8 characters.', 'error');
      return;
    }

    const payload = {
      action: 'registerTeam',
      teamName: form.elements['Team'].value.trim(),
      league: form.elements['League'].value,
      contactName: form.elements['Contact Name'].value.trim(),
      contactEmail: form.elements['Contact Email'].value.trim(),
      contactPhone: form.elements['Contact Phone'].value.trim(),
      password: teamPassword,
      paymentRef: form.elements['Payment Ref'].value.trim(),
    };

    if (logoInput && logoInput.files[0]) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Processing logo…';
      try {
        payload.logoBase64 = await cplCompressImage(logoInput.files[0], { maxDimension: 800, quality: 0.85 });
      } catch (err) {
        cplShowMessage(msg, err.message || 'Could not process that logo image.', 'error');
        cplSetSubmitting(submitBtn, false, 'Register Team');
        return;
      }
    }

    cplSetSubmitting(submitBtn, true, 'Register Team');
    try {
      const res = await CPL.post(payload);
      if (res && res.ok) {
        form.reset();
        if (logoPreview) logoPreview.style.display = 'none';
        cplShowMessage(msg, 'Team registration received. Sign in any time on the Login page with your Contact Email + password. An admin will confirm payment and add your squad to the league listings.', 'success');
      } else {
        cplShowMessage(msg, (res && res.error) || 'Something went wrong submitting your registration. Please try again.', 'error');
      }
    } catch (err) {
      console.error(err);
      cplShowMessage(msg, 'Could not reach the server. Check your connection and try again.', 'error');
    } finally {
      cplSetSubmitting(submitBtn, false, 'Register Team');
    }
  });
}

// ---------------------------------------------------------------------
// Referee registration
// ---------------------------------------------------------------------

function initRefereeRegisterForm() {
  const form = document.getElementById('referee-register-form');
  const msg = document.getElementById('referee-register-message');
  const submitBtn = document.getElementById('referee-register-submit');
  if (!form) return;

  cplGateRegistrationForm(
    form, msg, 'REFEREE_REG_OPEN',
    'Referee registration is currently closed for this season. Check back soon, or ask on the Enquiries page.'
  ).then(open => { if (!open) return; });

  const photoInput = form.elements['Photo'];
  const photoPreview = document.getElementById('rf-photo-preview');
  if (photoInput && photoPreview) {
    photoInput.addEventListener('change', () => {
      const file = photoInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => { photoPreview.src = reader.result; photoPreview.style.display = 'block'; };
      reader.readAsDataURL(file);
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    cplClearMessage(msg);

    const missing = cplRequiredFieldsFilled(form, ['Name', 'Contact', 'Password']);
    if (missing) {
      cplShowMessage(msg, `Please fill in "${missing}" before submitting.`, 'error');
      return;
    }

    const refPassword = form.elements['Password'].value;
    if (refPassword.length < 8) {
      cplShowMessage(msg, 'Password must be at least 8 characters.', 'error');
      return;
    }

    const payload = {
      action: 'registerReferee',
      name: form.elements['Name'].value.trim(),
      contact: form.elements['Contact'].value.trim(),
      password: refPassword,
    };

    if (photoInput && photoInput.files[0]) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Processing photo…';
      try {
        payload.photoBase64 = await cplCompressImage(photoInput.files[0], { maxDimension: 800, quality: 0.85 });
      } catch (err) {
        cplShowMessage(msg, err.message || 'Could not process that photo.', 'error');
        cplSetSubmitting(submitBtn, false, 'Register');
        return;
      }
    }

    cplSetSubmitting(submitBtn, true, 'Register');
    try {
      const res = await CPL.post(payload);
      if (res && res.ok) {
        form.reset();
        if (photoPreview) photoPreview.style.display = 'none';
        cplShowMessage(msg, 'Registration received. Sign in any time on the Login page. An admin will review it and activate your listing.', 'success');
      } else {
        cplShowMessage(msg, (res && res.error) || 'Something went wrong submitting your registration. Please try again.', 'error');
      }
    } catch (err) {
      console.error(err);
      cplShowMessage(msg, 'Could not reach the server. Check your connection and try again.', 'error');
    } finally {
      cplSetSubmitting(submitBtn, false, 'Register');
    }
  });
}

// ---------------------------------------------------------------------
// CPL Official registration (chairman / secretary / organizer roles —
// distinct from match-day Referees above)
// ---------------------------------------------------------------------

function initOfficialRegisterForm() {
  const form = document.getElementById('official-register-form');
  const msg = document.getElementById('official-register-message');
  const submitBtn = document.getElementById('official-register-submit');
  if (!form) return;

  cplGateRegistrationForm(
    form, msg, 'OFFICIAL_REG_OPEN',
    'Official registration is currently closed for this season. Check back soon, or ask on the Enquiries page.'
  ).then(open => { if (!open) return; });

  const photoInput = form.elements['Photo'];
  const photoPreview = document.getElementById('of-photo-preview');
  if (photoInput && photoPreview) {
    photoInput.addEventListener('change', () => {
      const file = photoInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => { photoPreview.src = reader.result; photoPreview.style.display = 'block'; };
      reader.readAsDataURL(file);
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    cplClearMessage(msg);

    const missing = cplRequiredFieldsFilled(form, ['Name', 'Role', 'Contact', 'Password']);
    if (missing) {
      cplShowMessage(msg, `Please fill in "${missing}" before submitting.`, 'error');
      return;
    }

    const ofPassword = form.elements['Password'].value;
    if (ofPassword.length < 8) {
      cplShowMessage(msg, 'Password must be at least 8 characters.', 'error');
      return;
    }

    const payload = {
      action: 'registerOfficial',
      name: form.elements['Name'].value.trim(),
      role: form.elements['Role'].value,
      contact: form.elements['Contact'].value.trim(),
      password: ofPassword,
    };

    if (photoInput && photoInput.files[0]) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Processing photo…';
      try {
        payload.photoBase64 = await cplCompressImage(photoInput.files[0], { maxDimension: 800, quality: 0.85 });
      } catch (err) {
        cplShowMessage(msg, err.message || 'Could not process that photo.', 'error');
        cplSetSubmitting(submitBtn, false, 'Register');
        return;
      }
    }

    cplSetSubmitting(submitBtn, true, 'Register');
    try {
      const res = await CPL.post(payload);
      if (res && res.ok) {
        form.reset();
        if (photoPreview) photoPreview.style.display = 'none';
        cplShowMessage(msg, 'Registration received. Sign in any time on the Login page. An admin will review it and activate your listing.', 'success');
      } else {
        cplShowMessage(msg, (res && res.error) || 'Something went wrong submitting your registration. Please try again.', 'error');
      }
    } catch (err) {
      console.error(err);
      cplShowMessage(msg, 'Could not reach the server. Check your connection and try again.', 'error');
    } finally {
      cplSetSubmitting(submitBtn, false, 'Register');
    }
  });
}
