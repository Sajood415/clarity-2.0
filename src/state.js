// ---------------------------------------------
// Clarity 2.0 — App State (concepts model)
// ---------------------------------------------
//
// This is the single source of truth. The shape:
//
//   appState = {
//     mode:              'splash' | 'auth' | 'loading' | 'welcome' | 'home',
//     activeConceptId:   string | null,
//     activeView:        'today' | 'create' | 'results'
//                      | 'insights-detail' | 'concepts-list' | '<name>-report'
//                      | 'overview' | 'chat' | 'insights' (all legacy,
//                                    no longer surfaced in the sidebar
//                                    but still routable for safety),
//     insightsDetailId:  string | null,   // active item on the insights-detail sub-page
//     user:              { name, email } | null,
//     auth:              { mode: 'signup' | 'login' },
//     sidebarOpen:       boolean,
//     sidebarCollapsed:  boolean,       // persisted: rail mode (icons only) vs full
//     concepts:          { [id]: Concept },
//     conceptDropdownOpen: boolean,   // sidebar concept-picker toggle
//     onboardingOverlayOpen: boolean  // full-screen onboarding scrim
//   }
//
//   Concept = {
//     id, createdAt,
//     business: { name, type, product, goal, reach, challenge },
//     chat:     { messages: [{role,text}], onboardingComplete: boolean },
//     create:   { step, type, platform, angle, variations, selected, fromTask,
//                 generating, draftSaved, userRequest, askSubmitted },
//     results:  { items: [] }
//   }
//
// Every screen reads from `getActiveConcept()`. There is no more global
// `appState.business` / `appState.clara.messages` / etc. — that was the old
// single-concept model and is migrated on load.

const STATE_KEY = 'clarity_v2';

// Warm palette that each new concept cycles through. The concept's color
// shows up in the sidebar dot + active-row border and in the concept badge
// on every view so switching concepts feels visually distinct even though
// they share the same Today/Create/Results shell.
const CONCEPT_COLORS = [
  '#F5A623', // amber
  '#E8845A', // coral
  '#C8A96E', // gold
  '#8FA96E', // sage
  '#5AAAB0', // teal
  '#9F7AC5', // lavender
  '#D06B6B', // rose
  '#7A9FC5'  // steel
];

// We deliberately never reassign this reference so `window.appState` (set at
// the bottom of the file) always points to the same object. All updates
// mutate this object in place via `_replaceState()` or property assignment.
const appState = _defaultState();

function _defaultState() {
  return {
    mode: 'splash',
    activeConceptId: null,
    // Today is the default landing view. Chat / create / insights are
    // peer nav items. Overview was retired as a nav destination but
    // remains routable for legacy safety.
    activeView: 'today',
    user: null,
    auth: { mode: 'signup' },
    sidebarOpen: false,
    // Persists the "icons-only rail" preference across sessions. False
    // means full-width 240px; true means 64px with icons and tooltips.
    sidebarCollapsed: false,
    // Global UI preference for the Today tab \u2014 'list' or 'kanban'.
    // Sticky across concepts so the user's view choice follows them.
    // The actual task list (with statuses) lives per-concept on
    // `concept.today.tasks`.
    today: { view: 'list' },
    // Transient sidebar flag \u2014 flips true while the "Log out"
    // confirmation is showing. Not persisted (see `_saveState` / the
    // normalizer, which force it back to false on load).
    confirmingLogout: false,
    // Transient UI flags for the new dashboard shell. Neither is
    // persisted; the normalizer force-resets them on load.
    conceptDropdownOpen: false,
    onboardingOverlayOpen: false,
    // Which content item the Insights detail sub-page is currently
    // showing. Persisted so a reload on the detail view can restore
    // context. Cleared when the user navigates back to /insights.
    insightsDetailId: null,
    // Unread proactive Clara messages while the user isn't on the Chat
    // nav. Incremented by _claraNotifyUnread() whenever Clara pushes a
    // message and appState.activeView !== 'chat'. Cleared on Chat nav
    // click (sidebar) and by renderChat as a defensive fallback.
    chatUnread: 0,
    concepts: {}
  };
}

function _replaceState(next) {
  // Wipe existing keys we don't own anymore, then copy in the new values.
  Object.keys(appState).forEach(function (k) { delete appState[k]; });
  Object.keys(next).forEach(function (k) { appState[k] = next[k]; });
}

function _defaultBusiness() {
  // Onboarding rebuild (6-question structured flow) adds:
  //   typeDescription  — free text set only when type === 'other'
  //   customer         — Q3 raw text (ideal customer + what they sell)
  //   channels         — Q4 multi-select array of channel labels
  //   budget           — Q5 monthly-budget machine key:
  //                      'zero' | 'low' | 'medium' | 'high' |
  //                      'enterprise' | 'unknown'
  //   locations        — Q6 array of { country, city } pairs (new
  //                      structured source of truth for where the
  //                      business operates)
  //   location         — Q6 legacy derived string ("City, Country" or
  //                      "City, Country · City2, Country2") kept in
  //                      sync with `locations` so today.js, tasks.js,
  //                      results.js, conceptsList.js, and reports.js
  //                      keep working without per-file changes.
  // The pre-rebuild fields (name, type, product, goal, reach, challenge)
  // stay so downstream code (sidebar, create.js, task generator) and any
  // legacy concepts on disk keep working.
  return {
    name: '',
    type: '',
    typeDescription: '',
    product: '',
    goal: '',
    customer: '',
    channels: [],
    budget: '',
    locations: [],
    location: '',
    reach: '',
    challenge: '',
    // Set true once the user has confirmed (or corrected) the customer
    // summary Clara reads back right after onboarding completes. Prevents
    // the validation prompt from ever asking twice for the same concept.
    customerValidated: false
  };
}

// Renders the array of { country, city } location pairs into the legacy
// string form. Kept module-scoped so state normalization and the
// onboarding Q6 handler can both produce the exact same string. Empty
// input returns empty string; individual missing pieces fall back
// gracefully so "Peshawar" alone renders as "Peshawar" rather than
// "Peshawar, ".
function _formatLocationsString(locations) {
  if (!Array.isArray(locations) || locations.length === 0) return '';
  const parts = [];
  for (let i = 0; i < locations.length; i++) {
    const loc = locations[i] || {};
    const city = (loc.city || '').trim();
    const country = (loc.country || '').trim();
    if (city && country) parts.push(city + ', ' + country);
    else if (city) parts.push(city);
    else if (country) parts.push(country);
  }
  return parts.join(' \u00b7 ');
}

