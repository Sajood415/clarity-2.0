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
  'chat':              'Chat',
  'create':            'Create',
  'insights':          'Insights',
  'concepts-list':     'Your concepts',
  'market-report':     'Market report',
  'customer-report':   'Customer report',
  'competition-report':'Competition report',
  'plan-report':       'Go-to-market plan'
};

function _renderConceptHeader() {
  const view = appState.activeView || 'overview';
  const pageLabel = CH_VIEW_LABELS[view] || _capitalize(view);

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

// No interactive controls in the top bar right now, but the router
// still calls this after every render so we keep the export shape stable.
function _bindConceptHeaderEvents() { /* intentionally empty */ }

window._renderConceptHeader = _renderConceptHeader;
window._bindConceptHeaderEvents = _bindConceptHeaderEvents;
window.CH_VIEW_LABELS = CH_VIEW_LABELS;
