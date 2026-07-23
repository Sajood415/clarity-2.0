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

// Spark glyph used on the row-level "Ask Clara" pill and on the
// legacy "Discuss with Clara" trigger button inside task detail.
// currentColor drives the stroke so the amber pill styling in
// today.css controls the visible colour without SVG edits.
const TD_ASK_CLARA_ICON = ''
  + '<svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" '
  +   'stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
  +   '<path d="M6 1 L6 11 M1 6 L11 6 M2.5 2.5 L9.5 9.5 M9.5 2.5 L2.5 9.5"/>'
  + '</svg>';

// Transient in-session flag \u2014 records that the pending open of a
// task detail was initiated via the row-level "Ask Clara" pill (not
// a plain row click). Consumed inside _renderTdDetail to grab focus
// into the thread input on mount. Module-scoped rather than
// persisted because:
//   \u2022 The signal is one-shot: click \u2192 render \u2192 focus.
//     There's nothing to preserve across reloads (a reload lands
//     the user back on the detail because viewingTaskId is
//     persisted; auto-focus on top of that would feel like the
//     browser is stealing focus).
//   \u2022 Seeding Clara's opening message (done in _openTaskDetail
//     when opts.openThread is truthy) is what carries the "thread
//     is expanded, not the trigger button" behaviour across
//     reloads \u2014 that's rendered off task.thread.length, which
//     IS persisted.
// Cleared inside _renderTdDetail after focus lands, and defensively
// inside _closeTaskDetail so any un-consumed flag from a bail path
// can't leak into the next detail open.
let _tdPendingThreadFocusTaskId = null;

// Sibling of _tdPendingThreadFocusTaskId, for the Ask Clara button
// on insight cards. Same lifecycle: set inside _openTdInsightDetail
// when the click came from the card's Ask Clara pill, cleared
// inside _renderTdInsightDetail after focus lands (or defensively
// in _closeTdInsightDetail).
let _tdPendingInsightThreadFocusId = null;

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

  // Insight grid sits between the greeting/heading and the task list
  // when it hasn't been dismissed for the day AND we actually have
  // insights to render. We surface up to 3 insights as compact stat
  // cards in a horizontal row -- click any card for the detail page,
  // hit "Ask Clara" for a per-insight chat thread (mirrors tasks).
  // If insights are missing/dismissed the whole block collapses to
  // zero height and the tasks slide up as if nothing was there.
  const showInsights = _shouldRenderInsights(c);
  const insightMarkup = showInsights ? _renderTdInsightGrid(c.today.insights, c) : '';

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
  if (showInsights) _bindTdInsightGrid(container, c);

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
// "Hide for today \u2192" dismisses just for the current calendar day;
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

// Grid wrapper: a shared header (DAILY INSIGHTS kicker + optional
// "FOR NAME" tag + "Hide for today" skip) sits above a row of up
// to 3 compact stat cards. Each card is its own clickable surface
// that routes into the insight detail page for that specific
// insight (not just insights[0] anymore -- the grid unlocks all
// three).
function _renderTdInsightGrid(insights, _c) {
  const list = Array.isArray(insights) ? insights.slice(0, 3) : [];
  if (list.length === 0) return '';

  const active = (typeof window.getActiveConcept === 'function') ? window.getActiveConcept() : null;
  const businessName = (active && active.business && active.business.name)
    ? String(active.business.name).trim()
    : '';
  const personalTagHtml = businessName
    ? '<span class="td-insight-personal-tag">FOR ' + _escape(businessName.toUpperCase()) + '</span>'
    : '';

  const cardsHtml = list.map(function (ins) { return _renderTdInsightCard(ins); }).join('');

  return ''
    + '<section class="td-insight-grid-wrap" aria-label="Daily insights">'
    +   '<div class="td-insight-grid-header">'
    +     '<div class="td-insight-grid-headline">'
    +       '<span class="td-insight-kicker">DAILY INSIGHTS</span>'
    +       personalTagHtml
    +     '</div>'
    +     '<button type="button" class="td-insight-skip" id="tdInsightSkip">Hide for today \u2192</button>'
    +   '</div>'
    +   '<div class="td-insight-grid">' + cardsHtml + '</div>'
    + '</section>';
}

// Single compact stat card. Extracts the primary number from the
// insight's stat sentence and renders it as a big Playfair digit;
// the rest of the sentence becomes the label. Whole card is a
// button (open detail) EXCEPT the Ask Clara pill, which stops
// propagation and opens the detail with the thread pre-focused
// (same UX as task rows).
function _renderTdInsightCard(insight) {
  if (!insight) return '';

  const parts = (typeof window._insExtractStat === 'function')
    ? window._insExtractStat(insight.stat || '')
    : { value: '', label: String(insight.stat || '') };
  const value = parts.value || '';
  const label = parts.label || String(insight.stat || '');
  const source = String(insight.source || '');
  const insightId = String(insight.id || '');

  const valueHtml = value
    ? '<div class="td-insight-value">' + _escape(value) + '</div>'
    : '';
  const sourceHtml = source
    ? ''
      + '<span class="td-insight-source" aria-hidden="true">'
      +   '<span class="td-insight-source-dot" aria-hidden="true"></span>'
      +   '<span class="td-insight-source-label">' + _escape(source) + '</span>'
      + '</span>'
    : '<span class="td-insight-source-placeholder" aria-hidden="true"></span>';

  return ''
    + '<div class="td-insight-card" data-insight-id="' + _escape(insightId) + '"'
    +      ' role="button" tabindex="0" aria-label="Read insight: '
    +      _escape(insight.headline || label) + '">'
    +   '<div class="td-insight-card-inner">'
    +     '<div class="td-insight-card-top">'
    +       valueHtml
    +       '<span class="td-insight-arrow" aria-hidden="true">' + TD_INSIGHT_ARROW_SVG + '</span>'
    +     '</div>'
    +     '<p class="td-insight-label">' + _escape(label) + '</p>'
    +     '<div class="td-insight-card-footer">'
    +       sourceHtml
    +       '<button type="button" class="td-insight-ask-clara"'
    +         ' data-insight-ask="' + _escape(insightId) + '"'
    +         ' aria-label="Ask Clara about this insight">'
    +         '<span class="td-insight-ask-clara-icon" aria-hidden="true">' + TD_ASK_CLARA_ICON + '</span>'
    +         '<span class="td-insight-ask-clara-label">Ask Clara</span>'
    +       '</button>'
    +     '</div>'
    +   '</div>'
    + '</div>';
}

