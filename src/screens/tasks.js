// ---------------------------------------------
// Clarity 2.0 \u2014 Tasks (Jira-style boards, filters, views)
// ---------------------------------------------
//
// Full task-management workspace mounted at the 'tasks' nav item.
// Reads and mutates the active concept's `tasks` block (see state.js
// `_defaultTasks()` for the full shape). No API \u2014 everything is
// mutated in place and persisted via `_saveState()` on every change.
//
// Layout (single-column right col fills the whole screen):
//
//   \u250c\u2500 topbar \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510
//   \u2502 My Tasks              \u2502 search       \u2502 +Add task           \u2502
//   \u251c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524
//   \u2502 Status \u25be   Priority \u25be   Type \u25be   Source \u25be     Clear \u2502
//   \u251c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524
//   \u2502  Board / List / Calendar view body                       \u2502
//   \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518
//
// The old left-side "Boards" panel and per-screen view toggle were
// retired: only the default "My Tasks" board ever exists, and the
// list / board / calendar view is now selected upstream via the
// Today screen's kanban + calendar buttons (which stamp
// `tasks.view` before navigating here). Filters live inline in a
// single row of dropdowns above the view body \u2014 same
// `tasks.filters[dim]` model as before, just a lighter UI.
//
// When a task is opened, a 360px detail panel slides in from the
// right and the main workspace shrinks to accommodate it. There's
// only one visible panel at a time; it edits the same object it
// displays, so every change writes straight through to appState.
//
// Modals (add-task, delete-confirm) live at document.body level so
// they escape any local overflow/transform contexts.

// ---------------------------------------------
// Label maps (single source of truth for user-facing strings)
// ---------------------------------------------

const TK_STATUS_LABELS = {
  todo:       'To Do',
  inprogress: 'In Progress',
  done:       'Done',
  blocked:    'Blocked'
};

const TK_PRIORITY_LABELS = {
  p0: 'P0',
  p1: 'P1',
  p2: 'P2'
};

const TK_PRIORITY_SUBLABELS = {
  p0: 'Urgent',
  p1: 'Important',
  p2: 'Later'
};

const TK_TYPE_LABELS = {
  marketing:  'Marketing',
  sales:      'Sales',
  operations: 'Operations',
  product:    'Product',
  content:    'Content',
  other:      'Other'
};

const TK_SOURCE_LABELS = {
  clara:  'Clara',
  manual: 'Manual'
};

// Kanban column order. Kept as a module constant so board view + drag
// targets + filters always agree on layout.
const TK_STATUS_ORDER = ['todo', 'inprogress', 'done', 'blocked'];
const TK_PRIORITY_ORDER = ['p0', 'p1', 'p2'];
const TK_TYPE_ORDER = ['marketing', 'sales', 'operations', 'product', 'content', 'other'];
const TK_SOURCE_ORDER = ['clara', 'manual'];

// ---------------------------------------------
// Module-scope UI state (drag-drop, sort)
// ---------------------------------------------
//
// These are transient and never persisted. Keeping them out of
// appState avoids a normalize-on-every-mouse-move problem.

const _tkUiState = {
  draggingId: null,
  dragOverStatus: null,
  // { column: 'title'|'status'|'priority'|'type'|'dueDate'|'source', dir: 'asc'|'desc' }
  listSort: { column: 'updatedAt', dir: 'desc' },
  // Absolute origin of the three-dot menu currently open (list row),
  // or null. Anchor is the row so the menu re-positions correctly on
  // scroll / resize.
  menuOpenTaskId: null
};

// ---------------------------------------------
// Public render
// ---------------------------------------------

function renderTasks(container) {
  if (!container) return;
  _tkNormalizeActiveBoard();
  const tasks = getTasks();
  const detailOpen = !!tasks.detailId && _tkFindTask(tasks, tasks.detailId);

  // Single-column layout: the left-side "Boards" panel was retired
  // (the app only ever ships with the default "My Tasks" board, so
  // the board-switching UI carried its own weight for no gain).
  // The right column now owns the entire screen; when the detail
  // panel is open .tk-layout-detail-open swaps in a 1fr + 360px
  // grid to insert the detail column on the right.
  container.innerHTML = ''
    + '<div class="tk-layout' + (detailOpen ? ' tk-layout-detail-open' : '') + '">'
    +   _tkRenderRightCol()
    +   (detailOpen ? _tkRenderDetailPanel(_tkFindTask(tasks, tasks.detailId)) : '')
    + '</div>'
    + (tasks.addModalOpen ? _tkRenderAddModal() : '');

  _tkBindRightCol();
  if (detailOpen) _tkBindDetailPanel();
  if (tasks.addModalOpen) _tkBindAddModal();
  _tkBindGlobalHotkeys();
}

// If active board id points at a board that no longer exists (a rare
// race but possible during a manual state edit), fall back to default
// so the whole screen doesn't render a blank right column.
function _tkNormalizeActiveBoard() {
  const tasks = getTasks();
  const ids = tasks.boards.map(function (b) { return b.id; });
  if (ids.indexOf(tasks.activeBoard) === -1) {
    tasks.activeBoard = 'default';
    _saveState();
  }
}

function _tkFindTask(tasks, id) {
  if (!id) return null;
  return tasks.items.find(function (t) { return t.id === id; }) || null;
}

function _tkFindBoard(tasks, id) {
  return tasks.boards.find(function (b) { return b.id === id; }) || null;
}

// ---------------------------------------------
// Filter bar (single row above the view body)
// ---------------------------------------------
//
// The old sidebar-mounted / chip-driven filter UI was replaced by a
// row of four clean single-select dropdowns: Status, Priority, Type,
// Source. Underlying model unchanged \u2014 `tasks.filters[dim]` is
// still an array so the existing filter engine downstream keeps
// working without touching a single line of task-visibility logic.
// Each dropdown maps its selection back to the array like so:
//
//     value === 'all'  \u2192 filters[dim] = []       (no filter)
//     otherwise        \u2192 filters[dim] = [value]  (single filter)
//
// A "Clear filters" text button sits at the right of the row and
// appears only when at least one dimension is filtered. Rendering
// order + label copy match the earlier chip layout so the surface
// still feels familiar.
function _tkRenderFilterBar(tasks) {
  const filters = tasks.filters;
  const hasFiltersActive = _tkHasAnyFilterActive();

  const dropdown = function (dim, label, order, labels) {
    const selected = (filters[dim] && filters[dim].length > 0) ? filters[dim][0] : 'all';
    const options = ['<option value="all"' + (selected === 'all' ? ' selected' : '') + '>All</option>']
      .concat(order.map(function (val) {
        return '<option value="' + _escape(val) + '"' + (selected === val ? ' selected' : '') + '>'
          + _escape(labels[val] || val) + '</option>';
      }))
      .join('');

    return ''
      + '<label class="tk-filter-field">'
      +   '<span class="tk-filter-field-label">' + label + '</span>'
      +   '<select class="tk-filter-select" data-filter-dim="' + dim + '">' + options + '</select>'
      + '</label>';
  };

  const clearBtn = hasFiltersActive
    ? '<button type="button" class="tk-clear-filters tk-clear-filters-inline" id="tkClearFilters">Clear filters</button>'
    : '';

  return ''
    + '<div class="tk-filter-bar">'
    +   dropdown('status',   'Status',   TK_STATUS_ORDER,   TK_STATUS_LABELS)
    +   dropdown('priority', 'Priority', TK_PRIORITY_ORDER, TK_PRIORITY_LABELS)
    +   dropdown('type',     'Type',     TK_TYPE_ORDER,     TK_TYPE_LABELS)
    +   dropdown('source',   'Source',   TK_SOURCE_ORDER,   TK_SOURCE_LABELS)
    +   clearBtn
    + '</div>';
}

