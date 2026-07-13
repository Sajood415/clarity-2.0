// ---------------------------------------------
// Clarity 2.0 — Today View
// ---------------------------------------------
//
// Two visual modes sharing the same underlying task data:
//   \u2022 List (default)  \u2014 flat full-width rows separated by 1px borders,
//                         each with a 3px accent bar down the left edge
//                         colour-coded by task type (POST / OUTREACH / OFFER)
//   \u2022 Kanban          \u2014 three columns (TO DO / IN PROGRESS / DONE)
//                         with HTML5 drag-and-drop between columns
//
// Task content and copy come from `_todayTasks()` unchanged. On first
// render for a concept, the generated tasks are seeded into
// `concept.today.tasks` with `status: 'todo'` and persisted, so any
// user-driven status changes (list status-circle cycles, kanban drags)
// survive across renders, tab switches, and reloads.
//
// The view choice is a global UI preference (`appState.today.view`)
// so the user's list-vs-kanban pick sticks across concepts.

// ---------------------------------------------
// Icons
// ---------------------------------------------

const TD_LIST_ICON = ''
  + '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">'
  +   '<path d="M2 3.5 H12 M2 7 H12 M2 10.5 H12"/>'
  + '</svg>';

const TD_KANBAN_ICON = ''
  + '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round">'
  +   '<rect x="1.5" y="2.5" width="3" height="9" rx="0.5"/>'
  +   '<rect x="5.5" y="2.5" width="3" height="9" rx="0.5"/>'
  +   '<rect x="9.5" y="2.5" width="3" height="9" rx="0.5"/>'
  + '</svg>';

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

const TD_KANBAN_COLS = [
  { id: 'todo',        label: 'TO DO' },
  { id: 'in_progress', label: 'IN PROGRESS' },
  { id: 'done',        label: 'DONE' }
];

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

  _seedTodayTasks(c);
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

  const view = _currentTodayView();
  const isKanban = view === 'kanban';

  const listBtn = _renderTdViewBtn('list', view);
  const kanbanBtn = _renderTdViewBtn('kanban', view);

  // Insight card sits between the greeting/heading and the task list
  // when it hasn't been dismissed for the day AND we actually have
  // insights to render. Otherwise the whole block collapses to zero
  // height and the tasks slide up as if nothing was there.
  const showInsights = _shouldRenderInsights(c);
  const insightMarkup = showInsights ? _renderTdInsightCard(c.today.insights[0]) : '';

  container.innerHTML = `
    <section class="td-wrap${isKanban ? ' td-wrap-kanban' : ''}">
      <div class="td-top">
        <div class="td-top-text">
          <div class="td-greeting">${_greeting()}</div>
          <h1 class="td-heading">Here\u2019s what Clara thinks you should focus on today.</h1>
        </div>
        <div class="td-view-toggle" role="tablist" aria-label="Today view">
          ${listBtn}
          ${kanbanBtn}
        </div>
      </div>
      ${insightMarkup}
      <div id="tdBody"></div>
      <div class="td-footer-note">Clara updates these every day based on what\u2019s working.</div>
      <a class="td-manage-tasks" id="tdManageTasks" role="button" tabindex="0">Manage all tasks \u2192</a>
    </section>
  `;

  _bindTdViewToggle(container);
  _bindTdManageTasks(container);
  if (showInsights) _bindTdInsightCard(container, c);

  const body = container.querySelector('#tdBody');
  if (isKanban) _renderTdKanban(body, c);
  else _renderTdList(body, c);
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
// State helpers
// ---------------------------------------------

function _currentTodayView() {
  if (!appState.today) appState.today = { view: 'list' };
  return appState.today.view === 'kanban' ? 'kanban' : 'list';
}

function _setTodayView(next) {
  if (next !== 'list' && next !== 'kanban') return;
  if (!appState.today) appState.today = { view: 'list' };
  if (appState.today.view === next) return;
  appState.today.view = next;
  _saveState();
}

// Seed the concept's persistent task list from the generator, once.
// Also handles legacy state where `today.tasks` is missing.
function _seedTodayTasks(c) {
  if (!c.today) c.today = { tasks: [], viewingTaskId: null, viewingInsightId: null };
  if (!Array.isArray(c.today.tasks)) c.today.tasks = [];
  if (c.today.tasks.length > 0) return;

  const fresh = _todayTasks().map(function (t) {
    // `discarded` is stamped on at seed time so downstream code can
    // trust the field exists (list + kanban renderers filter by it).
    // `approved` is the "yes, I want to do this today" flag toggled
    // by the card's Approve button \u2014 initially false. The state
    // normalizer backfills both fields for legacy tasks that were
    // seeded before these flags existed.
    return Object.assign({}, t, { status: 'todo', discarded: false, approved: false });
  });
  c.today.tasks = fresh;
  _saveState();
}

