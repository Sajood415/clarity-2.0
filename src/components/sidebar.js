// ---------------------------------------------
// Clarity 2.0 — Dashboard Sidebar (Atlas-style)
// ---------------------------------------------
//
// Fixed 240px rail on the left of the main content. Structure:
//
//   Clarity                 <- logo
//   [Concept name  \u25be]     <- concept picker (opens dropdown)
//     \u2514 dropdown (when open):
//         all concepts (name + type per row, amber bar on active)
//         + New concept
//         View all concepts
//   NAVIGATION
//     Overview  Today  Chat  Create  Insights
//   \u2500\u2500
//   [avatar]  Name / email                 [logout]
//
// The old Chat vs Workspace split is gone. Nav items are all peers.
// Sidebar is always visible when in home mode \u2014 no more slide-off
// during "workspace mode".

const SB_ALLOWED_MODES = ['home'];

// Nav items in the order the spec calls out. `key` matches
// `appState.activeView`; `icon` pulls from VIEW_ICONS.
const SB_NAV_ITEMS = [
  { key: 'overview', label: 'Overview', icon: 'overview' },
  { key: 'today',    label: 'Today',    icon: 'today'    },
  { key: 'chat',     label: 'Chat',     icon: 'chat'     },
  { key: 'create',   label: 'Create',   icon: 'create'   },
  { key: 'insights', label: 'Insights', icon: 'insights' }
];

// Machine-key \u2192 human label for the concept-type line under each row.
// Keeps the dropdown quiet when the type is unknown / 'other'.
const SB_TYPE_LABELS = {
  small:     'Small business',
  ecommerce: 'Online store',
  service:   'Service business',
  tech:      'SaaS / tech',
  creator:   'Personal brand',
  agency:    'Agency',
  nonprofit: 'Nonprofit',
  other:     ''
};

function _syncSidebar() {
  const shouldShow = SB_ALLOWED_MODES.indexOf(appState.mode) !== -1;
  const existing = document.getElementById('sbSidebar');

  // New shell: sidebar stays visible for every nav view. There's no
  // more workspace-mode slide-off. Body classes track only "sidebar
  // is mounted" and (transient) dropdown-open state.
  document.body.classList.toggle('sb-workspace', false);

  if (shouldShow && !existing) {
    document.body.classList.add('sb-open');
    _mountSidebar();
  } else if (!shouldShow && existing) {
    existing.remove();
    document.body.classList.remove('sb-open');
  } else if (shouldShow && existing) {
    existing.innerHTML = _buildSidebarHtml();
    _bindSidebarEvents();
  }
}

function _mountSidebar() {
  if (document.getElementById('sbSidebar')) return;
  const el = document.createElement('aside');
  el.id = 'sbSidebar';
  el.className = 'sb-sidebar sb-sidebar-open';
  el.innerHTML = _buildSidebarHtml();
  document.body.appendChild(el);
  _bindSidebarEvents();
  _bindGlobalDropdownDismiss();
}

function _buildSidebarHtml() {
  const active = getActiveConcept();
  const dropdownOpen = !!appState.conceptDropdownOpen;
  const activeName = active
    ? _resolveConceptName(active)
    : 'No concept';

  const conceptSection = `
    <div class="sb-concept-picker ${dropdownOpen ? 'sb-concept-picker-open' : ''}">
      <button type="button" class="sb-concept-trigger" id="sbConceptTrigger" aria-haspopup="listbox" aria-expanded="${dropdownOpen}">
        <span class="sb-concept-trigger-name">${_escape(activeName)}</span>
        <span class="sb-concept-trigger-chev" aria-hidden="true">${SB_CHEVRON_DOWN_SVG}</span>
      </button>
      ${dropdownOpen ? _renderConceptDropdown(active) : ''}
    </div>
  `;

  const navHtml = _renderNavItems();
  const userFooter = _renderUserFooter();

  return `
    <div class="sb-top">
      <div class="sb-brand">Clarity</div>
    </div>
    ${conceptSection}
    <div class="sb-nav-section">
      <div class="sb-nav-label">NAVIGATION</div>
      <nav class="sb-nav" aria-label="Primary">${navHtml}</nav>
    </div>
    <div class="sb-spacer"></div>
    ${userFooter}
  `;
}

function _renderConceptDropdown(active) {
  const activeId = active ? active.id : null;
  const conceptIds = Object.keys(appState.concepts).sort(function (a, b) {
    return (appState.concepts[a].createdAt || 0) - (appState.concepts[b].createdAt || 0);
  });

  const rowsHtml = conceptIds.length
    ? conceptIds.map(function (id) {
        const c = appState.concepts[id];
        const isActive = id === activeId;
        const color = c.color || 'var(--accent)';
        const name = _resolveConceptName(c);
        const type = (c.business && c.business.type) ? SB_TYPE_LABELS[c.business.type] || '' : '';
        return (
          '<button type="button" class="sb-cp-row' + (isActive ? ' sb-cp-row-active' : '') + '" data-concept="' + _escape(id) + '" style="--concept-color:' + color + '">'
          +   '<div class="sb-cp-row-name">' + _escape(name) + '</div>'
          +   (type ? '<div class="sb-cp-row-type">' + _escape(type) + '</div>' : '')
          + '</button>'
        );
      }).join('')
    : '<div class="sb-cp-empty">No concepts yet</div>';

  return `
    <div class="sb-cp-dropdown" role="listbox">
      <div class="sb-cp-list">${rowsHtml}</div>
      <div class="sb-cp-divider" aria-hidden="true"></div>
      <button type="button" class="sb-cp-action sb-cp-action-primary" id="sbCpNew">
        <span class="sb-cp-action-glyph" aria-hidden="true">+</span>
        <span>New concept</span>
      </button>
      <button type="button" class="sb-cp-action sb-cp-action-muted" id="sbCpAll">
        View all concepts
      </button>
    </div>
  `;
}

