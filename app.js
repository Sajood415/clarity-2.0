// ---------------------------------------------
// Clarity 2.0 — Core App State & Render Router
// ---------------------------------------------

const STATE_KEY = 'clarity_v2';

let appState = {
  mode: 'splash',
  tab: 'today',
  user: null,
  auth: { mode: 'signup' },
  sidebarOpen: false,
  business: { name: '', goal: '', reach: '' },
  clara: { messages: [], onboardingComplete: false, widgetOpen: false, widgetMessages: [], widgetChipsDismissed: false },
  today: { tasks: [], lastUpdated: null },
  create: { step: null, type: null, platform: null, angle: null, variations: [], selected: null },
  results: { items: [], unlocked: false }
};

function _saveState() {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(appState));
  } catch (err) {
    console.error('Failed to save state:', err);
  }
}

function _restoreState() {
  try {
    const saved = localStorage.getItem(STATE_KEY);
    if (saved) {
      appState = JSON.parse(saved);
    }
  } catch (err) {
    console.error('Failed to restore state:', err);
  }
  if (!appState.tab) appState.tab = 'today';
  if (!appState.create) {
    appState.create = { step: null, type: null, platform: null, angle: null, variations: [], selected: null };
  }
  if (!appState.clara) {
    appState.clara = { messages: [], onboardingComplete: false, widgetOpen: false, widgetMessages: [], widgetChipsDismissed: false };
  }
  if (!Array.isArray(appState.clara.widgetMessages)) appState.clara.widgetMessages = [];
  if (typeof appState.clara.widgetChipsDismissed !== 'boolean') appState.clara.widgetChipsDismissed = false;
  appState.clara.widgetOpen = false;
  delete appState.clara.sheetOpen;
  if (!appState.auth) appState.auth = { mode: 'signup' };
  if (!appState.auth.mode) appState.auth.mode = 'signup';
  if (typeof appState.sidebarOpen !== 'boolean') appState.sidebarOpen = false;
}

function renderApp() {
  const root = document.getElementById('app');
  if (!root) return;

  document.body.style.background = '#0F0D0B';

  _syncSidebar();

  switch (appState.mode) {
    case 'splash':
      renderSplash(root);
      break;
    case 'auth':
      renderAuth(root);
      break;
    case 'loading':
      renderLoading(root);
      break;
    case 'welcome':
      renderWelcome(root);
      break;
    case 'onboarding':
      renderOnboarding(root);
      break;
    case 'home':
      renderHome(root);
      break;
    case 'create':
      root.innerHTML = '';
      break;
    case 'results':
      root.innerHTML = '';
      break;
    default:
      root.innerHTML = '';
      break;
  }
}

// ---------------------------------------------
// Splash screen
// ---------------------------------------------

function renderSplash(root) {
  const word = 'Clarity';
  const letters = word.split('').map(function (ch, i) {
    return '<span class="sp-letter" style="animation-delay:' + (i * 80) + 'ms">' + ch + '</span>';
  }).join('');

  root.innerHTML = `
    <div class="sp-screen" id="spScreen">
      <div class="sp-glow"></div>
      <div class="sp-content">
        <div class="sp-letters">${letters}</div>
        <div class="sp-subtitle">Your business advisor.</div>
      </div>
    </div>
  `;

  setTimeout(function () {
    if (appState.mode !== 'splash') return;
    const screen = document.getElementById('spScreen');
    if (screen) screen.classList.add('sp-screen-out');
  }, 2600);

  setTimeout(function () {
    if (appState.mode !== 'splash') return;
    appState.mode = 'auth';
    _saveState();
    renderApp();
  }, 3000);
}

// ---------------------------------------------
// Auth screen (sign up / log in)
// ---------------------------------------------

const AUTH_GOOGLE_ICON = `
  <svg viewBox="0 0 48 48" width="18" height="18" fill="#4285F4" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
  </svg>
`;

const AU_CHECK_ICON = `
  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
`;

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

// ---------------------------------------------
// Loading screen
// ---------------------------------------------

function renderLoading(root) {
  root.innerHTML = `
    <div class="ld-screen">
      <div class="ld-logo">C</div>
      <div class="ld-brand">Clarity</div>
      <div class="ld-bar-wrap"><div class="ld-bar-fill"></div></div>
      <div class="ld-status" id="ldStatus">Setting up your workspace...</div>
    </div>
  `;

  const messages = [
    'Setting up your workspace...',
    'Loading your profile...',
    'Almost ready...'
  ];
  let idx = 0;
  const statusEl = document.getElementById('ldStatus');

  const interval = setInterval(function () {
    if (appState.mode !== 'loading') {
      clearInterval(interval);
      return;
    }
    idx = (idx + 1) % messages.length;
    if (statusEl) statusEl.textContent = messages[idx];
  }, 500);

  setTimeout(function () {
    clearInterval(interval);
    if (appState.mode !== 'loading') return;
    appState.mode = 'welcome';
    _saveState();
    renderApp();
  }, 1500);
}

// ---------------------------------------------
// Welcome screen
// ---------------------------------------------

function renderWelcome(root) {
  const isReturning = !!(appState.clara && appState.clara.onboardingComplete);
  const rawName = (appState.user && appState.user.name) ? String(appState.user.name) : '';
  const firstName = rawName ? rawName.split(' ')[0] : 'there';
  const nameLine = 'Hey, ' + (firstName === 'there' ? 'there' : _escape(firstName)) + '.';

  const screenStyle = [
    'position:fixed', 'inset:0',
    'background:radial-gradient(ellipse at 50% 50%, #241a06 0%, #0F0D0B 70%)',
    'display:flex', 'flex-direction:column',
    'align-items:center', 'justify-content:center',
    'z-index:1000', 'overflow:hidden'
  ].join(';') + ';';

  const blob1Style = 'position:absolute;width:600px;height:600px;border-radius:50%;background:rgba(245,166,35,0.07);filter:blur(140px);top:-150px;left:50%;transform:translateX(-50%);pointer-events:none;z-index:0;';
  const blob2Style = 'position:absolute;width:300px;height:300px;border-radius:50%;background:rgba(232,132,90,0.05);filter:blur(100px);bottom:50px;right:5%;pointer-events:none;z-index:0;';
  const blob3Style = 'position:absolute;width:200px;height:200px;border-radius:50%;background:rgba(245,166,35,0.04);filter:blur(80px);bottom:100px;left:5%;pointer-events:none;z-index:0;';

  const contentStyle = 'position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;gap:0;text-align:center;padding:0 24px;';

  const nameStyle = [
    'font-size:56px', 'font-weight:800',
    'color:#F5F0E8', 'letter-spacing:-0.03em', 'line-height:1',
    'opacity:0',
    'animation:wl-fade-in 500ms cubic-bezier(0.2,0.7,0.2,1) 200ms forwards'
  ].join(';') + ';';

  const lineStyle = [
    'width:40px', 'height:2px',
    'background:#F5A623', 'border-radius:1px',
    'margin:24px auto 0',
    'transform:scaleX(0)',
    'animation:wl-line-in 300ms cubic-bezier(0.2,0.7,0.2,1) 600ms forwards'
  ].join(';') + ';';

  const subtitleStyle = [
    'font-size:16px', 'color:rgba(245,240,232,0.4)',
    'font-weight:400', 'line-height:1.4',
    'margin-top:16px',
    'opacity:0',
    'animation:wl-fade-in 500ms cubic-bezier(0.2,0.7,0.2,1) 900ms forwards'
  ].join(';') + ';';

  const dotsStyle = [
    'margin-top:32px', 'display:inline-flex', 'align-items:center', 'gap:6px',
    'opacity:0',
    'animation:wl-fade-in 500ms cubic-bezier(0.2,0.7,0.2,1) 1200ms forwards'
  ].join(';') + ';';

  const dotBase = 'display:inline-block;width:8px;height:8px;border-radius:50%;background:#F5A623;opacity:0.6;animation:cl-bounce 0.8s ease-in-out infinite;';

  root.innerHTML = `
    <div class="wl-screen" id="wlScreen" style="${screenStyle}">
      <div class="wl-blob wl-blob-1" style="${blob1Style}"></div>
      <div class="wl-blob wl-blob-2" style="${blob2Style}"></div>
      <div class="wl-blob wl-blob-3" style="${blob3Style}"></div>
      <div class="wl-content" style="${contentStyle}">
        <div class="wl-name" style="${nameStyle}">${nameLine}</div>
        <div class="wl-line" style="${lineStyle}"></div>
        <div class="wl-subtitle" style="${subtitleStyle}">Clara is ready for you.</div>
        <div class="wl-dots" style="${dotsStyle}">
          <span class="wl-dot" style="${dotBase}"></span>
          <span class="wl-dot" style="${dotBase}animation-delay:0.15s;"></span>
          <span class="wl-dot" style="${dotBase}animation-delay:0.3s;"></span>
        </div>
      </div>
    </div>
  `;

  const holdMs = isReturning ? 2000 : 2500;

  setTimeout(function () {
    if (appState.mode !== 'welcome') return;
    const screen = document.getElementById('wlScreen');
    if (screen) screen.classList.add('wl-screen-out');
  }, holdMs);

  setTimeout(function () {
    if (appState.mode !== 'welcome') return;
    appState.mode = isReturning ? 'home' : 'onboarding';
    _saveState();
    renderApp();
  }, holdMs + 400);
}

