// ---------------------------------------------
// Clarity 2.0 — Today View
// ---------------------------------------------
//
// List-only surface: flat full-width rows separated by 1px
// borders, each with a 3px accent bar down the left edge
// colour-coded by task type (POST / OUTREACH / OFFER).
//
// A kanban board used to live inline on this screen. It was
// removed because it duplicated the full Tasks workspace
// without adding any Today-specific value. The single entry
// point to the board is now the board-icon button in the
// header top-right, which routes to the Tasks screen via
// setActiveView('tasks').
//
// Task content and copy come from `_todayTasks()` unchanged. On
// first render for a concept, the generated tasks are seeded
// into `concept.today.tasks` with `status: 'todo'` and persisted
// so any user-driven status changes (list status-circle cycles,
// status-pill clicks) survive across renders, tab switches, and
// reloads.

// ---------------------------------------------
// Icons
// ---------------------------------------------

const TD_CHECK_ICON = ''
  + '<svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'
  +   '<path d="M1.5 5 L4 7.5 L8.5 3"/>'
  + '</svg>';

// Small clock glyph used in the ticket-style card's footer to prefix
// the time estimate. Same visual weight as the other 12-px accent
// icons on the Today screen so the row reads as a family.
const TD_CLOCK_ICON = ''
  + '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" '
  +   'stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
  +   '<circle cx="6" cy="6" r="4.5"/>'
  +   '<path d="M6 3.5 V6 L7.6 7.2"/>'
  + '</svg>';

// Chevron used on the "Why this?" toggle. Rotates 180deg via CSS when
// the reason panel is open (see .td-row-why-chevron).
const TD_WHY_CHEVRON_ICON = ''
  + '<svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" '
  +   'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
  +   '<path d="M2.5 3.75 L5 6.25 L7.5 3.75"/>'
  + '</svg>';

// Small \u00d7 glyph rendered inside the row's hover-reveal discard button.
// Sized to match TD_CLOCK_ICON so the icon set on a row reads at one
// visual weight. Uses currentColor so hover states drive the tint.
const TD_DISCARD_ICON = ''
  + '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" '
  +   'stroke-width="1.6" stroke-linecap="round" aria-hidden="true">'
  +   '<path d="M3 3 L9 9 M9 3 L3 9"/>'
  + '</svg>';

// Chat-bubble glyph shown on a task row when task.thread.length > 0.
// Rendered inside .td-row-thread-count \u2014 count number sits to the
// right of the bubble at 12px muted. Same 12px viewBox size as the
// discard icon so both actions read at one visual weight, but the
// bubble uses stroke instead of fill for a lighter, muted feel.
const TD_THREAD_ICON = ''
  + '<svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" '
  +   'stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
  +   '<path d="M2.5 3.5 h9 a1 1 0 0 1 1 1 v4.5 a1 1 0 0 1 -1 1 h-4 l-2.5 2 v-2 h-2.5 a1 1 0 0 1 -1 -1 v-4.5 a1 1 0 0 1 1 -1 z"/>'
  + '</svg>';

// Arrow glyph used inside the thread's send button. Amber via
// currentColor. Same viewBox conventions as TD_DISCARD_ICON so
// they sit at the same optical weight in the input row.
const TD_SEND_ICON = ''
  + '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" '
  +   'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
  +   '<path d="M3 7 L11 7 M7.5 3 L11.5 7 L7.5 11"/>'
  + '</svg>';

// Status-cycling checkbox icons used in the list view.
//   todo        \u2014 empty circle (muted)
//   in_progress \u2014 half-filled amber
//   done        \u2014 filled teal with white check
// currentColor drives the border + fill so a single CSS variable per
// state controls the palette; see .td-status-btn rules in today.css.

const TD_STATUS_ICON_TODO = ''
  + '<svg width="16" height="16" viewBox="0 0 16 16" fill="none">'
  +   '<circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.6"/>'
  + '</svg>';

const TD_STATUS_ICON_IN_PROGRESS = ''
  + '<svg width="16" height="16" viewBox="0 0 16 16" fill="none">'
  +   '<circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.6"/>'
  +   '<path d="M8 2 A6 6 0 0 1 8 14 Z" fill="currentColor"/>'
  + '</svg>';

const TD_STATUS_ICON_DONE = ''
  + '<svg width="16" height="16" viewBox="0 0 16 16">'
  +   '<circle cx="8" cy="8" r="7" fill="currentColor"/>'
  +   '<path d="M4.6 8.2 L7 10.4 L11.4 5.6" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'
  + '</svg>';

// ---------------------------------------------
// Public entry
// ---------------------------------------------

function renderToday(container) {
  const c = getActiveConcept();
  if (!c) return;

  // Defensive: if a legacy Daily Insight drawer is still mounted from
  // a previous render (e.g. concept switch mid-drawer, or state that
  // predates the drawer-\u2192-page rewrite), tear it down so it doesn't
  // linger on top of the new render's content. The drawer opener is
  // gone but the teardown stays as a safety net for one session.
  _closeTdInsightDrawer();

  // Close any leftover calendar dropdowns from a previous render
  // (e.g. concept switch with a dropdown open on the outgoing
  // screen). Cheap no-op when no dropdowns are open.
  if (window._dateNavigator && typeof window._dateNavigator.closeAllDropdowns === 'function') {
    window._dateNavigator.closeAllDropdowns();
  }

  _seedTodayTasks(c);
  // Mirror the live Today task array into `taskHistory[today]` on
  // every render so the archive is always the "as I left it just
  // now" copy. Once the calendar day rolls over, we stop writing
  // to that entry and it freezes as the historical record of that
  // day. Runs BEFORE we choose which pool to render so the archive
  // is fresh even if the user immediately navigates to today's ISO
  // (no double-render needed).
  _snapshotTodayTasks(c);
  // Ensure today's insights are populated before we decide whether to
  // render the card. Idempotent \u2014 the seeder bails cleanly if
  // today.insights[0].date already matches the current calendar day.
  if (typeof window._seedTodayInsightsIfMissing === 'function') {
    try { window._seedTodayInsightsIfMissing(c); } catch (err) {
      console.error('Daily insights seed failed on Today render:', err);
    }
  }

  // Sub-view routing. Insight detail wins over task detail if both
  // ids are set (an edge case reachable only via state edit \u2014 the
  // click handlers always clear the sibling id before setting their
  // own). Each branch falls through cleanly if the id no longer
  // resolves so we never render an empty detail shell.
  if (c.today && c.today.viewingInsightId) {
    const list = Array.isArray(c.today.insights) ? c.today.insights : [];
    const insight = list.find(function (i) { return i && i.id === c.today.viewingInsightId; });
    if (insight) {
      _renderTdInsightDetail(container, insight, c);
      return;
    }
    c.today.viewingInsightId = null;
    _saveState();
  }
  if (c.today && c.today.viewingTaskId) {
    const task = c.today.tasks.find(function (t) { return t.id === c.today.viewingTaskId; });
    if (task) {
      _renderTdDetail(container, task, c);
      return;
    }
    c.today.viewingTaskId = null;
    _saveState();
  }

  // Insight card sits between the greeting/heading and the task list
  // when it hasn't been dismissed for the day AND we actually have
  // insights to render. Otherwise the whole block collapses to zero
  // height and the tasks slide up as if nothing was there.
  const showInsights = _shouldRenderInsights(c);
  const insightMarkup = showInsights ? _renderTdInsightCard(c.today.insights[0]) : '';

  // Header top-right icon cluster: three quiet icon buttons that
  // form the view-switching surface for the task workspace. On
  // the Today screen the LIST icon is always the active pick
  // (Today IS the list view for the AI-curated daily set); the
  // kanban and calendar icons ship the user into the full Tasks
  // workspace with `tasks.view` pre-stamped so the destination
  // renders in the requested mode.
  //
  //   tdOpenList     \u2014 active on Today. Click re-renders the
  //                    list (no-op if unchanged). Icon: 3 rows.
  //   tdOpenKanban   \u2014 stamps tasks.view = 'board' then
  //                    setActiveView('tasks'). Icon: 2x2 grid.
  //   tdOpenCalendar \u2014 stamps tasks.view = 'calendar' then
  //                    setActiveView('tasks'). Icon: cal frame.
  //
  // Icons are inlined here + on the tasks screen so both surfaces
  // render the SAME SVG source, which keeps the trio recognisable
  // regardless of which screen you're currently on.
  const listGlyph = _tdViewIconList();
  const kanbanGlyph = _tdViewIconKanban();
  const calendarGlyph = _tdViewIconCalendar();

  container.innerHTML = `
    <section class="td-wrap">
      <div class="td-top">
        <div class="td-top-text">
          <div class="td-greeting">${_greeting()}</div>
          <h1 class="td-heading">Here\u2019s what Clara thinks you should focus on today.</h1>
        </div>
        <div class="td-header-actions">
          <button
            type="button"
            class="td-open-board td-open-board-active"
            id="tdOpenList"
            aria-label="List view (current)"
            aria-pressed="true"
            title="List view"
          >${listGlyph}</button>
          <button
            type="button"
            class="td-open-board"
            id="tdOpenKanban"
            aria-label="Open kanban view"
            aria-pressed="false"
            title="Kanban view"
          >${kanbanGlyph}</button>
          <button
            type="button"
            class="td-open-board"
            id="tdOpenCalendar"
            aria-label="Open calendar view"
            aria-pressed="false"
            title="Calendar view"
          >${calendarGlyph}</button>
        </div>
      </div>
      <div class="td-datebar-host" id="tdDateBarHost"></div>
      ${insightMarkup}
      <div id="tdBody"></div>
      <div class="td-footer-note">Clara updates these every day based on what\u2019s working.</div>
    </section>
  `;

  _bindTdOpenBoard(container);
  if (showInsights) _bindTdInsightCard(container, c);

  // Mount the shared date navigator between the heading + view-
  // toggle row and the insight card. Any date change re-renders
  // the Today screen top-to-bottom via _rerenderToday so the
  // task list, filter bar, empty state, and read-only mode all
  // stay in sync with the newly-selected date.
  const dateBarHost = container.querySelector('#tdDateBarHost');
  if (dateBarHost && window._dateNavigator && typeof window._dateNavigator.mount === 'function') {
    window._dateNavigator.mount(dateBarHost, {
      screen: 'today',
      hasTasksForDate: function (iso) { return _tdHasTasksOnDate(c, iso); },
      onChange: function () { _rerenderToday(); }
    });
  }

  const body = container.querySelector('#tdBody');
  _renderTdList(body, c);
}