function _tkHasAnyFilterActive() {
  const f = getTasks().filters;
  return (f.status.length + f.priority.length + f.type.length + f.source.length) > 0;
}

// Wire the dropdowns + Clear filters button. Called from
// _tkBindRightCol on every render because the filter bar lives
// inside .tk-right-col and gets swapped out with it.
function _tkBindFilterBar() {
  document.querySelectorAll('[data-filter-dim]').forEach(function (sel) {
    sel.addEventListener('change', function () {
      const dim = sel.getAttribute('data-filter-dim');
      const val = sel.value;
      const filters = getTasks().filters;
      // Map dropdown selection to the multi-select array shape
      // that the visibility engine downstream expects: an empty
      // array means "no filter for this dimension".
      filters[dim] = (val === 'all') ? [] : [val];
      _saveState();
      renderTasks(document.getElementById('homeContent'));
    });
  });

  const clear = document.getElementById('tkClearFilters');
  if (clear) {
    clear.addEventListener('click', function () {
      const f = getTasks().filters;
      f.status = []; f.priority = []; f.type = []; f.source = [];
      _saveState();
      renderTasks(document.getElementById('homeContent'));
    });
  }
}

// ---------------------------------------------
// Right column: top bar + active view
// ---------------------------------------------

function _tkRenderRightCol() {
  const tasks = getTasks();
  const board = _tkFindBoard(tasks, tasks.activeBoard) || _tkFindBoard(tasks, 'default');
  const view = tasks.view;

  const searchInput = ''
    + '<div class="tk-search">'
    +   '<span class="tk-search-icon">' + TK_ICONS.search + '</span>'
    +   '<input type="text" class="tk-search-input" id="tkSearch" placeholder="Search tasks..." value="' + _escape(tasks.searchQuery) + '">'
    +   (tasks.searchQuery ? '<button type="button" class="tk-search-clear" id="tkSearchClear" aria-label="Clear search">' + TK_ICONS.close + '</button>' : '')
    + '</div>';

  const boardName = board ? board.name : 'My Tasks';
  const boardColor = board ? board.color : '#F5A623';

  const viewBody = view === 'list'     ? _tkRenderListView(tasks)
                 : view === 'calendar' ? _tkRenderCalendarView(tasks)
                 :                       _tkRenderBoardView(tasks);

  // "\u2190 Today" back-nav lives on the topbar left, visible in all
  // three views. Sole affordance for returning to the Today screen
  // from the Tasks workspace (Tasks isn't in the sidebar nav).
  const backLink = ''
    + '<button type="button" class="td-back-to-today" id="tkBackToToday" '
    +   'aria-label="Back to Today">\u2190 Today</button>';

  // Same three view-toggle icons as the Today screen header (list
  // / kanban / calendar). SVG source lives in today.js so the trio
  // renders identically on both surfaces. On this screen:
  //   list     \u2014 navigates back to Today (list is Today's mode)
  //   kanban   \u2014 switches this screen to the 'board' view
  //   calendar \u2014 switches this screen to the 'calendar' view
  // Active pill is amber-tinted; kanban wins when tasks.view ==
  // 'board', calendar wins when tasks.view == 'calendar'. The
  // list button is never marked active here \u2014 it's a
  // navigation affordance, not a view selector on this screen.
  const iconList     = (typeof window._tdViewIconList     === 'function') ? window._tdViewIconList()     : '';
  const iconKanban   = (typeof window._tdViewIconKanban   === 'function') ? window._tdViewIconKanban()   : '';
  const iconCalendar = (typeof window._tdViewIconCalendar === 'function') ? window._tdViewIconCalendar() : '';
  const kanbanActiveCls   = view === 'board'    ? ' td-open-board-active' : '';
  const calendarActiveCls = view === 'calendar' ? ' td-open-board-active' : '';
  const viewToggle = ''
    + '<div class="td-header-actions" role="group" aria-label="Task view">'
    +   '<button type="button" class="td-open-board" id="tkViewList" '
    +     'aria-label="Back to Today (list view)" title="List view">' + iconList + '</button>'
    +   '<button type="button" class="td-open-board' + kanbanActiveCls + '" id="tkViewKanban" '
    +     'aria-label="Kanban view" aria-pressed="' + (view === 'board' ? 'true' : 'false') + '" '
    +     'title="Kanban view">' + iconKanban + '</button>'
    +   '<button type="button" class="td-open-board' + calendarActiveCls + '" id="tkViewCalendar" '
    +     'aria-label="Calendar view" aria-pressed="' + (view === 'calendar' ? 'true' : 'false') + '" '
    +     'title="Calendar view">' + iconCalendar + '</button>'
    + '</div>';

  return ''
    + '<section class="tk-right-col">'
    +   '<div class="tk-topbar">'
    +     '<div class="tk-topbar-left">'
    +       backLink
    +       '<span class="tk-topbar-board-dot" style="background:' + _escape(boardColor) + '"></span>'
    +       '<h2 class="tk-topbar-title">' + _escape(boardName) + '</h2>'
    +     '</div>'
    +     '<div class="tk-topbar-right">'
    +       searchInput
    +       viewToggle
    +       '<button type="button" class="tk-add-btn" id="tkAddBtn">' + TK_ICONS.plus + '<span>Add task</span></button>'
    +     '</div>'
    +   '</div>'
    +   _tkRenderFilterBar(tasks)
    +   '<div class="tk-view-body">' + viewBody + '</div>'
    + '</section>';
}

function _tkBindRightCol() {
  // Back-nav to Today \u2014 sole return path from Tasks.
  const backBtn = document.getElementById('tkBackToToday');
  if (backBtn) {
    backBtn.addEventListener('click', function () {
      setActiveView('today');
      renderApp();
    });
  }

  // View toggle icons (list / kanban / calendar) on the topbar.
  // List routes back to Today (Today IS the list view); kanban
  // and calendar switch the current tasks.view in place.
  const viewList = document.getElementById('tkViewList');
  if (viewList) {
    viewList.addEventListener('click', function () {
      setActiveView('today');
      renderApp();
    });
  }
  const viewKanban = document.getElementById('tkViewKanban');
  if (viewKanban) {
    viewKanban.addEventListener('click', function () {
      const tasks = getTasks();
      if (tasks.view === 'board') return;
      tasks.view = 'board';
      _saveState();
      renderTasks(document.getElementById('homeContent'));
    });
  }
  const viewCalendar = document.getElementById('tkViewCalendar');
  if (viewCalendar) {
    viewCalendar.addEventListener('click', function () {
      const tasks = getTasks();
      if (tasks.view === 'calendar') return;
      tasks.view = 'calendar';
      _saveState();
      renderTasks(document.getElementById('homeContent'));
    });
  }

  // Filter dropdowns + Clear filters (previously bound inside
  // _tkBindLeftCol before the left column was retired).
  _tkBindFilterBar();

  const search = document.getElementById('tkSearch');
  if (search) {
    search.addEventListener('input', function () {
      const tasks = getTasks();
      tasks.searchQuery = search.value;
      _saveState();
      // Preserve cursor + focus after render \u2014 replace the whole
      // right column but not the search field itself.
      _tkRerenderRightColKeepingSearch();
    });
  }
  const clearSearch = document.getElementById('tkSearchClear');
  if (clearSearch) {
    clearSearch.addEventListener('click', function () {
      getTasks().searchQuery = '';
      _saveState();
      renderTasks(document.getElementById('homeContent'));
    });
  }

  const addBtn = document.getElementById('tkAddBtn');
  if (addBtn) {
    addBtn.addEventListener('click', function () {
      const tasks = getTasks();
      tasks.addModalOpen = true;
      _saveState();
      renderTasks(document.getElementById('homeContent'));
    });
  }

  // View-specific bindings
  const view = getTasks().view;
  if (view === 'board') _tkBindBoardView();
  else if (view === 'list') _tkBindListView();
  else if (view === 'calendar') _tkBindCalendarView();
}

