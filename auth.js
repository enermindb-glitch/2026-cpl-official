/* ==========================================================
   auth.js — email + password sign-in for ANY of the four account
   types this site has: player, team (contact), referee, official.

   No Google Sign-In: each type sets a password at registration (see
   register-*.html / registrations.js). On login we send email +
   password to the Apps Script backend, which checks the four tables
   in turn (Player_Profiles, Team_Registrations, Referees, Officials)
   and tells us which one matched — see BACKEND-TODO.md for the
   `login` action contract this expects.

   There's no server-side session token — the browser just remembers
   the email + password in sessionStorage for this tab and resends
   both on every write (e.g. saving a bio/photo in profile-edit.js),
   the same way the old Google ID token was resent on every write.
   That keeps things simple, but it does mean the password sits in
   sessionStorage in plaintext for the session, so this is "good
   enough for a small league site over HTTPS", not bank-grade.
   ========================================================== */

/**
 * accountType is one of: 'player' | 'team' | 'referee' | 'official'.
 * subtitle is whatever line makes sense under the name for that type
 * (team name for a player, role for an official, etc). idNumber is a
 * CPL number for players (and, once the backend assigns them, for
 * referees/officials too) — see BACKEND-TODO.md.
 */
function cplSaveSession(accountType, email, password, name, subtitle, idNumber) {
  sessionStorage.setItem('cpl_account_type', accountType || 'player');
  sessionStorage.setItem('cpl_email', email || '');
  sessionStorage.setItem('cpl_password', password || '');
  sessionStorage.setItem('cpl_name', name || '');
  sessionStorage.setItem('cpl_subtitle', subtitle || '');
  sessionStorage.setItem('cpl_number', idNumber || '');
}

function cplGetSession() {
  return {
    accountType: sessionStorage.getItem('cpl_account_type') || '',
    email: sessionStorage.getItem('cpl_email') || '',
    password: sessionStorage.getItem('cpl_password') || '',
    name: sessionStorage.getItem('cpl_name') || '',
    // kept for backwards compatibility with any code still reading .team
    team: sessionStorage.getItem('cpl_subtitle') || '',
    subtitle: sessionStorage.getItem('cpl_subtitle') || '',
    cplNumber: sessionStorage.getItem('cpl_number') || ''
  };
}

function cplLogout() {
  sessionStorage.removeItem('cpl_account_type');
  sessionStorage.removeItem('cpl_email');
  sessionStorage.removeItem('cpl_password');
  sessionStorage.removeItem('cpl_name');
  sessionStorage.removeItem('cpl_subtitle');
  sessionStorage.removeItem('cpl_number');
  window.location.href = 'index.html';
}

/**
 * Renders a login form (or a "signed in as" panel if already signed in)
 * into the given container element. Works for all four account types —
 * the backend's `login` action figures out which table the email
 * belongs to and returns an `accountType` field.
 */
function initLoginForm(containerId) {
  const container = document.getElementById(containerId);
  const session = cplGetSession();

  if (session.email) {
    container.innerHTML = `
      <p>Signed in as <strong>${cplEscape(session.name || session.email)}</strong> (${cplEscape(session.email)}).</p>
      <p><a href="my-profile.html">Go to My Profile &rarr;</a></p>
      <button class="btn secondary" id="cpl-logout-btn">Sign out</button>`;
    document.getElementById('cpl-logout-btn').addEventListener('click', cplLogout);
    return;
  }

  container.innerHTML = `
    <form id="cpl-login-form">
      <label for="cpl-login-email">Email</label>
      <input id="cpl-login-email" type="email" required autocomplete="email">

      <label for="cpl-login-password">Password</label>
      <input id="cpl-login-password" type="password" required autocomplete="current-password">

      <button id="cpl-login-submit" type="submit" class="button">Sign In</button>
      <div class="msg" id="cpl-login-msg"></div>
    </form>`;

  const form = container.querySelector('#cpl-login-form');
  const msg = container.querySelector('#cpl-login-msg');
  const submitBtn = container.querySelector('#cpl-login-submit');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = container.querySelector('#cpl-login-email').value.trim();
    const password = container.querySelector('#cpl-login-password').value;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in…';

    try {
      const result = await CPL.post({ action: 'login', email, password });
      if (result && result.ok) {
        cplSaveSession(result.accountType, result.email, password, result.name, result.subtitle || result.team || result.role, result.cplNumber || result.idNumber);
        const redirect = cplQs('redirect');
        window.location.href = redirect || 'my-profile.html';
      } else {
        cplShowMsg(msg, (result && result.error) || 'Sign in failed.', 'err');
      }
    } catch (err) {
      cplShowMsg(msg, 'Could not reach the server. Check your connection and try again.', 'err');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In';
    }
  });
}