// ---------------------------------------------
// Onboarding (Clara)
// ---------------------------------------------

const CLARA_FIRST = "Hey, I'm Clara. Tell me about your business and what you're trying to achieve right now.";
const CLARA_SECOND = "Got it. Are you trying to reach people nearby or do you also sell online?";
const CLARA_THIRD = "Perfect. Give me a moment.";

const CL_SEND_ARROW_SVG = `
  <svg class="cl-send-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <line x1="12" y1="19" x2="12" y2="5"/>
    <polyline points="5 12 12 5 19 12"/>
  </svg>
`;

const CL_ATTACH_ICON_SVG = `
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
`;

const CL_STARTER_CHIPS = [
  'How do I get more customers?',
  'What should I post today?',
  'How do I stand out from competitors?',
  'Help me make an offer.'
];

function renderOnboarding(root) {
  const hasMessages = (appState.clara.messages || []).length > 0;
  if (hasMessages) {
    _renderChatState(root, { animateLast: false });
    _resumeConversation();
  } else {
    _renderInitialState(root);
  }
}

function _renderInitialState(root) {
  const outerStyle = [
    'min-height:100vh', 'padding:0',
    'display:flex', 'flex-direction:column',
    'align-items:center', 'justify-content:center',
    'background:radial-gradient(ellipse at 50% 35%, #261c08 0%, #0F0D0B 60%)',
    'position:relative', 'overflow:hidden'
  ].join(';') + ';';

  const blob1Style = 'position:absolute;width:600px;height:600px;border-radius:50%;background:rgba(245,166,35,0.07);filter:blur(140px);top:-150px;left:50%;transform:translateX(-50%);pointer-events:none;z-index:0;';
  const blob2Style = 'position:absolute;width:300px;height:300px;border-radius:50%;background:rgba(232,132,90,0.05);filter:blur(100px);bottom:50px;right:5%;pointer-events:none;z-index:0;';
  const blob3Style = 'position:absolute;width:200px;height:200px;border-radius:50%;background:rgba(245,166,35,0.04);filter:blur(80px);bottom:100px;left:5%;pointer-events:none;z-index:0;';

  const contentStyle = 'position:relative;z-index:1;max-width:660px;margin:0 auto;padding:0 24px;display:flex;flex-direction:column;align-items:stretch;width:100%;';

  const questionBlockStyle = 'width:100%;max-width:600px;margin:0 auto 40px;opacity:0;animation:cl-init-fade-in 500ms cubic-bezier(0.2,0.7,0.2,1) 150ms forwards;';

  const questionRowStyle = 'display:flex;align-items:center;gap:12px;';

  const avatarStyle = [
    'width:28px', 'height:28px', 'border-radius:50%',
    'background:linear-gradient(135deg, #F5A623 0%, #D4860A 100%)',
    'display:flex', 'align-items:center', 'justify-content:center',
    'flex-shrink:0',
    'color:#000', 'font-size:12px', 'font-weight:700', 'line-height:1',
    'box-shadow:0 2px 12px rgba(245,166,35,0.3)'
  ].join(';') + ';';

  const questionStyle = 'font-size:32px;font-weight:700;color:#F5F0E8;letter-spacing:-0.02em;line-height:1.2;';
  const followupStyle = 'font-size:20px;font-weight:400;color:rgba(245,240,232,0.5);line-height:1.4;margin-top:8px;padding-left:40px;';

  const inputBarStyle = 'width:100%;padding:0;margin:0;display:flex;justify-content:center;';

  const chipsRowStyle = 'margin-top:20px;display:flex;flex-wrap:wrap;gap:8px;justify-content:center;max-width:600px;width:100%;margin-left:auto;margin-right:auto;';
  const chipStyle = 'background:rgba(255,240,220,0.04);border:1px solid rgba(255,240,220,0.08);border-radius:24px;padding:10px 20px;font-size:13px;color:rgba(245,240,232,0.5);cursor:pointer;transition:all 200ms ease;font-family:inherit;';

  root.innerHTML = `
    <style>
      @keyframes cl-init-fade-in {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .cl-init-chip:hover {
        background: rgba(245,166,35,0.08) !important;
        border-color: rgba(245,166,35,0.3) !important;
        color: #F5A623 !important;
      }
    </style>
    <div class="cl-onboarding cl-initial-state" id="clOnboarding" style="${outerStyle}">
      <div style="${blob1Style}"></div>
      <div style="${blob2Style}"></div>
      <div style="${blob3Style}"></div>
      <div style="${contentStyle}">
        <div class="cl-greeting" style="${questionBlockStyle}">
          <div style="${questionRowStyle}">
            <div class="cl-init-avatar" style="${avatarStyle}">C</div>
            <div style="${questionStyle}">Tell me about your business.</div>
          </div>
          <div style="${followupStyle}">What are you trying to achieve right now?</div>
        </div>
        <div class="cl-input-bar" id="clInputBar" style="${inputBarStyle}">
          ${_renderInputContainerHtml()}
        </div>
        <div class="cl-chips-row" style="${chipsRowStyle}">
          ${CL_STARTER_CHIPS.map(function (c) {
            return '<button type="button" class="cl-chip cl-init-chip" style="' + chipStyle + '">' + _escape(c) + '</button>';
          }).join('')}
        </div>
      </div>
    </div>
  `;

  const initialContainer = root.querySelector('.cl-initial-state .cl-input-container');
  if (initialContainer) {
    initialContainer.style.maxWidth = '600px';
    initialContainer.style.width = '100%';
    initialContainer.style.margin = '0 auto';
    initialContainer.style.background = 'rgba(28,24,20,0.95)';
    initialContainer.style.border = '1px solid rgba(255,240,220,0.12)';
    initialContainer.style.borderRadius = '20px';
    initialContainer.style.boxShadow = '0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(245,166,35,0.06)';
    initialContainer.style.padding = '16px 16px 16px 20px';
    initialContainer.style.display = 'flex';
    initialContainer.style.alignItems = 'flex-end';
    initialContainer.style.gap = '12px';
    initialContainer.style.backdropFilter = 'blur(20px)';
    initialContainer.style.webkitBackdropFilter = 'blur(20px)';
  }

  _bindInputEvents();
  _bindStarterChips();
}

