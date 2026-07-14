// ---------------------------------------------
// Clarity 2.0 — Top Bar (dashboard shell)
// ---------------------------------------------
//
// Slim 48px bar that sits above the main content area. Two-part
// breadcrumb on the left \u2014 concept name (muted) then the current page
// label (bold) \u2014 nothing on the right for now (theme toggle deferred).
//
// This file was previously the Chat/Workspace concept-header component
// with a Workspace \u2192 button and a full workspace tab strip. Both went
// away in the dashboard restructure: primary nav lives in the sidebar
// now, and Chat is just a peer nav item. The filename is kept so the
// existing `_renderConceptHeader` / `_bindConceptHeaderEvents` hooks
// used by the router keep working without a rewire.

// ---------------------------------------------
// Notification bell (mock)
// ---------------------------------------------
//
// Small dropdown-with-badge that lives in the top-right slot of the
// topbar. This array is the SEED data \u2014 state.js copies it into
// `appState.notifications` on first-ever load and every entry there
// carries a `read` flag that gets flipped true the moment the user
// opens the panel. All rendering below reads live from
// appState.notifications so the badge/copy stay in sync with
// persistence, not this constant.
//
// Field names (desc/time) match the canonical schema in state.js so
// the seed \u2192 store \u2192 render pipeline uses one shape throughout.
const CH_NOTIFICATIONS = [
  {
    id: 'n1',
    icon: 'insight',
    title: 'New market insight',
    desc: '62% of first sales now start from a single social post.',
    time: '2h ago'
  },
  {
    id: 'n2',
    icon: 'post',
    title: 'Your post went live',
    desc: 'Your scheduled post published at its peak time.',
    time: '5h ago'
  },
  {
    id: 'n3',
    icon: 'spark',
    title: 'Clara refreshed your moves',
    desc: '3 new highest-leverage moves are ready in Today.',
    time: '1d ago'
  }
];

// Bell button glyph. 20x20, currentColor stroke so it inherits the
// muted button color and picks up amber on hover / active.
const CH_ICON_BELL =
  '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
  + '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>'
  + '<path d="M13.73 21a2 2 0 0 1-3.46 0"/>'
  + '</svg>';

// One 16x16 glyph per notification "category". Kept small and
// monochrome so the tinted background circle carries the color
// semantics (amber for insights, green for posts, blue for sparks).
const CH_NOTIF_ICONS = {
  insight:
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    + '<polyline points="3 17 9 11 13 15 21 6"/>'
    + '<polyline points="15 6 21 6 21 12"/>'
    + '</svg>',
  post:
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    + '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>'
    + '<polyline points="22 4 12 14.01 9 11.01"/>'
    + '</svg>',
  spark:
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    + '<path d="M12 2v6M12 16v6M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>'
    + '<circle cx="12" cy="12" r="3.5"/>'
    + '</svg>'
};

// Live read of the persisted notification array. Falls back to the
// seed if state.js hasn't populated appState.notifications yet (only
// happens in the narrow window between script-parse and the
// DOMContentLoaded normaliser \u2014 no user-visible impact).
function _chGetNotifications() {
  if (Array.isArray(appState.notifications) && appState.notifications.length > 0) {
    return appState.notifications;
  }
  return CH_NOTIFICATIONS;
}

function _chUnreadCount() {
  const list = _chGetNotifications();
  let n = 0;
  for (let i = 0; i < list.length; i++) {
    if (list[i] && !list[i].read) n++;
  }
  return n;
}

// Copy label shown in the panel header. "3 new" reads as fresh
// activity; "All caught up" is the empty state after the user has
// marked everything read (or on any subsequent visit with no
// backlog).
function _chCountLabel(unread) {
  return unread > 0 ? (unread + ' new') : 'All caught up';
}

