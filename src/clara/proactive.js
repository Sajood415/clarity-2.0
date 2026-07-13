// ---------------------------------------------
// Clarity 2.0 — Clara proactive triggers
// ---------------------------------------------
//
// Three unsolicited nudges that fire outside the normal request/response
// loop, driven by state transitions elsewhere in the app:
//
//   1. All tasks done       (hook: _tkUpdateTask in tasks.js)
//      When every item on the active board flips to status 'done',
//      Clara offers to suggest 3 new tasks.
//
//   2. First content published (hook: _crPushResultItem in create.js)
//      The moment concept.results.items grows from 0 \u2192 1, Clara
//      celebrates and offers the next content idea.
//
//   3. Returning user       (hook: main.js DOMContentLoaded, pre-render)
//      If the active concept's persisted lastActive is more than
//      CL_RETURNING_MS ago, Clara welcomes the user back with a
//      contextual status line.
//
// Each trigger:
//   \u2013 Only fires when onboarding is complete for the target concept.
//   \u2013 Pushes a Clara message onto concept.chat.messages, with
//     `options` metadata so chat.js knows to render inline chips.
//   \u2013 Calls _claraNotifyUnread() so the sidebar Chat badge tracks
//     unread proactive messages when the user isn't currently on Chat.
//
// Each trigger's "cycle" is guarded by a flag in
// concept.claraTriggers.* so we don't spam the log on every save.

// Any activity older than this counts as a "return" (real time, in ms).
// Kept at 6 hours so it's demo-friendly (visit again the next day, or
// leave a tab overnight, and Clara greets you) without triggering on
// a coffee break.
const CL_RETURNING_MS = 6 * 60 * 60 * 1000;

// ---------------------------------------------
// Small helpers
// ---------------------------------------------

function _claraPushMessage(concept, message) {
  if (!concept || !concept.chat) return;
  if (!Array.isArray(concept.chat.messages)) concept.chat.messages = [];
  concept.chat.messages.push(message);
}

// Guard: proactive messages only fire once the concept is fully out of
// onboarding AND the post-onboarding customer-validation beat is done.
// Both option rows (validation + proactive) rendering at once would be
// confusing, so we wait until the concept is settled at step 'done'.
function _claraCanTrigger(concept) {
  if (!concept || !concept.chat) return false;
  if (!concept.chat.onboardingComplete) return false;
  if (concept.chat.onboardingStep !== 'done') return false;
  const business = concept.business || {};
  if (business.customerValidated === false) return false;
  return true;
}

// Repaint chat + sidebar so a proactive message that lands while the
// user is looking at Chat / anywhere else shows up immediately without
// waiting for the next navigation. Both are lightweight enough to call
// eagerly \u2014 chat.js paints from the log and skips animation on
// restore, sidebar.js just diffs one element.
function _claraFlushRender() {
  if (typeof window._syncSidebar === 'function') {
    try { window._syncSidebar(); } catch (_) { /* not mounted yet is fine */ }
  }
  if (window.appState && window.appState.activeView === 'chat'
      && typeof window.renderChat === 'function') {
    const host = document.getElementById('homeContent');
    if (host) window.renderChat(host);
  }
}

// ---------------------------------------------
// Trigger 1 — All tasks done (active board)
// ---------------------------------------------
//
// Called from tasks.js after every _tkUpdateTask. Decides based on the
// active board's items whether the "you've cleared everything" beat
// should fire. Uses a per-board flag so:
//   \u2013 The trigger fires at most once per "clear" cycle.
//   \u2013 If the user re-opens a task (drops it back to 'todo' /
//     'inprogress'), the flag resets so the next full-clear will
//     legitimately fire again.

function _claraCheckAllTasksDone(concept) {
  if (!_claraCanTrigger(concept)) return;
  if (!concept.tasks || !Array.isArray(concept.tasks.items)) return;
  const boardId = concept.tasks.activeBoard || 'default';
  const onBoard = concept.tasks.items.filter(function (t) {
    return t && t.boardId === boardId;
  });
  if (onBoard.length === 0) {
    // Empty board \u2014 not a "clear", never a trigger. Clear the flag so
    // the next time real tasks appear and get done, the beat fires.
    if (concept.claraTriggers && concept.claraTriggers.allDoneFired) {
      delete concept.claraTriggers.allDoneFired[boardId];
    }
    return;
  }
  const allDone = onBoard.every(function (t) { return t.status === 'done'; });

  concept.claraTriggers = concept.claraTriggers || { allDoneFired: {}, firstResultFired: false, welcomeBackFired: false };
  concept.claraTriggers.allDoneFired = concept.claraTriggers.allDoneFired || {};

  if (!allDone) {
    // Any task un-cleared \u2014 reset the flag for this board so a fresh
    // clear can fire the trigger again.
    if (concept.claraTriggers.allDoneFired[boardId]) {
      delete concept.claraTriggers.allDoneFired[boardId];
      if (typeof window._saveState === 'function') window._saveState();
    }
    return;
  }

  if (concept.claraTriggers.allDoneFired[boardId]) return;

  concept.claraTriggers.allDoneFired[boardId] = true;

  // Small 2s delay so the user has a moment to see the last card flip
  // to Done before Clara pipes up.
  setTimeout(function () {
    _claraPushMessage(concept, {
      role: 'clara',
      text: 'Great work, you\u2019ve cleared everything on your list. Want me to suggest what to focus on next?',
      options: {
        action: 'suggest-tasks',
        labels: ['Yes, suggest new tasks', 'I\u2019ll add my own']
      }
    });
    if (typeof window._saveState === 'function') window._saveState();
    if (typeof window._claraNotifyUnread === 'function') window._claraNotifyUnread();
    _claraFlushRender();
  }, 2000);
}