// ---------------------------------------------
// Shared view-toggle glyphs
// ---------------------------------------------
//
// Exposed via window so the Tasks screen can reuse the exact
// same SVGs on its topbar toggle \u2014 that keeps the trio's
// visual identity consistent across the Today \u2194 Tasks
// navigation. Each glyph renders at 16\u00d716 with currentColor,
// so palette + hover state are driven purely by the parent
// button's CSS.

function _tdViewIconList() {
  return ''
    + '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" '
    +   'stroke-width="1.6" stroke-linecap="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'
    +   '<path d="M2 4 H14 M2 8 H14 M2 12 H14"/>'
    + '</svg>';
}

function _tdViewIconKanban() {
  return ''
    + '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" '
    +   'stroke-width="1.6" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'
    +   '<rect x="1.25" y="1.25"  width="5.5" height="6"  rx="1"/>'
    +   '<rect x="9.25" y="1.25"  width="5.5" height="3.5" rx="1"/>'
    +   '<rect x="1.25" y="8.75"  width="5.5" height="6"  rx="1"/>'
    +   '<rect x="9.25" y="6.25"  width="5.5" height="8.5" rx="1"/>'
    + '</svg>';
}

function _tdViewIconCalendar() {
  return ''
    + '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" '
    +   'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" '
    +   'xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'
    +   '<rect x="1.75" y="3" width="12.5" height="11" rx="1.5"/>'
    +   '<path d="M1.75 6.75 H14.25"/>'
    +   '<path d="M5 1.5 V4.25 M11 1.5 V4.25"/>'
    + '</svg>';
}

// Exposed to the Tasks screen so its topbar renders the same
// glyphs without duplicating the SVG source in another file.
if (typeof window !== 'undefined') {
  window._tdViewIconList = _tdViewIconList;
  window._tdViewIconKanban = _tdViewIconKanban;
  window._tdViewIconCalendar = _tdViewIconCalendar;
}

// ---------------------------------------------
// Daily insight card + full-page detail sub-view
// ---------------------------------------------
//
// The card mounts above the task list on the main Today view (not on
// the task-detail sub-view). Clicking anywhere on the card body sets
// `concept.today.viewingInsightId` and re-renders \u2014 Today swaps into
// a dedicated full-page insight detail sub-view (see
// _renderTdInsightDetail below). The previous drawer/modal treatment
// was retired because it stacked over the dashboard chrome and hid
// the sidebar; the full-page view sits inside the same content area
// as the task-detail sub-view so navigation stays consistent.
//
// "Skip for today \u2192" dismisses just for the current calendar day;
// next day the card reappears with fresh insights via the seeder in
// clara/insights.js.

// Right-arrow SVG used as the hover affordance on the card. Matches
// the muted \u2192 glyph style used elsewhere in the today view.
const TD_INSIGHT_ARROW_SVG = ''
  + '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" '
  +   'stroke="currentColor" stroke-width="1.5" stroke-linecap="round" '
  +   'stroke-linejoin="round">'
  +   '<path d="M2.5 7 H11 M7.5 3.5 L11 7 L7.5 10.5"/>'
  + '</svg>';

// True when we should surface the insight card on this render: the
// concept has today's insights populated, and the user hasn't skipped
// it yet for the current calendar day. Also short-circuits gracefully
// if the insights module never loaded (defensive).
function _shouldRenderInsights(c) {
  if (!c || !c.today) return false;
  if (!Array.isArray(c.today.insights) || c.today.insights.length === 0) return false;
  if (typeof window._insightsDismissedToday === 'function'
      && window._insightsDismissedToday(c)) return false;
  return true;
}

function _renderTdInsightCard(insight) {
  if (!insight) return '';
  return ''
    + '<div class="td-insight-card" id="tdInsightCard" role="button" tabindex="0"'
    +   ' aria-label="Read today\u2019s Daily Insight">'
    +   '<div class="td-insight-card-inner">'
    +     '<div class="td-insight-eyebrow">'
    +       '<span class="td-insight-kicker">DAILY INSIGHT</span>'
    +       '<span class="td-insight-arrow" aria-hidden="true">' + TD_INSIGHT_ARROW_SVG + '</span>'
    +     '</div>'
    +     '<h2 class="td-insight-headline">' + _escape(insight.headline || '') + '</h2>'
    +     '<p class="td-insight-stat">' + _escape(insight.stat || '') + '</p>'
    +     '<div class="td-insight-footer">'
    +       '<button type="button" class="td-insight-skip" id="tdInsightSkip">Skip for today \u2192</button>'
    +       '<span class="td-insight-source" aria-hidden="true">' + _escape(insight.source || '') + '</span>'
    +     '</div>'
    +   '</div>'
    + '</div>';
}