// Renders the entire bell-and-dropdown fragment. Sits inside the
// topbar's right slot on every view that uses .ch-topbar-right. The
// dropdown starts closed (aria-hidden="true", no open class) and is
// toggled by _bindConceptHeaderEvents wiring.
function _chRenderBell() {
  const list = _chGetNotifications();
  const unread = _chUnreadCount();

  const itemsHtml = list.map(function (n) {
    const iconSvg = CH_NOTIF_ICONS[n.icon] || CH_NOTIF_ICONS.insight;
    const readClass = n.read ? ' ch-notif-item-read' : '';
    return (
      '<div class="ch-notif-item' + readClass + '" role="menuitem" tabindex="0" data-notif-id="' + _escape(n.id) + '">'
      +   '<div class="ch-notif-icon ch-notif-icon-' + _escape(n.icon) + '" aria-hidden="true">' + iconSvg + '</div>'
      +   '<div class="ch-notif-body">'
      +     '<div class="ch-notif-item-title">' + _escape(n.title) + '</div>'
      +     '<div class="ch-notif-item-desc">'  + _escape(n.desc)  + '</div>'
      +     '<div class="ch-notif-item-ago">'   + _escape(n.time)  + '</div>'
      +   '</div>'
      + '</div>'
    );
  }).join('');

  // Badge is omitted entirely when unread === 0 so the bell reads as
  // "quiet" rather than "0". aria-label only matters when the badge
  // is present.
  const badgeHtml = unread > 0
    ? '<span class="ch-bell-badge" aria-label="' + unread + ' unread notifications">' + unread + '</span>'
    : '';

  return (
    '<div class="ch-notif-wrap">'
    +   '<button type="button" class="ch-bell" id="chBell" aria-label="Notifications" aria-haspopup="menu" aria-expanded="false">'
    +     '<span class="ch-bell-icon">' + CH_ICON_BELL + '</span>'
    +     badgeHtml
    +   '</button>'
    +   '<div class="ch-notif-panel" id="chNotifPanel" role="menu" aria-hidden="true" aria-labelledby="chBell">'
    +     '<div class="ch-notif-head">'
    +       '<div class="ch-notif-title">Notifications</div>'
    +       '<div class="ch-notif-count">' + _escape(_chCountLabel(unread)) + '</div>'
    +     '</div>'
    +     '<div class="ch-notif-list">' + itemsHtml + '</div>'
    +   '</div>'
    + '</div>'
  );
}

// Mark every notification read + persist + refresh visible bell UI.
// Called by _chOpenBell right after the panel becomes visible so the
// badge disappears and items fade to the read-state opacity as soon
// as the user has "seen" them.
function _chMarkAllRead() {
  if (!Array.isArray(appState.notifications)) return;
  let changed = false;
  for (let i = 0; i < appState.notifications.length; i++) {
    const n = appState.notifications[i];
    if (n && !n.read) { n.read = true; changed = true; }
  }
  if (!changed) return;
  if (typeof _saveState === 'function') _saveState();
  _chRefreshBellUI();
}

// Surgical DOM update after mark-all-read. Full topbar re-render
// would tear down the just-opened panel; instead we mutate the badge,
// the "N new" label, and each row's read class in place \u2014 the CSS
// opacity transition on .ch-notif-item does the visual fade.
function _chRefreshBellUI() {
  const bellBtn = document.getElementById('chBell');
  const unread  = _chUnreadCount();
  if (bellBtn) {
    const oldBadge = bellBtn.querySelector('.ch-bell-badge');
    if (oldBadge) oldBadge.remove();
    if (unread > 0) {
      const badge = document.createElement('span');
      badge.className = 'ch-bell-badge';
      badge.setAttribute('aria-label', unread + ' unread notifications');
      badge.textContent = String(unread);
      bellBtn.appendChild(badge);
    }
  }
  const countEl = document.querySelector('#chNotifPanel .ch-notif-count');
  if (countEl) countEl.textContent = _chCountLabel(unread);
  const items = document.querySelectorAll('#chNotifPanel .ch-notif-item');
  items.forEach(function (el) {
    const id = el.getAttribute('data-notif-id');
    if (!id) return;
    const n = appState.notifications.find(function (x) { return x && x.id === id; });
    if (n && n.read) el.classList.add('ch-notif-item-read');
    else el.classList.remove('ch-notif-item-read');
  });
}

