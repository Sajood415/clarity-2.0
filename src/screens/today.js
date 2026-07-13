// ---------------------------------------------
// Clarity 2.0 — Today View
// ---------------------------------------------
//
// Two visual modes sharing the same underlying task data:
//   \u2022 List (default)  \u2014 the original stacked task cards
//   \u2022 Kanban          \u2014 three columns (TO DO / IN PROGRESS / DONE)
//                         with HTML5 drag-and-drop between columns
//
// Task content and card copy come from `_todayTasks()` unchanged. On
// first render for a concept, the generated tasks are seeded into
// `concept.today.tasks` with `status: 'todo'` and persisted, so any
// user-driven status changes (kanban drags) survive across renders,
// tab switches, and reloads.
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

  // Defensive: if a Daily Insight drawer is still mounted from a
  // previous render (e.g. concept switch mid-drawer), tear it down so
  // it doesn't linger on top of the new render's content.
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

  // Task-detail sub-view. If the user has tapped a task, render Clara's
  // step-by-step guide for that task instead of the list/kanban shell.
  // Falls through cleanly if the id no longer matches (e.g. the task
  // list regenerated between renders) — we just clear the pointer.
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
// Daily insight card + detail drawer
// ---------------------------------------------
//
// The card mounts above the task list on the main Today view (not on
// the task-detail sub-view). Clicking anywhere on the card body opens
// a drawer with the full stat, source, and 3 "what this means for
// you" bullets. Clicking "Skip for today \u2192" dismisses just for the
// current calendar day; next day the card reappears with fresh
// insights via the seeder in clara/insights.js.

// Right-arrow SVG used as the hover affordance on the card. Matches
// the muted \u2192 glyph style used elsewhere in the today view.
const TD_INSIGHT_ARROW_SVG = ''
  + '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" '
  +   'stroke="currentColor" stroke-width="1.5" stroke-linecap="round" '
  +   'stroke-linejoin="round">'
  +   '<path d="M2.5 7 H11 M7.5 3.5 L11 7 L7.5 10.5"/>'
  + '</svg>';