// Backfills business.locations from a legacy business.location string.
// Called from _normalizeState when a persisted concept has the old
// single-string field but no structured pairs. Best-effort parse:
//   "City, Country"   → [{ city, country }]
//   "City"            → [{ city, country: '' }]
//   "City1, Country1 · City2, Country2" (already-derived string) is
//   also parsed on the interpunct so we don't create duplicates when
//   the user re-enters the flow.
function _parseLegacyLocation(str) {
  const raw = (str || '').trim();
  if (!raw) return [];
  const chunks = raw.split(/\s*\u00b7\s*|\s*\|\s*/);
  const out = [];
  for (let i = 0; i < chunks.length; i++) {
    const piece = chunks[i].trim();
    if (!piece) continue;
    const commaIdx = piece.indexOf(',');
    if (commaIdx !== -1) {
      const city = piece.slice(0, commaIdx).trim();
      const country = piece.slice(commaIdx + 1).trim();
      if (city || country) out.push({ city: city, country: country });
    } else {
      out.push({ city: piece, country: '' });
    }
  }
  return out;
}

function _defaultCreate() {
  // Create wizard is now format-first (Image / Video / Text / Audio),
  // matching how the user actually thinks about "what am I making".
  // Step 1 picks contentType, Step 2 picks platform (+ subFormat for
  // text: post / email / newsletter / thread), Step 3 shows variations
  // shaped per format, Step 4 previews + publishes.
  return {
    step: 1,
    contentType: null,       // 'image' | 'video' | 'text' | 'audio'
    subFormat: null,         // (text only): 'post' | 'email' | 'newsletter' | 'thread'
    selectedPlatform: null,  // 'instagram' | 'tiktok' | 'youtube' | 'facebook'
                             // | 'linkedin' | 'x' | 'email' | 'podcast'
    selectedVariation: null,
    // Step 2 pre-fills a Clara-authored brief the user can edit before
    // hitting Generate. Empty until Step 2 renders for the first time.
    customBrief: '',
    variations: [],
    // If the user arrived here via a Today task, this holds the task
    // so _crInit can pre-select sensible defaults for contentType,
    // subFormat, and platform. Cleared on Publish / Start over.
    fromTask: null,
    generating: false,
    // Bumped every time the user hits "Regenerate" on Step 3. Each
    // format's variation pool has 6 entries; the count picks a 3-item
    // window into that pool so the same format can produce distinct
    // trios without needing an LLM. Persisted so a reload doesn't
    // silently reset the variations the user is looking at.
    regenerationCount: 0,
    // Transient: true while the Publish success animation is playing
    // before we redirect to Insights. Normalized back to false on load
    // so a stale flag never freezes the UI mid-flow.
    publishing: false
  };
}

function _defaultResults() {
  return { items: [] };
}

// Default task board. Every concept starts with this one and it can't
// be deleted; the "My Tasks" name and amber accent are preserved
// across migrations so users always see a home for tasks that don't
// belong to a custom board.
function _defaultTaskBoard() {
  return { id: 'default', name: 'My Tasks', color: '#F5A623', isDefault: true };
}

// The Tasks feature (dashboard nav item) lives per-concept and is
// completely independent of the Today kanban. Shape:
//   boards      \u2014 [{ id, name, color, isDefault }]. First entry is always
//                 the default board (id: 'default') so existing task ids
//                 don't need to know which board they hang off.
//   items       \u2014 [{ id, title, description, status, priority, type,
//                 source, boardId, dueDate, createdAt, updatedAt,
//                 claraNotes, activity }]. `status` is one of the four
//                 kanban columns ('todo' | 'inprogress' | 'done' |
//                 'blocked'); `priority` is 'p0' | 'p1' | 'p2';
//                 `type` is a business function label; `source` is
//                 'clara' or 'manual'. `activity` is an append-only
//                 log of {ts, kind, from, to, note} events keyed off
//                 the same fields the detail panel edits.
//   activeBoard \u2014 currently-visible boardId. Falls back to 'default'.
//   view        \u2014 'board' | 'list' | 'calendar'. Sticky per concept so
//                 switching concepts doesn't reset the user's preference.
//   filters     \u2014 { status: [], priority: [], type: [], source: [] };
//                 arrays of active values. Empty array = filter off for
//                 that dimension. Empty across the board = show all.
//   searchQuery \u2014 live text; matches title + description.
//   detailId    \u2014 the task id whose right-side detail panel is open.
//   addModalOpen  \u2014 transient; controls the "+ Add task" modal.
//   newBoardOpen  \u2014 transient; controls the inline new-board form.
//   calendarMonth \u2014 { year, month } the calendar view is anchored to.
//                    Zero-indexed month like `Date.getMonth()`.
//   calendarSelectedDate \u2014 'YYYY-MM-DD' of the day whose task list is
//                    open below the grid, or null if none.
function _defaultTasks() {
  return {
    boards: [_defaultTaskBoard()],
    items: [],
    activeBoard: 'default',
    view: 'board',
    filters: { status: [], priority: [], type: [], source: [] },
    searchQuery: '',
    detailId: null,
    addModalOpen: false,
    newBoardOpen: false,
    calendarMonth: null,
    calendarSelectedDate: null
  };
}

// Six-preset palette the "new board" color picker offers. Kept as a
// module-level constant so the picker + validator agree on the set of
// legal colors. Any hex value is accepted at persistence time (a user
// might edit the JSON), but the picker only offers these six.
const TASK_BOARD_COLORS = ['#F5A623', '#5AAAB0', '#E8845A', '#9F7AC5', '#7A9FC5', '#7ED07A'];

// Machine-key task type. Every card carries one so filtering by type
// works across Clara-authored and manual tasks. `_taskTypeFromClara`
// below maps GTM task categories (POST / OUTREACH / OFFER) into these.
const TASK_TYPES = ['marketing', 'sales', 'operations', 'product', 'content', 'other'];
const TASK_STATUSES = ['todo', 'inprogress', 'done', 'blocked'];
const TASK_PRIORITIES = ['p0', 'p1', 'p2'];
const TASK_SOURCES = ['clara', 'manual'];
const TASK_VIEWS = ['board', 'list', 'calendar'];