// Rebuild the right column only. Used by the search input's `input`
// listener so the user can keep typing without losing focus / caret.
function _tkRerenderRightColKeepingSearch() {
  const host = document.querySelector('.tk-layout .tk-right-col');
  if (!host) return;
  const query = getTasks().searchQuery;
  const activeEl = document.activeElement;
  const wasSearch = activeEl && activeEl.id === 'tkSearch';
  const caret = wasSearch ? activeEl.selectionStart : null;

  // Wrap in an off-DOM node so we can just replace the whole right col
  // markup and re-bind. This keeps the diff surface small \u2014 the left
  // col + detail panel stay untouched.
  const tmp = document.createElement('div');
  tmp.innerHTML = _tkRenderRightCol();
  const next = tmp.firstElementChild;
  host.parentNode.replaceChild(next, host);
  _tkBindRightCol();

  if (wasSearch) {
    const s = document.getElementById('tkSearch');
    if (s) {
      s.focus();
      s.value = query;
      if (typeof caret === 'number') {
        try { s.setSelectionRange(caret, caret); } catch (_) { /* older browsers */ }
      }
    }
  }
}

// ---------------------------------------------
// Task filtering + sorting (shared across views)
// ---------------------------------------------

function _tkVisibleTasks(tasks) {
  const q = String(tasks.searchQuery || '').trim().toLowerCase();
  const f = tasks.filters;
  return tasks.items.filter(function (t) {
    if (t.boardId !== tasks.activeBoard) return false;
    if (f.status.length   && f.status.indexOf(t.status)     === -1) return false;
    if (f.priority.length && f.priority.indexOf(t.priority) === -1) return false;
    if (f.type.length     && f.type.indexOf(t.type)         === -1) return false;
    if (f.source.length   && f.source.indexOf(t.source)     === -1) return false;
    if (q) {
      const inTitle = String(t.title || '').toLowerCase().indexOf(q) !== -1;
      const inDesc  = String(t.description || '').toLowerCase().indexOf(q) !== -1;
      if (!inTitle && !inDesc) return false;
    }
    return true;
  });
}

// Highlight-safe HTML escape + search-term wrap. Splits on the query
// case-insensitively and re-emits with <mark> around matches.
function _tkHighlight(str, query) {
  const s = String(str || '');
  const q = String(query || '').trim();
  if (!q) return _escape(s);
  const lower = s.toLowerCase();
  const target = q.toLowerCase();
  let cursor = 0;
  let out = '';
  while (cursor < s.length) {
    const idx = lower.indexOf(target, cursor);
    if (idx === -1) {
      out += _escape(s.slice(cursor));
      break;
    }
    out += _escape(s.slice(cursor, idx));
    out += '<mark class="tk-hi">' + _escape(s.slice(idx, idx + target.length)) + '</mark>';
    cursor = idx + target.length;
  }
  return out;
}

// ---------------------------------------------
// Board view (kanban)
// ---------------------------------------------

function _tkRenderBoardView(tasks) {
  const visible = _tkVisibleTasks(tasks);
  const totalOnBoard = tasks.items.filter(function (t) { return t.boardId === tasks.activeBoard; }).length;

  if (totalOnBoard === 0) return _tkRenderEmptyState('board-empty');
  if (visible.length === 0) return _tkRenderEmptyState(tasks.searchQuery ? 'search-empty' : 'filters-empty');

  const columns = TK_STATUS_ORDER.map(function (status) {
    const inCol = visible.filter(function (t) { return t.status === status; });
    const cards = inCol.length
      ? inCol.map(_tkRenderTaskCard).join('')
      : '<div class="tk-board-col-empty">Drop a task here</div>';
    return ''
      + '<div class="tk-board-col" data-drop-status="' + status + '">'
      +   '<div class="tk-board-col-header">'
      +     '<span class="tk-board-col-status tk-board-col-status-' + status + '">' + _escape(TK_STATUS_LABELS[status]) + '</span>'
      +     '<span class="tk-board-col-count">' + inCol.length + '</span>'
      +   '</div>'
      +   '<div class="tk-board-col-body">' + cards + '</div>'
      + '</div>';
  }).join('');

  return '<div class="tk-board-view">' + columns + '</div>';
}

function _tkRenderTaskCard(t) {
  const q = getTasks().searchQuery;
  const priorityLabel = TK_PRIORITY_LABELS[t.priority] || t.priority;
  const typeLabel = TK_TYPE_LABELS[t.type] || t.type;

  const claraBadge = t.source === 'clara'
    ? '<div class="tk-task-clara-badge">' + TK_ICONS.sparkle + '<span>Clara</span></div>'
    : '';

  const due = t.dueDate ? '<span class="tk-task-due">' + _escape(_tkFormatDueShort(t.dueDate)) + '</span>' : '';
  const initials = _tkTaskInitials(t);

  return ''
    + '<div class="tk-task-card" draggable="true" data-task="' + _escape(t.id) + '">'
    +   '<div class="tk-task-card-top">'
    +     '<span class="tk-task-priority tk-task-priority-' + t.priority + '" title="' + _escape(TK_PRIORITY_SUBLABELS[t.priority] || priorityLabel) + '">' + _escape(priorityLabel) + '</span>'
    +     '<span class="tk-task-type tk-task-type-' + t.type + '">' + _escape(typeLabel) + '</span>'
    +   '</div>'
    +   '<div class="tk-task-title">' + _tkHighlight(t.title, q) + '</div>'
    +   claraBadge
    +   '<div class="tk-task-card-bottom">'
    +     due
    +     '<span class="tk-task-avatar">' + _escape(initials) + '</span>'
    +   '</div>'
    + '</div>';
}

function _tkTaskInitials(t) {
  // Clara-authored tasks show a sparkle avatar via the badge already;
  // fall back to first two letters of the title for the round avatar
  // on both sources so cards line up visually.
  const src = String(t.title || 'Task').trim();
  if (!src) return 'T';
  const words = src.split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
}

function _tkFormatDueShort(iso) {
  if (!iso) return '';
  const d = _tkParseDate(iso);
  if (!d) return iso;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((target - today) / (24 * 3600 * 1000));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 1 && diffDays < 7) return 'In ' + diffDays + ' days';
  if (diffDays < -1 && diffDays > -7) return Math.abs(diffDays) + ' days ago';
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return months[d.getMonth()] + ' ' + d.getDate();
}

function _tkFormatDueLong(iso) {
  if (!iso) return '';
  const d = _tkParseDate(iso);
  if (!d) return iso;
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
}