function _renderChatState(root, opts) {
  const animateLast = !!(opts && opts.animateLast);

  const rootStyle = [
    'min-height:100vh',
    'display:flex',
    'flex-direction:column',
    'background:radial-gradient(ellipse at 50% 0%, #1e1508 0%, #0F0D0B 50%)'
  ].join(';') + ';';

  const watermarkStyle = [
    'font-size:11px',
    'font-weight:600',
    'color:rgba(245,166,35,0.12)',
    'letter-spacing:0.25em',
    'text-transform:uppercase',
    'padding-top:20px',
    'padding-bottom:16px',
    'text-align:center',
    'flex-shrink:0'
  ].join(';') + ';';

  const disclaimerStyle = 'max-width:640px;margin:10px auto 0;text-align:center;font-size:11px;color:rgba(245,240,232,0.18);line-height:1.4;';

  root.innerHTML = `
    <div class="cl-onboarding cl-chat-state" id="clOnboarding" style="${rootStyle}">
      <div class="cl-watermark" style="${watermarkStyle}">Clarity</div>
      <main class="cl-chat-area" id="clChatArea"></main>
      <div class="cl-input-bar" id="clInputBar">
        ${_renderInputContainerHtml()}
        <div class="cl-disclaimer" style="${disclaimerStyle}">Clara may make mistakes. Always verify important decisions.</div>
      </div>
    </div>
  `;

  const chatArea = document.getElementById('clChatArea');
  const messages = appState.clara.messages || [];
  messages.forEach(function (m, i) {
    const isLast = i === messages.length - 1;
    chatArea.appendChild(_buildMessageEl(m.role, m.text, animateLast && isLast));
  });

  _bindInputEvents();
  _scrollChatToBottom();
}

function _renderInputContainerHtml() {
  return `
    <div class="cl-input-container">
      <button type="button" class="cl-attach-btn" id="clAttachBtn" aria-label="Attach file">
        ${CL_ATTACH_ICON_SVG}
        <span class="cl-attach-tooltip">Attach file</span>
      </button>
      <textarea
        class="cl-input"
        id="clInput"
        placeholder="Message Clara..."
        rows="1"
        autocomplete="off"
      ></textarea>
      <button type="button" class="cl-send-btn" id="clSendBtn" disabled aria-label="Send">
        ${CL_SEND_ARROW_SVG}
      </button>
    </div>
  `;
}

function _bindInputEvents() {
  const input = document.getElementById('clInput');
  const btn = document.getElementById('clSendBtn');
  if (!input || !btn) return;

  input.focus();

  const refreshDisabled = function () {
    btn.disabled = input.value.trim() === '';
  };

  const autoGrow = function () {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 150) + 'px';
  };

  input.addEventListener('input', function () {
    autoGrow();
    refreshDisabled();
  });

  btn.addEventListener('click', _handleSend);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.value.trim() === '') return;
      _handleSend();
    }
  });
}

function _bindStarterChips() {
  document.querySelectorAll('.cl-chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      const input = document.getElementById('clInput');
      if (!input) return;
      input.value = chip.textContent || '';
      input.focus();
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  });
}

const CL_GROUP_BASE_STYLE = 'max-width:640px;margin:0 auto 28px;width:100%;padding:0 20px;';
const CL_GROUP_CLARA_STYLE = CL_GROUP_BASE_STYLE + 'display:flex;flex-direction:row;align-items:flex-start;gap:12px;';
const CL_GROUP_USER_STYLE = CL_GROUP_BASE_STYLE + 'display:flex;justify-content:flex-end;';

const CL_AVATAR_STYLE = [
  'width:32px', 'height:32px', 'border-radius:50%',
  'background:linear-gradient(135deg, #F5A623 0%, #D4860A 100%)',
  'color:#000', 'display:flex', 'align-items:center', 'justify-content:center',
  'flex-shrink:0',
  'font-size:13px', 'font-weight:700',
  'margin-top:2px',
  'box-shadow:0 2px 12px rgba(245,166,35,0.3)'
].join(';') + ';';

const CL_CLARA_TEXT_STYLE = [
  'background:transparent',
  'border:none',
  'border-radius:0',
  'padding:0',
  'font-size:16px',
  'color:#F5F0E8',
  'line-height:1.75',
  'flex:1',
  'max-width:none',
  'word-wrap:break-word',
  'white-space:pre-wrap'
].join(';') + ';';

const CL_USER_TEXT_STYLE = [
  'background:rgba(245,166,35,0.12)',
  'border:1px solid rgba(245,166,35,0.2)',
  'border-radius:18px 18px 4px 18px',
  'padding:14px 20px',
  'font-size:15px',
  'color:#F5F0E8',
  'max-width:75%',
  'line-height:1.5',
  'word-wrap:break-word',
  'white-space:pre-wrap',
  'box-shadow:0 2px 12px rgba(245,166,35,0.1)'
].join(';') + ';';

const CL_BOUNCE_DOT_STYLE = 'display:inline-block;width:8px;height:8px;border-radius:50%;background:rgba(245,240,232,0.3);margin:0 3px;animation:cl-bounce 0.8s ease-in-out infinite;';

function _buildMessageEl(role, text, animate) {
  const group = document.createElement('div');
  group.className = 'cl-msg-group cl-msg-' + role;
  group.setAttribute('style', role === 'clara' ? CL_GROUP_CLARA_STYLE : CL_GROUP_USER_STYLE);

  if (role === 'clara') {
    const avatar = document.createElement('div');
    avatar.className = 'cl-avatar';
    avatar.setAttribute('style', CL_AVATAR_STYLE);
    avatar.textContent = 'C';
    group.appendChild(avatar);

    const textEl = document.createElement('div');
    textEl.className = 'cl-clara-text';
    textEl.setAttribute('style', CL_CLARA_TEXT_STYLE);
    textEl.textContent = text;
    group.appendChild(textEl);
  } else {
    const textEl = document.createElement('div');
    textEl.className = 'cl-user-text';
    textEl.setAttribute('style', CL_USER_TEXT_STYLE);
    textEl.textContent = text;
    group.appendChild(textEl);
  }

  if (!animate) {
    group.style.animation = 'none';
  }
  return group;
}

function _buildThinkingBubbleEl() {
  const group = document.createElement('div');
  group.className = 'cl-msg-group cl-msg-clara';
  group.id = 'clThinkingBubble';
  group.setAttribute('style', CL_GROUP_CLARA_STYLE);

  const avatar = document.createElement('div');
  avatar.className = 'cl-avatar';
  avatar.setAttribute('style', CL_AVATAR_STYLE);
  avatar.textContent = 'C';
  group.appendChild(avatar);

  const textEl = document.createElement('div');
  textEl.className = 'cl-clara-text';
  textEl.setAttribute('style', CL_CLARA_TEXT_STYLE);
  textEl.innerHTML =
    '<span class="cl-bounce-dots" style="display:inline-flex;align-items:center;height:20px;">'
    + '<span class="cl-bounce-dot" style="' + CL_BOUNCE_DOT_STYLE + '"></span>'
    + '<span class="cl-bounce-dot" style="' + CL_BOUNCE_DOT_STYLE + 'animation-delay:0.15s;"></span>'
    + '<span class="cl-bounce-dot" style="' + CL_BOUNCE_DOT_STYLE + 'animation-delay:0.3s;"></span>'
    + '</span>';
  group.appendChild(textEl);

  return group;
}

function _showThinkingBubble() {
  const chat = document.getElementById('clChatArea');
  if (!chat) return;
  if (document.getElementById('clThinkingBubble')) return;
  chat.appendChild(_buildThinkingBubbleEl());
  _scrollChatToBottom();
}

function _removeThinkingBubble() {
  const el = document.getElementById('clThinkingBubble');
  if (el && el.parentNode) el.parentNode.removeChild(el);
}

function _scrollChatToBottom() {
  const area = document.getElementById('clChatArea');
  if (area) area.scrollTop = area.scrollHeight;
}

function _appendMessage(role, text) {
  const chat = document.getElementById('clChatArea');
  if (!chat) return;
  chat.appendChild(_buildMessageEl(role, text, true));
  _scrollChatToBottom();
}

function _claraSay(text) {
  appState.clara.messages.push({ role: 'clara', text: text });
  _saveState();
  _appendMessage('clara', text);
}