// Wraps the first "stat quantity" in the sentence with an accent
// span so the number pops visually. Priority order matches the
// stat-copy patterns in the insight pool (percentage range >
// single percentage > multiplier range > single multiplier > "N
// out of M" > ratio). Everything else is escape-passed. The
// escape happens BEFORE the wrap so no user-controllable input
// (headline / stat) can ever inject markup \u2014 the wrap
// operates on already-escaped text and inserts a fixed span.
function _tdEmphasiseInsightStat(stat) {
  if (!stat) return '';
  const escaped = _escape(String(stat));
  const patterns = [
    /(\d+(?:[.,]\d+)?[-\u2013]\d+(?:[.,]\d+)?%\+?)/,   // 10-15%, 15-20%
    /(\d+(?:[.,]\d+)?%\+?)/,                             // 42%, 42.5%, 120%+
    /(\d+(?:[.,]\d+)?[-\u2013]\d+(?:[.,]\d+)?x)/,       // 3-5x
    /(\d+(?:[.,]\d+)?x)/,                                // 2.4x, 3x
    /(\d+ out of \d+)/,                                  // 9 out of 10
    /(\d+:\d+)/                                          // 8:1
  ];
  for (let i = 0; i < patterns.length; i++) {
    const m = escaped.match(patterns[i]);
    if (m) {
      return escaped.replace(m[1], '<span class="td-insight-stat-num">' + m[1] + '</span>');
    }
  }
  return escaped;
}

// Bind card-open, skip-for-today, keyboard-activation, and per-card
// "Ask Clara" handlers across every card in the grid. Skip and Ask
// Clara are inline text buttons; clicks on them must NOT bubble up
// to the card body and navigate to the detail page.
function _bindTdInsightGrid(scope, c) {
  const cards = scope.querySelectorAll('.td-insight-card');
  if (!cards || cards.length === 0) return;

  cards.forEach(function (card) {
    const insightId = card.getAttribute('data-insight-id') || '';
    if (!insightId) return;

    const openDetail = function () { _openTdInsightDetail(c, insightId); };

    card.addEventListener('click', openDetail);
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openDetail();
      }
    });

    const askBtn = card.querySelector('.td-insight-ask-clara');
    if (askBtn) {
      askBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        _openTdInsightDetail(c, insightId, { openThread: true });
      });
    }
  });

  const skip = scope.querySelector('#tdInsightSkip');
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
// pin the id on state, persist, re-render Today. renderToday's
// routing at the top of the function picks up viewingInsightId and
// dispatches to _renderTdInsightDetail. Also marks the insight seen
// the first time it's opened (idempotent via the helper).
//
// The optional `opts.openThread` flag (fired from a card's Ask Clara
// button) seeds Clara's opening line into the insight's thread now
// so the detail render sees a non-empty thread and skips the empty
// state; also stamps a module-scoped auto-focus signal so the input
// grabs focus after mount. Same pattern as `_openTaskDetail`.
function _openTdInsightDetail(c, insightId, opts) {
  if (!c || !c.today) return;
  const list = Array.isArray(c.today.insights) ? c.today.insights : [];
  const idx = list.findIndex(function (i) { return i && i.id === insightId; });
  const insight = idx >= 0 ? list[idx] : list[0];
  if (!insight) return;

  if (typeof window._markInsightSeen === 'function') {
    try { window._markInsightSeen(c, insight.id); } catch (_err) { /* ignore */ }
  }

  const wantOpenThread = !!(opts && opts.openThread);
  if (wantOpenThread) {
    if (!Array.isArray(insight.thread)) insight.thread = [];
    if (insight.thread.length === 0
        && typeof window._claraInsightThreadOpening === 'function') {
      insight.thread.push({
        role: 'clara',
        text: window._claraInsightThreadOpening(insight, c),
        timestamp: Date.now()
      });
    }
  }

  _tdPendingInsightThreadFocusId = wantOpenThread ? insight.id : null;

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
  // Same defensive reset as _closeTaskDetail: drop any un-consumed
  // auto-focus flag so re-opening the same insight via a plain
  // card click never inherits the previous Ask Clara behaviour.
  _tdPendingInsightThreadFocusId = null;
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

  // Ask Clara thread section. Same DOM shape as the task-thread
  // section inside `_renderTdDetail` -- collapsed if the thread is
  // empty (surfaces the "Ask Clara" trigger button), expanded if
  // there's already a transcript (opening line seeded on first
  // Ask Clara click or via the card's Ask Clara pill).
  const hasThread = Array.isArray(insight.thread) && insight.thread.length > 0;
  const threadSectionClass = 'td-detail-section td-thread-section td-insight-thread-section'
    + (hasThread ? '' : ' td-thread-section-collapsed');
  const threadTriggerHtml = hasThread
    ? ''
    : ''
      + '<button type="button" class="td-thread-trigger td-insight-thread-trigger"'
      +   ' id="tdInsightThreadTrigger" aria-label="Discuss this insight with Clara">'
      +   '<span class="td-thread-trigger-icon" aria-hidden="true">' + TD_ASK_CLARA_ICON + '</span>'
      +   '<span class="td-thread-trigger-label">Ask Clara about this</span>'
      + '</button>';

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
    +   threadTriggerHtml
    +   '<div class="' + threadSectionClass + '" id="tdInsightThreadSection">'
    +     '<div class="td-thread-label">Ask Clara</div>'
    +     '<div class="td-thread-list" id="tdInsightThreadList" data-insight-id="'
    +       _escape(String(insight.id || '')) + '"></div>'
    +     '<form class="td-thread-input-row" id="tdInsightThreadForm" autocomplete="off">'
    +       '<input type="text" class="td-thread-input" id="tdInsightThreadInput" '
    +         'placeholder="Ask Clara about this insight\u2026" '
    +         'aria-label="Ask Clara about this insight" '
    +         'maxlength="500" />'
    +       '<button type="submit" class="td-thread-send" id="tdInsightThreadSend"'
    +         ' aria-label="Send message">'
    +         TD_SEND_ICON
    +       '</button>'
    +     '</form>'
    +   '</div>'
    + '</section>';

  const backBtn = container.querySelector('#tdInsightBack');
  if (backBtn) backBtn.addEventListener('click', _closeTdInsightDetail);

  _bindTdInsightThread(container, insight, c);
}

