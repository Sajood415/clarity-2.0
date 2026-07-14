// ---------------------------------------------
// Clarity 2.0 — Date Navigator (shared)
// ---------------------------------------------
//
// A compact date-selection surface used identically on the
// Today screen and the Tasks screen. Renders a left arrow +
// center pill (with calendar icon and the currently-viewed
// date) + right arrow, plus an inline calendar dropdown that
// opens beneath the pill for month-scale jumps.
//
// The nav is read + writes against `concept.today.viewedDate`
// (a nullable ISO 'YYYY-MM-DD'). Null / today's ISO means the
// user is on today's live list; any past ISO means we're
// browsing an archived day in read-only mode. Future dates
// are unreachable — the → arrow disables when we're on today,
// and future days in the calendar grid are visually muted and
// unclickable.
//
// The module exposes a single public entry:
//
//   window._dateNavigator.mount(hostElement, {
//     screen: 'today' | 'tasks',   // just an id string, controls the DOM id suffix
//     hasTasksForDate: (iso) => boolean, // optional: adds a dot below dates with tasks
//     onChange: () => void         // called after viewedDate is written; caller re-renders
//   });
//
// Everything else is module-private. No CSS in this file —
// styles live in styles/screens/today.css (`.td-datebar-*`
// and `.td-datepicker-*`) so both screens read from a single
// stylesheet.

