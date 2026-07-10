// ---------------------------------------------
// Clarity 2.0 — App State (concepts model)
// ---------------------------------------------
//
// This is the single source of truth. The shape:
//
//   appState = {
//     mode:              'splash' | 'auth' | 'loading' | 'welcome' | 'home',
//     activeConceptId:   string | null,
//     activeView:        'chat' | 'today' | 'create' | 'results',
//     user:              { name, email } | null,
//     auth:              { mode: 'signup' | 'login' },
//     sidebarOpen:       boolean,
//     concepts:          { [id]: Concept }
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
    activeView: 'today',
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
  //   budget           — Q5 (currently skipped; Clara will ask later)
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
    challenge: ''
  };
}

function _defaultCreate() {
  // New Create wizard shape (4 steps, no free text, Clara drives).
  // The three "selected*" fields are the only things that need to
  // persist across steps; `variations` is a cache regenerated each
  // time the user re-enters step 3.
  return {
    step: 1,
    selectedSuggestion: null,
    selectedPlatform: null,
    selectedVariation: null,
    // Step 2 lets the user edit Clara's angle as a "brief". If untouched
    // it stays empty and the textarea shows the raw suggestion angle;
    // any edit here shadows it.
    customBrief: '',
    variations: [],
    fromTask: null,
    generating: false
  };
}

function _defaultResults() {
  return { items: [] };
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
    // States: 'opening' | 'q1' | 'q1_other' | 'q2' | 'q3' | 'q4' | 'q6'
    //         | 'building' | 'done'. pendingChannels persists mid-flow
    //         Q4 multi-select highlights across reloads.
    chat: { messages: [], onboardingComplete: false, onboardingStep: 'opening', pendingChannels: [] },
    // Separate mini-conversation that lives inside the workspace's
    // floating "C" chatbot. Kept isolated from `chat.messages` so the
    // main Chat page stays focused on onboarding + deep conversations
    // while the widget is a lightweight, workspace-scoped helper.
    widgetChat: { messages: [] },
    // Concrete task list (with kanban statuses). Seeded lazily by
    // the Today screen from `_todayTasks()` on first render so each
    // concept persists its own todo/in_progress/done state.
    today: { tasks: [] },
    create: _defaultCreate(),
    results: _defaultResults(),
    // Remembers which workspace tab (overview/today/create/results) the
    // user last had open, so clicking "Workspace \u2192" from the chat page
    // returns them there instead of always dumping them on Overview.
    lastWorkspaceView: 'overview',
    // True once the little Clara greeter has popped in the bottom-right
    // corner of the workspace for this concept. Ensures the greeting is
    // strictly a first-time-in-workspace moment per concept.
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

  // Old 'onboarding' mode is really "home + Chat view of an incomplete concept"
  let mode = legacy.mode || 'splash';
  if (mode === 'onboarding') mode = 'home';

  let activeView = legacy.tab || 'today';
  if (!concept.chat.onboardingComplete) activeView = 'chat';

  return {
    mode: mode,
    activeConceptId: conceptId,
    activeView: activeView,
    user: legacy.user || null,
    auth: legacy.auth || { mode: 'signup' },
    sidebarOpen: !!legacy.sidebarOpen,
    concepts: { [conceptId]: concept }
  };
}

// Defensive: make sure all fields exist after migration or partial saves.
function _normalizeState() {
  if (!appState.mode) appState.mode = 'splash';
  if (!appState.activeView) appState.activeView = 'today';
  if (!appState.auth || !appState.auth.mode) appState.auth = { mode: 'signup' };
  if (typeof appState.sidebarOpen !== 'boolean') appState.sidebarOpen = false;
  if (!appState.today || typeof appState.today !== 'object') appState.today = { view: 'list' };
  if (appState.today.view !== 'list' && appState.today.view !== 'kanban') appState.today.view = 'list';
  // Confirmation UI is a transient in-session flag \u2014 never carry it
  // across reloads, even if a stray copy landed in localStorage.
  appState.confirmingLogout = false;
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
    c.today = Object.assign({ tasks: [] }, c.today || {});
    if (!Array.isArray(c.today.tasks)) c.today.tasks = [];
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
    ['askSubmitted', 'userRequest', 'type', 'platform', 'angle', 'selected', 'draftSaved'].forEach(function (k) {
      if (k in c.create) delete c.create[k];
    });
    c.results = Object.assign(_defaultResults(), c.results || {});
    if (!Array.isArray(c.results.items)) c.results.items = [];
    if (!c.lastWorkspaceView || ['overview', 'today', 'create', 'results'].indexOf(c.lastWorkspaceView) === -1) {
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

// Create a brand new concept and make it active. Returns the concept id.
// Accepts an optional `name` (pre-set business name from the new-concept
// dialog) and `focusChat` (default true) since a new concept always starts
// in Chat so Clara can gather context.
function createConcept(opts) {
  const focusChat = !opts || opts.focusChat !== false;
  const concept = _newConcept(opts);
  appState.concepts[concept.id] = concept;
  appState.activeConceptId = concept.id;
  if (focusChat) appState.activeView = 'chat';
  _saveState();
  return concept.id;
}

// Switch the active concept. Clicking a concept in the sidebar always
// opens its Chat page \u2014 that matches the Claude/GPT pattern users
// already know, and keeps the workspace as something you deliberately
// step into. From Chat, the user can hit "Workspace \u2192" to jump to
// where they left off inside that concept.
function switchConcept(conceptId) {
  if (!appState.concepts[conceptId]) return;
  appState.activeConceptId = conceptId;
  appState.activeView = 'chat';
  _saveState();
}

function setActiveView(view) {
  const allowed = ['chat', 'overview', 'today', 'create', 'results'];
  if (allowed.indexOf(view) === -1) return;
  appState.activeView = view;
  // Remember the last workspace tab so pressing "Workspace \u2192" from chat
  // lands back on it rather than always going to Overview.
  if (view !== 'chat') {
    const c = getActiveConcept();
    if (c) c.lastWorkspaceView = view;
  }
  _saveState();
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