// Binds card-open, skip-for-today, and keyboard-activation handlers.
// Skip is an inline text button; clicks on it must NOT bubble up to
// the card and navigate to the detail page.
function _bindTdInsightCard(scope, c) {
  const card = scope.querySelector('#tdInsightCard');
  const skip = scope.querySelector('#tdInsightSkip');
  if (!card) return;

  const openDetail = function () {
    _openTdInsightDetail(c);
  };

  card.addEventListener('click', openDetail);
  card.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openDetail();
    }
  });

  if (skip) {
    skip.addEventListener('click', function (e) {
      e.stopPropagation();
      if (typeof window._dismissTodayInsights === 'function') {
        window._dismissTodayInsights(c);
      }
      _rerenderToday();
    });
  }
}

// Navigate to the full-page insight detail. Mirrors _openTaskDetail:
// pin the id on state, persist, re-render Today. renderToday's routing
// at the top of the function picks up viewingInsightId and dispatches
// to _renderTdInsightDetail. Also marks the insight seen the first
// time it's opened (idempotent via the helper).
function _openTdInsightDetail(c) {
  if (!c || !c.today) return;
  const list = Array.isArray(c.today.insights) ? c.today.insights : [];
  const insight = list[0];
  if (!insight) return;
  if (typeof window._markInsightSeen === 'function') {
    try { window._markInsightSeen(c, insight.id); } catch (_err) { /* ignore */ }
  }
  // Clear any sibling task-detail pointer so we don't stack two
  // detail sub-views in state at the same time.
  c.today.viewingTaskId = null;
  c.today.viewingInsightId = insight.id;
  _saveState();
  _rerenderToday();
}

function _closeTdInsightDetail() {
  const c = getActiveConcept();
  if (!c || !c.today) return;
  c.today.viewingInsightId = null;
  _saveState();
  _rerenderToday();
}

// Defensive no-op left behind after the drawer \u2192 full-page rewrite.
// Called at the top of renderToday to sweep away any lingering DOM
// from a session that predates the rewrite. Safe to keep for one
// migration cycle; can be removed once no browsers hold stale DOM.
function _closeTdInsightDrawer() {
  const existing = document.getElementById('tdInsightDrawer');
  if (!existing) return;
  if (existing.__tdKeyHandler) {
    document.removeEventListener('keydown', existing.__tdKeyHandler);
    existing.__tdKeyHandler = null;
  }
  if (existing.parentNode) existing.parentNode.removeChild(existing);
}

// Full-page insight detail sub-view. Rendered inside the same content
// area as the Today list / task-detail sub-view; the sidebar stays
// visible and the concept header shows the "Today" crumb (the detail
// is a Today sub-page, not a top-level route).
//
// Layout (max-width matches td-wrap-detail so both sub-views share a
// column):
//
//   \u2190 Back to Today
//
//   DAILY INSIGHT                                (amber kicker)
//   Big serif headline
//   Stat body copy
//   [SOURCE BADGE]
//   \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
//   WHAT THIS MEANS FOR YOU
//     \u2022 bullet 1
//     \u2022 bullet 2
//     \u2022 bullet 3
function _renderTdInsightDetail(container, insight, c) {
  const bullets = Array.isArray(insight.bullets) ? insight.bullets : [];
  const bulletsHtml = bullets.map(function (b) {
    return ''
      + '<li class="td-insight-page-bullet">'
      +   '<span class="td-insight-page-bullet-dot" aria-hidden="true"></span>'
      +   '<span class="td-insight-page-bullet-text">' + _escape(b) + '</span>'
      + '</li>';
  }).join('');

  container.innerHTML = ''
    + '<section class="td-wrap td-insight-page">'
    +   '<button type="button" class="td-insight-page-back" id="tdInsightBack" aria-label="Back to Today">'
    +     '\u2190 Back to Today'
    +   '</button>'
    +   '<div class="td-insight-page-kicker">DAILY INSIGHT</div>'
    +   '<h1 class="td-insight-page-headline">' + _escape(insight.headline || '') + '</h1>'
    +   '<p class="td-insight-page-stat">' + _escape(insight.stat || '') + '</p>'
    +   '<div class="td-insight-page-source">' + _escape(insight.source || '') + '</div>'
    +   '<div class="td-insight-page-divider" aria-hidden="true"></div>'
    +   '<div class="td-insight-page-bullets-label">What this means for you</div>'
    +   '<ul class="td-insight-page-bullets">' + bulletsHtml + '</ul>'
    + '</section>';

  const backBtn = container.querySelector('#tdInsightBack');
  if (backBtn) backBtn.addEventListener('click', _closeTdInsightDetail);
}

// ---------------------------------------------
// List-view status filter
// ---------------------------------------------
//
// Purely session-local: the filter resets to 'all' on every
// page reload (no persistence to concept state or localStorage).
// This is intentional \u2014 the filter is a lightweight scan tool,
// not a preference the user should have to un-set later.
//
// The Today screen is list-only, so the filter also applies at
// exactly one surface (the row list) \u2014 no view-conditional
// gating needed.
//
// Values are the exact status strings from state (`todo`,
// `in_progress`, `done`) plus `all` for the pass-through case.
// Anything else (bad querystring, corrupted module state) falls
// back to 'all' via _tdListFilterCurrent().

const TD_LIST_FILTERS = ['all', 'todo', 'in_progress', 'done'];
let _tdListFilter = 'all';

function _tdListFilterCurrent() {
  return TD_LIST_FILTERS.indexOf(_tdListFilter) !== -1 ? _tdListFilter : 'all';
}

function _tdListFilterSet(next) {
  const clean = TD_LIST_FILTERS.indexOf(next) !== -1 ? next : 'all';
  if (clean === _tdListFilter) return false;
  _tdListFilter = clean;
  return true;
}

// Label shown on the filter pill. Human-readable, matches the
// row's status-pill copy so the two surfaces feel connected.
function _tdListFilterLabel(key) {
  if (key === 'todo')        return 'To Do';
  if (key === 'in_progress') return 'In Progress';
  if (key === 'done')        return 'Done';
  return 'All';
}

// Mirror the current `concept.today.tasks` array into
// `concept.today.taskHistory[today]` on every Today render. This
// is the entire archive mechanism \u2014 no cron, no rollover
// bookkeeping, just a write-through cache keyed by local-time
// ISO. Once the calendar day changes the next Today render
// writes to a NEW key, so the previous day's entry is naturally
// frozen at whatever state the list held on the last render of
// that day. Snapshots deep-clone the array so future mutations
// to `concept.today.tasks` don't retroactively edit the archive.
function _snapshotTodayTasks(c) {
  if (!c || !c.today) return;
  if (!c.today.taskHistory || typeof c.today.taskHistory !== 'object') {
    c.today.taskHistory = {};
  }
  if (!Array.isArray(c.today.tasks)) return;
  const iso = (window._dateNavigator && typeof window._dateNavigator.todayIso === 'function')
    ? window._dateNavigator.todayIso()
    : _tdLocalTodayIso();
  // JSON deep-clone is fine here: task objects only contain
  // primitives, arrays, and plain objects (no functions, no DOM).
  // Cheaper than structuredClone in older browsers.
  try {
    c.today.taskHistory[iso] = JSON.parse(JSON.stringify(c.today.tasks));
    if (typeof window._saveState === 'function') window._saveState();
  } catch (err) {
    console.error('Today snapshot failed:', err);
  }
}

// Local YYYY-MM-DD fallback for environments where the shared
// dateNavigator module hasn't loaded yet (edge case during
// script boot). Same format as the module's todayIso.
function _tdLocalTodayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