// Action handler for the "suggest-tasks" option. Called from chat.js
// when the user picks one of the two chips. Returns a promise-ish
// object shape ({ userEcho, follow }) so the caller can render the
// user's bubble + queue Clara's follow-up through her existing pipeline.

function _claraHandleSuggestTasks(concept, choice) {
  const yes = /^yes/i.test(choice);
  if (!yes) {
    return { userEcho: choice, follow: 'Sounds good. I\u2019ll be here whenever you want to talk it through.' };
  }
  // Generate 3 new tasks via the existing _todayTasks() generator. The
  // app has two parallel task surfaces:
  //   \u2022 concept.tasks.items  \u2014 the Tasks workspace (Board /
  //     Kanban / List / Calendar). This is where the "all done"
  //     trigger watches from, and where the new Clara suggestions get
  //     appended so the historical board keeps growing.
  //   \u2022 concept.today.tasks  \u2014 the Today view's 3-card focus
  //     list. Overview reads from here too. This one gets REPLACED with
  //     the fresh 3 so Today feels like a clean "new set of tasks",
  //     which is what the user expects after Clara says "I've added
  //     3 new tasks to your list."
  // _todayTasks() is deterministic (same business context \u2192 same 3
  // tasks) so re-runs of this flow do generate duplicates. That's on
  // the roadmap; not blocking the surface visibility fix here.
  const boardId = (concept.tasks && concept.tasks.activeBoard) || 'default';
  let added = 0;
  let fresh = [];
  if (typeof window._todayTasks === 'function') {
    const savedActive = window.appState ? window.appState.activeConceptId : null;
    if (window.appState) window.appState.activeConceptId = concept.id;
    try { fresh = window._todayTasks() || []; } catch (_) { fresh = []; }
    if (window.appState) window.appState.activeConceptId = savedActive;
    fresh = fresh.slice(0, 3);
  }

  // --- Tasks workspace: APPEND (keeps history) ---
  if (typeof window._taskFromClara === 'function') {
    if (!Array.isArray(concept.tasks.items)) concept.tasks.items = [];
    fresh.forEach(function (t, i) {
      const item = window._taskFromClara(t, i);
      item.boardId = boardId;
      item.status = 'todo';
      concept.tasks.items.push(item);
      added++;
    });
  }

  // --- Today view / Overview: REPLACE (fresh 3 focus tasks) ---
  if (fresh.length > 0) {
    if (!concept.today) concept.today = { tasks: [], viewingTaskId: null, viewingInsightId: null };
    concept.today.tasks = fresh.map(function (t) {
      return Object.assign({}, t, { status: 'todo' });
    });
    // Drop any pinned detail id \u2014 the task it pointed at is gone.
    // Insight-detail pointer is left alone because insight cards live
    // separately from the task list, so a task refresh shouldn't kick
    // the user out of a Daily Insight they were mid-read on.
    concept.today.viewingTaskId = null;
  }

  // Clearing the "all done" flag so if the user knocks these three out,
  // the trigger fires again on the next clear.
  if (concept.claraTriggers && concept.claraTriggers.allDoneFired) {
    delete concept.claraTriggers.allDoneFired[boardId];
  }
  return { userEcho: choice, follow: 'Done, I\u2019ve added ' + added + ' new task' + (added === 1 ? '' : 's') + ' to your list. You\u2019ll see them in Today too.' };
}

// ---------------------------------------------
// Trigger 2 — First content published
// ---------------------------------------------
//
// Called from create.js immediately after _crPushResultItem. We already
// know results.items grew by 1; if this was the first ever, and the
// concept hasn't already been congratulated, Clara nudges.

function _claraCheckFirstResult(concept) {
  if (!_claraCanTrigger(concept)) return;
  if (!concept.results || !Array.isArray(concept.results.items)) return;
  if (concept.results.items.length !== 1) return; // strictly first
  concept.claraTriggers = concept.claraTriggers || { allDoneFired: {}, firstResultFired: false, welcomeBackFired: false };
  if (concept.claraTriggers.firstResultFired) return;
  concept.claraTriggers.firstResultFired = true;

  setTimeout(function () {
    _claraPushMessage(concept, {
      role: 'clara',
      text: 'Your first piece is out there. That\u2019s the hardest one. How did it feel? Want me to suggest what to create next to keep the momentum going?',
      options: {
        action: 'next-content',
        labels: ['Yes, what\u2019s next?']
      }
    });
    if (typeof window._saveState === 'function') window._saveState();
    if (typeof window._claraNotifyUnread === 'function') window._claraNotifyUnread();
    _claraFlushRender();
  }, 1000);
}