function _handleSend() {
  const input = document.getElementById('clInput');
  const btn = document.getElementById('clSendBtn');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  input.style.height = 'auto';
  if (btn) btn.disabled = true;

  const wasInitial = (appState.clara.messages || []).length === 0;
  appState.clara.messages.push({ role: 'user', text: text });

  const userMsgCount = appState.clara.messages.filter(function (m) { return m.role === 'user'; }).length;

  if (userMsgCount === 1) {
    appState.business.name = _extractNounPhrase(text);
    appState.business.goal = _extractGoal(text);
  } else if (userMsgCount === 2) {
    appState.business.reach = _detectReach(text);
  }

  _saveState();

  if (wasInitial) {
    _transitionToChatState();
    return;
  }

  _appendMessage('user', text);
  _resumeConversation();
}

function _transitionToChatState() {
  const container = document.getElementById('clOnboarding');
  const root = document.getElementById('app');
  if (!container || !root) {
    _renderChatState(root, { animateLast: true });
    _openSidebar();
    _resumeConversation();
    return;
  }

  const greeting = container.querySelector('.cl-greeting');
  const chips = container.querySelector('.cl-chips-row');
  const oldInput = container.querySelector('.cl-input-container');
  const oldRect = oldInput ? oldInput.getBoundingClientRect() : null;

  if (greeting) greeting.classList.add('cl-fade-out');
  if (chips) chips.classList.add('cl-fade-out');

  setTimeout(function () {
    if (appState.mode !== 'onboarding') return;
    _renderChatState(document.getElementById('app'), { animateLast: true });

    _openSidebar();

    const newInput = document.querySelector('.cl-input-container');
    if (newInput && oldRect) {
      const newRect = newInput.getBoundingClientRect();
      const deltaY = oldRect.top - newRect.top;
      if (Math.abs(deltaY) > 1) {
        newInput.style.transform = 'translateY(' + deltaY + 'px)';
        newInput.style.transition = 'none';
        void newInput.offsetHeight;
        newInput.style.transition = 'transform 250ms ease';
        newInput.style.transform = 'translateY(0)';
        setTimeout(function () {
          newInput.style.transition = '';
          newInput.style.transform = '';
        }, 280);
      }
    }

    _resumeConversation();
  }, 200);
}

function _resumeConversation() {
  if (appState.mode !== 'onboarding') return;
  const messages = appState.clara.messages || [];
  const userMsgCount = messages.filter(function (m) { return m.role === 'user'; }).length;
  const claraMsgCount = messages.filter(function (m) { return m.role === 'clara'; }).length;

  if (userMsgCount === 1 && claraMsgCount === 0) {
    _showThinkingBubble();
    setTimeout(function () {
      if (appState.mode !== 'onboarding') return;
      _removeThinkingBubble();
      _claraSay(CLARA_SECOND);
    }, 800);
  } else if (userMsgCount === 2 && claraMsgCount === 1) {
    _showThinkingBubble();
    setTimeout(function () {
      if (appState.mode !== 'onboarding') return;
      _removeThinkingBubble();
      _claraSay(CLARA_THIRD);
      setTimeout(function () {
        if (appState.mode !== 'onboarding') return;
        _startThinking();
      }, 1500);
    }, 800);
  } else if (userMsgCount === 2 && claraMsgCount === 2 && !appState.clara.onboardingComplete) {
    _startThinking();
  }
}

function _extractNounPhrase(text) {
  const cleaned = text.trim().replace(/^(i|we|my|our)\s+(run|have|own|do|manage|operate|am|are|started|opened|sell|make)\s+(a|an|the)?\s*/i, '');
  const stop = cleaned.search(/[.,;!?]|\s(and|but|that|which|because|to|so|we|i)\s/i);
  const phrase = stop > 0 ? cleaned.slice(0, stop) : cleaned;
  return phrase.trim().split(/\s+/).slice(0, 6).join(' ');
}

function _extractGoal(text) {
  const goalMatch = text.match(/(?:want to|trying to|need to|hoping to|looking to|goal is to|help me|would like to|aiming to)\s+([^.,;!?]+)/i);
  if (goalMatch) return goalMatch[1].trim();
  const rightNowMatch = text.match(/right now[,\s]+(.+)/i);
  if (rightNowMatch) return rightNowMatch[1].trim();
  return text.trim();
}

function _detectReach(text) {
  const local = /\b(nearby|local|walk|walk[-\s]?in|foot traffic|area|neighborhood|neighbourhood|city|town|street|block|near me|around here|in person)\b/i;
  return local.test(text) ? 'local' : 'online';
}

function _startThinking() {
  const bar = document.getElementById('clInputBar');
  if (!bar) return;
  bar.innerHTML = `
    <div class="cl-thinking">
      <span class="cl-thinking-dots">
        <span class="cl-dot"></span>
        <span class="cl-dot"></span>
        <span class="cl-dot"></span>
      </span>
      <div class="cl-thinking-label">Clara is building your plan...</div>
    </div>
  `;

  setTimeout(function () {
    appState.clara.onboardingComplete = true;
    appState.mode = 'home';
    _saveState();
    renderApp();
  }, 3000);
}

// ---------------------------------------------
// Home (Today / Create / Results tabs)
// ---------------------------------------------

const TAB_ICONS = {
  today: `
    <svg class="tb-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="4"/>
      <line x1="12" y1="2" x2="12" y2="4"/>
      <line x1="12" y1="20" x2="12" y2="22"/>
      <line x1="4.93" y1="4.93" x2="6.34" y2="6.34"/>
      <line x1="17.66" y1="17.66" x2="19.07" y2="19.07"/>
      <line x1="2" y1="12" x2="4" y2="12"/>
      <line x1="20" y1="12" x2="22" y2="12"/>
      <line x1="4.93" y1="19.07" x2="6.34" y2="17.66"/>
      <line x1="17.66" y1="6.34" x2="19.07" y2="4.93"/>
    </svg>
  `,
  create: `
    <svg class="tb-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="16"/>
      <line x1="8" y1="12" x2="16" y2="12"/>
    </svg>
  `,
  results: `
    <svg class="tb-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <line x1="6" y1="20" x2="6" y2="14"/>
      <line x1="12" y1="20" x2="12" y2="10"/>
      <line x1="18" y1="20" x2="18" y2="4"/>
    </svg>
  `
};

function renderHome(root) {
  root.innerHTML = `
    <div id="homeContent"></div>
    <nav class="tb-bar" id="tbBar"></nav>
    <div id="claraLayer"></div>
  `;
  _renderTabBar();
  _renderTabContent();
  _renderClaraLayer();
}

function _renderTabBar() {
  const bar = document.getElementById('tbBar');
  if (!bar) return;

  const tabs = [
    { id: 'today', label: 'Today' },
    { id: 'create', label: 'Create' },
    { id: 'results', label: 'Results' }
  ];

  bar.innerHTML = tabs.map(function (t) {
    const active = appState.tab === t.id ? ' tb-tab-active' : '';
    return `
      <button type="button" class="tb-tab${active}" data-tab="${t.id}">
        ${TAB_ICONS[t.id]}
        <span>${t.label}</span>
      </button>
    `;
  }).join('');

  bar.querySelectorAll('.tb-tab').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const next = btn.getAttribute('data-tab');
      if (next === appState.tab) return;
      appState.tab = next;
      _saveState();
      _renderTabBar();
      _renderTabContent();
    });
  });
}

function _renderTabContent() {
  const container = document.getElementById('homeContent');
  if (!container) return;

  if (appState.tab === 'today') {
    _renderToday(container);
  } else if (appState.tab === 'create') {
    _renderCreate(container);
  } else if (appState.tab === 'results') {
    _renderResults(container);
  }
}

function _greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function _todayTasks() {
  const name = appState.business.name || 'your business';
  return [
    {
      id: 'post-1',
      type: 'POST',
      description: 'Share what makes ' + name + ' different from everyone else. One photo, one sentence.',
      time: '5 min',
      reason: 'Your audience responds to authenticity. Show the person behind the business.'
    },
    {
      id: 'outreach-1',
      type: 'OUTREACH',
      description: 'Message 5 people who have visited ' + name + ' before and ask them what they\u2019d tell a friend about you.',
      time: '10 min',
      reason: 'Word of mouth is the fastest way to grow when you\u2019re just starting. Real feedback beats any ad.'
    },
    {
      id: 'offer-1',
      type: 'OFFER',
      description: 'Create a simple first-time visitor offer for ' + name + '. Even 10% off changes the decision.',
      time: '15 min',
      reason: 'A small incentive removes the hesitation for someone who\u2019s on the fence.'
    }
  ];
}