// Which date is the Today screen currently rendering? Reads
// through the shared cursor on `concept.today.viewedDate`.
// A null / missing value means "today's live list".
function _tdViewedDate(c) {
  const nav = window._dateNavigator;
  if (nav && typeof nav.readViewedDate === 'function') return nav.readViewedDate();
  // Fallback if module didn't load: just return today.
  return _tdLocalTodayIso();
}

// True when the user is browsing an archived day. In this
// mode the row renderer strips all interactive affordances
// (status circle click, status pill click, discard button,
// row click-to-detail) so the past is legible but frozen.
function _tdIsPastView(c) {
  return _tdViewedDate(c) !== _tdLocalTodayIso();
}

// Pick the correct task pool for the currently-viewed date.
// Today \u2192 live `concept.today.tasks`. Past \u2192 archived snapshot
// from `concept.today.taskHistory[viewedDate]`. Empty array if
// no snapshot exists for that day (an empty state message is
// rendered by _renderTdList in that case).
function _tdTasksForViewed(c) {
  if (!c || !c.today) return [];
  const iso = _tdViewedDate(c);
  if (iso === _tdLocalTodayIso()) {
    return Array.isArray(c.today.tasks) ? c.today.tasks : [];
  }
  const snap = c.today.taskHistory && c.today.taskHistory[iso];
  return Array.isArray(snap) ? snap : [];
}

// Does the given ISO have any recorded task activity? Used by
// the calendar dropdown to render the little amber "has tasks"
// dot below the day number. Today counts if the live list has
// entries; past days count if their taskHistory snapshot has
// entries.
function _tdHasTasksOnDate(c, iso) {
  if (!c || !c.today) return false;
  if (iso === _tdLocalTodayIso()) {
    return Array.isArray(c.today.tasks) && c.today.tasks.length > 0;
  }
  const snap = c.today.taskHistory && c.today.taskHistory[iso];
  return Array.isArray(snap) && snap.length > 0;
}

// Seed the concept's persistent task list from the generator, once.
// Also handles legacy state where `today.tasks` is missing.
function _seedTodayTasks(c) {
  if (!c.today) c.today = { tasks: [], viewingTaskId: null, viewingInsightId: null };
  if (!Array.isArray(c.today.tasks)) c.today.tasks = [];
  if (c.today.tasks.length > 0) return;

  const fresh = _todayTasks().map(function (t) {
    // `discarded` is stamped on at seed time so downstream code can
    // trust the field exists (the list renderer filters by it).
    // `approved` is the "yes, I want to do this today" flag toggled
    // by the card's Approve button \u2014 initially false. `thread`
    // is the DISCUSS-WITH-CLARA transcript for this task; empty at
    // seed time and populated (a) with an auto-seeded Clara opening
    // the first time the user opens the detail page, and (b) with
    // user + Clara turns on each send. The state normalizer
    // backfills all three fields for legacy tasks that pre-date
    // them.
    return Object.assign({}, t, {
      status: 'todo',
      discarded: false,
      approved: false,
      thread: []
    });
  });
  c.today.tasks = fresh;
  _saveState();
}

// Single source of truth for status writes. Called from the list-view
// status circle and from the meta-line status pill. Returns true if
// the status actually changed (so callers know whether to re-render).
function _setTaskStatus(idx, nextStatus) {
  const c = getActiveConcept();
  if (!c || !c.today || !c.today.tasks[idx]) return false;
  const status = _resolveStatus(nextStatus);
  if (c.today.tasks[idx].status === status) return false;
  c.today.tasks[idx].status = status;
  _saveState();
  return true;
}

// Cycles: todo \u2192 in_progress \u2192 done \u2192 todo. Used by the
// list-view checkbox so a single click steps the task through its
// lifecycle without needing separate buttons.
function _cycleTaskStatus(idx) {
  const c = getActiveConcept();
  if (!c || !c.today || !c.today.tasks[idx]) return false;
  const current = _resolveStatus(c.today.tasks[idx].status);
  const next = current === 'todo' ? 'in_progress'
             : current === 'in_progress' ? 'done'
             : 'todo';
  return _setTaskStatus(idx, next);
}

// Re-render the whole Today view (shell + insight card + list).
// Used after any status/filter/thread mutation so the row list
// picks up the change without needing surgical DOM edits.
function _rerenderToday() {
  const container = document.getElementById('homeContent');
  if (container) renderToday(container);
}

// Renders the status-cycling checkbox for a list card. Colors and
// hover behavior come from CSS via [data-status].
function _renderStatusCheckbox(status, idx) {
  const resolved = _resolveStatus(status);
  let icon;
  if (resolved === 'done')             icon = TD_STATUS_ICON_DONE;
  else if (resolved === 'in_progress') icon = TD_STATUS_ICON_IN_PROGRESS;
  else                                 icon = TD_STATUS_ICON_TODO;

  const label = resolved === 'done'
    ? 'Task done \u2014 click to reopen'
    : (resolved === 'in_progress'
        ? 'Task in progress \u2014 click to mark done'
        : 'Task to do \u2014 click to start');

  return ''
    + '<button type="button" class="td-status-btn"'
    +   ' data-status="' + resolved + '"'
    +   ' data-task-idx="' + idx + '"'
    +   ' aria-label="' + label + '"'
    + '>' + icon + '</button>';
}

// Wire up the three header-icon buttons.
//
//   List     \u2014 the "you are here" pill. Clicking it just
//              re-renders Today (a no-op visually but keeps the
//              click behaviour predictable for the trio).
//   Kanban   \u2014 stamps tasks.view = 'board' then navigates.
//   Calendar \u2014 stamps tasks.view = 'calendar' then navigates.
//
// Persisting the view via _saveState keeps the choice sticky
// across reloads, matching how the retired in-screen toggle
// used to work. Native <button> already handles Enter / Space
// activation so plain click listeners are enough here.
function _bindTdOpenBoard(scope) {
  const openTasksWithView = function (view) {
    const tasks = (typeof window !== 'undefined' && typeof window.getTasks === 'function')
      ? window.getTasks()
      : null;
    if (tasks && tasks.view !== view) {
      tasks.view = view;
      if (typeof window._saveState === 'function') window._saveState();
    }
    setActiveView('tasks');
    renderApp();
  };

  const listBtn     = scope.querySelector('#tdOpenList');
  const kanbanBtn   = scope.querySelector('#tdOpenKanban');
  const calendarBtn = scope.querySelector('#tdOpenCalendar');

  if (listBtn) {
    listBtn.addEventListener('click', function () { _rerenderToday(); });
  }
  if (kanbanBtn)   kanbanBtn.addEventListener('click',   function () { openTasksWithView('board'); });
  if (calendarBtn) calendarBtn.addEventListener('click', function () { openTasksWithView('calendar'); });
}

// ---------------------------------------------
// List view
// ---------------------------------------------