function _tkParseDate(iso) {
  if (typeof iso !== 'string' || !iso) return null;
  // Accept both 'YYYY-MM-DD' and full ISO. Explicit-year parse dodges
  // the Safari midnight-UTC gotcha (would land on the previous day).
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (m) return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

function _tkIsoFromDate(d) {
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function _tkBindBoardView() {
  // Card click -> open detail
  document.querySelectorAll('.tk-board-view [data-task]').forEach(function (card) {
    card.addEventListener('click', function (e) {
      // Ignore drag-in-progress clicks
      if (_tkUiState.draggingId) return;
      const id = card.getAttribute('data-task');
      _tkOpenDetail(id);
    });

    card.addEventListener('dragstart', function (e) {
      const id = card.getAttribute('data-task');
      _tkUiState.draggingId = id;
      card.classList.add('tk-task-card-dragging');
      // Firefox refuses to fire dragover without setData.
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', id); } catch (_) { /* no-op */ }
      }
    });

    card.addEventListener('dragend', function () {
      card.classList.remove('tk-task-card-dragging');
      _tkUiState.draggingId = null;
      _tkUiState.dragOverStatus = null;
      document.querySelectorAll('.tk-board-col-over').forEach(function (el) { el.classList.remove('tk-board-col-over'); });
    });
  });

  // Column drop targets
  document.querySelectorAll('[data-drop-status]').forEach(function (col) {
    col.addEventListener('dragover', function (e) {
      if (!_tkUiState.draggingId) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
      const status = col.getAttribute('data-drop-status');
      if (_tkUiState.dragOverStatus !== status) {
        _tkUiState.dragOverStatus = status;
        document.querySelectorAll('.tk-board-col-over').forEach(function (el) { el.classList.remove('tk-board-col-over'); });
        col.classList.add('tk-board-col-over');
      }
    });
    col.addEventListener('dragleave', function (e) {
      // Only clear when leaving the column itself, not a child card.
      if (e.target === col) col.classList.remove('tk-board-col-over');
    });
    col.addEventListener('drop', function (e) {
      e.preventDefault();
      const id = _tkUiState.draggingId;
      const status = col.getAttribute('data-drop-status');
      _tkUiState.draggingId = null;
      _tkUiState.dragOverStatus = null;
      col.classList.remove('tk-board-col-over');
      if (!id || !status) return;
      _tkUpdateTask(id, function (t) {
        if (t.status === status) return false;
        t.activity.push({ ts: Date.now(), kind: 'status', from: t.status, to: status });
        t.status = status;
        return true;
      });
    });
  });
}

// ---------------------------------------------
// List view (sortable table)
// ---------------------------------------------

function _tkRenderListView(tasks) {
  const visible = _tkVisibleTasks(tasks);
  const totalOnBoard = tasks.items.filter(function (t) { return t.boardId === tasks.activeBoard; }).length;

  if (totalOnBoard === 0) return _tkRenderEmptyState('board-empty');
  if (visible.length === 0) return _tkRenderEmptyState(tasks.searchQuery ? 'search-empty' : 'filters-empty');

  const sort = _tkUiState.listSort;
  const sorted = visible.slice().sort(function (a, b) {
    const dir = sort.dir === 'asc' ? 1 : -1;
    const ka = _tkSortKey(a, sort.column);
    const kb = _tkSortKey(b, sort.column);
    if (ka < kb) return -1 * dir;
    if (ka > kb) return  1 * dir;
    return 0;
  });

  const cols = [
    { key: 'title',    label: 'Title',    flex: '1' },
    { key: 'status',   label: 'Status',   width: '120px' },
    { key: 'priority', label: 'Priority', width: '90px' },
    { key: 'type',     label: 'Type',     width: '110px' },
    { key: 'dueDate',  label: 'Due Date', width: '120px' },
    { key: 'source',   label: 'Source',   width: '100px' }
  ];

  const headerHtml = cols.map(function (c) {
    const on = sort.column === c.key;
    const arrow = on ? (sort.dir === 'asc' ? TK_ICONS.chevronUp : TK_ICONS.chevronDown) : '';
    const style = c.width ? 'width:' + c.width : 'flex:' + (c.flex || '1');
    return '<button type="button" class="tk-list-header-cell' + (on ? ' tk-list-header-cell-active' : '') + '" data-sort="' + c.key + '" style="' + style + '">'
      + '<span>' + _escape(c.label) + '</span>'
      + '<span class="tk-list-header-arrow">' + arrow + '</span>'
      + '</button>';
  }).join('') + '<div class="tk-list-header-menu-cell"></div>';

  const rowsHtml = sorted.map(function (t) {
    const q = tasks.searchQuery;
    return ''
      + '<div class="tk-list-row" data-task="' + _escape(t.id) + '">'
      +   '<div class="tk-list-cell tk-list-cell-title" style="flex:1">'
      +     '<span>' + _tkHighlight(t.title, q) + '</span>'
      +     (t.source === 'clara' ? '<span class="tk-list-clara">' + TK_ICONS.sparkle + '</span>' : '')
      +   '</div>'
      +   '<div class="tk-list-cell" style="width:120px">'
      +     '<span class="tk-status-chip tk-status-chip-' + t.status + '">' + _escape(TK_STATUS_LABELS[t.status]) + '</span>'
      +   '</div>'
      +   '<div class="tk-list-cell" style="width:90px">'
      +     '<span class="tk-task-priority tk-task-priority-' + t.priority + '">' + _escape(TK_PRIORITY_LABELS[t.priority]) + '</span>'
      +   '</div>'
      +   '<div class="tk-list-cell" style="width:110px">'
      +     '<span class="tk-task-type tk-task-type-' + t.type + '">' + _escape(TK_TYPE_LABELS[t.type]) + '</span>'
      +   '</div>'
      +   '<div class="tk-list-cell tk-list-cell-due" style="width:120px">' + _escape(t.dueDate ? _tkFormatDueShort(t.dueDate) : '\u2014') + '</div>'
      +   '<div class="tk-list-cell" style="width:100px">'
      +     '<span class="tk-source-chip tk-source-chip-' + t.source + '">' + (t.source === 'clara' ? TK_ICONS.sparkle : '') + _escape(TK_SOURCE_LABELS[t.source]) + '</span>'
      +   '</div>'
      +   '<div class="tk-list-cell tk-list-cell-menu">'
      +     '<button type="button" class="tk-three-dot" data-menu="' + _escape(t.id) + '" aria-label="Task actions">' + TK_ICONS.moreVertical + '</button>'
      +     (_tkUiState.menuOpenTaskId === t.id ? _tkRenderThreeDotMenu(t) : '')
      +   '</div>'
      + '</div>';
  }).join('');

  return ''
    + '<div class="tk-list-view">'
    +   '<div class="tk-list-header">' + headerHtml + '</div>'
    +   '<div class="tk-list-body">' + rowsHtml + '</div>'
    + '</div>';
}

function _tkSortKey(t, col) {
  if (col === 'title') return String(t.title || '').toLowerCase();
  if (col === 'status') return TK_STATUS_ORDER.indexOf(t.status);
  if (col === 'priority') return TK_PRIORITY_ORDER.indexOf(t.priority);
  if (col === 'type') return TK_TYPE_ORDER.indexOf(t.type);
  if (col === 'source') return TK_SOURCE_ORDER.indexOf(t.source);
  if (col === 'dueDate') return t.dueDate || '9999-12-31';
  if (col === 'updatedAt') return -(t.updatedAt || 0);
  return 0;
}

function _tkRenderThreeDotMenu(t) {
  const otherBoards = getTasks().boards.filter(function (b) { return b.id !== t.boardId; });
  const boardItems = otherBoards.length
    ? otherBoards.map(function (b) {
        return '<button type="button" class="tk-menu-item tk-menu-item-sub" data-move-board="' + _escape(b.id) + '" data-task="' + _escape(t.id) + '">'
          + '<span class="tk-board-dot" style="background:' + _escape(b.color) + '"></span>'
          + '<span>' + _escape(b.name) + '</span>'
          + '</button>';
      }).join('')
    : '<div class="tk-menu-empty">No other boards</div>';

  return ''
    + '<div class="tk-menu" role="menu">'
    +   '<button type="button" class="tk-menu-item" data-menu-edit="' + _escape(t.id) + '">Edit</button>'
    +   '<div class="tk-menu-sep"></div>'
    +   '<div class="tk-menu-label">Move to board</div>'
    +   boardItems
    +   '<div class="tk-menu-sep"></div>'
    +   '<button type="button" class="tk-menu-item tk-menu-item-danger" data-menu-delete="' + _escape(t.id) + '">' + TK_ICONS.trash + '<span>Delete task</span></button>'
    + '</div>';
}

function _tkBindListView() {
  // Sort headers
  document.querySelectorAll('[data-sort]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const col = btn.getAttribute('data-sort');
      const s = _tkUiState.listSort;
      if (s.column === col) s.dir = s.dir === 'asc' ? 'desc' : 'asc';
      else { s.column = col; s.dir = 'asc'; }
      renderTasks(document.getElementById('homeContent'));
    });
  });

  // Row click -> open detail
  document.querySelectorAll('.tk-list-row').forEach(function (row) {
    row.addEventListener('click', function (e) {
      if (e.target.closest('.tk-list-cell-menu')) return;
      const id = row.getAttribute('data-task');
      _tkOpenDetail(id);
    });
  });

  // Three-dot menu triggers
  document.querySelectorAll('[data-menu]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      const id = btn.getAttribute('data-menu');
      _tkUiState.menuOpenTaskId = (_tkUiState.menuOpenTaskId === id) ? null : id;
      renderTasks(document.getElementById('homeContent'));
    });
  });

  // Menu items
  document.querySelectorAll('[data-menu-edit]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      _tkUiState.menuOpenTaskId = null;
      _tkOpenDetail(btn.getAttribute('data-menu-edit'));
    });
  });
  document.querySelectorAll('[data-menu-delete]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      _tkUiState.menuOpenTaskId = null;
      _tkDeleteTask(btn.getAttribute('data-menu-delete'));
    });
  });
  document.querySelectorAll('[data-move-board]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      const taskId = btn.getAttribute('data-task');
      const boardId = btn.getAttribute('data-move-board');
      _tkUiState.menuOpenTaskId = null;
      _tkUpdateTask(taskId, function (t) {
        const from = _tkFindBoard(getTasks(), t.boardId);
        const to = _tkFindBoard(getTasks(), boardId);
        t.boardId = boardId;
        t.activity.push({ ts: Date.now(), kind: 'board', from: from ? from.name : t.boardId, to: to ? to.name : boardId });
        return true;
      });
    });
  });
}

