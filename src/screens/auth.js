// ---------------------------------------------
// Clarity 2.0 — Auth Screen (sign up / log in)
// ---------------------------------------------

const AU_FEATURES = [
  'Clara builds your strategy from a single conversation.',
  'Every day, three actions you can complete in minutes.',
  'Your content, campaigns, and results in one place.'
];

function renderAuth(root) {
  const isSignup = appState.auth.mode !== 'login';
  const rightTitle = isSignup ? 'Get started free' : 'Welcome back';
  const rightSub = isSignup
    ? 'No credit card required.'
    : 'Don\u2019t have an account? <button type="button" class="au-inline-link" data-auth-mode="signup">Sign up</button>';

  const featuresHtml = AU_FEATURES.map(_authFeatureHtml).join('');

  root.innerHTML = `
    <div class="au-split">
      <aside class="au-left" aria-hidden="true">
        <div class="au-left-glow"></div>
        <div class="au-left-content">
          <div class="au-left-main">
            <div class="au-brand">Clarity</div>
            <div class="au-divider-line"></div>
            <h1 class="au-headline">Your business, guided by AI.</h1>
            <p class="au-tagline">Clara understands your business and tells you exactly what to do today. No guesswork, no overwhelm.</p>
            <div class="au-features">
              ${featuresHtml}
            </div>
          </div>
          <div class="au-social-proof">Trusted by founders, marketers, and business owners.</div>
        </div>
      </aside>

      <section class="au-right">
        <div class="au-right-content">
          <h1 class="au-right-title">${rightTitle}</h1>
          <p class="au-right-sub">${rightSub}</p>

          <div class="au-tabs" role="tablist">
            <button type="button" class="au-tab${isSignup ? ' au-tab-active' : ''}" data-auth-mode="signup" role="tab" aria-selected="${isSignup}">Sign up</button>
            <button type="button" class="au-tab${!isSignup ? ' au-tab-active' : ''}" data-auth-mode="login" role="tab" aria-selected="${!isSignup}">Log in</button>
          </div>

          <div id="auFormWrap">
            ${isSignup ? _authSignupFormHtml() : _authLoginFormHtml()}
          </div>

          <div class="au-divider"><span>or</span></div>

          <button type="button" class="au-google-btn" id="auGoogleBtn">
            <span class="au-google-icon">${AUTH_GOOGLE_ICON}</span>
            <span>Continue with Google</span>
          </button>

          <div class="au-terms">By continuing you agree to our Terms and Privacy Policy.</div>
        </div>
      </section>
    </div>
  `;

  _bindAuthEvents();
}

function _authFeatureHtml(text) {
  return `
    <div class="au-feature">
      <span class="au-feature-dot">${AU_CHECK_ICON}</span>
      <span class="au-feature-text">${text}</span>
    </div>
  `;
}

function _authSignupFormHtml() {
  return `
    <div class="au-form">
      <div class="au-field">
        <label class="au-label" for="auth-name">Full name</label>
        <input class="au-input" type="text" id="auth-name" placeholder="Your name" autocomplete="name" />
      </div>
      <div class="au-field">
        <label class="au-label" for="auth-email">Email</label>
        <input class="au-input" type="email" id="auth-email" placeholder="you@example.com" autocomplete="email" />
      </div>
      <div class="au-field">
        <label class="au-label" for="auth-password">Password</label>
        <input class="au-input" type="password" id="auth-password" placeholder="Create a password" autocomplete="new-password" />
      </div>
      <button type="button" class="au-submit-btn" id="auSubmitBtn">Create account \u2192</button>
      <div class="au-error" id="auError" style="display:none"></div>
    </div>
  `;
}

function _authLoginFormHtml() {
  return `
    <div class="au-form">
      <div class="au-field">
        <label class="au-label" for="auth-email">Email</label>
        <input class="au-input" type="email" id="auth-email" placeholder="you@example.com" autocomplete="email" />
      </div>
      <div class="au-field">
        <label class="au-label" for="auth-password">Password</label>
        <input class="au-input" type="password" id="auth-password" placeholder="Your password" autocomplete="current-password" />
      </div>
      <button type="button" class="au-submit-btn" id="auSubmitBtn">Log in \u2192</button>
      <div class="au-error" id="auError" style="display:none"></div>
    </div>
  `;
}

function _bindAuthEvents() {
  document.querySelectorAll('[data-auth-mode]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      const nextMode = btn.getAttribute('data-auth-mode');
      if (!nextMode || appState.auth.mode === nextMode) return;
      appState.auth.mode = nextMode;
      _saveState();
      renderAuth(document.getElementById('app'));
    });
  });

  const submit = document.getElementById('auSubmitBtn');
  if (submit) submit.addEventListener('click', _handleAuthSubmit);

  document.querySelectorAll('.au-input').forEach(function (input) {
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        _handleAuthSubmit();
      }
    });
  });

  const google = document.getElementById('auGoogleBtn');
  if (google) google.addEventListener('click', _handleGoogleAuth);

  const firstInput = document.querySelector('.au-input');
  if (firstInput) firstInput.focus();
}

function _showAuthError(msg) {
  const el = document.getElementById('auError');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
}

function _clearAuthError() {
  const el = document.getElementById('auError');
  if (!el) return;
  el.textContent = '';
  el.style.display = 'none';
}

function _handleAuthSubmit() {
  _clearAuthError();
  const isSignup = appState.auth.mode !== 'login';

  const emailEl = document.getElementById('auth-email');
  const passwordEl = document.getElementById('auth-password');
  if (!emailEl || !passwordEl) return;
  const email = emailEl.value.trim();
  const password = passwordEl.value;

  if (isSignup) {
    const nameEl = document.getElementById('auth-name');
    const name = nameEl ? nameEl.value.trim() : '';
    if (!name) return _showAuthError('Please enter your name.');
    if (!email.includes('@')) return _showAuthError('Please enter a valid email.');
    if (password.length < 6) return _showAuthError('Password must be at least 6 characters.');

    appState.user = { name: name, email: email };
    _finishAuth();
    return;
  }

  if (!email.includes('@')) return _showAuthError('Please enter a valid email.');
  if (password.length === 0) return _showAuthError('Please enter your password.');

  appState.user = Object.assign({}, appState.user || {}, { email: email });
  _finishAuth();
}

function _handleGoogleAuth() {
  _clearAuthError();
  const isSignup = appState.auth.mode !== 'login';

  const nameEl = document.getElementById('auth-name');
  const enteredName = nameEl ? nameEl.value.trim() : '';
  const fallbackName = 'there';

  if (isSignup) {
    appState.user = {
      name: enteredName || fallbackName,
      email: 'user@gmail.com'
    };
  } else {
    const existingName = (appState.user && appState.user.name) || enteredName || fallbackName;
    const existingEmail = (appState.user && appState.user.email) || 'user@gmail.com';
    appState.user = Object.assign({}, appState.user || {}, {
      name: existingName,
      email: existingEmail
    });
  }
  _finishAuth();
}

function _finishAuth() {
  appState.mode = 'loading';
  _saveState();
  renderApp();
}

window.renderAuth = renderAuth;