function _renderTdList(container, c) {
  // Which day are we rendering? Today (live, editable) or an
  // archived past day (read-only view from taskHistory)?
  const isPast = _tdIsPastView(c);
  const sourceTasks = _tdTasksForViewed(c);

  // Past-date empty state: no snapshot recorded for that day.
  // The spec calls for a muted centered message rather than the
  // usual filter bar + rows scaffold.
  if (isPast && sourceTasks.length === 0) {
    container.innerHTML = ''
      + '<div class="td-past-empty" role="status">'
      +   '<div class="td-past-empty-icon" aria-hidden="true">\u2014</div>'
      +   '<div class="td-past-empty-msg">No tasks recorded for this day.</div>'
      + '</div>';
    return;
  }

  // Filter bar sits ABOVE the row list, inside the same body so
  // vertical rhythm stays consistent with the rest of the Today
  // page. The bar is only rendered when there's at least one
  // non-discarded task to filter \u2014 an empty task list looks
  // cleaner without dangling pills. Also hidden on past-date
  // views: filtering an archived day is possible in theory but
  // adds noise for what's already a "look, don't touch" surface.
  const activeFilter = _tdListFilterCurrent();
  const hasVisibleTasks = sourceTasks.some(function (t) {
    return t && !t.discarded;
  });
  const filterBarHtml = (hasVisibleTasks && !isPast)
    ? _tdRenderFilterBar(activeFilter)
    : '';

  container.innerHTML = ''
    + filterBarHtml
    + '<div class="td-rows' + (isPast ? ' td-rows-readonly' : '') + '" id="tdRows"></div>';

  const wrap = container.querySelector('#tdRows');

  // Skip discarded tasks first (always hidden regardless of the
  // active filter \u2014 discard is a "not today" verdict, not a
  // status). Then apply the status filter (today only). Preserve
  // the ORIGINAL idx into c.today.tasks so status-cycle and
  // discard writes still land on the right slot after filtering.
  // For past-date rendering the idx points into the archived
  // snapshot array \u2014 which is irrelevant because past cards
  // are stripped of write affordances, so idx is never consumed.
  sourceTasks.forEach(function (task, idx) {
    if (!task || task.discarded) return;
    if (!isPast && activeFilter !== 'all') {
      const status = _resolveStatus(task.status);
      if (status !== activeFilter) return;
    }
    wrap.appendChild(_buildTdListCard(task, idx, { readOnly: isPast }));
  });

  // Wire filter-pill clicks after the DOM is mounted. Handlers
  // just flip the module-level filter and re-render \u2014 no state
  // save (filter is session-only by design). Skipped in past-date
  // mode because the bar itself isn't rendered.
  if (!isPast) _tdBindFilterBar(container);
}

// Filter bar markup: "All | To Do | In Progress | Done" pills.
// Rendered as buttons for accessibility (focusable, keyboard-
// activatable) even though they're styled minimally as text-only
// pills with an amber underline in the active state.
function _tdRenderFilterBar(activeFilter) {
  const pills = TD_LIST_FILTERS.map(function (key) {
    const isActive = key === activeFilter;
    const cls = 'td-filter' + (isActive ? ' td-filter-active' : '');
    const pressed = isActive ? 'true' : 'false';
    return ''
      + '<button type="button" class="' + cls + '" '
      +   'data-td-filter="' + key + '" '
      +   'aria-pressed="' + pressed + '">'
      +   _escape(_tdListFilterLabel(key))
      + '</button>';
  }).join('');
  return ''
    + '<div class="td-filters" role="group" aria-label="Filter tasks by status">'
    +   pills
    + '</div>';
}

function _tdBindFilterBar(scope) {
  const pills = scope.querySelectorAll('[data-td-filter]');
  pills.forEach(function (pill) {
    pill.addEventListener('click', function () {
      const next = pill.getAttribute('data-td-filter');
      if (_tdListFilterSet(next)) _rerenderToday();
    });
  });
}

// Builds one row for the Today list view. The visual is now a flat,
// full-width row separated by a 1px border \u2014 no card chrome, no
// shadow. A 3px accent line runs down the left edge, colour-coded by
// task type (POST / OUTREACH / OFFER). All the row's interactions
// route through the same helpers as before:
//   \u2022 status circle cycles todo \u2192 in_progress \u2192 done via _cycleTaskStatus
//   \u2022 \u00d7 discard flags task.discarded = true and re-renders (hover-reveal)
//   \u2022 clicking the row body opens the task-detail sub-view
// "Why this?" is no longer surfaced on the row \u2014 the reason lives
// on the task-detail page under "WHY CLARA PICKED THIS", so
// duplicating it here just adds noise.
// Approve is also intentionally NOT rendered \u2014 per product decision
// the row's default meaning is "yes I plan to do this today", so an
// explicit approve action is redundant. `task.approved` still exists
// in state for backward compat but no longer has a UI affordance.
function _buildTdListCard(task, idx, opts) {
  const readOnly = !!(opts && opts.readOnly);
  const status = _resolveStatus(task.status);
  const done = status === 'done';
  const type = String(task.type || '').toUpperCase();

  const row = document.createElement('div');
  row.className = 'td-row' + (done ? ' td-row-done' : '') + (readOnly ? ' td-row-readonly' : '');
  row.setAttribute('data-task-id', task.id);
  row.setAttribute('data-type', type);

  // Layout, left to right (inside .td-row-main):
  //   [3px accent bar] \u2014 absolute, spans full row height
  //   [status circle]  \u2014 24px, cycles todo/in_progress/done
  //   [body]           \u2014 description + meta (TYPE \u00b7 time)
  //   [actions]        \u2014 message-count pill (if thread > 0) +
  //                       \u00d7 discard (hover-reveal)
  const threadLen = Array.isArray(task.thread) ? task.thread.length : 0;
  // Count pill is rendered ONLY when there's an actual transcript.
  // Even 1 message counts (that's the auto-seeded Clara opening the
  // first time a user opens the detail) \u2014 an intentional cue
  // that this task has been engaged with.
  const threadCountHtml = threadLen > 0
    ? ''
      + '<span class="td-row-thread-count" data-thread-count="' + threadLen + '" '
      +   'aria-label="' + threadLen + ' message' + (threadLen === 1 ? '' : 's') + ' with Clara">'
      +   '<span class="td-row-thread-count-icon" aria-hidden="true">' + TD_THREAD_ICON + '</span>'
      +   '<span class="td-row-thread-count-num">' + threadLen + '</span>'
      + '</span>'
    : '';

  // Status pill sits inline in the meta line, right after the
  // TYPE label. Same click affordance as the circle button on
  // the left of the row \u2014 both cycle status via
  // _cycleTaskStatus(idx). Two entry points feels redundant on
  // paper but reads well in practice: the circle is the "action"
  // hotspot at the row's start, the pill is a status label the
  // user is already looking at while scanning the meta line.
  const statusLabel = status === 'in_progress'
    ? 'In Progress'
    : (status === 'done' ? 'Done' : 'To Do');
  const statusPillHtml = ''
    + '<button type="button" class="td-row-status" data-status="' + status + '" '
    +   'data-task-idx="' + idx + '" '
    +   'aria-label="Status: ' + statusLabel + ' \u2014 click to cycle">'
    +   _escape(statusLabel.toUpperCase())
    + '</button>';

  // Row body composition. In read-only (past-date) mode we strip
  // ALL interactive affordances: no status circle, no status
  // pill click, no discard button, no click-to-detail on the row.
  // The row becomes an informational readout of what the day
  // looked like. Thread-count badge is still rendered as a
  // muted indicator (users can see they had a conversation
  // that day; we just don't let them open it from the archive).
  const statusCheckboxHtml = readOnly ? '' : _renderStatusCheckbox(status, idx);
  const discardBtnHtml = readOnly
    ? ''
    : ''
      + '<button type="button" class="td-row-discard" data-discard="' + _escape(task.id) + '" aria-label="Discard task \u2014 hide from Today">'
      +   '<span class="td-row-discard-icon" aria-hidden="true">' + TD_DISCARD_ICON + '</span>'
      + '</button>';

  row.innerHTML = ''
    + '<span class="td-row-accent" aria-hidden="true"></span>'
    + '<div class="td-row-main">'
    +   statusCheckboxHtml
    +   '<div class="td-row-body">'
    +     '<div class="td-row-desc">' + _escape(task.description) + '</div>'
    +     '<div class="td-row-meta">'
    +       '<span class="td-row-meta-type">' + _escape(type) + '</span>'
    +       '<span class="td-row-meta-sep" aria-hidden="true">\u00b7</span>'
    +       statusPillHtml
    +       '<span class="td-row-meta-sep" aria-hidden="true">\u00b7</span>'
    +       '<span class="td-row-meta-time">'
    +         '<span class="td-row-meta-time-icon" aria-hidden="true">' + TD_CLOCK_ICON + '</span>'
    +         '<span class="td-row-meta-time-text">' + _escape(task.time) + '</span>'
    +       '</span>'
    +     '</div>'
    +   '</div>'
    +   '<div class="td-row-actions">'
    +     threadCountHtml
    +     discardBtnHtml
    +   '</div>'
    + '</div>';

  // Interactive wiring is entirely suppressed on past-date rows.
  // Every write path (cycle status, discard) mutates
  // `concept.today.tasks` at a live idx \u2014 which doesn't exist for
  // archived snapshots. Returning early keeps the archive
  // strictly frozen and side-effect-free.
  if (readOnly) return row;

  const statusBtn = row.querySelector('.td-status-btn');
  const statusPill = row.querySelector('.td-row-status');
  const discardBtn = row.querySelector('.td-row-discard');

  // Status circle: cycles todo \u2192 in_progress \u2192 done \u2192 todo.
  // Stops propagation so clicking the circle doesn't also fire the
  // row's click-to-detail handler.
  if (statusBtn) {
    statusBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (_cycleTaskStatus(idx)) _rerenderToday();
    });
  }

  // Status pill: same cycling behaviour as the circle, delivered
  // via the meta line. stopPropagation prevents the row's
  // click-to-detail handler from also firing.
  if (statusPill) {
    statusPill.addEventListener('click', function (e) {
      e.stopPropagation();
      if (_cycleTaskStatus(idx)) _rerenderToday();
    });
  }

  // Discard: fade the row out without deleting the underlying task.
  // Flag `task.discarded = true`, persist, then re-render \u2014
  // _renderTdList skips discarded rows. The 240ms delay matches
  // the CSS keyframes so the fade finishes before the re-render
  // swaps DOM out from under it.
  if (discardBtn) {
    discardBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (row.classList.contains('td-row-discarding')) return;
      row.classList.add('td-row-discarding');
      setTimeout(function () {
        const active = getActiveConcept();
        if (active && active.today && active.today.tasks && active.today.tasks[idx]) {
          active.today.tasks[idx].discarded = true;
          _saveState();
        }
        _rerenderToday();
      }, 240);
    });
  }

  row.addEventListener('click', function () { _openTaskDetail(task); });

  return row;
}

