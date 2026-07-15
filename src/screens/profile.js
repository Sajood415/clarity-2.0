// ---------------------------------------------
// Clarity 2.0 — Profile page
// ---------------------------------------------
//
// Full-page user settings surface. Reached from the sidebar footer
// (avatar + name row). Three sections:
//
//   1. Identity   — avatar preview + "Your profile" heading
//   2. Account    — editable name & email inputs with a Save button
//   3. Password   — current / new / confirm inputs with an Update button
//
// State model:
//   appState.user             = { name, email, passwordUpdatedAt? }
//   appState._profileReturnView = the view the user came from, so the
//                                 "\u2190 Back" affordance restores it
//                                 rather than hard-coding "Today".
//
// This is a UI-only surface -- no real backend. The password section
// validates locally (length, confirmation match, current-password not
// empty) and on success stamps `passwordUpdatedAt` so the UI can
// reflect a recent change. There is no persisted password value; the
// "current password" input is checked for non-emptiness only, which
// matches the mock-auth model used everywhere else in the app.

function renderProfile(container) {
  if (!container) return;

  const user = (appState.user && typeof appState.user === 'object') ? appState.user : {};
  const name = String(user.name || '').trim();
  const email = String(user.email || '').trim();
  const initial = (name ? name.charAt(0) : (email ? email.charAt(0) : 'C')).toUpperCase();
  const displayName = name || 'Guest';
  const passwordUpdatedAt = user.passwordUpdatedAt ? Number(user.passwordUpdatedAt) : 0;
  const passwordSubline = passwordUpdatedAt
    ? ('Last updated ' + _pfFormatRelativeDate(passwordUpdatedAt))
    : 'Set a new password to keep your account secure.';

  container.innerHTML = ''
    + '<div class="pf-page">'
    +   '<button type="button" class="pf-back" id="pfBackBtn" aria-label="Back">'
    +     '<span aria-hidden="true">\u2190</span>'
    +     '<span>Back</span>'
    +   '</button>'

    +   '<header class="pf-header">'
    +     '<div class="pf-avatar" aria-hidden="true">' + _escape(initial) + '</div>'
    +     '<div class="pf-header-info">'
    +       '<h1 class="pf-heading">Your profile</h1>'
    +       '<p class="pf-sub">'
    +         'Signed in as <span class="pf-sub-strong">' + _escape(displayName) + '</span>'
    +         (email ? ' \u00b7 <span class="pf-sub-strong">' + _escape(email) + '</span>' : '')
    +       '</p>'
    +     '</div>'
    +   '</header>'

    +   '<div class="pf-card" data-pf-section="account">'
    +     '<div class="pf-card-head">'
    +       '<h2 class="pf-card-title">Account</h2>'
    +       '<p class="pf-card-sub">Your name and email. Clara uses these in greetings and reports.</p>'
    +     '</div>'
    +     '<div class="pf-fields">'
    +       '<label class="pf-field">'
    +         '<span class="pf-field-label">Name</span>'
    +         '<input type="text" class="pf-input" id="pfName" value="' + _escape(name) + '" '
    +               'placeholder="Your name" autocomplete="name" spellcheck="false" />'
    +       '</label>'
    +       '<label class="pf-field">'
    +         '<span class="pf-field-label">Email</span>'
    +         '<input type="email" class="pf-input" id="pfEmail" value="' + _escape(email) + '" '
    +               'placeholder="you@example.com" autocomplete="email" spellcheck="false" />'
    +       '</label>'
    +     '</div>'
    +     '<div class="pf-actions">'
    +       '<div class="pf-feedback" id="pfAccountFeedback" role="status" aria-live="polite"></div>'
    +       '<button type="button" class="pf-btn pf-btn-primary" id="pfSaveAccountBtn" disabled>'
    +         'Save changes'
    +       '</button>'
    +     '</div>'
    +   '</div>'

    +   '<div class="pf-card" data-pf-section="password">'
    +     '<div class="pf-card-head">'
    +       '<h2 class="pf-card-title">Password</h2>'
    +       '<p class="pf-card-sub">' + _escape(passwordSubline) + '</p>'
    +     '</div>'
    +     '<div class="pf-fields">'
    +       '<label class="pf-field">'
    +         '<span class="pf-field-label">Current password</span>'
    +         '<input type="password" class="pf-input" id="pfCurrentPw" '
    +               'placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" autocomplete="current-password" />'
    +       '</label>'
    +       '<label class="pf-field">'
    +         '<span class="pf-field-label">New password</span>'
    +         '<input type="password" class="pf-input" id="pfNewPw" '
    +               'placeholder="At least 6 characters" autocomplete="new-password" />'
    +       '</label>'
    +       '<label class="pf-field">'
    +         '<span class="pf-field-label">Confirm new password</span>'
    +         '<input type="password" class="pf-input" id="pfConfirmPw" '
    +               'placeholder="Repeat your new password" autocomplete="new-password" />'
    +       '</label>'
    +     '</div>'
    +     '<div class="pf-actions">'
    +       '<div class="pf-feedback" id="pfPasswordFeedback" role="status" aria-live="polite"></div>'
    +       '<button type="button" class="pf-btn pf-btn-primary" id="pfUpdatePasswordBtn" disabled>'
    +         'Update password'
    +       '</button>'
    +     '</div>'
    +   '</div>'
    + '</div>';

  _bindProfileEvents();
}