(function () {
  'use strict';

  // ------------------------------------------------------------
  // ISO / date helpers
  // ------------------------------------------------------------

  // Local-time YYYY-MM-DD for the given Date (or today by default).
  // Uses local getters explicitly so we don't drift by a day across
  // timezones the way toISOString() would.
  function todayIso(d) {
    const dt = d || new Date();
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  // Parse 'YYYY-MM-DD' → Date at local midnight. Returns null for
  // anything malformed. Explicit-year parse dodges the Safari
  // midnight-UTC gotcha.
  function parseIso(iso) {
    if (typeof iso !== 'string') return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!m) return null;
    return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
  }

  // Add N days to an ISO date. Returns a new ISO string. Delta may
  // be negative. Returns the input unchanged if the input is
  // malformed (defensive — should never happen if callers use the
  // module's own ISO strings).
  function addDaysIso(iso, delta) {
    const d = parseIso(iso);
    if (!d) return iso;
    d.setDate(d.getDate() + delta);
    return todayIso(d);
  }

  // 'Tuesday, July 14' style — matches the spec exactly. Long weekday,
  // long month, no year (year is redundant when the user is stepping
  // day-by-day). The date is parsed via parseIso so an invalid input
  // falls back to today's date rather than showing 'Invalid Date'.
  function formatLong(iso) {
    const d = parseIso(iso) || new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    return days[d.getDay()] + ', ' + months[d.getMonth()] + ' ' + d.getDate();
  }

  function isTodayIso(iso) { return iso === todayIso(); }
  function isFutureIso(iso) {
    const a = parseIso(iso); const b = parseIso(todayIso());
    return !!(a && b && a.getTime() > b.getTime());
  }

  // ------------------------------------------------------------
  // State access helpers
  // ------------------------------------------------------------
  //
  // Both are defensive — callers on the tasks or today screen may
  // fire the mount before a concept exists (edge cases during
  // onboarding / concept switch). Returning the current-day ISO
  // in that case keeps the UI legible instead of exploding.

  function readViewedDate() {
    const c = (typeof window.getActiveConcept === 'function') ? window.getActiveConcept() : null;
    if (!c || !c.today) return todayIso();
    const v = c.today.viewedDate;
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    return todayIso();
  }

  function writeViewedDate(nextIso) {
    const c = (typeof window.getActiveConcept === 'function') ? window.getActiveConcept() : null;
    if (!c || !c.today) return;
    // Normalise: today's ISO stores as null (the "live" sentinel) so
    // opening the app tomorrow doesn't pin us to today's date after
    // midnight rollover. Past / future stores as the literal ISO.
    c.today.viewedDate = (nextIso === todayIso()) ? null : nextIso;
    if (typeof window._saveState === 'function') window._saveState();
  }

  // ------------------------------------------------------------
  // Inline SVGs
  // ------------------------------------------------------------

  const ICON_CHEV_LEFT = ''
    + '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" '
    +   'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    +   '<path d="M8.5 3 L4.5 7 L8.5 11"/>'
    + '</svg>';

  const ICON_CHEV_RIGHT = ''
    + '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" '
    +   'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    +   '<path d="M5.5 3 L9.5 7 L5.5 11"/>'
    + '</svg>';

  const ICON_CAL = ''
    + '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" '
    +   'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    +   '<rect x="1.75" y="3" width="12.5" height="11" rx="1.5"/>'
    +   '<path d="M1.75 6.75 H14.25"/>'
    +   '<path d="M5 1.5 V4.25 M11 1.5 V4.25"/>'
    + '</svg>';

  // ------------------------------------------------------------
  // Mount points registered by callers
  // ------------------------------------------------------------
  //
  // Each mount holds a small controller object (host, opts,
  // dropdown state, close handlers). We keep it flat rather
  // than modelling a class — there are only ever one or two
  // active mounts (Today + Tasks) and they never overlap.

  const mounts = [];

  function mount(host, opts) {
    if (!host) return;
    const controller = {
      host: host,
      opts: opts || {},
      // Which month is the calendar dropdown currently paging.
      // Independent of viewedDate so the user can browse months
      // without changing the selected date. Seeded to the
      // viewedDate's month on first open.
      calMonth: null,
      // Outside-click / Escape handler installed while the
      // dropdown is open. Kept per-controller so multiple
      // navigators can coexist without stepping on each other.
      outsideHandler: null,
      keyHandler: null
    };
    mounts.push(controller);
    _renderShell(controller);
    return controller;
  }

  function _closeAllDropdowns() {
    for (let i = 0; i < mounts.length; i++) _closeDropdown(mounts[i]);
  }

  function _closeDropdown(controller) {
    const dd = controller.host.querySelector('.td-datepicker');
    if (dd && dd.parentNode) dd.parentNode.removeChild(dd);
    const pill = controller.host.querySelector('.td-datebar-pill');
    if (pill) pill.setAttribute('aria-expanded', 'false');
    if (controller.outsideHandler) {
      document.removeEventListener('mousedown', controller.outsideHandler, true);
      controller.outsideHandler = null;
    }
    if (controller.keyHandler) {
      document.removeEventListener('keydown', controller.keyHandler, true);
      controller.keyHandler = null;
    }
  }

  // Emit an onChange up to the mount owner. Every mount currently
  // triggers a full re-render on its owning screen, but that's the
  // screen's decision — we don't want this module to know about
  // renderApp or the screen-specific render functions directly.
  function _emitChange(controller) {
    if (typeof controller.opts.onChange === 'function') {
      try { controller.opts.onChange(); } catch (err) {
        console.error('Date navigator onChange threw:', err);
      }
    }
  }

  // ------------------------------------------------------------
  // Shell (arrows + center pill) render + wiring
  // ------------------------------------------------------------

  function _renderShell(controller) {
    const host = controller.host;
    const viewed = readViewedDate();
    const isToday = isTodayIso(viewed);
    const canGoForward = !isToday && !isFutureIso(addDaysIso(viewed, 1));
    const suffix = String((controller.opts.screen || 'x')).replace(/[^a-z0-9]/gi, '');

    host.innerHTML = ''
      + '<div class="td-datebar" role="group" aria-label="Date navigation">'
      +   '<button type="button" class="td-datebar-arrow" '
      +     'id="tdDatePrev_' + suffix + '" aria-label="Previous day">' + ICON_CHEV_LEFT + '</button>'
      +   '<button type="button" class="td-datebar-pill" '
      +     'id="tdDatePill_' + suffix + '" aria-haspopup="true" aria-expanded="false" '
      +     'aria-label="Open calendar">'
      +     '<span class="td-datebar-pill-icon" aria-hidden="true">' + ICON_CAL + '</span>'
      +     '<span class="td-datebar-pill-label">' + formatLong(viewed) + '</span>'
      +     (isToday ? '<span class="td-datebar-pill-today">Today</span>' : '')
      +   '</button>'
      +   '<button type="button" class="td-datebar-arrow" '
      +     'id="tdDateNext_' + suffix + '" aria-label="Next day"'
      +     (canGoForward ? '' : ' disabled') + '>' + ICON_CHEV_RIGHT + '</button>'
      + '</div>';

    const prev = host.querySelector('#tdDatePrev_' + suffix);
    const next = host.querySelector('#tdDateNext_' + suffix);
    const pill = host.querySelector('#tdDatePill_' + suffix);

    if (prev) prev.addEventListener('click', function () {
      const nextIso = addDaysIso(readViewedDate(), -1);
      writeViewedDate(nextIso);
      _closeDropdown(controller);
      _emitChange(controller);
    });
    if (next) next.addEventListener('click', function () {
      if (next.hasAttribute('disabled')) return;
      const target = addDaysIso(readViewedDate(), 1);
      if (isFutureIso(target)) return; // guardrail
      writeViewedDate(target);
      _closeDropdown(controller);
      _emitChange(controller);
    });
    if (pill) pill.addEventListener('click', function () {
      if (pill.getAttribute('aria-expanded') === 'true') {
        _closeDropdown(controller);
      } else {
        _openDropdown(controller);
      }
    });
  }

  // ------------------------------------------------------------
  // Dropdown (month grid + prev / next month + weekday header)
  // ------------------------------------------------------------

  function _openDropdown(controller) {
    // Close any other open dropdowns first so only one is live.
    _closeAllDropdowns();

    const viewed = readViewedDate();
    const anchor = parseIso(viewed) || new Date();
    // Seed the calendar month to whichever month the currently-viewed
    // date belongs to, so the user's "you are here" is always visible
    // on first open.
    controller.calMonth = { year: anchor.getFullYear(), month: anchor.getMonth() };

    const dd = document.createElement('div');
    dd.className = 'td-datepicker';
    dd.setAttribute('role', 'dialog');
    dd.setAttribute('aria-label', 'Choose a date');
    controller.host.appendChild(dd);
    _renderDropdown(controller, dd);

    const pill = controller.host.querySelector('.td-datebar-pill');
    if (pill) pill.setAttribute('aria-expanded', 'true');

    // Outside-click closes. Registered on capture so we win over
    // any bubbled handlers inside the pill/dropdown that would
    // otherwise re-open the dropdown from the same click.
    controller.outsideHandler = function (e) {
      if (!controller.host.contains(e.target)) _closeDropdown(controller);
    };
    document.addEventListener('mousedown', controller.outsideHandler, true);

    // Escape closes; Enter / Space activate focused day cells
    // handled at the cell level via native <button> chrome.
    controller.keyHandler = function (e) {
      if (e.key === 'Escape') _closeDropdown(controller);
    };
    document.addEventListener('keydown', controller.keyHandler, true);
  }

  function _renderDropdown(controller, dd) {
    const cm = controller.calMonth;
    const year = cm.year;
    const month = cm.month;
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const first = new Date(year, month, 1);
    const startDay = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const viewed = readViewedDate();
    const todayI = todayIso();
    const hasTasks = (typeof controller.opts.hasTasksForDate === 'function')
      ? controller.opts.hasTasksForDate
      : function () { return false; };

    const cells = [];
    for (let i = 0; i < 42; i++) {
      const dayNum = i - startDay + 1;
      if (dayNum < 1 || dayNum > daysInMonth) {
        cells.push('<div class="td-datepicker-day td-datepicker-day-outside" aria-hidden="true"></div>');
        continue;
      }
      const iso = todayIso(new Date(year, month, dayNum));
      const future = isFutureIso(iso);
      const isCurrent = iso === todayI;
      const isSelected = iso === viewed;
      const hasActivity = hasTasks(iso);

      const cls = ['td-datepicker-day'];
      if (isCurrent)   cls.push('td-datepicker-day-today');
      if (isSelected)  cls.push('td-datepicker-day-selected');
      if (future)      cls.push('td-datepicker-day-future');
      if (!hasActivity && !isCurrent) cls.push('td-datepicker-day-empty');

      const attrs = future
        ? ' disabled aria-disabled="true"'
        : ' data-iso="' + iso + '"';

      cells.push(''
        + '<button type="button" class="' + cls.join(' ') + '"' + attrs + '>'
        +   '<span class="td-datepicker-day-num">' + dayNum + '</span>'
        +   (hasActivity ? '<span class="td-datepicker-day-dot" aria-hidden="true"></span>' : '')
        + '</button>');
    }

    dd.innerHTML = ''
      + '<div class="td-datepicker-head">'
      +   '<button type="button" class="td-datepicker-navbtn" data-cal-nav="-1" aria-label="Previous month">'
      +     ICON_CHEV_LEFT
      +   '</button>'
      +   '<div class="td-datepicker-head-label">' + monthNames[month] + ' ' + year + '</div>'
      +   '<button type="button" class="td-datepicker-navbtn" data-cal-nav="1" aria-label="Next month">'
      +     ICON_CHEV_RIGHT
      +   '</button>'
      + '</div>'
      + '<div class="td-datepicker-weekdays">'
      +   dayLabels.map(function (d) { return '<div class="td-datepicker-weekday">' + d + '</div>'; }).join('')
      + '</div>'
      + '<div class="td-datepicker-grid">' + cells.join('') + '</div>'
      + '<div class="td-datepicker-foot">'
      +   '<button type="button" class="td-datepicker-jump-today" data-cal-jump="today">Jump to today</button>'
      + '</div>';

    // Month prev/next
    dd.querySelectorAll('[data-cal-nav]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        const delta = parseInt(btn.getAttribute('data-cal-nav'), 10) || 0;
        let m = controller.calMonth.month + delta;
        let y = controller.calMonth.year;
        while (m < 0)  { m += 12; y -= 1; }
        while (m > 11) { m -= 12; y += 1; }
        controller.calMonth = { year: y, month: m };
        _renderDropdown(controller, dd);
      });
    });

    // Day cells
    dd.querySelectorAll('[data-iso]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        const iso = btn.getAttribute('data-iso');
        writeViewedDate(iso);
        _closeDropdown(controller);
        _emitChange(controller);
      });
    });

    // Jump-to-today shortcut
    const jump = dd.querySelector('[data-cal-jump="today"]');
    if (jump) {
      jump.addEventListener('click', function (e) {
        e.stopPropagation();
        writeViewedDate(todayIso());
        _closeDropdown(controller);
        _emitChange(controller);
      });
    }
  }

  // ------------------------------------------------------------
  // Public
  // ------------------------------------------------------------

  window._dateNavigator = {
    mount: mount,
    // Exposed helpers so the Today / Tasks screens can read the
    // viewedDate + do their own past-vs-live comparisons without
    // duplicating ISO logic.
    todayIso: todayIso,
    parseIso: parseIso,
    addDaysIso: addDaysIso,
    formatLong: formatLong,
    isTodayIso: isTodayIso,
    isFutureIso: isFutureIso,
    readViewedDate: readViewedDate,
    writeViewedDate: writeViewedDate,
    closeAllDropdowns: _closeAllDropdowns
  };
})();
