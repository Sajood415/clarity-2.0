// ---------------------------------------------
// Clarity 2.0 \u2014 Router (dashboard shell)
// ---------------------------------------------
//
// Top-level layout in `home` mode:
//
//   \u250c\u2500 sidebar (240px, fixed) \u2500\u2510 \u250c\u2500\u2500 main content area \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510
//   \u2502 brand                  \u2502 \u2502 top bar (48px)                  \u2502
//   \u2502 concept picker         \u2502 \u2502 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 \u2502
//   \u2502 NAV                    \u2502 \u2502 active view renders here        \u2502
//   \u2502   Today                \u2502 \u2502                                 \u2502
//   \u2502   Create               \u2502 \u2502                                 \u2502
//   \u2502   Results              \u2502 \u2502                                 \u2502
//   \u2502 (spacer)               \u2502 \u2502                                 \u2502
//   \u2502 user footer            \u2502 \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518
//   \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518
//
// Onboarding modal (screens/onboardingModal.js):
//   Rendered on top of everything as a fixed dark backdrop + centered
//   card. Same experience for both flows (new user, existing user's
//   new concept). The modal owns its own progress state and closes
//   itself by flipping appState.onboardingOverlayOpen = false + calling
//   renderApp() when the user finishes Q6. Backdrop clicks are inert.
//
// For a first-time user the sidebar is hidden entirely until at least
// one concept has completed onboarding \u2014 the modal is the only thing
// they can interact with.

function renderApp() {
  const root = document.getElementById('app');
  if (!root) return;

  // Effective colour mode for this render.
  //
  // The dashboard proper (home mode, no onboarding overlay, past the
  // first-briefing takeover) respects the user's saved preference.
  // Every OTHER screen -- splash / auth / loading / welcome, plus the
  // full-screen onboarding overlay and the first-briefing celebration --
  // is force-rendered in light mode. Rationale: those are pre-auth /
  // pre-dashboard "welcome" experiences designed against a warm
  // parchment canvas; letting a returning dark-mode user's preference
  // bleed through on sign-in makes the login page feel like a debug
  // console rather than a first impression, and the onboarding wizard's
  // amber CTAs + parchment illustrations only read correctly on light.
  //
  // Previous version hardcoded the inline body.style.background to
  // #0F0D0B; that beat the body.light-mode token cascade in
  // styles/tokens.css and left the main content area painted dark while
  // the sidebar/topbar (which read var(--bg) via normal CSS) correctly
  // turned parchment. Now we compute _useLight, toggle the class, AND
  // rewrite the inline so the two stay in lockstep.
  //
  // _active / _firstTime / _onboardingIncomplete are all computed
  // defensively -- renderApp() runs on every state transition, including
  // before getActiveConcept() has anything to hand back. Reading from
  // appState here \u2014 not the body class \u2014 because renderApp() can fire
  // before src/main.js has flipped the class on boot, and colorMode is
  // already normalized by state.js at load.
  const _active = (typeof getActiveConcept === 'function') ? getActiveConcept() : null;
  const _firstTime = (appState.mode === 'home')
    && (typeof _isFirstTimeUser === 'function')
    && _isFirstTimeUser();
  const _onboardingIncomplete = !!(_active && _active.chat && !_active.chat.onboardingComplete);
  const _onboardingActive = _firstTime || _onboardingIncomplete || !!appState.onboardingOverlayOpen;
  const _inFirstBriefing = appState.mode === 'home'
    && appState.activeView === 'first-briefing'
    && !!(_active && _active.today && _active.today.hasSeenFirstBriefing !== true);
  const _forceLight = (appState.mode !== 'home') || _onboardingActive || _inFirstBriefing;
  const _useLight = _forceLight || (appState && appState.colorMode === 'light');
  document.body.classList.toggle('light-mode', _useLight);
  document.body.style.background = _useLight ? '#FAF7F2' : '#0F0D0B';

  if (appState.mode === 'home' && !appState.sidebarOpen) {
    appState.sidebarOpen = true;
    _saveState();
  }

  // Legacy floating-widget hook \u2014 stub only, always no-ops now.
  if (typeof _syncWorkspaceGreeter === 'function') _syncWorkspaceGreeter();

  // Sidebar visibility depends on whether we're the first-time user or
  // an existing one. First-time = no concept has ever completed onboarding
  // AND at most one concept exists (the fresh one welcome.js just spawned).
  // In that case the onboarding overlay covers the whole screen; sidebar
  // stays hidden until the first concept lands on 'done'.
  const active = getActiveConcept();
  const isFirstTimeUser = appState.mode === 'home' && _isFirstTimeUser();
  if (!isFirstTimeUser) _syncSidebar();
  else {
    // Force-remove any stale sidebar from a previous session.
    const stale = document.getElementById('sbSidebar');
    if (stale) stale.remove();
    document.body.classList.remove('sb-open');
  }

  switch (appState.mode) {
    case 'splash':   renderSplash(root);   break;
    case 'auth':     renderAuth(root);     break;
    case 'loading':  renderLoading(root);  break;
    case 'welcome':  renderWelcome(root);  break;
    case 'home':     _renderHome(root);    break;
    default:
      // Never render a blank page. If appState.mode is corrupt or
      // unrecognized, drop a lightweight "Loading\u2026" state so the
      // app has something visible on screen while state settles (or
      // while the developer notices in the console). This also
      // guarantees the onboarding \u2192 dashboard transition can never
      // land the user on an empty viewport even if state.mode is
      // between values mid-write.
      console.warn('renderApp: unknown appState.mode "' + appState.mode + '" \u2014 showing fallback.');
      root.innerHTML = ''
        + '<div style="position:fixed;inset:0;display:flex;align-items:center;'
        +   'justify-content:center;background:#0F0D0B;color:#8A7F72;'
        +   'font-family:Inter,system-ui,-apple-system,sans-serif;font-size:14px;'
        +   'letter-spacing:0.02em;">Loading\u2026</div>';
      break;
  }
}

