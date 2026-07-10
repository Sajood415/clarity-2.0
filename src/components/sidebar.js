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

  // Trailing slot swaps between the logout icon button (idle) and an
  // inline confirmation ("Yes, log out" / "Cancel") when the user has
  // clicked to log out. Since a full data wipe is irreversible we don't
  // want a single stray click to trigger it \u2014 the confirmation forces
  // a deliberate second click.
  const trailing = appState.confirmingLogout
    ? (
        '<div class="sb-logout-confirm" id="sbLogoutConfirm">'
        +   '<button type="button" class="sb-logout-yes" id="sbLogoutYes">Yes, log out</button>'
        +   '<button type="button" class="sb-logout-no" id="sbLogoutNo">Cancel</button>'
        + '</div>'
      )
    : (
        '<button type="button" class="sb-settings-btn" id="sbSettingsBtn" title="Log out" aria-label="Log out">'
        +   SB_LOGOUT_ICON_SVG
        + '</button>'
      );

  const userFooter = `
    <div class="sb-bottom">
      <div class="sb-user-avatar">${_escape(firstInitial)}</div>
      <div class="sb-user-info">
        <div class="sb-user-name">${_escape(displayName)}</div>
        <div class="sb-user-sub">${_escape(subLine)}</div>
      </div>
      ${trailing}
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
      _confirmLogout();
    });
  }

  const yesBtn = document.getElementById('sbLogoutYes');
  if (yesBtn) {
    yesBtn.addEventListener('click', function () {
      if (typeof window.clarityLogout === 'function') window.clarityLogout();
      else if (typeof window.clarityReset === 'function') window.clarityReset();
    });
  }

  const noBtn = document.getElementById('sbLogoutNo');
  if (noBtn) {
    noBtn.addEventListener('click', function () {
      appState.confirmingLogout = false;
      _syncSidebar();
    });
  }

  const newBtn = document.getElementById('sbNewConceptBtn');
  if (newBtn) {
    newBtn.addEventListener('click', function () {
      // Block spawning a second concept while the current one is still
      // being onboarded \u2014 otherwise the sidebar fills with half-set-up
      // shells and the user has no obvious next step.
      if (_hasIncompleteConcept()) {
        _showSidebarToast('Finish setting up your current concept first.');
        return;
      }
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

// Flip the sidebar into "are you sure?" mode. Not persisted \u2014 mutating
// `appState.confirmingLogout` without a `_saveState()` keeps the flag
// out of localStorage, and `_normalizeState()` forces it back to false
// on load anyway.
function _confirmLogout() {
  appState.confirmingLogout = !appState.confirmingLogout;
  _syncSidebar();
}

function _hasIncompleteConcept() {
  const ids = Object.keys(appState.concepts || {});
  for (let i = 0; i < ids.length; i++) {
    const c = appState.concepts[ids[i]];
    if (c && c.chat && c.chat.onboardingComplete === false) return true;
  }
  return false;
}

// Inline toast pinned to the top of the sidebar rail. Deliberately
// transient (2.5s) and self-dismissing \u2014 no state, no ceremony.
// A second click while one is already visible replaces it so the
// counter resets instead of stacking timers.
function _showSidebarToast(msg) {
  const host = document.getElementById('sbSidebar');
  if (!host) return;

  const existing = host.querySelector('.sb-toast');
  if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

  const toast = document.createElement('div');
  toast.className = 'sb-toast';
  toast.textContent = msg;
  host.appendChild(toast);

  // Kick the entrance animation on the next frame so the class-add sticks.
  requestAnimationFrame(function () {
    toast.classList.add('sb-toast-visible');
  });

  setTimeout(function () {
    toast.classList.remove('sb-toast-visible');
    setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 200);
  }, 2500);
}

window._syncSidebar = _syncSidebar;
window._buildSidebarHtml = _buildSidebarHtml;
window._resolveConceptName = _resolveConceptName;
window._confirmLogout = _confirmLogout;
