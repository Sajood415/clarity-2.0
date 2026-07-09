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

  _seedTodayTasks(c);

  const view = _currentTodayView();
  const isKanban = view === 'kanban';

  const listBtn = _renderTdViewBtn('list', view);
  const kanbanBtn = _renderTdViewBtn('kanban', view);

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
      <div id="tdBody"></div>
      <div class="td-footer-note">Clara updates these every day based on what\u2019s working.</div>
    </section>
  `;

  _bindTdViewToggle(container);

  const body = container.querySelector('#tdBody');
  if (isKanban) _renderTdKanban(body, c);
  else _renderTdList(body, c);
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

  card.addEventListener('click', function () { _openTaskInCreate(task); });

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
    _openTaskInCreate(task);
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
  create.fromTask = task;
  create.type = 'post';
  create.platform = getBusiness().reach === 'local' ? 'instagram' : 'linkedin';
  appState.activeView = 'create';
  _saveState();
  renderApp();
}

window.renderToday = renderToday;
