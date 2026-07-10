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
//   \u2502   Overview             \u2502 \u2502                                 \u2502
//   \u2502   Today                \u2502 \u2502                                 \u2502
//   \u2502   Chat                 \u2502 \u2502                                 \u2502
//   \u2502   Create               \u2502 \u2502                                 \u2502
//   \u2502   Insights             \u2502 \u2502                                 \u2502
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

  document.body.style.background = '#0F0D0B';

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
    default:         root.innerHTML = ''; break;
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
  // link (unchanged from the previous shell).
  const view = appState.activeView || 'overview';

  switch (view) {
    case 'overview':         renderOverview(container); break;
    case 'today':            renderToday(container); break;
    case 'tasks':
      if (typeof renderTasks === 'function') renderTasks(container);
      else renderOverview(container);
      break;
    case 'chat':             renderChat(container); break;
    case 'create':           renderCreate(container); break;
    case 'insights':         renderInsights(container); break;
    case 'insights-detail':
      // Sub-page of Insights. Falls back to the list if the pinned id
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
      // Existing report screens still expose global renderers. Kept as
      // full-screen inside the content area \u2014 same behavior as before.
      if (typeof window.renderReport === 'function') window.renderReport(container, view);
      else renderOverview(container);
      break;
    default:
      renderOverview(container);
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
