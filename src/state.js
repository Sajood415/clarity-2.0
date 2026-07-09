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
    concepts: {}
  };
}

function _replaceState(next) {
  // Wipe existing keys we don't own anymore, then copy in the new values.
  Object.keys(appState).forEach(function (k) { delete appState[k]; });
  Object.keys(next).forEach(function (k) { appState[k] = next[k]; });
}

function _defaultBusiness() {
  return { name: '', type: '', product: '', goal: '', reach: '', challenge: '' };
}

function _defaultCreate() {
  return {
    step: null, type: null, platform: null, angle: null,
    variations: [], selected: null, fromTask: null,
    generating: false, draftSaved: false,
    userRequest: '', askSubmitted: false
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
    chat: { messages: [], onboardingComplete: false },
    create: _defaultCreate(),
    results: _defaultResults()
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

  // Legacy: {mode, tab, user, business, clara, create, results, ...}
  const legacy = saved || {};
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
      onboardingComplete: !!legacyClara.onboardingComplete
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
    c.chat = Object.assign({ messages: [], onboardingComplete: false }, c.chat || {});
    if (!Array.isArray(c.chat.messages)) c.chat.messages = [];
    c.create = Object.assign(_defaultCreate(), c.create || {});
    c.results = Object.assign(_defaultResults(), c.results || {});
    if (!Array.isArray(c.results.items)) c.results.items = [];
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

// Switch the active concept. Auto-forces Chat view when the target concept
// hasn't finished onboarding yet — you can't get to Today/Create/Results
// until Clara has enough context.
function switchConcept(conceptId) {
  if (!appState.concepts[conceptId]) return;
  appState.activeConceptId = conceptId;
  const c = appState.concepts[conceptId];
  if (!c.chat.onboardingComplete) {
    appState.activeView = 'chat';
  }
  _saveState();
}

function setActiveView(view) {
  const allowed = ['chat', 'today', 'create', 'results'];
  if (allowed.indexOf(view) === -1) return;
  appState.activeView = view;
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