// ---------------------------------------------
// Insight thread wiring
// ---------------------------------------------
//
// Sibling of `_bindTdDetail`'s thread wiring for tasks. Renders
// any existing transcript, wires the trigger + submit handlers,
// and honours the module-scoped auto-focus flag when the detail
// was opened via a card's Ask Clara pill.
function _bindTdInsightThread(scope, insight, c) {
  const section = scope.querySelector('#tdInsightThreadSection');
  const listEl = scope.querySelector('#tdInsightThreadList');
  const inputEl = scope.querySelector('#tdInsightThreadInput');
  const formEl = scope.querySelector('#tdInsightThreadForm');
  const triggerBtn = scope.querySelector('#tdInsightThreadTrigger');
  if (!section || !listEl || !inputEl || !formEl) return;

  _tdInsightThreadRenderList(listEl, insight.thread);
  _tdThreadScrollToBottom(listEl, false);

  if (triggerBtn) {
    triggerBtn.addEventListener('click', function () {
      const cc = getActiveConcept();
      if (!cc || !cc.today || !Array.isArray(cc.today.insights)) return;
      const idx = cc.today.insights.findIndex(function (i) { return i && i.id === insight.id; });
      if (idx < 0) return;
      const persisted = cc.today.insights[idx];
      if (!Array.isArray(persisted.thread)) persisted.thread = [];
      if (persisted.thread.length === 0
          && typeof window._claraInsightThreadOpening === 'function') {
        persisted.thread.push({
          role: 'clara',
          text: window._claraInsightThreadOpening(persisted, cc),
          timestamp: Date.now()
        });
        _saveState();
      }
      _tdInsightThreadRenderList(listEl, persisted.thread);
      _tdThreadScrollToBottom(listEl, false);
      section.classList.remove('td-thread-section-collapsed');
      if (triggerBtn.parentNode) triggerBtn.parentNode.removeChild(triggerBtn);
      // Slight delay so the section's max-height transition completes
      // before we fire focus() -- otherwise Safari misplaces the
      // caret vertical inside the animated container.
      setTimeout(function () {
        try { inputEl.focus({ preventScroll: true }); } catch (_e) { inputEl.focus(); }
      }, 320);
    });
  }

  formEl.addEventListener('submit', function (e) {
    e.preventDefault();
    _tdInsightThreadHandleSend(insight.id, listEl, inputEl);
  });

  // Consume the auto-focus flag exactly once, if present.
  if (_tdPendingInsightThreadFocusId === insight.id) {
    _tdPendingInsightThreadFocusId = null;
    setTimeout(function () {
      try { inputEl.focus({ preventScroll: true }); } catch (_e) { inputEl.focus(); }
    }, 60);
  }
}

// Renders an insight's transcript into the scroll container. Reuses
// the shared bubble builder from the task thread so styling stays
// consistent across both surfaces.
function _tdInsightThreadRenderList(listEl, thread) {
  if (!listEl) return;
  const messages = Array.isArray(thread) ? thread : [];
  if (messages.length === 0) {
    listEl.innerHTML = ''
      + '<div class="td-thread-empty">Ask Clara anything about this insight\u2026</div>';
    return;
  }
  listEl.innerHTML = messages.map(_tdThreadBubbleHtml).join('');
}

