// ---------------------------------------------
// Clarity 2.0 — Concept header (two modes)
// ---------------------------------------------
//
// The header is a bridge between the two pages a concept has:
//
//   Chat page     — a focused conversation with Clara.
//   Workspace     — a focused dashboard with Overview / Today / Create /
//                   Results tabs.
//
// Chat mode header (single row, 44px):
//   [avatar] [name]  ...................  [Workspace \u2192]
//   The "Workspace" button only appears once Clara has finished
//   onboarding (there is nothing to open before then).
//
// Workspace mode header (two rows, 80px):
//   [\u2190 Chat]  [avatar] [name]  ..............  [meta]
//   -----------------------------------------------------
//   Overview   Today   Create   Results
//
// When Clara finishes onboarding, `window._justUnlockedConcept` is set to
// true by chat.js. On the next render we consume that flag and animate
// the Workspace button in with a subtle color-flush so the user notices
// their workspace has just been built.

const CH_WORKSPACE_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'today',    label: 'Today'    },
  { id: 'create',   label: 'Create'   },
  { id: 'results',  label: 'Results'  }
];

function _renderConceptHeader() {
  const c = getActiveConcept();
  if (!c) return '';

  const inWorkspace = appState.activeView !== 'chat';
  return inWorkspace ? _renderWorkspaceHeader(c) : _renderChatHeader(c);
}

function _renderChatHeader(c) {
  const b = c.business || {};
  const name = (b.name && b.name.trim()) || 'New concept';
  const color = c.color || '#F5A623';

  const canOpenWorkspace = !!(c.chat && c.chat.onboardingComplete);
  const justUnlocked = !!window._justUnlockedConcept;
  if (justUnlocked) window._justUnlockedConcept = false;

  const workspaceBtn = canOpenWorkspace
    ? (
        '<button type="button" class="ch-workspace-btn'
        +   (justUnlocked ? ' ch-workspace-btn-unlocking' : '')
        + '" id="chWorkspaceBtn">'
        +   '<span class="ch-workspace-btn-label">Workspace</span>'
        +   '<span class="ch-workspace-btn-arrow">\u2192</span>'
        + '</button>'
      )
    : '';

  return `
    <div class="ch-header ch-header-chat" style="--concept-color:${color}">
      <div class="ch-info-row">
        <div class="ch-info">
          <div class="ch-name">${_escape(name)}</div>
        </div>
        <div class="ch-spacer"></div>
        ${workspaceBtn}
      </div>
    </div>
  `;
}

function _renderWorkspaceHeader(c) {
  const b = c.business || {};
  const name = (b.name && b.name.trim()) || 'New concept';
  const color = c.color || '#F5A623';

  const typeLabel = (b.type && b.type !== 'other') ? _capitalize(b.type) : '';
  const reachLabel = b.reach === 'local' ? 'Local' : (b.reach === 'online' ? 'Online' : '');
  const meta = typeLabel ? [typeLabel, reachLabel].filter(Boolean).join(' \u00b7 ') : '';

  const currentView = appState.activeView;
  const tabsHtml = CH_WORKSPACE_TABS.map(function (t) {
    const isActive = t.id === currentView;
    return (
      '<button type="button" class="ch-tab' + (isActive ? ' ch-tab-active' : '') + '" data-view="' + t.id + '">'
      +   _escape(t.label)
      + '</button>'
    );
  }).join('');

  return `
    <div class="ch-header ch-header-workspace" style="--concept-color:${color}">
      <div class="ch-info-row">
        <button type="button" class="ch-back-btn" id="chBackBtn" aria-label="Back to chat">
          <span class="ch-back-arrow">\u2190</span>
          <span class="ch-back-label">Chat</span>
        </button>
        <div class="ch-info-divider"></div>
        <div class="ch-info">
          <div class="ch-name">${_escape(name)}</div>
        </div>
        <div class="ch-spacer"></div>
        ${meta ? '<div class="ch-meta">' + _escape(meta) + '</div>' : ''}
      </div>
      <nav class="ch-tabs" aria-label="Workspace views">
        ${tabsHtml}
      </nav>
    </div>
  `;
}

function _bindConceptHeaderEvents() {
  const workspaceBtn = document.getElementById('chWorkspaceBtn');
  if (workspaceBtn) {
    workspaceBtn.addEventListener('click', function () {
      const c = getActiveConcept();
      if (!c || !c.chat || !c.chat.onboardingComplete) return;
      const target = c.lastWorkspaceView || 'overview';
      setActiveView(target);
      renderApp();
    });
  }

  const backBtn = document.getElementById('chBackBtn');
  if (backBtn) {
    backBtn.addEventListener('click', function () {
      setActiveView('chat');
      renderApp();
    });
  }

  document.querySelectorAll('.ch-tab').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const next = btn.getAttribute('data-view');
      if (!next || next === appState.activeView) return;
      setActiveView(next);
      renderApp();
    });
  });
}

window._renderConceptHeader = _renderConceptHeader;
window._bindConceptHeaderEvents = _bindConceptHeaderEvents;