// Single source of truth for status writes. Called from the kanban drop
// handler and from the list-view status checkbox. Returns true if the
// status actually changed (so callers know whether to re-render).
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

// Re-render the whole Today view (the shell + toggle + list/kanban).
// Used after a status change so both views stay in sync regardless
// of which one the user is looking at.
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

// ---------------------------------------------
// View toggle
// ---------------------------------------------

function _renderTdViewBtn(view, current) {
  const active = view === current;
  const cls = 'td-view-btn' + (active ? ' td-view-btn-active' : '');
  const icon = view === 'list' ? TD_LIST_ICON : TD_KANBAN_ICON;
  const label = view === 'list' ? 'List view' : 'Kanban view';
  return ''
    + '<button type="button" class="' + cls + '"'
    +   ' data-td-view="' + view + '"'
    +   ' aria-label="' + label + '"'
    +   ' aria-pressed="' + (active ? 'true' : 'false') + '"'
    + '>' + icon + '</button>';
}

function _bindTdViewToggle(scope) {
  const buttons = scope.querySelectorAll('[data-td-view]');
  buttons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      const next = btn.getAttribute('data-td-view');
      const current = _currentTodayView();
      if (next === current) return;
      _setTodayView(next);
      renderToday(scope);
    });
  });
}

// "Manage all tasks \u2192" is the only entry point to the full task
// workspace (Tasks isn't in the sidebar nav). Clicking or Enter/Space
// activation flips the active view to 'tasks'; the router mounts the
// Tasks screen inside the existing dashboard shell.
function _bindTdManageTasks(scope) {
  const link = scope.querySelector('#tdManageTasks');
  if (!link) return;
  const go = function () {
    setActiveView('tasks');
    renderApp();
  };
  link.addEventListener('click', go);
  link.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      go();
    }
  });
}

// ---------------------------------------------
// List view
// ---------------------------------------------