function _newTaskId() {
  return 'tk_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

function _newBoardId() {
  return 'bd_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

// Maps a Clara GTM task (from src/clara/tasks.js) into a Tasks-panel
// item. The GTM task shape is { id, type ('POST'|'OUTREACH'|'OFFER'),
// description, time, reason }. We fold `reason` into `claraNotes` so
// the detail panel can surface it as Clara's rationale.
function _taskFromClara(gtmTask, index) {
  const kind = String(gtmTask.type || '').toUpperCase();
  let taskType = 'marketing';
  if (kind === 'OUTREACH') taskType = 'sales';
  else if (kind === 'OFFER') taskType = 'sales';
  else if (kind === 'POST')  taskType = 'content';
  const title = String(gtmTask.description || 'Task').trim();
  const now = Date.now();
  return {
    id: _newTaskId(),
    title: title.length > 90 ? title.slice(0, 87).replace(/\s+\S*$/, '') + '\u2026' : title,
    description: title.length > 90 ? title : '',
    status: 'todo',
    priority: index === 0 ? 'p1' : 'p2',
    type: taskType,
    source: 'clara',
    boardId: 'default',
    dueDate: '',
    createdAt: now,
    updatedAt: now,
    claraNotes: gtmTask.reason ? String(gtmTask.reason) : '',
    activity: [{ ts: now, kind: 'created', note: 'Clara suggested this task' }]
  };
}

// One-shot backfill: seed the Tasks list for a completed-onboarding
// concept that has never had Tasks populated. Called from the
// normalizer so any legacy concept picks up its Clara tasks the first
// time we see it. Returns true if any items were added.
function _seedClaraTasksIfMissing(concept) {
  if (!concept || !concept.tasks) return false;
  if (concept.tasks.items.length > 0) return false;
  if (!concept.chat || !concept.chat.onboardingComplete) return false;
  if (typeof window._todayTasks !== 'function') return false;

  // The GTM generator reads from getBusiness(), which resolves via the
  // active concept. Temporarily park the active id on this concept so
  // the seed reflects THIS concept's business context.
  const savedActive = appState.activeConceptId;
  appState.activeConceptId = concept.id;
  let gtm = [];
  try { gtm = window._todayTasks() || []; } catch (_) { gtm = []; }
  appState.activeConceptId = savedActive;

  const items = gtm.map(function (t, i) { return _taskFromClara(t, i); });
  if (items.length === 0) return false;
  concept.tasks.items = items;
  return true;
}

// Strategic-planning research payload. Populated at onboarding-complete
// time by _generateResearch(business) in src/clara/research.js. Legacy
// concepts that finished onboarding before this feature landed get
// their research backfilled by the normalizer on first load.
function _defaultResearch() {
  return {
    marketScan: null,
    customerIntelligence: null,
    competition: null,
    gtm: null,
    generatedAt: 0
  };
}

// Daily-insights archive. `history` maps a local-time YYYY-MM-DD date
// key to that day's 3 chosen insights (see clara/insights.js for the
// materialised shape). Kept as an open dictionary rather than an array
// so a returning user's calendar-based recap view can look up any day
// in O(1). The active-day copy (with mutable `seen` flags and the
// dismiss timestamp) lives on `concept.today.insights` /
// `concept.today.insightsDismissedDate` \u2014 not here \u2014 so
// today.js can read the surface state without walking history.
function _defaultInsights() {
  return { history: {} };
}

function _newConceptId() {
  return 'ck_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

function _nextConceptColor() {
  const count = Object.keys(appState.concepts || {}).length;
  return CONCEPT_COLORS[count % CONCEPT_COLORS.length];
}

function _newConcept(opts) {
  const business = _defaultBusiness();
  if (opts && opts.name) business.name = String(opts.name).trim();
  return {
    id: _newConceptId(),
    createdAt: Date.now(),
    color: (opts && opts.color) || _nextConceptColor(),
    business: business,
    // onboardingStep drives the structured 6-question flow in chat.js.
    // States: 'opening' | 'q1' | 'q1_other' | 'q2' | 'q3' | 'q4' | 'q5'
    //         | 'q6' | 'building' | 'done'. pendingChannels persists
    //         mid-flow Q4 multi-select highlights across reloads.
    chat: { messages: [], onboardingComplete: false, onboardingStep: 'opening', pendingChannels: [] },
    // Separate mini-conversation that lives inside the workspace's
    // floating "C" chatbot. Kept isolated from `chat.messages` so the
    // main Chat page stays focused on onboarding + deep conversations
    // while the widget is a lightweight, workspace-scoped helper.
    widgetChat: { messages: [] },
    // Concrete task list (with kanban statuses). Seeded lazily by
    // the Today screen from `_todayTasks()` on first render so each
    // concept persists its own todo/in_progress/done state.
    // `viewingTaskId` (string | null) toggles Today into task-detail
    // mode. Cleared by the detail page's Back button, by the concept
    // header's Today tab click, and any time the id no longer resolves.
    // `viewingInsightId` (string | null) plays the same role for the
    // Daily Insight full-page detail sub-view: set when the user
    // clicks the insight card on Today, cleared by the detail page's
    // Back button. Only one detail sub-view can be active at a time;
    // if both ids are set, viewingInsightId wins (the router honours
    // it first).
    // `insights` (array | undefined) holds the day's chosen daily
    // insights when the Today screen has run the seeder \u2014 see
    // clara/insights.js. `insightsDismissedDate` (YYYY-MM-DD | null)
    // is the per-day "Skip for today" flag; cleared automatically the
    // next calendar day so the card reappears with fresh insights.
    today: { tasks: [], viewingTaskId: null, viewingInsightId: null, insights: [], insightsDismissedDate: null },
    // Daily-insights archive keyed by YYYY-MM-DD. Populated by
    // clara/insights.js at onboarding completion and then lazily on
    // every new day the user visits Today.
    insights: _defaultInsights(),
    // Full task-management workspace (Jira-style boards, filters,
    // views). Populated with Clara's GTM suggestions when the concept
    // finishes onboarding; manual tasks are added at any time via the
    // Tasks screen. See `_defaultTasks()` for the full shape contract.
    tasks: _defaultTasks(),
    create: _defaultCreate(),
    results: _defaultResults(),
    // Strategic Planning research (Market, Customer, Competition, GTM).
    // Filled at onboarding completion; drives the four full-screen
    // reports the user opens from Overview's insight cards.
    research: _defaultResearch(),
    // Legacy: the last "primary" nav tab this concept had open. Was
    // used by the retired "Workspace \u2192" button on the chat page.
    // Kept on the record for backward compatibility (returning users
    // with this field don't need a migration) but not read by the
    // dashboard shell.
    lastWorkspaceView: 'overview',
    // Legacy: was true once the retired floating "C" widget had popped
    // for this concept. Kept as an inert field to avoid a migration.
    hasSeenWorkspaceIntro: false,
    // Timestamp (ms since epoch) of the concept's last mutation \u2014
    // updated inside _saveState so it tracks any real user action. Read
    // by the returning-user proactive check on boot; if this value was
    // set more than CL_RETURNING_MS ago, Clara nudges the user with a
    // welcome-back message.
    lastActive: 0,
    // Persistent flags for Clara's proactive triggers so each one fires
    // at most once per relevant "cycle" and survives reloads.
    //   allDoneFired \u2014 map of boardId \u2192 true. Cleared for a board
    //     whenever any task on it moves back to non-done, so the "all
    //     done" prompt can fire again the next time the board clears.
    //   firstResultFired \u2014 true after the first-published-content
    //     prompt has fired. One-shot; never re-fires.
    //   welcomeBackFired \u2014 transient guard, flipped true when the
    //     welcome-back message is pushed on boot. Reset by main.js on
    //     the next return-worthy gap; the check itself is idempotent
    //     within a single session.
    claraTriggers: {
      allDoneFired: {},
      firstResultFired: false,
      welcomeBackFired: false
    }
  };
}

// ---------------------------------------------
// Persistence
// ---------------------------------------------

function _saveState() {
  // Touch the active concept's lastActive on every persist so the
  // returning-user proactive check on next boot has an accurate "last
  // seen" stamp without every mutation site needing to remember. Skipped
  // when there's no active concept (fresh install pre-welcome).
  const active = getActiveConcept();
  if (active) active.lastActive = Date.now();
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(appState));
  } catch (err) {
    console.error('Failed to save state:', err);
  }
}

// Helper for proactive Clara messages: bump the unread counter when the
// user isn't currently looking at the Chat view. Callers must have
// already appended their message to concept.chat.messages; this only
// touches the counter + persists. Returns the new count.
function _claraNotifyUnread() {
  if (appState.activeView === 'chat') return appState.chatUnread;
  appState.chatUnread = Math.min(99, (appState.chatUnread || 0) + 1);
  _saveState();
  return appState.chatUnread;
}

// Symmetric clearer. Called from the sidebar Chat click and defensively
// from renderChat so any nav path lands with a fresh badge state.
function _claraClearUnread() {
  if (!appState.chatUnread) return;
  appState.chatUnread = 0;
  _saveState();
}

function _restoreState() {
  let saved = null;
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (raw) saved = JSON.parse(raw);
  } catch (err) {
    console.error('Failed to restore state:', err);
  }

  _replaceState(_migrateState(saved));
  _normalizeState();
}

