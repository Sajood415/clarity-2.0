// ---------------------------------------------
// Clarity 2.0 — Sidebar (concept list, Claude/GPT style)
// ---------------------------------------------
//
// One purpose: list the user's concepts. Nothing else. Clicking a concept
// makes it active and re-renders home. The per-concept navigation (Chat,
// Overview, Today, Create, Results) lives inside the concept header as a
// tab strip — that's where views belong, not here.
//
// Shape:
//   1. Brand
//   2. + New concept
//   3. CONCEPTS list — click to switch, hover reveals delete
//   4. User footer
//
// The sidebar is only mounted in home mode. Splash/auth/loading/welcome
// screens are chromeless.

const SB_ALLOWED_MODES = ['home'];

function _syncSidebar() {
  const shouldShow = SB_ALLOWED_MODES.indexOf(appState.mode) !== -1;
  const existing = document.getElementById('sbSidebar');

  // In workspace mode (activeView is anything other than 'chat') we
  // slide the sidebar off-screen and drop the content padding so the
  // workspace feels focused and full-width. The only way out is the
  // "\u2190 Chat" back link in the workspace header \u2014 which brings the
  // sidebar back on the next render.
  const workspaceMode = appState.mode === 'home' && appState.activeView && appState.activeView !== 'chat';
  document.body.classList.toggle('sb-workspace', workspaceMode);

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
  const rawEmail = (appState.user && appState.user.email) ? String(appState.user.email) : '';
  const displayName = rawName || 'Guest';
  const firstInitial = (rawName ? rawName.trim().charAt(0) : 'C').toUpperCase() || 'C';
  const subLine = rawEmail || (rawName ? 'Free plan' : 'Not signed in');

  const userFooter = `
    <div class="sb-bottom">
      <div class="sb-user-avatar">${_escape(firstInitial)}</div>
      <div class="sb-user-info">
        <div class="sb-user-name">${_escape(displayName)}</div>
        <div class="sb-user-sub">${_escape(subLine)}</div>
      </div>
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
          +   '<span class="sb-concept-name">' + _escape(name) + '</span>'
          +   (canDelete
                ? '<button type="button" class="sb-concept-delete" data-delete-concept="' + id + '" title="Delete concept" aria-label="Delete concept">' + SB_TRASH_ICON_SVG + '</button>'
                : '')
          + '</div>'
        );
      }).join('')
    : '<div class="sb-recent-empty">No concepts yet</div>';

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