// ---------------------------------------------
// Home shell
// ---------------------------------------------

function _renderHome(root) {
  const active = getActiveConcept();

  // First-time user: no completed concepts yet, so we skip the whole
  // dashboard shell and let the onboarding overlay own the viewport.
  // (welcome.js has already spawned a placeholder concept by the time
  // we get here, so `active` may exist \u2014 the check that matters is
  // "has anyone finished onboarding".)
  //
  // Same overlay chrome as the "existing user + New concept" flow: a
  // full-viewport dark scrim with a centered chat panel inside. The
  // only difference is there's no dashboard shell behind the scrim to
  // dim, so we hide the scrim's blur and use a solid warm background
  // to give the empty space some ambient life.
  if (!active || _isFirstTimeUser()) {
    root.innerHTML = `
      <div class="hm-shell hm-shell-onboarding" id="hmShell">
        <div id="obOverlayHost"></div>
      </div>
    `;
    appState.onboardingOverlayOpen = true;
    _mountOnboardingOverlay();
    return;
  }

  // First-time insights briefing \u2014 full-screen, no sidebar, no
  // concept header. Fires exactly once per concept, immediately after
  // onboarding completes (see onboardingModal._obCompleteFlow). We
  // check the flag directly instead of trusting the view key alone
  // so a stale persisted `activeView='first-briefing'` from a bad
  // reload can't strand the user on the briefing forever \u2014 the
  // "Start Today" handler flips the flag, so any subsequent visit
  // routes past this branch straight to Today.
  if (appState.activeView === 'first-briefing'
      && active.today
      && active.today.hasSeenFirstBriefing !== true) {
    root.innerHTML = '<div id="firstBriefingHost"></div>';
    if (typeof renderFirstBriefing === 'function') {
      renderFirstBriefing(document.getElementById('firstBriefingHost'));
    } else {
      // Safety fallback: briefing screen not loaded (dev iteration,
      // missing script tag). Route to Today so the user never sees
      // a blank viewport. `hasSeenFirstBriefing` stays false so the
      // briefing fires on the next reload once the script is back.
      appState.activeView = 'today';
      renderApp();
    }
    return;
  }
  // If the flag is already true but activeView still says
  // 'first-briefing' (e.g. stale persisted state, or the briefing
  // was dismissed in a race), silently rewrite to Today and continue.
  if (appState.activeView === 'first-briefing') {
    appState.activeView = 'today';
  }

  // Dashboard shell for existing concept. Top bar + content area. If
  // the active concept is mid-onboarding, the overlay sits on top of
  // this shell with the sidebar behind it (visible but non-interactive).
  root.innerHTML = `
    <div class="hm-shell" id="hmShell">
      ${_renderConceptHeader()}
      <main id="homeContent" class="hm-content"></main>
      <div id="obOverlayHost"></div>
    </div>
  `;
  _bindConceptHeaderEvents();

  // Onboarding overlay decision. Shown either because the caller
  // flipped the flag (new-concept flow from an existing user) or because
  // the active concept genuinely isn't done yet (defensive fallback).
  const onboardingIncomplete = !!(active.chat && !active.chat.onboardingComplete);
  const showOverlay = appState.onboardingOverlayOpen || onboardingIncomplete;

  // Only render the content area when the overlay is DOWN. Rendering
  // Overview / Today / etc. underneath the overlay triggers side effects
  // like task seeding from empty business data, which would then persist
  // as stale generic tasks after onboarding completes.
  if (!showOverlay) {
    const container = document.getElementById('homeContent');
    _renderActiveView(container);
    _dismountOnboardingOverlay();
    return;
  }

  appState.onboardingOverlayOpen = true;
  _mountOnboardingOverlay();
}