function _claraHandleNextContent(concept) {
  const idea = (typeof window._claraNextContentIdea === 'function')
    ? window._claraNextContentIdea(concept)
    : 'Keep the same tone as your first piece and post again within 48 hours. Momentum matters more than polish right now.';
  return { userEcho: 'Yes, what\u2019s next?', follow: idea };
}

// ---------------------------------------------
// Trigger 3 — Returning user (boot-time)
// ---------------------------------------------
//
// Called from main.js right after _restoreState() and BEFORE the first
// renderApp(). We compare the persisted lastActive to now; if it's
// more than CL_RETURNING_MS ago, Clara pushes a welcome-back message
// with contextual counts.

function _claraCheckReturningUser() {
  if (!window.appState || !window.appState.activeConceptId) return;
  const concept = window.appState.concepts[window.appState.activeConceptId];
  if (!_claraCanTrigger(concept)) return;
  if (concept.claraTriggers && concept.claraTriggers.welcomeBackFired) return;

  const now = Date.now();
  const last = concept.lastActive || 0;
  if (!last || (now - last) < CL_RETURNING_MS) return;

  concept.claraTriggers = concept.claraTriggers || { allDoneFired: {}, firstResultFired: false, welcomeBackFired: false };
  concept.claraTriggers.welcomeBackFired = true;

  // Contextual counts pulled straight from concept state.
  const items = (concept.tasks && Array.isArray(concept.tasks.items)) ? concept.tasks.items : [];
  const activeBoard = (concept.tasks && concept.tasks.activeBoard) || 'default';
  const incomplete = items.filter(function (t) {
    return t && t.boardId === activeBoard && t.status !== 'done';
  });
  const results = (concept.results && Array.isArray(concept.results.items))
    ? concept.results.items
    : [];
  const publishedCount = results.filter(function (r) {
    return r && r.status && r.status !== 'draft';
  }).length;

  const resultsLine = publishedCount > 0
    ? publishedCount + ' piece' + (publishedCount === 1 ? '' : 's') + ' published so far.'
    : 'nothing published yet, let\u2019s change that.';

  const text = 'Welcome back. You have ' + incomplete.length
    + ' task' + (incomplete.length === 1 ? '' : 's') + ' waiting and '
    + resultsLine + ' Where do you want to start?';

  // Option chips: up to two of the top incomplete tasks, plus a
  // universal "Start creating" fallback. Titles are trimmed so a
  // wordy task doesn't blow out the chip row.
  const chipTitles = incomplete.slice(0, 2).map(function (t) {
    const title = String(t.title || 'Open task').trim();
    return title.length > 42 ? title.slice(0, 40).replace(/\s+\S*$/, '') + '\u2026' : title;
  });
  const labels = chipTitles.concat(['Start creating']);

  _claraPushMessage(concept, {
    role: 'clara',
    text: text,
    options: {
      action: 'welcome-back',
      labels: labels
    }
  });
  if (typeof window._saveState === 'function') window._saveState();
  // Boot-time trigger: user hasn't reached the shell yet, so definitely
  // bump the unread counter unless they're being routed straight to Chat.
  if (typeof window._claraNotifyUnread === 'function') window._claraNotifyUnread();
}

function _claraHandleWelcomeBack(concept, choice) {
  const wantsCreate = /^start creating$/i.test(choice);
  if (wantsCreate) {
    // Navigate them to Create.
    if (typeof window.setActiveView === 'function') {
      window.setActiveView('create');
      if (typeof window.renderApp === 'function') window.renderApp();
    }
    return { userEcho: choice, follow: null }; // navigation replaces the chat view
  }
  // Otherwise the label is a task title \u2014 nav to Today so the user
  // can pick it up.
  if (typeof window.setActiveView === 'function') {
    window.setActiveView('today');
    if (typeof window.renderApp === 'function') window.renderApp();
  }
  return { userEcho: choice, follow: null };
}

// ---------------------------------------------
// Exports
// ---------------------------------------------

window.CL_RETURNING_MS = CL_RETURNING_MS;
window._claraCheckAllTasksDone = _claraCheckAllTasksDone;
window._claraCheckFirstResult = _claraCheckFirstResult;
window._claraCheckReturningUser = _claraCheckReturningUser;
window._claraHandleSuggestTasks = _claraHandleSuggestTasks;
window._claraHandleNextContent = _claraHandleNextContent;
window._claraHandleWelcomeBack = _claraHandleWelcomeBack;
