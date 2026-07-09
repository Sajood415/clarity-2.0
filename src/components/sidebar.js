// ---------------------------------------------
// Clarity 2.0 — Unified Sidebar (workspace rail)
// ---------------------------------------------
//
// The sidebar is the same shape on every screen in home mode. It shows:
//   1. Brand
//   2. + New concept button
//   3. CONCEPTS list — click to switch
//   4. VIEWS list — Chat / Today / Create / Results (of active concept)
//   5. User footer
//
// Chat is a first-class view. Today/Create/Results are locked until the
// active concept has completed onboarding (chat.onboardingComplete = true).
//
// The sidebar is only mounted in home mode. Splash/auth/loading/welcome
// screens are chromeless.

const SB_ALLOWED_MODES = ['home'];

function _syncSidebar() {
  const shouldShow = SB_ALLOWED_MODES.indexOf(appState.mode) !== -1;
  const existing = document.getElementById('sbSidebar');

  if (shouldShow && !existing) {
    document.body.classList.add('sb-open');
    _mountSidebar(true);
  } else if (!shouldShow && existing) {
    existing.remove();
    document.body.classList.remove('sb-open');
  } else if (shouldShow && existing) {
    existing.innerHTML = _buildSidebarHtml();
    _bindSidebarEvents();
  }
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

  const userFooter = `
    <div class="sb-bottom">
      <div class="sb-user-avatar">${_escape(firstInitial)}</div>
      <div class="sb-user-name">${_escape(displayName)}</div>
      <button type="button" class="sb-settings-btn" id="sbSettingsBtn" title="Log out" aria-label="Log out">
        ${SB_LOGOUT_ICON_SVG}
      </button>
    </div>
  `;

  const conceptIds = Object.keys(appState.concepts).sort(function (a, b) {
    return (appState.concepts[a].createdAt || 0) - (appState.concepts[b].createdAt || 0);
  });

  const conceptsHtml = conceptIds.length
    ? conceptIds.map(function (id) {
        const c = appState.concepts[id];
        const active = id === appState.activeConceptId;
        const name = _resolveConceptName(c);
        const canDelete = conceptIds.length > 1;
        const color = c.color || '#F5A623';
        return (
          '<div class="sb-concept-row' + (active ? ' sb-concept-row-active' : '') + '" data-concept="' + id + '" style="--concept-color:' + color + '">'
          +   '<span class="sb-concept-dot"></span>'
          +   '<span class="sb-concept-name">' + _escape(name) + '</span>'
          +   (canDelete
                ? '<button type="button" class="sb-concept-delete" data-delete-concept="' + id + '" title="Delete concept" aria-label="Delete concept">' + SB_TRASH_ICON_SVG + '</button>'
                : '')
          + '</div>'
        );
      }).join('')
    : '<div class="sb-recent-empty">No concepts yet</div>';

  const activeConcept = getActiveConcept();
  const canUseViews = !!(activeConcept && activeConcept.chat.onboardingComplete);
  const currentView = appState.activeView || 'chat';

  const viewItems = [
    { id: 'chat',    label: 'Chat',    icon: VIEW_ICONS.chat,    alwaysOn: true },
    { id: 'today',   label: 'Today',   icon: VIEW_ICONS.today,   alwaysOn: false },
    { id: 'create',  label: 'Create',  icon: VIEW_ICONS.create,  alwaysOn: false },
    { id: 'results', label: 'Results', icon: VIEW_ICONS.results, alwaysOn: false }
  ];

  const viewsHtml = viewItems.map(function (v) {
    const enabled = v.alwaysOn || canUseViews;
    const active = v.id === currentView ? ' sb-view-active' : '';
    const disabled = !enabled ? ' sb-view-disabled' : '';
    return (
      '<button type="button" class="sb-view' + active + disabled + '" data-view="' + v.id + '"'
      + (!enabled ? ' disabled aria-disabled="true"' : '') + '>'
      +   '<span class="sb-view-icon">' + v.icon + '</span>'
      +   '<span class="sb-view-label">' + v.label + '</span>'
      + '</button>'
    );
  }).join('');

  return `
    <div class="sb-top">
      <div class="sb-brand">Clarity</div>
    </div>
    <button type="button" class="sb-new-concept" id="sbNewConceptBtn">
      <span class="sb-new-concept-icon">${SB_PLUS_ICON_SVG}</span>
      <span class="sb-new-concept-label">New concept</span>
    </button>
    <div class="sb-scroll">
      <div class="sb-section">
        <div class="sb-section-label">CONCEPTS</div>
        <div class="sb-concepts-list">${conceptsHtml}</div>
      </div>
      <div class="sb-section">
        <div class="sb-section-label">VIEWS</div>
        <div class="sb-views">${viewsHtml}</div>
      </div>
    </div>
    ${userFooter}
  `;
}

function _resolveConceptName(concept) {
  if (!concept) return 'New concept';
  const raw = String((concept.business && concept.business.name) || '').trim();
  if (raw.length < 2) return 'New concept';
  return raw;
}

function _bindSidebarEvents() {
  const settings = document.getElementById('sbSettingsBtn');
  if (settings) {
    settings.addEventListener('click', function () {
      if (typeof window.clarityReset === 'function') window.clarityReset();
    });
  }

  const newBtn = document.getElementById('sbNewConceptBtn');
  if (newBtn) {
    newBtn.addEventListener('click', function () {
      _openNewConceptModal();
    });
  }

  document.querySelectorAll('[data-concept]').forEach(function (row) {
    row.addEventListener('click', function (e) {
      if (e.target && e.target.closest && e.target.closest('[data-delete-concept]')) return;
      const id = row.getAttribute('data-concept');
      if (!id || id === appState.activeConceptId) return;
      switchConcept(id);
      renderApp();
    });
  });

  document.querySelectorAll('[data-delete-concept]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      const id = btn.getAttribute('data-delete-concept');
      if (!id) return;
      _deleteConcept(id);
    });
  });

  document.querySelectorAll('.sb-view').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (btn.hasAttribute('disabled')) return;
      const next = btn.getAttribute('data-view');
      if (!next || next === appState.activeView) return;
      setActiveView(next);
      renderApp();
    });
  });
}

function _deleteConcept(id) {
  if (!appState.concepts[id]) return;
  const ids = Object.keys(appState.concepts);
  if (ids.length <= 1) return; // never delete the last one

  const name = _resolveConceptName(appState.concepts[id]);
  const ok = window.confirm('Delete "' + name + '"? This removes its chat, tasks, drafts, and results.');
  if (!ok) return;

  delete appState.concepts[id];

  if (appState.activeConceptId === id) {
    const remaining = Object.keys(appState.concepts);
    appState.activeConceptId = remaining[0] || null;
    const next = getActiveConcept();
    if (next && !next.chat.onboardingComplete) {
      appState.activeView = 'chat';
    }
  }

  _saveState();
  renderApp();
}

window._syncSidebar = _syncSidebar;
window._buildSidebarHtml = _buildSidebarHtml;
window._resolveConceptName = _resolveConceptName;