function _bindProfileEvents() {
  // Back -> restore the view the user was on before opening Profile.
  // Defaults to Today if the return view isn't set (opened via a deep
  // link or as the first thing after login).
  const back = document.getElementById('pfBackBtn');
  if (back) {
    back.addEventListener('click', function () {
      const ret = appState._profileReturnView && appState._profileReturnView !== 'profile'
        ? appState._profileReturnView
        : 'today';
      appState._profileReturnView = null;
      setActiveView(ret);
      renderApp();
    });
  }

  // --- Account section ------------------------------------------------

  const nameEl = document.getElementById('pfName');
  const emailEl = document.getElementById('pfEmail');
  const saveEl = document.getElementById('pfSaveAccountBtn');
  const accountFeedback = document.getElementById('pfAccountFeedback');

  const originalName = String((appState.user && appState.user.name) || '');
  const originalEmail = String((appState.user && appState.user.email) || '');

  const syncSaveEnabled = function () {
    if (!saveEl || !nameEl || !emailEl) return;
    const nextName = nameEl.value.trim();
    const nextEmail = emailEl.value.trim();
    const changed = nextName !== originalName.trim() || nextEmail !== originalEmail.trim();
    const nameOk = nextName.length > 0;
    const emailOk = /.+@.+\..+/.test(nextEmail);
    if (changed && nameOk && emailOk) saveEl.removeAttribute('disabled');
    else saveEl.setAttribute('disabled', '');
  };

  if (nameEl) nameEl.addEventListener('input', function () {
    _pfClearFeedback(accountFeedback);
    syncSaveEnabled();
  });
  if (emailEl) emailEl.addEventListener('input', function () {
    _pfClearFeedback(accountFeedback);
    syncSaveEnabled();
  });

  if (saveEl) {
    saveEl.addEventListener('click', function () {
      if (!nameEl || !emailEl) return;
      const nextName = nameEl.value.trim();
      const nextEmail = emailEl.value.trim();
      if (!nextName) return _pfShowFeedback(accountFeedback, 'Name can\u2019t be empty.', 'error');
      if (!/.+@.+\..+/.test(nextEmail)) return _pfShowFeedback(accountFeedback, 'Please enter a valid email.', 'error');

      const next = Object.assign({}, appState.user || {}, {
        name: nextName,
        email: nextEmail
      });
      appState.user = next;
      _saveState();
      _pfShowFeedback(accountFeedback, 'Profile updated.', 'success');
      saveEl.setAttribute('disabled', '');
      // Re-render so the header greeting + sidebar footer pick up
      // the new name/email immediately.
      renderApp();
    });
  }

  // --- Password section ----------------------------------------------

  const curEl = document.getElementById('pfCurrentPw');
  const newEl = document.getElementById('pfNewPw');
  const confirmEl = document.getElementById('pfConfirmPw');
  const updateEl = document.getElementById('pfUpdatePasswordBtn');
  const pwFeedback = document.getElementById('pfPasswordFeedback');

  const syncUpdateEnabled = function () {
    if (!updateEl || !curEl || !newEl || !confirmEl) return;
    const anyEmpty = !curEl.value.length || !newEl.value.length || !confirmEl.value.length;
    const lengthOk = newEl.value.length >= 6;
    const matchOk = newEl.value === confirmEl.value;
    if (!anyEmpty && lengthOk && matchOk) updateEl.removeAttribute('disabled');
    else updateEl.setAttribute('disabled', '');
  };

  [curEl, newEl, confirmEl].forEach(function (el) {
    if (!el) return;
    el.addEventListener('input', function () {
      _pfClearFeedback(pwFeedback);
      syncUpdateEnabled();
    });
  });

  if (updateEl) {
    updateEl.addEventListener('click', function () {
      if (!curEl || !newEl || !confirmEl) return;
      if (!curEl.value.length) return _pfShowFeedback(pwFeedback, 'Enter your current password.', 'error');
      if (newEl.value.length < 6) return _pfShowFeedback(pwFeedback, 'New password must be at least 6 characters.', 'error');
      if (newEl.value !== confirmEl.value) return _pfShowFeedback(pwFeedback, 'Passwords don\u2019t match.', 'error');
      if (newEl.value === curEl.value) return _pfShowFeedback(pwFeedback, 'New password must be different from the current one.', 'error');

      appState.user = Object.assign({}, appState.user || {}, {
        passwordUpdatedAt: Date.now()
      });
      _saveState();
      curEl.value = '';
      newEl.value = '';
      confirmEl.value = '';
      updateEl.setAttribute('disabled', '');
      _pfShowFeedback(pwFeedback, 'Password updated.', 'success');

      // Update the sub-header copy under the Password card so the
      // "Last updated ..." string reflects reality without a full
      // re-render (which would blow away the feedback pill).
      const passwordCard = document.querySelector('[data-pf-section="password"] .pf-card-sub');
      if (passwordCard) passwordCard.textContent = 'Last updated just now';
    });
  }
}

// ---------------------------------------------
// Helpers
// ---------------------------------------------

function _pfShowFeedback(el, message, kind) {
  if (!el) return;
  el.textContent = message;
  el.classList.remove('pf-feedback-error', 'pf-feedback-success');
  if (kind === 'error')   el.classList.add('pf-feedback-error');
  if (kind === 'success') el.classList.add('pf-feedback-success');
}

function _pfClearFeedback(el) {
  if (!el) return;
  el.textContent = '';
  el.classList.remove('pf-feedback-error', 'pf-feedback-success');
}

// Human-friendly "recently"-style formatter used by the Password
// card's "Last updated ..." copy. Falls back to a short date once
// the change is more than a week old so the copy doesn't grow to
// "203 days ago".
function _pfFormatRelativeDate(ts) {
  const now = Date.now();
  const diffMs = Math.max(0, now - ts);
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return min + ' minute' + (min === 1 ? '' : 's') + ' ago';
  const hr = Math.floor(min / 60);
  if (hr < 24) return hr + ' hour' + (hr === 1 ? '' : 's') + ' ago';
  const days = Math.floor(hr / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return days + ' days ago';
  const d = new Date(ts);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
}

window.renderProfile = renderProfile;