// ---------------------------------------------
// Calendar view (month grid)
// ---------------------------------------------

function _tkRenderCalendarView(tasks) {
  const visible = _tkVisibleTasks(tasks);

  // Anchor month: persisted or "this month" for fresh state.
  const now = new Date();
  const anchor = tasks.calendarMonth || { year: now.getFullYear(), month: now.getMonth() };
  const year = anchor.year;
  const month = anchor.month;

  const first = new Date(year, month, 1);
  const startDay = first.getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const dayLabels = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  // Group tasks by ISO date string for O(1) day lookups.
  const byDate = {};
  visible.forEach(function (t) {
    if (!t.dueDate) return;
    if (!byDate[t.dueDate]) byDate[t.dueDate] = [];
    byDate[t.dueDate].push(t);
  });

  // Build 6-week grid so every month fits without a jump.
  const cells = [];
  const todayIso = _tkIsoFromDate(new Date());
  const totalCells = 42;
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startDay + 1;
    const inMonth = dayNum >= 1 && dayNum <= daysInMonth;
    if (!inMonth) {
      cells.push('<div class="tk-cal-day tk-cal-day-outside"></div>');
      continue;
    }
    const iso = _tkIsoFromDate(new Date(year, month, dayNum));
    const dayTasks = byDate[iso] || [];
    const isSelected = iso === tasks.calendarSelectedDate;
    const isToday = iso === todayIso;

    const chips = dayTasks.slice(0, 3).map(function (t) {
      const board = _tkFindBoard(tasks, t.boardId);
      const color = board ? board.color : '#F5A623';
      return '<div class="tk-cal-chip" data-task="' + _escape(t.id) + '"><span class="tk-cal-chip-dot" style="background:' + _escape(color) + '"></span><span class="tk-cal-chip-title">' + _escape(t.title) + '</span></div>';
    }).join('');
    const more = dayTasks.length > 3 ? '<div class="tk-cal-more">+' + (dayTasks.length - 3) + ' more</div>' : '';

    cells.push(
      '<div class="tk-cal-day' + (isSelected ? ' tk-cal-day-selected' : '') + (isToday ? ' tk-cal-day-today' : '') + '" data-day="' + iso + '">'
      + '<div class="tk-cal-day-num">' + dayNum + '</div>'
      + '<div class="tk-cal-day-chips">' + chips + more + '</div>'
      + '</div>'
    );
  }

  // Selected-day detail below the grid, if any.
  let selectedList = '';
  if (tasks.calendarSelectedDate) {
    const dayTasks = byDate[tasks.calendarSelectedDate] || [];
    selectedList = ''
      + '<div class="tk-cal-selected">'
      +   '<div class="tk-cal-selected-head">'
      +     '<div class="tk-cal-selected-title">' + _escape(_tkFormatDueLong(tasks.calendarSelectedDate)) + '</div>'
      +     '<div class="tk-cal-selected-count">' + dayTasks.length + ' ' + (dayTasks.length === 1 ? 'task' : 'tasks') + '</div>'
      +   '</div>'
      +   (dayTasks.length
          ? '<div class="tk-cal-selected-list">' + dayTasks.map(function (t) {
              return '<div class="tk-cal-mini-row" data-task="' + _escape(t.id) + '">'
                + '<span class="tk-task-priority tk-task-priority-' + t.priority + '">' + _escape(TK_PRIORITY_LABELS[t.priority]) + '</span>'
                + '<span class="tk-cal-mini-title">' + _escape(t.title) + '</span>'
                + '<span class="tk-status-chip tk-status-chip-' + t.status + '">' + _escape(TK_STATUS_LABELS[t.status]) + '</span>'
                + '</div>';
            }).join('') + '</div>'
          : '<div class="tk-cal-selected-empty">Nothing due this day.</div>')
      + '</div>';
  }

  return ''
    + '<div class="tk-calendar-view">'
    +   '<div class="tk-cal-nav">'
    +     '<button type="button" class="tk-cal-nav-btn" id="tkCalPrev" aria-label="Previous month">' + TK_ICONS.chevronLeft + '</button>'
    +     '<div class="tk-cal-nav-label">' + _escape(monthNames[month]) + ' ' + year + '</div>'
    +     '<button type="button" class="tk-cal-nav-btn" id="tkCalNext" aria-label="Next month">' + TK_ICONS.chevronRight + '</button>'
    +     '<button type="button" class="tk-cal-nav-today" id="tkCalToday">Today</button>'
    +   '</div>'
    +   '<div class="tk-cal-grid-head">' + dayLabels.map(function (d) { return '<div class="tk-cal-grid-head-cell">' + d + '</div>'; }).join('') + '</div>'
    +   '<div class="tk-calendar-grid">' + cells.join('') + '</div>'
    +   selectedList
    + '</div>';
}

function _tkBindCalendarView() {
  const prev = document.getElementById('tkCalPrev');
  const next = document.getElementById('tkCalNext');
  const todayBtn = document.getElementById('tkCalToday');

  if (prev) prev.addEventListener('click', function () { _tkShiftCalendar(-1); });
  if (next) next.addEventListener('click', function () { _tkShiftCalendar(1); });
  if (todayBtn) todayBtn.addEventListener('click', function () {
    const now = new Date();
    getTasks().calendarMonth = { year: now.getFullYear(), month: now.getMonth() };
    getTasks().calendarSelectedDate = _tkIsoFromDate(now);
    _saveState();
    renderTasks(document.getElementById('homeContent'));
  });

  document.querySelectorAll('.tk-cal-day[data-day]').forEach(function (cell) {
    cell.addEventListener('click', function (e) {
      // Chip click drills straight into the task; day click just
      // selects the day (mini-list below).
      const chip = e.target.closest('[data-task]');
      if (chip) {
        _tkOpenDetail(chip.getAttribute('data-task'));
        return;
      }
      const iso = cell.getAttribute('data-day');
      const tasks = getTasks();
      tasks.calendarSelectedDate = (tasks.calendarSelectedDate === iso) ? null : iso;
      _saveState();
      renderTasks(document.getElementById('homeContent'));
    });
  });

  document.querySelectorAll('.tk-cal-mini-row').forEach(function (row) {
    row.addEventListener('click', function () {
      _tkOpenDetail(row.getAttribute('data-task'));
    });
  });
}

