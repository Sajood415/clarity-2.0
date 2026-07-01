/* ============================================================
   ONBOARDING FLOW  —  IIFE module
   Screens: 1=Welcome  2=Auth  3=Business Setup (3 sub-steps)  4=Confirm
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

  /* Country list for sub-step 3d */
  var OB_COUNTRIES = [
    { name: 'Australia',      flag: '🇦🇺' },
    { name: 'Austria',        flag: '🇦🇹' },
    { name: 'Bangladesh',     flag: '🇧🇩' },
    { name: 'Belgium',        flag: '🇧🇪' },
    { name: 'Brazil',         flag: '🇧🇷' },
    { name: 'Canada',         flag: '🇨🇦' },
    { name: 'China',          flag: '🇨🇳' },
    { name: 'Denmark',        flag: '🇩🇰' },
    { name: 'Egypt',          flag: '🇪🇬' },
    { name: 'Finland',        flag: '🇫🇮' },
    { name: 'France',         flag: '🇫🇷' },
    { name: 'Germany',        flag: '🇩🇪' },
    { name: 'Ghana',          flag: '🇬🇭' },
    { name: 'Hong Kong',      flag: '🇭🇰' },
    { name: 'India',          flag: '🇮🇳' },
    { name: 'Indonesia',      flag: '🇮🇩' },
    { name: 'Ireland',        flag: '🇮🇪' },
    { name: 'Israel',         flag: '🇮🇱' },
    { name: 'Italy',          flag: '🇮🇹' },
    { name: 'Japan',          flag: '🇯🇵' },
    { name: 'Jordan',         flag: '🇯🇴' },
    { name: 'Kenya',          flag: '🇰🇪' },
    { name: 'Malaysia',       flag: '🇲🇾' },
    { name: 'Mexico',         flag: '🇲🇽' },
    { name: 'Morocco',        flag: '🇲🇦' },
    { name: 'Netherlands',    flag: '🇳🇱' },
    { name: 'New Zealand',    flag: '🇳🇿' },
    { name: 'Nigeria',        flag: '🇳🇬' },
    { name: 'Norway',         flag: '🇳🇴' },
    { name: 'Pakistan',       flag: '🇵🇰' },
    { name: 'Philippines',    flag: '🇵🇭' },
    { name: 'Poland',         flag: '🇵🇱' },
    { name: 'Portugal',       flag: '🇵🇹' },
    { name: 'Qatar',          flag: '🇶🇦' },
    { name: 'Saudi Arabia',   flag: '🇸🇦' },
    { name: 'Singapore',      flag: '🇸🇬' },
    { name: 'South Africa',   flag: '🇿🇦' },
    { name: 'South Korea',    flag: '🇰🇷' },
    { name: 'Spain',          flag: '🇪🇸' },
    { name: 'Sri Lanka',      flag: '🇱🇰' },
    { name: 'Sweden',         flag: '🇸🇪' },
    { name: 'Switzerland',    flag: '🇨🇭' },
    { name: 'Taiwan',         flag: '🇹🇼' },
    { name: 'Thailand',       flag: '🇹🇭' },
    { name: 'Turkey',         flag: '🇹🇷' },
    { name: 'UAE',            flag: '🇦🇪' },
    { name: 'United Kingdom', flag: '🇬🇧' },
    { name: 'United States',  flag: '🇺🇸' },
    { name: 'Vietnam',        flag: '🇻🇳' },
    { name: 'Other',          flag: '🌐' }
  ];

  /* ---- init ---- */
  function init(s) {
    state = s;
    if (!state.onboarding) {
      state.onboarding = { step: 1, authMode: 'signup', subStep: 1 };
    }
    if (!state.business) {
      state.business = { name: '', description: '', type: null, locations: [] };
    } else if (!state.business.locations) {
      state.business.locations = [];
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

  /* ============================================================
     Screen 1 — Welcome
     ============================================================ */
  function screenWelcome() {
    return '<div class="ob-screen ob-welcome-screen">'
      + '<div class="ob-welcome-main">'
      + '<div class="ob-welcome-wrap">'
      + '<div class="ob-wordmark"><em>Clarity</em></div>'
      + '<p class="ob-tagline">Plan, create, and publish,<br>all from one place.</p>'
      + '<p class="ob-tagline-sub">Strategy. Content. Campaigns. All connected.</p>'
      + '<div class="ob-welcome-actions">'
      + '<button class="ob-btn-gold btn-lg" onclick="obGoSignup()">Sign up</button>'
      + '<button class="ob-btn-outline-warm btn-lg" onclick="obGoLogin()">Log in</button>'
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

    /* Left brand panel — founder-focused quote + plain one-liners */
    var leftPanel = '<div class="ob-auth-panel">'
      + '<div class="ob-auth-panel-wordmark"><em>Clarity</em></div>'
      + '<div class="ob-auth-quote">&ldquo;Built for founders who&rsquo;d rather be building than figuring out what to post.&rdquo;</div>'
      + '<ul class="ob-auth-lines">'
      + '<li>Your strategy, persona, and content — all in one place.</li>'
      + '<li>AI that works from your context, not generic templates.</li>'
      + '<li>From first post to full campaign. No agency needed.</li>'
      + '</ul>'
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
      + '<input type="password" id="ob-password" placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;" oninput="obCheckAuthFields()" autocomplete="current-password" /></div>'
      + '<button class="ob-btn-primary" id="ob-auth-btn" onclick="obAdvanceFromAuth()" disabled>' + btnLabel + '</button>'
      + '</div>'
      + '<div class="ob-switch-link" style="max-width:420px;width:100%;text-align:center;margin-top:16px;">' + switchHtml + '</div>'
      + '</div>';

    return '<div class="ob-auth-screen">' + leftPanel + rightPanel + '</div>';
  }

  /* ============================================================
     Screen 3 — Business Setup (conversational sub-steps)
     ============================================================ */

  /* Sub-step 3a — Business name */
  function screenSetupName() {
    var nameVal = ((state.business && state.business.name) || '').replace(/"/g, '&quot;');
    var hasName = nameVal.trim().length > 0;
    return '<div class="ob-conv-screen">'
      + '<button class="ob-back" onclick="obGoStep(2)">&#8592; Back</button>'
      + progressDots(3)
      + '<div class="ob-conv-wrap">'
      + '<div class="ob-conv-question">What&rsquo;s your business called?</div>'
      + '<input type="text" id="ob-biz-name" class="ob-conv-input"'
      + ' value="' + nameVal + '" placeholder="e.g. Hearth Bakery"'
      + ' oninput="obBizNameInput(this.value)"'
      + ' onkeydown="obBizNameKey(event)" />'
      + '<button class="ob-conv-btn" id="ob-name-btn"'
      + (hasName ? '' : ' disabled')
      + ' onclick="obAdvanceToDesc()">Continue &#8594;</button>'
      + '</div>'
      + '</div>';
  }

  /* Sub-step 3b — Description */
  function screenSetupDesc() {
    var name     = (state.business && state.business.name) ? state.business.name.trim() : '';
    var descVal  = (state.business && state.business.description) || '';
    var refLine  = name ? '<div class="ob-conv-ref">' + escHtml(name) + ' &#8594;</div>' : '';
    return '<div class="ob-conv-screen">'
      + '<button class="ob-back" onclick="obBackToName()">&#8592; Back</button>'
      + progressDots(3)
      + '<div class="ob-conv-wrap">'
      + refLine
      + '<div class="ob-conv-question">What do you sell or offer?</div>'
      + '<textarea id="ob-biz-desc" class="ob-conv-textarea" rows="3"'
      + ' placeholder="e.g. Artisan sourdough and pastries, baked fresh daily."'
      + ' oninput="obBizDescInput(this.value)">' + escHtml(descVal) + '</textarea>'
      + '<button class="ob-conv-btn" onclick="obAdvanceToType()">Continue &#8594;</button>'
      + '</div>'
      + '</div>';
  }

  /* Sub-step 3c — Business type grid */
  function screenSetupType() {
    var name     = (state.business && state.business.name) ? state.business.name.trim() : '';
    var desc     = (state.business && state.business.description) ? state.business.description.trim() : '';
    var shortDesc = desc.length > 52 ? desc.substring(0, 49) + '\u2026' : desc;

    var refParts = [];
    if (name)      refParts.push('<span>' + escHtml(name) + '</span>');
    if (shortDesc) refParts.push('<span>' + escHtml(shortDesc) + '</span>');
    var refLine = refParts.length
      ? '<div class="ob-conv-ref ob-conv-ref-multi">'
        + refParts.join('<span class="ob-conv-ref-sep">&#8594;</span>')
        + '</div>'
      : '';

    var tilesHtml = OB_TYPES.map(function (t) {
      var sel = (state.business && state.business.type) === t.id;
      return '<div id="ob-type-tile-' + t.id + '" class="ob-type-tile' + (sel ? ' selected' : '') + '"'
        + ' onclick="obSelectTypeAndAdvance(\'' + t.id + '\')">'
        + '<div class="ob-type-icon">' + OB_TYPE_ICONS[t.id] + '</div>'
        + (sel ? '<div class="ob-type-check">&#10003;</div>' : '')
        + '<div class="ob-type-name">' + t.name + '</div>'
        + '<div class="ob-type-desc">' + t.desc + '</div>'
        + '</div>';
    }).join('');

    return '<div class="ob-conv-screen">'
      + '<button class="ob-back" onclick="obBackToDesc()">&#8592; Back</button>'
      + progressDots(3)
      + '<div class="ob-conv-wrap ob-conv-wrap-wide">'
      + refLine
      + '<div class="ob-conv-question">What kind of business is it?</div>'
      + '<div class="ob-conv-sub">Tap a tile to continue — no extra button needed.</div>'
      + '<div class="ob-type-grid">' + tilesHtml + '</div>'
      + '</div>'
      + '</div>';
  }

  /* Sub-step 3d — Location picker */
  function screenSetupLocation() {
    var locs     = (state.business && state.business.locations) || [];
    var name     = (state.business && state.business.name) ? state.business.name.trim() : '';
    var type     = (state.business && state.business.type) || '';
    var typeLabels = { food: 'Food & Hospitality', retail: 'Retail & Products', creative: 'Creative & Services', tech: 'Tech & Software', trades: 'Trades & Local', other: 'Other' };
    var typeLabel  = typeLabels[type] || '';

    var refParts = [];
    if (name)      refParts.push('<span>' + escHtml(name) + '</span>');
    if (typeLabel) refParts.push('<span>' + escHtml(typeLabel) + '</span>');
    var refLine = refParts.length
      ? '<div class="ob-conv-ref ob-conv-ref-multi">' + refParts.join('<span class="ob-conv-ref-sep">&#8594;</span>') + '</div>'
      : '';

    var isGlobal = locs.indexOf('Global') > -1;
    var hasSelection = locs.length > 0;

    /* Selected chips */
    var chipsHtml = '<div class="ob-loc-chips" id="ob-location-chips">'
      + locs.map(function (l) {
          return '<span class="ob-loc-chip">' + escHtml(l)
            + '<button type="button" onclick="obRemoveLocation(\'' + l.replace(/'/g, "\\'") + '\')">&#215;</button></span>';
        }).join('')
      + '</div>';

    /* Country rows */
    var rowsHtml = OB_COUNTRIES.map(function (c) {
      var sel = locs.indexOf(c.name) > -1;
      return '<div class="ob-loc-item' + (sel ? ' selected' : '') + '" data-loc="' + c.name.toLowerCase() + '" onclick="obToggleLocation(\'' + c.name.replace(/'/g, "\\'") + '\')">'
        + '<span class="ob-loc-flag">' + c.flag + '</span>'
        + '<span class="ob-loc-name">' + c.name + '</span>'
        + (sel ? '<span class="ob-loc-check">&#10003;</span>' : '')
        + '</div>';
    }).join('');

    return '<div class="ob-conv-screen">'
      + '<button class="ob-back" onclick="obBackToType()">&#8592; Back</button>'
      + progressDots(3)
      + '<div class="ob-conv-wrap">'
      + refLine
      + '<div class="ob-conv-question">Where do you operate?</div>'
      + chipsHtml
      + '<div class="ob-loc-global-row ob-loc-item' + (isGlobal ? ' selected' : '') + '" onclick="obToggleLocation(\'Global\')">'
      + '<span class="ob-loc-flag">🌍</span><span class="ob-loc-name">Global / Worldwide</span>'
      + (isGlobal ? '<span class="ob-loc-check">&#10003;</span>' : '')
      + '</div>'
      + '<input type="text" id="ob-location-search" class="ob-loc-search" placeholder="Search countries\u2026" oninput="obLocationSearch(this.value)" autocomplete="off" />'
      + '<div class="ob-loc-list" id="ob-location-list">' + rowsHtml + '</div>'
      + '<button class="ob-conv-btn" id="ob-location-btn"' + (hasSelection ? '' : ' disabled') + ' onclick="obAdvanceFromLocation()">Continue &#8594;</button>'
      + '</div>'
      + '</div>';
  }

  function screenSetup() {
    var subStep = (state.onboarding && state.onboarding.subStep) || 1;
    if (subStep === 2) return screenSetupDesc();
    if (subStep === 3) return screenSetupType();
    if (subStep === 4) return screenSetupLocation();
    return screenSetupName();
  }

  /* ============================================================
     Screen 4 — Confirmation
     ============================================================ */
  function screenConfirm() {
    var name = (state.business && state.business.name && state.business.name.trim())
      ? state.business.name.trim()
      : 'there';
    var locs = (state.business && state.business.locations) || [];
    var locLine = locs.length
      ? '<div class="ob-confirm-location">'
        + (locs[0] === 'Global' ? 'Operating globally.' : 'Operating in: ' + locs.join(', ') + '.')
        + '</div>'
      : '';
    var checkIcon = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2dd4bf"'
      + ' stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">'
      + '<polyline points="20 6 9 17 4 12"/></svg>';

    return '<div class="ob-screen">'
      + progressDots(4)
      + '<div class="ob-card" style="text-align:center;">'
      + '<div class="ob-confirm-icon">' + checkIcon + '</div>'
      + '<div class="ob-confirm-heading">Welcome, ' + escHtml(name) + '</div>'
      + locLine
      + '<p class="ob-confirm-sub">We&rsquo;ll use this to shape your strategy and content.'
      + ' Everything Clarity creates will be informed by your business and audience.</p>'
      + '<button class="ob-btn-primary" onclick="obLaunchWorkspace()">Let&rsquo;s get started</button>'
      + '</div>'
      + '</div>';
  }

  /* ============================================================
     Launching interim screen — "Building your workspace..."
     ============================================================ */
  function screenLaunching() {
    var txt = (state.onboarding && state.onboarding.launchingText) || 'Building your workspace\u2026';
    return '<div class="ob-launching-screen">'
      + '<div class="ob-launching-inner">'
      + '<div class="ob-launching-dot"></div>'
      + '<div class="ob-launching-text">' + txt + '</div>'
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
    if (step === 'launching') return screenLaunching();
    return screenWelcome();
  }

  /* ---- Helpers ---- */
  function escHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
  if (step === 3 && !appState.onboarding.subStep) {
    appState.onboarding.subStep = 1;
  }
  renderContent();
  if (step === 3) {
    setTimeout(function () {
      var el = document.getElementById('ob-biz-name');
      if (el) el.focus();
    }, 80);
  }
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

/* Toggle between signup/login */
window.obSwitchAuth = function (mode) {
  appState.onboarding.authMode = mode;
  renderContent();
};

/* Screen 2 → Screen 3 (Google button or Continue) */
window.obAdvanceFromAuth = function () {
  appState.onboarding.step         = 'launching';
  appState.onboarding.launchingText = 'Signing you in\u2026';
  renderContent();
  setTimeout(function () {
    appState.onboarding.launchingText = null;
    appState.onboarding.step    = 3;
    appState.onboarding.subStep = 1;
    renderContent();
    setTimeout(function () {
      var el = document.getElementById('ob-biz-name');
      if (el) el.focus();
    }, 80);
  }, 1500);
};

/* Enable/disable Continue on auth (no full re-render) */
window.obCheckAuthFields = function () {
  var email = document.getElementById('ob-email');
  var pass  = document.getElementById('ob-password');
  var btn   = document.getElementById('ob-auth-btn');
  if (email && pass && btn) {
    btn.disabled = !(email.value.trim() && pass.value.trim());
  }
};

/* ---- Sub-step 3a handlers ---- */

window.obBizNameInput = function (val) {
  appState.business.name = val;
  var btn = document.getElementById('ob-name-btn');
  if (btn) btn.disabled = !val.trim();
};

/* Allow pressing Enter to advance from name field */
window.obBizNameKey = function (e) {
  if (e.key === 'Enter') {
    var val = (appState.business.name || '').trim();
    if (val) window.obAdvanceToDesc();
  }
};

window.obAdvanceToDesc = function () {
  var nameEl = document.getElementById('ob-biz-name');
  if (nameEl) appState.business.name = nameEl.value;
  if (!(appState.business.name || '').trim()) return;
  appState.onboarding.subStep = 2;
  renderContent();
  setTimeout(function () {
    var el = document.getElementById('ob-biz-desc');
    if (el) el.focus();
  }, 80);
};

/* ---- Sub-step 3b handlers ---- */

window.obBizDescInput = function (val) {
  appState.business.description = val;
};

window.obAdvanceToType = function () {
  var descEl = document.getElementById('ob-biz-desc');
  if (descEl) appState.business.description = descEl.value;
  appState.onboarding.subStep = 3;
  renderContent();
};

window.obBackToName = function () {
  appState.onboarding.subStep = 1;
  renderContent();
  setTimeout(function () {
    var el = document.getElementById('ob-biz-name');
    if (el) { el.focus(); el.select(); }
  }, 80);
};

/* ---- Sub-step 3c handlers ---- */

/* Selecting a tile immediately advances to Screen 4 after brief visual confirmation */
window.obSelectTypeAndAdvance = function (id) {
  appState.business.type = id;

  /* Visual: mark tile selected in DOM */
  var allIds = ['food', 'retail', 'creative', 'tech', 'trades', 'other'];
  allIds.forEach(function (tid) {
    var tile = document.getElementById('ob-type-tile-' + tid);
    if (!tile) return;
    tile.classList.toggle('selected', tid === id);
    var existing = tile.querySelector('.ob-type-check');
    if (existing) existing.remove();
    if (tid === id) {
      var check = document.createElement('div');
      check.className = 'ob-type-check';
      check.innerHTML = '&#10003;';
      tile.insertBefore(check, tile.querySelector('.ob-type-name'));
    }
  });

  /* Brief pause for the user to see their selection, then advance to 3d */
  setTimeout(function () {
    appState.onboarding.subStep = 4;
    renderContent();
    setTimeout(function () {
      var el = document.getElementById('ob-location-search');
      if (el) el.focus();
    }, 80);
  }, 320);
};

window.obBackToDesc = function () {
  appState.onboarding.subStep = 2;
  renderContent();
  setTimeout(function () {
    var el = document.getElementById('ob-biz-desc');
    if (el) el.focus();
  }, 80);
};

window.obBackToType = function () {
  appState.onboarding.subStep = 3;
  renderContent();
};

/* ---- Sub-step 3d handlers ---- */

/* Update chips, list highlights, and Continue button without a full re-render */
window.obUpdateLocationUI = function () {
  var locs = appState.business.locations || [];

  /* Chips */
  var chipsEl = document.getElementById('ob-location-chips');
  if (chipsEl) {
    chipsEl.innerHTML = locs.map(function (l) {
      return '<span class="ob-loc-chip">' + l
        + '<button type="button" onclick="obRemoveLocation(\'' + l.replace(/'/g, "\\'") + '\')">&#215;</button></span>';
    }).join('');
  }

  /* Global row */
  var globalRow = document.querySelector('.ob-loc-global-row');
  if (globalRow) {
    var isGlobal = locs.indexOf('Global') > -1;
    globalRow.classList.toggle('selected', isGlobal);
    var gc = globalRow.querySelector('.ob-loc-check');
    if (isGlobal && !gc) { var s = document.createElement('span'); s.className = 'ob-loc-check'; s.innerHTML = '&#10003;'; globalRow.appendChild(s); }
    else if (!isGlobal && gc) { gc.remove(); }
  }

  /* Country rows */
  var rows = document.querySelectorAll('#ob-location-list .ob-loc-item');
  rows.forEach(function (row) {
    var n = (row.querySelector('.ob-loc-name') || {}).textContent || '';
    var sel = locs.indexOf(n) > -1;
    row.classList.toggle('selected', sel);
    var ck = row.querySelector('.ob-loc-check');
    if (sel && !ck)  { var s = document.createElement('span'); s.className = 'ob-loc-check'; s.innerHTML = '&#10003;'; row.appendChild(s); }
    else if (!sel && ck) { ck.remove(); }
  });

  /* Continue button */
  var btn = document.getElementById('ob-location-btn');
  if (btn) btn.disabled = locs.length === 0;
};

window.obToggleLocation = function (name) {
  if (!appState.business.locations) appState.business.locations = [];
  var locs = appState.business.locations;
  if (name === 'Global') {
    appState.business.locations = locs.indexOf('Global') > -1 ? [] : ['Global'];
  } else {
    var gi = locs.indexOf('Global');
    if (gi > -1) locs.splice(gi, 1);
    var i = locs.indexOf(name);
    if (i > -1) locs.splice(i, 1); else locs.push(name);
  }
  window.obUpdateLocationUI();
};

window.obRemoveLocation = function (name) {
  if (!appState.business.locations) return;
  var i = appState.business.locations.indexOf(name);
  if (i > -1) appState.business.locations.splice(i, 1);
  window.obUpdateLocationUI();
};

window.obLocationSearch = function (val) {
  var q = val.toLowerCase().trim();
  var rows = document.querySelectorAll('#ob-location-list .ob-loc-item');
  rows.forEach(function (row) {
    var n = ((row.querySelector('.ob-loc-name') || {}).textContent || '').toLowerCase();
    row.classList.toggle('ob-loc-hidden', q !== '' && n.indexOf(q) === -1);
  });
};

window.obAdvanceFromLocation = function () {
  if (!appState.business.locations || !appState.business.locations.length) return;
  appState.onboarding.step = 4;
  appState.onboarding.subStep = 1;
  renderContent();
};

/* ---- Screen 4 ---- */

/* "Let's get started" → show "Building your workspace..." → transition to Strategic Planning */
window.obLaunchWorkspace = function () {
  appState.onboarding.step = 'launching';
  renderContent();
  setTimeout(function () {
    setMode('strategic-plan');
  }, 1800);
};