function _renderToday(container) {
  const tasks = _todayTasks();

  container.innerHTML = `
    <section class="td-wrap">
      <div class="td-greeting">${_greeting()}</div>
      <h1 class="td-heading">Here\u2019s what Clara thinks you should focus on today.</h1>
      <div class="td-cards" id="tdCards"></div>
      <div class="td-footer-note">Clara updates these every day based on what\u2019s working.</div>
    </section>
  `;

  const cardsWrap = document.getElementById('tdCards');
  tasks.forEach(function (task) {
    const card = document.createElement('div');
    card.className = 'td-card';
    card.setAttribute('data-task-id', task.id);
    card.innerHTML = `
      <div class="td-card-type" data-type="${task.type}">${task.type}</div>
      <div class="td-card-desc">${_escape(task.description)}</div>
      <div class="td-card-bottom">
        <span class="td-card-time">${task.time}</span>
        <span class="td-card-why" data-why="${task.id}">Why this?</span>
      </div>
      <div class="td-card-reason" data-reason="${task.id}">
        <div class="td-card-reason-inner">${_escape(task.reason)}</div>
      </div>
    `;

    const why = card.querySelector('.td-card-why');
    const reason = card.querySelector('.td-card-reason');

    why.addEventListener('click', function (e) {
      e.stopPropagation();
      reason.classList.toggle('td-card-reason-open');
    });

    card.addEventListener('click', function () {
      _resetCreate();
      appState.create.fromTask = task;
      appState.create.type = 'post';
      appState.create.platform = appState.business.reach === 'local' ? 'instagram' : 'linkedin';
      appState.tab = 'create';
      _saveState();
      _renderTabBar();
      _renderTabContent();
    });

    cardsWrap.appendChild(card);
  });
}

function _renderComingSoon(container, label) {
  container.innerHTML = `
    <div class="td-coming-soon">
      <div class="td-coming-soon-label">${label}</div>
      <div class="td-coming-soon-text">Coming soon</div>
    </div>
  `;
}

function _escape(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---------------------------------------------
// Create tab
// ---------------------------------------------

const CREATE_TYPE_ICONS = {
  post: `
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
      <polyline points="14 3 14 9 20 9"/>
      <line x1="8" y1="13" x2="16" y2="13"/>
      <line x1="8" y1="17" x2="16" y2="17"/>
    </svg>
  `,
  image: `
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <circle cx="8.5" cy="9" r="1.5"/>
      <polyline points="21 15 16 10 5 21"/>
    </svg>
  `,
  video: `
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none"/>
    </svg>
  `,
  audio: `
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="22"/>
      <line x1="8" y1="22" x2="16" y2="22"/>
    </svg>
  `
};

function _resetCreate() {
  appState.create = {
    step: null,
    type: null,
    platform: null,
    angle: null,
    variations: [],
    selected: null
  };
}

function _businessName() {
  return appState.business.name || 'your business';
}

function _angles() {
  const name = _businessName();
  return [
    {
      id: 'authenticity',
      text: 'Show what makes ' + name + ' different. Lead with one specific detail your competitors don\u2019t have.',
      label: 'Authenticity angle'
    },
    {
      id: 'process',
      text: 'Share a behind the scenes moment from ' + name + '. People connect with process, not just results.',
      label: 'Process angle'
    },
    {
      id: 'proof',
      text: 'Post a customer story or a problem ' + name + ' solved. Real outcomes build trust faster than any claim.',
      label: 'Proof angle'
    }
  ];
}

function _makeVariations() {
  const name = _businessName();
  const angle = appState.create.angle;
  const dotIdx = angle.text.indexOf('.');
  const first = dotIdx >= 0 ? angle.text.slice(0, dotIdx + 1) : angle.text;
  return [
    { id: 'A', text: 'Here\u2019s something most people don\u2019t know about ' + name + '. ' + first + ' We think that matters.' },
    { id: 'B', text: 'A quick story about why we started ' + name + '. ' + first + ' That\u2019s still our focus every day.' },
    { id: 'C', text: 'If you\u2019ve never tried ' + name + ' before, here\u2019s what to expect. ' + first + ' Come see for yourself.' }
  ];
}

function _renderCreate(container) {
  const c = appState.create;
  const showFlow = !!(c.fromTask || c.askSubmitted);

  let html = '<div class="cr-wrap">';

  if (c.fromTask) {
    html += `
      <div class="cr-from-pill">From Today\u2019s plan</div>
      <div class="cr-task-preview">${_escape(c.fromTask.description)}</div>
    `;
  } else if (!c.askSubmitted) {
    html += `
      <h1 class="cr-ask-heading">What do you want to make?</h1>
      <p class="cr-ask-sub">Tell Clara what you need.</p>
      <div class="cr-ask-wrap">
        <textarea class="cr-ask-input" id="crAskInput" placeholder="e.g. I want to post about our new weekend menu"></textarea>
        <button class="cr-ask-btn" id="crAskBtn">Ask Clara \u2192</button>
      </div>
    `;
  }

  if (showFlow) {
    html += `
      <div class="cr-section-label">What type of content?</div>
      <div class="cr-type-grid">
        ${_typeTileHtml('post', 'Post', 'Written post')}
        ${_typeTileHtml('image', 'Image', 'Photo or graphic')}
        ${_typeTileHtml('video', 'Video', 'Short video')}
        ${_typeTileHtml('audio', 'Audio', 'Podcast or voice')}
      </div>
    `;
  }

  if (c.type) {
    const platforms = [
      { key: 'instagram', label: 'Instagram' },
      { key: 'linkedin', label: 'LinkedIn' },
      { key: 'facebook', label: 'Facebook' },
      { key: 'email', label: 'Email' }
    ];
    html += `
      <div class="cr-section-label cr-section-label-spaced">Where are you posting?</div>
      <div class="cr-platform-row">
        ${platforms.map(function (p) {
          const active = c.platform === p.key ? ' cr-platform-chip-active' : '';
          return '<button type="button" class="cr-platform-chip' + active + '" data-platform="' + p.key + '">' + p.label + '</button>';
        }).join('')}
      </div>
    `;
  }

  if (c.platform) {
    const angles = _angles();
    html += `
      <div class="cr-section-label cr-section-label-spaced">Pick your angle</div>
      <p class="cr-angle-sub">Clara prepared these based on your business.</p>
      <div class="cr-angle-cards">
        ${angles.map(function (a) {
          const active = c.angle && c.angle.id === a.id ? ' cr-angle-card-active' : '';
          return `
            <div class="cr-angle-card${active}" data-angle="${a.id}">
              <div class="cr-angle-text">${_escape(a.text)}</div>
              <div class="cr-angle-label">${a.label}</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  if (c.selected) {
    if (c.draftSaved) {
      html += '<div class="cr-draft-saved">Saved as draft</div>';
    } else {
      html += `
        <div class="cr-publish-preview">
          <div class="cr-variation-label">VARIATION ${_escape(c.selected.id)}</div>
          <div class="cr-variation-text">${_escape(c.selected.text)}</div>
        </div>
        <div class="cr-publish-options">
          <button type="button" class="cr-publish-btn" id="crPublishBtn">Publish now</button>
          <button type="button" class="cr-publish-draft" id="crDraftBtn">Save as draft</button>
          <button type="button" class="cr-publish-reset" id="crResetBtn">Start over</button>
        </div>
      `;
    }
  } else if (c.variations && c.variations.length) {
    html += `
      <h2 class="cr-variations-heading">Pick one to publish</h2>
      <div class="cr-variations">
        ${c.variations.map(function (v) {
          return `
            <div class="cr-variation-card" data-variation="${v.id}">
              <div class="cr-variation-label">VARIATION ${v.id}</div>
              <div class="cr-variation-text">${_escape(v.text)}</div>
              <span class="cr-variation-select">Select this \u2192</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  } else if (c.generating) {
    html += `
      <div class="cr-loading">
        <span class="cl-thinking-dots">
          <span class="cl-dot"></span>
          <span class="cl-dot"></span>
          <span class="cl-dot"></span>
        </span>
        <div class="cr-loading-label">Clara is creating your variations...</div>
      </div>
    `;
  } else if (c.angle) {
    html += '<button type="button" class="cr-generate-btn" id="crGenerateBtn">Generate \u2192</button>';
  }

  html += '</div>';
  container.innerHTML = html;

  _bindCreateEvents();
}

function _typeTileHtml(key, title, sub) {
  const active = appState.create.type === key ? ' cr-type-tile-active' : '';
  return `
    <button type="button" class="cr-type-tile${active}" data-type="${key}">
      <div class="cr-type-icon">${CREATE_TYPE_ICONS[key]}</div>
      <div class="cr-type-title">${title}</div>
      <div class="cr-type-sub">${sub}</div>
    </button>
  `;
}

function _bindCreateEvents() {
  const askBtn = document.getElementById('crAskBtn');
  const askInput = document.getElementById('crAskInput');
  if (askBtn && askInput) {
    askInput.focus();
    askBtn.addEventListener('click', _handleAskSubmit);
    askInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        _handleAskSubmit();
      }
    });
  }

  document.querySelectorAll('.cr-type-tile').forEach(function (el) {
    el.addEventListener('click', function () {
      appState.create.type = el.getAttribute('data-type');
      _saveState();
      _renderTabContent();
    });
  });

  document.querySelectorAll('.cr-platform-chip').forEach(function (el) {
    el.addEventListener('click', function () {
      appState.create.platform = el.getAttribute('data-platform');
      _saveState();
      _renderTabContent();
    });
  });

  document.querySelectorAll('.cr-angle-card').forEach(function (el) {
    el.addEventListener('click', function () {
      const id = el.getAttribute('data-angle');
      const found = _angles().find(function (a) { return a.id === id; });
      appState.create.angle = found;
      _saveState();
      _renderTabContent();
    });
  });

  const gen = document.getElementById('crGenerateBtn');
  if (gen) {
    gen.addEventListener('click', function () {
      appState.create.generating = true;
      _saveState();
      _renderTabContent();
      setTimeout(function () {
        appState.create.generating = false;
        appState.create.variations = _makeVariations();
        _saveState();
        _renderTabContent();
      }, 2000);
    });
  }

  document.querySelectorAll('.cr-variation-card').forEach(function (el) {
    el.addEventListener('click', function () {
      const id = el.getAttribute('data-variation');
      const v = (appState.create.variations || []).find(function (x) { return x.id === id; });
      if (!v) return;
      appState.create.selected = v;
      appState.create.step = 'publish';
      _saveState();
      _renderTabContent();
    });
  });

  const publishBtn = document.getElementById('crPublishBtn');
  if (publishBtn) {
    publishBtn.addEventListener('click', function () {
      _pushResultItem('published');
      appState.results.unlocked = true;
      appState.tab = 'results';
      _resetCreate();
      _saveState();
      _renderTabBar();
      _renderTabContent();
    });
  }

  const draftBtn = document.getElementById('crDraftBtn');
  if (draftBtn) {
    draftBtn.addEventListener('click', function () {
      _pushResultItem('draft');
      appState.create.draftSaved = true;
      _saveState();
      _renderTabContent();
      setTimeout(function () {
        _resetCreate();
        _saveState();
        _renderTabContent();
      }, 2000);
    });
  }

  const resetBtn = document.getElementById('crResetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      _resetCreate();
      _saveState();
      _renderTabContent();
    });
  }
}