function _resolveStatus(s) {
  if (s === 'in_progress' || s === 'done' || s === 'todo') return s;
  return 'todo';
}

// ---------------------------------------------
// Shared: opening a task in Create (unchanged from original)
// ---------------------------------------------

function _openTaskInCreate(task) {
  const create = getCreate();
  _resetCreate();
  // Create's _crInit reads fromTask and pre-selects (contentType,
  // subFormat, platform) via CR_TASK_DEFAULTS keyed off task.type.
  create.fromTask = task;
  appState.activeView = 'create';
  _saveState();
  renderApp();
}

// ---------------------------------------------
// Task detail — Clara's step-by-step guide
// ---------------------------------------------

// Generates 4–5 concrete steps for how to actually do a task. Content
// is type-driven (POST / OUTREACH / OFFER) and references business
// context so the language stays grounded, not generic. Falls back to a
// short generic recipe for any future / unknown task type.
function _taskSteps(task) {
  const type = String((task && task.type) || '').toUpperCase();
  const b = getBusiness();
  const name = (b.name && b.name.trim()) ? b.name.trim() : 'your business';
  const product = (b.product && b.product.trim()) ? b.product.trim() : 'what you make';
  const location = (b.location || '').trim();
  const audienceLine = location ? 'People in ' + location : 'Your audience';

  if (type === 'POST') {
    return [
      'Get one thing ready — a real photo, a short clip, or a single line about ' + product + ' at ' + name + '. Not stock, not polished.',
      'Write the caption in one sitting. First draft only. Say the specific thing, not the brand thing.',
      'Read it aloud once. Cut anything that sounds like everyone else in your space.',
      'Post it and note the time. ' + audienceLine + ' respond fastest in the first hour — be around to reply.',
      'Come back in 24 hours. Read the replies, not the like count — that\u2019s where the real signal is.'
    ];
  }
  if (type === 'OUTREACH') {
    return [
      'Open your last 20 conversations about ' + product + ' — DMs, emails, whatever channel you actually use.',
      'Pick 3 people who came close to buying but never did. Real names, not personas.',
      'Send each one a short message. Personalize the first sentence, keep the ask identical across all three.',
      'Set a 3-day reminder. If they haven\u2019t replied, send one gentle nudge. No pitch, just curiosity.',
      'When someone answers, listen for what almost stopped them. That sentence is your next post.'
    ];
  }
  if (type === 'OFFER') {
    return [
      'Write the offer in one sentence: who it\u2019s for, what it is, and why now. If you can\u2019t say it in a sentence, it\u2019s not sharp enough.',
      'Set the boundary — how long it runs, how many spots or units, what happens when it ends.',
      'Publish or send it today. Don\u2019t pre-launch or tease. For a small audience, teasing kills momentum.',
      'Track two numbers only: who clicked, and who bought. Every other metric is noise this week.',
      'In 48 hours decide: extend it, kill it, or roll it into a permanent option for ' + name + '.'
    ];
  }
  // Generic fallback for any future task type.
  return [
    'Set aside 15 uninterrupted minutes today.',
    'Do the task exactly as written above. Don\u2019t polish — done beats perfect for a first pass.',
    'When you\u2019re finished, note one thing you noticed. That note is what Clara learns from tomorrow.'
  ];
}

function _openTaskDetail(task) {
  const c = getActiveConcept();
  if (!c || !task) return;
  if (!c.today) c.today = { tasks: [], viewingTaskId: null, viewingInsightId: null };
  // Clear the sibling insight-detail pointer so we never end up with
  // both sub-views pinned in state at once.
  c.today.viewingInsightId = null;
  c.today.viewingTaskId = task.id;

  // First-open seed: if this task has never had a thread turn
  // (fresh from the seeder, or a legacy task the normalizer just
  // backfilled with an empty array), drop in Clara's opening line
  // BEFORE the detail renders. That way the transcript is already
  // populated on first paint \u2014 no empty-state flash. Persisted
  // via _saveState so subsequent opens read it back from disk
  // instead of re-seeding.
  const idx = c.today.tasks.findIndex(function (t) { return t.id === task.id; });
  if (idx >= 0) {
    const persisted = c.today.tasks[idx];
    if (!Array.isArray(persisted.thread)) persisted.thread = [];
    if (persisted.thread.length === 0 && typeof window._claraThreadOpening === 'function') {
      persisted.thread.push({
        role: 'clara',
        text: window._claraThreadOpening(persisted, c),
        timestamp: Date.now()
      });
    }
  }

  _saveState();
  _rerenderToday();
}

function _closeTaskDetail() {
  const c = getActiveConcept();
  if (!c || !c.today) return;
  c.today.viewingTaskId = null;
  _saveState();
  _rerenderToday();
}

// ---------------------------------------------
// Thread-section helpers (DISCUSS WITH CLARA)
// ---------------------------------------------
//
// The thread lives BELOW "Clara's Step-by-Step" and ABOVE the
// action buttons inside every task-detail page. It's a compact,
// scrollable transcript + input row \u2014 not a modal, not a
// separate page. All persistence goes through `_saveState`
// after every user OR clara turn. Responses come from
// window._claraThreadRespond (loaded from clara/threadRespond.js).