// X close icon for the drawer.
const TD_INSIGHT_CLOSE_SVG = ''
  + '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" '
  +   'stroke="currentColor" stroke-width="1.5" stroke-linecap="round">'
  +   '<path d="M4 4 L12 12 M12 4 L4 12"/>'
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
// the card and open the drawer.
function _bindTdInsightCard(scope, c) {
  const card = scope.querySelector('#tdInsightCard');
  const skip = scope.querySelector('#tdInsightSkip');
  if (!card) return;

  const openDrawer = function () {
    const insight = c && c.today && Array.isArray(c.today.insights)
      ? c.today.insights[0]
      : null;
    if (!insight) return;
    // Flip seen=true the first time the user opens the detail. Idempotent
    // \u2014 the helper no-ops when the flag is already set.
    if (typeof window._markInsightSeen === 'function') {
      try { window._markInsightSeen(c, insight.id); } catch (_err) { /* ignore */ }
    }
    _openTdInsightDrawer(insight);
  };

  card.addEventListener('click', openDrawer);
  card.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openDrawer();
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

// Renders the detail drawer for a single insight. Mounts into the
// document body (not the today container) so its fixed-position
// backdrop can cover the whole viewport regardless of scroll state.
// Also traps focus loosely by moving focus to the drawer container on
// open and returning it to the trigger on close.
function _openTdInsightDrawer(insight) {
  _closeTdInsightDrawer();
  if (!insight) return;

  const bullets = Array.isArray(insight.bullets) ? insight.bullets : [];
  const bulletsHtml = bullets.map(function (b) {
    return ''
      + '<li class="td-insight-drawer-bullet">'
      +   '<span class="td-insight-drawer-bullet-dot" aria-hidden="true"></span>'
      +   '<span class="td-insight-drawer-bullet-text">' + _escape(b) + '</span>'
      + '</li>';
  }).join('');

  const backdrop = document.createElement('div');
  backdrop.className = 'td-insight-drawer-backdrop';
  backdrop.id = 'tdInsightDrawer';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.setAttribute('aria-label', 'Daily Insight detail');
  backdrop.innerHTML = ''
    + '<div class="td-insight-drawer" tabindex="-1">'
    +   '<button type="button" class="td-insight-drawer-close" aria-label="Close" id="tdInsightDrawerClose">'
    +     TD_INSIGHT_CLOSE_SVG
    +   '</button>'
    +   '<div class="td-insight-drawer-kicker">DAILY INSIGHT</div>'
    +   '<h2 class="td-insight-drawer-headline">' + _escape(insight.headline || '') + '</h2>'
    +   '<p class="td-insight-drawer-stat">' + _escape(insight.stat || '') + '</p>'
    +   '<div class="td-insight-drawer-source">' + _escape(insight.source || '') + '</div>'
    +   '<div class="td-insight-drawer-divider" aria-hidden="true"></div>'
    +   '<div class="td-insight-drawer-bullets-label">What this means for you</div>'
    +   '<ul class="td-insight-drawer-bullets">' + bulletsHtml + '</ul>'
    + '</div>';
  document.body.appendChild(backdrop);

  // Trigger the slide-up + fade-in on the next frame so the initial
  // "hidden" state gets committed to layout first \u2014 otherwise
  // browsers may skip the animation entirely.
  requestAnimationFrame(function () {
    backdrop.classList.add('td-insight-drawer-open');
  });

  // Focus the drawer for keyboard users so Tab / Escape land here.
  const inner = backdrop.querySelector('.td-insight-drawer');
  if (inner) inner.focus();

  // Backdrop click (outside the drawer body) closes.
  backdrop.addEventListener('click', function (e) {
    if (e.target === backdrop) _closeTdInsightDrawer();
  });
  const closeBtn = backdrop.querySelector('#tdInsightDrawerClose');
  if (closeBtn) closeBtn.addEventListener('click', _closeTdInsightDrawer);

  // Escape-to-close. Removed on drawer close so no dangling listeners.
  const keyHandler = function (e) {
    if (e.key === 'Escape' || e.key === 'Esc') {
      _closeTdInsightDrawer();
    }
  };
  document.addEventListener('keydown', keyHandler);
  backdrop.__tdKeyHandler = keyHandler;
}

function _closeTdInsightDrawer() {
  const existing = document.getElementById('tdInsightDrawer');
  if (!existing) return;
  if (existing.__tdKeyHandler) {
    document.removeEventListener('keydown', existing.__tdKeyHandler);
    existing.__tdKeyHandler = null;
  }
  existing.classList.remove('td-insight-drawer-open');
  // Match the CSS transition duration so the removal happens after
  // the fade completes. Kept as a bare setTimeout \u2014 the drawer
  // is short-lived so we don't need to track the handle for teardown.
  setTimeout(function () {
    if (existing.parentNode) existing.parentNode.removeChild(existing);
  }, 220);
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
  if (!c.today) c.today = { tasks: [] };
  if (!Array.isArray(c.today.tasks)) c.today.tasks = [];
  if (c.today.tasks.length > 0) return;

  const fresh = _todayTasks().map(function (t) {
    return Object.assign({}, t, { status: 'todo' });
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
  container.innerHTML = '<div class="td-cards" id="tdCards"></div>';
  const wrap = container.querySelector('#tdCards');
  c.today.tasks.forEach(function (task, idx) {
    wrap.appendChild(_buildTdListCard(task, idx));
  });
}

function _buildTdListCard(task, idx) {
  const status = _resolveStatus(task.status);
  const done = status === 'done';

  const card = document.createElement('div');
  card.className = 'td-card' + (done ? ' td-card-done' : '');
  card.setAttribute('data-task-id', task.id);

  card.innerHTML = `
    <div class="td-card-head">
      <div class="td-card-type" data-type="${task.type}">${task.type}</div>
      ${done ? `<span class="td-card-done-check" aria-hidden="true">${TD_CHECK_ICON}</span>` : ''}
    </div>
    <div class="td-card-desc">${_escape(task.description)}</div>
    <div class="td-card-bottom">
      <div class="td-card-bottom-left">
        ${_renderStatusCheckbox(status, idx)}
        <span class="td-card-time">${_escape(task.time)}</span>
      </div>
      <span class="td-card-why" data-why="${task.id}">Why this?</span>
    </div>
    <div class="td-card-reason" data-reason="${task.id}">
      <div class="td-card-reason-inner">${_escape(task.reason)}</div>
    </div>
  `;

  const why = card.querySelector('.td-card-why');
  const reason = card.querySelector('.td-card-reason');
  const statusBtn = card.querySelector('.td-status-btn');

  why.addEventListener('click', function (e) {
    e.stopPropagation();
    reason.classList.toggle('td-card-reason-open');
  });

  // Status checkbox: cycles todo \u2192 in_progress \u2192 done \u2192 todo.
  // Stops propagation so clicking the circle doesn't also fire the
  // card's click-to-Create handler.
  if (statusBtn) {
    statusBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (_cycleTaskStatus(idx)) _rerenderToday();
    });
  }

  card.addEventListener('click', function () { _openTaskDetail(task); });

  return card;
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
  // 'todo' for any task missing / with an unknown status.
  c.today.tasks.forEach(function (task, idx) {
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
    +   '<div class="td-card-type" data-type="' + task.type + '">' + task.type + '</div>'
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
  if (!c.today) c.today = { tasks: [], viewingTaskId: null };
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

function _renderTdDetail(container, task, c) {
  const idx = c.today.tasks.findIndex(function (t) { return t.id === task.id; });
  const status = _resolveStatus(task.status);
  const done = status === 'done';
  const steps = _taskSteps(task);

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

  const secondaryLabel = done ? 'Mark as to-do' : 'Mark as done';

  container.innerHTML = ''
    + '<section class="td-wrap td-wrap-detail' + (done ? ' td-wrap-detail-done' : '') + '">'
    +   '<button type="button" class="td-detail-back" id="tdDetailBack">\u2190 Back to Today</button>'
    +   '<div class="td-detail-head">'
    +     '<div class="td-card-type td-detail-type" data-type="' + _escape(task.type) + '">' + _escape(task.type) + '</div>'
    +     doneBadge
    +     '<span class="td-detail-time">' + _escape(task.time || '') + '</span>'
    +   '</div>'
    +   '<h1 class="td-detail-title">' + _escape(task.description) + '</h1>'
    +   '<div class="td-detail-reason">'
    +     '<div class="td-detail-reason-label">Why Clara picked this</div>'
    +     '<div class="td-detail-reason-body">' + _escape(task.reason) + '</div>'
    +   '</div>'
    +   '<div class="td-detail-steps-head">Clara\u2019s step-by-step</div>'
    +   '<ol class="td-detail-steps">' + stepsHtml + '</ol>'
    +   '<div class="td-detail-actions">'
    +     '<button type="button" class="td-detail-action-primary" id="tdDetailOpenCreate">Open in Create \u2192</button>'
    +     '<button type="button" class="td-detail-action-secondary" id="tdDetailToggleDone">' + secondaryLabel + '</button>'
    +   '</div>'
    + '</section>';

  const backBtn = document.getElementById('tdDetailBack');
  if (backBtn) backBtn.addEventListener('click', _closeTaskDetail);

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