function _handleAskSubmit() {
  const input = document.getElementById('crAskInput');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  appState.create.userRequest = text;
  appState.create.askSubmitted = true;
  _saveState();
  _renderTabContent();
}

function _pushResultItem(status) {
  const c = appState.create;
  const item = {
    id: 'item-' + Date.now(),
    type: c.type,
    platform: c.platform,
    angle: c.angle,
    variation: c.selected ? c.selected.text : '',
    timestamp: Date.now(),
    reach: 0,
    status: status
  };
  appState.results.items.push(item);
}

// ---------------------------------------------
// Results tab
// ---------------------------------------------

const RESULTS_LOCK_ICON = `
  <svg class="rs-lock-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <rect x="4" y="11" width="16" height="10" rx="2"/>
    <path d="M8 11V7a4 4 0 0 1 8 0v4"/>
  </svg>
`;

const PLATFORM_LABELS = {
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  email: 'Email'
};

function _seededReach(idStr) {
  const digits = String(idStr).replace(/\D/g, '');
  const num = digits ? parseInt(digits, 10) : 0;
  const raw = Math.sin(num) * 1400 + 1400;
  return Math.round(raw / 10) * 10;
}

function _formatReach(n) {
  if (n >= 1000) {
    const k = n / 1000;
    const rounded = k >= 10 ? Math.round(k).toString() : k.toFixed(1);
    return rounded.replace(/\.0$/, '') + 'K';
  }
  return String(n);
}

function _mostCommonPlatform(items) {
  const counts = {};
  items.forEach(function (it) {
    if (!it.platform) return;
    counts[it.platform] = (counts[it.platform] || 0) + 1;
  });
  let top = null;
  let max = 0;
  Object.keys(counts).forEach(function (k) {
    if (counts[k] > max) {
      max = counts[k];
      top = k;
    }
  });
  return top;
}

function _platformLabel(key) {
  return PLATFORM_LABELS[key] || (key ? key.charAt(0).toUpperCase() + key.slice(1) : '');
}

function _claraInsight(items, totalReach) {
  if (totalReach === 0) {
    return 'your content is out there. Engagement takes a few days to build.';
  }
  const types = new Set(items.map(function (i) { return i.type; }));
  if (types.size === 1 && types.has('post')) {
    return 'written posts are your strongest format. Keep that going.';
  }
  return 'you\u2019re testing different formats which is smart. Double down on what gets shared.';
}

function _formatTimestamp(ts) {
  const d = new Date(ts);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) return 'Today';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[d.getMonth()] + ' ' + d.getDate();
}

function _renderResults(container) {
  const items = (appState.results && appState.results.items) || [];
  const hasItems = items.length > 0;

  let html = `
    <div class="rs-wrap">
      <h1 class="rs-heading">Results</h1>
      <p class="rs-subtext">Every time you publish, Clara learns what works for your audience.</p>
  `;

  if (!hasItems) {
    html += _renderLockedState();
  } else {
    html += _renderUnlockedState(items);
  }

  html += '</div>';
  container.innerHTML = html;
  _bindResultsEvents();
}

function _renderLockedState() {
  const cards = [
    { label: 'REACH', desc: 'How many people saw your content' },
    { label: 'BEST TIME', desc: 'When your audience is most active' },
    { label: 'WHAT\u2019S WORKING', desc: 'Which content type gets the most response' }
  ];

  return `
    <div class="rs-locked-cards">
      ${cards.map(function (c) {
        return `
          <div class="rs-locked-card">
            ${RESULTS_LOCK_ICON}
            <div class="rs-locked-label">${c.label}</div>
            <div class="rs-locked-dash">\u2014</div>
            <div class="rs-locked-desc">${c.desc}</div>
          </div>
        `;
      }).join('')}
    </div>
    <button type="button" class="rs-unlock-cta" id="rsFirstBtn">Create your first post \u2192</button>
  `;
}