// Migrate any legacy single-concept shape into the concepts model.
// Returns a fresh appState (never mutates the input).
function _migrateState(saved) {
  const isNewFormat =
    saved &&
    typeof saved === 'object' &&
    saved.concepts &&
    typeof saved.concepts === 'object' &&
    'activeConceptId' in saved;

  if (isNewFormat) {
    return Object.assign(_defaultState(), saved, {
      concepts: saved.concepts || {}
    });
  }

  // Fresh install (null or an empty object): no concepts yet, no active id.
  // Welcome will pop the "New concept" modal and force the user to name
  // their first business before Clara starts asking questions.
  if (!saved || (typeof saved === 'object' && Object.keys(saved).length === 0)) {
    return _defaultState();
  }

  // Legacy: {mode, tab, user, business, clara, create, results, ...}
  const legacy = saved;
  const legacyBusiness = legacy.business || _defaultBusiness();
  const legacyClara = legacy.clara || {};
  const legacyCreate = legacy.create || _defaultCreate();
  const legacyResults = legacy.results || _defaultResults();

  const conceptId = _newConceptId();
  const concept = {
    id: conceptId,
    createdAt: Date.now(),
    business: Object.assign(_defaultBusiness(), legacyBusiness),
    chat: {
      messages: Array.isArray(legacyClara.messages) ? legacyClara.messages : [],
      onboardingComplete: !!legacyClara.onboardingComplete,
      onboardingStep: legacyClara.onboardingComplete ? 'done' : 'opening',
      pendingChannels: []
    },
    create: Object.assign(_defaultCreate(), legacyCreate),
    results: Object.assign(_defaultResults(), legacyResults)
  };

  // Old 'onboarding' mode is really "home + incomplete concept" \u2014 in
  // the new dashboard shell this is Overview + onboarding overlay open.
  let mode = legacy.mode || 'splash';
  if (mode === 'onboarding') mode = 'home';

  // Legacy state migrates onto the dashboard's default landing view.
  // Chat is never a landing page in the new shell, so the old `tab`
  // field is only honored when it points at a valid dashboard view;
  // otherwise we send them to Today (the current landing surface after
  // Overview was retired as a nav destination) and let the router flip
  // the onboarding overlay on top if the concept isn't done yet. A
  // legacy 'overview' tab is also collapsed to 'today' so returning
  // users don't get parked on an unreachable-from-sidebar view.
  const legacyTab = legacy.tab;
  const validLandings = ['today', 'create', 'results', 'insights'];
  let activeView = validLandings.indexOf(legacyTab) !== -1 ? legacyTab : 'today';
  // Legacy 'insights' collapses to 'results' \u2014 same screen, canonical
  // key. We keep 'insights' in the valid list above so that stray
  // legacy state doesn't fall through to the 'today' fallback.
  if (activeView === 'insights') activeView = 'results';
  const overlayOpen = !concept.chat.onboardingComplete;

  return {
    mode: mode,
    activeConceptId: conceptId,
    activeView: activeView,
    user: legacy.user || null,
    auth: legacy.auth || { mode: 'signup' },
    sidebarOpen: !!legacy.sidebarOpen,
    onboardingOverlayOpen: overlayOpen,
    concepts: { [conceptId]: concept }
  };
}

