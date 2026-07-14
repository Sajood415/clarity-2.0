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
//     Today  Create  Results
//   \u2500\u2500
//   [avatar]  Name / email                 [logout]
//
// The nav is deliberately just three peers now: Today (dashboard
// landing), Create (compose flow), Results (published content +
// analytics, previously known as Insights). Chat, Insights (as a
// separate destination) and Overview all still exist as screens for
// safety fallbacks in the router, but no sidebar row navigates to
// them any more. The Chat screen is still fully functional \u2014 it just
// isn't in the primary rail.

const SB_ALLOWED_MODES = ['home'];

// Nav items in the order the spec calls out. `key` matches
// `appState.activeView`; `icon` pulls from VIEW_ICONS.
//
// NOTE: The 'results' key is the canonical destination for the
// published-content + analytics screen. The router also routes the
// legacy 'insights' key to the same screen so any deep-link or
// persisted state landing on 'insights' still works. The sidebar
// itself only ever emits 'results'.
const SB_NAV_ITEMS = [
  { key: 'today',   label: 'Today',   icon: 'today'   },
  { key: 'create',  label: 'Create',  icon: 'create'  },
  { key: 'results', label: 'Results', icon: 'results' }
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

  // Keep body class in sync with the persisted collapsed flag so the
  // content-area inset stays honest regardless of whether the sidebar
  // was mounted before this render.
  document.body.classList.toggle('sb-collapsed', !!appState.sidebarCollapsed);

  if (shouldShow && !existing) {
    document.body.classList.add('sb-open');
    _mountSidebar();
  } else if (!shouldShow && existing) {
    existing.remove();
    document.body.classList.remove('sb-open');
  } else if (shouldShow && existing) {
    _updateCollapsedClass(existing);
    existing.innerHTML = _buildSidebarHtml();
    _bindSidebarEvents();
  }
}

function _mountSidebar() {
  if (document.getElementById('sbSidebar')) return;
  const el = document.createElement('aside');
  el.id = 'sbSidebar';
  el.className = 'sb-sidebar sb-sidebar-open';
  _updateCollapsedClass(el);
  el.innerHTML = _buildSidebarHtml();
  document.body.appendChild(el);
  _bindSidebarEvents();
  _bindGlobalDropdownDismiss();
}

function _updateCollapsedClass(el) {
  if (!el) return;
  el.classList.toggle('sb-sidebar-collapsed', !!appState.sidebarCollapsed);
}

function _buildSidebarHtml() {
  const collapsed = !!appState.sidebarCollapsed;
  const active = getActiveConcept();
  // The concept picker dropdown is meaningless in the icon rail. If the
  // rail is toggled while it was open, treat it as closed for markup so
  // we don't leave a dangling dropdown floating off-canvas.
  const dropdownOpen = !collapsed && !!appState.conceptDropdownOpen;
  const activeName = active
    ? _resolveConceptName(active)
    : 'No concept';

  const collapseTitle = collapsed ? 'Expand sidebar' : 'Collapse sidebar';
  const collapseIcon = (typeof SB_COLLAPSE_ICON_SVG !== 'undefined') ? SB_COLLAPSE_ICON_SVG : '';
  const brandMark = (typeof SB_BRAND_MARK_SVG !== 'undefined') ? SB_BRAND_MARK_SVG : '';
  // Brand row: amber spark mark + "Clarity" wordmark. Collapsed rail
  // shows only the mark \u2014 it doubles as the app icon in that
  // width. Wordmark is hidden via CSS in the collapsed variant so we
  // don't need a separate markup branch.
  const topBar = `
    <div class="sb-top">
      <div class="sb-brand-wrap">
        <span class="sb-brand-mark" aria-hidden="true">${brandMark}</span>
        <span class="sb-brand">Clarity</span>
      </div>
      <button
        type="button"
        class="sb-collapse-btn"
        id="sbCollapseBtn"
        title="${collapseTitle}"
        aria-label="${collapseTitle}"
        aria-pressed="${collapsed ? 'true' : 'false'}"
      >${collapseIcon}</button>
    </div>
  `;

  // Initial letter for the concept avatar chip. Falls back to "C"
  // (Clarity) when the active concept has no readable name yet \u2014
  // avoids an empty circle while onboarding is still filling in
  // business.name.
  const conceptInitial = (activeName || 'C').trim().charAt(0).toUpperCase() || 'C';

  const conceptSection = collapsed
    ? _renderConceptRail(active)
    : `
      <div class="sb-concept-picker ${dropdownOpen ? 'sb-concept-picker-open' : ''}">
        <button type="button" class="sb-concept-trigger" id="sbConceptTrigger" aria-haspopup="listbox" aria-expanded="${dropdownOpen}">
          <span class="sb-concept-avatar" aria-hidden="true">${_escape(conceptInitial)}</span>
          <span class="sb-concept-trigger-name">${_escape(activeName)}</span>
          <span class="sb-concept-trigger-chev" aria-hidden="true">${SB_CHEVRON_DOWN_SVG}</span>
        </button>
        ${dropdownOpen ? _renderConceptDropdown(active) : ''}
      </div>
    `;

  const navHtml = _renderNavItems(collapsed);
  const userFooter = _renderUserFooter(collapsed);

  return `
    ${topBar}
    ${conceptSection}
    <div class="sb-nav-section">
      <nav class="sb-nav" aria-label="Primary">${navHtml}</nav>
    </div>
    <div class="sb-spacer"></div>
    ${userFooter}
  `;
}