// Format a message timestamp as HH:MM. 24-hour, zero-padded.
// Kept intentionally simple \u2014 the bubble is compact and
// relative labels ("just now", "3m ago") would need a re-render
// tick to stay accurate. Absolute HH:MM never lies.
function _tdThreadFormatTime(ts) {
  const d = new Date(Number(ts) || Date.now());
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return hh + ':' + mm;
}

// Build one bubble's HTML. Uses _escape on the message text so
// any user-supplied content is safe. Clara messages get an
// "C" avatar circle on the left; user messages are right-aligned
// with no avatar.
function _tdThreadBubbleHtml(msg) {
  if (!msg || typeof msg !== 'object') return '';
  const isClara = msg.role === 'clara';
  const roleClass = isClara ? 'td-thread-msg-clara' : 'td-thread-msg-user';
  // Avatar is intentionally Clara-only \u2014 user messages sit
  // flush-right with no avatar. BOTH roles wrap their text in
  // `.td-thread-bubble` so the CSS can render each side as a
  // proper bubble (Clara: --surface, user: light rgba white).
  // Do not skip the .td-thread-bubble div for user messages;
  // that would collapse the message into unstyled text.
  const avatarHtml = isClara
    ? '<span class="td-thread-avatar" aria-hidden="true">C</span>'
    : '';
  const timeText = _tdThreadFormatTime(msg.timestamp);
  return ''
    + '<div class="td-thread-msg ' + roleClass + '">'
    +   avatarHtml
    +   '<div class="td-thread-msg-body">'
    +     '<div class="td-thread-bubble">' + _escape(String(msg.text || '')) + '</div>'
    +     '<div class="td-thread-time">' + _escape(timeText) + '</div>'
    +   '</div>'
    + '</div>';
}

// Render the entire thread transcript into the scroll container.
// Called on first mount and after every new turn.
//
// Empty-state guard: this should be rare in practice (opening a
// task auto-seeds Clara's opening message in _openTaskDetail),
// but a legacy task that somehow lands here with an empty thread
// gets a muted italic placeholder instead of a blank scroll box.
function _tdThreadRenderList(listEl, thread) {
  if (!listEl) return;
  const messages = Array.isArray(thread) ? thread : [];
  if (messages.length === 0) {
    listEl.innerHTML = ''
      + '<div class="td-thread-empty">Ask Clara anything about this task\u2026</div>';
    return;
  }
  listEl.innerHTML = messages.map(_tdThreadBubbleHtml).join('');
}