function _tkShiftCalendar(delta) {
  const tasks = getTasks();
  const now = new Date();
  const cur = tasks.calendarMonth || { year: now.getFullYear(), month: now.getMonth() };
  let month = cur.month + delta;
  let year = cur.year;
  while (month < 0) { month += 12; year -= 1; }
  while (month > 11) { month -= 12; year += 1; }
  tasks.calendarMonth = { year: year, month: month };
  _saveState();
  renderTasks(document.getElementById('homeContent'));
}

// ---------------------------------------------
// Detail panel (right-side slide-out)
// ---------------------------------------------

function _tkRenderDetailPanel(t) {
  const tasks = getTasks();
  const statusOptions = TK_STATUS_ORDER.map(function (s) {
    return '<option value="' + s + '"' + (t.status === s ? ' selected' : '') + '>' + _escape(TK_STATUS_LABELS[s]) + '</option>';
  }).join('');
  const priorityOptions = TK_PRIORITY_ORDER.map(function (p) {
    return '<option value="' + p + '"' + (t.priority === p ? ' selected' : '') + '>' + _escape(TK_PRIORITY_LABELS[p]) + ' \u2014 ' + _escape(TK_PRIORITY_SUBLABELS[p]) + '</option>';
  }).join('');
  const typeOptions = TK_TYPE_ORDER.map(function (ty) {
    return '<option value="' + ty + '"' + (t.type === ty ? ' selected' : '') + '>' + _escape(TK_TYPE_LABELS[ty]) + '</option>';
  }).join('');
  const boardOptions = tasks.boards.map(function (b) {
    return '<option value="' + _escape(b.id) + '"' + (t.boardId === b.id ? ' selected' : '') + '>' + _escape(b.name) + '</option>';
  }).join('');

  const claraSection = t.source === 'clara' && t.claraNotes
    ? '<div class="tk-detail-clara-note"><div class="tk-detail-clara-label">' + TK_ICONS.sparkle + '<span>Clara\u2019s note</span></div><div class="tk-detail-clara-body">' + _escape(t.claraNotes) + '</div></div>'
    : '';

  const activityHtml = _tkRenderActivityLog(t);

  return ''
    + '<aside class="tk-detail-panel" id="tkDetailPanel" role="complementary">'
    +   '<div class="tk-detail-head">'
    +     '<div class="tk-detail-source">'
    +       (t.source === 'clara' ? '<span class="tk-detail-source-clara">' + TK_ICONS.sparkle + '<span>Clara</span></span>' : '<span class="tk-detail-source-manual">Manual</span>')
    +     '</div>'
    +     '<button type="button" class="tk-detail-close" id="tkDetailClose" aria-label="Close details">' + TK_ICONS.close + '</button>'
    +   '</div>'
    +   '<input type="text" class="tk-detail-title" id="tkDetailTitle" value="' + _escape(t.title) + '" placeholder="Task title">'
    +   '<div class="tk-detail-fields">'
    +     _tkRenderDetailField('Status',   '<select class="tk-detail-select" id="tkDetailStatus">'   + statusOptions   + '</select>')
    +     _tkRenderDetailField('Priority', '<select class="tk-detail-select" id="tkDetailPriority">' + priorityOptions + '</select>')
    +     _tkRenderDetailField('Type',     '<select class="tk-detail-select" id="tkDetailType">'     + typeOptions     + '</select>')
    +     _tkRenderDetailField('Board',    '<select class="tk-detail-select" id="tkDetailBoard">'    + boardOptions    + '</select>')
    +     _tkRenderDetailField('Due date', '<input type="date" class="tk-detail-date" id="tkDetailDate" value="' + _escape(t.dueDate || '') + '">')
    +   '</div>'
    +   '<div class="tk-detail-desc-wrap">'
    +     '<div class="tk-detail-desc-label">Description</div>'
    +     '<textarea class="tk-detail-desc" id="tkDetailDesc" placeholder="Add description...">' + _escape(t.description || '') + '</textarea>'
    +   '</div>'
    +   claraSection
    +   activityHtml
    +   '<button type="button" class="tk-detail-delete" id="tkDetailDelete">' + TK_ICONS.trash + '<span>Delete task</span></button>'
    + '</aside>';
}

function _tkRenderDetailField(label, control) {
  return ''
    + '<div class="tk-detail-field">'
    +   '<div class="tk-detail-field-label">' + _escape(label) + '</div>'
    +   control
    + '</div>';
}

function _tkRenderActivityLog(t) {
  const entries = (t.activity || []).slice().sort(function (a, b) { return (a.ts || 0) - (b.ts || 0); });
  if (entries.length === 0) {
    return ''
      + '<div class="tk-activity-log">'
      +   '<div class="tk-activity-label">Activity</div>'
      +   '<div class="tk-activity-empty">Task created ' + _escape(_tkFormatRelative(t.createdAt)) + '.</div>'
      + '</div>';
  }
  const rows = entries.map(function (a) {
    let text = '';
    if (a.kind === 'created') text = a.note ? a.note : 'Task created';
    else if (a.kind === 'status')   text = 'Moved from ' + _escape(TK_STATUS_LABELS[a.from] || a.from) + ' to ' + _escape(TK_STATUS_LABELS[a.to] || a.to);
    else if (a.kind === 'priority') text = 'Priority ' + _escape(TK_PRIORITY_LABELS[a.from] || a.from) + ' \u2192 ' + _escape(TK_PRIORITY_LABELS[a.to] || a.to);
    else if (a.kind === 'type')     text = 'Type changed to ' + _escape(TK_TYPE_LABELS[a.to] || a.to);
    else if (a.kind === 'board')    text = 'Moved to board \u201c' + _escape(a.to) + '\u201d';
    else if (a.kind === 'title')    text = 'Title updated';
    else if (a.kind === 'description') text = 'Description updated';
    else if (a.kind === 'dueDate')  text = a.to ? ('Due date set to ' + _escape(_tkFormatDueLong(a.to))) : 'Due date cleared';
    else text = a.kind;
    return '<div class="tk-activity-row"><span class="tk-activity-dot"></span><div class="tk-activity-row-body"><div class="tk-activity-text">' + text + '</div><div class="tk-activity-time">' + _escape(_tkFormatRelative(a.ts)) + '</div></div></div>';
  }).join('');
  return ''
    + '<div class="tk-activity-log">'
    +   '<div class="tk-activity-label">Activity</div>'
    +   '<div class="tk-activity-rows">' + rows + '</div>'
    + '</div>';
}

function _tkFormatRelative(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return min + 'm ago';
  const hr = Math.floor(min / 60);
  if (hr < 24) return hr + 'h ago';
  const days = Math.floor(hr / 24);
  if (days < 7) return days + 'd ago';
  const d = new Date(ts);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return months[d.getMonth()] + ' ' + d.getDate();
}