// Compact concept chip used when the sidebar is collapsed. Clicking it
// expands the sidebar so the user can see the full picker.
function _renderConceptRail(active) {
  const color = (active && active.color) ? active.color : 'var(--accent)';
  const name = active ? _resolveConceptName(active) : 'No concept';
  const initial = (name || 'C').trim().charAt(0).toUpperCase() || 'C';
  return `
    <div class="sb-concept-rail">
      <button
        type="button"
        class="sb-concept-chip"
        id="sbConceptChip"
        title="${_escape(name)}"
        aria-label="${_escape(name)}"
        style="--concept-color:${color}"
      >
        <span class="sb-concept-chip-letter">${_escape(initial)}</span>
      </button>
    </div>
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

function _renderNavItems(collapsed) {
  const rawView = appState.activeView || 'today';
  // Sub-pages roll up to their parent nav item for highlight purposes
  // so the sidebar doesn't visually "lose" the active section when the
  // user drills into a detail view. Tasks is accessed from Today's
  // "Manage all tasks" link, so it inherits Today's highlight. The
  // legacy 'insights' and 'insights-detail' keys both roll up to
  // 'results' so any code path that still uses the old key still
  // highlights the correct tab.
  let activeView = rawView;
  if (activeView === 'insights-detail')   activeView = 'results';
  else if (activeView === 'insights')     activeView = 'results';
  else if (activeView === 'tasks')        activeView = 'today';

  return SB_NAV_ITEMS.map(function (item) {
    const isActive = activeView === item.key;
    const icon = (VIEW_ICONS && VIEW_ICONS[item.icon]) || '';
    // Native title attribute is our tooltip in collapsed mode so users
    // can still identify a rail icon without a label.
    const titleAttr = collapsed ? (' title="' + _escape(item.label) + '" aria-label="' + _escape(item.label) + '"') : '';
    return (
      '<button type="button" class="sb-nav-item' + (isActive ? ' sb-nav-item-active' : '') + '" data-nav="' + item.key + '"' + titleAttr + '>'
      +   '<span class="sb-nav-icon" aria-hidden="true">' + icon + '</span>'
      +   '<span class="sb-nav-label-text">' + _escape(item.label) + '</span>'
      + '</button>'
    );
  }).join('');
}

function _renderUserFooter(collapsed) {
  const rawName = (appState.user && appState.user.name) ? String(appState.user.name) : '';
  const rawEmail = (appState.user && appState.user.email) ? String(appState.user.email) : '';
  const displayName = rawName || 'Guest';
  const firstInitial = (rawName ? rawName.trim().charAt(0) : 'C').toUpperCase() || 'C';
  const subLine = rawEmail || (rawName ? 'Free plan' : 'Not signed in');

  // In collapsed mode we never surface the destructive confirm chip
  // (there's no room). Fall back to the icon button which uses the
  // same logout confirmation flow when clicked.
  const confirming = !collapsed && appState.confirmingLogout;

  const trailing = confirming
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

  const avatarTitle = collapsed ? (' title="' + _escape(displayName) + '"') : '';

  return `
    <div class="sb-bottom">
      <div class="sb-user-avatar"${avatarTitle}>${_escape(firstInitial)}</div>
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
  // --- Collapse toggle ---
  const collapseBtn = document.getElementById('sbCollapseBtn');
  if (collapseBtn) {
    collapseBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      appState.sidebarCollapsed = !appState.sidebarCollapsed;
      // Closing/opening the rail should never leave a stale dropdown on
      // screen; the picker markup only exists in the expanded layout.
      if (appState.sidebarCollapsed) appState.conceptDropdownOpen = false;
      _saveState();
      _syncSidebar();
    });
  }

  // --- Concept chip (collapsed rail) \u2014 expand and open picker ---
  const conceptChip = document.getElementById('sbConceptChip');
  if (conceptChip) {
    conceptChip.addEventListener('click', function (e) {
      e.stopPropagation();
      appState.sidebarCollapsed = false;
      appState.conceptDropdownOpen = true;
      _saveState();
      _syncSidebar();
    });
  }

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
      // Clear the unread badge BEFORE setActiveView so the sidebar's
      // subsequent re-render inside renderApp doesn't briefly flash the
      // old count. Idempotent via the state helper.
      if (next === 'chat' && typeof _claraClearUnread === 'function') {
        _claraClearUnread();
      }
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