// ---------------------------------------------
// "More" dropdown (shortcut menu)
// ---------------------------------------------
//
// Utility launcher next to the bell. Small menu of shortcut
// destinations that don't warrant permanent sidebar slots. Same
// dark-dropdown treatment as the bell but narrower (200px), with
// button-style rows instead of notification cards.
//
// Each entry's `target` is passed straight to setActiveView() on
// click and does NOT include any preprocessing \u2014 the target must
// be a legitimate router key. If a target is unroutable it's
// dropped at render time so the menu never surfaces dead links.

// Bare "reports" is not a real view; the reports.js entry point is
// report-market. Users navigating here land on Market Scan (same
// place the overview cards send them). If reports.js ever ships a
// bare "reports" hub, swap this string.
const CH_MORE_ITEMS = [
  {
    id: 'daily-insights',
    label: 'Daily Insights',
    target: 'today',
    icon:
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
      + '<path d="M9 18h6"/><path d="M10 22h4"/>'
      + '<path d="M12 2a7 7 0 0 0-4 12.7c.6.6 1 1.5 1 2.3v1h6v-1c0-.8.4-1.7 1-2.3A7 7 0 0 0 12 2z"/>'
      + '</svg>'
  },
  {
    id: 'strategic-reports',
    label: 'Strategic Reports',
    target: 'report-market',
    icon:
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
      + '<rect x="3" y="3" width="18" height="18" rx="2"/>'
      + '<line x1="7" y1="16" x2="7" y2="11"/>'
      + '<line x1="12" y1="16" x2="12" y2="8"/>'
      + '<line x1="17" y1="16" x2="17" y2="13"/>'
      + '</svg>'
  },
  {
    id: 'all-concepts',
    label: 'All Concepts',
    target: 'concepts-list',
    icon:
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
      + '<path d="M12 2l9 5-9 5-9-5 9-5z"/>'
      + '<polyline points="3 12 12 17 21 12"/>'
      + '<polyline points="3 17 12 22 21 17"/>'
      + '</svg>'
  }
];

// Horizontal-dots icon on the trigger button. Fill=currentColor so
// hover/active states pick up amber like the bell.
const CH_ICON_MORE =
  '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">'
  + '<circle cx="5" cy="12" r="1.8"/>'
  + '<circle cx="12" cy="12" r="1.8"/>'
  + '<circle cx="19" cy="12" r="1.8"/>'
  + '</svg>';

function _chRenderMore() {
  // Drop any items whose target isn't currently routable so the menu
  // never surfaces a dead-end nav. `setActiveView` accepts every key
  // in CH_VIEW_LABELS plus a few internal ones \u2014 we approximate the
  // check via the label map (adequate for the current set of shortcut
  // targets; if new targets don't have labels, add them there first).
  const visible = CH_MORE_ITEMS.filter(function (it) {
    return Object.prototype.hasOwnProperty.call(CH_VIEW_LABELS, it.target);
  });
  if (visible.length === 0) return '';

  const itemsHtml = visible.map(function (it) {
    return (
      '<button type="button" class="ch-more-item" role="menuitem" data-target="' + _escape(it.target) + '">'
      +   '<span class="ch-more-item-icon" aria-hidden="true">' + it.icon + '</span>'
      +   '<span class="ch-more-item-label">' + _escape(it.label) + '</span>'
      + '</button>'
    );
  }).join('');

  return (
    '<div class="ch-more-wrap">'
    +   '<button type="button" class="ch-more-btn" id="chMore" aria-label="More" aria-haspopup="menu" aria-expanded="false" title="More">'
    +     '<span class="ch-more-btn-icon">' + CH_ICON_MORE + '</span>'
    +   '</button>'
    +   '<div class="ch-more-panel" id="chMorePanel" role="menu" aria-hidden="true" aria-labelledby="chMore">'
    +     itemsHtml
    +   '</div>'
    + '</div>'
  );
}