// Send handler for the insight thread. Mirrors _tdThreadHandleSend
// (task version) with the target changed from concept.today.tasks
// to concept.today.insights. Shares the _tdThreadState.sending
// guard, the typing indicator helpers, and the 800ms Clara-typing
// delay so both surfaces feel identical to type in.
function _tdInsightThreadHandleSend(insightId, listEl, inputEl) {
  if (!listEl || !inputEl) return;
  if (_tdThreadState.sending) return;

  const raw = String(inputEl.value || '').trim();
  if (!raw) return;

  const c = getActiveConcept();
  if (!c || !c.today || !Array.isArray(c.today.insights)) return;
  const idx = c.today.insights.findIndex(function (i) { return i && i.id === insightId; });
  if (idx < 0) return;
  const insight = c.today.insights[idx];
  if (!Array.isArray(insight.thread)) insight.thread = [];

  _tdThreadState.sending = true;

  const userMsg = { role: 'user', text: raw, timestamp: Date.now() };
  insight.thread.push(userMsg);
  _saveState();

  const emptyNode = listEl.querySelector('.td-thread-empty');
  if (emptyNode && emptyNode.parentNode) emptyNode.parentNode.removeChild(emptyNode);

  listEl.insertAdjacentHTML('beforeend', _tdThreadBubbleHtml(userMsg));

  inputEl.value = '';
  inputEl.focus();
  _tdThreadScrollToBottom(listEl, true);

  _tdThreadShowTyping(listEl);

  setTimeout(function () {
    _tdThreadHideTyping(listEl);

    const c2 = getActiveConcept();
    if (!c2 || !c2.today || !Array.isArray(c2.today.insights)) {
      _tdThreadState.sending = false;
      return;
    }
    const idx2 = c2.today.insights.findIndex(function (i) { return i && i.id === insightId; });
    if (idx2 < 0) {
      _tdThreadState.sending = false;
      return;
    }
    const insight2 = c2.today.insights[idx2];
    if (!Array.isArray(insight2.thread)) insight2.thread = [];

    const replyText = (typeof window._claraInsightThreadRespond === 'function')
      ? window._claraInsightThreadRespond(raw, insight2, c2)
      : 'Got it.';
    const claraMsg = { role: 'clara', text: replyText, timestamp: Date.now() };
    insight2.thread.push(claraMsg);
    _saveState();

    listEl.insertAdjacentHTML('beforeend', _tdThreadBubbleHtml(claraMsg));
    _tdThreadScrollToBottom(listEl, true);

    _tdThreadState.sending = false;
  }, 800);
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
    const personaId = t.personaId || getDefaultPersonaId(c);
    return Object.assign({}, t, {
      status: 'todo',
      discarded: false,
      approved: false,
      thread: [],
      personaId: personaId
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

// Filter bar markup: "All | To Do | In Progress | Done" pills sit on
// the left; a small "+ Add task" pill sits flush right on the same
// row via flex space-between. Directly below the row we always
// render the manual-add modal in its collapsed state -- clicking
// "+ Add task" reveals it inline (no full-screen overlay, no
// re-render round-trip). All buttons are rendered as <button>s so
// they participate in the tab order.
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
    + '<div style="font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-secondary);margin-bottom:14px;">Your moves for today</div>'
    + '<div class="td-filters-row">'
    +   '<div class="td-filters" role="group" aria-label="Filter tasks by status">'
    +     pills
    +   '</div>'
    +   '<button type="button" class="td-add-task-btn" id="tdAddTaskBtn"'
    +     ' aria-expanded="false" aria-controls="tdAddModal">'
    +     '+ Add task'
    +   '</button>'
    + '</div>'
    + _tdRenderAddTaskModal();
}

// "Add manual task" modal. Uses the SAME visual shell as the
// Kanban / Calendar Tasks-screen add modal (`.tk-add-modal-*`
// classes defined in styles/screens/tasks.css) so both surfaces
// present a unified add-task experience -- full-screen backdrop,
// centered dialog, matching typography and buttons. Only the
// fields differ: the Today variant collects the three fields
// needed by the Today task shape (title, type, optional time),
// while Kanban collects title + description + status + priority
// + type + board + due-date.
//
// Field summary:
//   - Task title (required)
//   - Type: POST / OUTREACH / OFFER (chip picker, default POST)
//   - Time estimate (optional -- empty falls back to '30 min')
//
// Submit builds a task object matching the shape produced by
// _seedTodayTasks + `_todayTasks()` so downstream renderers, the
// Ask Clara thread, and the state normalizer all treat it as any
// other Today task.
function _tdRenderAddTaskModal() {
  const types = ['POST', 'OUTREACH', 'OFFER'];
  const chipsHtml = types.map(function (t, idx) {
    const active = idx === 0 ? ' td-add-modal-type-chip-active' : '';
    return ''
      + '<button type="button" class="td-add-modal-type-chip' + active + '"'
      +   ' data-td-add-type="' + t + '"'
      +   ' aria-pressed="' + (idx === 0 ? 'true' : 'false') + '">'
      +   t
      + '</button>';
  }).join('');

  const closeIcon = (typeof window.TK_ICONS !== 'undefined' && window.TK_ICONS.close)
    ? window.TK_ICONS.close
    : '&times;';

  return ''
    + '<div class="tk-add-modal-backdrop td-add-modal-backdrop" id="tdAddModalBackdrop"'
    +      ' role="dialog" aria-modal="true" aria-labelledby="tdAddModalTitle"'
    +      ' aria-hidden="true">'
    +   '<div class="tk-add-modal" id="tdAddModal">'
    +     '<div class="tk-add-modal-head">'
    +       '<h3 class="tk-add-modal-title" id="tdAddModalTitle">New task</h3>'
    +       '<button type="button" class="tk-add-modal-close" id="tdAddModalClose"'
    +         ' aria-label="Close">'
    +         closeIcon
    +       '</button>'
    +     '</div>'
    +     '<div class="tk-add-modal-body">'
    +       '<label class="tk-add-field">'
    +         '<span class="tk-add-field-label">Task *</span>'
    +         '<input type="text" class="tk-add-input" id="tdAddModalTitleInput"'
    +           ' placeholder="What do you want to do?" maxlength="140"'
    +           ' autocomplete="off" />'
    +       '</label>'
    +       '<div class="tk-add-field">'
    +         '<span class="tk-add-field-label">Type</span>'
    +         '<div class="td-add-modal-types" id="tdAddModalTypes" role="group"'
    +              ' aria-label="Task type">'
    +           chipsHtml
    +         '</div>'
    +       '</div>'
    +       '<label class="tk-add-field">'
    +         '<span class="tk-add-field-label">Time estimate (optional)</span>'
    +         '<input type="text" class="tk-add-input"'
    +           ' id="tdAddModalTime" placeholder="e.g. 15 min" maxlength="20"'
    +           ' autocomplete="off" />'
    +       '</label>'
    +     '</div>'
    +     '<div class="tk-add-modal-footer">'
    +       '<button type="button" class="tk-add-modal-cancel" id="tdAddModalCancel">'
    +         'Cancel'
    +       '</button>'
    +       '<button type="button" class="tk-add-modal-save" id="tdAddModalSubmit">'
    +         'Add task'
    +       '</button>'
    +     '</div>'
    +   '</div>'
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

  _tdBindAddTaskModal(scope);
}

// Wire the +Add task pill + modal handlers. Modal is a full-screen
// backdrop + centered dialog (mirrors the Kanban tasks add modal
// -- see `_tkBindAddModal` in src/screens/tasks.js). Open/close is
// driven by an `.td-add-modal-backdrop-open` class on the backdrop
// so we can keep the modal DOM alive between opens and skip the
// _rerenderToday round-trip on typing.
function _tdBindAddTaskModal(scope) {
  const trigger = scope.querySelector('#tdAddTaskBtn');
  const backdrop = scope.querySelector('#tdAddModalBackdrop');
  const modal = scope.querySelector('#tdAddModal');
  if (!trigger || !backdrop || !modal) return;

  const titleInput = backdrop.querySelector('#tdAddModalTitleInput');
  const timeInput = backdrop.querySelector('#tdAddModalTime');
  const closeBtn = backdrop.querySelector('#tdAddModalClose');
  const cancelBtn = backdrop.querySelector('#tdAddModalCancel');
  const submitBtn = backdrop.querySelector('#tdAddModalSubmit');
  const typeChips = backdrop.querySelectorAll('[data-td-add-type]');

  const open = function () {
    backdrop.classList.add('td-add-modal-backdrop-open');
    backdrop.setAttribute('aria-hidden', 'false');
    trigger.setAttribute('aria-expanded', 'true');
    document.body.classList.add('td-add-modal-lock');
    // Focus lands on title input; requestAnimationFrame delays it
    // one paint so the fade-in doesn't clip the focus outline.
    requestAnimationFrame(function () {
      try { titleInput.focus({ preventScroll: true }); } catch (_e) { titleInput.focus(); }
    });
  };

  const close = function () {
    backdrop.classList.remove('td-add-modal-backdrop-open');
    backdrop.setAttribute('aria-hidden', 'true');
    trigger.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('td-add-modal-lock');
    if (titleInput) {
      titleInput.value = '';
      titleInput.classList.remove('td-add-modal-input-error');
    }
    if (timeInput) timeInput.value = '';
    // Reset chip selection to POST (the default).
    typeChips.forEach(function (chip, idx) {
      const active = idx === 0;
      chip.classList.toggle('td-add-modal-type-chip-active', active);
      chip.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    // Return focus to the trigger so keyboard flow doesn't dead-end.
    try { trigger.focus({ preventScroll: true }); } catch (_e) { trigger.focus(); }
  };

  trigger.addEventListener('click', function () {
    if (backdrop.classList.contains('td-add-modal-backdrop-open')) close();
    else open();
  });

  // Click on the backdrop (but NOT on the modal dialog itself)
  // closes the panel -- matches the Kanban add modal's dismiss
  // behaviour so both surfaces feel identical.
  backdrop.addEventListener('click', function (e) {
    if (e.target === backdrop) close();
  });

  if (closeBtn) closeBtn.addEventListener('click', close);
  if (cancelBtn) cancelBtn.addEventListener('click', close);

  typeChips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      typeChips.forEach(function (c) {
        c.classList.remove('td-add-modal-type-chip-active');
        c.setAttribute('aria-pressed', 'false');
      });
      chip.classList.add('td-add-modal-type-chip-active');
      chip.setAttribute('aria-pressed', 'true');
    });
  });

  const handleKey = function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      _tdAddTaskSubmit(backdrop);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  };
  if (titleInput) {
    titleInput.addEventListener('input', function () {
      titleInput.classList.remove('td-add-modal-input-error');
    });
    titleInput.addEventListener('keydown', handleKey);
  }
  if (timeInput) timeInput.addEventListener('keydown', handleKey);
  if (submitBtn) submitBtn.addEventListener('click', function () {
    _tdAddTaskSubmit(backdrop);
  });
}