function _renderUnlockedState(items) {
  const totalReach = items.reduce(function (sum, item) {
    return sum + (item.status === 'draft' ? 0 : _seededReach(item.id));
  }, 0);
  const topPlatform = _mostCommonPlatform(items);
  const insight = _claraInsight(items, totalReach);

  const sorted = items.slice().sort(function (a, b) {
    return (b.timestamp || 0) - (a.timestamp || 0);
  });

  return `
    <div class="rs-summary-row">
      <div class="rs-stat-card">
        <div class="rs-stat-value rs-stat-value-accent">${items.length}</div>
        <div class="rs-stat-label">Published</div>
      </div>
      <div class="rs-stat-card">
        <div class="rs-stat-value">${_formatReach(totalReach)}</div>
        <div class="rs-stat-label">Total reach</div>
      </div>
      <div class="rs-stat-card">
        <div class="rs-stat-value rs-stat-value-small">${topPlatform ? _platformLabel(topPlatform) : '\u2014'}</div>
        <div class="rs-stat-label">Top channel</div>
      </div>
    </div>
    <div class="rs-insight-card">
      <div class="rs-insight-label">CLARA\u2019S TAKE</div>
      <div class="rs-insight-text">Based on what you\u2019ve published so far, ${insight}</div>
    </div>
    <div class="rs-content-label">YOUR CONTENT</div>
    <div class="rs-content-list">
      ${sorted.map(_renderContentRow).join('')}
    </div>
    <button type="button" class="rs-unlock-cta" id="rsAnotherBtn">Create another \u2192</button>
  `;
}

function _renderContentRow(item) {
  const type = item.type || 'post';
  const platformStr = _platformLabel(item.platform);
  const isDraft = item.status === 'draft';
  const reachStr = isDraft ? '\u2014' : _formatReach(_seededReach(item.id));
  const timeStr = _formatTimestamp(item.timestamp);
  const letter = type.charAt(0).toUpperCase();

  return `
    <div class="rs-content-row">
      <div class="rs-content-thumb rs-thumb-${type}">${letter}</div>
      <div class="rs-content-mid">
        <div class="rs-content-platform">${_escape(platformStr)}</div>
        <div class="rs-content-status rs-status-${isDraft ? 'draft' : 'published'}">${isDraft ? 'Draft' : 'Published'}</div>
        <div class="rs-content-time">${timeStr}</div>
      </div>
      <div class="rs-content-reach-wrap">
        <div class="rs-content-reach">${reachStr}</div>
        <div class="rs-content-reach-label">reach</div>
      </div>
    </div>
  `;
}

function _bindResultsEvents() {
  const goCreate = function () {
    appState.create.fromTask = null;
    appState.tab = 'create';
    _saveState();
    _renderTabBar();
    _renderTabContent();
  };
  const first = document.getElementById('rsFirstBtn');
  const another = document.getElementById('rsAnotherBtn');
  if (first) first.addEventListener('click', goCreate);
  if (another) another.addEventListener('click', goCreate);
}

// ---------------------------------------------
// Sidebar (concept nav + user footer)
// ---------------------------------------------

const SB_EDIT_ICON_SVG = `
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M12 20h9"/>
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
  </svg>
`;

const SB_LOGOUT_ICON_SVG = `
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
`;

const SB_ALLOWED_MODES = ['onboarding', 'home'];

let _sbTypewriterInterval = null;

function _syncSidebar() {
  const shouldShow = !!appState.sidebarOpen && SB_ALLOWED_MODES.indexOf(appState.mode) !== -1;
  const existing = document.getElementById('sbSidebar');

  if (shouldShow && !existing) {
    document.body.classList.add('sb-open');
    _mountSidebar(true);
    _setConceptNameImmediate();
  } else if (!shouldShow && existing) {
    if (_sbTypewriterInterval) {
      clearInterval(_sbTypewriterInterval);
      _sbTypewriterInterval = null;
    }
    existing.remove();
    document.body.classList.remove('sb-open');
  } else if (shouldShow && existing) {
    _setConceptNameImmediate();
  }
}

function _openSidebar() {
  if (document.getElementById('sbSidebar')) return;
  appState.sidebarOpen = true;
  _saveState();

  _mountSidebar(false);
  const sidebar = document.getElementById('sbSidebar');

  requestAnimationFrame(function () {
    if (!sidebar) return;
    sidebar.classList.add('sb-sidebar-open');
    document.body.classList.add('sb-open');
  });

  setTimeout(function () {
    if (!document.getElementById('sbSidebar')) return;
    _startConceptTypewriter();
  }, 400);
}

function _mountSidebar(initialOpen) {
  if (document.getElementById('sbSidebar')) return;
  const el = document.createElement('aside');
  el.id = 'sbSidebar';
  el.className = 'sb-sidebar' + (initialOpen ? ' sb-sidebar-open' : '');
  el.innerHTML = _buildSidebarHtml();
  document.body.appendChild(el);
  _bindSidebarEvents();
}

function _buildSidebarHtml() {
  const rawName = (appState.user && appState.user.name) ? String(appState.user.name) : '';
  const displayName = rawName || 'Guest';
  const firstInitial = (rawName ? rawName.trim().charAt(0) : 'C').toUpperCase() || 'C';

  return `
    <div class="sb-top">
      <div class="sb-brand">Clarity</div>
      <button type="button" class="sb-new-btn" id="sbNewBtn" title="New concept" aria-label="New concept">
        ${SB_EDIT_ICON_SVG}
      </button>
    </div>
    <div class="sb-concepts">
      <div class="sb-concepts-label">CONCEPTS</div>
      <div class="sb-concept-row sb-concept-row-active" id="sbConceptRow">
        <span class="sb-concept-dot"></span>
        <span class="sb-concept-name" id="sbConceptName"></span>
      </div>
    </div>
    <div class="sb-bottom">
      <div class="sb-user-avatar">${_escape(firstInitial)}</div>
      <div class="sb-user-name">${_escape(displayName)}</div>
      <button type="button" class="sb-settings-btn" id="sbSettingsBtn" title="Log out" aria-label="Log out">
        ${SB_LOGOUT_ICON_SVG}
      </button>
    </div>
  `;
}

function _bindSidebarEvents() {
  const settings = document.getElementById('sbSettingsBtn');
  if (settings) {
    settings.addEventListener('click', function () {
      if (typeof window.clarityReset === 'function') window.clarityReset();
    });
  }
}

function _startConceptTypewriter() {
  const el = document.getElementById('sbConceptName');
  if (!el) return;

  if (_sbTypewriterInterval) {
    clearInterval(_sbTypewriterInterval);
    _sbTypewriterInterval = null;
  }

  const name = _resolveConceptName();
  el.textContent = '';

  let i = 0;
  _sbTypewriterInterval = setInterval(function () {
    const target = document.getElementById('sbConceptName');
    if (!target) {
      clearInterval(_sbTypewriterInterval);
      _sbTypewriterInterval = null;
      return;
    }
    if (i >= name.length) {
      clearInterval(_sbTypewriterInterval);
      _sbTypewriterInterval = null;
      return;
    }
    i += 1;
    target.textContent = name.slice(0, i);
  }, 60);
}

function _setConceptNameImmediate() {
  const el = document.getElementById('sbConceptName');
  if (!el) return;
  if (_sbTypewriterInterval) return;
  el.textContent = _resolveConceptName();
}

function _resolveConceptName() {
  const raw = String((appState.business && appState.business.name) || '').trim();
  if (raw.length < 2) return 'New concept';
  return raw;
}

// ---------------------------------------------
// Clara floating chat widget
// ---------------------------------------------

const CW_QUICK_PROMPTS = [
  'What should I do today?',
  'How\u2019s my content doing?',
  'Give me an idea.'
];

const CW_X_ICON_SVG = `
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <line x1="6" y1="6" x2="18" y2="18"/>
    <line x1="18" y1="6" x2="6" y2="18"/>
  </svg>
`;

const CW_SEND_ARROW_SVG = `
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <line x1="12" y1="19" x2="12" y2="5"/>
    <polyline points="5 12 12 5 19 12"/>
  </svg>
`;