// Human-readable label for every top-level `activeView`. Report views
// use their concept's card title (Market / Customer / Competition /
// Plan) so the breadcrumb reads sensibly when a report is open.
const CH_VIEW_LABELS = {
  'overview':          'Overview',
  'today':             'Today',
  'tasks':             'Tasks',
  'chat':              'Chat',
  'create':            'Create',
  // 'results' is the canonical key; 'insights' is the legacy alias
  // that routes to the same screen. Both must map to the same label
  // so the topbar reads consistently regardless of which key set the
  // view.
  'results':           'Results',
  'insights':          'Results',
  'insights-detail':   'Results',
  'concepts-list':     'Your concepts',
  'market-report':     'Market report',
  'customer-report':   'Customer report',
  'competition-report':'Competition report',
  'plan-report':       'Go-to-market plan',
  // v2 report labels \u2014 shown by the reports.js topbar (report.js
  // reads these too when it wants a canonical title).
  'report-market':     'Market Scan',
  'report-customer':   'Customer Intelligence',
  'report-competition':'Competition',
  'report-plan':       'Your Plan'
};

// Truncate a longer content body to something that fits in the top
// bar as the terminal crumb on the Results detail page. Kept short
// so the breadcrumb never wraps the 48px topbar.
function _chTruncate(str, max) {
  const s = String(str || '').trim();
  if (s.length <= max) return s;
  return s.slice(0, max).replace(/\s+\S*$/, '').trim() + '\u2026';
}

function _chInsightsDetailTitle() {
  const c = getActiveConcept();
  const items = (c && c.results && Array.isArray(c.results.items)) ? c.results.items : [];
  const id = appState.insightsDetailId;
  const item = id ? items.find(function (i) { return i && i.id === id; }) : null;
  if (!item) return 'Content';
  const raw = (item.angle && item.angle.trim()) || item.variation || 'Content';
  return _chTruncate(raw, 48);
}

function _renderConceptHeader() {
  const view = appState.activeView || 'today';
  const pageLabel = CH_VIEW_LABELS[view] || _capitalize(view);

  // v2 report views own their own report topbar (the "\u2190 Overview |
  // Report title | View all" strip in reports.js). Skip the concept
  // header entirely so a single 48px topbar sits at the top of the
  // content area, not two stacked ones.
  if (view === 'report-market' || view === 'report-customer'
      || view === 'report-competition' || view === 'report-plan') {
    return '';
  }

  // Same bell + more fragments are injected into every topbar right
  // slot below. Computed once so all four render paths stay in sync.
  const bellHtml = _chRenderBell();
  const moreHtml = _chRenderMore();

  // Concepts-list is a "root" sub-page, not scoped to a single concept.
  // Render just the page label, no concept prefix.
  if (view === 'concepts-list') {
    return `
      <header class="ch-topbar" role="banner">
        <div class="ch-topbar-inner">
          <div class="ch-crumbs">
            <span class="ch-crumb-page">${_escape(pageLabel)}</span>
          </div>
          <div class="ch-topbar-right">${bellHtml}${moreHtml}</div>
        </div>
      </header>
    `;
  }

  const c = getActiveConcept();
  if (!c) {
    // Onboarding overlay is up on top of us; the shell renders without
    // a concept badge until the first concept is committed.
    return `
      <header class="ch-topbar" role="banner">
        <div class="ch-topbar-inner">
          <div class="ch-crumbs">
            <span class="ch-crumb-page">${_escape(pageLabel)}</span>
          </div>
          <div class="ch-topbar-right">${bellHtml}${moreHtml}</div>
        </div>
      </header>
    `;
  }

  const b = c.business || {};
  const conceptName = (b.name && b.name.trim()) || 'New concept';

  // Results detail sub-page gets a 3-part crumb where the middle
  // segment (Results) is clickable and takes the user back to the
  // list view. Terminal segment is a preview of the item's angle.
  if (view === 'insights-detail') {
    const itemTitle = _chInsightsDetailTitle();
    return `
      <header class="ch-topbar" role="banner">
        <div class="ch-topbar-inner">
          <div class="ch-crumbs">
            <span class="ch-crumb-concept">${_escape(conceptName)}</span>
            <span class="ch-crumb-sep" aria-hidden="true">/</span>
            <button type="button" class="ch-crumb-link" id="chCrumbInsights">Results</button>
            <span class="ch-crumb-sep" aria-hidden="true">/</span>
            <span class="ch-crumb-page">${_escape(itemTitle)}</span>
          </div>
          <div class="ch-topbar-right">${bellHtml}${moreHtml}</div>
        </div>
      </header>
    `;
  }

  // Tasks is a Today sub-page (reached via "Manage all tasks \u2192").
  // Left of the topbar swaps the usual concept crumb for a "\u2190 Today"
  // back link followed by the "Tasks" page label \u2014 clear parent + page.
  if (view === 'tasks') {
    return `
      <header class="ch-topbar" role="banner">
        <div class="ch-topbar-inner">
          <div class="ch-crumbs">
            <button type="button" class="ch-back-link" id="chBackToday" aria-label="Back to Today">
              <span class="ch-back-arrow" aria-hidden="true">\u2190</span>
              <span>Today</span>
            </button>
            <span class="ch-crumb-sep" aria-hidden="true">/</span>
            <span class="ch-crumb-page">${_escape(pageLabel)}</span>
          </div>
          <div class="ch-topbar-right">${bellHtml}${moreHtml}</div>
        </div>
      </header>
    `;
  }

  return `
    <header class="ch-topbar" role="banner">
      <div class="ch-topbar-inner">
        <div class="ch-crumbs">
          <span class="ch-crumb-concept">${_escape(conceptName)}</span>
          <span class="ch-crumb-sep" aria-hidden="true">/</span>
          <span class="ch-crumb-page">${_escape(pageLabel)}</span>
        </div>
        <div class="ch-topbar-right">${bellHtml}${moreHtml}</div>
      </div>
    </header>
  `;
}