// Submit handler. Validates the title (only required field),
// builds a task object matching the shape used by _seedTodayTasks
// + the pool factory, pushes it onto concept.today.tasks, saves,
// and re-renders. If validation fails we flash a red outline on
// the title input and bail without closing the modal so the user
// can fix and retry.
function _tdAddTaskSubmit(backdrop) {
  if (!backdrop) return;
  const titleInput = backdrop.querySelector('#tdAddModalTitleInput');
  const timeInput = backdrop.querySelector('#tdAddModalTime');
  const activeChip = backdrop.querySelector('.td-add-modal-type-chip-active');

  const rawTitle = String((titleInput && titleInput.value) || '').trim();
  if (!rawTitle) {
    if (titleInput) {
      titleInput.classList.add('td-add-modal-input-error');
      titleInput.focus();
    }
    return;
  }

  const type = activeChip
    ? String(activeChip.getAttribute('data-td-add-type') || 'POST').toUpperCase()
    : 'POST';
  const rawTime = String((timeInput && timeInput.value) || '').trim();
  const time = rawTime || '30 min';

  const c = getActiveConcept();
  if (!c) return;
  if (!c.today) c.today = { tasks: [], viewingTaskId: null, viewingInsightId: null };
  if (!Array.isArray(c.today.tasks)) c.today.tasks = [];

  const task = {
    id: 'manual-' + Date.now(),
    description: rawTitle,
    type: type,
    time: time,
    status: 'todo',
    source: 'manual',
    approved: false,
    discarded: false,
    thread: [],
    personaId: getDefaultPersonaId(c),
    reason: 'You added this task yourself.'
  };
  c.today.tasks.push(task);

  // If the current filter would hide the new task (which always
  // ships as status:'todo'), silently reset to 'all' so the user
  // actually sees what they just added instead of an unchanged
  // filtered view. 'all' and 'todo' filters both show the task, so
  // we leave them alone in that case.
  const filter = _tdListFilterCurrent();
  if (filter !== 'all' && filter !== 'todo') {
    _tdListFilterSet('all');
  }

  document.body.classList.remove('td-add-modal-lock');
  _saveState();

  // Stash the new task id on the module so the post-render hook
  // knows which row to scroll to + flash. Cleared inside
  // _tdFocusJustAddedRow after it consumes the value, so a plain
  // re-render (status change, discard, filter click) never re-fires
  // the flash animation. See _tdFocusJustAddedRow for the scroll
  // + highlight sequence.
  _tdJustAddedTaskId = task.id;
  _rerenderToday();
  _tdFocusJustAddedRow();
}