function _renderClaraLayer() {
  const layer = document.getElementById('claraLayer');
  if (!layer) return;
  layer.innerHTML = '';

  if (!(appState.clara && appState.clara.onboardingComplete)) return;

  const openClass = appState.clara.widgetOpen ? ' cw-btn-open' : '';
  layer.insertAdjacentHTML('beforeend', `
    <button type="button" class="cw-btn${openClass}" id="cwBtn" aria-label="Ask Clara">
      <span class="cw-btn-icon cw-btn-icon-c">C</span>
      <span class="cw-btn-icon cw-btn-icon-x">${CW_X_ICON_SVG}</span>
    </button>
  `);

  const btn = document.getElementById('cwBtn');
  if (btn) {
    btn.addEventListener('click', function () {
      if (appState.clara.widgetOpen) {
        _closeWidget();
      } else {
        _openWidget();
      }
    });
  }

  if (appState.clara.widgetOpen) {
    _mountWidget();
  }
}

function _buildWidgetHtml() {
  const chipsHidden = !_shouldShowWidgetChips();
  const chipsHtml = CW_QUICK_PROMPTS.map(function (p) {
    return '<button type="button" class="cw-chip" data-prompt="' + _escape(p) + '">' + _escape(p) + '</button>';
  }).join('');

  return `
    <div class="cw-widget" id="cwWidget" role="dialog" aria-label="Chat with Clara">
      <div class="cw-header">
        <div class="cw-avatar">C</div>
        <div class="cw-header-info">
          <div class="cw-header-name">Clara</div>
          <div class="cw-header-role">Your business advisor</div>
        </div>
        <div class="cw-online-dot" aria-label="Online"></div>
      </div>
      <div class="cw-chat-area" id="cwChat"></div>
      <div class="cw-chips" id="cwChips"${chipsHidden ? ' hidden' : ''}>
        ${chipsHtml}
      </div>
      <div class="cw-input-row">
        <input type="text" class="cw-input" id="cwInput" placeholder="Ask Clara..." autocomplete="off" />
        <button type="button" class="cw-send" id="cwSendBtn" disabled aria-label="Send">
          ${CW_SEND_ARROW_SVG}
        </button>
      </div>
    </div>
  `;
}

function _mountWidget() {
  const layer = document.getElementById('claraLayer');
  if (!layer) return;
  if (document.getElementById('cwWidget')) return;

  layer.insertAdjacentHTML('beforeend', _buildWidgetHtml());
  _hydrateWidgetChat();
  _bindWidgetEvents();
  _maybeSendWidgetOpener();
}

function _openWidget() {
  appState.clara.widgetOpen = true;
  _saveState();
  const btn = document.getElementById('cwBtn');
  if (btn) btn.classList.add('cw-btn-open');
  _mountWidget();
}

function _closeWidget() {
  const widget = document.getElementById('cwWidget');
  const btn = document.getElementById('cwBtn');
  if (btn) btn.classList.remove('cw-btn-open');
  if (widget) widget.classList.add('cw-widget-closing');
  setTimeout(function () {
    if (widget && widget.parentNode) widget.parentNode.removeChild(widget);
    appState.clara.widgetOpen = false;
    _saveState();
  }, 200);
}

function _shouldShowWidgetChips() {
  if (appState.clara.widgetChipsDismissed) return false;
  const userCount = (appState.clara.widgetMessages || []).filter(function (m) {
    return m.role === 'user';
  }).length;
  return userCount < 2;
}

function _updateWidgetChipsVisibility() {
  const chips = document.getElementById('cwChips');
  if (!chips) return;
  if (_shouldShowWidgetChips()) {
    chips.hidden = false;
  } else {
    chips.hidden = true;
  }
}

function _hydrateWidgetChat() {
  const chat = document.getElementById('cwChat');
  if (!chat) return;
  chat.innerHTML = '';
  (appState.clara.widgetMessages || []).forEach(function (m) {
    chat.appendChild(_buildWidgetMessageEl(m.role, m.text, false));
  });
  chat.scrollTop = chat.scrollHeight;

  const input = document.getElementById('cwInput');
  if (input) input.focus();
}

function _buildWidgetMessageEl(role, text, animate) {
  const el = document.createElement('div');
  el.className = 'cw-msg cw-msg-' + role;
  el.textContent = text;
  if (!animate) el.style.animation = 'none';
  return el;
}

function _pushWidgetMessage(role, text) {
  if (!Array.isArray(appState.clara.widgetMessages)) {
    appState.clara.widgetMessages = [];
  }
  appState.clara.widgetMessages.push({ role: role, text: text });
  _saveState();
  const chat = document.getElementById('cwChat');
  if (chat) {
    chat.appendChild(_buildWidgetMessageEl(role, text, true));
    chat.scrollTop = chat.scrollHeight;
  }
  _updateWidgetChipsVisibility();
}

function _maybeSendWidgetOpener() {
  if (!appState.clara.widgetOpen) return;
  if ((appState.clara.widgetMessages || []).length > 0) return;

  setTimeout(function () {
    if (!appState.clara.widgetOpen) return;
    if ((appState.clara.widgetMessages || []).length > 0) return;
    const rawName = (appState.user && appState.user.name) ? String(appState.user.name) : '';
    const firstName = rawName ? rawName.split(' ')[0] : 'there';
    _pushWidgetMessage('clara', 'Hi ' + firstName + '! What can I help you with today?');
  }, 400);
}

function _bindWidgetEvents() {
  document.querySelectorAll('.cw-chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      const prompt = chip.getAttribute('data-prompt') || '';
      appState.clara.widgetChipsDismissed = true;
      _saveState();
      _sendWidgetMessage(prompt);
    });
  });

  const input = document.getElementById('cwInput');
  const sendBtn = document.getElementById('cwSendBtn');

  if (input) {
    input.addEventListener('input', function () {
      if (sendBtn) sendBtn.disabled = input.value.trim() === '';
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        _handleWidgetSend();
      }
    });
  }
  if (sendBtn) sendBtn.addEventListener('click', _handleWidgetSend);
}

function _handleWidgetSend() {
  const input = document.getElementById('cwInput');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  const sendBtn = document.getElementById('cwSendBtn');
  if (sendBtn) sendBtn.disabled = true;
  _sendWidgetMessage(text);
}

function _sendWidgetMessage(text) {
  _pushWidgetMessage('user', text);
  _showWidgetThinking();
  setTimeout(function () {
    _removeWidgetThinking();
    if (!appState.clara.widgetOpen) {
      const reply = _claraWidgetReply(text);
      appState.clara.widgetMessages.push({ role: 'clara', text: reply });
      _saveState();
      return;
    }
    _pushWidgetMessage('clara', _claraWidgetReply(text));
  }, 800);
}

function _showWidgetThinking() {
  const chat = document.getElementById('cwChat');
  if (!chat) return;
  if (document.getElementById('cwThinking')) return;
  const el = document.createElement('div');
  el.className = 'cw-thinking';
  el.id = 'cwThinking';
  el.innerHTML = '<span class="cw-thinking-dot"></span><span class="cw-thinking-dot"></span><span class="cw-thinking-dot"></span>';
  chat.appendChild(el);
  chat.scrollTop = chat.scrollHeight;
}

function _removeWidgetThinking() {
  const el = document.getElementById('cwThinking');
  if (el && el.parentNode) el.parentNode.removeChild(el);
}

function _claraWidgetReply(text) {
  const t = String(text).toLowerCase();
  const name = _businessName();

  if (/\b(post|today)\b/.test(t)) {
    return 'Based on your business, I\u2019d focus on showing the real side of what you do. One authentic post beats five polished ones.';
  }
  if (/\b(content|doing|results)\b/.test(t)) {
    const count = (appState.results.items || []).length;
    if (count === 0) {
      return 'You haven\u2019t published yet. Start with one post today, even something simple.';
    }
    return 'You\u2019ve published ' + count + ' pieces so far. Keep the momentum going.';
  }
  if (/\bidea\b/.test(t)) {
    return 'Try this: share one thing that happened at ' + name + ' this week that surprised you. Real moments get the most response.';
  }
  return 'Good question. Based on what I know about ' + name + ', focus on consistency over perfection right now. One post a day beats one perfect post a week.';
}

// ---------------------------------------------
// Dev utilities
// ---------------------------------------------

window.clarityReset = function () {
  localStorage.removeItem(STATE_KEY);
  window.location.reload();
};

document.addEventListener('DOMContentLoaded', function () {
  _restoreState();
  renderApp();
});
