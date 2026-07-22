/* ==========================================================
   profile-edit.js — bio + photo edit form shown only to a signed-in
   player on their own profile page. The email + password (held in
   sessionStorage since login) prove who they are; the Apps Script
   backend re-checks the password against the stored hash before
   writing anything.
   ========================================================== */

function initProfileEdit(containerEl, currentBio) {
  containerEl.innerHTML = `
    <span class="eyebrow">Edit Your Profile</span>
    <label>Bio <span class="opt">(max 1000 characters)</span></label>
    <textarea id="edit-bio" maxlength="1000">${cplEscape(currentBio || '')}</textarea>

    <label>Photo <span class="opt">(optional — replaces your current photo)</span></label>
    <input type="file" id="edit-photo" accept="image/*">
    <div class="avatar-preview-wrap"><img id="edit-photo-preview" class="avatar-preview"></div>

    <button id="edit-save-btn">Save Changes</button>
    <div class="msg" id="edit-msg"></div>`;

  const fileInput = containerEl.querySelector('#edit-photo');
  const preview = containerEl.querySelector('#edit-photo-preview');

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { preview.src = reader.result; preview.style.display = 'block'; };
    reader.readAsDataURL(file);
  });

  containerEl.querySelector('#edit-save-btn').addEventListener('click', async () => {
    const msg = containerEl.querySelector('#edit-msg');
    const session = cplGetSession();
    if (!session.email || !session.password) {
      cplShowMsg(msg, 'Your session expired — please sign in again.', 'err');
      return;
    }

    const btn = containerEl.querySelector('#edit-save-btn');
    btn.disabled = true;

    const payload = {
      action: 'profileEdit',
      email: session.email,
      password: session.password,
      bio: containerEl.querySelector('#edit-bio').value
    };

    if (fileInput.files[0]) {
      btn.textContent = 'Processing photo…';
      try {
        payload.photoBase64 = await cplCompressImage(fileInput.files[0], { maxDimension: 800, quality: 0.85 });
      } catch (err) {
        cplShowMsg(msg, err.message || 'Could not process that photo.', 'err');
        btn.disabled = false;
        btn.textContent = 'Save Changes';
        return;
      }
    }

    btn.textContent = 'Saving…';
    try {
      const result = await CPL.post(payload);
      if (result.ok) {
        cplShowMsg(msg, 'Saved! Refresh the page to see your changes.', 'ok');
      } else {
        cplShowMsg(msg, result.error || 'Something went wrong.', 'err');
      }
    } catch (err) {
      cplShowMsg(msg, 'Network error — please try again.', 'err');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save Changes';
    }
  });
}