// Scroll the thread list to the newest message. `smooth=true`
// on new turns, `false` on initial mount (so the user isn't
// startled by a scroll animation the moment the detail opens).
function _tdThreadScrollToBottom(listEl, smooth) {
  if (!listEl) return;
  try {
    listEl.scrollTo({ top: listEl.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  } catch (_e) {
    // Older browsers: fall back to instant assignment.
    listEl.scrollTop = listEl.scrollHeight;
  }
}

// Show the three-dot "Clara is typing\u2026" indicator inside the
// list. Idempotent \u2014 calling twice reuses the existing node.
function _tdThreadShowTyping(listEl) {
  if (!listEl) return;
  if (listEl.querySelector('.td-thread-typing')) return;
  const node = document.createElement('div');
  node.className = 'td-thread-msg td-thread-msg-clara td-thread-typing';
  node.innerHTML = ''
    + '<span class="td-thread-avatar" aria-hidden="true">C</span>'
    + '<div class="td-thread-msg-body">'
    +   '<div class="td-thread-bubble td-thread-typing-bubble" aria-label="Clara is typing">'
    +     '<span class="td-thread-typing-dot"></span>'
    +     '<span class="td-thread-typing-dot"></span>'
    +     '<span class="td-thread-typing-dot"></span>'
    +   '</div>'
    + '</div>';
  listEl.appendChild(node);
  _tdThreadScrollToBottom(listEl, true);
}

function _tdThreadHideTyping(listEl) {
  if (!listEl) return;
  const node = listEl.querySelector('.td-thread-typing');
  if (node && node.parentNode) node.parentNode.removeChild(node);
}

// Handle a user submission. Idempotent for empty input (whitespace
// only messages are silently dropped so the input doesn't submit
// junk when the user hits Enter on an empty field).
//
// Flow:
//   1. Append user turn to task.thread + save + append DOM bubble.
//   2. Clear + refocus the input.
//   3. Show "Clara is typing\u2026" indicator, scroll.
//   4. After 800ms: compute Clara reply, append + save, remove
//      indicator, scroll.
//
// Guards: `_tdThreadState.sending` prevents double-submits during
// the 800ms typing window (Enter mashed twice, button double-tap).
// Guard is scoped per detail render \u2014 closing the detail resets
// the flag naturally because the whole subtree is torn down.
const _tdThreadState = { sending: false };

function _tdThreadHandleSend(taskId, listEl, inputEl) {
  if (!listEl || !inputEl) return;
  if (_tdThreadState.sending) return;

  const raw = String(inputEl.value || '').trim();
  if (!raw) return;

  const c = getActiveConcept();
  if (!c || !c.today || !Array.isArray(c.today.tasks)) return;
  const idx = c.today.tasks.findIndex(function (t) { return t && t.id === taskId; });
  if (idx < 0) return;
  const task = c.today.tasks[idx];
  if (!Array.isArray(task.thread)) task.thread = [];

  _tdThreadState.sending = true;

  // 1. User turn goes on immediately \u2014 no waiting for Clara.
  const userMsg = { role: 'user', text: raw, timestamp: Date.now() };
  task.thread.push(userMsg);
  _saveState();

  // If we were showing the empty-state placeholder, drop it now
  // that we have a real message to render.
  const emptyNode = listEl.querySelector('.td-thread-empty');
  if (emptyNode && emptyNode.parentNode) emptyNode.parentNode.removeChild(emptyNode);

  listEl.insertAdjacentHTML('beforeend', _tdThreadBubbleHtml(userMsg));

  inputEl.value = '';
  inputEl.focus();
  _tdThreadScrollToBottom(listEl, true);

  // 2. Typing indicator + scheduled reply. The 800ms delay is
  // spec-defined (feels like Clara is thinking, not instant).
  _tdThreadShowTyping(listEl);

  setTimeout(function () {
    _tdThreadHideTyping(listEl);

    // Re-fetch concept + task inside the timeout: the user could
    // have switched concepts, deleted this task, or navigated away
    // during the 800ms window. In any of those cases, silently
    // abort \u2014 no crash, no stale writes.
    const c2 = getActiveConcept();
    if (!c2 || !c2.today || !Array.isArray(c2.today.tasks)) {
      _tdThreadState.sending = false;
      return;
    }
    const idx2 = c2.today.tasks.findIndex(function (t) { return t && t.id === taskId; });
    if (idx2 < 0) {
      _tdThreadState.sending = false;
      return;
    }
    const task2 = c2.today.tasks[idx2];
    if (!Array.isArray(task2.thread)) task2.thread = [];

    const replyText = (typeof window._claraThreadRespond === 'function')
      ? window._claraThreadRespond(raw, task2, c2)
      : 'Got it.';
    const claraMsg = { role: 'clara', text: replyText, timestamp: Date.now() };
    task2.thread.push(claraMsg);
    _saveState();

    listEl.insertAdjacentHTML('beforeend', _tdThreadBubbleHtml(claraMsg));
    _tdThreadScrollToBottom(listEl, true);

    _tdThreadState.sending = false;
  }, 800);
}

// Full-page task detail sub-view. Editorial layout matching the new
// Today screen aesthetic: full-width dark canvas, Playfair headline,
// clean numbered step rows (no card chrome), amber accents.
//
// Layout, top to bottom:
//   \u2190 Back to Today                    (back link, existing)
//   [TYPE chip]                    [time]  (row: chip left, muted time right)
//   Task description                       (Playfair 28/700, hero text)
//   \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500                       (1px muted divider, 28px stack)
//   WHY CLARA PICKED THIS                  (amber uppercase 11px label)
//   Reason body                            (Inter 15px, secondary text)
//   \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
//   CLARA\u2019S STEP-BY-STEP                   (muted uppercase 11px label)
//   [1] step text                          (numbered rows, 28px amber circle
//   [2] step text                           badge + Inter 15 white body;
//   [3] step text                           1px left accent bar in the
//                                           task-type colour)
//   \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
//   DISCUSS WITH CLARA                     (muted uppercase 11px label)
//   [transcript bubbles]                   (Clara left + amber avatar;
//                                           user right; timestamps 11px
//                                           below each bubble; scroll
//                                           locked to max-height on
//                                           desktop, unlocked on mobile)
//   [input | send \u25b8]                     (dark input, amber focus
//                                           border, arrow send button)
//   [Open in Create \u2192]                    (amber full-width, POST only)
//   [Mark as done]                         (outline full-width, always)
//
// The "Open in Create \u2192" button is intentionally suppressed for
// OUTREACH and OFFER tasks: those are actions the user does outside
// Clarity (DM, in-person, publish an offer) \u2014 the Create engine is
// a content composer, not an outreach/offer tool.
function _renderTdDetail(container, task, c) {
  const idx = c.today.tasks.findIndex(function (t) { return t.id === task.id; });
  const status = _resolveStatus(task.status);
  const done = status === 'done';
  const steps = _taskSteps(task);
  const type = String(task.type || '').toUpperCase();
  const isPost = type === 'POST';

  const doneBadge = done
    ? '<span class="td-detail-done-badge" aria-hidden="true">' + TD_CHECK_ICON + '</span>'
    : '';

  const stepsHtml = steps.map(function (s, i) {
    return ''
      + '<li class="td-detail-step">'
      +   '<span class="td-detail-step-num">' + (i + 1) + '</span>'
      +   '<span class="td-detail-step-text">' + _escape(s) + '</span>'
      + '</li>';
  }).join('');

  // "Open in Create" is content-engine only. For OUTREACH / OFFER
  // tasks the primary CTA collapses entirely \u2014 no replacement.
  const primaryActionHtml = isPost
    ? '<button type="button" class="td-detail-action-primary" id="tdDetailOpenCreate">Open in Create \u2192</button>'
    : '';

  const secondaryLabel = done ? 'Mark as to-do' : 'Mark as done';

  // data-type on the wrap so the step accent-bar colours resolve via
  // a single [data-type] rule per POST / OUTREACH / OFFER, matching
  // the row-accent palette on the Today list.
  container.innerHTML = ''
    + '<section class="td-wrap td-wrap-detail' + (done ? ' td-wrap-detail-done' : '') + '" data-type="' + _escape(type) + '">'
    +   '<button type="button" class="td-detail-back" id="tdDetailBack">\u2190 Back to Today</button>'
    +   '<div class="td-detail-head">'
    +     '<div class="td-type-chip td-detail-type" data-type="' + _escape(type) + '">' + _escape(type) + '</div>'
    +     doneBadge
    +     '<span class="td-detail-time">' + _escape(task.time || '') + '</span>'
    +   '</div>'
    +   '<h1 class="td-detail-title">' + _escape(task.description) + '</h1>'
    +   '<div class="td-detail-divider" aria-hidden="true"></div>'
    +   '<div class="td-detail-section">'
    +     '<div class="td-detail-reason-label">Why Clara picked this</div>'
    +     '<div class="td-detail-reason-body">' + _escape(task.reason) + '</div>'
    +   '</div>'
    +   '<div class="td-detail-divider" aria-hidden="true"></div>'
    +   '<div class="td-detail-section">'
    +     '<div class="td-detail-steps-head">Clara\u2019s step-by-step</div>'
    +     '<ol class="td-detail-steps">' + stepsHtml + '</ol>'
    +   '</div>'
    +   '<div class="td-detail-divider" aria-hidden="true"></div>'
    +   '<div class="td-detail-section td-thread-section">'
    +     '<div class="td-thread-label">Discuss with Clara</div>'
    +     '<div class="td-thread-list" id="tdThreadList" data-task-id="' + _escape(task.id) + '"></div>'
    +     '<form class="td-thread-input-row" id="tdThreadForm" autocomplete="off">'
    +       '<input type="text" class="td-thread-input" id="tdThreadInput" '
    +         'placeholder="Ask Clara about this task\u2026" '
    +         'aria-label="Ask Clara about this task" '
    +         'maxlength="500" />'
    +       '<button type="submit" class="td-thread-send" id="tdThreadSend" aria-label="Send message">'
    +         TD_SEND_ICON
    +       '</button>'
    +     '</form>'
    +   '</div>'
    +   '<div class="td-detail-actions">'
    +     primaryActionHtml
    +     '<button type="button" class="td-detail-action-secondary" id="tdDetailToggleDone">' + secondaryLabel + '</button>'
    +   '</div>'
    + '</section>';

  const backBtn = document.getElementById('tdDetailBack');
  if (backBtn) backBtn.addEventListener('click', _closeTaskDetail);

  // ------------------------------------------------------------
  // Thread wiring \u2014 render the current transcript, then attach
  // the form handlers. `_tdThreadRenderList` is idempotent so we
  // can also call it from anywhere else that mutates task.thread
  // in the future without re-mounting the whole detail page.
  // ------------------------------------------------------------
  const threadListEl = document.getElementById('tdThreadList');
  const threadFormEl = document.getElementById('tdThreadForm');
  const threadInputEl = document.getElementById('tdThreadInput');
  if (threadListEl) {
    _tdThreadRenderList(threadListEl, task.thread);
    // Initial scroll to bottom is instant \u2014 the user just
    // opened the detail, so a smooth-scroll would look like the
    // page is loading. Subsequent scrolls (on new turns) are
    // smoothed inside _tdThreadHandleSend.
    _tdThreadScrollToBottom(threadListEl, false);
  }
  if (threadFormEl && threadListEl && threadInputEl) {
    // Reset the send-guard on every re-mount: even if a previous
    // detail page left the flag stuck (shouldn't happen, but
    // defensive), a fresh open of the same or another task
    // always starts unlocked.
    _tdThreadState.sending = false;
    threadFormEl.addEventListener('submit', function (e) {
      e.preventDefault();
      _tdThreadHandleSend(task.id, threadListEl, threadInputEl);
    });
  }

  // createBtn will be null for OUTREACH / OFFER (primaryActionHtml is
  // empty). Guard accordingly so we don't attach a phantom handler.
  const createBtn = document.getElementById('tdDetailOpenCreate');
  if (createBtn) {
    createBtn.addEventListener('click', function () {
      // Clear the detail pointer first so backing out of Create returns
      // the user to the Today list, not straight back into this detail.
      const active = getActiveConcept();
      if (active && active.today) {
        active.today.viewingTaskId = null;
        _saveState();
      }
      _openTaskInCreate(task);
    });
  }

  const toggleBtn = document.getElementById('tdDetailToggleDone');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', function () {
      if (idx < 0) return;
      // Toggling status keeps you ON the detail page so you can hit the
      // primary action right after, or undo the toggle if it was a
      // misfire. Back button is the way out to the list.
      _setTaskStatus(idx, done ? 'todo' : 'done');
      _rerenderToday();
    });
  }
}

window.renderToday = renderToday;
// Exposed so Overview and the workspace widget can lazily seed a
// concept's task list without depending on the user having opened
// the Today tab first.
window._seedTodayTasks = _seedTodayTasks;
window._resolveTaskStatus = _resolveStatus;
