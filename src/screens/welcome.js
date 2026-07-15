// ---------------------------------------------
// Clarity 2.0 — Welcome Screen
// ---------------------------------------------
//
// Shown briefly after loading. It personalizes with the user's first name
// and then hands off into home mode:
//   - Returning user (any completed concept): resume with existing active
//   - New user: auto-create concept #1 and drop into the Chat view

function renderWelcome(root) {
  const isReturning = _hasCompletedConcept();
  const firstName = _firstName();
  const nameLine = 'Hey, ' + (firstName === 'there' ? 'there' : _escape(firstName)) + '.';

  // Welcome is a pre-dashboard "hi, [name]" moment. Router forces this
  // screen into light mode regardless of appState.colorMode (see
  // renderApp in src/router.js), so we compute the theme once at render
  // time and pick the matching radial + text colours. Inline styles
  // are used because the blob layers rely on animation-driven opacity
  // ramps that CSS classes handle less predictably during hot re-renders
  // \u2014 so we can't lift these into welcome.css and rely on
  // body.light-mode overrides (inline beats class specificity). The
  // pair of hex values below MUST stay in sync with the light-mode
  // overrides at the bottom of styles/screens/welcome.css so the two
  // paths render identically.
  const _isLight = document.body.classList.contains('light-mode');
  const _bgStart = _isLight ? '#F4E4C4' : '#241a06';
  const _bgEnd = _isLight ? '#FAF7F2' : '#0F0D0B';
  const _nameColor = _isLight ? '#1A1108' : '#F5F0E8';
  const _subtitleColor = _isLight ? 'rgba(74,55,40,0.75)' : 'rgba(245,240,232,0.4)';

  const screenStyle = [
    'position:fixed', 'inset:0',
    'background:radial-gradient(ellipse at 50% 50%, ' + _bgStart + ' 0%, ' + _bgEnd + ' 70%)',
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
    'color:' + _nameColor, 'letter-spacing:-0.03em', 'line-height:1',
    'opacity:0',
    'animation:wl-fade-in 500ms cubic-bezier(0.2,0.7,0.2,1) 200ms forwards'
  ].join(';') + ';';

  const lineStyle = [
    'width:40px', 'height:2px',
    'background:' + (_isLight ? '#D4860A' : '#F5A623'), 'border-radius:1px',
    'margin:24px auto 0',
    'transform:scaleX(0)',
    'animation:wl-line-in 300ms cubic-bezier(0.2,0.7,0.2,1) 600ms forwards'
  ].join(';') + ';';

  const subtitleStyle = [
    'font-size:16px', 'color:' + _subtitleColor,
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
    _enterHome();
  }, holdMs + 400);
}

function _hasCompletedConcept() {
  const ids = Object.keys(appState.concepts);
  for (let i = 0; i < ids.length; i++) {
    if (appState.concepts[ids[i]].chat.onboardingComplete) return true;
  }
  return false;
}

function _enterHome() {
  appState.mode = 'home';

  // The post-welcome landing is ALWAYS the sidebar dashboard with
  // Today selected (Today replaced Overview as the primary landing
  // surface). Chat is a nav item, never a landing page. The only
  // variation is whether the onboarding overlay opens on top (new
  // user or incomplete concept) or the dashboard is clean (returning
  // user with a completed concept).
  appState.activeView = 'today';

  // Fresh signup \u2014 no concepts exist yet. Spawn a placeholder concept;
  // the router will detect "no completed concepts" and open the
  // onboarding overlay full-screen. `createConcept` already flips
  // onboardingOverlayOpen for us.
  if (!appState.activeConceptId || !getActiveConcept()) {
    createConcept({});
    renderApp();
    return;
  }

  // Returning user with concepts: force Overview regardless of the
  // last session's view. If the active concept is still mid-onboarding,
  // open the overlay so they resume from where Clara left off.
  const active = getActiveConcept();
  appState.onboardingOverlayOpen = !active.chat.onboardingComplete;

  _saveState();
  renderApp();
}

window.renderWelcome = renderWelcome;
