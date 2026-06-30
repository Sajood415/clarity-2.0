/* ============================================================
   ONBOARDING FLOW  —  IIFE module
   Screens: 1=Welcome  2=Auth  3=Business Setup  4=Confirm
   ============================================================ */
var OnboardingFlow = (function () {
  var state;

  /* Business category definitions */
  var OB_TYPES = [
    { id: 'food',     name: 'Food & Hospitality', desc: 'Restaurants, cafés, bakeries' },
    { id: 'retail',   name: 'Retail & Products',  desc: 'Shops, e-commerce, brands'   },
    { id: 'creative', name: 'Creative & Services', desc: 'Agencies, freelancers, studios' },
    { id: 'tech',     name: 'Tech & Software',    desc: 'SaaS, apps, startups'         },
    { id: 'trades',   name: 'Trades & Local',     desc: 'Plumbers, builders, local pros' },
    { id: 'other',    name: 'Other',              desc: 'Something else entirely'       }
  ];

  var OB_TYPE_ICONS = {
    food:
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
      + '<path d="M18 8h1a4 4 0 010 8h-1"/>'
      + '<path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/>'
      + '<line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>'
      + '</svg>',
    retail:
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
      + '<path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>'
      + '<line x1="3" y1="6" x2="21" y2="6"/>'
      + '<path d="M16 10a4 4 0 01-8 0"/>'
      + '</svg>',
    creative:
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
      + '<circle cx="13.5" cy="6.5" r="1"/><circle cx="17.5" cy="10.5" r="1"/>'
      + '<circle cx="8.5" cy="7.5" r="1"/><circle cx="6.5" cy="12.5" r="1"/>'
      + '<path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.65-.75 1.65-1.69 0-.44-.18-.84-.44-1.12-.29-.29-.44-.65-.44-1.13A1.64 1.64 0 0114.44 16.4h2c3.05 0 5.56-2.5 5.56-5.55C21.96 6.01 17.46 2 12 2z"/>'
      + '</svg>',
    tech:
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
      + '<rect x="2" y="3" width="20" height="14" rx="2"/>'
      + '<line x1="8" y1="21" x2="16" y2="21"/>'
      + '<line x1="12" y1="17" x2="12" y2="21"/>'
      + '</svg>',
    trades:
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
      + '<path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>'
      + '</svg>',
    other:
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
      + '<circle cx="12" cy="12" r="10"/>'
      + '<line x1="12" y1="8" x2="12" y2="12"/>'
      + '<line x1="12" y1="16" x2="12.01" y2="16"/>'
      + '</svg>'
  };

  /* ---- init ---- */
  function init(s) {
    state = s;
    if (!state.onboarding) {
      state.onboarding = { step: 1, authMode: 'signup' };
    }
    if (!state.business) {
      state.business = { name: '', description: '', type: null };
    }
  }

  /* ---- Progress indicator (4 dots, one per screen) ---- */
  function progressDots(current) {
    var html = '<div class="ob-progress">';
    for (var i = 1; i <= 4; i++) {
      var cls = i < current ? 'done' : (i === current ? 'active' : '');
      html += '<div class="ob-prog-dot ' + cls + '"></div>';
    }
    return html + '</div>';
  }

  /* ---- Feature bullet icons ---- */
  var OB_FEAT_ICONS = {
    strategy: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>',
    content:  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>',
    campaign: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
    audience: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>'
  };

  var OB_FEATURES = [
    { icon: 'strategy', label: 'Plan your strategy'  },
    { icon: 'content',  label: 'Generate content'    },
    { icon: 'campaign', label: 'Run campaigns'        },
    { icon: 'audience', label: 'Grow your audience'  }
  ];

  /* ============================================================
     Screen 1 — Welcome
     ============================================================ */
  function screenWelcome() {
    var bulletHtml = OB_FEATURES.map(function (f, i) {
      return (i > 0 ? '<div class="ob-feature-sep"></div>' : '')
        + '<div class="ob-feature-item">'
        + '<span class="ob-feature-icon">' + OB_FEAT_ICONS[f.icon] + '</span>'
        + f.label
        + '</div>';
    }).join('');

    return '<div class="ob-screen ob-welcome-screen">'
      + '<div class="ob-welcome-main">'
      + '<div class="ob-welcome-wrap">'
      + '<div class="ob-wordmark"><em>Clarity</em></div>'
      + '<p class="ob-tagline">Plan, create, and publish,<br>all from one place.</p>'
      + '<div class="ob-feature-row">' + bulletHtml + '</div>'
      + '<div class="ob-welcome-actions">'
      + '<button class="btn btn-primary btn-lg" onclick="obGoSignup()">Sign up</button>'
      + '<button class="btn btn-outline btn-lg" onclick="obGoLogin()">Log in</button>'
      + '</div>'
      + '</div>'
      + '</div>'
      + '<div class="ob-trust-footer">Trusted by founders and small marketing teams</div>'
      + '</div>';
  }

  /* ============================================================
     Screen 2 — Auth (Sign up / Log in, mocked)
     ============================================================ */
  function screenAuth() {
    /* Panel feature list — defined here so icon refs resolve after OB_FEAT_ICONS */
    var OB_AUTH_PANEL_FEATURES = [
      { icon: OB_FEAT_ICONS.strategy, strong: 'Strategic planning',   text: 'Clarity builds your positioning, persona, and 90-day content roadmap.' },
      { icon: OB_FEAT_ICONS.content,  strong: 'AI-assisted creation', text: 'Generate written, visual, and audio content grounded in your brand voice.' },
      { icon: OB_FEAT_ICONS.campaign, strong: 'Campaign management',  text: 'Schedule, publish, and track multi-platform campaigns in one place.'    }
    ];
    var isSignup = state.onboarding.authMode !== 'login';
    var title    = isSignup ? 'Create your account' : 'Welcome back';
    var sub      = isSignup ? 'Start your free Clarity account.' : 'Log in to continue.';
    var btnLabel = isSignup ? 'Continue' : 'Log in';
    var switchHtml = isSignup
      ? 'Already have an account? <a onclick="obSwitchAuth(\'login\')">Log in</a>'
      : 'New to Clarity? <a onclick="obSwitchAuth(\'signup\')">Sign up</a>';

    var googleIcon = '<svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">'
      + '<path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>'
      + '<path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>'
      + '<path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>'
      + '<path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>'
      + '</svg>';

    /* Left brand panel */
    var panelFeatures = OB_AUTH_PANEL_FEATURES.map(function (f) {
      return '<div class="ob-auth-feature">'
        + '<div class="ob-auth-feature-icon">' + f.icon + '</div>'
        + '<div class="ob-auth-feature-text"><strong>' + f.strong + '</strong> — ' + f.text + '</div>'
        + '</div>';
    }).join('');

    var leftPanel = '<div class="ob-auth-panel">'
      + '<div class="ob-auth-panel-wordmark"><em>Clarity</em></div>'
      + '<div class="ob-auth-panel-heading">The content engine for growing businesses.</div>'
      + '<p class="ob-auth-panel-sub">From strategy to publish — one focused workflow, built around your business goals.</p>'
      + '<div class="ob-auth-features">' + panelFeatures + '</div>'
      + '</div>';

    /* Right form side */
    var rightPanel = '<div class="ob-auth-right">'
      + '<div class="ob-auth-chrome">'
      + '<button class="ob-back" onclick="obGoStep(1)">&#8592; Back</button>'
      + progressDots(2)
      + '</div>'
      + '<div class="ob-card">'
      + '<div class="ob-card-mark">Clarity</div>'
      + '<div class="ob-card-title">' + title + '</div>'
      + '<div class="ob-card-sub">' + sub + '</div>'
      + '<button class="ob-btn-google" onclick="obAdvanceFromAuth()">'
      + googleIcon + 'Continue with Google'
      + '</button>'
      + '<div class="ob-divider">or</div>'
      + '<div class="ob-field"><label>Email address</label>'
      + '<input type="email" id="ob-email" placeholder="you@example.com" oninput="obCheckAuthFields()" autocomplete="email" /></div>'
      + '<div class="ob-field"><label>Password</label>'
      + '<input type="password" id="ob-password" placeholder="••••••••" oninput="obCheckAuthFields()" autocomplete="current-password" /></div>'
      + '<button class="ob-btn-primary" id="ob-auth-btn" onclick="obAdvanceFromAuth()" disabled>' + btnLabel + '</button>'
      + '</div>'
      + '<div class="ob-switch-link" style="max-width:420px;width:100%;text-align:center;margin-top:16px;">' + switchHtml + '</div>'
      + '</div>';

    return '<div class="ob-auth-screen">' + leftPanel + rightPanel + '</div>';
  }

  /* ============================================================
     Screen 3 — Business Setup
     ============================================================ */
  function screenSetup() {
    var biz      = state.business;
    var canContinue = !!(biz.name && biz.name.trim()) && !!biz.type;
    var nameVal  = (biz.name || '').replace(/"/g, '&quot;');
    var descVal  = biz.description || '';

    var tilesHtml = OB_TYPES.map(function (t) {
      var sel = biz.type === t.id;
      return '<div id="ob-type-tile-' + t.id + '" class="ob-type-tile' + (sel ? ' selected' : '') + '" onclick="obSelectType(\'' + t.id + '\')">'
        + '<div class="ob-type-icon">' + OB_TYPE_ICONS[t.id] + '</div>'
        + (sel ? '<div class="ob-type-check">&#10003;</div>' : '')
        + '<div class="ob-type-name">' + t.name + '</div>'
        + '<div class="ob-type-desc">' + t.desc + '</div>'
        + '</div>';
    }).join('');

    return '<div class="ob-screen">'
      + '<button class="ob-back" onclick="obGoStep(2)">&#8592; Back</button>'
      + progressDots(3)
      + '<div class="ob-setup-card">'
      + '<div class="ob-card-title">Tell us about your business</div>'
      + '<div class="ob-card-sub">We\'ll use this to personalise your strategy and content.</div>'
      + '<div class="ob-field"><label>Business name</label>'
      + '<input type="text" id="ob-biz-name" value="' + nameVal + '" placeholder="e.g. Hearth Bakery"'
      + ' oninput="obBizNameInput(this.value)" /></div>'
      + '<div class="ob-field"><label>Description '
      + '<span style="font-weight:400;text-transform:none;letter-spacing:0;color:var(--muted);font-size:10px;">(optional)</span></label>'
      + '<textarea id="ob-biz-desc" rows="3"'
      + ' placeholder="I run an artisan bakery selling sourdough and pastries"'
      + ' oninput="obBizDescInput(this.value)">' + descVal + '</textarea></div>'
      + '<div class="ob-section-label">Business type</div>'
      + '<div class="ob-type-grid">' + tilesHtml + '</div>'
      + '<button class="ob-btn-primary" id="ob-setup-btn" onclick="obGoStep(4)"'
      + (canContinue ? '' : ' disabled') + '>Continue</button>'
      + '</div>'
      + '</div>';
  }

  /* ============================================================
     Screen 4 — Confirmation
     ============================================================ */
  function screenConfirm() {
    var name = (state.business && state.business.name && state.business.name.trim())
      ? state.business.name.trim()
      : 'there';
    var checkIcon = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#34d399"'
      + ' stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">'
      + '<polyline points="20 6 9 17 4 12"/></svg>';

    return '<div class="ob-screen">'
      + progressDots(4)
      + '<div class="ob-card" style="text-align:center;">'
      + '<div class="ob-confirm-icon">' + checkIcon + '</div>'
      + '<div class="ob-confirm-heading">Welcome, ' + name + '</div>'
      + '<p class="ob-confirm-sub">We\'ll use this to shape your strategy and content.'
      + ' Everything Clarity creates will be informed by your business and audience.</p>'
      + '<button class="ob-btn-primary" onclick="setMode(\'strategic-plan\')">Let\'s get started</button>'
      + '</div>'
      + '</div>';
  }

  /* ============================================================
     Main screen router
     ============================================================ */
  function screenOnboarding() {
    var step = (state.onboarding && state.onboarding.step) || 1;
    if (step === 2) return screenAuth();
    if (step === 3) return screenSetup();
    if (step === 4) return screenConfirm();
    return screenWelcome();
  }

  return { init: init, screenOnboarding: screenOnboarding };
})();

/* Expose screen renderer for renderApp() */
window.screenOnboarding = function () { return OnboardingFlow.screenOnboarding(); };

/* ============================================================
   GLOBAL EVENT HANDLERS  (all inline onclick targets)
   ============================================================ */

/* Step navigation */
window.obGoStep = function (step) {
  appState.onboarding.step = step;
  renderContent();
};

/* Screen 1 → Screen 2 */
window.obGoSignup = function () {
  appState.onboarding.authMode = 'signup';
  appState.onboarding.step = 2;
  renderContent();
};

window.obGoLogin = function () {
  appState.onboarding.authMode = 'login';
  appState.onboarding.step = 2;
  renderContent();
};

/* Toggle between signup/login without losing form state */
window.obSwitchAuth = function (mode) {
  appState.onboarding.authMode = mode;
  renderContent();
};

/* Screen 2 → Screen 3 (Google button or Continue) */
window.obAdvanceFromAuth = function () {
  appState.onboarding.step = 3;
  renderContent();
};

/* Enable/disable Continue button as user types (no full re-render) */
window.obCheckAuthFields = function () {
  var email = document.getElementById('ob-email');
  var pass  = document.getElementById('ob-password');
  var btn   = document.getElementById('ob-auth-btn');
  if (email && pass && btn) {
    btn.disabled = !(email.value.trim() && pass.value.trim());
  }
};

/* Business name — persist to state, update Continue button without full re-render */
window.obBizNameInput = function (val) {
  appState.business.name = val;
  var btn = document.getElementById('ob-setup-btn');
  if (btn) {
    btn.disabled = !(val.trim() && appState.business.type);
  }
};

/* Business description — persist only, no re-render needed */
window.obBizDescInput = function (val) {
  appState.business.description = val;
};

/* Business type tile click — direct DOM update, no re-render */
window.obSelectType = function (id) {
  appState.business.type = id;

  /* Toggle selected class and check badge on each tile in-place */
  var allIds = ['food', 'retail', 'creative', 'tech', 'trades', 'other'];
  allIds.forEach(function (tid) {
    var tile = document.getElementById('ob-type-tile-' + tid);
    if (!tile) return;
    var isNowSelected = tid === id;
    tile.classList.toggle('selected', isNowSelected);
    /* Remove existing check badge if present */
    var existing = tile.querySelector('.ob-type-check');
    if (existing) existing.remove();
    /* Insert check badge right after the icon wrap when selected */
    if (isNowSelected) {
      var check = document.createElement('div');
      check.className = 'ob-type-check';
      check.innerHTML = '&#10003;';
      tile.insertBefore(check, tile.querySelector('.ob-type-name'));
    }
  });

  /* Enable/disable Continue button */
  var btn = document.getElementById('ob-setup-btn');
  if (btn) {
    var nameEl = document.getElementById('ob-biz-name');
    var name = nameEl ? nameEl.value : appState.business.name;
    btn.disabled = !(name && name.trim());
  }
};
