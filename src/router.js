// ---------------------------------------------
// Clarity 2.0 — Router
// ---------------------------------------------
//
// One entry function: `renderApp()`. It looks at `appState.mode` and hands
// off to the appropriate screen renderer. For `home` mode it renders the
// content shell + delegates to the active view (chat / today / create /
// results). The sidebar is (un)mounted here as a side effect.

function renderApp() {
  const root = document.getElementById('app');
  if (!root) return;

  document.body.style.background = '#0F0D0B';

  // Keep the sidebar rail visible whenever we're in home mode. All other
  // modes (splash/auth/loading/welcome) are chromeless.
  if (appState.mode === 'home' && !appState.sidebarOpen) {
    appState.sidebarOpen = true;
    _saveState();
  }

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
    case 'home':
      _renderHome(root);
      break;
    default:
      root.innerHTML = '';
      break;
  }
}

function _renderHome(root) {
  root.innerHTML = `
    <div class="hm-shell">
      ${_renderConceptHeader()}
      <div id="homeContent" class="hm-content"></div>
    </div>
  `;
  _bindConceptHeaderEvents();
  const container = document.getElementById('homeContent');
  _renderActiveView(container);
}

function _renderActiveView(container) {
  const active = getActiveConcept();

  // No active concept means we're a brand-new user pre-modal. The welcome
  // screen has already opened the mandatory "New concept" dialog on top;
  // render a soft placeholder underneath so the shell isn't visually empty.
  if (!active) {
    container.innerHTML = '<div class="hm-empty"><div class="hm-empty-inner">Name your first concept to get started.</div></div>';
    return;
  }

  // Guardrail: if the active concept isn't done with onboarding, force
  // Chat view. The sidebar disables Overview/Today/Create/Results in that
  // state; this is the belt-and-braces server-side check.
  if (!active.chat.onboardingComplete && appState.activeView !== 'chat') {
    appState.activeView = 'chat';
    _saveState();
  }

  switch (appState.activeView) {
    case 'chat':
      renderChat(container);
      break;
    case 'overview':
      renderOverview(container);
      break;
    case 'today':
      renderToday(container);
      break;
    case 'create':
      renderCreate(container);
      break;
    case 'results':
      renderResults(container);
      break;
    default:
      renderOverview(container);
      break;
  }
}

window.renderApp = renderApp;