function _renderNavItems() {
  const activeView = appState.activeView || 'overview';
  return SB_NAV_ITEMS.map(function (item) {
    const isActive = activeView === item.key;
    const icon = (VIEW_ICONS && VIEW_ICONS[item.icon]) || '';
    return (
      '<button type="button" class="sb-nav-item' + (isActive ? ' sb-nav-item-active' : '') + '" data-nav="' + item.key + '">'
      +   '<span class="sb-nav-icon" aria-hidden="true">' + icon + '</span>'
      +   '<span class="sb-nav-label-text">' + _escape(item.label) + '</span>'
      + '</button>'
    );
  }).join('');
}

function _renderUserFooter() {
  const rawName = (appState.user && appState.user.name) ? String(appState.user.name) : '';
  const rawEmail = (appState.user && appState.user.email) ? String(appState.user.email) : '';
  const displayName = rawName || 'Guest';
  const firstInitial = (rawName ? rawName.trim().charAt(0) : 'C').toUpperCase() || 'C';
  const subLine = rawEmail || (rawName ? 'Free plan' : 'Not signed in');

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

  return `
    <div class="sb-bottom">
      <div class="sb-user-avatar">${_escape(firstInitial)}</div>
      <div class="sb-user-info">
        <div class="sb-user-name">${_escape(displayName)}</div>
        <div class="sb-user-sub">${_escape(subLine)}</div>
      </div>
      ${trailing}
    </div>
  `;
}

function _resolveConceptName(concept) {
  if (!concept) return 'New concept';
  const raw = String((concept.business && concept.business.name) || '').trim();
  if (raw.length < 2) return 'New concept';
  return raw;
}

// ---------------------------------------------
// Event wiring
// ---------------------------------------------

function _bindSidebarEvents() {
  // --- Concept picker trigger ---
  const trigger = document.getElementById('sbConceptTrigger');
  if (trigger) {
    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      appState.conceptDropdownOpen = !appState.conceptDropdownOpen;
      _syncSidebar();
    });
  }

  // --- Concept picker rows ---
  document.querySelectorAll('.sb-cp-row').forEach(function (row) {
    row.addEventListener('click', function (e) {
      e.stopPropagation();
      const id = row.getAttribute('data-concept');
      if (!id) return;
      // Clicking the CURRENTLY active concept is a no-op per spec \u2014
      // just close the dropdown, don't navigate.
      if (id === appState.activeConceptId) {
        appState.conceptDropdownOpen = false;
        _syncSidebar();
        return;
      }
      switchConcept(id);
      renderApp();
    });
  });

  // --- + New concept ---
  const newBtn = document.getElementById('sbCpNew');
  if (newBtn) {
    newBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (_hasIncompleteConcept()) {
        appState.conceptDropdownOpen = false;
        _syncSidebar();
        _showSidebarToast('Finish setting up your current concept first.');
        return;
      }
      appState.conceptDropdownOpen = false;
      createConcept({});
      renderApp();
    });
  }

  // --- View all concepts ---
  const allBtn = document.getElementById('sbCpAll');
  if (allBtn) {
    allBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      appState.conceptDropdownOpen = false;
      setActiveView('concepts-list');
      renderApp();
    });
  }

  // --- Primary nav ---
  document.querySelectorAll('.sb-nav-item').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const next = btn.getAttribute('data-nav');
      if (!next) return;
      if (next === appState.activeView) return;
      // Guard: don't let the user navigate away mid-onboarding.
      const c = getActiveConcept();
      if (c && c.chat && !c.chat.onboardingComplete) return;
      setActiveView(next);
      renderApp();
    });
  });

  // --- Footer: logout controls ---
  const settings = document.getElementById('sbSettingsBtn');
  if (settings) settings.addEventListener('click', _confirmLogout);
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
}

// Close the concept dropdown when the user clicks outside of it. Bound
// once (via a guard flag) on first mount so re-renders don't stack
// listeners. `capture:true` so we run before per-element handlers.
function _bindGlobalDropdownDismiss() {
  if (window._sbDropdownDismissBound) return;
  window._sbDropdownDismissBound = true;
  document.addEventListener('click', function (e) {
    if (!appState.conceptDropdownOpen) return;
    const picker = document.querySelector('.sb-concept-picker');
    if (picker && picker.contains(e.target)) return;
    appState.conceptDropdownOpen = false;
    _syncSidebar();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (!appState.conceptDropdownOpen) return;
    appState.conceptDropdownOpen = false;
    _syncSidebar();
  });
}

// ---------------------------------------------
// Small helpers (mostly unchanged from the old sidebar)
// ---------------------------------------------

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

function _showSidebarToast(msg) {
  const host = document.getElementById('sbSidebar');
  if (!host) return;
  const existing = host.querySelector('.sb-toast');
  if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
  const toast = document.createElement('div');
  toast.className = 'sb-toast';
  toast.textContent = msg;
  host.appendChild(toast);
  requestAnimationFrame(function () { toast.classList.add('sb-toast-visible'); });
  setTimeout(function () {
    toast.classList.remove('sb-toast-visible');
    setTimeout(function () { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 200);
  }, 2500);
}

window._syncSidebar = _syncSidebar;
window._buildSidebarHtml = _buildSidebarHtml;
window._resolveConceptName = _resolveConceptName;
window._confirmLogout = _confirmLogout;
window.SB_TYPE_LABELS = SB_TYPE_LABELS;