function _renderActiveView(container) {
  const active = getActiveConcept();
  if (!active) return;

  // Report views open full-screen inside the content area with a Back
  // link (unchanged from the previous shell). Default landing is
  // Today; Overview, Chat and the standalone Insights tab were all
  // removed from the sidebar but their cases below are kept as safety
  // fallbacks so legacy state or programmatic calls never crash the
  // app. Chat itself is still fully functional \u2014 it just has no
  // navigation entry point any more.
  const view = appState.activeView || 'today';

  switch (view) {
    case 'overview':         renderOverview(container); break;
    case 'today':            renderToday(container); break;
    case 'tasks':
      if (typeof renderTasks === 'function') renderTasks(container);
      else renderToday(container);
      break;
    case 'chat':             renderChat(container); break;
    case 'create':           renderCreate(container); break;
    // Results is the canonical key for the published-content +
    // analytics screen. 'insights' is kept as a silent legacy alias
    // that points at the same renderer so any deep-link or persisted
    // lastWorkspaceView still lands the user on the same page.
    case 'results':          renderInsights(container); break;
    case 'insights':         renderInsights(container); break;
    case 'insights-detail':
      // Sub-page of Results. Falls back to the list if the pinned id
      // is missing or the item no longer exists (defensive \u2014 the
      // normalizer already handles the empty-id case).
      if (typeof renderInsightsDetail === 'function') renderInsightsDetail(container);
      else renderInsights(container);
      break;
    case 'concepts-list':    renderConceptsList(container); break;
    case 'market-report':
    case 'customer-report':
    case 'competition-report':
    case 'plan-report':
      // Legacy report keys \u2014 kept in the switch for state migration
      // safety, but currently no renderer is registered (renderReport
      // was never built). Fall through to Today.
      if (typeof window.renderReport === 'function') window.renderReport(container, view);
      else renderToday(container);
      break;
    case 'report-market':
    case 'report-customer':
    case 'report-competition':
    case 'report-plan':
      // v2 Strategic Planning reports (built in screens/reports.js).
      // Each opens as a full-page report inside the content area with
      // its own topbar (no concept header \u2014 that's suppressed by
      // conceptHeader.js for these view keys).
      if (typeof renderReport === 'function') renderReport(container, view);
      else renderToday(container);
      break;
    default:
      renderToday(container);
      break;
  }
}

// ---------------------------------------------
// Onboarding overlay
// ---------------------------------------------
//
// Mounts the polished onboarding modal (see screens/onboardingModal.js)
// into #obOverlayHost. The modal owns its own backdrop styling and
// step flow \u2014 the router just tells it "you're on top now" and
// stands out of the way. The `opts` argument is currently ignored
// (kept for parity in case we want mount variants later, e.g. an
// analytics dispatch).

function _mountOnboardingOverlay(opts) {
  const host = document.getElementById('obOverlayHost');
  if (!host) return;
  if (typeof renderOnboardingModal === 'function') {
    renderOnboardingModal(host);
  }
}

function _dismountOnboardingOverlay() {
  const host = document.getElementById('obOverlayHost');
  if (!host) return;
  if (host.innerHTML) host.innerHTML = '';
}

// A "first-time user" has no completed concepts yet. Distinct from
// "has no concepts at all" because welcome.js spawns a placeholder
// concept the moment a fresh signup enters home mode. We key off the
// completion flag to identify the true first run.
function _isFirstTimeUser() {
  const ids = Object.keys(appState.concepts || {});
  for (let i = 0; i < ids.length; i++) {
    const c = appState.concepts[ids[i]];
    if (c && c.chat && c.chat.onboardingComplete) return false;
  }
  return true;
}

window.renderApp = renderApp;