// Defensive: make sure all fields exist after migration or partial saves.
function _normalizeState() {
  if (!appState.mode) appState.mode = 'splash';
  if (!appState.activeView) appState.activeView = 'today';
  // View-key migrations for returning users. Order matters:
  //   - Old 'insights' \u2192 new canonical 'results' (same screen, same
  //     renderer). Router still accepts 'insights' as a silent alias
  //     but we canonicalise here so the sidebar highlight matches.
  //   - Legacy 'overview' collapses to 'today'. The overview screen
  //     is still routable for safety fallbacks but no sidebar row
  //     points at it any more.
  //   - Legacy 'chat' as a landing key is left alone \u2014 the screen is
  //     still functional; it just isn't in the sidebar. If a caller
  //     genuinely lands the user on 'chat' we don't want to yank them
  //     off it.
  if (appState.activeView === 'insights') appState.activeView = 'results';
  if (appState.activeView === 'overview') appState.activeView = 'today';
  if (!appState.auth || !appState.auth.mode) appState.auth = { mode: 'signup' };
  if (typeof appState.sidebarOpen !== 'boolean') appState.sidebarOpen = false;
  if (typeof appState.sidebarCollapsed !== 'boolean') appState.sidebarCollapsed = false;
  if (!appState.today || typeof appState.today !== 'object') appState.today = { view: 'list' };
  if (appState.today.view !== 'list' && appState.today.view !== 'kanban') appState.today.view = 'list';
  // Transient in-session flags. Always false on load, regardless of
  // what stray value landed in localStorage.
  appState.confirmingLogout = false;
  appState.conceptDropdownOpen = false;
  appState.onboardingOverlayOpen = false;
  if (typeof appState.insightsDetailId !== 'string' || !appState.insightsDetailId) {
    appState.insightsDetailId = null;
  }
  // If we landed on the detail sub-page but no id is set, fall back to
  // the parent list so we don't render an empty detail shell. The
  // parent list now lives under the 'results' key.
  if (appState.activeView === 'insights-detail' && !appState.insightsDetailId) {
    appState.activeView = 'results';
  }
  // Unread proactive-message counter. Defensive normalisation: any
  // non-integer or negative value collapses to 0. Never persisted above
  // 99 (the badge can't render more than that anyway).
  if (typeof appState.chatUnread !== 'number'
      || !isFinite(appState.chatUnread)
      || appState.chatUnread < 0) {
    appState.chatUnread = 0;
  } else {
    appState.chatUnread = Math.min(99, Math.floor(appState.chatUnread));
  }
  if (!appState.concepts || typeof appState.concepts !== 'object') appState.concepts = {};

  // Normalize each concept
  const conceptIds = Object.keys(appState.concepts);
  conceptIds.forEach(function (id, i) {
    const c = appState.concepts[id];
    if (!c || typeof c !== 'object') { delete appState.concepts[id]; return; }
    if (!c.id) c.id = id;
    if (!c.createdAt) c.createdAt = Date.now();
    if (!c.color) c.color = CONCEPT_COLORS[i % CONCEPT_COLORS.length];
    c.business = Object.assign(_defaultBusiness(), c.business || {});
    if (!Array.isArray(c.business.channels)) c.business.channels = [];
    // Q6 restructure: business.locations replaces the single free-text
    // business.location field. Legacy concepts have `locations` unset
    // OR left at the default empty array from the Object.assign above,
    // but may still have `location` populated \u2014 backfill the
    // structured form from the string so returning users don't lose
    // their Q6 answer, then re-derive the string so both fields stay in
    // lockstep for downstream consumers that still read business.location
    // (today.js, tasks.js, results.js, conceptsList.js, reports.js).
    if (!Array.isArray(c.business.locations)) c.business.locations = [];
    if (c.business.locations.length === 0 && c.business.location) {
      c.business.locations = _parseLegacyLocation(c.business.location);
    }
    // Rewrite the derived string from whatever locations we now have.
    // Safe when locations is empty \u2014 produces '' and clears any
    // stale legacy string.
    c.business.location = _formatLocationsString(c.business.locations);
    // Legacy concepts that finished onboarding before this flag existed
    // are grandfathered as already-validated so returning users don't get
    // a fresh "does that sound right?" popup on their next Chat visit.
    // Concepts still mid-onboarding start at false so the prompt fires
    // naturally once they reach the completion beat.
    if (typeof c.business.customerValidated !== 'boolean') {
      c.business.customerValidated = !!(c.chat && c.chat.onboardingComplete);
    }

    // Approved-label migrations (Zay/stakeholder sign-off pass).
    // business.goal stores the raw Q2 label so downstream code (task
    // generator, Create pre-fills) can key off it directly. If a
    // concept was saved with a pre-approval label, rewrite it in place
    // so its task branching doesn't silently fall through to defaults.
    if (typeof window.CL_Q2_LEGACY_GOAL_MAP === 'object' && c.business.goal) {
      const remappedGoal = window.CL_Q2_LEGACY_GOAL_MAP[c.business.goal];
      if (remappedGoal) c.business.goal = remappedGoal;
    }
    // Same story for Q4 channels: any 'In-person' / 'Word of mouth' /
    // 'Not marketing yet' entries get remapped to the approved wording
    // (used by both the CL_Q4_LOCAL_CHANNELS reach inference and by
    // the amber-bubble echo when the user re-enters the flow).
    if (typeof window.CL_Q4_LEGACY_CHANNEL_MAP === 'object' && Array.isArray(c.business.channels)) {
      c.business.channels = c.business.channels.map(function (ch) {
        return window.CL_Q4_LEGACY_CHANNEL_MAP[ch] || ch;
      });
    }
    c.chat = Object.assign(
      { messages: [], onboardingComplete: false, onboardingStep: 'opening', pendingChannels: [] },
      c.chat || {}
    );
    if (!Array.isArray(c.chat.messages)) c.chat.messages = [];
    if (!Array.isArray(c.chat.pendingChannels)) c.chat.pendingChannels = [];
    // Same approved-label migration for in-flight Q4 selections so a
    // user who reloads mid-flow doesn't lose highlights or trip the
    // escape-option "exclusive" logic on a stale value.
    if (typeof window.CL_Q4_LEGACY_CHANNEL_MAP === 'object') {
      c.chat.pendingChannels = c.chat.pendingChannels.map(function (ch) {
        return window.CL_Q4_LEGACY_CHANNEL_MAP[ch] || ch;
      });
    }
    // Legacy concepts saved before the structured flow have no
    // onboardingStep. Infer it from the completion flag so returning
    // users don't get thrown back into Q1.
    if (typeof c.chat.onboardingStep !== 'string') {
      c.chat.onboardingStep = c.chat.onboardingComplete ? 'done' : 'opening';
    }
    c.widgetChat = Object.assign({ messages: [] }, c.widgetChat || {});
    if (!Array.isArray(c.widgetChat.messages)) c.widgetChat.messages = [];
    // Dashboard restructure: the floating Clara widget is gone; its
    // separate history now merges into the unified Chat nav view. Runs
    // once per concept (guarded by widgetMerged) so a partially-saved
    // widget conversation is preserved but never duplicated on reload.
    if (!c.widgetMerged && c.widgetChat.messages.length > 0 && c.chat.onboardingComplete) {
      // Sort merge by timestamp so widget messages slot in naturally
      // alongside main-chat messages. Widget messages are the only ones
      // that carry a `ts`; main-chat messages default to Date.now() at
      // merge time so they order after existing widget history.
      const now = Date.now();
      const mainWithTs = c.chat.messages.map(function (m, idx) {
        return Object.assign({}, m, { ts: (typeof m.ts === 'number' ? m.ts : now + idx) });
      });
      const widgetTagged = c.widgetChat.messages.map(function (m) {
        return { role: m.role, text: m.text, ts: (typeof m.ts === 'number' ? m.ts : 0) };
      });
      c.chat.messages = mainWithTs.concat(widgetTagged).sort(function (a, b) {
        return (a.ts || 0) - (b.ts || 0);
      });
    }
    c.widgetMerged = true;
    c.today = Object.assign(
      { tasks: [], viewingTaskId: null, viewingInsightId: null, insights: [], insightsDismissedDate: null },
      c.today || {}
    );
    if (!Array.isArray(c.today.tasks)) c.today.tasks = [];
    // Backfill `discarded` on legacy tasks. This flag hides a task from
    // the Today view only (via _renderTdList / _renderTdKanban filters)
    // without removing it from the concept. Anything non-true resets
    // to false so a corrupted persisted value can't accidentally keep
    // a task hidden forever.
    for (let ti = 0; ti < c.today.tasks.length; ti++) {
      const _tk = c.today.tasks[ti];
      if (_tk && typeof _tk === 'object') {
        _tk.discarded = _tk.discarded === true;
      }
    }
    // viewingTaskId is either a task id string or null. Anything else
    // (undefined, number, corrupted value) resets to null so the Today
    // list opens by default on load.
    if (typeof c.today.viewingTaskId !== 'string') c.today.viewingTaskId = null;
    // viewingInsightId follows the same contract as viewingTaskId: a
    // string id or null. Guards against a legacy concept that never
    // had this field, plus any corrupted persisted value.
    if (typeof c.today.viewingInsightId !== 'string') c.today.viewingInsightId = null;
    // Daily-insights surface state on the Today screen. The seeder in
    // clara/insights.js lazily repopulates `insights` on the first
    // Today render each day, so a bad shape here just means the seeder
    // has to run one extra time \u2014 no functional loss.
    if (!Array.isArray(c.today.insights)) c.today.insights = [];
    if (typeof c.today.insightsDismissedDate !== 'string' || !c.today.insightsDismissedDate) {
      c.today.insightsDismissedDate = null;
    }

    // Insights history archive. Kept as an open dictionary keyed by
    // local-time YYYY-MM-DD. Any stray non-array value under a key is
    // scrubbed so downstream code can trust the shape.
    c.insights = Object.assign(_defaultInsights(), c.insights || {});
    if (!c.insights.history || typeof c.insights.history !== 'object') {
      c.insights.history = {};
    } else {
      const histKeys = Object.keys(c.insights.history);
      for (let hk = 0; hk < histKeys.length; hk++) {
        if (!Array.isArray(c.insights.history[histKeys[hk]])) {
          delete c.insights.history[histKeys[hk]];
        }
      }
    }

    // Task management workspace normalization. Legacy concepts (no
    // `tasks` block at all) get a fresh default and, if they've already
    // finished onboarding, an immediate Clara-task seed so their board
    // isn't empty on first visit.
    c.tasks = Object.assign(_defaultTasks(), c.tasks || {});
    if (!Array.isArray(c.tasks.boards) || c.tasks.boards.length === 0) {
      c.tasks.boards = [_defaultTaskBoard()];
    } else {
      // Guarantee the default board is present at index 0 with its
      // reserved id, name, and amber color \u2014 no matter what a stale
      // save may have looked like.
      const hasDefault = c.tasks.boards.some(function (b) { return b && b.isDefault; });
      if (!hasDefault) c.tasks.boards.unshift(_defaultTaskBoard());
      c.tasks.boards = c.tasks.boards.map(function (b) {
        if (!b || typeof b !== 'object') return _defaultTaskBoard();
        return {
          id: b.id || _newBoardId(),
          name: (typeof b.name === 'string' && b.name.trim()) ? b.name.trim() : 'Board',
          color: (typeof b.color === 'string' && /^#[0-9A-Fa-f]{3,8}$/.test(b.color)) ? b.color : '#F5A623',
          isDefault: !!b.isDefault
        };
      });
    }
    if (!Array.isArray(c.tasks.items)) c.tasks.items = [];
    const boardIds = c.tasks.boards.map(function (b) { return b.id; });
    c.tasks.items = c.tasks.items
      .filter(function (t) { return t && typeof t === 'object'; })
      .map(function (t) {
        const status   = TASK_STATUSES.indexOf(t.status) !== -1 ? t.status : 'todo';
        const priority = TASK_PRIORITIES.indexOf(t.priority) !== -1 ? t.priority : 'p2';
        const type     = TASK_TYPES.indexOf(t.type) !== -1 ? t.type : 'other';
        const source   = TASK_SOURCES.indexOf(t.source) !== -1 ? t.source : 'manual';
        // If a task's board was deleted, fall it back to the default
        // so it's never orphaned to nowhere.
        const boardId  = boardIds.indexOf(t.boardId) !== -1 ? t.boardId : 'default';
        const now = Date.now();
        return {
          id: t.id || _newTaskId(),
          title: typeof t.title === 'string' ? t.title : '',
          description: typeof t.description === 'string' ? t.description : '',
          status: status,
          priority: priority,
          type: type,
          source: source,
          boardId: boardId,
          dueDate: typeof t.dueDate === 'string' ? t.dueDate : '',
          createdAt: typeof t.createdAt === 'number' ? t.createdAt : now,
          updatedAt: typeof t.updatedAt === 'number' ? t.updatedAt : now,
          claraNotes: typeof t.claraNotes === 'string' ? t.claraNotes : '',
          activity: Array.isArray(t.activity) ? t.activity.filter(function (a) { return a && typeof a === 'object'; }) : []
        };
      });
    if (boardIds.indexOf(c.tasks.activeBoard) === -1) c.tasks.activeBoard = 'default';
    if (TASK_VIEWS.indexOf(c.tasks.view) === -1) c.tasks.view = 'board';
    if (!c.tasks.filters || typeof c.tasks.filters !== 'object') {
      c.tasks.filters = { status: [], priority: [], type: [], source: [] };
    }
    ['status', 'priority', 'type', 'source'].forEach(function (k) {
      if (!Array.isArray(c.tasks.filters[k])) c.tasks.filters[k] = [];
    });
    if (typeof c.tasks.searchQuery !== 'string') c.tasks.searchQuery = '';
    if (typeof c.tasks.detailId !== 'string') c.tasks.detailId = null;
    // Transient UI flags always reset on load.
    c.tasks.addModalOpen = false;
    c.tasks.newBoardOpen = false;
    // If the pinned calendar month is corrupted, drop it \u2014 the
    // calendar view will lazily re-seed to "today" on first render.
    if (!c.tasks.calendarMonth
        || typeof c.tasks.calendarMonth.year !== 'number'
        || typeof c.tasks.calendarMonth.month !== 'number') {
      c.tasks.calendarMonth = null;
    }
    if (typeof c.tasks.calendarSelectedDate !== 'string') c.tasks.calendarSelectedDate = null;

    // One-shot seed for legacy concepts (onboarding done, tasks empty).
    _seedClaraTasksIfMissing(c);

    c.create = Object.assign(_defaultCreate(), c.create || {});
    // Old create shape used string steps ('ask', 'publish') and free-text
    // fields (askSubmitted, userRequest, angle). If we see anything but a
    // numeric 1\u20134 step, reset the wizard so the new UI starts clean
    // instead of trying to render half-broken legacy state.
    if (c.create.step !== 1 && c.create.step !== 2 && c.create.step !== 3 && c.create.step !== 4) {
      c.create = _defaultCreate();
    }
    if (!Array.isArray(c.create.variations)) c.create.variations = [];
    if (typeof c.create.regenerationCount !== 'number' || c.create.regenerationCount < 0) {
      c.create.regenerationCount = 0;
    }
    // Transient flags always false on load.
    c.create.publishing = false;
    c.create.generating = false;
    // Sweep any lingering fields from the pre-wizard flow so localStorage
    // stays clean and stringified state is predictable.
    ['askSubmitted', 'userRequest', 'type', 'platform', 'angle', 'selected', 'draftSaved', 'selectedSuggestion'].forEach(function (k) {
      if (k in c.create) delete c.create[k];
    });
    c.results = Object.assign(_defaultResults(), c.results || {});
    if (!Array.isArray(c.results.items)) c.results.items = [];

    // Backfill the research payload for any concept that finished
    // onboarding before this feature existed, so opening a legacy
    // concept's reports doesn't produce an empty page.
    c.research = Object.assign(_defaultResearch(), c.research || {});
    const researchMissing = !c.research.marketScan
                         || !c.research.customerIntelligence
                         || !c.research.competition
                         || !c.research.gtm;
    if (c.chat.onboardingComplete && researchMissing && typeof window._generateResearch === 'function') {
      c.research = window._generateResearch(c.business);
    }

    // The dashboard rename ping-ponged: 'results' \u2192 'insights' (v1)
    // \u2192 'results' (v2, current). We now canonicalise every legacy
    // 'insights' back to 'results'. The allowed list keeps 'insights'
    // as a routable safety alias but persisted state settles on the
    // new canonical key so returning users see the correct sidebar
    // highlight on load. Default landing is 'today' now that Overview
    // is no longer a nav destination.
    if (c.lastWorkspaceView === 'insights') c.lastWorkspaceView = 'results';
    if (c.lastWorkspaceView === 'overview') c.lastWorkspaceView = 'today';
    if (!c.lastWorkspaceView || ['overview', 'today', 'chat', 'create', 'results', 'insights'].indexOf(c.lastWorkspaceView) === -1) {
      c.lastWorkspaceView = 'today';
    }
    if (typeof c.hasSeenWorkspaceIntro !== 'boolean') c.hasSeenWorkspaceIntro = false;

    // Concept-level proactive Clara metadata (added in the Chat-advisor
    // rebuild). lastActive tracks the last real mutation timestamp so
    // the returning-user check can fire on boot; claraTriggers is a
    // small dictionary of one-shot flags.
    if (typeof c.lastActive !== 'number' || !isFinite(c.lastActive) || c.lastActive < 0) {
      c.lastActive = 0;
    }
    if (!c.claraTriggers || typeof c.claraTriggers !== 'object') {
      c.claraTriggers = { allDoneFired: {}, firstResultFired: false, welcomeBackFired: false };
    }
    if (!c.claraTriggers.allDoneFired || typeof c.claraTriggers.allDoneFired !== 'object') {
      c.claraTriggers.allDoneFired = {};
    }
    if (typeof c.claraTriggers.firstResultFired !== 'boolean') c.claraTriggers.firstResultFired = false;
    // welcomeBackFired is a per-session guard: force back to false on
    // load so the boot check gets one clean shot per app open.
    c.claraTriggers.welcomeBackFired = false;
  });

  // Ensure active concept id is valid
  if (appState.activeConceptId && !appState.concepts[appState.activeConceptId]) {
    appState.activeConceptId = null;
  }
  if (!appState.activeConceptId) {
    const ids = Object.keys(appState.concepts);
    appState.activeConceptId = ids.length ? ids[0] : null;
  }
}

// ---------------------------------------------
// Concept helpers — always work with the active concept
// ---------------------------------------------

function getActiveConcept() {
  if (!appState.activeConceptId) return null;
  return appState.concepts[appState.activeConceptId] || null;
}

function getBusiness() {
  const c = getActiveConcept();
  return c ? c.business : _defaultBusiness();
}

function getChat() {
  const c = getActiveConcept();
  return c ? c.chat : { messages: [], onboardingComplete: false };
}

function getCreate() {
  const c = getActiveConcept();
  return c ? c.create : _defaultCreate();
}

function getResults() {
  const c = getActiveConcept();
  return c ? c.results : _defaultResults();
}

// Task workspace accessor. Returns the raw tasks block on the active
// concept so callers can mutate it in place (mirrors getBusiness /
// getCreate). When there's no active concept we hand back a fresh
// default so screens don't crash mid-render \u2014 mutations here won't
// persist, which is the intended behaviour pre-onboarding.
function getTasks() {
  const c = getActiveConcept();
  return c ? c.tasks : _defaultTasks();
}

// Create a brand new concept and make it active. Returns the concept
// id. The only supported option is `name` (pre-set business name for
// the rare code paths that seed a value from outside Clara's flow \u2014
// e.g. the retired new-concept modal). New concepts always land on
// Today (the primary dashboard landing) with the onboarding overlay
// open so Clara can collect the rest of the business context. Chat is
// not a landing view.
function createConcept(opts) {
  const concept = _newConcept(opts);
  appState.concepts[concept.id] = concept;
  appState.activeConceptId = concept.id;
  // Fresh concept \u2014 land on Today and let the onboarding overlay
  // (mounted by the router) drive Clara's questions on top. Overlay
  // closes on completion and the user is already on Today, which is
  // now the primary dashboard landing.
  appState.activeView = 'today';
  appState.onboardingOverlayOpen = true;
  appState.conceptDropdownOpen = false;
  _saveState();
  return concept.id;
}

// Switch the active concept from the sidebar dropdown. Always lands on
// Today \u2014 that's the dashboard "home" for the concept now. If the
// target concept hasn't finished onboarding, the router mounts the
// overlay so the user resumes with Clara without leaving the
// dashboard chrome.
function switchConcept(conceptId) {
  if (!appState.concepts[conceptId]) return;
  appState.activeConceptId = conceptId;
  appState.activeView = 'today';
  appState.conceptDropdownOpen = false;
  const c = getActiveConcept();
  appState.onboardingOverlayOpen = !!(c && c.chat && !c.chat.onboardingComplete);
  _saveState();
}

function setActiveView(view) {
  const allowed = [
    // Primary sidebar destinations (the only three the sidebar itself
    // will ever emit).
    'today', 'create', 'results',
    // Legacy view keys \u2014 kept in the allowed list on purpose so that
    // any deep-link, saved lastWorkspaceView, or programmatic caller
    // that still references them doesn't silently no-op. Overview,
    // Chat and the standalone Insights tab are all still routable in
    // router.js as safety fallbacks; they simply have no sidebar row
    // any more.
    'overview', 'chat', 'insights',
    // Today sub-page (reached via "Manage all tasks \u2192").
    'tasks',
    // Sub-page of Results \u2014 rich analytics for a single content item.
    // Reached from a Results card click. The active id lives on
    // appState.insightsDetailId; the Results nav item stays
    // highlighted while we're here.
    'insights-detail',
    // Full-screen sibling view (no concept top-bar row).
    'concepts-list',
    // Strategic Planning reports. Each opens as a full-screen view
    // (no top-bar page label), routed by the report shell in
    // router.js. Reached from the Overview insight cards.
    'market-report', 'customer-report', 'competition-report', 'plan-report',
    // Version 2 Strategic Planning reports \u2014 the four full-page
    // reports the Overview insight cards actually open. Each carries a
    // 5-6 tab shell with a "View all" stacked-scroll mode.
    'report-market', 'report-customer', 'report-competition', 'report-plan'
  ];
  if (allowed.indexOf(view) === -1) return;
  appState.activeView = view;
  // Leaving the detail sub-page always clears the pinned item so the
  // next time we navigate to /insights-detail we know a fresh id was
  // set intentionally.
  if (view !== 'insights-detail' && appState.insightsDetailId) {
    appState.insightsDetailId = null;
  }
  // Remember the last primary tab for deep-link recovery. Reports and
  // the concepts list are sub-pages, they don't count.
  const isReport = view.indexOf('-report') !== -1;
  const isSubPage = view === 'concepts-list' || view === 'insights-detail' || isReport;
  if (!isSubPage) {
    const c = getActiveConcept();
    if (c) c.lastWorkspaceView = view;
  }
  _saveState();
}

// True when the active view is one of the four Strategic Planning
// reports. Used by the router to swap out the concept-header chrome
// for a report-specific topbar.
function _isReportView(view) {
  return view === 'market-report'
      || view === 'customer-report'
      || view === 'competition-report'
      || view === 'plan-report'
      // v2 report keys \u2014 the ones the Overview cards actually route to.
      || view === 'report-market'
      || view === 'report-customer'
      || view === 'report-competition'
      || view === 'report-plan';
}

// ---------------------------------------------
// Exposed as globals for the rest of the app (no ES modules yet)
// ---------------------------------------------

window.STATE_KEY = STATE_KEY;
window.CONCEPT_COLORS = CONCEPT_COLORS;
window.appState = appState;
window._saveState = _saveState;
window._restoreState = _restoreState;
window._claraNotifyUnread = _claraNotifyUnread;
window._claraClearUnread = _claraClearUnread;
window.getActiveConcept = getActiveConcept;
window.getBusiness = getBusiness;
window.getChat = getChat;
window.getCreate = getCreate;
window.getResults = getResults;
window.getTasks = getTasks;
window.createConcept = createConcept;
window.switchConcept = switchConcept;
window.setActiveView = setActiveView;
window._isReportView = _isReportView;
window._defaultResearch = _defaultResearch;
window._defaultInsights = _defaultInsights;
window._formatLocationsString = _formatLocationsString;
window._parseLegacyLocation = _parseLegacyLocation;
window._defaultTaskBoard = _defaultTaskBoard;
window._newTaskId = _newTaskId;
window._newBoardId = _newBoardId;
window._taskFromClara = _taskFromClara;
window._seedClaraTasksIfMissing = _seedClaraTasksIfMissing;
window.TASK_STATUSES = TASK_STATUSES;
window.TASK_PRIORITIES = TASK_PRIORITIES;
window.TASK_TYPES = TASK_TYPES;
window.TASK_SOURCES = TASK_SOURCES;
window.TASK_VIEWS = TASK_VIEWS;
window.TASK_BOARD_COLORS = TASK_BOARD_COLORS;