// Module-level handlers for the bell and more dropdowns. Kept out of
// the enclosing function so we can add and remove the same reference
// on every open/close cycle (anonymous handlers would leak).
let _chOutsideBellHandler = null;
let _chEscBellHandler = null;
let _chOutsideMoreHandler = null;
let _chEscMoreHandler = null;

function _chCloseBell() {
  const btn   = document.getElementById('chBell');
  const panel = document.getElementById('chNotifPanel');
  if (btn)   btn.setAttribute('aria-expanded', 'false');
  if (panel) {
    panel.classList.remove('ch-notif-panel-open');
    panel.setAttribute('aria-hidden', 'true');
  }
  if (_chOutsideBellHandler) {
    document.removeEventListener('mousedown', _chOutsideBellHandler, true);
    _chOutsideBellHandler = null;
  }
  if (_chEscBellHandler) {
    document.removeEventListener('keydown', _chEscBellHandler);
    _chEscBellHandler = null;
  }
}

function _chOpenBell() {
  const btn   = document.getElementById('chBell');
  const panel = document.getElementById('chNotifPanel');
  if (!btn || !panel) return;
  // Only one dropdown open at a time \u2014 close the sibling first so
  // the two panels never render side-by-side on top of each other.
  _chCloseMore();
  btn.setAttribute('aria-expanded', 'true');
  panel.classList.add('ch-notif-panel-open');
  panel.setAttribute('aria-hidden', 'false');

  // Mark everything read the moment the panel becomes visible. Runs
  // AFTER the panel is added to the DOM so the read-class fade
  // transitions from the freshly-rendered unread state (full opacity)
  // to the read state (60% opacity) rather than starting muted.
  _chMarkAllRead();

  // Outside-click closes the panel. Fires on mousedown (capture)
  // so a click that also opens something else still gets the
  // close-first behavior. Uses .closest so clicks inside a nested
  // .ch-notif-item still count as "inside".
  _chOutsideBellHandler = function (e) {
    const wrap = document.querySelector('.ch-notif-wrap');
    if (!wrap) return;
    if (wrap.contains(e.target)) return;
    _chCloseBell();
  };
  document.addEventListener('mousedown', _chOutsideBellHandler, true);

  // Escape closes and returns focus to the bell so keyboard users
  // aren't stranded.
  _chEscBellHandler = function (e) {
    if (e.key !== 'Escape') return;
    _chCloseBell();
    const bb = document.getElementById('chBell');
    if (bb) bb.focus();
  };
  document.addEventListener('keydown', _chEscBellHandler);
}

