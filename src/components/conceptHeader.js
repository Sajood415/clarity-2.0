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

  // Concepts-list is a "root" sub-page, not scoped to a single concept.
  // Render just the page label, no concept prefix.
  if (view === 'concepts-list') {
    return `
      <header class="ch-topbar" role="banner">
        <div class="ch-topbar-inner">
          <div class="ch-crumbs">
            <span class="ch-crumb-page">${_escape(pageLabel)}</span>
          </div>
          <div class="ch-topbar-right"></div>
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
          <div class="ch-topbar-right"></div>
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
          <div class="ch-topbar-right"></div>
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
          <div class="ch-topbar-right"></div>
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
        <div class="ch-topbar-right"></div>
      </div>
    </header>
  `;
}

// Wire the clickable crumb / back links in the topbar. Kept as native
// buttons so they're keyboard-focusable without extra work.
function _bindConceptHeaderEvents() {
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
}

window._renderConceptHeader = _renderConceptHeader;
window._bindConceptHeaderEvents = _bindConceptHeaderEvents;
window.CH_VIEW_LABELS = CH_VIEW_LABELS;