function _tkBindDetailPanel() {
  const closeBtn = document.getElementById('tkDetailClose');
  if (closeBtn) closeBtn.addEventListener('click', _tkCloseDetail);

  const titleInp = document.getElementById('tkDetailTitle');
  if (titleInp) {
    let originalTitle = titleInp.value;
    titleInp.addEventListener('focus', function () { originalTitle = titleInp.value; });
    titleInp.addEventListener('blur', function () {
      const id = getTasks().detailId;
      const v = String(titleInp.value || '').trim();
      if (!v) { titleInp.value = originalTitle; return; }
      if (v === originalTitle) return;
      _tkUpdateTask(id, function (t) {
        t.activity.push({ ts: Date.now(), kind: 'title' });
        t.title = v;
        return true;
      }, /* silent */ false);
    });
    titleInp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); titleInp.blur(); }
    });
  }

  const statusSel = document.getElementById('tkDetailStatus');
  if (statusSel) {
    statusSel.addEventListener('change', function () {
      const id = getTasks().detailId;
      _tkUpdateTask(id, function (t) {
        if (t.status === statusSel.value) return false;
        t.activity.push({ ts: Date.now(), kind: 'status', from: t.status, to: statusSel.value });
        t.status = statusSel.value;
        return true;
      });
    });
  }

  const prioritySel = document.getElementById('tkDetailPriority');
  if (prioritySel) {
    prioritySel.addEventListener('change', function () {
      const id = getTasks().detailId;
      _tkUpdateTask(id, function (t) {
        if (t.priority === prioritySel.value) return false;
        t.activity.push({ ts: Date.now(), kind: 'priority', from: t.priority, to: prioritySel.value });
        t.priority = prioritySel.value;
        return true;
      });
    });
  }

  const typeSel = document.getElementById('tkDetailType');
  if (typeSel) {
    typeSel.addEventListener('change', function () {
      const id = getTasks().detailId;
      _tkUpdateTask(id, function (t) {
        if (t.type === typeSel.value) return false;
        t.activity.push({ ts: Date.now(), kind: 'type', from: t.type, to: typeSel.value });
        t.type = typeSel.value;
        return true;
      });
    });
  }

  const boardSel = document.getElementById('tkDetailBoard');
  if (boardSel) {
    boardSel.addEventListener('change', function () {
      const id = getTasks().detailId;
      const targetBoardId = boardSel.value;
      _tkUpdateTask(id, function (t) {
        if (t.boardId === targetBoardId) return false;
        const from = _tkFindBoard(getTasks(), t.boardId);
        const to = _tkFindBoard(getTasks(), targetBoardId);
        t.activity.push({ ts: Date.now(), kind: 'board', from: from ? from.name : t.boardId, to: to ? to.name : targetBoardId });
        t.boardId = targetBoardId;
        // Also switch the workspace to the target board so the moved
        // task doesn't visually disappear while its detail panel is
        // still open. Otherwise you'd see an out-of-context detail
        // hovering over an unrelated board's content.
        getTasks().activeBoard = targetBoardId;
        return true;
      });
    });
  }

  const dateInp = document.getElementById('tkDetailDate');
  if (dateInp) {
    dateInp.addEventListener('change', function () {
      const id = getTasks().detailId;
      _tkUpdateTask(id, function (t) {
        if (t.dueDate === dateInp.value) return false;
        t.activity.push({ ts: Date.now(), kind: 'dueDate', from: t.dueDate, to: dateInp.value });
        t.dueDate = dateInp.value;
        return true;
      });
    });
  }

  const desc = document.getElementById('tkDetailDesc');
  if (desc) {
    // Save on every keystroke (silent \u2014 no re-render, so focus and
    // caret stay put). No debounce: if the user hits a filter chip or
    // navigates away mid-sentence, the in-memory task always has the
    // latest text and localStorage catches up on the next tick.
    desc.addEventListener('input', function () {
      const id = getTasks().detailId;
      _tkUpdateTask(id, function (t) {
        if (t.description === desc.value) return false;
        const wasEmpty = !t.description || !t.description.trim();
        t.description = desc.value;
        // Log the first meaningful description change only, so the
        // activity log doesn't drown in per-keystroke events.
        if (wasEmpty && desc.value.trim()) {
          t.activity.push({ ts: Date.now(), kind: 'description' });
        }
        return true;
      }, /* silent */ true);
    });
  }

  const delBtn = document.getElementById('tkDetailDelete');
  if (delBtn) {
    delBtn.addEventListener('click', function () {
      const id = getTasks().detailId;
      if (id) _tkDeleteTask(id);
    });
  }
}

// ---------------------------------------------
// Add task modal
// ---------------------------------------------

function _tkRenderAddModal() {
  const tasks = getTasks();
  const statusOptions = TK_STATUS_ORDER.map(function (s) {
    return '<option value="' + s + '"' + (s === 'todo' ? ' selected' : '') + '>' + _escape(TK_STATUS_LABELS[s]) + '</option>';
  }).join('');
  const priorityOptions = TK_PRIORITY_ORDER.map(function (p) {
    return '<option value="' + p + '"' + (p === 'p2' ? ' selected' : '') + '>' + _escape(TK_PRIORITY_LABELS[p]) + ' \u2014 ' + _escape(TK_PRIORITY_SUBLABELS[p]) + '</option>';
  }).join('');
  const typeOptions = TK_TYPE_ORDER.map(function (t) {
    return '<option value="' + t + '"' + (t === 'other' ? ' selected' : '') + '>' + _escape(TK_TYPE_LABELS[t]) + '</option>';
  }).join('');
  const boardOptions = tasks.boards.map(function (b) {
    return '<option value="' + _escape(b.id) + '"' + (b.id === tasks.activeBoard ? ' selected' : '') + '>' + _escape(b.name) + '</option>';
  }).join('');

  return ''
    + '<div class="tk-add-modal-backdrop" id="tkAddModalBackdrop">'
    +   '<div class="tk-add-modal" role="dialog" aria-modal="true" aria-labelledby="tkAddModalTitle">'
    +     '<div class="tk-add-modal-head">'
    +       '<h3 class="tk-add-modal-title" id="tkAddModalTitle">New task</h3>'
    +       '<button type="button" class="tk-add-modal-close" id="tkAddModalClose" aria-label="Close">' + TK_ICONS.close + '</button>'
    +     '</div>'
    +     '<div class="tk-add-modal-body">'
    +       '<label class="tk-add-field">'
    +         '<span class="tk-add-field-label">Title *</span>'
    +         '<input type="text" class="tk-add-input" id="tkAddTitle" placeholder="What needs to happen?" autofocus maxlength="140">'
    +       '</label>'
    +       '<label class="tk-add-field">'
    +         '<span class="tk-add-field-label">Description</span>'
    +         '<textarea class="tk-add-textarea" id="tkAddDesc" placeholder="Add more context..." rows="4"></textarea>'
    +       '</label>'
    +       '<div class="tk-add-row">'
    +         '<label class="tk-add-field">'
    +           '<span class="tk-add-field-label">Status</span>'
    +           '<select class="tk-add-select" id="tkAddStatus">' + statusOptions + '</select>'
    +         '</label>'
    +         '<label class="tk-add-field">'
    +           '<span class="tk-add-field-label">Priority</span>'
    +           '<select class="tk-add-select" id="tkAddPriority">' + priorityOptions + '</select>'
    +         '</label>'
    +       '</div>'
    +       '<div class="tk-add-row">'
    +         '<label class="tk-add-field">'
    +           '<span class="tk-add-field-label">Type</span>'
    +           '<select class="tk-add-select" id="tkAddType">' + typeOptions + '</select>'
    +         '</label>'
    +         '<label class="tk-add-field">'
    +           '<span class="tk-add-field-label">Board</span>'
    +           '<select class="tk-add-select" id="tkAddBoard">' + boardOptions + '</select>'
    +         '</label>'
    +       '</div>'
    +       '<label class="tk-add-field">'
    +         '<span class="tk-add-field-label">Due date</span>'
    +         '<input type="date" class="tk-add-input" id="tkAddDue">'
    +       '</label>'
    +     '</div>'
    +     '<div class="tk-add-modal-footer">'
    +       '<button type="button" class="tk-add-modal-cancel" id="tkAddModalCancel">Cancel</button>'
    +       '<button type="button" class="tk-add-modal-save" id="tkAddModalSave">Create task</button>'
    +     '</div>'
    +   '</div>'
    + '</div>';
}