function _chCloseMore() {
  const btn   = document.getElementById('chMore');
  const panel = document.getElementById('chMorePanel');
  if (btn)   btn.setAttribute('aria-expanded', 'false');
  if (panel) {
    panel.classList.remove('ch-more-panel-open');
    panel.setAttribute('aria-hidden', 'true');
  }
  if (_chOutsideMoreHandler) {
    document.removeEventListener('mousedown', _chOutsideMoreHandler, true);
    _chOutsideMoreHandler = null;
  }
  if (_chEscMoreHandler) {
    document.removeEventListener('keydown', _chEscMoreHandler);
    _chEscMoreHandler = null;
  }
}

function _chOpenMore() {
  const btn   = document.getElementById('chMore');
  const panel = document.getElementById('chMorePanel');
  if (!btn || !panel) return;
  // Sibling dropdown must close first \u2014 same rule as _chOpenBell.
  _chCloseBell();
  btn.setAttribute('aria-expanded', 'true');
  panel.classList.add('ch-more-panel-open');
  panel.setAttribute('aria-hidden', 'false');

  _chOutsideMoreHandler = function (e) {
    const wrap = document.querySelector('.ch-more-wrap');
    if (!wrap) return;
    if (wrap.contains(e.target)) return;
    _chCloseMore();
  };
  document.addEventListener('mousedown', _chOutsideMoreHandler, true);

  _chEscMoreHandler = function (e) {
    if (e.key !== 'Escape') return;
    _chCloseMore();
    const mm = document.getElementById('chMore');
    if (mm) mm.focus();
  };
  document.addEventListener('keydown', _chEscMoreHandler);
}

// Wire the clickable crumb / back links in the topbar. Kept as native
// buttons so they're keyboard-focusable without extra work.
function _bindConceptHeaderEvents() {
  // The topbar innerHTML was just rebuilt \u2014 any prior dropdown
  // handlers point at DOM that no longer exists. Reset them.
  _chOutsideBellHandler = null;
  _chEscBellHandler = null;
  _chOutsideMoreHandler = null;
  _chEscMoreHandler = null;

  // Element id is left as 'chCrumbInsights' (git-blame continuity);
  // the crumb text and navigation target are both 'Results'.
  const backCrumb = document.getElementById('chCrumbInsights');
  if (backCrumb) {
    backCrumb.addEventListener('click', function () {
      setActiveView('results');
      renderApp();
    });
  }
  const backToday = document.getElementById('chBackToday');
  if (backToday) {
    backToday.addEventListener('click', function () {
      setActiveView('today');
      renderApp();
    });
  }

  // Notification bell toggle. Reads aria-expanded off the button so
  // the source of truth is DOM state, not a shadow variable that
  // could drift when the topbar re-renders.
  const bellBtn = document.getElementById('chBell');
  if (bellBtn) {
    bellBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      const isOpen = bellBtn.getAttribute('aria-expanded') === 'true';
      if (isOpen) _chCloseBell();
      else _chOpenBell();
    });
  }

  // "More" dropdown \u2014 same toggle contract as the bell.
  const moreBtn = document.getElementById('chMore');
  if (moreBtn) {
    moreBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      const isOpen = moreBtn.getAttribute('aria-expanded') === 'true';
      if (isOpen) _chCloseMore();
      else _chOpenMore();
    });
  }

  // Individual menu items in the More dropdown. Each row carries its
  // router key on data-target; we close the panel, dispatch the view
  // change, and re-render. Full renderApp() rebuild means the topbar
  // and its dropdowns come back cleanly \u2014 no in-place patching.
  document.querySelectorAll('.ch-more-item[data-target]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      const target = btn.getAttribute('data-target');
      _chCloseMore();
      if (!target) return;
      setActiveView(target);
      renderApp();
    });
  });
}

window._renderConceptHeader = _renderConceptHeader;
window._bindConceptHeaderEvents = _bindConceptHeaderEvents;
window.CH_VIEW_LABELS = CH_VIEW_LABELS;
// Exposed so state.js can seed appState.notifications from the same
// source on first load. Read-only \u2014 do not mutate this array from
// callers; mutate appState.notifications instead.
window.CH_NOTIFICATIONS = CH_NOTIFICATIONS;