// Consumes `_tdJustAddedTaskId` set by the add-task submit handler
// and, if the row for that id exists in the freshly-rendered DOM,
// smooth-scrolls it into view and plays the amber pulse animation.
// Wrapped in requestAnimationFrame so the browser has painted the
// new row before we ask it to scroll -- otherwise Chrome sometimes
// scrolls to where the row USED to be. The highlight class is
// removed after the animation completes so subsequent renders
// don't accidentally re-run it.
let _tdJustAddedTaskId = null;
function _tdFocusJustAddedRow() {
  const id = _tdJustAddedTaskId;
  _tdJustAddedTaskId = null;
  if (!id) return;
  requestAnimationFrame(function () {
    const row = document.querySelector(
      '[data-task-id="' + id.replace(/"/g, '\\"') + '"]'
    );
    if (!row) return;
    try {
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (_e) {
      // Older browsers that ignore the options object fall back
      // to a plain scrollIntoView -- still gets the row on-screen.
      row.scrollIntoView();
    }
    row.classList.add('td-row-just-added');
    // Match the highlight animation duration in today.css. Adding
    // 200ms of slack so the class removal never clips the tail
    // frames on slower machines.
    setTimeout(function () {
      row.classList.remove('td-row-just-added');
    }, 1800);
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
function _tdPersonaBadgeHtml(task) {
  const persona = (typeof getPersonaForTask === 'function')
    ? getPersonaForTask(task)
    : { name: 'Ideal customer' };
  const name = String((persona && persona.name) || 'Ideal customer');
  return ''
    + '<div class="td-persona-badge" role="status">'
    +   '<span class="td-persona-badge-label">For:</span> '
    +   '<span class="td-persona-badge-name">' + _escape(name) + '</span>'
    + '</div>';
}

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
  // Discard is now a muted-red text link (no icon). Inline styles
  // override the legacy .td-row-discard rule that sized it as a
  // 26x26 hover-reveal icon slot: we want a persistently visible
  // text affordance sized to its content in danger red. The
  // .td-row-discard class stays on the element so the existing
  // click handler binding via querySelector('.td-row-discard') still
  // wires up without extra plumbing.
  //
  // Approve is a commitment ("yes, I plan to do this today") so
  // once a task is approved, Discard is suppressed too \u2014 the
  // user already opted in, changing their mind is a status-cycle
  // (mark done / re-open) rather than a discard.
  const discardBtnHtml = (readOnly || task.approved)
    ? ''
    : ''
      + '<button type="button" class="td-row-discard" data-discard="' + _escape(task.id) + '" '
      +   'style="opacity:1;width:auto;height:auto;padding:4px 6px;background:transparent;border:none;color:#E8523C;font-family:inherit;font-size:12px;font-weight:500;letter-spacing:0.01em;cursor:pointer;" '
      +   'aria-label="Discard task \u2014 hide from Today">'
      +   'Discard'
      + '</button>';

  // Approve: small green pill that means "yes I want to do this
  // today". Clicking it flips task.approved to true and re-renders;
  // because the button is only emitted when !task.approved, the
  // subsequent render omits it \u2014 effectively hiding the button
  // after use without a separate hide path. Status stays 'todo'
  // (the whole point per product decision \u2014 approve != done).
  // Suppressed in read-only mode alongside every other write
  // affordance.
  const approveBtnHtml = (readOnly || task.approved)
    ? ''
    : ''
      + '<button type="button" class="td-row-approve" data-approve="' + _escape(task.id) + '" '
      +   'style="background:rgba(76,175,130,0.12);border:1px solid rgba(76,175,130,0.28);color:#4CAF82;border-radius:6px;padding:3px 10px;font-family:inherit;font-size:12px;font-weight:600;letter-spacing:0.01em;cursor:pointer;" '
      +   'aria-label="Approve task \u2014 keep on Today">'
      +   'Approve'
      + '</button>';

  // "Ask Clara" pill \u2014 always visible on live rows (not
  // hover-only, unlike discard was originally). Skips the "Discuss
  // with Clara" trigger button on the detail page and drops focus
  // into the thread input immediately \u2014 the entire flow from
  // "I have a question about this" to "typing to Clara" is one
  // click. Suppressed on read-only past-date rows since those have
  // no live task index to open. Kept live even when task.approved
  // (a user can still want to talk about a task they've committed
  // to) so it never disappears on live rows.
  const askClaraBtnHtml = readOnly
    ? ''
    : ''
      + '<button type="button" class="td-row-ask-clara" data-ask-clara="' + _escape(task.id) + '" '
      +   'aria-label="Ask Clara about this task">'
      +   '<span class="td-row-ask-clara-icon" aria-hidden="true">' + TD_ASK_CLARA_ICON + '</span>'
      +   '<span class="td-row-ask-clara-label">Ask Clara</span>'
      + '</button>';

  row.innerHTML = ''
    + '<span class="td-row-accent" aria-hidden="true"></span>'
    + '<div class="td-row-main">'
    +   statusCheckboxHtml
    +   '<div class="td-row-body">'
    +     '<div class="td-row-desc">' + _escape(task.description) + '</div>'
    +     _tdPersonaBadgeHtml(task)
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
    +     approveBtnHtml
    +     askClaraBtnHtml
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
  const approveBtn = row.querySelector('.td-row-approve');
  const askClaraBtn = row.querySelector('.td-row-ask-clara');

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

  // Approve: mark the task as approved without changing its status.
  // The row stays visible and stays as 'todo' \u2014 approve just
  // records the user's "yes I plan to do this today" signal. The
  // button is only rendered when !task.approved, so re-rendering
  // after the flip naturally removes it (no separate hide path).
  if (approveBtn) {
    approveBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      const active = getActiveConcept();
      if (active && active.today && Array.isArray(active.today.tasks) && active.today.tasks[idx]) {
        active.today.tasks[idx].approved = true;
        _saveState();
      }
      _rerenderToday();
    });
  }

  // "Ask Clara" pill \u2014 shortcut into the task's detail page
  // with the Clara thread pre-opened + input focused. Bypasses
  // the "\u2726 Discuss with Clara" trigger step entirely, so the
  // user goes from "I have a question about this task" to
  // "typing to Clara" in one click.
  //
  // stopPropagation prevents the row's click-to-detail handler
  // from firing a second time \u2014 _openTaskDetail is idempotent
  // in effect but calling it twice would re-seed the opening
  // message which we don't want.
  if (askClaraBtn) {
    askClaraBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      _openTaskDetail(task, { openThread: true });
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

// Open a task's detail view. `opts.openThread`, when true, is the
// signal from the row-level "Ask Clara" pill: seed Clara's opening
// message so the trigger button is skipped and the thread section
// renders expanded, and mark this task for auto-focus on mount so
// the input claims focus as soon as the detail paints. Missing
// `opts` (regular row click) preserves the original behaviour \u2014
// trigger button shown, no auto-focus.
function _openTaskDetail(task, opts) {
  const c = getActiveConcept();
  if (!c || !task) return;
  if (!c.today) c.today = { tasks: [], viewingTaskId: null, viewingInsightId: null };
  // Clear the sibling insight-detail pointer so we never end up with
  // both sub-views pinned in state at once.
  c.today.viewingInsightId = null;
  c.today.viewingTaskId = task.id;

  const wantOpenThread = !!(opts && opts.openThread);

  // Locate the live task record on state so any mutation (thread
  // seed) actually persists. Detail-renderer reads the same idx.
  const idx = c.today.tasks.findIndex(function (t) { return t.id === task.id; });
  if (idx >= 0) {
    const persisted = c.today.tasks[idx];
    if (!Array.isArray(persisted.thread)) persisted.thread = [];

    // "Ask Clara" entry path: seed Clara's opening line right now
    // so the detail render sees a non-empty thread and skips the
    // "\u2726 Discuss with Clara" trigger button. Also survives a
    // mid-conversation reload \u2014 thread.length > 0 keeps the
    // section expanded via the existing render conditional. Guard
    // on length so a repeat click on Ask Clara for the same task
    // doesn't push a duplicate opening.
    if (wantOpenThread
        && persisted.thread.length === 0
        && typeof window._claraThreadOpening === 'function') {
      persisted.thread.push({
        role: 'clara',
        text: window._claraThreadOpening(persisted, c),
        timestamp: Date.now()
      });
    }
  }

  // Focus signal is module-scoped, not persisted. See the comment
  // on _tdPendingThreadFocusTaskId for the reasoning \u2014 a reload
  // shouldn't yank focus.
  _tdPendingThreadFocusTaskId = wantOpenThread ? task.id : null;

  _saveState();
  _rerenderToday();
}

function _closeTaskDetail() {
  const c = getActiveConcept();
  if (!c || !c.today) return;
  c.today.viewingTaskId = null;
  // Defensive: drop any un-consumed auto-focus flag so navigating
  // back to Today then re-opening a task via a plain row click
  // can never inherit the previous open's "Ask Clara" behaviour.
  _tdPendingThreadFocusTaskId = null;
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

// Quick-reply chips rendered above the input. Same visual language
// as the onboarding "Suggestion: ..." pill row -- small amber-
// outlined buttons that pre-fill and send a canonical phrase. The
// phrases here map 1:1 to _clThreadDetectCommand branches in
// clara/threadRespond.js:
//   \u2022 "Change this task"     \u2192 alternative     (regenerate)
//   \u2022 "Make it easier"       \u2192 easier          (gentler variant)
//   \u2022 "Try a different type" \u2192 type-cycle      (POST\u2192OUTREACH\u2192OFFER)
//   \u2022 "Why this task?"       \u2192 why (reply-only, no mutation)
//
// The user is still free to type any prose in the input; chips are
// just the fastest path to the most common debates.
const _TD_THREAD_CHIPS = [
  { label: 'Change this task',     msg: 'Change this task' },
  { label: 'Make it easier',       msg: 'Make it easier' },
  { label: 'Try a different type', msg: 'Try a different type' },
  { label: 'Why this task?',       msg: 'Why this task?' }
];

function _tdThreadChipsHtml() {
  const items = _TD_THREAD_CHIPS.map(function (chip) {
    return '<button type="button" class="td-thread-chip" data-chip-msg="'
         + _escape(chip.msg) + '">'
         +   _escape(chip.label)
         + '</button>';
  }).join('');
  return '<div class="td-thread-chips" id="tdThreadChips" aria-label="Quick actions">'
       +   items
       + '</div>';
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

    // Legacy shape: _claraThreadRespond used to return a plain
    // string. New shape returns { text, patch?, closeAndReturn? }
    // so the thread can mutate the task in place ("change this to
    // X", "make it easier", etc). Handle both defensively.
    const rawResp = (typeof window._claraThreadRespond === 'function')
      ? window._claraThreadRespond(raw, task2, c2)
      : 'Got it.';
    const resp = (rawResp && typeof rawResp === 'object')
      ? rawResp
      : { text: String(rawResp || 'Got it.'), patch: null, closeAndReturn: false };

    // Apply mutation FIRST so the confirmation message immediately
    // reflects the new state on save. Everything on the patch is a
    // plain field write; anything starting with an underscore
    // (_altIdx, _authored) is internal bookkeeping consumed by the
    // next command build. See _claraThreadBuildPatch for the shape.
    if (resp.patch && typeof resp.patch === 'object') {
      const keys = Object.keys(resp.patch);
      for (let k = 0; k < keys.length; k++) {
        const key = keys[k];
        task2[key] = resp.patch[key];
      }
    }

    const claraMsg = { role: 'clara', text: resp.text, timestamp: Date.now() };
    task2.thread.push(claraMsg);
    _saveState();

    listEl.insertAdjacentHTML('beforeend', _tdThreadBubbleHtml(claraMsg));
    _tdThreadScrollToBottom(listEl, true);

    _tdThreadState.sending = false;

    // If the response is a task-update (rewrite / alternative /
    // easier / type-swap), close the detail after a short beat so
    // the user can read the confirmation, then land back on Today
    // with a smooth-scroll + amber flash on the updated row. Same
    // focus mechanism the add-task modal uses, so the "here's your
    // new task" affordance stays consistent across surfaces.
    if (resp.closeAndReturn) {
      setTimeout(function () {
        // Guard the same way the outer 800ms guard does: the user
        // could have navigated away or discarded the task since
        // the reply landed. In either case just bail; the patch is
        // already saved, so nothing is lost.
        const c3 = getActiveConcept();
        if (!c3 || !c3.today) return;
        const stillExists = Array.isArray(c3.today.tasks)
          && c3.today.tasks.some(function (t) { return t && t.id === taskId; });
        if (!stillExists) return;

        _tdJustAddedTaskId = taskId;
        _closeTaskDetail();
        _tdFocusJustAddedRow();
      }, 1200);
    }
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
    // Trigger button \u2014 only rendered when the transcript is
    // empty. Clicking it seeds Clara's opening line and slides
    // the thread section open. Users returning to a task with
    // existing history skip the button entirely (see below,
    // `hasThread` branch after the innerHTML assignment).
    +   (Array.isArray(task.thread) && task.thread.length > 0
      ? ''
      : '<button type="button" class="td-thread-trigger" id="tdThreadTrigger">\u2726 Discuss with Clara</button>')
    // Thread section always rendered so the form handler can bind
    // at mount time. Starts collapsed (max-height 0, opacity 0)
    // when no history exists; the trigger click removes the
    // collapsed class and the CSS transition takes it from there.
    +   '<div class="td-detail-section td-thread-section'
    +     (Array.isArray(task.thread) && task.thread.length > 0 ? '' : ' td-thread-section-collapsed')
    +     '" id="tdThreadSection">'
    +     '<div class="td-thread-label">Discuss with Clara</div>'
    +     '<div class="td-thread-list" id="tdThreadList" data-task-id="' + _escape(task.id) + '"></div>'
    +     _tdThreadChipsHtml()
    +     '<form class="td-thread-input-row" id="tdThreadForm" autocomplete="off">'
    +       '<input type="text" class="td-thread-input" id="tdThreadInput" '
    +         'placeholder="Ask Clara about this task, or say \u201cchange it\u201d\u2026" '
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

    // Chip row: clicking any pill drops the canonical phrase into
    // the input and fires the same send flow as a keyboard submit.
    // Guarded by the shared `_tdThreadState.sending` flag inside
    // _tdThreadHandleSend so mashing chips never double-sends.
    const chipsHost = document.getElementById('tdThreadChips');
    if (chipsHost) {
      chipsHost.addEventListener('click', function (e) {
        const chip = e.target.closest('.td-thread-chip');
        if (!chip) return;
        if (_tdThreadState.sending) return;
        const phrase = chip.getAttribute('data-chip-msg') || '';
        if (!phrase) return;
        threadInputEl.value = phrase;
        _tdThreadHandleSend(task.id, threadListEl, threadInputEl);
      });
    }
  }

  // ------------------------------------------------------------
  // Auto-focus the thread input when the detail was opened via
  // the row-level "Ask Clara" pill. The pending flag is consumed
  // here (cleared after the setTimeout is scheduled) so a re-
  // render or navigation-back cycle can't re-fire the focus grab.
  //
  // The 60ms delay is a hedge against the browser's own focus
  // management \u2014 the previous focus target (the row that was
  // clicked) is still being unmounted synchronously, and some
  // browsers restore focus to <body> before honouring our
  // programmatic focus() call. A short queue-jump avoids that.
  // ------------------------------------------------------------
  if (_tdPendingThreadFocusTaskId === task.id && threadInputEl) {
    _tdPendingThreadFocusTaskId = null;
    setTimeout(function () {
      // Guard against the input being unmounted between the
      // scheduling and the fire (e.g. concept switch mid-flight).
      const live = document.getElementById('tdThreadInput');
      if (!live) return;
      try { live.focus({ preventScroll: true }); }
      catch (_) { live.focus(); }
    }, 60);
  }

  // ------------------------------------------------------------
  // "\u2726 Discuss with Clara" trigger. Rendered only when the
  // thread is empty; clicking it seeds Clara's opening line,
  // reveals the thread section (CSS transition), hides itself,
  // and drops focus into the input. No collapse-back path \u2014
  // once the user opens the chat it stays open for the session.
  // ------------------------------------------------------------
  const triggerBtn = document.getElementById('tdThreadTrigger');
  const threadSection = document.getElementById('tdThreadSection');
  if (triggerBtn) {
    triggerBtn.addEventListener('click', function () {
      const active = getActiveConcept();
      const liveIdx = active && active.today && Array.isArray(active.today.tasks)
        ? active.today.tasks.findIndex(function (t) { return t && t.id === task.id; })
        : -1;
      if (liveIdx >= 0) {
        const persisted = active.today.tasks[liveIdx];
        if (!Array.isArray(persisted.thread)) persisted.thread = [];
        // Only seed if still empty \u2014 a defensive guard against
        // a double-click racing to insert two openings.
        if (persisted.thread.length === 0 && typeof window._claraThreadOpening === 'function') {
          persisted.thread.push({
            role: 'clara',
            text: window._claraThreadOpening(persisted, active),
            timestamp: Date.now()
          });
          _saveState();
        }
        // Repaint the list with the freshly-seeded message so
        // the transition reveals a populated transcript, not an
        // empty box the user has to wait for.
        if (threadListEl) {
          _tdThreadRenderList(threadListEl, persisted.thread);
          _tdThreadScrollToBottom(threadListEl, false);
        }
      }
      // Reveal + hide the trigger. display:none removes it from
      // the layout so the thread section slides into its slot
      // cleanly. Focus lands on the input after the 300ms
      // transition finishes so the browser doesn't try to
      // scroll it into view while it's still 0px tall.
      if (threadSection) threadSection.classList.remove('td-thread-section-collapsed');
      triggerBtn.style.display = 'none';
      if (threadInputEl) setTimeout(function () { threadInputEl.focus(); }, 320);
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