function _tkBindAddModal() {
  const close = function () {
    getTasks().addModalOpen = false;
    _saveState();
    renderTasks(document.getElementById('homeContent'));
  };
  const back = document.getElementById('tkAddModalBackdrop');
  const closeBtn = document.getElementById('tkAddModalClose');
  const cancelBtn = document.getElementById('tkAddModalCancel');
  if (back) back.addEventListener('click', function (e) { if (e.target === back) close(); });
  if (closeBtn) closeBtn.addEventListener('click', close);
  if (cancelBtn) cancelBtn.addEventListener('click', close);

  const titleInp = document.getElementById('tkAddTitle');
  const saveBtn = document.getElementById('tkAddModalSave');
  const submit = function () {
    const title = String((titleInp && titleInp.value) || '').trim();
    if (!title) {
      if (titleInp) { titleInp.classList.add('tk-input-error'); titleInp.focus(); }
      return;
    }
    const desc = String((document.getElementById('tkAddDesc') || {}).value || '');
    const status = (document.getElementById('tkAddStatus') || {}).value || 'todo';
    const priority = (document.getElementById('tkAddPriority') || {}).value || 'p2';
    const type = (document.getElementById('tkAddType') || {}).value || 'other';
    const boardId = (document.getElementById('tkAddBoard') || {}).value || 'default';
    const due = (document.getElementById('tkAddDue') || {}).value || '';

    const now = Date.now();
    const task = {
      id: _newTaskId(),
      title: title,
      description: desc,
      status: status,
      priority: priority,
      type: type,
      source: 'manual',
      boardId: boardId,
      dueDate: due,
      createdAt: now,
      updatedAt: now,
      claraNotes: '',
      activity: [{ ts: now, kind: 'created', note: 'Task created' }]
    };
    const tasks = getTasks();
    tasks.items.push(task);
    tasks.addModalOpen = false;
    tasks.activeBoard = boardId;
    _saveState();
    renderTasks(document.getElementById('homeContent'));
  };
  if (saveBtn) saveBtn.addEventListener('click', submit);
  if (titleInp) {
    titleInp.addEventListener('input', function () { titleInp.classList.remove('tk-input-error'); });
    titleInp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        // Enter on the title submits directly.
        e.preventDefault();
        submit();
      }
    });
    requestAnimationFrame(function () { titleInp.focus(); });
  }
}

// ---------------------------------------------
// Empty states
// ---------------------------------------------

function _tkRenderEmptyState(kind) {
  if (kind === 'search-empty') {
    const q = _escape(getTasks().searchQuery || '');
    return ''
      + '<div class="tk-empty">'
      +   '<div class="tk-empty-title">No results for \u201c' + q + '\u201d.</div>'
      +   '<div class="tk-empty-sub">Try a different phrase or clear the search.</div>'
      +   '<button type="button" class="tk-empty-btn" id="tkEmptyClearSearch">Clear search</button>'
      + '</div>';
  }
  if (kind === 'filters-empty') {
    return ''
      + '<div class="tk-empty">'
      +   '<div class="tk-empty-title">No tasks match your filters.</div>'
      +   '<button type="button" class="tk-empty-btn" id="tkEmptyClearFilters">Clear filters</button>'
      + '</div>';
  }
  return ''
    + '<div class="tk-empty">'
    +   '<div class="tk-empty-icon">' + TK_ICONS.plus + '</div>'
    +   '<div class="tk-empty-title">No tasks yet.</div>'
    +   '<div class="tk-empty-sub">Clara will suggest tasks based on your goals, or add your own.</div>'
    +   '<button type="button" class="tk-empty-btn tk-empty-btn-primary" id="tkEmptyAdd">' + TK_ICONS.plus + '<span>Add task</span></button>'
    + '</div>';
}

// Empty-state buttons are bound after the layout is in place. Called
// from _tkBindRightCol via delegation-lite (query is scoped to the
// right column). Wired here so board / list / calendar all reuse.
document.addEventListener('click', function (e) {
  const clearSearch = e.target.closest && e.target.closest('#tkEmptyClearSearch');
  if (clearSearch) {
    getTasks().searchQuery = '';
    _saveState();
    renderTasks(document.getElementById('homeContent'));
    return;
  }
  const clearFilters = e.target.closest && e.target.closest('#tkEmptyClearFilters');
  if (clearFilters) {
    const f = getTasks().filters;
    f.status = []; f.priority = []; f.type = []; f.source = [];
    _saveState();
    renderTasks(document.getElementById('homeContent'));
    return;
  }
  const emptyAdd = e.target.closest && e.target.closest('#tkEmptyAdd');
  if (emptyAdd) {
    getTasks().addModalOpen = true;
    _saveState();
    renderTasks(document.getElementById('homeContent'));
    return;
  }
});

// ---------------------------------------------
// Mutation helpers
// ---------------------------------------------

// Apply an update function to the task with the given id. The mutator
// returns true if anything changed. If `silent` is true we save
// without re-rendering (used by the description auto-save).
function _tkUpdateTask(id, mutator, silent) {
  const tasks = getTasks();
  const t = _tkFindTask(tasks, id);
  if (!t) return;
  const changed = mutator(t);
  if (!changed) return;
  t.updatedAt = Date.now();
  _saveState();
  // Clara proactive trigger: whenever a task's status changes, check
  // if every task on the active board is now 'done'. The check itself
  // guards against firing more than once per clear cycle.
  if (typeof window._claraCheckAllTasksDone === 'function') {
    const concept = getActiveConcept();
    if (concept) {
      try { window._claraCheckAllTasksDone(concept); } catch (err) { console.error('Clara all-done check failed:', err); }
    }
  }
  if (!silent) renderTasks(document.getElementById('homeContent'));
}

function _tkDeleteTask(id) {
  const tasks = getTasks();
  const idx = tasks.items.findIndex(function (t) { return t.id === id; });
  if (idx === -1) return;
  tasks.items.splice(idx, 1);
  if (tasks.detailId === id) tasks.detailId = null;
  _saveState();
  renderTasks(document.getElementById('homeContent'));
}

function _tkOpenDetail(id) {
  const tasks = getTasks();
  if (!_tkFindTask(tasks, id)) return;
  tasks.detailId = id;
  _saveState();
  renderTasks(document.getElementById('homeContent'));
}

function _tkCloseDetail() {
  getTasks().detailId = null;
  _saveState();
  renderTasks(document.getElementById('homeContent'));
}

// ---------------------------------------------
// Global hotkeys + click-away
// ---------------------------------------------

function _tkBindGlobalHotkeys() {
  if (window._tkHotkeysBound) return;
  window._tkHotkeysBound = true;

  document.addEventListener('keydown', function (e) {
    if (appState.mode !== 'home' || appState.activeView !== 'tasks') return;
    // Escape closes: (1) menu, (2) add modal, (3) detail panel \u2014 in
    // that order. Also cancels the new-board form.
    if (e.key === 'Escape') {
      if (_tkUiState.menuOpenTaskId) { _tkUiState.menuOpenTaskId = null; renderTasks(document.getElementById('homeContent')); return; }
      const tasks = getTasks();
      if (tasks.addModalOpen)   { tasks.addModalOpen = false;   _saveState(); renderTasks(document.getElementById('homeContent')); return; }
      if (tasks.newBoardOpen)   { tasks.newBoardOpen = false;   _saveState(); renderTasks(document.getElementById('homeContent')); return; }
      if (tasks.detailId)       { _tkCloseDetail(); return; }
    }
    // Cmd/Ctrl-K focuses the search
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      const s = document.getElementById('tkSearch');
      if (s) { e.preventDefault(); s.focus(); s.select(); }
    }
  });

  // Click-away for the three-dot menu.
  document.addEventListener('click', function (e) {
    if (!_tkUiState.menuOpenTaskId) return;
    if (e.target.closest && (e.target.closest('.tk-menu') || e.target.closest('[data-menu]'))) return;
    _tkUiState.menuOpenTaskId = null;
    // Only re-render if we're actually on tasks (avoids ripping the DOM
    // on unrelated clicks during teardown).
    if (appState.activeView === 'tasks') {
      renderTasks(document.getElementById('homeContent'));
    }
  });
}

window.renderTasks = renderTasks;
