// ---------------------------------------------
// Clarity 2.0 — App State (concepts model)
// ---------------------------------------------
//
// This is the single source of truth. The shape:
//
//   appState = {
//     mode:              'splash' | 'auth' | 'loading' | 'welcome' | 'home',
//     activeConceptId:   string | null,
//     activeView:        'overview' | 'today' | 'chat' | 'create' | 'insights'
//                      | 'concepts-list' | '<name>-report',
//     user:              { name, email } | null,
//     auth:              { mode: 'signup' | 'login' },
//     sidebarOpen:       boolean,
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
    // Overview is the default landing view now that the dashboard is the
    // primary shell. Chat / today / create / insights are peer nav items.
    activeView: 'overview',
    user: null,
    auth: { mode: 'signup' },
    sidebarOpen: false,
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
  //   location         — Q6 free text
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
    location: '',
    reach: '',
    challenge: '',
    // Set true once the user has confirmed (or corrected) the customer
    // summary Clara reads back right after onboarding completes. Prevents
    // the validation prompt from ever asking twice for the same concept.
    customerValidated: false
  };
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
    generating: false
  };
}

function _defaultResults() {
  return { items: [] };
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
    today: { tasks: [], viewingTaskId: null },
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
    hasSeenWorkspaceIntro: false
  };
}

// ---------------------------------------------
// Persistence
// ---------------------------------------------

function _saveState() {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(appState));
  } catch (err) {
    console.error('Failed to save state:', err);
  }
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
  // otherwise we send them to Overview and let the router flip the
  // onboarding overlay on top if the concept isn't done yet.
  const legacyTab = legacy.tab;
  const validLandings = ['overview', 'today', 'create', 'insights'];
  const activeView = validLandings.indexOf(legacyTab) !== -1 ? legacyTab : 'overview';
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
  if (!appState.activeView) appState.activeView = 'overview';
  // Legacy 'results' key was renamed to 'insights' in the dashboard
  // restructure. Any persisted concept that landed there gets remapped
  // in place so returning users don't get a blank screen.
  if (appState.activeView === 'results') appState.activeView = 'insights';
  if (!appState.auth || !appState.auth.mode) appState.auth = { mode: 'signup' };
  if (typeof appState.sidebarOpen !== 'boolean') appState.sidebarOpen = false;
  if (!appState.today || typeof appState.today !== 'object') appState.today = { view: 'list' };
  if (appState.today.view !== 'list' && appState.today.view !== 'kanban') appState.today.view = 'list';
  // Transient in-session flags. Always false on load, regardless of
  // what stray value landed in localStorage.
  appState.confirmingLogout = false;
  appState.conceptDropdownOpen = false;
  appState.onboardingOverlayOpen = false;
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
    c.today = Object.assign({ tasks: [], viewingTaskId: null }, c.today || {});
    if (!Array.isArray(c.today.tasks)) c.today.tasks = [];
    // viewingTaskId is either a task id string or null. Anything else
    // (undefined, number, corrupted value) resets to null so the Today
    // list opens by default on load.
    if (typeof c.today.viewingTaskId !== 'string') c.today.viewingTaskId = null;
    c.create = Object.assign(_defaultCreate(), c.create || {});
    // Old create shape used string steps ('ask', 'publish') and free-text
    // fields (askSubmitted, userRequest, angle). If we see anything but a
    // numeric 1\u20134 step, reset the wizard so the new UI starts clean
    // instead of trying to render half-broken legacy state.
    if (c.create.step !== 1 && c.create.step !== 2 && c.create.step !== 3 && c.create.step !== 4) {
      c.create = _defaultCreate();
    }
    if (!Array.isArray(c.create.variations)) c.create.variations = [];
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

    // Legacy 'results' collapses to 'insights' after the dashboard rename.
    if (c.lastWorkspaceView === 'results') c.lastWorkspaceView = 'insights';
    if (!c.lastWorkspaceView || ['overview', 'today', 'chat', 'create', 'insights'].indexOf(c.lastWorkspaceView) === -1) {
      c.lastWorkspaceView = 'overview';
    }
    if (typeof c.hasSeenWorkspaceIntro !== 'boolean') c.hasSeenWorkspaceIntro = false;
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

// Create a brand new concept and make it active. Returns the concept
// id. The only supported option is `name` (pre-set business name for
// the rare code paths that seed a value from outside Clara's flow \u2014
// e.g. the retired new-concept modal). New concepts always land on
// Overview with the onboarding overlay open so Clara can collect the
// rest of the business context. Chat is not a landing view.
function createConcept(opts) {
  const concept = _newConcept(opts);
  appState.concepts[concept.id] = concept;
  appState.activeConceptId = concept.id;
  // Fresh concept \u2014 land on Overview and let the onboarding overlay
  // (mounted by the router) drive Clara's questions on top. Overlay
  // closes on completion and the user is already on Overview.
  appState.activeView = 'overview';
  appState.onboardingOverlayOpen = true;
  appState.conceptDropdownOpen = false;
  _saveState();
  return concept.id;
}

// Switch the active concept from the sidebar dropdown. Always lands on
// Overview \u2014 that's the dashboard "home" for the concept. If the target
// concept hasn't finished onboarding, the router mounts the overlay so
// the user resumes with Clara without leaving the dashboard chrome.
function switchConcept(conceptId) {
  if (!appState.concepts[conceptId]) return;
  appState.activeConceptId = conceptId;
  appState.activeView = 'overview';
  appState.conceptDropdownOpen = false;
  const c = getActiveConcept();
  appState.onboardingOverlayOpen = !!(c && c.chat && !c.chat.onboardingComplete);
  _saveState();
}

function setActiveView(view) {
  const allowed = [
    'overview', 'today', 'chat', 'create', 'insights',
    // Full-screen sibling view (no concept top-bar row).
    'concepts-list',
    // Strategic Planning reports. Each opens as a full-screen view
    // (no top-bar page label), routed by the report shell in
    // router.js. Reached from the Overview insight cards.
    'market-report', 'customer-report', 'competition-report', 'plan-report'
  ];
  if (allowed.indexOf(view) === -1) return;
  appState.activeView = view;
  // Remember the last primary tab for deep-link recovery. Reports and
  // the concepts list are sub-pages, they don't count.
  const isReport = view.indexOf('-report') !== -1;
  const isSubPage = view === 'concepts-list' || isReport;
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
      || view === 'plan-report';
}

// ---------------------------------------------
// Exposed as globals for the rest of the app (no ES modules yet)
// ---------------------------------------------

window.STATE_KEY = STATE_KEY;
window.CONCEPT_COLORS = CONCEPT_COLORS;
window.appState = appState;
window._saveState = _saveState;
window._restoreState = _restoreState;
window.getActiveConcept = getActiveConcept;
window.getBusiness = getBusiness;
window.getChat = getChat;
window.getCreate = getCreate;
window.getResults = getResults;
window.createConcept = createConcept;
window.switchConcept = switchConcept;
window.setActiveView = setActiveView;
window._isReportView = _isReportView;
window._defaultResearch = _defaultResearch;
