/* ==========================================================
   enquiries.js — /enquiries.html contact form
   ========================================================== */

function initEnquiriesForm() {
  const form = document.getElementById('enquiries-form');
  const msg = document.getElementById('enquiries-msg');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type=submit]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';

    const payload = {
      action: 'submitEnquiry',
      name: form.name.value.trim(),
      role: form.role.value,
      team: form.team.value.trim(),
      subject: form.subject.value.trim(),
      message: form.message.value.trim()
    };

    try {
      const result = await CPL.post(payload);
      if (result.ok) {
        cplShowMsg(msg, 'Thanks — your enquiry has been sent. We\'ll get back to you soon.', 'ok');
        form.reset();
      } else {
        cplShowMsg(msg, result.error || 'Something went wrong. Please try again.', 'err');
      }
    } catch (err) {
      cplShowMsg(msg, 'Network error — please try again.', 'err');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Enquiry';
    }
  });
}