function _renderTdList(container, c) {
  container.innerHTML = '<div class="td-rows" id="tdRows"></div>';
  const wrap = container.querySelector('#tdRows');
  // Skip discarded tasks: `task.discarded` hides a row from the Today
  // view only (the underlying task record stays on the concept). We
  // keep the *original* idx when building each row so status-cycle
  // and discard writes still land on the right slot in
  // `c.today.tasks` after filtering.
  c.today.tasks.forEach(function (task, idx) {
    if (task && task.discarded) return;
    wrap.appendChild(_buildTdListCard(task, idx));
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
function _buildTdListCard(task, idx) {
  const status = _resolveStatus(task.status);
  const done = status === 'done';
  const type = String(task.type || '').toUpperCase();

  const row = document.createElement('div');
  row.className = 'td-row' + (done ? ' td-row-done' : '');
  row.setAttribute('data-task-id', task.id);
  row.setAttribute('data-type', type);

  // Layout, left to right (inside .td-row-main):
  //   [3px accent bar] \u2014 absolute, spans full row height
  //   [status circle]  \u2014 24px, cycles todo/in_progress/done
  //   [body]           \u2014 description + meta (TYPE \u00b7 time)
  //   [actions]        \u2014 \u00d7 discard (hover-reveal)
  row.innerHTML = ''
    + '<span class="td-row-accent" aria-hidden="true"></span>'
    + '<div class="td-row-main">'
    +   _renderStatusCheckbox(status, idx)
    +   '<div class="td-row-body">'
    +     '<div class="td-row-desc">' + _escape(task.description) + '</div>'
    +     '<div class="td-row-meta">'
    +       '<span class="td-row-meta-type">' + _escape(type) + '</span>'
    +       '<span class="td-row-meta-sep" aria-hidden="true">\u00b7</span>'
    +       '<span class="td-row-meta-time">'
    +         '<span class="td-row-meta-time-icon" aria-hidden="true">' + TD_CLOCK_ICON + '</span>'
    +         '<span class="td-row-meta-time-text">' + _escape(task.time) + '</span>'
    +       '</span>'
    +     '</div>'
    +   '</div>'
    +   '<div class="td-row-actions">'
    +     '<button type="button" class="td-row-discard" data-discard="' + _escape(task.id) + '" aria-label="Discard task \u2014 hide from Today">'
    +       '<span class="td-row-discard-icon" aria-hidden="true">' + TD_DISCARD_ICON + '</span>'
    +     '</button>'
    +   '</div>'
    + '</div>';

  const statusBtn = row.querySelector('.td-status-btn');
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

  // Discard: fade the row out without deleting the underlying task.
  // Flag `task.discarded = true`, persist, then re-render \u2014
  // _renderTdList / _renderTdKanban both skip discarded rows. The
  // 240ms delay matches the CSS keyframes so the fade finishes
  // before the re-render swaps DOM out from under it.
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

// ---------------------------------------------
// Kanban view
// ---------------------------------------------

function _renderTdKanban(container, c) {
  container.innerHTML = '<div class="td-kanban">'
    + TD_KANBAN_COLS.map(function (col) {
      return ''
        + '<div class="td-kanban-col" data-td-col="' + col.id + '">'
        +   '<div class="td-kanban-col-header">' + col.label + '</div>'
        +   '<div class="td-kanban-col-body" data-td-col-body="' + col.id + '"></div>'
        + '</div>';
    }).join('')
    + '</div>';

  // Populate columns based on each task's current status. Fall back to
  // 'todo' for any task missing / with an unknown status. Discarded
  // tasks are skipped here for parity with the list view \u2014 the flag
  // hides the task from all Today surfaces, not just the list.
  c.today.tasks.forEach(function (task, idx) {
    if (task && task.discarded) return;
    const status = _resolveStatus(task.status);
    const body = container.querySelector('[data-td-col-body="' + status + '"]');
    if (!body) return;
    body.appendChild(_buildTdKanbanCard(task, idx));
  });

  // Column drop targets
  const cols = container.querySelectorAll('[data-td-col]');
  cols.forEach(function (col) {
    col.addEventListener('dragover', function (e) {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
      col.classList.add('td-kanban-col-hover');
    });
    col.addEventListener('dragenter', function (e) {
      e.preventDefault();
      col.classList.add('td-kanban-col-hover');
    });
    col.addEventListener('dragleave', function (e) {
      // Only clear the hover state when leaving the column itself, not
      // when the cursor crosses into a child element.
      if (col.contains(e.relatedTarget)) return;
      col.classList.remove('td-kanban-col-hover');
    });
    col.addEventListener('drop', function (e) {
      e.preventDefault();
      col.classList.remove('td-kanban-col-hover');

      const raw = e.dataTransfer ? e.dataTransfer.getData('text/plain') : '';
      const idx = parseInt(raw, 10);
      if (isNaN(idx)) return;

      const nextStatus = col.getAttribute('data-td-col');
      if (!_setTaskStatus(idx, nextStatus)) return;

      const active = getActiveConcept();
      if (active) _renderTdKanban(container, active);
    });
  });
}

function _buildTdKanbanCard(task, idx) {
  const status = _resolveStatus(task.status);
  const done = status === 'done';

  const card = document.createElement('div');
  card.className = 'td-kanban-card' + (done ? ' td-kanban-card-done' : '');
  card.setAttribute('draggable', 'true');
  card.setAttribute('data-task-idx', String(idx));

  card.innerHTML = ''
    + '<div class="td-kanban-card-top">'
    +   '<div class="td-type-chip" data-type="' + task.type + '">' + task.type + '</div>'
    +   (done ? '<span class="td-kanban-check" aria-hidden="true">' + TD_CHECK_ICON + '</span>' : '')
    + '</div>'
    + '<div class="td-kanban-card-desc">' + _escape(task.description) + '</div>'
    + '<div class="td-kanban-card-time">' + _escape(task.time) + '</div>';

  // Track whether the current pointer interaction was a drag so a
  // stray `click` right after `dragend` doesn't hijack us into Create.
  let dragged = false;

  card.addEventListener('dragstart', function (e) {
    dragged = true;
    if (e.dataTransfer) {
      e.dataTransfer.setData('text/plain', String(idx));
      e.dataTransfer.effectAllowed = 'move';
    }
    card.classList.add('td-kanban-card-dragging');
  });
  card.addEventListener('dragend', function () {
    card.classList.remove('td-kanban-card-dragging');
    // Reset on the next tick so the ensuing `click` (if any) is ignored.
    setTimeout(function () { dragged = false; }, 0);
  });

  card.addEventListener('click', function () {
    if (dragged) return;
    _openTaskDetail(task);
  });

  return card;
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
    +   '<div class="td-detail-actions">'
    +     primaryActionHtml
    +     '<button type="button" class="td-detail-action-secondary" id="tdDetailToggleDone">' + secondaryLabel + '</button>'
    +   '</div>'
    + '</section>';

  const backBtn = document.getElementById('tdDetailBack');
  if (backBtn) backBtn.addEventListener('click', _closeTaskDetail);

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
