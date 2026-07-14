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
// topbar. Notifications are hardcoded for now \u2014 no state, no
// dismissal, no persistence. When we plug this into real signals the
// data source can move behind a getNotifications() call without
// touching the render path.
//
// Open/close state is tracked module-locally on _chBellState and
// reset on every _renderConceptHeader() (renderApp() rebuilds the
// topbar innerHTML so any prior open state is dropped anyway).
const CH_NOTIFICATIONS = [
  {
    id: 'n1',
    icon: 'insight',
    title: 'New market insight',
    body: '62% of first sales now start from a single social post.',
    ago:  '2h ago'
  },
  {
    id: 'n2',
    icon: 'post',
    title: 'Your post went live',
    body: 'Your scheduled post published at its peak time.',
    ago:  '5h ago'
  },
  {
    id: 'n3',
    icon: 'spark',
    title: 'Clara refreshed your moves',
    body: '3 new highest-leverage moves are ready in Today.',
    ago:  '1d ago'
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

// Renders the entire bell-and-dropdown fragment. Sits inside the
// topbar's right slot on every view that uses .ch-topbar-right. The
// dropdown starts closed (aria-hidden="true", no open class) and is
// toggled by _bindConceptHeaderEvents wiring.
function _chRenderBell() {
  const count = CH_NOTIFICATIONS.length;

  const itemsHtml = CH_NOTIFICATIONS.map(function (n) {
    const iconSvg = CH_NOTIF_ICONS[n.icon] || CH_NOTIF_ICONS.insight;
    return (
      '<div class="ch-notif-item" role="menuitem" tabindex="0">'
      +   '<div class="ch-notif-icon ch-notif-icon-' + _escape(n.icon) + '" aria-hidden="true">' + iconSvg + '</div>'
      +   '<div class="ch-notif-body">'
      +     '<div class="ch-notif-item-title">' + _escape(n.title) + '</div>'
      +     '<div class="ch-notif-item-desc">'  + _escape(n.body)  + '</div>'
      +     '<div class="ch-notif-item-ago">'   + _escape(n.ago)   + '</div>'
      +   '</div>'
      + '</div>'
    );
  }).join('');

  return (
    '<div class="ch-notif-wrap">'
    +   '<button type="button" class="ch-bell" id="chBell" aria-label="Notifications" aria-haspopup="menu" aria-expanded="false">'
    +     '<span class="ch-bell-icon">' + CH_ICON_BELL + '</span>'
    +     (count > 0
        ? '<span class="ch-bell-badge" aria-label="' + count + ' unread notifications">' + count + '</span>'
        : '')
    +   '</button>'
    +   '<div class="ch-notif-panel" id="chNotifPanel" role="menu" aria-hidden="true" aria-labelledby="chBell">'
    +     '<div class="ch-notif-head">'
    +       '<div class="ch-notif-title">Notifications</div>'
    +       '<div class="ch-notif-count">' + count + ' new</div>'
    +     '</div>'
    +     '<div class="ch-notif-list">' + itemsHtml + '</div>'
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

  // Same bell fragment is injected into every topbar right slot below.
  // Computed once so all four render paths stay in sync.
  const bellHtml = _chRenderBell();

  // Concepts-list is a "root" sub-page, not scoped to a single concept.
  // Render just the page label, no concept prefix.
  if (view === 'concepts-list') {
    return `
      <header class="ch-topbar" role="banner">
        <div class="ch-topbar-inner">
          <div class="ch-crumbs">
            <span class="ch-crumb-page">${_escape(pageLabel)}</span>
          </div>
          <div class="ch-topbar-right">${bellHtml}</div>
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
          <div class="ch-topbar-right">${bellHtml}</div>
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
          <div class="ch-topbar-right">${bellHtml}</div>
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
          <div class="ch-topbar-right">${bellHtml}</div>
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
        <div class="ch-topbar-right">${bellHtml}</div>
      </div>
    </header>
  `;
}

// Module-level handlers for the bell dropdown. Kept out of the
// enclosing function so we can add and remove the same reference on
// every open/close cycle (anonymous handlers would leak).
let _chOutsideBellHandler = null;
let _chEscBellHandler = null;

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
  btn.setAttribute('aria-expanded', 'true');
  panel.classList.add('ch-notif-panel-open');
  panel.setAttribute('aria-hidden', 'false');

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

// Wire the clickable crumb / back links in the topbar. Kept as native
// buttons so they're keyboard-focusable without extra work.
function _bindConceptHeaderEvents() {
  // The topbar innerHTML was just rebuilt \u2014 any prior dropdown
  // handlers point at DOM that no longer exists. Reset them.
  _chOutsideBellHandler = null;
  _chEscBellHandler = null;

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
}

window._renderConceptHeader = _renderConceptHeader;
window._bindConceptHeaderEvents = _bindConceptHeaderEvents;
window.CH_VIEW_LABELS = CH_VIEW_LABELS;
